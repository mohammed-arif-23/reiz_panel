import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { Attendance } from "@/models/Attendance";
import { Notification } from "@/models/Notification";
import { AuditLog } from "@/models/AuditLog";
import { getKolkataDateString } from "@/lib/date";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, comments } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json({ error: "Leave request has already been processed" }, { status: 400 });
    }

    leave.status = status;
    leave.reviewedBy = payload.userId;
    leave.reviewedAt = new Date();
    leave.comments = comments || "";

    await leave.save();

    // If leave is APPROVED, update the attendance status for those dates
    if (status === "APPROVED") {
      const datesToUpdate: string[] = [];
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      // Simple date loop
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesToUpdate.push(d.toISOString().split("T")[0]);
      }

      const attendancePromises = datesToUpdate.map(async (dateStr) => {
        const attendanceStatus = leave.type === "WFH" ? "WFH" : "LEAVE";
        
        await Attendance.findOneAndUpdate(
          { userId: leave.userId, date: dateStr },
          {
            $set: {
              status: attendanceStatus,
              // If it's a leave, they aren't checking in
              checkIn: null,
              checkOut: null,
              breaks: [],
              workDurationMinutes: 0,
              breakDurationMinutes: 0,
            },
          },
          { upsert: true, new: true }
        );
      });

      await Promise.all(attendancePromises);
    }

    // Notify employee
    await Notification.create({
      userId: leave.userId,
      title: `Leave Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
      message: `Your leave request for ${leave.startDate} to ${leave.endDate} has been ${status.toLowerCase()}.${comments ? ` Reviewer comment: "${comments}"` : ""}`,
      type: "LEAVE_STATUS",
    });

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: payload.userId,
      action: `LEAVE_${status}`,
      details: `Manager/Admin ${payload.email} ${status.toLowerCase()} leave for User ID ${leave.userId} from ${leave.startDate} to ${leave.endDate}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: `Leave request ${status.toLowerCase()} successfully`, leave });
  } catch (error: any) {
    console.error("PUT Leave Approval Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

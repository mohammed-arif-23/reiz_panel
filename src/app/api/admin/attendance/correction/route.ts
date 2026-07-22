import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { Notification } from "@/models/Notification";
import { AuditLog } from "@/models/AuditLog";
import { calculateDurationMinutes } from "@/lib/date";

async function checkAdminAccess(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) return null;

  return payload;
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const admin = await checkAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attendanceId, correctionId, status } = body;

    if (!attendanceId || !correctionId || !status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "attendanceId, correctionId, and APPROVED/REJECTED status are required" }, { status: 400 });
    }

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const correction = attendance.corrections.id(correctionId);
    if (!correction) {
      return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
    }

    if (correction.status !== "PENDING") {
      return NextResponse.json({ error: "Correction request has already been processed" }, { status: 400 });
    }

    correction.status = status;
    correction.approvedOrRejectedBy = admin.userId;
    correction.resolvedAt = new Date();

    if (status === "APPROVED") {
      if (correction.proposedCheckIn !== undefined) {
        attendance.checkIn = correction.proposedCheckIn;
      }
      if (correction.proposedCheckOut !== undefined) {
        attendance.checkOut = correction.proposedCheckOut;
      }
      
      attendance.status = "PRESENT";

      // Recalculate workDurationMinutes
      if (attendance.checkIn && attendance.checkOut) {
        const breakMin = attendance.breakDurationMinutes || 0;
        const totalDuration = calculateDurationMinutes(attendance.checkIn, attendance.checkOut);
        attendance.workDurationMinutes = Math.max(0, totalDuration - breakMin);
      }
    }

    await attendance.save();

    // Notify employee
    await Notification.create({
      userId: attendance.userId,
      title: `Correction Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
      message: `Your attendance correction request for ${attendance.date} has been ${status.toLowerCase()}`,
      type: "CORRECTION_STATUS",
    });

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: `ATTENDANCE_CORRECTION_${status}`,
      details: `Admin/Manager ${admin.email} ${status.toLowerCase()} correction for User ID ${attendance.userId} on date ${attendance.date}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: `Correction request ${status.toLowerCase()} successfully`, attendance });
  } catch (error: any) {
    console.error("PUT Admin Correction Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

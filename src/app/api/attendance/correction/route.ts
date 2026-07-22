import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { AuditLog } from "@/models/AuditLog";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, proposedCheckIn, proposedCheckOut, reason } = body;

    if (!date || !reason) {
      return NextResponse.json({ error: "Date and reason are required" }, { status: 400 });
    }

    let attendance = await Attendance.findOne({ userId: payload.userId, date });
    if (!attendance) {
      attendance = new Attendance({
        userId: payload.userId,
        date,
        status: "ABSENT",
        breaks: [],
        corrections: [],
      });
    }

    const correction = {
      proposedCheckIn: proposedCheckIn ? new Date(proposedCheckIn) : null,
      proposedCheckOut: proposedCheckOut ? new Date(proposedCheckOut) : null,
      reason,
      requestedBy: payload.userId,
      status: "PENDING",
      createdAt: new Date(),
    };

    attendance.corrections.push(correction);
    await attendance.save();

    // Notify managers & admins
    const admins = await User.find({ role: { $in: ["SUPER_ADMIN", "ADMIN", "MANAGER"] } });
    const notificationPromises = admins.map((admin) => {
      return Notification.create({
        userId: admin._id,
        title: "Attendance Correction Request",
        message: `${payload.name} has requested a correction for ${date}.`,
        type: "CORRECTION_STATUS",
      });
    });
    await Promise.all(notificationPromises);

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: payload.userId,
      action: "ATTENDANCE_CORRECTION_REQUEST",
      details: `User ${payload.email} requested attendance correction for date ${date}. Reason: ${reason}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Correction request submitted successfully", attendance });
  } catch (error: any) {
    console.error("POST Attendance Correction Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

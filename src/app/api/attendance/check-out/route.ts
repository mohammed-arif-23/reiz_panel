import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { getKolkataDateString, calculateDurationMinutes } from "@/lib/date";
import { AuditLog } from "@/models/AuditLog";

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

    const todayStr = getKolkataDateString();
    const attendance = await Attendance.findOne({ userId: payload.userId, date: todayStr });

    if (!attendance || !attendance.checkIn) {
      return NextResponse.json({ error: "Cannot check out: You have not checked in today" }, { status: 400 });
    }

    if (attendance.checkOut) {
      return NextResponse.json({ error: "Already checked out today" }, { status: 400 });
    }

    const serverTime = new Date();
    attendance.checkOut = serverTime;

    // End active break if the employee forgot to end it
    let activeBreakEnded = false;
    for (const b of attendance.breaks) {
      if (!b.end) {
        b.end = serverTime;
        activeBreakEnded = true;
      }
    }

    // Calculate break duration
    let breakMin = 0;
    for (const b of attendance.breaks) {
      if (b.start && b.end) {
        breakMin += calculateDurationMinutes(b.start, b.end);
      }
    }
    attendance.breakDurationMinutes = breakMin;

    // Calculate total duration (checkOut - checkIn) in minutes
    const totalDurationMin = calculateDurationMinutes(attendance.checkIn, serverTime);
    attendance.workDurationMinutes = Math.max(0, totalDurationMin - breakMin);

    await attendance.save();

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: payload.userId,
      action: "ATTENDANCE_CHECKOUT",
      details: `User ${payload.email} checked out at ${serverTime.toISOString()}. Work: ${attendance.workDurationMinutes}m, Break: ${attendance.breakDurationMinutes}m.${activeBreakEnded ? " (Forced end of active break)" : ""}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Checked out successfully", attendance });
  } catch (error) {
    console.error("Check-out API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

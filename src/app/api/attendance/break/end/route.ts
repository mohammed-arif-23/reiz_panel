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

    if (!attendance) {
      return NextResponse.json({ error: "Cannot end break: Attendance record not found" }, { status: 400 });
    }

    // Find the active break
    const activeBreakIndex = attendance.breaks.findIndex((b: any) => !b.end);
    if (activeBreakIndex === -1) {
      return NextResponse.json({ error: "Not currently on a break" }, { status: 400 });
    }

    const serverTime = new Date();
    attendance.breaks[activeBreakIndex].end = serverTime;

    // Recalculate break durations
    let breakMin = 0;
    for (const b of attendance.breaks) {
      if (b.start && b.end) {
        breakMin += calculateDurationMinutes(b.start, b.end);
      }
    }
    attendance.breakDurationMinutes = breakMin;

    await attendance.save();

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: payload.userId,
      action: "BREAK_END",
      details: `User ${payload.email} ended break at ${serverTime.toISOString()}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Break ended successfully", attendance });
  } catch (error) {
    console.error("Break End API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { getKolkataDateString } from "@/lib/date";
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
      return NextResponse.json({ error: "Cannot start break: You have not checked in today" }, { status: 400 });
    }

    if (attendance.checkOut) {
      return NextResponse.json({ error: "Cannot start break: Already checked out today" }, { status: 400 });
    }

    // Check if user is already on a break
    const activeBreak = attendance.breaks.find((b: any) => !b.end);
    if (activeBreak) {
      return NextResponse.json({ error: "Already on a break" }, { status: 400 });
    }

    const serverTime = new Date();
    attendance.breaks.push({
      start: serverTime,
      end: null as any,
    });

    await attendance.save();

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: payload.userId,
      action: "BREAK_START",
      details: `User ${payload.email} started break at ${serverTime.toISOString()}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Break started successfully", attendance });
  } catch (error) {
    console.error("Break Start API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

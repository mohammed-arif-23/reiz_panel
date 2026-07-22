import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { LeaveRequest } from "@/models/LeaveRequest";
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
    
    // Check if attendance already exists for today
    let attendance = await Attendance.findOne({ userId: payload.userId, date: todayStr });
    if (attendance && attendance.checkIn) {
      return NextResponse.json({ error: "Already checked in for today" }, { status: 400 });
    }

    // Check if user has an approved WFH request for today
    const wfhRequest = await LeaveRequest.findOne({
      userId: payload.userId,
      type: "WFH",
      status: "APPROVED",
      startDate: { $lte: todayStr },
      endDate: { $gte: todayStr },
    });

    const status = wfhRequest ? "WFH" : "PRESENT";
    const serverTime = new Date();

    if (!attendance) {
      attendance = new Attendance({
        userId: payload.userId,
        date: todayStr,
        checkIn: serverTime,
        status,
      });
    } else {
      attendance.checkIn = serverTime;
      attendance.status = status;
    }

    await attendance.save();

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: payload.userId,
      action: "ATTENDANCE_CHECKIN",
      details: `User ${payload.email} checked in at ${serverTime.toISOString()} (${status})`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Checked in successfully", attendance });
  } catch (error) {
    console.error("Check-in API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

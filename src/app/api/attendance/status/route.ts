import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { getKolkataDateString } from "@/lib/date";

export async function GET(request: NextRequest) {
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
      return NextResponse.json({
        date: todayStr,
        checkedIn: false,
        checkedOut: false,
        onBreak: false,
        attendance: null,
      });
    }

    const onBreak = attendance.breaks.length > 0 && !attendance.breaks[attendance.breaks.length - 1].end;

    return NextResponse.json({
      date: todayStr,
      checkedIn: !!attendance.checkIn,
      checkedOut: !!attendance.checkOut,
      onBreak,
      attendance,
    });
  } catch (error) {
    console.error("Attendance Status API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

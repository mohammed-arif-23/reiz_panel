import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Attendance } from "@/models/Attendance";
import { getDaysInMonth } from "@/lib/date";

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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || payload.userId;
    const monthParam = searchParams.get("month"); // e.g. "2026-07"

    let startStr = "";
    let endStr = "";

    if (monthParam && monthParam.includes("-")) {
      const [yearStr, monthStr] = monthParam.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const days = getDaysInMonth(year, month);
      startStr = days[0];
      endStr = days[days.length - 1];
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const days = getDaysInMonth(year, month);
      startStr = days[0];
      endStr = days[days.length - 1];
    }

    const records = await Attendance.find({
      userId,
      date: { $gte: startStr, $lte: endStr },
    })
      .sort({ date: 1 })
      .lean();

    const formattedRecords = records.map((r: any) => ({
      date: r.date,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      workDuration: r.workDurationMinutes || 0,
      breakDuration: r.breakDurationMinutes || 0,
      notes: r.checkoutRemarks || "",
    }));

    return NextResponse.json(formattedRecords);
  } catch (error: any) {
    console.error("GET Attendance Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

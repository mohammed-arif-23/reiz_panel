import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { SheetData } from "@/models/SheetData";
import { SheetTemplate } from "@/models/SheetTemplate";
import { Holiday } from "@/models/Holiday";
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
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");

    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: "Year and month are required" }, { status: 400 });
    }

    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    // Permission check
    if (userId !== payload.userId && !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await User.findById(userId).populate("assignedTemplateId");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get list of day string templates (e.g. ["2026-07-01", ...])
    const days = getDaysInMonth(year, month);
    const startStr = days[0];
    const endStr = days[days.length - 1];

    // Fetch attendance, sheet data, and holidays in bulk
    const [attendances, sheets, holidays] = await Promise.all([
      Attendance.find({
        userId,
        date: { $gte: startStr, $lte: endStr },
      }),
      SheetData.find({
        userId,
        date: { $gte: startStr, $lte: endStr },
      }).populate("templateId"),
      Holiday.find({
        date: { $gte: startStr, $lte: endStr },
      }),
    ]);

    // Create lookup maps
    const attendanceMap = new Map(attendances.map((a) => [a.date, a]));
    const sheetMap = new Map(sheets.map((s) => [s.date, s]));
    const holidayMap = new Map(holidays.map((h) => [h.date, h]));

    // Determine the columns of the sheet.
    let columns = [];
    if (user.assignedTemplateId) {
      columns = (user.assignedTemplateId as any).columns || [];
    } else {
      const sheetWithSnapshot = sheets.find((s) => s.columnsSnapshot && s.columnsSnapshot.length > 0);
      if (sheetWithSnapshot) {
        columns = sheetWithSnapshot.columnsSnapshot;
      }
    }

    // Compile rows
    const rows = days.map((dateStr) => {
      const attendance = attendanceMap.get(dateStr);
      const sheet = sheetMap.get(dateStr);
      const holiday = holidayMap.get(dateStr);

      // Determine default status if no attendance checked in
      let defaultStatus = "ABSENT";
      const dateObj = new Date(dateStr + "T00:00:00");
      const dayOfWeek = dateObj.getDay();

      if (holiday || dayOfWeek === 0) {
        defaultStatus = "HOLIDAY";
      }

      // Support multiple entries stored in Map as "entries" key
      const storedEntries = sheet?.data?.get("entries");
      const entriesArray = Array.isArray(storedEntries) ? storedEntries : [];

      const rowData: Record<string, any> = {
        date: dateStr,
        checkIn: attendance?.checkIn || null,
        checkOut: attendance?.checkOut || null,
        workDuration: attendance?.workDurationMinutes || 0,
        breakDuration: attendance?.breakDurationMinutes || 0,
        status: attendance?.status || defaultStatus,
        tasksCount: (sheet?.tasks?.length || 0) + entriesArray.length,
        eodSummary: sheet?.eodSummary || "",
        entries: entriesArray,
        data: sheet?.data ? Object.fromEntries(sheet.data) : {},
      };

      // Add custom template columns for legacy or direct cell lookup
      columns.forEach((col: any) => {
        rowData[col.key] = sheet?.data?.get(col.key) ?? "";
      });

      return rowData;
    });

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        designation: user.designation,
        role: user.role,
      },
      columns,
      rows,
    });
  } catch (error) {
    console.error("GET Monthly Grid Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

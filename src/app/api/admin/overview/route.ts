import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { SheetData } from "@/models/SheetData";
import { LeaveRequest } from "@/models/LeaveRequest";
import { getKolkataDateString } from "@/lib/date";

async function checkAdminAccess(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) return null;

  return payload;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const admin = await checkAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const selectedDate = searchParams.get("date") || getKolkataDateString();

    // 1. Get all active employees (non-admins)
    const employees = await User.find({ status: "ACTIVE", role: "EMPLOYEE" }).select("-password");
    const employeeIds = employees.map((e) => e._id);
    const totalEmployeesCount = employees.length;

    // 2. Fetch selected date attendance for all employees
    const attendances = await Attendance.find({
      userId: { $in: employeeIds },
      date: selectedDate,
    }).populate("userId", "name email designation");

    // 3. Fetch selected date work entries (SheetData) for all employees
    const sheets = await SheetData.find({
      userId: { $in: employeeIds },
      date: selectedDate,
    });

    const attendanceMap = new Map(attendances.map((a: any) => [a.userId._id.toString(), a]));
    const sheetMap = new Map(sheets.map((s: any) => [s.userId.toString(), s]));

    let checkedInCount = 0;
    let onBreakCount = 0;
    let checkedOutCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let wfhCount = 0;

    // Detailed Per-Person Summary Array
    const perPersonList: any[] = [];

    employees.forEach((emp) => {
      const att = attendanceMap.get(emp._id.toString());
      const sheet = sheetMap.get(emp._id.toString());

      const onBreak = att?.breaks?.length ? !att.breaks[att.breaks.length - 1].end : false;

      let sessionStatus = "ABSENT";

      if (!att) {
        absentCount++;
      } else if (att.status === "LEAVE") {
        leaveCount++;
        sessionStatus = "LEAVE";
      } else if (att.status === "WFH") {
        wfhCount++;
        if (att.checkIn) {
          if (att.checkOut) {
            checkedOutCount++;
            sessionStatus = "CHECKED_OUT";
          } else if (onBreak) {
            onBreakCount++;
            checkedInCount++;
            sessionStatus = "ON_BREAK";
          } else {
            checkedInCount++;
            sessionStatus = "ACTIVE_WORKING";
          }
        }
      } else {
        if (att.checkIn) {
          if (att.checkOut) {
            checkedOutCount++;
            sessionStatus = "CHECKED_OUT";
          } else if (onBreak) {
            onBreakCount++;
            checkedInCount++;
            sessionStatus = "ON_BREAK";
          } else {
            checkedInCount++;
            sessionStatus = "ACTIVE_WORKING";
          }
        } else {
          absentCount++;
        }
      }

      // Extract work entries array
      const storedEntries = sheet?.data?.get ? sheet.data.get("entries") : sheet?.data?.entries;
      const entriesArray = Array.isArray(storedEntries) ? storedEntries : [];

      perPersonList.push({
        userId: emp._id,
        name: emp.name,
        email: emp.email,
        designation: emp.designation || "Employee",
        sessionStatus,
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        workDurationMinutes: att?.workDurationMinutes || 0,
        breakDurationMinutes: att?.breakDurationMinutes || 0,
        entries: entriesArray,
        eodSummary: sheet?.eodSummary || "",
      });
    });

    // 4. Count pending items
    const [pendingLeavesCount, attendanceWithCorrections] = await Promise.all([
      LeaveRequest.countDocuments({ status: "PENDING" }),
      Attendance.find({ "corrections.status": "PENDING" }).populate("userId", "name email"),
    ]);

    let actualPendingCorrectionsCount = 0;
    attendanceWithCorrections.forEach((att) => {
      att.corrections.forEach((c: any) => {
        if (c.status === "PENDING") actualPendingCorrectionsCount++;
      });
    });

    return NextResponse.json({
      date: selectedDate,
      summary: {
        totalEmployees: totalEmployeesCount,
        checkedInNow: checkedInCount,
        onBreakNow: onBreakCount,
        checkedOutToday: checkedOutCount,
        notCheckedInToday: absentCount,
        pendingLeaves: pendingLeavesCount,
        pendingCorrections: actualPendingCorrectionsCount,
      },
      perPersonOverview: perPersonList,
    });
  } catch (error: any) {
    console.error("GET Admin Overview Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

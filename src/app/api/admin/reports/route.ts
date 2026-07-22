import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { SheetData } from "@/models/SheetData";
import { getDaysInMonth } from "@/lib/date";

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
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");
    const userId = searchParams.get("userId"); // Optional filter by user

    if (!yearStr || !monthStr) {
      return NextResponse.json({ error: "Year and month are required" }, { status: 400 });
    }

    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const days = getDaysInMonth(year, month);
    const startStr = days[0];
    const endStr = days[days.length - 1];

    // Find users
    const userQuery: Record<string, any> = { role: "EMPLOYEE" };
    if (userId) {
      userQuery._id = userId;
    }
    const employees = await User.find(userQuery).select("name email designation status");

    const employeeIds = employees.map((e) => e._id);

    // Fetch all attendance and task sheets for these users in the month
    const [attendances, sheets] = await Promise.all([
      Attendance.find({
        userId: { $in: employeeIds },
        date: { $gte: startStr, $lte: endStr },
      }),
      SheetData.find({
        userId: { $in: employeeIds },
        date: { $gte: startStr, $lte: endStr },
      }),
    ]);

    // Group attendances and sheets by userId
    const attendanceByUser: Record<string, typeof attendances> = {};
    const sheetsByUser: Record<string, typeof sheets> = {};

    employeeIds.forEach((id) => {
      attendanceByUser[id.toString()] = [];
      sheetsByUser[id.toString()] = [];
    });

    attendances.forEach((a) => {
      const uId = a.userId.toString();
      if (attendanceByUser[uId]) attendanceByUser[uId].push(a);
    });

    sheets.forEach((s) => {
      const uId = s.userId.toString();
      if (sheetsByUser[uId]) sheetsByUser[uId].push(s);
    });

    // Compile report data per employee
    const reports = employees.map((emp) => {
      const uId = emp._id.toString();
      const userAtts = attendanceByUser[uId] || [];
      const userSheets = sheetsByUser[uId] || [];

      let totalWorkMinutes = 0;
      let totalBreakMinutes = 0;
      let presentDays = 0;
      let leaveDays = 0;
      let absentDays = 0;
      let wfhDays = 0;
      let overtimeMinutes = 0;

      userAtts.forEach((a) => {
        if (a.status === "PRESENT") {
          presentDays++;
        } else if (a.status === "LEAVE") {
          leaveDays++;
        } else if (a.status === "ABSENT") {
          absentDays++;
        } else if (a.status === "WFH") {
          wfhDays++;
        }

        totalWorkMinutes += a.workDurationMinutes || 0;
        totalBreakMinutes += a.breakDurationMinutes || 0;

        // Overtime threshold is 8 hours (480 minutes)
        if (a.workDurationMinutes > 480) {
          overtimeMinutes += a.workDurationMinutes - 480;
        }
      });

      // Calculate task statistics
      let totalTasks = 0;
      let completedTasks = 0;
      let approvedTasks = 0;
      let pendingReviewTasks = 0;

      userSheets.forEach((s) => {
        totalTasks += s.tasks?.length || 0;
        s.tasks?.forEach((t: any) => {
          if (t.status === "COMPLETED") completedTasks++;
          if (t.status === "APPROVED") approvedTasks++;
          if (t.status === "WAITING_FOR_REVIEW") pendingReviewTasks++;
        });
      });

      const taskCompletionRate = totalTasks > 0 ? Math.round(((completedTasks + approvedTasks) / totalTasks) * 100) : 0;

      return {
        userId: emp._id,
        name: emp.name,
        email: emp.email,
        designation: emp.designation,
        status: emp.status,
        metrics: {
          presentDays,
          absentDays,
          leaveDays,
          wfhDays,
          totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
          totalBreakHours: Math.round((totalBreakMinutes / 60) * 10) / 10,
          overtimeHours: Math.round((overtimeMinutes / 60) * 10) / 10,
          totalTasks,
          completedTasks,
          approvedTasks,
          pendingReviewTasks,
          taskCompletionRate,
        },
      };
    });

    return NextResponse.json({
      year,
      month,
      reports,
    });
  } catch (error) {
    console.error("GET Reports Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

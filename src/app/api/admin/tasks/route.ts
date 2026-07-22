import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { SheetData } from "@/models/SheetData";
import { Notification } from "@/models/Notification";
import { AuditLog } from "@/models/AuditLog";
import { getOrCreateSheetData } from "@/app/api/tasks/route";
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
    const date = searchParams.get("date") || getKolkataDateString();
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    // Fetch all sheets for the date
    const query: Record<string, any> = { date };
    if (userId) {
      query.userId = userId;
    }

    const sheets = await SheetData.find(query)
      .populate("userId", "name email designation role")
      .populate("templateId");

    // Flatten tasks and include user context
    let allTasks: any[] = [];
    sheets.forEach((sheet) => {
      sheet.tasks.forEach((task: any) => {
        if (!status || task.status === status) {
          allTasks.push({
            _id: task._id,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            userId: (sheet.userId as any)?._id,
            userName: (sheet.userId as any)?.name,
            userEmail: (sheet.userId as any)?.email,
            userDesignation: (sheet.userId as any)?.designation,
            date: sheet.date,
            sheetId: sheet._id,
          });
        }
      });
    });

    // Sort by updatedAt desc
    allTasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return NextResponse.json({ tasks: allTasks });
  } catch (error) {
    console.error("GET Admin Tasks Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const admin = await checkAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, priority, employeeIds, date = getKolkataDateString() } = body;

    if (!title || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: "title and employeeIds (non-empty array) are required" }, { status: 400 });
    }

    const createdTasksCount = employeeIds.length;
    const taskPromises = employeeIds.map(async (empId: string) => {
      const sheet = await getOrCreateSheetData(empId, date);
      const newTask = {
        title,
        description: description || "",
        category: category || "General",
        priority: priority || "MEDIUM",
        status: "NOT_STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      sheet.tasks.push(newTask);
      await sheet.save();

      // Notify the employee
      await Notification.create({
        userId: empId,
        title: "New Task Assigned",
        message: `Admin ${admin.name} assigned you a task: "${title}" for ${date}`,
        type: "TASK_ASSIGNED",
      });
    });

    await Promise.all(taskPromises);

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: "TASK_ASSIGN_BULK",
      details: `Admin ${admin.email} assigned task "${title}" to ${createdTasksCount} users on ${date}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: `Task assigned successfully to ${createdTasksCount} employees.` });
  } catch (error: any) {
    console.error("POST Admin Task Assign Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { SheetData } from "@/models/SheetData";
import { User } from "@/models/User";
import { SheetTemplate } from "@/models/SheetTemplate";
import { FixedTask } from "@/models/FixedTask";
import { getKolkataDateString } from "@/lib/date";

// Helper to get or create sheet data with columnsSnapshot locking
export async function getOrCreateSheetData(userId: string, date: string) {
  let sheet = await SheetData.findOne({ userId, date });
  if (!sheet) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.assignedTemplateId) {
      // Fallback: see if we can find a default template matching designation
      const defaultTemplate = await SheetTemplate.findOne({ assignedRoles: user.designation, isActive: true });
      if (defaultTemplate) {
        user.assignedTemplateId = defaultTemplate._id;
        await user.save();
      } else {
        throw new Error("No sheet template assigned to employee");
      }
    }

    const template = await SheetTemplate.findById(user.assignedTemplateId);
    if (!template) {
      throw new Error("Assigned template not found");
    }

    // Fetch and map daily fixed tasks matching user designation or ALL
    const fixedTasks = await FixedTask.find({
      $or: [
        { assignedDesignation: "ALL" },
        { assignedDesignation: user.designation },
      ],
    });
    const initialTasks = fixedTasks.map((ft) => ({
      title: ft.title,
      description: ft.description || "",
      category: ft.category || "General",
      priority: ft.priority || "MEDIUM",
      status: "NOT_STARTED",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    sheet = new SheetData({
      userId,
      date,
      templateId: template._id,
      columnsSnapshot: template.columns,
      data: new Map(),
      tasks: initialTasks,
    });
    await sheet.save();
  }
  return sheet;
}

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
    const date = searchParams.get("date") || getKolkataDateString();
    const userId = searchParams.get("userId") || payload.userId;

    // Check permissions: users can only fetch their own data unless they are admins or managers
    if (userId !== payload.userId && !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const sheet = await getOrCreateSheetData(userId, date);
      return NextResponse.json({ sheet });
    } catch (e: any) {
      return NextResponse.json({ error: e.message, code: "TEMPLATE_MISSING" }, { status: 400 });
    }
  } catch (error) {
    console.error("GET Tasks Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { title, description, category, priority, status, date = getKolkataDateString() } = body;

    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const sheet = await getOrCreateSheetData(payload.userId, date);

    const newTask = {
      title,
      description: description || "",
      category: category || "General",
      priority: priority || "MEDIUM",
      status: status || "NOT_STARTED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    sheet.tasks.push(newTask);
    await sheet.save();

    return NextResponse.json({ message: "Task added successfully", task: sheet.tasks[sheet.tasks.length - 1] });
  } catch (error: any) {
    console.error("POST Task Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

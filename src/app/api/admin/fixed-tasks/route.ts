import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { FixedTask } from "@/models/FixedTask";
import { AuditLog } from "@/models/AuditLog";

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

    const fixedTasks = await FixedTask.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ fixedTasks });
  } catch (error: any) {
    console.error("GET Fixed Tasks Error:", error);
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
    const { title, description, priority = "MEDIUM", category = "General", assignedUserId = "ALL" } = body;

    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const newFixedTask = await FixedTask.create({
      title,
      description: description || "",
      priority,
      category,
      assignedUserId,
    });

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await AuditLog.create({
      userId: admin.userId,
      action: "FIXED_TASK_CREATE",
      details: `Admin ${admin.email} created fixed task: "${title}"`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Fixed task created successfully", fixedTask: newFixedTask });
  } catch (error: any) {
    console.error("POST Fixed Task Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

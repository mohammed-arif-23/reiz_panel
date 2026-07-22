import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { SheetData } from "@/models/SheetData";
import { Notification } from "@/models/Notification";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
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

    const { taskId } = await params;
    const body = await request.json();
    const { title, description, category, priority, status } = body;

    const sheet = await SheetData.findOne({ "tasks._id": taskId });
    if (!sheet) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Authorization check
    const isOwner = sheet.userId.toString() === payload.userId;
    const isAuthorized = isOwner || ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find task in array
    const taskIndex = sheet.tasks.findIndex((t: any) => t._id.toString() === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ error: "Task not found in sheet" }, { status: 404 });
    }

    const task = sheet.tasks[taskIndex];

    const oldStatus = task.status;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (category !== undefined) task.category = category;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    task.updatedAt = new Date();

    await sheet.save();

    // Trigger Notification for Review / Approval updates
    if (status !== oldStatus) {
      if (status === "WAITING_FOR_REVIEW" && isOwner) {
        // Find managers or admins to notify
        // For simplicity, we can create a general notification for managers
      } else if (status === "APPROVED" && !isOwner) {
        // Notify the employee that their task was approved
        await Notification.create({
          userId: sheet.userId,
          title: "Task Approved",
          message: `Your task "${task.title}" has been approved.`,
          type: "TASK_REVIEW",
        });
      }
    }

    return NextResponse.json({ message: "Task updated successfully", task });
  } catch (error: any) {
    console.error("PUT Task Details Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
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

    const { taskId } = await params;

    const sheet = await SheetData.findOne({ "tasks._id": taskId });
    if (!sheet) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Authorization check
    const isOwner = sheet.userId.toString() === payload.userId;
    const isAuthorized = isOwner || ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove task from array
    sheet.tasks = sheet.tasks.filter((t: any) => t._id.toString() !== taskId);
    await sheet.save();

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Task Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

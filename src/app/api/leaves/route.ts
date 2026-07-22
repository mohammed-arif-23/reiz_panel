import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";

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
    const all = searchParams.get("all") === "true";

    let leaves;
    if (all && ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
      leaves = await LeaveRequest.find({}).populate("userId", "name email designation role").sort({ createdAt: -1 });
    } else {
      leaves = await LeaveRequest.find({ userId: payload.userId }).sort({ createdAt: -1 });
    }

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error("GET Leaves Error:", error);
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
    const { type, startDate, endDate, reason } = body;

    if (!type || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Type, startDate, endDate, and reason are required" }, { status: 400 });
    }

    const newLeave = new LeaveRequest({
      userId: payload.userId,
      type,
      startDate,
      endDate,
      reason,
      status: "PENDING",
    });

    await newLeave.save();

    // Notify admins / managers
    const managersAndAdmins = await User.find({ role: { $in: ["SUPER_ADMIN", "ADMIN", "MANAGER"] } });
    const notificationPromises = managersAndAdmins.map((manager) => {
      return Notification.create({
        userId: manager._id,
        title: "New Leave Request",
        message: `${payload.name} has requested a ${type.replace("_", " ")} from ${startDate} to ${endDate}.`,
        type: "LEAVE_STATUS",
      });
    });
    await Promise.all(notificationPromises);

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: payload.userId,
      action: "LEAVE_REQUEST",
      details: `User ${payload.email} requested leave (${type}) from ${startDate} to ${endDate}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Leave requested successfully", leave: newLeave });
  } catch (error: any) {
    console.error("POST Leave Request Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

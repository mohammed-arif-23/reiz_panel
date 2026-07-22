import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Notification } from "@/models/Notification";

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

    const notifications = await Notification.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET Notifications Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { notificationId, markAll } = body;

    if (markAll) {
      await Notification.updateMany({ userId: payload.userId, isRead: false }, { $set: { isRead: true } });
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: payload.userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("PUT Notification Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

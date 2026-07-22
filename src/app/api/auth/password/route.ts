import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { comparePassword, hashPassword } from "@/lib/bcrypt";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";

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
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_CHANGE",
      details: `User ${user.email} updated their password`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("PUT Password Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

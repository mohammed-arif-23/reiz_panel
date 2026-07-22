import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { AuditLog } from "@/models/AuditLog";

async function checkAdminAccess(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !["SUPER_ADMIN", "ADMIN"].includes(payload.role)) return null;

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
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const logs = await AuditLog.find({})
      .populate("userId", "name email role designation")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments({});

    return NextResponse.json({ logs, total, limit, skip });
  } catch (error) {
    console.error("GET Audit Logs Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

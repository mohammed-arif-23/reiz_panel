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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const admin = await checkAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const taskToDelete = await FixedTask.findByIdAndDelete(id);

    if (!taskToDelete) {
      return NextResponse.json({ error: "Fixed task not found" }, { status: 404 });
    }

    // Create Audit Log
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    await AuditLog.create({
      userId: admin.userId,
      action: "FIXED_TASK_DELETE",
      details: `Admin ${admin.email} deleted fixed task: "${taskToDelete.title}"`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Fixed task deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Fixed Task Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

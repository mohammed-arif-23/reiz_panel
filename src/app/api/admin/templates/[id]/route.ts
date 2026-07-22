import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { SheetTemplate } from "@/models/SheetTemplate";
import { AuditLog } from "@/models/AuditLog";

async function checkAdminAccess(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !["SUPER_ADMIN", "ADMIN"].includes(payload.role)) return null;

  return payload;
}

export async function PUT(
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
    const body = await request.json();
    const { name, columns, assignedRoles, isActive } = body;

    const template = await SheetTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (name) template.name = name;
    if (columns && Array.isArray(columns)) template.columns = columns;
    if (assignedRoles && Array.isArray(assignedRoles)) template.assignedRoles = assignedRoles;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    // Log update
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: "TEMPLATE_UPDATE",
      details: `Admin ${admin.email} updated template ${template.name}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Template updated successfully", template });
  } catch (error: any) {
    console.error("PUT Template Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
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

    const template = await SheetTemplate.findByIdAndDelete(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Log deletion
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: "TEMPLATE_DELETE",
      details: `Admin ${admin.email} deleted template ${template.name}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("DELETE Template Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const admin = await checkAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await SheetTemplate.find({});
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("GET Templates Error:", error);
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
    const { name, columns, assignedRoles, isActive } = body;

    if (!name || !columns || !Array.isArray(columns)) {
      return NextResponse.json({ error: "Name and columns array are required" }, { status: 400 });
    }

    const newTemplate = new SheetTemplate({
      name,
      columns,
      assignedRoles: assignedRoles || [],
      isActive: isActive !== undefined ? isActive : true,
    });

    await newTemplate.save();

    // Log the creation
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: "TEMPLATE_CREATE",
      details: `Admin ${admin.email} created template ${newTemplate.name}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Template created successfully", template: newTemplate });
  } catch (error: any) {
    console.error("POST Template Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

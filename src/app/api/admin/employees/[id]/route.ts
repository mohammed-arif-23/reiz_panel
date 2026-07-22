import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/bcrypt";
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
    const { name, email, password, role, designation, status, assignedTemplateId } = body;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (email && email.toLowerCase() !== user.email) {
      const emailConflict = await User.findOne({ email: email.toLowerCase() });
      if (emailConflict) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (designation !== undefined) user.designation = designation;
    if (status) user.status = status;
    
    // Allow unassigning by passing null or empty string
    if (assignedTemplateId === "" || assignedTemplateId === null) {
      user.assignedTemplateId = null;
    } else if (assignedTemplateId) {
      user.assignedTemplateId = assignedTemplateId;
    }

    if (password) {
      user.password = await hashPassword(password);
    }

    await user.save();

    // Log update
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: "USER_UPDATE",
      details: `Admin ${admin.email} updated user ${user.email}`,
      ipAddress: ip,
    });

    const responseUser: any = user.toObject();
    delete responseUser.password;

    return NextResponse.json({ message: "Employee updated successfully", user: responseUser });
  } catch (error: any) {
    console.error("PUT Employee Error:", error);
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

    if (id === admin.userId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log deletion
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: "USER_DELETE",
      details: `Admin ${admin.email} deleted user ${user.email}`,
      ipAddress: ip,
    });

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("DELETE Employee Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

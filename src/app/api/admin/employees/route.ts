import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/bcrypt";
import { AuditLog } from "@/models/AuditLog";

// Helper to check admin access
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

    const users = await User.find({}).populate("assignedTemplateId").select("-password");
    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET Employees Error:", error);
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
    const { name, email, password, role, designation, status, assignedTemplateId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      designation: designation || "",
      status: status || "ACTIVE",
      assignedTemplateId: assignedTemplateId || null,
    });

    await newUser.save();

    // Log the creation
    const ip = request.headers.get("x-forwarded-for") || "";
    await AuditLog.create({
      userId: admin.userId,
      action: "USER_CREATE",
      details: `Admin ${admin.email} created user ${newUser.email} with role ${newUser.role}`,
      ipAddress: ip,
    });

    const responseUser: any = newUser.toObject();
    delete responseUser.password;

    return NextResponse.json({ message: "Employee created successfully", user: responseUser });
  } catch (error: any) {
    console.error("POST Employee Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

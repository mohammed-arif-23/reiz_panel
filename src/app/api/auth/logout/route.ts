import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { AuditLog } from "@/models/AuditLog";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const token = request.cookies.get("token")?.value;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const ip = request.headers.get("x-forwarded-for") || "";
        await AuditLog.create({
          userId: payload.userId,
          action: "USER_LOGOUT",
          details: `User ${payload.email} logged out successfully`,
          ipAddress: ip,
        });
      }
    }

    const response = NextResponse.json({ message: "Logged out successfully" });
    response.cookies.delete("token");
    return response;
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

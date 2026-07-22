import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";

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

    const user = await User.findById(payload.userId)
      .populate("assignedTemplateId")
      .select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status === "INACTIVE") {
      const response = NextResponse.json({ error: "User is inactive" }, { status: 403 });
      response.cookies.delete("token");
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth Me API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

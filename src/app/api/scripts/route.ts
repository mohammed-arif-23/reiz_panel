import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { User } from "@/models/User";
import { Script } from "@/models/Script";

// Helper to check admin/employee access
async function checkAuth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await checkAuth(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    let query: any = {};
    if (payload.role === "CLIENT") {
      query.clientId = payload.userId;
    } else if (payload.role === "EMPLOYEE") {
      query.writerId = payload.userId;
    } else if (clientId) {
      query.clientId = clientId;
    }

    const scripts = await Script.find(query)
      .populate("clientId", "name email designation")
      .populate("writerId", "name email designation")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ scripts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const payload = await checkAuth(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { clientId, title, fileName, scriptContent, videoUrl } = body;

    if (!clientId || !title || !scriptContent) {
      return NextResponse.json({ error: "Client, title, and script content are required" }, { status: 400 });
    }

    const script = await Script.create({
      clientId,
      writerId: payload.userId,
      title,
      fileName: fileName || "",
      scriptContent,
      videoUrl: videoUrl || "",
      status: "PENDING_REVIEW",
    });

    return NextResponse.json({ message: "Script submitted to client successfully", script }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

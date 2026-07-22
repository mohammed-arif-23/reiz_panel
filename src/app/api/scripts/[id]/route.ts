import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Script } from "@/models/Script";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, feedback } = body; // action: "APPROVE" | "CORRECTION"

    const script = await Script.findById(id);
    if (!script) return NextResponse.json({ error: "Script not found" }, { status: 404 });

    if (payload.role === "CLIENT" && script.clientId.toString() !== payload.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "APPROVE") {
      script.status = "APPROVED";
      script.clientFeedback = feedback || "Approved by client";
    } else if (action === "CORRECTION") {
      script.status = "CORRECTION_REQUESTED";
      script.clientFeedback = feedback || "Corrections requested by client";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    script.updatedAt = new Date();
    await script.save();

    return NextResponse.json({ message: `Script status updated to ${script.status}`, script });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

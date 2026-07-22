import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getOrCreateSheetData } from "@/app/api/tasks/route";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { userId, date, entries, columnKey, value } = body;

    const targetUserId = userId || payload.userId;
    if (!targetUserId || !date) {
      return NextResponse.json({ error: "userId and date are required" }, { status: 400 });
    }

    // Authorization check
    const isOwner = targetUserId === payload.userId;
    const isAuthorized = isOwner || ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sheet = await getOrCreateSheetData(targetUserId, date);

    // Support array of entries (multiple work entries per day)
    if (Array.isArray(entries)) {
      sheet.data.set("entries", entries);
    } else if (columnKey) {
      // Legacy / single key setting support
      if (value === undefined || value === null || value === "") {
        sheet.data.delete(columnKey);
      } else {
        sheet.data.set(columnKey, value);
      }
    }

    await sheet.save();

    return NextResponse.json({
      message: "Cell updated successfully",
      data: Object.fromEntries(sheet.data),
    });
  } catch (error: any) {
    console.error("POST Tasks Cell Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Holiday } from "@/models/Holiday";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const holidays = await Holiday.find().sort({ date: 1 }).lean();
    return NextResponse.json({ holidays });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !["SUPER_ADMIN", "ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const { name, date, isOptional } = body;
    if (!name || !date) {
      return NextResponse.json({ error: "name and date are required" }, { status: 400 });
    }
    const holiday = await Holiday.create({ name, date, isOptional: !!isOptional });
    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

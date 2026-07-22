import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getOrCreateSheetData } from "@/app/api/tasks/route";
import { getKolkataDateString } from "@/lib/date";

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
    const { eodSummary, date = getKolkataDateString() } = body;

    if (eodSummary === undefined) {
      return NextResponse.json({ error: "EOD Summary is required" }, { status: 400 });
    }

    const sheet = await getOrCreateSheetData(payload.userId, date);
    sheet.eodSummary = eodSummary;
    sheet.submittedAt = new Date();

    await sheet.save();

    return NextResponse.json({ message: "EOD summary submitted successfully", sheet });
  } catch (error: any) {
    console.error("POST EOD Summary Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

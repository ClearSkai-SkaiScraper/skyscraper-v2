export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Note: This requires adding shareToken field to WeatherReport model
    // For now, we'll fetch by ID as a workaround
    const report = await prisma.weather_reports.findFirst({
      where: {
        // shareToken: token, // Uncomment when field is added
        id: token, // Temporary: treat token as ID
      },
      select: {
        id: true,
        address: true,
        dol: true,
        primaryPeril: true,
        providerRaw: true,
        globalSummary: true,
        createdAt: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Weather report not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err) {
    logger.error("WEATHER SHARE GET ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch shared report" },
      { status: 500 }
    );
  }
}

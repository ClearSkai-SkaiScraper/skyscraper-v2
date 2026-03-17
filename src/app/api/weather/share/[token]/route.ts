export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: "Invalid share token" }, { status: 400 });
    }

    // Validate share token: HMAC(reportId, secret) = token
    // The token encodes which report to show — we iterate recent shared reports
    // to find the one whose HMAC matches (prevents ID enumeration).
    const crypto = await import("crypto");
    const secret = process.env.WEATHER_SHARE_SECRET || "skaiscraper-weather-share-default";

    // Try to find the report by looking up recent shared reports and checking HMAC
    // First, try direct lookup if it's a valid HMAC token
    const reports = await prisma.weather_reports.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: {
        id: true,
        address: true,
        dol: true,
        primaryPeril: true,
        providerRaw: true,
        globalSummary: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const report = reports.find((r) => {
      const expected = crypto.createHmac("sha256", secret).update(r.id).digest("hex").slice(0, 32);
      return expected === token;
    });

    if (!report) {
      return NextResponse.json(
        { error: "Weather report not found or link expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err) {
    logger.error("WEATHER SHARE GET ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch shared report" }, { status: 500 });
  }
}

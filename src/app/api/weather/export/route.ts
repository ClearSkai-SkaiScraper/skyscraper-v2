export const dynamic = "force-dynamic";

// app/api/weather/export/route.ts
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";
import { buildWeatherPacket } from "@/lib/weather/buildWeatherPacket";

/**
 * WEATHER PACKET EXPORT API
 *
 * Generates 4 variants of weather reports:
 * - CLAIMS: Technical, adjuster-focused, code-heavy
 * - HOMEOWNER: Simple, friendly, sales-ready
 * - QUICK: One-page internal snapshot
 * - PA: Forensic detail for public adjusters/litigation
 *
 * POST /api/weather/export
 * Body: { reportId, format }
 * Returns: { success, packet }
 */
export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json();
    const { reportId, format } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    if (!format || !["CLAIMS", "HOMEOWNER", "QUICK", "PA"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be CLAIMS, HOMEOWNER, QUICK, or PA" },
        { status: 400 }
      );
    }

    // Pull weather report from database
    const report = await prisma.weather_reports.findUnique({
      where: { id: reportId },
      include: {
        claims: {
          include: {
            properties: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Weather report not found" }, { status: 404 });
    }

    // Verify org access — must belong to user's org (orgId is DB-backed UUID from withAuth)
    if (report.claimId) {
      const claim = report.claims;
      if (claim && claim.orgId !== orgId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Build the packet using the weather intelligence engine
    const packet = await buildWeatherPacket({
      format: format as "CLAIMS" | "HOMEOWNER" | "QUICK" | "PA",
      weather: report.globalSummary || report.events || {},
      claim_id: report.claimId ?? undefined,
      address: report.claims?.properties?.street ?? report.address ?? "Unknown Address",
      dateOfLoss: report.dol?.toISOString() ?? undefined,
      peril: report.primaryPeril ?? "Unknown",
    });

    return NextResponse.json(
      {
        success: true,
        packet,
        reportId: report.id,
        format,
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("WEATHER PACKET EXPORT ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Packet export failed" },
      { status: 500 }
    );
  }
});

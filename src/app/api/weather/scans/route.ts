/**
 * GET  /api/weather/scans?claimId=xxx — List saved weather scans for a claim
 *
 * Returns all quick_dol and full_report weather_reports for the claim,
 * organized by peril category with radar station info.
 */
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: {
        id: true,
        dateOfLoss: true,
        properties: { select: { street: true, city: true, state: true, zipCode: true } },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch all scans for this claim
    const scans = await prisma.weather_reports.findMany({
      where: { claimId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mode: true,
        address: true,
        dol: true,
        lossType: true,
        primaryPeril: true,
        confidence: true,
        candidateDates: true,
        events: true,
        globalSummary: true,
        createdAt: true,
        periodFrom: true,
        periodTo: true,
        users: {
          select: { name: true },
        },
      },
    });

    // Categorize by peril type
    const categorized = {
      hail: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("hail");
      }),
      wind: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("wind") && !peril.includes("hail");
      }),
      hailAndWind: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("hail") && peril.includes("wind");
      }),
      tropical: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return (
          peril.includes("tropical") || peril.includes("hurricane") || peril.includes("typhoon")
        );
      }),
      water: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("water") || peril.includes("flood") || peril.includes("rain");
      }),
      other: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return (
          !peril ||
          (!peril.includes("hail") &&
            !peril.includes("wind") &&
            !peril.includes("tropical") &&
            !peril.includes("hurricane") &&
            !peril.includes("water") &&
            !peril.includes("flood") &&
            !peril.includes("rain"))
        );
      }),
    };

    return NextResponse.json({
      scans,
      categorized,
      currentDol: claim.dateOfLoss,
      claimAddress: claim.properties
        ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
        : null,
      totalScans: scans.length,
    });
  } catch (err) {
    logger.error("[WEATHER_SCANS] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
});

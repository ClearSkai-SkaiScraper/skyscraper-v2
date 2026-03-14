/**
 * PATCH /api/weather/set-dol — Set/update the Date of Loss on a claim
 *
 * Body: { claimId, dol: "YYYY-MM-DD", scanId?: string }
 * One-click DOL update from a saved weather scan.
 */
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const PATCH = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = await req.json();
    const { claimId, dol, scanId } = body;

    if (!claimId || !dol) {
      return NextResponse.json({ error: "claimId and dol are required" }, { status: 400 });
    }

    // Parse and validate date
    const dolDate = new Date(dol);
    if (isNaN(dolDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true, dateOfLoss: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const previousDol = claim.dateOfLoss;

    // Update claim's dateOfLoss
    await prisma.claims.update({
      where: { id: claimId },
      data: {
        dateOfLoss: dolDate,
        updatedAt: new Date(),
      },
    });

    // Log activity
    try {
      await prisma.activity_logs.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          userId,
          entityType: "claim",
          entityId: claimId,
          action: "dol_updated",
          metadata: {
            previousDol: previousDol?.toISOString() || null,
            newDol: dolDate.toISOString(),
            source: scanId ? "weather_scan" : "manual",
            scanId: scanId || null,
          },
          createdAt: new Date(),
        },
      });
    } catch (logErr) {
      logger.error("[SET_DOL] Activity log failed:", logErr);
    }

    logger.info("[SET_DOL] Updated DOL on claim", {
      claimId,
      previousDol: previousDol?.toISOString(),
      newDol: dolDate.toISOString(),
      scanId,
    });

    return NextResponse.json({
      success: true,
      claimId,
      previousDol: previousDol?.toISOString() || null,
      newDol: dolDate.toISOString(),
    });
  } catch (err) {
    logger.error("[SET_DOL] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update DOL" }, { status: 500 });
  }
});

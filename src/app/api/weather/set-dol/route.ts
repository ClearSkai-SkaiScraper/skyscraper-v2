/**
 * PATCH /api/weather/set-dol — Set/update the Date of Loss on a claim
 *
 * Body: { claimId, dol: "YYYY-MM-DD", scanId?: string }
 * One-click DOL update from a saved weather scan.
 */
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { sendTemplatedNotification } from "@/lib/notifications/templates";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const PATCH = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = await req.json();
    const { claimId, dol, scanId, perilType } = body;

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
      select: { id: true, dateOfLoss: true, damageType: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const previousDol = claim.dateOfLoss;
    const previousDamageType = claim.damageType;

    // Normalize peril type to damage type format (capitalize first letter)
    const normalizedDamageType =
      perilType && perilType !== "unknown"
        ? perilType.charAt(0).toUpperCase() + perilType.slice(1).toLowerCase()
        : null;

    // Update claim's dateOfLoss and optionally damageType
    await prisma.claims.update({
      where: { id: claimId },
      data: {
        dateOfLoss: dolDate,
        ...(normalizedDamageType && { damageType: normalizedDamageType }),
        updatedAt: new Date(),
      },
    });

    // Log activity
    try {
      const descParts = [scanId ? "DOL set from weather scan" : "DOL set manually"];
      if (normalizedDamageType && normalizedDamageType !== previousDamageType) {
        descParts.push(`Cause of loss: ${normalizedDamageType}`);
      }
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          type: "dol_updated",
          title: normalizedDamageType ? "Date of Loss & Cause Updated" : "Date of Loss updated",
          description: descParts.join(". "),
          userId,
          userName: userId,
          claimId,
          metadata: {
            previousDol: previousDol?.toISOString() || null,
            newDol: dolDate.toISOString(),
            previousDamageType: previousDamageType || null,
            newDamageType: normalizedDamageType || null,
            source: scanId ? "weather_scan" : "manual",
            scanId: scanId || null,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (logErr) {
      logger.error("[SET_DOL] Activity log failed:", logErr);
    }

    // Notify claim owner about DOL update
    try {
      const claimNumber = claim.id.slice(0, 8).toUpperCase();
      await sendTemplatedNotification("DOL_UPDATED", userId, {
        claimNumber,
        newDol: dolDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        source: scanId ? "Weather Scan" : "Manual Entry",
      });
    } catch (notifErr) {
      logger.error("[SET_DOL] Notification failed (non-critical):", notifErr);
    }

    logger.info("[SET_DOL] Updated DOL on claim", {
      claimId,
      previousDol: previousDol?.toISOString(),
      newDol: dolDate.toISOString(),
      previousDamageType,
      newDamageType: normalizedDamageType,
      scanId,
    });

    return NextResponse.json({
      success: true,
      claimId,
      previousDol: previousDol?.toISOString() || null,
      newDol: dolDate.toISOString(),
      previousDamageType: previousDamageType || null,
      newDamageType: normalizedDamageType,
    });
  } catch (err) {
    logger.error("[SET_DOL] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update DOL" }, { status: 500 });
  }
});

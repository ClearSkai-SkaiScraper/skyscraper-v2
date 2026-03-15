export const dynamic = "force-dynamic";
export const revalidate = 0;

// src/app/api/weather/quick-dol/route.ts
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { QuickDolInput, runQuickDol } from "@/lib/ai/weather";
import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

type WeatherUiQuickDolRequest = {
  address?: string;
  lossType?: "unspecified" | "hail" | "wind" | "water";
  dateFrom?: string;
  dateTo?: string;
  orgId?: string;
  claimId?: string;
  /** Legacy / alternate key for dateFrom */
  startDate?: string;
  /** Legacy / alternate key for dateTo */
  endDate?: string;
};

function normalizeConfidence(score: unknown): number {
  const n = typeof score === "number" ? score : 0;
  if (!Number.isFinite(n)) return 0;
  // Some callers produce 0-100, others 0-1
  if (n > 1) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

function mapLossTypeToPeril(
  lossType: WeatherUiQuickDolRequest["lossType"]
): QuickDolInput["peril"] {
  if (!lossType || lossType === "unspecified") return undefined;
  if (lossType === "water") return "rain";
  return lossType;
}

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // Rate limiting check
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as WeatherUiQuickDolRequest;

    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }

    const startDate =
      typeof body.dateFrom === "string"
        ? body.dateFrom
        : typeof body.startDate === "string"
          ? body.startDate
          : undefined;

    const endDate =
      typeof body.dateTo === "string"
        ? body.dateTo
        : typeof body.endDate === "string"
          ? body.endDate
          : undefined;

    const input: QuickDolInput = {
      address,
      startDate,
      endDate,
      peril: mapLossTypeToPeril(body.lossType),
    };

    const result = await runQuickDol(input);

    const candidates = (result.candidates || []).map((c) => ({
      date: c.date,
      confidence: normalizeConfidence(c.score),
      reasoning: c.reason || undefined,
      perilType: body.lossType || "unknown",
    }));

    const response = {
      candidates,
      notes: result.bestGuess ? `Best guess: ${result.bestGuess}` : undefined,
      scanId: null as string | null,
    };

    // ── Resolve DB user ID for FK (weather_reports.createdById → users.id) ──
    const dbUser = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!dbUser) {
      logger.warn("[weather/quick-dol] No DB user found for Clerk userId:", userId);
      // Return results but warn that scan could not be saved
      return NextResponse.json(
        { ...response, warning: "Scan results returned but could not be saved (user not synced)." },
        { status: 200 }
      );
    }

    // ── Save scan to weather_reports for recall + history ──
    try {
      const scanId = crypto.randomUUID();
      await prisma.weather_reports.create({
        data: {
          id: scanId,
          claimId: body.claimId || null,
          createdById: dbUser.id,
          updatedAt: new Date(),
          mode: "quick_dol",
          address,
          lossType: body.lossType || null,
          dol: candidates[0]?.date ? new Date(candidates[0].date) : null,
          periodFrom: startDate ? new Date(startDate) : null,
          periodTo: endDate ? new Date(endDate) : null,
          primaryPeril: body.lossType || null,
          confidence: candidates[0]?.confidence ?? null,
          candidateDates: candidates,
          events: result.candidates || [],
          globalSummary: {
            notes: result.bestGuess || null,
            scanType: "quick_dol",
            perilCategory: body.lossType || "auto",
          },
          providerRaw: result,
        },
      });
      response.scanId = scanId;
      logger.info("[weather/quick-dol] Saved scan", { scanId, claimId: body.claimId, orgId });
    } catch (dbErr) {
      logger.error("[weather/quick-dol] Failed to save scan:", dbErr);
      return NextResponse.json(
        { ...response, warning: "Scan completed but failed to save to database." },
        { status: 200 }
      );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    logger.error("Error in /api/weather/quick-dol:", err);
    return NextResponse.json({ error: "Failed to run Quick DOL." }, { status: 500 });
  }
});

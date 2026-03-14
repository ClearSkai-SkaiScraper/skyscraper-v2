export const dynamic = "force-dynamic";

// src/app/api/weather/quick-dol/route.ts
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { QuickDolInput, runQuickDol } from "@/lib/ai/weather";
import { getTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    let effectiveUserId = userId;
    const devKeyHeader = req.headers.get("x-dev-weather-key");
    const devKeyEnv = process.env.WEATHER_DEV_KEY;
    if (
      !effectiveUserId &&
      devKeyEnv &&
      devKeyHeader === devKeyEnv &&
      process.env.NODE_ENV !== "production"
    ) {
      // Dev-only bypass: allow local testing without Clerk session
      effectiveUserId = "dev-weather-bypass";
    }
    if (!effectiveUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limiting check (20 requests per minute for weather endpoints)
    const identifier = getRateLimitIdentifier(effectiveUserId, req);
    const allowed = await rateLimiters.weather.check(20, identifier);
    if (!allowed) {
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

    // Save scan to weather_reports for recall + history
    const resolvedOrgId = effectiveUserId !== "dev-weather-bypass" ? await getTenant() : null;
    if (resolvedOrgId && effectiveUserId !== "dev-weather-bypass") {
      try {
        const scanId = crypto.randomUUID();
        await prisma.weather_reports.create({
          data: {
            id: scanId,
            claimId: body.claimId || null,
            createdById: effectiveUserId,
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
        logger.info("[weather/quick-dol] Saved scan", { scanId, claimId: body.claimId });
      } catch (dbErr) {
        logger.error("[weather/quick-dol] Failed to save scan:", dbErr);
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    logger.error("Error in /api/weather/quick-dol:", err);
    return NextResponse.json({ error: "Failed to run Quick DOL." }, { status: 500 });
  }
}

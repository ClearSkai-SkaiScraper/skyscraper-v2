export const dynamic = "force-dynamic";

// src/app/api/weather/quick-dol/route.ts
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { QuickDolInput, runQuickDol } from "@/lib/ai/weather";
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

    const response = {
      candidates: (result.candidates || []).map((c) => ({
        date: c.date,
        confidence: normalizeConfidence(c.score),
        reasoning: c.reason || undefined,
      })),
      notes: result.bestGuess ? `Best guess: ${result.bestGuess}` : undefined,
    };

    // Save to ai_reports for demo visibility
    if (body.orgId && effectiveUserId !== "dev-weather-bypass") {
      try {
        await prisma.ai_reports.create({
          data: {
            id: crypto.randomUUID(),
            orgId: body.orgId,
            userId: effectiveUserId,
            userName: "system",
            claimId: body.claimId || null,
            type: "weather",
            title: `Quick DOL - ${address}`,
            prompt: JSON.stringify({
              address,
              lossType: body.lossType,
              dateFrom: body.dateFrom,
              dateTo: body.dateTo,
            }),
            content: JSON.stringify(response),
            tokensUsed: 0,
            status: "completed",
            updatedAt: new Date(),
          },
        });
      } catch (dbErr) {
        logger.error("[weather/quick-dol] Failed to save to ai_reports:", dbErr);
        // Continue even if save fails - don't break demo
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    logger.error("Error in /api/weather/quick-dol:", err);
    return NextResponse.json({ error: "Failed to run Quick DOL." }, { status: 500 });
  }
}

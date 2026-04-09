export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const AiBuildSchema = z.object({
  claimId: z.string().min(1, "claimId required"),
  damageLabels: z.array(z.object({
    damageTypes: z.union([z.string(), z.array(z.string())]),
  }).passthrough()),
  weather: z.object({
    summary: z.string().optional(),
  }).passthrough().optional(),
});

export async function POST(req: Request) {
  try {
    // Auth check — DB-backed org resolution (B-01: cross-tenant fix)
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { userId, orgId } = auth;

    const raw = await req.json();
    const parsed = AiBuildSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { claimId, damageLabels, weather } = parsed.data;

    // Verify claim exists AND belongs to caller's org (B-01: cross-tenant fix)
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true, orgId: true },
    });

    if (!claim) {
      return NextResponse.json(
        { ok: false, error: "Claim not found" },
        { status: 404 }
      );
    }

    // Build line items automatically based on detected damage
    const lineItems: Array<{
      code: string;
      description: string;
      qty: number;
      unit: string;
    }> = [];

    for (const d of damageLabels) {
      const types = Array.isArray(d.damageTypes) ? d.damageTypes : [d.damageTypes];

      for (const type of types) {
        const lowerType = String(type).toLowerCase();

        if (lowerType.includes("crease") || lowerType.includes("shingle")) {
          lineItems.push({
            code: "RFG300",
            description: "Replace damaged shingles",
            qty: 1,
            unit: "SQ",
          });
        }

        if (lowerType.includes("hail") || lowerType.includes("bruising")) {
          lineItems.push({
            code: "RFG900",
            description: "Replace soft metal components (hail damage)",
            qty: 10,
            unit: "EA",
          });
        }

        if (lowerType.includes("wind") || lowerType.includes("lift")) {
          lineItems.push({
            code: "RFG100",
            description: "Re-secure wind-lifted shingles",
            qty: 5,
            unit: "SQ",
          });
        }

        if (lowerType.includes("flashing")) {
          lineItems.push({
            code: "RFG500",
            description: "Replace damaged flashing",
            qty: 20,
            unit: "LF",
          });
        }

        if (lowerType.includes("pipe") || lowerType.includes("boot")) {
          lineItems.push({
            code: "RFG600",
            description: "Replace pipe boot",
            qty: 1,
            unit: "EA",
          });
        }

        if (lowerType.includes("granule")) {
          lineItems.push({
            code: "RFG350",
            description: "Granule loss - shingle replacement",
            qty: 3,
            unit: "SQ",
          });
        }
      }
    }

    // Remove duplicates
    const uniqueItems = Array.from(
      new Map(lineItems.map((item) => [item.code, item])).values()
    );

    const summary = `AI detected ${damageLabels.length} photos with ${uniqueItems.length} distinct damage types. Weather: ${weather?.summary || "No weather data"}`;

    // H-9: Track AI credit usage
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: claim.orgId,
          metricType: 'ai_credits',
          amount: 1
        })
      });
    } catch (usageError) {
      logger.warn('[AI Build] Usage tracking failed:', usageError);
    }

    // Persist AI claim build unequivocally (no degraded mode)
    await prisma.claim_builders.upsert({
      where: { claimId },
      create: {
        id: claimId,
        claimId,
        summary,
        weatherMatch: weather?.summary || null,
        recommendations: { ai: "auto-generated", timestamp: Date.now() },
        lineItems: uniqueItems,
        updatedAt: new Date(),
      },
      update: {
        summary,
        weatherMatch: weather?.summary || null,
        recommendations: { ai: "updated", timestamp: Date.now() },
        lineItems: uniqueItems,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, summary, lineItems: uniqueItems });
  } catch (error) {
    logger.error("[AI CLAIM BUILDER ERROR]", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

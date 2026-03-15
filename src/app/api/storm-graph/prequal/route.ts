/**
 * Storm Graph — Address Pre-Qualification API
 * POST /api/storm-graph/prequal
 *
 * Pre-qualify any address for storm damage likelihood based on
 * nearby verified claims, storm events, and geographic patterns.
 * No existing claim required — used for canvassing and outreach.
 */

import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { preQualifyAddress } from "@/lib/storm-graph";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PreQualSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = PreQualSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { latitude, longitude, address } = parsed.data;
    const { orgId } = ctx;

    const result = await preQualifyAddress(latitude, longitude, address, orgId);

    logger.info("[STORM_GRAPH_PREQUAL_API] Pre-qualification complete", {
      address,
      orgId,
      score: result.preQualScore,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[STORM_GRAPH_PREQUAL_API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to pre-qualify address",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

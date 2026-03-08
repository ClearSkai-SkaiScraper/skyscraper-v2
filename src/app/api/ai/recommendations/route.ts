import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling, type AiBillingContext } from "@/lib/ai/withAiBilling";
import { generateRecommendations } from "@/lib/ml/recommendations/engine";
import { getActiveRecommendations, upsertRecommendations } from "@/lib/ml/recommendations/persist";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";

/**
 * GET /api/ai/recommendations
 * Returns active AI recommendations for user/claim/org
 * Query params: claimId (optional)
 */
async function GET_INNER(req: NextRequest, ctx: AiBillingContext) {
  try {
    const { userId, orgId: ctxOrgId } = ctx;

    const identifier = getRateLimitIdentifier(userId, req);
    const allowed = await rateLimiters.ai.check(10, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // Use org context (may be null) - default to userId if no org
    const orgId = ctxOrgId || userId;

    // Get claimId from query params
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    // Check if recommendations exist
    let recommendations = await getActiveRecommendations(orgId, {
      type: claimId || undefined,
    });

    // If none exist, auto-generate once
    if (recommendations.length === 0) {
      logger.debug("[GET /api/ai/recommendations] No recommendations found, generating...");

      const bundle = await generateRecommendations({
        orgId,
        userId,
        claimId: claimId || undefined,
      });

      // Persist recommendations
      await upsertRecommendations(orgId, bundle);
      recommendations = bundle;
    }

    // Transform to expected format
    const contacts = recommendations
      .filter((r) => r.kind === "PROFESSIONAL_MATCH")
      .map((r) => ({
        id: r.id,
        name: r.payload?.name || r.title,
        company: r.payload?.company || "",
        role: r.payload?.role || "",
        specialty: r.payload?.specialties?.[0] || r.payload?.role || "",
        matchScore: r.score || 0,
        reason: r.summary || "",
        location: r.payload?.location || "",
        avatar: r.payload?.avatar,
      }));

    const actions = recommendations
      .filter((r) => r.kind === "NEXT_ACTION")
      .map((r) => ({
        id: r.id,
        title: r.title,
        reason: r.summary || "",
        priority: r.score && r.score > 90 ? "high" : r.score && r.score > 75 ? "medium" : "low",
        claimId: r.claimId,
        actionRoute: r.payload?.actionRoute,
      }));

    return NextResponse.json({ contacts, actions });
  } catch (error) {
    logger.error("[GET /api/ai/recommendations] Error:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}

export const GET = withAiBilling(
  createAiConfig("recommendations", { costPerRequest: 15 }),
  GET_INNER
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

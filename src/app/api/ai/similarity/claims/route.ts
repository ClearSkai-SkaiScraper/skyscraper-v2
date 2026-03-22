/**
 * POST /api/ai/similarity/claims
 *
 * Find claims similar to a given claim or text query.
 * Uses pgvector cosine distance for fast approximate nearest neighbor search.
 *
 * Body:
 *   { claimId: string }           — find claims similar to this claim
 *   { query: string }             — find claims similar to this text
 *   { limit?: number }            — max results (default 5, max 20)
 *   { minScore?: number }         — minimum similarity threshold (default 0.3)
 *
 * GET /api/ai/similarity/claims?status=true
 *   Returns embedding coverage stats for the org.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  embedClaim,
  findSimilarClaims,
  findSimilarClaimsByText,
  getEmbeddingStatus,
} from "@/lib/ai/intelligence/claimSimilarity";
import { apiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SearchSchema = z.object({
  claimId: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().min(1).max(20).optional().default(5),
  minScore: z.number().min(0).max(1).optional().default(0.3),
});

// GET: embedding status
export async function GET(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const status = await getEmbeddingStatus(orgCtx.orgId);
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    logger.error("[SimilarityAPI] GET error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to get embedding status");
  }
}

// POST: similarity search
export async function POST(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const body = await req.json();
    const parsed = SearchSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", parsed.error.message);
    }

    const { claimId, query, limit, minScore } = parsed.data;

    if (!claimId && !query) {
      return apiError(400, "VALIDATION_ERROR", "Either claimId or query is required");
    }

    // If searching by claimId, ensure the claim's embedding exists first
    if (claimId) {
      try {
        await embedClaim(claimId, orgCtx.orgId);
      } catch (embedError) {
        logger.warn(`[SimilarityAPI] Could not embed claim ${claimId}:`, embedError);
        // Continue — it might already be embedded or we'll get empty results
      }

      const results = await findSimilarClaims(claimId, orgCtx.orgId, limit, minScore);

      return NextResponse.json({
        success: true,
        type: "claim",
        sourceClaimId: claimId,
        results,
        count: results.length,
      });
    }

    // Text-based search
    const results = await findSimilarClaimsByText(query!, orgCtx.orgId, limit, minScore);

    return NextResponse.json({
      success: true,
      type: "text",
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    logger.error("[SimilarityAPI] POST error:", error);
    return apiError(500, "INTERNAL_ERROR", "Similarity search failed");
  }
}

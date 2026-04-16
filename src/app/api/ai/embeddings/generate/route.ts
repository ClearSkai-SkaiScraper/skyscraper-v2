/**
 * POST /api/ai/embeddings/generate
 *
 * Generate embeddings for claims in the current org.
 *
 * Body:
 *   { claimId: string }            — embed a single claim
 *   { all: true, batchSize?: n }   — embed all un-embedded claims (default batch 50)
 *
 * GET /api/ai/embeddings/status
 *   Alias: returns embedding coverage stats.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  embedClaim,
  embedOrgClaims,
  getEmbeddingStatus,
} from "@/lib/ai/intelligence/claimSimilarity";
import { apiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GenerateSchema = z.union([
  z.object({
    claimId: z.string().min(1),
    all: z.undefined().optional(),
  }),
  z.object({
    claimId: z.undefined().optional(),
    all: z.literal(true),
    batchSize: z.number().min(1).max(500).optional().default(50),
  }),
]);

// GET: embedding coverage status
export async function GET() {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const rl = await checkRateLimit(orgCtx.orgId, "AI");
    if (!rl.success) return apiError(429, "RATE_LIMITED", "Rate limit exceeded");

    const status = await getEmbeddingStatus(orgCtx.orgId);
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    logger.error("[EmbeddingsAPI] GET error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to get embedding status");
  }
}

// POST: generate embeddings
export async function POST(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const rl = await checkRateLimit(orgCtx.orgId, "AI");
    if (!rl.success) return apiError(429, "RATE_LIMITED", "Rate limit exceeded");

    const body = await req.json();
    const parsed = GenerateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Provide either { claimId } or { all: true }");
    }

    const data = parsed.data;

    // Single claim embedding
    if ("claimId" in data && data.claimId) {
      logger.info("[EmbeddingsAPI] Embedding single claim", {
        claimId: data.claimId,
        orgId: orgCtx.orgId,
      });

      const result = await embedClaim(data.claimId, orgCtx.orgId);

      return NextResponse.json({
        success: true,
        mode: "single",
        claimId: data.claimId,
        embedded: !!result,
      });
    }

    // Batch embedding for the entire org
    const batchSize = "batchSize" in data ? (data.batchSize ?? 50) : 50;

    logger.info("[EmbeddingsAPI] Batch embedding org claims", {
      orgId: orgCtx.orgId,
      batchSize,
    });

    const result = await embedOrgClaims(orgCtx.orgId, batchSize);

    return NextResponse.json({
      success: true,
      mode: "batch",
      ...result,
    });
  } catch (error) {
    logger.error("[EmbeddingsAPI] POST error:", error);
    return apiError(500, "INTERNAL_ERROR", "Embedding generation failed");
  }
}

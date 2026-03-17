/**
 * Similar Claims Query Engine
 *
 * DEPRECATED: claimsEmbedding model doesn't exist in schema.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Find similar claims using cosine similarity
 */
export async function findSimilarClaims(
  queryClaimId: string,
  limit = 5
): Promise<{ claimId: string; score: number }[]> {
  // claimsEmbedding model doesn't exist in schema
  logger.debug(`[similarity] Would find similar claims to ${queryClaimId}`);
  return [];
}

/**
 * Find similar claims by text query (not existing claim)
 */
export async function findSimilarClaimsByText(
  queryText: string,
  limit = 5
): Promise<{ claimId: string; score: number }[]> {
  // claimsEmbedding model doesn't exist in schema
  logger.debug(`[similarity] Would find similar claims by text query`);
  return [];
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * Get similar claims with full details
 */
export async function getSimilarClaimsWithDetails(queryClaimId: string, limit = 5) {
  const similar = await findSimilarClaims(queryClaimId, limit);

  if (similar.length === 0) return [];

  const claimIds = similar.map((s) => s.claimId);
  const claims = await prisma.claims.findMany({
    where: {
      id: {
        in: claimIds,
      },
    },
    select: {
      id: true,
      title: true,
      carrier: true,
      estimatedValue: true,
      createdAt: true,
    },
  });

  // Merge similarity scores with claim data
  return similar.map((s) => {
    const claim = claims.find((c) => c.id === s.claimId);
    return {
      claimId: s.claimId,
      score: s.score,
      claim,
    };
  });
}

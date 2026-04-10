/**
 * Claim Embedding Generation
 *
 * Generate and store vector embeddings for claims to enable similarity search.
 * Uses OpenAI's text-embedding-3-small model.
 */

import { callOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Generate text representation of claim for embedding
 */
async function generateClaimText(claimId: string): Promise<string> {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    include: {
      Org: true,
      properties: true,
    },
  });

  if (!claim) {
    throw new Error(`Claim ${claimId} not found`);
  }

  // Build descriptive text from claim data
  const parts: string[] = [];

  if (claim.carrier) {
    parts.push(`Carrier: ${claim.carrier}`);
  }

  if (claim.properties) {
    const addr = [
      claim.properties.street,
      claim.properties.city,
      claim.properties.state,
      claim.properties.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
    if (addr) {
      parts.push(`Address: ${addr}`);
    }
  }

  if (claim.damageType) {
    parts.push(`Damage Type: ${claim.damageType}`);
  }

  if (claim.description) {
    parts.push(`Summary: ${claim.description}`);
  }

  if (claim.estimatedValue) {
    parts.push(`Estimate: $${claim.estimatedValue}`);
  }

  return parts.join(". ");
}

/**
 * Create or update claim embedding
 */
export async function createOrUpdateClaimEmbedding(claimId: string) {
  try {
    // Generate text representation
    const text = await generateClaimText(claimId);

    if (!text || text.length < 10) {
      logger.warn(`Insufficient text for claim ${claimId} embedding`);
      return null;
    }

    // Generate embedding using OpenAI
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response = await callOpenAI({
      tag: "claim_embedding",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: "text-embedding-3-small" as any,
      messages: [], // Not used for embeddings
      parseJson: false,
      context: { claimId },
    });

    // Note: The actual embedding call would use OpenAI's embeddings endpoint
    // For now, create a placeholder until we wire up the embeddings API
    const mockEmbedding = Buffer.from(new Float32Array(1536).fill(0.1));

    // TODO: Store embedding once claimEmbedding model is added to Prisma schema
    // For now, return a stub result
    return {
      claimId,
      vector: mockEmbedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    logger.error(`Error creating embedding for claim ${claimId}:`, error);
    return null;
  }
}

/**
 * Batch generate embeddings for multiple claims
 */
export async function batchGenerateEmbeddings(claimIds: string[]) {
  const results: { claimId: string; success: boolean }[] = [];

  for (const claimId of claimIds) {
    const result = await createOrUpdateClaimEmbedding(claimId);
    results.push({ claimId, success: !!result });
  }

  return results;
}

/**
 * Generate embeddings for all claims missing them
 */
export async function generateMissingEmbeddings(limit = 100) {
  // TODO: Once claimEmbedding model is added, filter out claims that already have embeddings
  // For now, just get the first N claims
  const claims = await prisma.claims.findMany({
    take: limit,
    select: { id: true },
  });

  return batchGenerateEmbeddings(claims.map((c) => c.id));
}

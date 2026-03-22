/**
 * Claim Similarity Engine — REAL Implementation
 *
 * Uses pgvector for fast approximate nearest neighbor search.
 * Generates text embeddings from claim data, stores in claim_embeddings table,
 * and queries similar claims using cosine distance.
 *
 * TENANT ISOLATION: All queries filter by orgId. Never returns cross-org results.
 */

import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─── Configuration ─────────────────────────────────────────
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, $0.02/1M tokens
const EMBEDDING_DIMENSIONS = 1536;

// ─── Types ─────────────────────────────────────────────────

export interface SimilarClaim {
  claimId: string;
  score: number; // 0–1 similarity (1 = identical)
  title: string | null;
  carrier: string | null;
  damageType: string;
  status: string;
  estimatedValue: number | null;
  insuredName: string | null;
  dateOfLoss: Date;
  createdAt: Date;
}

export interface EmbeddingStatus {
  totalClaims: number;
  embeddedClaims: number;
  coverage: number; // 0–1
  lastUpdated: Date | null;
}

// ─── Text Extraction ───────────────────────────────────────

/**
 * Build a rich text representation of a claim for embedding.
 * Includes: damage type, carrier, description, property, weather evidence,
 * scope items, supplements, and notes.
 */
async function buildClaimText(claimId: string): Promise<string> {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      title: true,
      description: true,
      damageType: true,
      carrier: true,
      insured_name: true,
      status: true,
      estimatedValue: true,
      approvedValue: true,
      dateOfLoss: true,
      properties: {
        select: {
          street: true,
          city: true,
          state: true,
          zipCode: true,
          propertyType: true,
          yearBuilt: true,
          roofType: true,
          squareFootage: true,
        },
      },
      storm_evidence: {
        select: {
          primaryPeril: true,
          hailSizeInches: true,
          windSpeedMph: true,
          aiNarrative: true,
          evidenceGrade: true,
        },
      },
      scopes: {
        select: {
          title: true,
          source_type: true,
        },
        take: 10,
      },
      supplements: {
        select: {
          status: true,
          total: true,
          loss_type: true,
        },
        take: 5,
      },
    },
  });

  if (!claim) return "";

  const parts: string[] = [];

  // Core claim info
  parts.push(`Claim: ${claim.title || "Untitled"}`);
  parts.push(`Damage Type: ${claim.damageType}`);
  if (claim.carrier) parts.push(`Carrier: ${claim.carrier}`);
  if (claim.description) parts.push(`Description: ${claim.description}`);
  if (claim.dateOfLoss) parts.push(`Date of Loss: ${claim.dateOfLoss.toISOString().split("T")[0]}`);
  if (claim.estimatedValue)
    parts.push(`Estimated Value: $${(claim.estimatedValue / 100).toFixed(2)}`);
  if (claim.approvedValue) parts.push(`Approved Value: $${(claim.approvedValue / 100).toFixed(2)}`);

  // Property info (singular belongs-to relation)
  const p = claim.properties;
  if (p) {
    const addr = [p.street, p.city, p.state, p.zipCode].filter(Boolean).join(", ");
    if (addr) parts.push(`Property: ${addr}`);
    if (p.propertyType) parts.push(`Property Type: ${p.propertyType}`);
    if (p.roofType) parts.push(`Roof Type: ${p.roofType}`);
    if (p.yearBuilt) parts.push(`Year Built: ${p.yearBuilt}`);
    if (p.squareFootage) parts.push(`Square Footage: ${p.squareFootage}`);
  }

  // Storm evidence (singular optional relation)
  const se = claim.storm_evidence;
  if (se) {
    if (se.primaryPeril) parts.push(`Primary Peril: ${se.primaryPeril}`);
    if (se.hailSizeInches) parts.push(`Hail Size: ${se.hailSizeInches} inches`);
    if (se.windSpeedMph) parts.push(`Wind Speed: ${se.windSpeedMph} mph`);
    if (se.evidenceGrade) parts.push(`Evidence Grade: ${se.evidenceGrade}`);
    if (se.aiNarrative) parts.push(`Storm Narrative: ${se.aiNarrative.slice(0, 500)}`);
  }

  // Scope items (title is the label, source_type is the trade)
  if (claim.scopes.length > 0) {
    const scopeText = claim.scopes
      .map((s) => `${s.source_type || "General"}: ${s.title}`)
      .join("; ");
    parts.push(`Scope: ${scopeText}`);
  }

  // Supplements
  if (claim.supplements.length > 0) {
    const suppText = claim.supplements
      .map((s) => `${s.loss_type || "Supplement"} (${s.status}, $${(s.total || 0).toFixed(0)})`)
      .join("; ");
    parts.push(`Supplements: ${suppText}`);
  }

  return parts.join("\n");
}

/**
 * Compute SHA-256 hash of text for change detection
 */
function textHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// ─── Embedding Generation ──────────────────────────────────

/**
 * Generate an embedding vector for a text string.
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // Max ~8K tokens
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Generate and store embedding for a single claim.
 * Skips if the claim text hasn't changed (same textHash).
 * Returns true if a new/updated embedding was stored.
 */
export async function embedClaim(
  claimId: string,
  orgId: string
): Promise<{ stored: boolean; isNew: boolean }> {
  try {
    const text = await buildClaimText(claimId);
    if (!text || text.length < 50) {
      logger.debug(`[embedClaim] Claim ${claimId} has insufficient text, skipping`);
      return { stored: false, isNew: false };
    }

    const hash = textHash(text);

    // Check if existing embedding is up-to-date
    const existing = await prisma.$queryRawUnsafe<{ textHash: string }[]>(
      `SELECT "textHash" FROM "claim_embeddings" WHERE "claimId" = $1 LIMIT 1`,
      claimId
    );

    if (existing.length > 0 && existing[0].textHash === hash) {
      return { stored: false, isNew: false };
    }

    // Generate embedding via OpenAI
    const embedding = await generateEmbedding(text);
    const vectorStr = `[${embedding.join(",")}]`;
    const id = createId();
    const now = new Date();

    // Upsert into claim_embeddings using raw SQL (Prisma can't handle vector type directly)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "claim_embeddings" ("id", "claimId", "orgId", "embedding", "textHash", "sourceText", "metadata", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::vector, $5, $6, $7::jsonb, $8, $8)
       ON CONFLICT ("claimId") DO UPDATE SET
         "embedding" = EXCLUDED."embedding",
         "textHash" = EXCLUDED."textHash",
         "sourceText" = EXCLUDED."sourceText",
         "metadata" = EXCLUDED."metadata",
         "updatedAt" = EXCLUDED."updatedAt"`,
      id,
      claimId,
      orgId,
      vectorStr,
      hash,
      text.slice(0, 2000), // Store truncated source for debugging
      JSON.stringify({ model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS }),
      now
    );

    logger.info(
      `[embedClaim] ${existing.length > 0 ? "Updated" : "Created"} embedding for claim ${claimId}`
    );
    return { stored: true, isNew: existing.length === 0 };
  } catch (error) {
    logger.error(`[embedClaim] Failed for claim ${claimId}:`, error);
    throw error;
  }
}

// ─── Similarity Search ─────────────────────────────────────

/**
 * Find claims most similar to a given claim.
 * Uses pgvector cosine distance (<=> operator) with HNSW index.
 *
 * TENANT ISOLATION: Only returns claims within the same org.
 */
export async function findSimilarClaims(
  claimId: string,
  orgId: string,
  limit = 5,
  minScore = 0.3
): Promise<SimilarClaim[]> {
  try {
    // Use pgvector cosine distance: 1 - distance = similarity score
    const results = await prisma.$queryRawUnsafe<
      Array<{
        claimId: string;
        score: number;
        title: string | null;
        carrier: string | null;
        damageType: string;
        status: string;
        estimatedValue: number | null;
        insured_name: string | null;
        dateOfLoss: Date;
        createdAt: Date;
      }>
    >(
      `SELECT
         ce2."claimId",
         1 - (ce1."embedding" <=> ce2."embedding") AS score,
         c."title",
         c."carrier",
         c."damageType",
         c."status",
         c."estimatedValue",
         c."insured_name",
         c."dateOfLoss",
         c."createdAt"
       FROM "claim_embeddings" ce1
       JOIN "claim_embeddings" ce2
         ON ce2."orgId" = $2
         AND ce2."claimId" != $1
       JOIN "claims" c ON c."id" = ce2."claimId"
       WHERE ce1."claimId" = $1
         AND ce1."orgId" = $2
         AND (1 - (ce1."embedding" <=> ce2."embedding")) >= $4
       ORDER BY ce1."embedding" <=> ce2."embedding" ASC
       LIMIT $3`,
      claimId,
      orgId,
      limit,
      minScore
    );

    return results.map((r) => ({
      claimId: r.claimId,
      score: Number(r.score),
      title: r.title,
      carrier: r.carrier,
      damageType: r.damageType,
      status: r.status,
      estimatedValue: r.estimatedValue,
      insuredName: r.insured_name,
      dateOfLoss: r.dateOfLoss,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    logger.error(`[findSimilarClaims] Failed for claim ${claimId}:`, error);
    return [];
  }
}

/**
 * Find claims similar to arbitrary text (e.g., a new claim being drafted).
 * TENANT ISOLATION: Only returns claims within the specified org.
 */
export async function findSimilarClaimsByText(
  queryText: string,
  orgId: string,
  limit = 5,
  minScore = 0.3
): Promise<SimilarClaim[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe<
      Array<{
        claimId: string;
        score: number;
        title: string | null;
        carrier: string | null;
        damageType: string;
        status: string;
        estimatedValue: number | null;
        insured_name: string | null;
        dateOfLoss: Date;
        createdAt: Date;
      }>
    >(
      `SELECT
         ce."claimId",
         1 - (ce."embedding" <=> $1::vector) AS score,
         c."title",
         c."carrier",
         c."damageType",
         c."status",
         c."estimatedValue",
         c."insured_name",
         c."dateOfLoss",
         c."createdAt"
       FROM "claim_embeddings" ce
       JOIN "claims" c ON c."id" = ce."claimId"
       WHERE ce."orgId" = $2
         AND (1 - (ce."embedding" <=> $1::vector)) >= $4
       ORDER BY ce."embedding" <=> $1::vector ASC
       LIMIT $3`,
      vectorStr,
      orgId,
      limit,
      minScore
    );

    return results.map((r) => ({
      claimId: r.claimId,
      score: Number(r.score),
      title: r.title,
      carrier: r.carrier,
      damageType: r.damageType,
      status: r.status,
      estimatedValue: r.estimatedValue,
      insuredName: r.insured_name,
      dateOfLoss: r.dateOfLoss,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    logger.error(`[findSimilarClaimsByText] Failed:`, error);
    return [];
  }
}

// ─── Batch Pipeline ────────────────────────────────────────

/**
 * Embed all un-embedded claims for an org.
 * Returns counts of processed, skipped, and failed claims.
 */
export async function embedOrgClaims(
  orgId: string,
  batchSize = 20
): Promise<{ processed: number; skipped: number; failed: number }> {
  // Get all claims that don't have embeddings yet (or have stale ones)
  const claims = await prisma.claims.findMany({
    where: { orgId, archivedAt: null },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: batchSize,
  });

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const claim of claims) {
    try {
      const result = await embedClaim(claim.id, orgId);
      if (result.stored) {
        processed++;
      } else {
        skipped++;
      }
    } catch {
      failed++;
    }
  }

  logger.info(
    `[embedOrgClaims] Org ${orgId}: ${processed} embedded, ${skipped} skipped, ${failed} failed`
  );
  return { processed, skipped, failed };
}

/**
 * Get embedding coverage stats for an org.
 */
export async function getEmbeddingStatus(orgId: string): Promise<EmbeddingStatus> {
  const [totalResult, embeddedResult, latestResult] = await Promise.all([
    prisma.claims.count({ where: { orgId, archivedAt: null } }),
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM "claim_embeddings" WHERE "orgId" = $1`,
      orgId
    ),
    prisma.$queryRawUnsafe<{ latest: Date | null }[]>(
      `SELECT MAX("updatedAt") as latest FROM "claim_embeddings" WHERE "orgId" = $1`,
      orgId
    ),
  ]);

  const totalClaims = totalResult;
  const embeddedClaims = Number(embeddedResult[0]?.count || 0);

  return {
    totalClaims,
    embeddedClaims,
    coverage: totalClaims > 0 ? embeddedClaims / totalClaims : 0,
    lastUpdated: latestResult[0]?.latest || null,
  };
}

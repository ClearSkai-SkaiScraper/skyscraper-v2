-- Enable pgvector extension for embedding storage and similarity search
-- This powers the Visual Intelligence / Claim Constellation features
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────
-- ClaimEmbedding: stores text-based claim embeddings
-- Used for: similar claim search, pattern detection, clustering
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "claim_embeddings" (
  "id"         TEXT PRIMARY KEY,
  "claimId"    TEXT NOT NULL UNIQUE,
  "orgId"      TEXT NOT NULL,
  "embedding"  vector(1536),          -- text-embedding-3-small dimensions
  "textHash"   TEXT NOT NULL,          -- SHA-256 of source text (change detection)
  "sourceText" TEXT,                   -- Optional: source text for debugging
  "metadata"   JSONB DEFAULT '{}',     -- carrier, damageType, estimatedValue, etc.
  "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT "fk_claim_embeddings_claim" FOREIGN KEY ("claimId")
    REFERENCES "claims"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_claim_embeddings_org" FOREIGN KEY ("orgId")
    REFERENCES "Org"("id") ON DELETE CASCADE
);

-- Indexes for tenant-isolated vector search
CREATE INDEX IF NOT EXISTS "idx_claim_embeddings_org" ON "claim_embeddings" ("orgId");
CREATE INDEX IF NOT EXISTS "idx_claim_embeddings_claim" ON "claim_embeddings" ("claimId");
CREATE INDEX IF NOT EXISTS "idx_claim_embeddings_updated" ON "claim_embeddings" ("updatedAt");

-- HNSW index for fast approximate nearest neighbor search (cosine distance)
-- This is the core performance index for similarity queries
CREATE INDEX IF NOT EXISTS "idx_claim_embeddings_vector"
  ON "claim_embeddings"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────────
-- PhotoEmbedding: stores visual embeddings for photos
-- Used for: visual similarity, damage clustering, deduplication
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "photo_embeddings" (
  "id"          TEXT PRIMARY KEY,
  "photoUrl"    TEXT NOT NULL,
  "orgId"       TEXT NOT NULL,
  "claimId"     TEXT,
  "embedding"   vector(1536),          -- OpenAI CLIP-compatible via text-embedding-3-small
  "damageType"  TEXT,
  "severity"    TEXT,
  "confidence"  FLOAT,
  "caption"     TEXT,                   -- AI-generated caption used for embedding
  "metadata"    JSONB DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT "fk_photo_embeddings_org" FOREIGN KEY ("orgId")
    REFERENCES "Org"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_photo_embeddings_claim" FOREIGN KEY ("claimId")
    REFERENCES "claims"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_photo_embeddings_org" ON "photo_embeddings" ("orgId");
CREATE INDEX IF NOT EXISTS "idx_photo_embeddings_claim" ON "photo_embeddings" ("claimId");

CREATE INDEX IF NOT EXISTS "idx_photo_embeddings_vector"
  ON "photo_embeddings"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────────
-- IntelligenceInsight: cached AI-generated intelligence findings
-- Used for: dashboard widgets, notifications, pattern reports
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "intelligence_insights" (
  "id"          TEXT PRIMARY KEY,
  "orgId"       TEXT NOT NULL,
  "type"        TEXT NOT NULL,            -- 'similar_claims', 'missing_items', 'anomaly', 'pattern', 'cluster'
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "severity"    TEXT DEFAULT 'info',      -- 'info', 'warning', 'critical', 'opportunity'
  "data"        JSONB DEFAULT '{}',       -- Structured insight data
  "claimIds"    TEXT[] DEFAULT '{}',      -- Related claim IDs
  "stormEventId" TEXT,                    -- Related storm event
  "isRead"      BOOLEAN DEFAULT FALSE,
  "expiresAt"   TIMESTAMPTZ,             -- Auto-expire old insights
  "createdAt"   TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT "fk_intelligence_insights_org" FOREIGN KEY ("orgId")
    REFERENCES "Org"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_intelligence_insights_org" ON "intelligence_insights" ("orgId");
CREATE INDEX IF NOT EXISTS "idx_intelligence_insights_type" ON "intelligence_insights" ("orgId", "type");
CREATE INDEX IF NOT EXISTS "idx_intelligence_insights_unread" ON "intelligence_insights" ("orgId", "isRead") WHERE "isRead" = FALSE;

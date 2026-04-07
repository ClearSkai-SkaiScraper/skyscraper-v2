-- Migration: Add missing models referenced in codebase
-- Date: 2026-04-06
-- Issue: Multiple files reference models that don't exist in schema:
--   - claim_photo_meta (referenced in src/lib/ai/report-generator.ts)
--   - ParsedDocument (referenced in src/lib/ai/documentProcessing.ts)
--   - featureFlags on Org (referenced in src/lib/feature-flags.ts)
--   - ai_actions (referenced in src/lib/ai/feedback/logAction.ts)

-- ============================================================================
-- 1. Add featureFlags JSONB column to organizations table
-- ============================================================================
ALTER TABLE "Org" 
ADD COLUMN IF NOT EXISTS "featureFlags" JSONB DEFAULT '{}';

COMMENT ON COLUMN "Org"."featureFlags" IS 'JSON object storing org-level feature flags';

-- ============================================================================
-- 2. Create claim_photo_meta table for AI photo analysis storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS "claim_photo_meta" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "claimId" TEXT NOT NULL,
  "photoUrl" TEXT NOT NULL,
  "aiAnalysis" JSONB,
  "damageType" TEXT,
  "severity" TEXT,
  "confidence" DOUBLE PRECISION,
  "annotations" JSONB,
  "embeddings" vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "claim_photo_meta_claimId_idx" ON "claim_photo_meta"("claimId");
CREATE INDEX IF NOT EXISTS "claim_photo_meta_damageType_idx" ON "claim_photo_meta"("damageType");

-- Add foreign key constraint if claims table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claims') THEN
    ALTER TABLE "claim_photo_meta" 
    ADD CONSTRAINT "claim_photo_meta_claimId_fkey" 
    FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. Create parsed_documents table for OCR/document processing
-- ============================================================================
CREATE TABLE IF NOT EXISTS "parsed_documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orgId" TEXT,
  "claimId" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "parsedText" TEXT,
  "structuredData" JSONB,
  "metadata" JSONB,
  "processingStatus" TEXT DEFAULT 'pending',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "parsed_documents_orgId_idx" ON "parsed_documents"("orgId");
CREATE INDEX IF NOT EXISTS "parsed_documents_claimId_idx" ON "parsed_documents"("claimId");
CREATE INDEX IF NOT EXISTS "parsed_documents_status_idx" ON "parsed_documents"("processingStatus");

-- ============================================================================
-- 4. Create ai_actions table for action logging/feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS "ai_actions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "userId" TEXT,
  "claimId" TEXT,
  "actionType" TEXT NOT NULL,
  "actionData" JSONB,
  "result" JSONB,
  "feedbackScore" INTEGER,
  "feedbackComment" TEXT,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ai_actions_orgId_idx" ON "ai_actions"("orgId");
CREATE INDEX IF NOT EXISTS "ai_actions_claimId_idx" ON "ai_actions"("claimId");
CREATE INDEX IF NOT EXISTS "ai_actions_actionType_idx" ON "ai_actions"("actionType");
CREATE INDEX IF NOT EXISTS "ai_actions_createdAt_idx" ON "ai_actions"("createdAt" DESC);

-- ============================================================================
-- 5. Add roc_number to org_branding (referenced in LicensingTab component)
-- ============================================================================
ALTER TABLE "org_branding"
ADD COLUMN IF NOT EXISTS "roc_number" TEXT;

COMMENT ON COLUMN "org_branding"."roc_number" IS 'Arizona ROC contractor license number';

-- ============================================================================
-- 6. Add brandLogoUrl and contactInfo to Org (referenced in buildClaimContext)
-- ============================================================================
ALTER TABLE "Org"
ADD COLUMN IF NOT EXISTS "brandLogoUrl" TEXT;

ALTER TABLE "Org"
ADD COLUMN IF NOT EXISTS "contactInfo" JSONB DEFAULT '{}';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Added:';
  RAISE NOTICE '  - featureFlags column to Org';
  RAISE NOTICE '  - claim_photo_meta table';
  RAISE NOTICE '  - parsed_documents table';
  RAISE NOTICE '  - ai_actions table';
  RAISE NOTICE '  - roc_number column to org_branding';
  RAISE NOTICE '  - brandLogoUrl and contactInfo to Org';
END $$;

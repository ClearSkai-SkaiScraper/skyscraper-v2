-- ============================================================================
-- Migration: Add signing status + job value estimation fields
-- Date: 2026-03-15
-- Purpose: Track claim signing status (pending/signed) and job value
--          estimation with manager approval workflow
-- ============================================================================

-- 1. Claims: signing status
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "signingStatus"      VARCHAR(20) DEFAULT 'pending';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "signingStatusSetAt"  TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "signingStatusSetBy"  TEXT;

-- 2. Claims: job value estimation + approval
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "estimatedJobValue"     INTEGER;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "jobValueStatus"        VARCHAR(20) DEFAULT 'draft';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "jobValueSubmittedAt"   TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "jobValueSubmittedBy"   TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "jobValueApprovedAt"    TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "jobValueApprovedBy"    TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS "jobValueApprovalNotes" TEXT;

-- 3. Leads: job value estimation + approval
ALTER TABLE leads ADD COLUMN IF NOT EXISTS "estimatedJobValue"     INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS "jobValueStatus"        VARCHAR(20) DEFAULT 'draft';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS "jobValueSubmittedAt"   TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS "jobValueSubmittedBy"   TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS "jobValueApprovedAt"    TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS "jobValueApprovedBy"    TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS "jobValueApprovalNotes" TEXT;

-- 4. Index for filtering claims by signing status
CREATE INDEX IF NOT EXISTS idx_claims_org_signing ON claims ("orgId", "signingStatus");

-- 5. Backfill: set all existing claims to 'pending' if null
UPDATE claims SET "signingStatus" = 'pending' WHERE "signingStatus" IS NULL;

-- Done
SELECT 'Migration complete: signing_status_and_job_value' AS result;

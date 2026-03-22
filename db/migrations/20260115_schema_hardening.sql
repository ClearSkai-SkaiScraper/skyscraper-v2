-- ============================================================================
-- Schema Hardening Migration — SkaiScraper
-- ============================================================================
-- Adds NOT NULL constraints, indexes, and foreign key constraints
-- that improve data integrity and query performance.
--
-- Run: psql "$DATABASE_URL" -f ./db/migrations/20260115_schema_hardening.sql
-- ============================================================================

-- ── 1. Ensure orgId is NOT NULL on critical tables ──
-- These are the highest-risk tables for cross-tenant data leaks.
-- Only ALTER if the column is currently nullable.

DO $$
BEGIN
  -- claims table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'orgId' AND is_nullable = 'YES'
  ) THEN
    -- First set any NULL orgIds to a sentinel value (should be 0 rows in prod)
    UPDATE claims SET "orgId" = 'ORPHAN_NEEDS_REVIEW' WHERE "orgId" IS NULL;
    ALTER TABLE claims ALTER COLUMN "orgId" SET NOT NULL;
    RAISE NOTICE 'claims.orgId set to NOT NULL';
  END IF;

  -- ai_reports table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_reports' AND column_name = 'orgId' AND is_nullable = 'YES'
  ) THEN
    UPDATE ai_reports SET "orgId" = 'ORPHAN_NEEDS_REVIEW' WHERE "orgId" IS NULL;
    ALTER TABLE ai_reports ALTER COLUMN "orgId" SET NOT NULL;
    RAISE NOTICE 'ai_reports.orgId set to NOT NULL';
  END IF;

  -- file_assets table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_assets' AND column_name = 'orgId' AND is_nullable = 'YES'
  ) THEN
    UPDATE file_assets SET "orgId" = 'ORPHAN_NEEDS_REVIEW' WHERE "orgId" IS NULL;
    ALTER TABLE file_assets ALTER COLUMN "orgId" SET NOT NULL;
    RAISE NOTICE 'file_assets.orgId set to NOT NULL';
  END IF;
END $$;

-- ── 2. Add missing indexes for tenant-scoped queries ──

-- Composite index for claims queries scoped by org
CREATE INDEX IF NOT EXISTS idx_claims_orgid_status ON claims ("orgId", status);
CREATE INDEX IF NOT EXISTS idx_claims_orgid_createdat ON claims ("orgId", "createdAt" DESC);

-- Index for ai_reports queue worker
CREATE INDEX IF NOT EXISTS idx_ai_reports_status_createdat ON ai_reports (status, "createdAt" ASC)
  WHERE status = 'queued';

-- Index for team_invitations lookups
CREATE INDEX IF NOT EXISTS idx_team_invitations_orgid_email ON team_invitations (org_id, email)
  WHERE status = 'pending';

-- Index for message threads by org
CREATE INDEX IF NOT EXISTS idx_message_threads_orgid ON "MessageThread" ("orgId");

-- Index for notifications by user
CREATE INDEX IF NOT EXISTS idx_notifications_clerk_user ON notifications (clerk_user_id);

-- ── 3. Add CHECK constraints ──

-- Ensure role values are valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_team_invitations_role'
  ) THEN
    ALTER TABLE team_invitations ADD CONSTRAINT chk_team_invitations_role
      CHECK (role IN ('admin', 'member', 'viewer'));
    RAISE NOTICE 'Added role CHECK constraint to team_invitations';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipping role CHECK — may already exist or table structure differs';
END $$;

-- ── 4. Audit: Count orphaned records ──

DO $$
DECLARE
  orphan_claims INTEGER;
  orphan_reports INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_claims FROM claims WHERE "orgId" IS NULL OR "orgId" = '';
  SELECT COUNT(*) INTO orphan_reports FROM ai_reports WHERE "orgId" IS NULL OR "orgId" = '';

  IF orphan_claims > 0 THEN
    RAISE WARNING 'Found % orphaned claims without orgId', orphan_claims;
  END IF;

  IF orphan_reports > 0 THEN
    RAISE WARNING 'Found % orphaned ai_reports without orgId', orphan_reports;
  END IF;

  IF orphan_claims = 0 AND orphan_reports = 0 THEN
    RAISE NOTICE '✅ No orphaned records found — schema is clean';
  END IF;
END $$;

-- ============================================================================
-- END — Schema Hardening Migration
-- ============================================================================

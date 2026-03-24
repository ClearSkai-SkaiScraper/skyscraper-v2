-- ============================================================================
-- DM-001: Deduplicate homeowner email columns on claims table
-- ============================================================================
-- The `claims` table has TWO email columns:
--   1. `homeownerEmail`  (camelCase, line 2430 in schema.prisma)
--   2. `homeowner_email` (snake_case, line 2434 in schema.prisma)
--
-- This migration:
--   1. Merges data: copies non-null homeownerEmail into homeowner_email
--      where homeowner_email is currently null
--   2. Drops the duplicate homeownerEmail column
--
-- ⚠️  PREREQUISITES:
--   - Update all code references from `homeownerEmail` to `homeowner_email`
--   - Update prisma/schema.prisma to remove the homeownerEmail field
--   - Run `npx prisma generate` after schema change
--
-- ⚠️  BACKUP FIRST:
--   pg_dump -t claims $DATABASE_URL > claims_backup_$(date +%Y%m%d).sql
-- ============================================================================

BEGIN;

-- Step 1: Merge data — prefer homeowner_email, fallback to homeownerEmail
UPDATE claims
SET homeowner_email = "homeownerEmail"
WHERE homeowner_email IS NULL
  AND "homeownerEmail" IS NOT NULL;

-- Step 2: Verify no data loss
DO $$
DECLARE
  orphaned_count integer;
BEGIN
  SELECT count(*) INTO orphaned_count
  FROM claims
  WHERE "homeownerEmail" IS NOT NULL
    AND homeowner_email IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Data migration incomplete: % rows with homeownerEmail but no homeowner_email', orphaned_count;
  END IF;
END $$;

-- Step 3: Drop the duplicate column
ALTER TABLE claims DROP COLUMN IF EXISTS "homeownerEmail";

COMMIT;

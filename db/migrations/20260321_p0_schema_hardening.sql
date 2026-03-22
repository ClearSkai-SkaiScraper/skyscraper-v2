-- ============================================================================
-- P0 Schema Hardening Migration
-- Generated: 2026-03-21
-- Items: S-01 through S-05 from master integrity TODO
-- ============================================================================
-- IMPORTANT: Run backfill queries FIRST before altering to NOT NULL
-- ============================================================================

BEGIN;

-- ============================================================================
-- S-01: Make reports.orgId NOT NULL (backfill from claim.orgId first)
-- ============================================================================
-- Step 1: Backfill null orgIds from associated claims
UPDATE reports r
SET "orgId" = c."orgId"
FROM claims c
WHERE r."claimId" = c.id
  AND r."orgId" IS NULL
  AND c."orgId" IS NOT NULL;

-- Step 2: For any remaining nulls (no claim association), set to a sentinel
-- or delete orphaned records. Here we log them first:
-- SELECT id, "claimId" FROM reports WHERE "orgId" IS NULL;
-- Then make NOT NULL:
ALTER TABLE reports ALTER COLUMN "orgId" SET NOT NULL;

-- ============================================================================
-- S-02: Make Client.orgId NOT NULL (backfill from claim associations)
-- ============================================================================
-- Step 1: Backfill from ClientJob → claims → orgId
UPDATE "Client" cl
SET "orgId" = sub."orgId"
FROM (
  SELECT DISTINCT cj."clientId", c."orgId"
  FROM "ClientJob" cj
  JOIN claims c ON c.id = cj."claimId"
  WHERE c."orgId" IS NOT NULL
) sub
WHERE cl.id = sub."clientId"
  AND cl."orgId" IS NULL;

-- Step 2: Backfill from ClientProConnection
UPDATE "Client" cl
SET "orgId" = cpc."orgId"
FROM "ClientProConnection" cpc
WHERE cl.id = cpc."clientId"
  AND cl."orgId" IS NULL
  AND cpc."orgId" IS NOT NULL;

-- Step 3: Make NOT NULL (will fail if any remaining nulls — review manually)
ALTER TABLE "Client" ALTER COLUMN "orgId" SET NOT NULL;

-- ============================================================================
-- S-03: Add orgId column to weather_reports (backfill from claim.orgId)
-- ============================================================================
-- Step 1: Add nullable column
ALTER TABLE weather_reports ADD COLUMN IF NOT EXISTS "orgId" TEXT;

-- Step 2: Backfill from claims
UPDATE weather_reports wr
SET "orgId" = c."orgId"
FROM claims c
WHERE wr."claimId" = c.id
  AND c."orgId" IS NOT NULL;

-- Step 3: Backfill remaining from user → org membership
UPDATE weather_reports wr
SET "orgId" = uo."organizationId"
FROM user_organizations uo
WHERE wr."createdById" = uo."userId"
  AND wr."orgId" IS NULL;

-- Step 4: Add index
CREATE INDEX IF NOT EXISTS "weather_reports_orgId_idx" ON weather_reports("orgId");

-- Step 5: Make NOT NULL after backfill is verified
-- ALTER TABLE weather_reports ALTER COLUMN "orgId" SET NOT NULL;
-- NOTE: Uncomment above after verifying all rows have orgId populated

-- ============================================================================
-- S-04: Make tradesCompany.orgId required — add FK, add index
-- ============================================================================
-- Step 1: Backfill from tradesCompanyMember (members have orgId)
ALTER TABLE "tradesCompany" ADD COLUMN IF NOT EXISTS "orgId" TEXT;

UPDATE "tradesCompany" tc
SET "orgId" = sub."orgId"
FROM (
  SELECT DISTINCT "companyId", "orgId"
  FROM "tradesCompanyMember"
  WHERE "orgId" IS NOT NULL
) sub
WHERE tc.id = sub."companyId"
  AND (tc."orgId" IS NULL);

-- Step 2: Add index
CREATE INDEX IF NOT EXISTS "tradesCompany_orgId_idx" ON "tradesCompany"("orgId");

-- Step 3: Add FK (deferred — uncomment after verifying all rows have valid orgIds)
-- ALTER TABLE "tradesCompany" ADD CONSTRAINT "tradesCompany_orgId_fkey"
--   FOREIGN KEY ("orgId") REFERENCES "Org"(id) ON DELETE CASCADE;

-- ============================================================================
-- S-05: Make tradesCompanyMember.orgId required — add FK
-- ============================================================================
-- Step 1: Backfill any null orgIds from company's org
UPDATE "tradesCompanyMember" tcm
SET "orgId" = tc."orgId"
FROM "tradesCompany" tc
WHERE tcm."companyId" = tc.id
  AND tcm."orgId" IS NULL
  AND tc."orgId" IS NOT NULL;

-- Step 2: Make NOT NULL
ALTER TABLE "tradesCompanyMember" ALTER COLUMN "orgId" SET NOT NULL;

-- Step 3: Add index if missing
CREATE INDEX IF NOT EXISTS "tradesCompanyMember_orgId_idx" ON "tradesCompanyMember"("orgId");

-- Step 4: Add FK (deferred — uncomment after verifying)
-- ALTER TABLE "tradesCompanyMember" ADD CONSTRAINT "tradesCompanyMember_orgId_fkey"
--   FOREIGN KEY ("orgId") REFERENCES "Org"(id) ON DELETE CASCADE;

COMMIT;

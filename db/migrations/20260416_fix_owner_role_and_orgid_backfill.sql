-- ============================================================================
-- 20260416_fix_owner_role_and_orgid_backfill.sql
--
-- Fixes two bugs that caused owner accounts to be treated as members:
--   1) user_organizations.role stored as 'OWNER' / 'owner' was not recognized
--      by the RBAC role mapper (which only knew ADMIN/MANAGER/MEMBER/VIEWER).
--      Code is now case-insensitive and treats OWNER as admin, but we also
--      normalize the DB rows to 'ADMIN' so downstream queries are consistent.
--
--   2) Legacy trades_company_members rows had orgId = NULL for the original
--      owner, which broke tenant-scoped lookups on /teams. Backfill orgId
--      from the user's primary user_organizations membership.
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

BEGIN;

-- 1) Normalize role casing and promote OWNER → ADMIN in user_organizations
UPDATE user_organizations
   SET role = 'ADMIN'
 WHERE role ILIKE 'owner' OR role ILIKE 'admin';

UPDATE user_organizations
   SET role = 'MANAGER'
 WHERE role ILIKE 'manager';

UPDATE user_organizations
   SET role = 'MEMBER'
 WHERE role ILIKE 'member' OR role IS NULL;

UPDATE user_organizations
   SET role = 'VIEWER'
 WHERE role ILIKE 'viewer';

-- 2) Backfill trades_company_members.orgId from user_organizations
--    Only touches rows where orgId IS NULL AND the user has exactly one org
--    (prevents accidental cross-tenant linkage in ambiguous cases).
UPDATE trades_company_members tcm
   SET "orgId" = uo."organizationId"
  FROM (
    SELECT "userId", MIN("organizationId") AS "organizationId", COUNT(*) AS org_count
      FROM user_organizations
     GROUP BY "userId"
  ) uo
 WHERE tcm."userId" = uo."userId"
   AND tcm."orgId" IS NULL
   AND uo.org_count = 1;

-- 3) Ensure every org owner (Org.ownerId) has an ADMIN user_organizations row
INSERT INTO user_organizations (id, "userId", "organizationId", role, "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    o."ownerId",
    o.id,
    'ADMIN',
    NOW(),
    NOW()
  FROM orgs o
 WHERE o."ownerId" IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM user_organizations uo
      WHERE uo."userId" = o."ownerId"
        AND uo."organizationId" = o.id
   );

-- 4) Promote any existing (owner, org) membership that isn't already ADMIN
UPDATE user_organizations uo
   SET role = 'ADMIN'
  FROM orgs o
 WHERE uo."userId" = o."ownerId"
   AND uo."organizationId" = o.id
   AND uo.role <> 'ADMIN';

COMMIT;

-- Verification queries (run manually after migration):
-- SELECT role, COUNT(*) FROM user_organizations GROUP BY role;
-- SELECT COUNT(*) FROM trades_company_members WHERE "orgId" IS NULL;
-- SELECT u.email, uo.role FROM user_organizations uo
--   JOIN users u ON u."clerkUserId" = uo."userId"
--   JOIN orgs o ON o.id = uo."organizationId" AND o."ownerId" = uo."userId"
--  WHERE uo.role <> 'ADMIN';

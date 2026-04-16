-- 20260416 — Fix "Admin Access Required" on owner accounts and empty Company Seats
--
-- Root cause: user_organizations.role stored as "OWNER" (or NULL) but rbac.ts
-- only recognized "ADMIN|MANAGER|MEMBER|VIEWER" and silently demoted everything
-- else to "member". Also, trades_company_members.orgId was NULL for legacy
-- rows, causing Team listing queries (filtered by userId+orgId) to return empty.
--
-- This migration:
--   1. Normalizes user_organizations.role so org creators are ADMIN.
--   2. Backfills trades_company_members.orgId from user_organizations.
--
-- Idempotent — safe to re-run.

BEGIN;

-- 1) Normalize user_organizations.role
--    OWNER / owner → ADMIN (we treat owner-level access as admin in System B)
UPDATE user_organizations
   SET role = 'ADMIN'
 WHERE role IS NOT NULL
   AND UPPER(role) IN ('OWNER', 'ADMIN');

--    Uppercase the remaining values so future strict-equality checks still work.
UPDATE user_organizations
   SET role = UPPER(role)
 WHERE role IS NOT NULL
   AND role <> UPPER(role);

--    Anyone still NULL who owns an Org row gets ADMIN; everyone else MEMBER.
UPDATE user_organizations uo
   SET role = 'ADMIN'
  FROM orgs o
 WHERE uo.role IS NULL
   AND uo."organizationId" = o.id
   AND o."ownerId" = uo."userId";

UPDATE user_organizations
   SET role = 'MEMBER'
 WHERE role IS NULL;

-- 2) Backfill trades_company_members.orgId from user_organizations
--    (Legacy rows predate the orgId column addition.)
UPDATE trades_company_members tcm
   SET "orgId" = uo."organizationId"
  FROM user_organizations uo
 WHERE tcm."orgId" IS NULL
   AND tcm."userId" = uo."userId";

-- 3) Also backfill from the owning company's creator membership if still missing
--    (covers cases where the user never got a user_organizations row yet).
UPDATE trades_company_members tcm
   SET "orgId" = src."orgId"
  FROM trades_company_members src
 WHERE tcm."orgId" IS NULL
   AND tcm."companyId" = src."companyId"
   AND src."orgId" IS NOT NULL;

-- 4) Sanity report
DO $$
DECLARE
  v_orphan_members  INTEGER;
  v_null_roles      INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphan_members
    FROM trades_company_members WHERE "orgId" IS NULL;
  SELECT COUNT(*) INTO v_null_roles
    FROM user_organizations WHERE role IS NULL;
  RAISE NOTICE '[20260416] Post-backfill: % members still NULL orgId, % user_organizations still NULL role',
    v_orphan_members, v_null_roles;
END $$;

COMMIT;

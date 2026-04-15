-- Migration: Create org_goals table
-- Replaces localStorage-only goal tracking with DB-persisted, org-scoped goals.
-- Each row = one goal category for an org (optionally per-user override).

CREATE TABLE IF NOT EXISTS org_goals (
  id         TEXT PRIMARY KEY,
  "orgId"    TEXT NOT NULL REFERENCES "Org"(id) ON DELETE CASCADE,
  "userId"   TEXT NOT NULL DEFAULT '',  -- '' = org-wide default; set = user-specific override
  category   TEXT NOT NULL,  -- doors_knocked | claims_signed | revenue | jobs_posted | leads_generated
  weekly     INT NOT NULL DEFAULT 0,
  monthly    INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("orgId", "userId", category)
);

CREATE INDEX IF NOT EXISTS idx_org_goals_org ON org_goals ("orgId");
CREATE INDEX IF NOT EXISTS idx_org_goals_org_user ON org_goals ("orgId", "userId");

-- Auto-update updatedAt
CREATE OR REPLACE FUNCTION update_org_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_goals_updated_at ON org_goals;
CREATE TRIGGER trg_org_goals_updated_at
  BEFORE UPDATE ON org_goals
  FOR EACH ROW EXECUTE FUNCTION update_org_goals_updated_at();

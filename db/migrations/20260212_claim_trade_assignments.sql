-- ============================================================================
-- Claim Trade Assignments
-- ============================================================================
-- Stores trades/contractors assigned to individual claims.
-- Used by the Claims > Trades tab.
-- ============================================================================

CREATE TABLE IF NOT EXISTS claim_trade_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id      TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  org_id        TEXT NOT NULL,
  trade_name    TEXT NOT NULL,
  trade_type    TEXT NOT NULL DEFAULT 'Other',
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  estimated_cost INTEGER,
  status        TEXT NOT NULL DEFAULT 'assigned',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_trade_assignments_claim
  ON claim_trade_assignments(claim_id);

CREATE INDEX IF NOT EXISTS idx_claim_trade_assignments_org
  ON claim_trade_assignments(org_id);

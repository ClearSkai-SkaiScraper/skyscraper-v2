-- Standalone door-knocking / canvassing pins table
-- Each pin = one house visited by a canvasser (no storm event required)

CREATE TABLE IF NOT EXISTS canvass_pins (
  id             TEXT PRIMARY KEY,
  "orgId"        TEXT NOT NULL REFERENCES "Org"(id) ON DELETE CASCADE,
  "userId"       TEXT NOT NULL,
  lat            DECIMAL(10,7) NOT NULL,
  lng            DECIMAL(10,7) NOT NULL,
  address        TEXT,
  city           TEXT,
  state          TEXT,
  "zipCode"      TEXT,
  "ownerName"    TEXT,
  outcome        TEXT NOT NULL DEFAULT 'no_answer',
  notes          TEXT,
  "followUpDate" TIMESTAMPTZ,
  "areaTag"      TEXT,
  "knockedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvass_pins_org_area ON canvass_pins ("orgId", "areaTag");
CREATE INDEX IF NOT EXISTS idx_canvass_pins_org_outcome ON canvass_pins ("orgId", outcome);
CREATE INDEX IF NOT EXISTS idx_canvass_pins_user ON canvass_pins ("userId");

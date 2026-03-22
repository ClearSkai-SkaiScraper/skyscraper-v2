-- ============================================================================
-- A-01 to A-03: Add unique constraints for worker idempotent upserts
-- Generated: 2026-03-21
-- ============================================================================
-- These constraints enable ON CONFLICT clauses in worker INSERT statements
-- to prevent duplicate rows when jobs are retried.
-- ============================================================================

BEGIN;

-- A-01: photo_findings — unique per (proposal_id, photo_id)
-- Prevents duplicate findings when damage-analyze job is retried
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'photo_findings_proposal_photo_uq'
  ) THEN
    ALTER TABLE photo_findings
      ADD CONSTRAINT photo_findings_proposal_photo_uq
      UNIQUE (proposal_id, photo_id);
  END IF;
END $$;

-- A-02: weather_results — unique per coordinate + date range
-- Prevents duplicate weather results when weather-analyze job is retried
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weather_results_coords_dates_uq'
  ) THEN
    ALTER TABLE weather_results
      ADD CONSTRAINT weather_results_coords_dates_uq
      UNIQUE (property_lat, property_lng, date_from, date_to);
  END IF;
END $$;

-- A-03: proposals_v2 — unique per (lead_id, org_id, title)
-- Prevents duplicate proposals when proposal-generate job is retried
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_v2_lead_org_title_uq'
  ) THEN
    ALTER TABLE proposals_v2
      ADD CONSTRAINT proposals_v2_lead_org_title_uq
      UNIQUE (lead_id, org_id, title);
  END IF;
END $$;

COMMIT;

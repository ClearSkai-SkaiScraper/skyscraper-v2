-- ═══════════════════════════════════════════════════════════════════
-- Migration: Add onboarding tracking fields to organizations
-- Date: 2026-03-08
-- ═══════════════════════════════════════════════════════════════════

-- Step tracking for the 5-step wizard
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_step    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- Index for quick lookup of incomplete orgs
CREATE INDEX IF NOT EXISTS idx_org_onboarding_incomplete
  ON organizations (id) WHERE onboarding_complete = FALSE;

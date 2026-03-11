-- ============================================================================
-- Migration: Consolidate duplicate homeowner email columns
-- Date: 2026-03-10
-- Purpose: The claims table has BOTH "homeownerEmail" and "homeowner_email".
--          This migration copies any non-null "homeownerEmail" data into
--          "homeowner_email" (the canonical field) and then drops the
--          deprecated column.
-- ============================================================================

-- Step 1: Copy any data from homeownerEmail → homeowner_email (only if homeowner_email is null)
UPDATE claims
SET "homeowner_email" = "homeownerEmail"
WHERE "homeowner_email" IS NULL
  AND "homeownerEmail" IS NOT NULL;

-- Step 2: Drop the deprecated column
ALTER TABLE claims DROP COLUMN IF EXISTS "homeownerEmail";

-- Verify
SELECT 'Migration complete: consolidated homeowner email columns' AS result;

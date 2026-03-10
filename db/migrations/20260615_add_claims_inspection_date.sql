-- Migration: Add inspectionDate column to claims table
-- This adds a nullable DateTime field for tracking the date of property inspection
-- Previously the UI displayed this field but it had no backing column

ALTER TABLE "claims"
ADD COLUMN IF NOT EXISTS "inspectionDate" TIMESTAMP;

COMMENT ON COLUMN "claims"."inspectionDate" IS 'Date when the property was inspected — editable from the claim overview';

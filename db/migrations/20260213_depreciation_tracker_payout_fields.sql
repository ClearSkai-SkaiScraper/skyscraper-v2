-- Add certificate, signature, and submission fields to depreciation_trackers
-- These support the final payout workflow (certificate of completion, digital signatures, submission tracking)

ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "certificate_date" TIMESTAMPTZ;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "certificate_notes" TEXT;

ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "homeowner_signature" TEXT;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "homeowner_name" TEXT;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "homeowner_signed_at" TIMESTAMPTZ;

ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "contractor_signature" TEXT;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "contractor_name" TEXT;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "contractor_signed_at" TIMESTAMPTZ;

ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "adjuster_signature" TEXT;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "adjuster_name" TEXT;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "adjuster_signed_at" TIMESTAMPTZ;

ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMPTZ;
ALTER TABLE depreciation_trackers ADD COLUMN IF NOT EXISTS "submitted_by" TEXT;

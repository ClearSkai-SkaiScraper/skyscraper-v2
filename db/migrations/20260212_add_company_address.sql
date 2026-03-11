-- Add companyAddress column to org_branding table
-- This allows companies to display their full address on damage reports
ALTER TABLE org_branding ADD COLUMN IF NOT EXISTS "companyAddress" TEXT;

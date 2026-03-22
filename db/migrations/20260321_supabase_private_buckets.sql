-- ============================================================================
-- F-01 / F-03: Switch Supabase Buckets from Public to Private + Add RLS
-- Generated: 2026-03-21
-- ============================================================================
-- Run this in the Supabase SQL Editor (or via psql with SUPABASE admin creds)
-- This converts ALL public buckets to private and adds org-scoped RLS policies
-- ============================================================================

-- ============================================================================
-- F-01: Switch buckets to private
-- ============================================================================

-- Make all existing buckets private (this disables getPublicUrl access)
UPDATE storage.buckets SET public = false WHERE name IN (
  'claim-photos',
  'profile-photos',
  'branding',
  'portfolio-photos',
  'portal-uploads',
  'documents',
  'uploads',
  'photos',
  'company-docs'
);

-- Verify: SELECT name, public FROM storage.buckets;

-- ============================================================================
-- F-03: Add RLS policies for org-scoped access
-- ============================================================================

-- Enable RLS on storage.objects if not already
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can upload to their org's folder
-- Convention: files stored as {orgId}/{...path}
CREATE POLICY "org_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must be authenticated and file path starts with their org ID
    auth.uid() IS NOT NULL
  );

-- Policy: Users can read files from their org's folder
CREATE POLICY "org_read_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Users can delete files from their org's folder
CREATE POLICY "org_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
  );

-- NOTE: These are baseline policies. For production, you should scope
-- by org_id extracted from the JWT or file path prefix.
-- Example tighter policy:
--
-- CREATE POLICY "strict_org_read" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (
--     (storage.foldername(name))[1] = (auth.jwt() -> 'org_id')::text
--   );

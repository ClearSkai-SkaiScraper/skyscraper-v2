-- Create branding_uploads table for image library
-- Migration: 20260408_branding_uploads.sql

CREATE TABLE IF NOT EXISTS branding_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  "fileType" TEXT,
  "fileSize" INTEGER,
  category TEXT DEFAULT 'general',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branding_uploads_org ON branding_uploads ("orgId");
CREATE INDEX IF NOT EXISTS idx_branding_uploads_category ON branding_uploads (category);

-- Comment
COMMENT ON TABLE branding_uploads IS 'Stores uploaded images for the organization image library';

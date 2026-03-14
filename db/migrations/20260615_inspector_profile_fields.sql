-- ============================================================================
-- Inspector Profile Fields — Add professional fields to users table
-- Sprint: Inspection Report v2 — Phase 5 (Inspector System)
-- ============================================================================

-- Professional title (e.g., "Senior Property Inspector")
ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT;

-- Contact phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Professional bio for reports
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- License / certification number
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;

-- State of licensure
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_state TEXT;

-- Certifications (JSON array of strings, e.g., ["HAAG Certified", "IICRC WRT"])
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- Signature image URL (for digital signature on reports)
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Years of experience
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_experience INTEGER;

-- Specialties (JSON array of strings, e.g., ["roofing", "siding", "gutters"])
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]'::jsonb;

-- Default inspector for new claims (boolean flag)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_default_inspector BOOLEAN DEFAULT FALSE;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'title', 'phone', 'bio', 'license_number', 'license_state',
    'certifications', 'signature_url', 'years_experience',
    'specialties', 'is_default_inspector'
  )
ORDER BY ordinal_position;

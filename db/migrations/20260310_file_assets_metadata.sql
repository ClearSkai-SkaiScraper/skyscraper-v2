-- Add metadata JSONB column to file_assets for storing AI annotations
-- This enables photo damage annotations, captions, and analysis results

ALTER TABLE file_assets 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add analysis metadata columns (using IF NOT EXISTS pattern)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_assets' AND column_name = 'ai_caption') THEN
    ALTER TABLE file_assets ADD COLUMN ai_caption TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_assets' AND column_name = 'ai_severity') THEN
    ALTER TABLE file_assets ADD COLUMN ai_severity VARCHAR(32);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_assets' AND column_name = 'ai_confidence') THEN
    ALTER TABLE file_assets ADD COLUMN ai_confidence DECIMAL(5,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_assets' AND column_name = 'analyzed_at') THEN
    ALTER TABLE file_assets ADD COLUMN analyzed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_assets' AND column_name = 'analyzed_by') THEN
    ALTER TABLE file_assets ADD COLUMN analyzed_by VARCHAR(191);
  END IF;
END $$;

-- Index for querying analyzed photos (use quoted identifiers for case-sensitive columns)
CREATE INDEX IF NOT EXISTS idx_file_assets_analyzed 
ON file_assets("orgId", "claimId", analyzed_at) 
WHERE analyzed_at IS NOT NULL;

-- Index for JSON metadata queries
CREATE INDEX IF NOT EXISTS idx_file_assets_metadata 
ON file_assets USING GIN (metadata);

COMMENT ON COLUMN file_assets.metadata IS 'JSON storage for AI annotations, damage boxes, IRC codes, and other analysis data';
COMMENT ON COLUMN file_assets.ai_caption IS 'AI-generated caption summarizing damage in the photo';
COMMENT ON COLUMN file_assets.ai_severity IS 'Overall damage severity: none, minor, moderate, severe, critical';
COMMENT ON COLUMN file_assets.ai_confidence IS 'AI confidence score 0.0-1.0';

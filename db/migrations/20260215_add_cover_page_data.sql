-- Add cover_page_data column to org_branding table
-- This stores the JSON state of the advanced cover page canvas editor

ALTER TABLE org_branding 
ADD COLUMN IF NOT EXISTS cover_page_data JSONB;

COMMENT ON COLUMN org_branding.cover_page_data IS 'JSON object storing cover page canvas state: { elements: CanvasElement[], backgroundColor: string, backgroundImage: string | null }';

-- ============================================================================
-- Sprint 29 — Permit Documents table
-- Enables multi-document upload for permits (replaces single documentUrl field)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permit_documents (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  permit_id   TEXT NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  category    TEXT DEFAULT 'permit',      -- permit | inspection | receipt | correspondence | other
  uploaded_by TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permit_documents_permit_id ON permit_documents(permit_id);
CREATE INDEX IF NOT EXISTS idx_permit_documents_org_id ON permit_documents(org_id);

-- Also add a generic document-link table for cross-referencing documents to jobs/claims
-- This lets any page (permits, estimates, reports) save a reference into a job's documents tab
CREATE TABLE IF NOT EXISTS document_links (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id        TEXT NOT NULL,
  source_type   TEXT NOT NULL,              -- permit | estimate | report | manual
  source_id     TEXT NOT NULL,              -- ID of the source record (permit ID, cart ID, report ID)
  job_id        TEXT,                       -- linked job
  claim_id      TEXT,                       -- linked claim
  title         TEXT NOT NULL,
  url           TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT,
  category      TEXT DEFAULT 'document',
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_links_org_id ON document_links(org_id);
CREATE INDEX IF NOT EXISTS idx_document_links_job_id ON document_links(job_id);
CREATE INDEX IF NOT EXISTS idx_document_links_claim_id ON document_links(claim_id);
CREATE INDEX IF NOT EXISTS idx_document_links_source ON document_links(source_type, source_id);

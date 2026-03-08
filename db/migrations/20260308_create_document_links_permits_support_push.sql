-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Create missing tables (document_links, permit_documents,
--            push_subscriptions, support_tickets)
-- Date: 2026-03-08
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Document Links (cross-reference docs to jobs/claims) ────────────────────
CREATE TABLE IF NOT EXISTS document_links (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id      TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  job_id      TEXT,
  claim_id    TEXT,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  category    TEXT DEFAULT 'document',
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_links_org_id ON document_links(org_id);
CREATE INDEX IF NOT EXISTS idx_document_links_job_id ON document_links(job_id);
CREATE INDEX IF NOT EXISTS idx_document_links_claim_id ON document_links(claim_id);
CREATE INDEX IF NOT EXISTS idx_document_links_source ON document_links(source_type, source_id);

-- ─── Permit Documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permit_documents (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  permit_id   TEXT NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  category    TEXT DEFAULT 'permit',
  uploaded_by TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permit_documents_permit_id ON permit_documents(permit_id);
CREATE INDEX IF NOT EXISTS idx_permit_documents_org_id ON permit_documents(org_id);

-- ─── Support Tickets ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES "Org"(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  subject         TEXT NOT NULL,
  description     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',
  priority        TEXT NOT NULL DEFAULT 'normal',
  category        TEXT,
  assigned_to     TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- ─── Push Subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Done
-- ═══════════════════════════════════════════════════════════════════════════════

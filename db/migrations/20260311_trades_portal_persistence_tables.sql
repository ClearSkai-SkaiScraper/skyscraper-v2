-- ═══════════════════════════════════════════════════════════════════════════════
-- Trades persistence tables + Portal community + Portal settings
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trades: company-to-company invitations
CREATE TABLE IF NOT EXISTS trades_invites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT,
  "toEmail" TEXT,
  type TEXT NOT NULL DEFAULT 'connect',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMPTZ,
  "respondedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trades_invites_from ON trades_invites ("fromUserId");
CREATE INDEX IF NOT EXISTS idx_trades_invites_to ON trades_invites ("toUserId");
CREATE INDEX IF NOT EXISTS idx_trades_invites_email ON trades_invites ("toEmail");
CREATE INDEX IF NOT EXISTS idx_trades_invites_status ON trades_invites (status);

-- Trades: job applications
CREATE TABLE IF NOT EXISTS trades_job_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "jobId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "profileId" TEXT,
  message TEXT,
  "quoteCents" INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  "reviewedAt" TIMESTAMPTZ,
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("jobId", "applicantId")
);
CREATE INDEX IF NOT EXISTS idx_trades_job_apps_job ON trades_job_applications ("jobId");
CREATE INDEX IF NOT EXISTS idx_trades_job_apps_applicant ON trades_job_applications ("applicantId");
CREATE INDEX IF NOT EXISTS idx_trades_job_apps_status ON trades_job_applications (status);

-- Trades: claim-to-trades-company join table
CREATE TABLE IF NOT EXISTS claim_trades_companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "claimId" TEXT NOT NULL,
  "tradesCompanyId" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendor',
  status TEXT NOT NULL DEFAULT 'active',
  "assignedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("claimId", "tradesCompanyId")
);
CREATE INDEX IF NOT EXISTS idx_claim_trades_claim ON claim_trades_companies ("claimId");
CREATE INDEX IF NOT EXISTS idx_claim_trades_company ON claim_trades_companies ("tradesCompanyId");

-- Client invitations (standalone, without claim)
CREATE TABLE IF NOT EXISTS client_invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  "invitedBy" TEXT NOT NULL,
  "orgId" TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  "expiresAt" TIMESTAMPTZ,
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON client_invitations (email);
CREATE INDEX IF NOT EXISTS idx_client_invitations_by ON client_invitations ("invitedBy");
CREATE INDEX IF NOT EXISTS idx_client_invitations_status ON client_invitations (status);
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations (token);

-- Community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authorId" TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  "mediaUrls" JSONB NOT NULL DEFAULT '[]',
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts ("authorId");
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts (type);

-- Community post likes
CREATE TABLE IF NOT EXISTS community_post_likes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("postId", "userId")
);
CREATE INDEX IF NOT EXISTS idx_community_likes_post ON community_post_likes ("postId");
CREATE INDEX IF NOT EXISTS idx_community_likes_user ON community_post_likes ("userId");

-- Community post comments
CREATE TABLE IF NOT EXISTS community_post_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  "authorId" TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_post_comments ("postId");
CREATE INDEX IF NOT EXISTS idx_community_comments_author ON community_post_comments ("authorId");

-- Portal settings (key-value store for user preferences)
CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", key)
);
CREATE INDEX IF NOT EXISTS idx_portal_settings_user ON portal_settings ("userId");

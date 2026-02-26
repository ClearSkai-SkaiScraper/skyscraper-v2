-- Sprint 18: User feedback table for pilot feedback loop
-- Stores structured feedback from the in-app feedback widget

CREATE TABLE IF NOT EXISTS user_feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       TEXT NOT NULL,
  org_id        TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'ux', 'performance', 'other')),
  message       TEXT NOT NULL,
  rating        INTEGER CHECK (rating >= 0 AND rating <= 4),
  page          TEXT,
  user_agent    TEXT,
  screen_width  INTEGER,
  screen_height INTEGER,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'in_progress', 'resolved', 'wont_fix')),
  priority      TEXT DEFAULT 'p2' CHECK (priority IN ('p0', 'p1', 'p2', 'p3')),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_org ON user_feedback(org_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);

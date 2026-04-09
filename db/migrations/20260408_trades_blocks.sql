-- Create trades_blocks table for blocking profiles in the trades network
-- Migration: 20260408_trades_blocks.sql

CREATE TABLE IF NOT EXISTS trades_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  reason TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE ("blockerId", "blockedId")
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_trades_blocks_blocker ON trades_blocks ("blockerId");
CREATE INDEX IF NOT EXISTS idx_trades_blocks_blocked ON trades_blocks ("blockedId");

-- Add comment
COMMENT ON TABLE trades_blocks IS 'Stores profile blocks in the trades network';

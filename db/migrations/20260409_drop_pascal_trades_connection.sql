-- Sprint 15: Drop the dead PascalCase TradesConnection table
-- This table had 0 code consumers and different fields than the active camelCase tradesConnection table.
-- Verified: all code now uses prisma.tradesConnection (camelCase) with fields:
--   id, requesterId, addresseeId, status, message, connectedAt, createdAt, updatedAt
-- The PascalCase model had: id, followerId, followingId, createdAt (social follow pattern, unused)

-- IMPORTANT: Verify 0 rows before running: SELECT COUNT(*) FROM "TradesConnection";
DROP TABLE IF EXISTS "TradesConnection";

-- ClientProConnection: Normalize all status values to lowercase
-- All new writes already use lowercase; this fixes legacy UPPERCASE data.
-- Safe to run multiple times (idempotent).

UPDATE "ClientProConnection"
SET status = LOWER(status)
WHERE status <> LOWER(status);

-- Verify
SELECT status, count(*) FROM "ClientProConnection" GROUP BY status ORDER BY status;

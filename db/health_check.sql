-- ================================================================================================
-- SKAISCRAPER DATABASE HEALTH CHECK
-- ================================================================================================
-- This script validates the database schema, checks for orphaned records, validates relations,
-- and ensures data integrity across all tables.
-- Run this periodically to ensure database health.
-- ================================================================================================

-- ================================================================================================
-- SECTION 1: SCHEMA VALIDATION
-- ================================================================================================

-- Check for tables without primary keys
SELECT 
  tablename AS "⚠️ Table Without Primary Key"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_indexes
    WHERE indexname LIKE '%_pkey'
  );

-- Check for missing indexes on foreign keys
SELECT
  tc.table_name AS "⚠️ Table",
  kcu.column_name AS "⚠️ FK Column Without Index"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = tc.table_name
    AND indexdef LIKE '%' || kcu.column_name || '%'
  );

-- ================================================================================================
-- SECTION 2: ORPHANED RECORDS CHECK
-- ================================================================================================

-- Check for leads without valid orgId
SELECT COUNT(*) AS "⚠️ Leads with Invalid orgId"
FROM leads
WHERE "orgId" NOT IN (SELECT id FROM org);

-- Check for claims without valid orgId
SELECT COUNT(*) AS "⚠️ Claims with Invalid orgId"
FROM claims
WHERE "orgId" NOT IN (SELECT id FROM org);

-- Check for users without valid orgId
SELECT COUNT(*) AS "⚠️ Users with Invalid orgId"
FROM users
WHERE "orgId" NOT IN (SELECT id FROM org);

-- Check for properties without valid orgId
SELECT COUNT(*) AS "⚠️ Properties with Invalid orgId"
FROM properties
WHERE "orgId" NOT IN (SELECT id FROM org);

-- Check for contacts without valid orgId
SELECT COUNT(*) AS "⚠️ Contacts with Invalid orgId"
FROM contacts
WHERE "orgId" NOT IN (SELECT id FROM org);

-- Check for leads without valid contacts
SELECT COUNT(*) AS "⚠️ Leads with Invalid contactId"
FROM leads
WHERE "contactId" NOT IN (SELECT id FROM contacts);

-- Check for claims without valid properties
SELECT COUNT(*) AS "⚠️ Claims with Invalid propertyId"
FROM claims
WHERE "propertyId" IS NOT NULL
  AND "propertyId" NOT IN (SELECT id FROM properties);

-- ================================================================================================
-- SECTION 3: DATA INTEGRITY CHECKS
-- ================================================================================================

-- Check for duplicate clerk user IDs
SELECT 
  "clerkUserId",
  COUNT(*) AS "⚠️ Duplicate Count"
FROM users
GROUP BY "clerkUserId"
HAVING COUNT(*) > 1;

-- Check for duplicate contact emails within same org
SELECT 
  "orgId",
  email,
  COUNT(*) AS "⚠️ Duplicate Contact Emails"
FROM contacts
WHERE email IS NOT NULL
GROUP BY "orgId", email
HAVING COUNT(*) > 1;

-- Check for leads with impossible probability values
SELECT COUNT(*) AS "⚠️ Leads with Invalid Probability"
FROM leads
WHERE probability IS NOT NULL
  AND (probability < 0 OR probability > 100);

-- Check for claims with negative payment amounts
SELECT COUNT(*) AS "⚠️ Claims with Negative Payments"
FROM claim_payments
WHERE amount < 0;

-- ================================================================================================
-- SECTION 4: RELATION CONSISTENCY
-- ================================================================================================

-- Verify leads<->claims relation consistency
SELECT 
  'Leads with claimId but claim doesn\'t exist' AS "Issue Type",
  COUNT(*) AS "⚠️ Count"
FROM leads
WHERE "claimId" IS NOT NULL
  AND "claimId" NOT IN (SELECT id FROM claims)
UNION ALL
SELECT 
  'Claims without corresponding lead' AS "Issue Type",
  COUNT(*) AS "Count"
FROM claims c
WHERE NOT EXISTS (
  SELECT 1 FROM leads l WHERE l."claimId" = c.id
);

-- Verify users<->org relation consistency
SELECT 
  'Users in non-existent orgs' AS "Issue Type",
  COUNT(*) AS "⚠️ Count"
FROM users
WHERE "orgId" NOT IN (SELECT id FROM org);

-- ================================================================================================
-- SECTION 5: PERFORMANCE METRICS
-- ================================================================================================

-- Table sizes
SELECT 
  schemaname AS "Schema",
  tablename AS "Table",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS "Total Size",
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS "Table Size",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS "Index Size"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Index usage statistics
SELECT 
  schemaname AS "Schema",
  tablename AS "Table",
  indexname AS "Index",
  idx_scan AS "Index Scans",
  idx_tup_read AS "Tuples Read",
  idx_tup_fetch AS "Tuples Fetched",
  pg_size_pretty(pg_relation_size(indexrelid)) AS "Index Size"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC
LIMIT 20;

-- ================================================================================================
-- SECTION 6: SUMMARY COUNTS
-- ================================================================================================

SELECT 'org' AS "Table", COUNT(*) AS "Total Records" FROM org
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'leads', COUNT(*) FROM leads
UNION ALL SELECT 'claims', COUNT(*) FROM claims
UNION ALL SELECT 'properties', COUNT(*) FROM properties
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'estimates', COUNT(*) FROM estimates
UNION ALL SELECT 'reports', COUNT(*) FROM reports
UNION ALL SELECT 'weather_reports', COUNT(*) FROM weather_reports
UNION ALL SELECT 'claim_activities', COUNT(*) FROM claim_activities
UNION ALL SELECT 'claim_tasks', COUNT(*) FROM claim_tasks
UNION ALL SELECT 'claim_payments', COUNT(*) FROM claim_payments
UNION ALL SELECT 'claim_supplements', COUNT(*) FROM claim_supplements
ORDER BY "Total Records" DESC;

-- ================================================================================================
-- SECTION 7: RECENT ACTIVITY
-- ================================================================================================

-- Most active orgs in last 7 days
SELECT 
  o.id AS "Org ID",
  o."clerkOrgId" AS "Clerk Org ID",
  COUNT(DISTINCT l.id) AS "New Leads",
  COUNT(DISTINCT c.id) AS "New Claims",
  COUNT(DISTINCT ca.id) AS "Activities"
FROM org o
LEFT JOIN leads l ON l."orgId" = o.id AND l."createdAt" > NOW() - INTERVAL '7 days'
LEFT JOIN claims c ON c."orgId" = o.id AND c."createdAt" > NOW() - INTERVAL '7 days'
LEFT JOIN claim_activities ca ON ca."orgId" = o.id AND ca."createdAt" > NOW() - INTERVAL '7 days'
GROUP BY o.id, o."clerkOrgId"
ORDER BY "Activities" DESC
LIMIT 10;

-- ================================================================================================
-- ✅ HEALTH CHECK COMPLETE
-- ================================================================================================
-- Review the output above for any ⚠️ warnings or issues that need attention.
-- Zero counts are healthy for all "Invalid" or "Orphaned" checks.
-- ================================================================================================

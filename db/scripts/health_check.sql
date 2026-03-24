-- =========================================
-- SkaiScraper Database Health Check
-- Generated: November 17, 2025
-- =========================================

\echo '📊 TABLE ROW COUNTS'
\echo '==================='

SELECT 'leads' as table_name, COUNT(*) as row_count FROM "leads"
UNION ALL
SELECT 'claims', COUNT(*) FROM "claims"
UNION ALL
SELECT 'weather_reports', COUNT(*) FROM "weather_reports"
UNION ALL
SELECT 'weather_events', COUNT(*) FROM "weather_events"
UNION ALL
SELECT 'reports', COUNT(*) FROM "reports"
UNION ALL
SELECT 'report_drafts', COUNT(*) FROM "report_drafts"
UNION ALL
SELECT 'contacts', COUNT(*) FROM "contacts"
UNION ALL
SELECT 'properties', COUNT(*) FROM "properties"
UNION ALL
SELECT 'Org', COUNT(*) FROM "Org"
UNION ALL
SELECT 'users', COUNT(*) FROM "users"
UNION ALL
SELECT 'TokenWallet', COUNT(*) FROM "TokenWallet"
UNION ALL
SELECT 'Subscription', COUNT(*) FROM "Subscription"
UNION ALL
SELECT 'contractor_profiles', COUNT(*) FROM "contractor_profiles"
UNION ALL
SELECT 'claim_activities', COUNT(*) FROM "claim_activities"
UNION ALL
SELECT 'claim_tasks', COUNT(*) FROM "claim_tasks"
ORDER BY table_name;

\echo ''
\echo '🔍 VIDEO FEATURES STATUS'
\echo '========================'

SELECT 
  id,
  name,
  "videoEnabled",
  "videoPlanTier",
  "createdAt"
FROM "Org"
ORDER BY "createdAt" DESC
LIMIT 5;

\echo ''
\echo '⚠️  DATA INTEGRITY CHECKS'
\echo '========================='

-- Check for orphaned leads (no org)
SELECT 
  'Orphaned leads (no org)' as check_name,
  COUNT(*) as count
FROM "leads" l
LEFT JOIN "Org" o ON l."orgId" = o.id
WHERE o.id IS NULL;

-- Check for orphaned claims (no org)
SELECT 
  'Orphaned claims (no org)' as check_name,
  COUNT(*) as count
FROM "claims" c
LEFT JOIN "Org" o ON c."orgId" = o.id
WHERE o.id IS NULL;

-- Check for orgs without videoEnabled set
SELECT 
  'Orgs without videoEnabled' as check_name,
  COUNT(*) as count
FROM "Org"
WHERE "videoEnabled" IS NULL;

\echo ''
\echo '✅ Health Check Complete!'

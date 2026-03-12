-- ============================================================================
-- Production Readiness: Add missing orgId indexes + compound indexes
-- ============================================================================
-- Date: 2026-03-11
-- Purpose: Performance + query safety for tenant-scoped queries
--
-- Adds @@index on orgId for 11 models that were missing it,
-- plus compound indexes for common query patterns.
-- ============================================================================

-- 1. DashboardKpi — dashboard queries filter by orgId constantly
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_dashboard_kpi_org_id"
  ON "DashboardKpi" ("orgId");

-- 2. claim_timeline_events — timeline lookups per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_claim_timeline_events_org_id"
  ON "claim_timeline_events" ("org_id");

-- 3. reports — report listing per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_reports_org_id"
  ON "reports" ("orgId");

-- 4. report_drafts — report generation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_drafts_org_id"
  ON "report_drafts" ("org_id");

-- 5. api_tokens — token lookups per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_api_tokens_org_id"
  ON "api_tokens" ("orgId");

-- 6. door_knocks — door-knocking queries per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_door_knocks_org_id"
  ON "door_knocks" ("orgId");

-- 7. property_impacts — property impact lookups per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_property_impacts_org_id"
  ON "property_impacts" ("orgId");

-- 8. vendors — vendor directory per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_vendors_org_id"
  ON "vendors" ("orgId");

-- 9. quickbooks_connections — QB connection lookups per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quickbooks_connections_org_id"
  ON "quickbooks_connections" ("orgId");

-- 10. client_invitations — invitation lookups per org
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_client_invitations_org_id"
  ON "client_invitations" ("orgId");

-- ============================================================================
-- Compound indexes for common query patterns
-- ============================================================================

-- Notification: common query is (orgId, userId, createdAt DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notification_org_user_created"
  ON "Notification" ("orgId", "userId", "createdAt" DESC);

-- material_carts: common query is (orgId, userId) and (orgId, status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_carts_org_user"
  ON "material_carts" ("orgId", "userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_material_carts_org_status"
  ON "material_carts" ("orgId", "status");

-- claims: common query is (orgId, status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_claims_org_status"
  ON "claims" ("orgId", "status");

-- jobs: common query is (orgId, status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_jobs_org_status"
  ON "jobs" ("orgId", "status");

-- ai_reports: filtered by orgId + reportType
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_reports_org_type"
  ON "ai_reports" ("orgId", "reportType");

-- ============================================================================
-- Remove duplicate indexes on user_organizations
-- ============================================================================
-- user_organizations has 2 duplicate userId indexes and 2 duplicate orgId indexes.
-- Keep the named ones, drop the auto-generated ones.
-- NOTE: Run these only if both exist. Check with:
--   SELECT indexname FROM pg_indexes WHERE tablename = 'user_organizations';
-- Then drop whichever is redundant.
-- 
-- Example (verify names before running):
-- DROP INDEX CONCURRENTLY IF EXISTS "user_organizations_orgId_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "user_organizations_userId_idx";

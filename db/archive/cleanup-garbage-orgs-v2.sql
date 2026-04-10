-- FIXED Cleanup: Delete 229 garbage "My Organization" entries
-- For tables with unique orgId constraints: DELETE the garbage rows
-- For tables without unique constraints: UPDATE to move data to real org

SET search_path TO app;
BEGIN;

-- === Tables with UNIQUE orgId constraint → DELETE garbage rows ===
DELETE FROM "BillingSettings" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM contractor_profiles WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "Subscription" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "TokenWallet" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "VendorPricing" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM team_performance WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM org_branding WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM usage_tokens WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "OrgTemplate" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "PipelineMetrics" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "PricingProfile" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "WorkflowStage" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM supplier_connectors WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
DELETE FROM "ClientConnection" WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');

-- === Tables without unique constraint → move orphan data to real org ===
UPDATE activities SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE ai_reports SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE appointments SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "BuildProgress" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE canvassing_routes SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE claims SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "Client" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE code_requirements SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "CompletionPacket" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE contacts SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "CrewSchedule" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE damage_assessments SET org_id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE org_id IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE documents SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE door_knocks SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE estimates SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE feature_flags SET org_id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE org_id IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE file_assets SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE inspections SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "JobCloseout" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE job_schedules SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE jobs SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE leads SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE maintenance_records SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE maintenance_schedules SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE maintenance_tasks SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE maintenance_vendors SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE material_forensic_reports SET org_id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE org_id IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "MaterialOrder" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE network_posts SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE ocr_records SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE projects SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "ProjectNotification" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE properties SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE property_annual_reports SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE property_digital_twins SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE property_health_scores SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE property_impacts SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE property_inspections SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE property_materials SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE property_profiles SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "ReviewReferral" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE storm_events SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE storm_records SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE supplements SET org_id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE org_id IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE tasks SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE token_usage SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE api_tokens SET org_id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE org_id IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE customer_contractor_links SET "contractorId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "contractorId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');

-- === Clean FK references from user_organizations and users ===
DELETE FROM user_organizations WHERE "organizationId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE users SET "orgId" = 'cmhe0kl1j0000acz0am77w682' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');

-- === Delete ALL garbage orgs ===
DELETE FROM "Org" WHERE name = 'My Organization';

-- === Rename Damien's org properly ===
UPDATE "Org" SET name = 'BuildingWithDamienRay', "demoMode" = false WHERE id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

COMMIT;

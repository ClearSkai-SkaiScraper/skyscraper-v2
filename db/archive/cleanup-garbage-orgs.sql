-- Cleanup: Delete 229 garbage "My Organization" entries created by broken pooler URL
-- All data in these orgs is garbage (auto-created by ensureOrgForUser during DB failures)
-- Move any orphan data to Damien's real org before deleting

SET search_path TO app;
BEGIN;

-- Move all FK-referenced data from garbage orgs to Damien's real org
-- (most of these will be 0 rows — just covering all FK constraints)

UPDATE activities SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE ai_reports SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE appointments SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "BillingSettings" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "BuildProgress" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE canvassing_routes SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE claims SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "Client" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE code_requirements SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "CompletionPacket" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE contacts SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE contractor_profiles SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
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
UPDATE "Subscription" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE supplements SET org_id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE org_id IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE tasks SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE team_performance SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE token_usage SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "TokenWallet" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE "VendorPricing" SET "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');
UPDATE api_tokens SET org_id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE org_id IN (SELECT id FROM "Org" WHERE name = 'My Organization');

-- customer_contractor_links uses contractorId → Org.id
UPDATE customer_contractor_links SET "contractorId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15' WHERE "contractorId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');

-- user_organizations (already cleaned in previous step, just in case)
DELETE FROM user_organizations WHERE "organizationId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');

-- users pointing to garbage orgs → point to demo org
UPDATE users SET "orgId" = 'cmhe0kl1j0000acz0am77w682' WHERE "orgId" IN (SELECT id FROM "Org" WHERE name = 'My Organization');

-- Now delete ALL garbage orgs
DELETE FROM "Org" WHERE name = 'My Organization';

-- Rename Damien's org properly
UPDATE "Org" SET name = 'BuildingWithDamienRay', "demoMode" = false WHERE id = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

COMMIT;

-- Verify final state
SELECT 'orgs' as entity, COUNT(*) FROM "Org"
UNION ALL
SELECT 'memberships', COUNT(*) FROM user_organizations
UNION ALL
SELECT 'garbage_orgs', COUNT(*) FROM "Org" WHERE name = 'My Organization';

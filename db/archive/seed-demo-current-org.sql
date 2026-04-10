-- ============================================================================
-- Demo Seed Data for BuildingWithDamien org
-- Org ID: cmhe0kl1j0000acz0am77w682
-- Run: psql "$DATABASE_URL" -f db/seed-demo-current-org.sql
-- ============================================================================

-- Insert demo contacts
INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES
  ('demo-c-bob-001', 'cmhe0kl1j0000acz0am77w682', 'Bob', 'Smith', 'bob.smith@demo.test', '555-111-2222', '123 Main St', 'Prescott', 'AZ', '86301', NOW(), NOW(), 'demo-bob-smith')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Bob', "lastName" = 'Smith', "updatedAt" = NOW();

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES
  ('demo-c-jane-001', 'cmhe0kl1j0000acz0am77w682', 'Jane', 'Martinez', 'jane.martinez@demo.test', '555-333-4444', '456 Oak Ave', 'Prescott Valley', 'AZ', '86314', NOW(), NOW(), 'demo-jane-martinez')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Jane', "lastName" = 'Martinez', "updatedAt" = NOW();

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES
  ('demo-c-mike-001', 'cmhe0kl1j0000acz0am77w682', 'Mike', 'Johnson', 'mike.j@demo.test', '555-555-6666', '789 Pine Rd', 'Flagstaff', 'AZ', '86001', NOW(), NOW(), 'demo-mike-johnson')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Mike', "lastName" = 'Johnson', "updatedAt" = NOW();

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES
  ('demo-c-sarah-001', 'cmhe0kl1j0000acz0am77w682', 'Sarah', 'Thompson', 'sarah.t@demo.test', '555-777-8888', '321 Elm Dr', 'Sedona', 'AZ', '86336', NOW(), NOW(), 'demo-sarah-thompson')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Sarah', "lastName" = 'Thompson', "updatedAt" = NOW();

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES
  ('demo-c-david-001', 'cmhe0kl1j0000acz0am77w682', 'David', 'Chen', 'david.chen@demo.test', '555-999-0000', '567 Birch Ln', 'Cottonwood', 'AZ', '86326', NOW(), NOW(), 'demo-david-chen')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'David', "lastName" = 'Chen', "updatedAt" = NOW();

-- Insert demo properties
INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-p-bob-001', 'cmhe0kl1j0000acz0am77w682', 'demo-c-bob-001', '123 Main St', 'residential', '123 Main St', 'Prescott', 'AZ', '86301', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '123 Main St', "updatedAt" = NOW();

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-p-jane-001', 'cmhe0kl1j0000acz0am77w682', 'demo-c-jane-001', '456 Oak Ave', 'residential', '456 Oak Ave', 'Prescott Valley', 'AZ', '86314', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '456 Oak Ave', "updatedAt" = NOW();

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-p-mike-001', 'cmhe0kl1j0000acz0am77w682', 'demo-c-mike-001', '789 Pine Rd', 'residential', '789 Pine Rd', 'Flagstaff', 'AZ', '86001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '789 Pine Rd', "updatedAt" = NOW();

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-p-sarah-001', 'cmhe0kl1j0000acz0am77w682', 'demo-c-sarah-001', '321 Elm Dr', 'residential', '321 Elm Dr', 'Sedona', 'AZ', '86336', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '321 Elm Dr', "updatedAt" = NOW();

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-p-david-001', 'cmhe0kl1j0000acz0am77w682', 'demo-c-david-001', '567 Birch Ln', 'residential', '567 Birch Ln', 'Cottonwood', 'AZ', '86326', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '567 Birch Ln', "updatedAt" = NOW();

-- Insert demo claims (5 claims in various statuses)
INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", insured_name, "createdAt", "updatedAt", "isDemo")
VALUES
  ('demo-clm-001', 'cmhe0kl1j0000acz0am77w682', 'demo-p-bob-001', 'CLM-2025-001', 'Bob Smith - Hail Damage Roof Replacement', 'active', 'Hail', NOW() - INTERVAL '30 days', 'State Farm', 2450000, 2200000, 'Bob Smith', NOW() - INTERVAL '30 days', NOW(), true)
ON CONFLICT (id) DO UPDATE SET title = 'Bob Smith - Hail Damage Roof Replacement', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", insured_name, "createdAt", "updatedAt", "isDemo")
VALUES
  ('demo-clm-002', 'cmhe0kl1j0000acz0am77w682', 'demo-p-jane-001', 'CLM-2025-002', 'Jane Martinez - Wind Damage Shingles', 'new', 'Wind', NOW() - INTERVAL '15 days', 'Allstate', 1850000, NULL, 'Jane Martinez', NOW() - INTERVAL '15 days', NOW(), true)
ON CONFLICT (id) DO UPDATE SET title = 'Jane Martinez - Wind Damage Shingles', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", insured_name, "createdAt", "updatedAt", "isDemo")
VALUES
  ('demo-clm-003', 'cmhe0kl1j0000acz0am77w682', 'demo-p-mike-001', 'CLM-2025-003', 'Mike Johnson - Storm Damage Full Reroof', 'approved', 'Hail', NOW() - INTERVAL '45 days', 'USAA', 3200000, 2950000, 'Mike Johnson', NOW() - INTERVAL '45 days', NOW(), true)
ON CONFLICT (id) DO UPDATE SET title = 'Mike Johnson - Storm Damage Full Reroof', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", insured_name, "createdAt", "updatedAt", "isDemo")
VALUES
  ('demo-clm-004', 'cmhe0kl1j0000acz0am77w682', 'demo-p-sarah-001', 'CLM-2025-004', 'Sarah Thompson - Monsoon Water Intrusion', 'active', 'Water', NOW() - INTERVAL '10 days', 'Farmers Insurance', 1200000, NULL, 'Sarah Thompson', NOW() - INTERVAL '10 days', NOW(), true)
ON CONFLICT (id) DO UPDATE SET title = 'Sarah Thompson - Monsoon Water Intrusion', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", insured_name, "createdAt", "updatedAt", "isDemo")
VALUES
  ('demo-clm-005', 'cmhe0kl1j0000acz0am77w682', 'demo-p-david-001', 'CLM-2025-005', 'David Chen - Tree Fall Structural Damage', 'new', 'Wind', NOW() - INTERVAL '5 days', 'Liberty Mutual', 4500000, NULL, 'David Chen', NOW() - INTERVAL '5 days', NOW(), true)
ON CONFLICT (id) DO UPDATE SET title = 'David Chen - Tree Fall Structural Damage', "updatedAt" = NOW();

-- Insert demo leads (linked to claims)
-- leads uses "stage" (not "status"), and requires "contactId"
INSERT INTO app.leads (id, "orgId", "contactId", title, stage, source, value, "createdAt", "updatedAt", "claimId")
VALUES
  ('demo-lead-001', 'cmhe0kl1j0000acz0am77w682', 'demo-c-bob-001', 'Bob Smith - Prescott Hail', 'qualified', 'door_knock', 2450000, NOW() - INTERVAL '32 days', NOW(), 'demo-clm-001'),
  ('demo-lead-002', 'cmhe0kl1j0000acz0am77w682', 'demo-c-jane-001', 'Jane Martinez - PV Wind', 'new', 'referral', 1850000, NOW() - INTERVAL '16 days', NOW(), 'demo-clm-002'),
  ('demo-lead-003', 'cmhe0kl1j0000acz0am77w682', 'demo-c-mike-001', 'Mike Johnson - Flagstaff Storm', 'won', 'website', 3200000, NOW() - INTERVAL '50 days', NOW(), 'demo-clm-003'),
  ('demo-lead-004', 'cmhe0kl1j0000acz0am77w682', 'demo-c-sarah-001', 'Sarah Thompson - Sedona Water', 'contacted', 'canvass', 1200000, NOW() - INTERVAL '11 days', NOW(), 'demo-clm-004'),
  ('demo-lead-005', 'cmhe0kl1j0000acz0am77w682', 'demo-c-david-001', 'David Chen - Cottonwood Tree', 'new', 'door_knock', 4500000, NOW() - INTERVAL '5 days', NOW(), 'demo-clm-005')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, "updatedAt" = NOW();

-- Insert demo CRM jobs (crm_jobs uses snake_case columns: insured_name, property_address, created_at, updated_at — no "title" column)
INSERT INTO app.crm_jobs (id, org_id, status, property_address, insured_name, claim_number, carrier, created_at, updated_at)
VALUES
  ('demo-job-001', 'cmhe0kl1j0000acz0am77w682', 'in_progress', '123 Main St, Prescott, AZ 86301', 'Bob Smith', 'CLM-2025-001', 'State Farm', NOW() - INTERVAL '28 days', NOW()),
  ('demo-job-002', 'cmhe0kl1j0000acz0am77w682', 'pending', '456 Oak Ave, Prescott Valley, AZ 86314', 'Jane Martinez', 'CLM-2025-002', 'Allstate', NOW() - INTERVAL '14 days', NOW()),
  ('demo-job-003', 'cmhe0kl1j0000acz0am77w682', 'completed', '789 Pine Rd, Flagstaff, AZ 86001', 'Mike Johnson', 'CLM-2025-003', 'USAA', NOW() - INTERVAL '40 days', NOW()),
  ('demo-job-004', 'cmhe0kl1j0000acz0am77w682', 'pending', '321 Elm Dr, Sedona, AZ 86336', 'Sarah Thompson', 'CLM-2025-004', 'Farmers Insurance', NOW() - INTERVAL '8 days', NOW()),
  ('demo-job-005', 'cmhe0kl1j0000acz0am77w682', 'in_progress', '567 Birch Ln, Cottonwood, AZ 86326', 'David Chen', 'CLM-2025-005', 'Liberty Mutual', NOW() - INTERVAL '4 days', NOW())
ON CONFLICT (id) DO UPDATE SET insured_name = EXCLUDED.insured_name, updated_at = NOW();

-- Insert job financials for the enterprise finance features (updated_at is snake_case)
INSERT INTO app.job_financials (id, org_id, job_id, contract_amount, supplement_amount, material_cost, labor_cost, overhead_cost, other_cost, amount_invoiced, amount_collected, updated_at)
VALUES
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'demo-job-001', 24500.00, 3200.00, 8500.00, 9200.00, 2400.00, 800.00, 24500.00, 18000.00, NOW()),
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'demo-job-003', 29500.00, 4800.00, 10200.00, 11500.00, 3000.00, 1200.00, 34300.00, 34300.00, NOW()),
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'demo-job-005', 45000.00, 0.00, 15000.00, 18000.00, 4500.00, 2000.00, 20000.00, 0.00, NOW())
ON CONFLICT (job_id) DO UPDATE SET contract_amount = EXCLUDED.contract_amount, updated_at = NOW();

-- Insert demo team_performance data for the leaderboard (requires periodStart and periodEnd)
INSERT INTO app.team_performance (id, "orgId", "userId", "periodStart", "periodEnd", "doorsKnocked", "claimsSigned", "claimsApproved", "totalRevenueGenerated", "commissionOwed", "commissionPaid", "commissionPending", "closeRate", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'user_35Lks8c1cQpyxGpsXEO2cmBZNvb', NOW() - INTERVAL '90 days', NOW(), 145, 28, 22, 385000.00, 12500.00, 8200.00, 4300.00, 19.31, NOW() - INTERVAL '90 days', NOW()),
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'user_357CVOQkIT3wxL9pLUtgGEkKxsY', NOW() - INTERVAL '90 days', NOW(), 92, 15, 12, 210000.00, 7800.00, 5500.00, 2300.00, 16.30, NOW() - INTERVAL '90 days', NOW()),
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'user_demo_admin', NOW() - INTERVAL '90 days', NOW(), 200, 42, 35, 520000.00, 18500.00, 14000.00, 4500.00, 21.00, NOW() - INTERVAL '90 days', NOW()),
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'user_demo_pm', NOW() - INTERVAL '90 days', NOW(), 75, 10, 8, 145000.00, 4200.00, 3000.00, 1200.00, 13.33, NOW() - INTERVAL '90 days', NOW()),
  (gen_random_uuid(), 'cmhe0kl1j0000acz0am77w682', 'user_demo_inspector', NOW() - INTERVAL '90 days', NOW(), 50, 5, 4, 68000.00, 2100.00, 1500.00, 600.00, 10.00, NOW() - INTERVAL '90 days', NOW())
ON CONFLICT ("orgId", "userId") DO UPDATE SET
  "doorsKnocked" = EXCLUDED."doorsKnocked",
  "claimsSigned" = EXCLUDED."claimsSigned",
  "claimsApproved" = EXCLUDED."claimsApproved",
  "totalRevenueGenerated" = EXCLUDED."totalRevenueGenerated",
  "commissionOwed" = EXCLUDED."commissionOwed",
  "commissionPaid" = EXCLUDED."commissionPaid",
  "commissionPending" = EXCLUDED."commissionPending",
  "closeRate" = EXCLUDED."closeRate",
  "updatedAt" = NOW();

-- Verify seeded data
SELECT '✅ DEMO SEED COMPLETE' as status;
SELECT 'Claims: ' || COUNT(*) as result FROM app.claims WHERE "orgId" = 'cmhe0kl1j0000acz0am77w682';
SELECT 'Leads: ' || COUNT(*) as result FROM app.leads WHERE "orgId" = 'cmhe0kl1j0000acz0am77w682';
SELECT 'Jobs: ' || COUNT(*) as result FROM app.crm_jobs WHERE org_id = 'cmhe0kl1j0000acz0am77w682';
SELECT 'Job Financials: ' || COUNT(*) as result FROM app.job_financials WHERE org_id = 'cmhe0kl1j0000acz0am77w682';
SELECT 'Team Performance: ' || COUNT(*) as result FROM app.team_performance WHERE "orgId" = 'cmhe0kl1j0000acz0am77w682';
SELECT 'Contacts: ' || COUNT(*) as result FROM app.contacts WHERE "orgId" = 'cmhe0kl1j0000acz0am77w682';

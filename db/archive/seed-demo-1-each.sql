-- Clean up excess demo data: keep exactly 1 claim, 1 job, 1 lead
-- All with clearly fictitious data
-- Target org: 8c173d40-b926-48a6-ab5b-f7097e1b8c15 (BuildingWithDamienRay)

SET search_path TO app;
BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Delete ALL existing claims, jobs, leads (and their FK children)
-- ═══════════════════════════════════════════════════════════════════════

-- Delete FK children of claims first
DELETE FROM "BuildProgress" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "ClaimClientLink" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "ClaimMaterial" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "ClaimMessage" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "CompletionPacket" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "CrewSchedule" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "JobCloseout" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "MaterialOrder" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "ProjectNotification" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM "ReviewReferral" WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM activities WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM ai_reports WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM appointments WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_activities WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_analysis WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_bad_faith_analysis WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_builders WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_event_reconstruction WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_payments WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_supplements WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_tasks WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM claim_timeline_events WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM client_access WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM damage_assessments WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM depreciation_invoices WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM depreciation_items WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM estimates WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM financial_snapshots WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM inspections WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM material_forensic_reports WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM payment_history WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM property_impacts WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM reports WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM scopes WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM supplement_items WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM supplements WHERE claim_id IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM weather_reports WHERE "claimId" IN (SELECT id FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');
DELETE FROM documents WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

-- Delete FK children of jobs
DELETE FROM job_vendors WHERE "jobId" IN (SELECT id FROM jobs WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15');

-- Delete FK children of leads (leads.claimId → claims)
-- leads reference claims, so we need to null those out first
UPDATE leads SET "claimId" = NULL WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

-- Now delete jobs (jobs.claimId → claims)
DELETE FROM jobs WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

-- Delete leads
DELETE FROM leads WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

-- Delete claims
DELETE FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

-- Delete old demo properties and contacts
DELETE FROM properties WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';
DELETE FROM contacts WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Create demo contact first (properties FK to contacts)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO contacts (id, "orgId", "firstName", "lastName", email, phone, slug, "isDemo", "createdAt", "updatedAt")
VALUES (
  'demo-contact-fake-homer',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'Homer',
  'Simpson',
  'homer@example.test',
  '555-0123',
  'homer-simpson-demo',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2b: Create demo property (claims FK to properties)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "yearBuilt", "squareFootage", "roofType", "roofAge", carrier, "policyNumber", "createdAt", "updatedAt", "isDemo")
VALUES (
  'demo-prop-1234-fake',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-contact-fake-homer',
  '742 Evergreen Terrace',
  'residential',
  '742 Evergreen Terrace',
  'Springfield',
  'AZ',
  '85001',
  2008,
  2200,
  'asphalt_shingle',
  12,
  'Acme Insurance Co.',
  'POL-000-DEMO-1234',
  NOW(),
  NOW(),
  true
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Insert exactly 1 demo claim
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO claims (
  id, "orgId", "propertyId", "claimNumber", title, description,
  "damageType", "dateOfLoss", carrier, "adjusterName", "adjusterPhone", "adjusterEmail",
  status, priority, "estimatedValue", "approvedValue", "deductible",
  "assignedTo", "createdAt", "updatedAt", "isDemo",
  "insured_name", "policy_number", "homeownerEmail"
)
VALUES (
  'demo-claim-simpsons-hail',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-prop-1234-fake',
  'CLM-DEMO-0001',
  'Simpson Hail Damage — Roof & Gutters',
  'Hail storm on 01/15/2026 caused impact damage to asphalt shingles on the south-facing slope and dented aluminum gutters on the east elevation. Adjuster inspection confirmed Class 4 hail. Carrier approved emergency tarp.',
  'WIND_HAIL',
  '2026-01-15',
  'Acme Insurance Co.',
  'Frank Grimes',
  '555-0199',
  'fgrimes@acme-ins.example.test',
  'in_progress',
  'high',
  1850000,   -- $18,500.00 (cents)
  1200000,   -- $12,000.00 approved so far
  100000,    -- $1,000.00 deductible
  '119de743-bf17-487a-8037-3852804210ea',
  NOW() - INTERVAL '10 days',
  NOW(),
  true,
  'Homer J. Simpson',
  'POL-000-DEMO-1234',
  'homer@example.test'
);

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Insert exactly 1 demo retail job
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO jobs (
  id, "orgId", "propertyId", "claimId", title, description,
  "jobType", "scheduledStart", "scheduledEnd",
  status, priority, foreman, "crewSize",
  "estimatedCost", "createdAt", "updatedAt"
)
VALUES (
  'demo-job-simpsons-roof',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-prop-1234-fake',
  'demo-claim-simpsons-hail',
  'Simpson Roof Tear-off & Re-shingle',
  'Full tear-off of south slope (18 sq), install GAF Timberline HDZ Charcoal, replace step flashing at chimney, reset turbine vent. Ice & water shield in valleys.',
  'roof_repair',
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '7 days',
  'scheduled',
  'high',
  'Drey Jakes',
  4,
  1450000,   -- $14,500.00
  NOW() - INTERVAL '3 days',
  NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: Insert exactly 1 demo lead
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO leads (
  id, "orgId", "contactId", title, description,
  source, value, probability, stage, temperature,
  "assignedTo", "createdAt", "updatedAt", "isDemo",
  "jobType", "workType", "urgency"
)
VALUES (
  'demo-lead-simpson-gutter',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-contact-fake-homer',
  'Simpson — Gutter Replacement (Retail)',
  'Homeowner requesting quote for full gutter replacement, 160 LF of 5" seamless aluminum in bronze. Includes 4 downspouts. Retail job, no insurance.',
  'referral',
  320000,     -- $3,200.00
  75,
  'qualified',
  'warm',
  '119de743-bf17-487a-8037-3852804210ea',
  NOW() - INTERVAL '2 days',
  NOW(),
  true,
  'gutters',
  'retail',
  'medium'
);

COMMIT;

-- Verify
SELECT 'claims' as entity, COUNT(*) FROM claims WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15'
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15'
UNION ALL
SELECT 'leads', COUNT(*) FROM leads WHERE "orgId" = '8c173d40-b926-48a6-ab5b-f7097e1b8c15';

-- ============================================================
-- DEMO DATA SEED: John Smith (Claim), Jane Smith (Retail),
--                 Bob Smith (Lead)
-- Org: 8c173d40-b926-48a6-ab5b-f7097e1b8c15
-- Run: psql "$DATABASE_URL" -f ./db/seed-demo-smith-trio.sql
-- ============================================================

BEGIN;

-- ========================================
-- 1. CONTACTS (upsert — they already exist)
-- ========================================

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", slug, "createdAt", "updatedAt")
VALUES
  ('demo-contact-john-7dfd4537', '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
   'John', 'Smith', 'john.smith@demo.test', '(928) 555-0101',
   '742 Evergreen Terrace', 'Prescott', 'AZ', '86301',
   'john-smith-demo', NOW(), NOW()),

  ('demo-contact-jane-7dfd4537', '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
   'Jane', 'Smith', 'jane.smith@demo.test', '(928) 555-0202',
   '1600 Pennsylvania Ave', 'Prescott Valley', 'AZ', '86314',
   'jane-smith-demo', NOW(), NOW()),

  ('demo-contact-bob-7dfd4537', '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
   'Bob', 'Smith', 'bob.smith@demo.test', '(928) 555-0303',
   '221B Baker Street', 'Flagstaff', 'AZ', '86001',
   'bob-smith-demo', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  street = EXCLUDED.street,
  "updatedAt" = NOW();

-- ========================================
-- 2. PROPERTIES (one per contact)
-- ========================================

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "yearBuilt", "squareFootage", "roofType", "roofAge", carrier, "policyNumber", "isDemo", "createdAt", "updatedAt")
VALUES
  -- John Smith — insurance claim property
  ('demo-property-john-7dfd4537', '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
   'demo-contact-john-7dfd4537', 'John Smith Residence', 'residential',
   '742 Evergreen Terrace', 'Prescott', 'AZ', '86301',
   2003, 2200, 'Asphalt Shingle', 10, 'State Farm', 'SF-AZ-2025-88412',
   true, NOW(), NOW()),

  -- Jane Smith — retail / out-of-pocket property
  ('demo-property-jane-7dfd4537', '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
   'demo-contact-jane-7dfd4537', 'Jane Smith Home', 'residential',
   '1600 Pennsylvania Ave', 'Prescott Valley', 'AZ', '86314',
   2012, 1850, 'Tile', 6, NULL, NULL,
   true, NOW(), NOW()),

  -- Bob Smith — lead prospect property
  ('demo-property-bob-7dfd4537', '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
   'demo-contact-bob-7dfd4537', 'Bob Smith Property', 'residential',
   '221B Baker Street', 'Flagstaff', 'AZ', '86001',
   1995, 3100, 'Metal Standing Seam', 18, 'USAA', 'USAA-2025-33019',
   true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "propertyType" = EXCLUDED."propertyType",
  "yearBuilt" = EXCLUDED."yearBuilt",
  "squareFootage" = EXCLUDED."squareFootage",
  "roofType" = EXCLUDED."roofType",
  "roofAge" = EXCLUDED."roofAge",
  carrier = EXCLUDED.carrier,
  "policyNumber" = EXCLUDED."policyNumber",
  "updatedAt" = NOW();

-- ========================================
-- 3. CLAIM — John Smith (Insurance Claim)
-- ========================================

INSERT INTO app.claims (
  id, "orgId", "propertyId", "claimNumber", title, description,
  "damageType", "dateOfLoss", carrier, "adjusterName", "adjusterPhone", "adjusterEmail",
  status, priority, "estimatedValue", "approvedValue", "deductible",
  "insured_name", "policy_number", "isDemo", "createdAt", "updatedAt"
)
VALUES (
  'demo-claim-john-7dfd4537',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-property-john-7dfd4537',
  'CLM-2026-DEMO-001',
  'John Smith — Hail Damage Roof Claim',
  'Major hail storm on 1/15/2026 caused extensive damage to asphalt shingle roof, gutters, and two skylights. Adjuster has completed initial inspection. Waiting on supplement approval for full scope including damaged soffit and fascia boards.',
  'Hail',
  '2026-01-15'::timestamp,
  'State Farm',
  'Tom Richards',
  '(602) 555-8800',
  'tom.richards@statefarm-demo.test',
  'active',
  'high',
  2450000,   -- $24,500
  1875000,   -- $18,750 approved so far
  250000,    -- $2,500 deductible
  'John Smith',
  'SF-AZ-2025-88412',
  true,
  NOW() - INTERVAL '28 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  "estimatedValue" = EXCLUDED."estimatedValue",
  "approvedValue" = EXCLUDED."approvedValue",
  "updatedAt" = NOW();

-- ========================================
-- 4. LEADS — All Three Smiths
-- ========================================

-- John Smith — CLAIM lead (linked to claim)
INSERT INTO app.leads (
  id, "orgId", "contactId", title, description,
  source, value, probability, stage, temperature,
  "jobCategory", "jobType", "workType", "isDemo",
  "claimId", "createdAt", "updatedAt"
)
VALUES (
  'demo-lead-john-claim-7dfd4537',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-contact-john-7dfd4537',
  'John Smith — Roof Replacement (Insurance Claim)',
  'Full asphalt shingle roof tear-off and replacement. Insurance approved initial scope at $18,750. Supplement pending for skylights and soffit repair. State Farm claim CLM-2026-DEMO-001.',
  'insurance',
  2450000,
  85,
  'QUALIFIED',
  'hot',
  'claim',
  'roof_replacement',
  'insurance_restoration',
  true,
  'demo-claim-john-7dfd4537',
  NOW() - INTERVAL '25 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  stage = EXCLUDED.stage,
  value = EXCLUDED.value,
  "claimId" = EXCLUDED."claimId",
  "updatedAt" = NOW();

-- Jane Smith — RETAIL / Out-of-Pocket lead
INSERT INTO app.leads (
  id, "orgId", "contactId", title, description,
  source, value, probability, stage, temperature,
  "jobCategory", "jobType", "workType", "isDemo",
  "createdAt", "updatedAt"
)
VALUES (
  'demo-lead-jane-retail-7dfd4537',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-contact-jane-7dfd4537',
  'Jane Smith — Kitchen & Bath Remodel (Retail)',
  'Complete kitchen remodel with new cabinets, granite countertops, and backsplash. Master bath update with walk-in shower conversion. Client paying out-of-pocket, no insurance involvement. Wants work started by March.',
  'referral',
  3800000,
  70,
  'PROPOSAL',
  'warm',
  'out_of_pocket',
  'remodel',
  'retail',
  true,
  NOW() - INTERVAL '14 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  stage = EXCLUDED.stage,
  value = EXCLUDED.value,
  "updatedAt" = NOW();

-- Bob Smith — LEAD (prospecting stage)
INSERT INTO app.leads (
  id, "orgId", "contactId", title, description,
  source, value, probability, stage, temperature,
  "jobCategory", "jobType", "workType", "isDemo",
  "createdAt", "updatedAt"
)
VALUES (
  'demo-lead-bob-prospect-7dfd4537',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-contact-bob-7dfd4537',
  'Bob Smith — Metal Roof Inspection & Possible Re-coat',
  'Bob reached out after seeing our ad on Facebook. 18-year-old metal standing seam roof may need re-coating or panel replacement. Wants an inspection and estimate. Located in Flagstaff — potential winter weather concern. Follow up next week.',
  'social_media',
  1200000,
  35,
  'NEW',
  'cold',
  'lead',
  'inspection',
  'lead_prospect',
  true,
  NOW() - INTERVAL '3 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  stage = EXCLUDED.stage,
  value = EXCLUDED.value,
  "updatedAt" = NOW();

-- ========================================
-- 5. JOBS — John (Claim Job) & Jane (Retail Job)
-- ========================================

-- John Smith — Insurance Claim Job (scheduled)
INSERT INTO app.jobs (
  id, "orgId", "propertyId", "claimId", title, description,
  "jobType", "scheduledStart", "scheduledEnd",
  status, priority, "crewSize", "estimatedCost",
  "createdAt", "updatedAt"
)
VALUES (
  'demo-job-john-roof-7dfd4537',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-property-john-7dfd4537',
  'demo-claim-john-7dfd4537',
  'John Smith — Full Roof Replacement',
  'Tear-off existing asphalt shingle roof (22 squares). Install new GAF Timberline HDZ architectural shingles in Charcoal. Replace damaged decking (~8 sheets OSB). Install new drip edge, ice & water shield in valleys, and synthetic underlayment. Replace 2 damaged skylights with Velux FCM units. Repair soffit and fascia on east side.',
  'roof_replacement',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '10 days',
  'scheduled',
  'high',
  5,
  2450000,
  NOW() - INTERVAL '5 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  "scheduledStart" = EXCLUDED."scheduledStart",
  "scheduledEnd" = EXCLUDED."scheduledEnd",
  "updatedAt" = NOW();

-- Jane Smith — Retail Remodel Job (pending proposal acceptance)
INSERT INTO app.jobs (
  id, "orgId", "propertyId", title, description,
  "jobType", "scheduledStart", "scheduledEnd",
  status, priority, "crewSize", "estimatedCost",
  "createdAt", "updatedAt"
)
VALUES (
  'demo-job-jane-remodel-7dfd4537',
  '8c173d40-b926-48a6-ab5b-f7097e1b8c15',
  'demo-property-jane-7dfd4537',
  'Jane Smith — Kitchen & Bath Remodel',
  'Phase 1: Kitchen demolition and cabinet install (5 days). Phase 2: Granite countertop template and install (3 days). Phase 3: Backsplash tile work (2 days). Phase 4: Master bath walk-in shower conversion with frameless glass (4 days). All materials selected — awaiting client sign-off on final proposal.',
  'remodel',
  NOW() + INTERVAL '21 days',
  NOW() + INTERVAL '35 days',
  'pending',
  'medium',
  3,
  3800000,
  NOW() - INTERVAL '2 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  "scheduledStart" = EXCLUDED."scheduledStart",
  "scheduledEnd" = EXCLUDED."scheduledEnd",
  "updatedAt" = NOW();

COMMIT;

-- ========================================
-- VERIFICATION
-- ========================================

\echo ''
\echo '============================================'
\echo '  DEMO SMITH TRIO — SEED COMPLETE'
\echo '============================================'
\echo ''

\echo '>> Contacts:'
SELECT "firstName" || ' ' || "lastName" as name, email, phone
FROM app.contacts WHERE id LIKE 'demo-contact-%-7dfd4537';

\echo ''
\echo '>> Properties:'
SELECT name, street, city, "roofType"
FROM app.properties WHERE id LIKE 'demo-property-%-7dfd4537';

\echo ''
\echo '>> Claims:'
SELECT title, status, carrier, "estimatedValue"/100 as est_dollars
FROM app.claims WHERE id LIKE 'demo-claim-%-7dfd4537';

\echo ''
\echo '>> Leads:'
SELECT title, stage, temperature, "jobCategory", value/100 as est_dollars
FROM app.leads WHERE id LIKE 'demo-lead-%-7dfd4537';

\echo ''
\echo '>> Jobs:'
SELECT title, status, "jobType", "estimatedCost"/100 as est_dollars
FROM app.jobs WHERE id LIKE 'demo-job-%-7dfd4537';

\echo ''
\echo '✅ John Smith = Insurance Claim (active, scheduled job)'
\echo '✅ Jane Smith = Retail/Out-of-Pocket (proposal stage, pending job)'
\echo '✅ Bob Smith  = Lead/Prospect (new, cold, no job yet)'
\echo ''

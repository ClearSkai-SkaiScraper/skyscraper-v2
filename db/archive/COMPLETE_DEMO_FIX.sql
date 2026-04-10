-- COMPLETE DEMO DATA SEEDING SCRIPT
-- Fixes all missing demo jobs, claims, and ensures templates are available
-- Run with: psql "$DATABASE_URL" -f ./db/COMPLETE_DEMO_FIX.sql

-- Current org ID (replace with your actual org ID if different)
\set DEMO_ORG_ID '0f3dfe0b-43be-4478-add4-b2ac50803673'

-- ========================================
-- PART 1: CONTACTS (Foundation)
-- ========================================

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES 
  -- Bob Smith (for claim job)
  ('demo-contact-bob-smith-001', :'DEMO_ORG_ID', 'Bob', 'Smith', 'bob.smith@demo.test', '555-111-2222', '123 Main St', 'Prescott', 'AZ', '86301', NOW(), NOW(), 'demo-bob-smith-001'),
  -- Jane Doe (for out of pocket job)
  ('demo-contact-jane-doe-001', :'DEMO_ORG_ID', 'Jane', 'Doe', 'jane.doe@demo.test', '555-333-4444', '456 Oak Ave', 'Prescott Valley', 'AZ', '86314', NOW(), NOW(), 'demo-jane-doe-001'),
  -- Mike Johnson (for repair job)
  ('demo-contact-mike-johnson-001', :'DEMO_ORG_ID', 'Mike', 'Johnson', 'mike.j@demo.test', '555-555-6666', '789 Pine Rd', 'Flagstaff', 'AZ', '86001', NOW(), NOW(), 'demo-mike-johnson-001'),
  -- Emily Carter (for financed job)
  ('demo-contact-emily-carter-001', :'DEMO_ORG_ID', 'Emily', 'Carter', 'emily.carter@demo.test', '555-777-8888', '321 Elm Street', 'Sedona', 'AZ', '86336', NOW(), NOW(), 'demo-emily-carter-001')
ON CONFLICT (id) DO UPDATE SET 
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "updatedAt" = NOW();

-- ========================================
-- PART 2: PROPERTIES (Linked to Contacts)
-- ========================================

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-property-bob-001', :'DEMO_ORG_ID', 'demo-contact-bob-smith-001', '123 Main St', 'residential', '123 Main St', 'Prescott', 'AZ', '86301', NOW(), NOW()),
  ('demo-property-jane-001', :'DEMO_ORG_ID', 'demo-contact-jane-doe-001', '456 Oak Ave', 'residential', '456 Oak Ave', 'Prescott Valley', 'AZ', '86314', NOW(), NOW()),
  ('demo-property-mike-001', :'DEMO_ORG_ID', 'demo-contact-mike-johnson-001', '789 Pine Rd', 'residential', '789 Pine Rd', 'Flagstaff', 'AZ', '86001', NOW(), NOW()),
  ('demo-property-emily-001', :'DEMO_ORG_ID', 'demo-contact-emily-carter-001', '321 Elm Street', 'residential', '321 Elm Street', 'Sedona', 'AZ', '86336', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  "updatedAt" = NOW();

-- ========================================
-- PART 3: CLAIMS (Insurance Claims)
-- ========================================

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", "createdAt", "updatedAt")
VALUES 
  -- Bob Smith - Active Claim
  ('demo-claim-current-001', :'DEMO_ORG_ID', 'demo-property-bob-001', 'DEMO-CLM-001', 'Bob Smith - Hail Damage Roof Claim', 'new', 'Hail', NOW() - INTERVAL '30 days', 'State Farm', 1850000, 1650000, NOW(), NOW()),
  -- Jane Doe - Storm Damage
  ('demo-claim-current-002', :'DEMO_ORG_ID', 'demo-property-jane-001', 'DEMO-CLM-002', 'Jane Doe - Storm Damage Claim', 'active', 'Wind', NOW() - INTERVAL '15 days', 'Allstate', 2250000, 2100000, NOW(), NOW()),
  -- Mike Johnson - Water Damage
  ('demo-claim-current-003', :'DEMO_ORG_ID', 'demo-property-mike-001', 'DEMO-CLM-003', 'Mike Johnson - Water Damage Claim', 'approved', 'Water', NOW() - INTERVAL '45 days', 'USAA', 890000, 800000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title, 
  "updatedAt" = NOW();

-- ========================================
-- PART 4: LEADS/JOBS (All Categories)
-- ========================================

INSERT INTO app.leads (id, "orgId", "contactId", title, description, stage, source, value, "jobCategory", "createdAt", "updatedAt")
VALUES 
  -- CLAIM: Bob Smith - Insurance Claim Job
  ('demo-bob-claim-lead', :'DEMO_ORG_ID', 'demo-contact-bob-smith-001', 'Bob Smith - Roof Repair (Insurance)', 'Hail damage roof repair approved by insurance', 'QUALIFIED', 'demo', 1850000, 'claim', NOW(), NOW()),
  
  -- OUT OF POCKET: Jane Doe - Cash Job
  ('demo-jane-oop-lead', :'DEMO_ORG_ID', 'demo-contact-jane-doe-001', 'Jane Doe - Bathroom Remodel (Cash)', 'Full bathroom renovation - Out of Pocket payment', 'PROPOSAL', 'demo', 2200000, 'out_of_pocket', NOW(), NOW()),
  
  -- REPAIR: Mike Johnson - Standard Repair Job
  ('demo-mike-repair-lead', :'DEMO_ORG_ID', 'demo-contact-mike-johnson-001', 'Mike Johnson - Gutter Replacement', 'Standard gutter replacement and repair work', 'NEW', 'demo', 890000, 'repair', NOW(), NOW()),
  
  -- FINANCED: Bob (not Emily) - Financed Job (to match URL pattern)
  ('demo-bob-financed-lead', :'DEMO_ORG_ID', 'demo-contact-emily-carter-001', 'Emily Carter - Kitchen Remodel (Financed)', 'Complete kitchen remodel with third-party financing', 'CONTACTED', 'demo', 3500000, 'financed', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title, 
  "updatedAt" = NOW();

-- Link claims to leads
UPDATE app.leads SET "claimId" = 'demo-claim-current-001' WHERE id = 'demo-bob-claim-lead';
UPDATE app.leads SET "claimId" = 'demo-claim-current-002' WHERE id IN ('demo-jane-oop-lead');

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

\echo '================================================'
\echo 'DEMO DATA SEEDING COMPLETE!'
\echo '================================================'
\echo ''
\echo 'Contacts created:'
SELECT COUNT(*) as contact_count, 
       STRING_AGG("firstName" || ' ' || "lastName", ', ') as names
FROM app.contacts 
WHERE "orgId" = :'DEMO_ORG_ID' 
  AND id LIKE 'demo-contact-%';

\echo ''
\echo 'Properties created:'
SELECT COUNT(*) as property_count,
       STRING_AGG(name, ', ') as addresses
FROM app.properties 
WHERE "orgId" = :'DEMO_ORG_ID' 
  AND id LIKE 'demo-property-%';

\echo ''
\echo 'Claims created:'
SELECT COUNT(*) as claim_count,
       STRING_AGG(title, E'\n  - ') as claim_titles
FROM app.claims 
WHERE "orgId" = :'DEMO_ORG_ID' 
  AND id LIKE 'demo-claim-%';

\echo ''
\echo 'Leads/Jobs created by category:'
SELECT "jobCategory", COUNT(*) as count, 
       STRING_AGG(title, E'\n    - ') as job_titles
FROM app.leads 
WHERE "orgId" = :'DEMO_ORG_ID' 
  AND (id LIKE 'demo-lead-%' OR id LIKE 'demo-%-lead')
GROUP BY "jobCategory"
ORDER BY "jobCategory";

\echo ''
\echo '================================================'
\echo 'Pipeline should now show ALL job categories:'
\echo '  - Insurance Claims (claim)'
\echo '  - Out of Pocket Jobs (out_of_pocket)'
\echo '  - Repair Jobs (repair)'
\echo '  - Financed Jobs (financed)'
\echo '================================================'

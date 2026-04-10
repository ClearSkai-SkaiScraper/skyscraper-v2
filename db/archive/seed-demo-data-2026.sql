-- =============================================
-- DEMO DATA: 1 Claim, 1 Retail Job, 1 Lead
-- Org: cmhe0kl1j0000acz0am77w682
-- User: user_357CVOQkIT3wxL9pLUtgGEkKxsY
-- =============================================

-- 0) CREATE CONTACTS first (required FK for leads)
INSERT INTO contacts (
  id, "orgId", "firstName", "lastName", email, phone,
  street, city, state, "zipCode", "createdAt", "updatedAt", "isDemo"
) VALUES
  ('demo-contact-martinez-2026', 'cmhe0kl1j0000acz0am77w682',
   'Carlos', 'Martinez', 'cmartinez@example.com', '(480) 555-0301',
   '4521 E Thunderbird Rd', 'Phoenix', 'AZ', '85032',
   NOW() - interval '5 days', NOW(), false),
  ('demo-contact-wilson-2026', 'cmhe0kl1j0000acz0am77w682',
   'Rebecca', 'Wilson', 'rwilson@example.com', '(480) 555-0302',
   '8832 N 19th Ave', 'Phoenix', 'AZ', '85021',
   NOW() - interval '3 days', NOW(), false),
  ('demo-contact-thompson-2026', 'cmhe0kl1j0000acz0am77w682',
   'James', 'Thompson', 'jthompson@example.com', '(602) 555-0303',
   '1244 W Camelback Rd', 'Phoenix', 'AZ', '85015',
   NOW() - interval '2 days', NOW(), false)
ON CONFLICT (id) DO NOTHING;

-- 0b) CREATE PROPERTY for the claim (required FK)
INSERT INTO properties (
  id, "orgId", "contactId", name, "propertyType",
  street, city, state, "zipCode",
  "yearBuilt", "squareFootage", "roofType", "roofAge",
  carrier, "policyNumber",
  "createdAt", "updatedAt", "isDemo"
) VALUES (
  'demo-prop-martinez-2026',
  'cmhe0kl1j0000acz0am77w682',
  'demo-contact-martinez-2026',
  'Martinez Residence',
  'residential',
  '4521 E Thunderbird Rd',
  'Phoenix', 'AZ', '85032',
  2004, 2850, 'Asphalt Shingle', 18,
  'State Farm', 'SF-2026-AZ-44821',
  NOW() - interval '5 days', NOW(), false
)
ON CONFLICT (id) DO NOTHING;

-- 1) DEMO CLAIM - Realistic wind/hail claim with value
INSERT INTO claims (
  id, "orgId", "propertyId", "claimNumber", title, description, "damageType", "dateOfLoss",
  carrier, "adjusterName", "adjusterPhone", "adjusterEmail",
  status, priority, "estimatedValue", "approvedValue", "deductible",
  "assignedTo", "isDemo", insured_name, policy_number,
  "createdAt", "updatedAt"
) VALUES (
  'demo-claim-martinez-wind',
  'cmhe0kl1j0000acz0am77w682',
  'demo-prop-martinez-2026',
  'CLM-2026-0042',
  'Martinez Residence - Wind & Hail Damage Reroof',
  'Full reroof needed after severe wind and hail event on 2/10/2026. Shingles lifted, decking exposed in 3 areas. Gutters damaged. Insurance adjuster approved full replacement.',
  'WIND_HAIL',
  '2026-02-10',
  'State Farm',
  'Michael Roberts',
  '(480) 555-0142',
  'mroberts@statefarm.example.com',
  'approved',
  'HIGH',
  3250000,
  2850000,
  100000,
  '177cae4b-7e43-4fcb-bf1f-8d32f1a33986',
  false,
  'Carlos Martinez',
  'SF-2026-AZ-44821',
  NOW() - interval '5 days',
  NOW() - interval '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- 2) DEMO RETAIL JOB - Out of pocket roof repair
INSERT INTO leads (
  id, "orgId", "contactId", title, description, source, value,
  probability, stage, temperature, "assignedTo", "createdBy",
  "jobCategory", "jobType", "workType", urgency, budget,
  "isDemo", "createdAt", "updatedAt"
) VALUES (
  'demo-retail-wilson-repair',
  'cmhe0kl1j0000acz0am77w682',
  'demo-contact-wilson-2026',
  'Wilson Family - Out of Pocket Roof Repair',
  'Homeowner requesting out-of-pocket flat roof repair. 12x16 section with ponding issues. Customer prefers TPO membrane. Budget approved, ready to schedule.',
  'referral',
  1450000,
  85,
  'won',
  'hot',
  NULL,
  NULL,
  'out_of_pocket',
  'repair',
  'roof_repair',
  'medium',
  1500000,
  false,
  NOW() - interval '3 days',
  NOW() - interval '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- 3) DEMO LEAD - Hot prospect door knock
INSERT INTO leads (
  id, "orgId", "contactId", title, description, source, value,
  probability, stage, temperature, "assignedTo", "createdBy",
  "jobCategory", urgency, "warmthScore",
  "isDemo", "createdAt", "updatedAt"
) VALUES (
  'demo-lead-thompson-doorknock',
  'cmhe0kl1j0000acz0am77w682',
  'demo-contact-thompson-2026',
  'Thompson Residence - Storm Damage Assessment',
  'Door knock lead after Feb 2026 storm. Visible missing shingles and dented gutters. Homeowner interested in free inspection. Scheduled for this week.',
  'door_knock',
  2200000,
  70,
  'qualified',
  'warm',
  NULL,
  NULL,
  'claim',
  'high',
  75,
  false,
  NOW() - interval '2 days',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4) Update branding for the org so PDF branding is ready
UPDATE org_branding SET
  "companyName" = 'ClearSkai Technologies, LLC',
  phone = '(480) 555-0199',
  email = 'buildwithdamienray@gmail.com',
  website = 'https://skaiscrape.com',
  license = 'ROC-123456',
  "colorPrimary" = '#117CFF',
  "colorAccent" = '#FFC838',
  "updatedAt" = NOW()
WHERE "orgId" = 'cmhe0kl1j0000acz0am77w682';

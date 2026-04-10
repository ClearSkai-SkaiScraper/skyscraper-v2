-- Seed a retail job for Jane Smith
-- Org: cmhe0kl1j0000acz0am77w682
-- Run: psql "$DATABASE_URL" -f ./db/seed-retail-jane-smith.sql

-- 1. Ensure contact exists
INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES (
  'demo-c-jane-smith-retail',
  'cmhe0kl1j0000acz0am77w682',
  'Jane', 'Smith',
  'jane.smith@demo.test',
  '555-202-3344',
  '1045 Willow Creek Dr',
  'Prescott', 'AZ', '86301',
  NOW(), NOW(),
  'demo-jane-smith'
)
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Jane', "lastName" = 'Smith', "updatedAt" = NOW();

-- 2. Ensure property exists
INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES (
  'demo-p-jane-smith-retail',
  'cmhe0kl1j0000acz0am77w682',
  'demo-c-jane-smith-retail',
  '1045 Willow Creek Dr',
  'residential',
  '1045 Willow Creek Dr',
  'Prescott', 'AZ', '86301',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET name = '1045 Willow Creek Dr', "updatedAt" = NOW();

-- 3. Insert retail lead (jobCategory = 'retail')
INSERT INTO app.leads (
  id, "orgId", "contactId", title, description, stage, source, value,
  "jobCategory", "jobType", "workType", urgency,
  "createdAt", "updatedAt", "isDemo"
)
VALUES (
  'demo-lead-retail-jane-smith',
  'cmhe0kl1j0000acz0am77w682',
  'demo-c-jane-smith-retail',
  'Jane Smith — Kitchen Remodel',
  'Full kitchen renovation including cabinet refacing, countertop replacement (quartz), backsplash tile, and under-cabinet lighting. Homeowner-funded retail project.',
  'qualified',
  'referral',
  1850000,            -- $18,500.00 in cents
  'retail',           -- ← this is what makes it a retail job
  'remodel',
  'kitchen_remodel',
  'normal',
  NOW() - INTERVAL '7 days',
  NOW(),
  true
)
ON CONFLICT (id) DO UPDATE SET
  title = 'Jane Smith — Kitchen Remodel',
  "jobCategory" = 'retail',
  "updatedAt" = NOW();

-- 4. Also insert a second retail lead (general trade work)
INSERT INTO app.leads (
  id, "orgId", "contactId", title, description, stage, source, value,
  "jobCategory", "jobType", "workType", urgency,
  "createdAt", "updatedAt", "isDemo"
)
VALUES (
  'demo-lead-general-jane-smith',
  'cmhe0kl1j0000acz0am77w682',
  'demo-c-jane-smith-retail',
  'Jane Smith — Exterior Paint',
  'Complete exterior repaint, 2-story home, prep & prime, 2 coats Sherwin-Williams Duration. Homeowner paying out of pocket.',
  'new',
  'website',
  650000,             -- $6,500.00 in cents
  'general',          -- general category also shows in pipeline
  'paint',
  'exterior_paint',
  'low',
  NOW() - INTERVAL '3 days',
  NOW(),
  true
)
ON CONFLICT (id) DO UPDATE SET
  title = 'Jane Smith — Exterior Paint',
  "jobCategory" = 'general',
  "updatedAt" = NOW();

-- Verify
SELECT '✅ Retail jobs seeded for Jane Smith' AS status;
SELECT id, title, "jobCategory", stage, value FROM app.leads
WHERE "orgId" = 'cmhe0kl1j0000acz0am77w682' AND "jobCategory" IN ('retail', 'general')
ORDER BY "createdAt" DESC;

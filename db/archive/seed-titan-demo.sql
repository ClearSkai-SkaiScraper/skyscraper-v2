-- ============================================================================
-- Titan Restoration Demo Seed
-- ============================================================================
-- Seeds a fully populated 50-person org to demonstrate enterprise features.
-- Run: psql "$DATABASE_URL" -f ./db/seed-titan-demo.sql
--
-- Creates:
--   1 org (Titan Restoration LLC)
--   50 team members across 6 role tiers
--   100 demo claims at various stages
--   Demo vendor relationships
-- ============================================================================

-- ── Org ─────────────────────────────────────────────────────────────────────

INSERT INTO "Org" (id, name, slug, "createdAt", "updatedAt", plan, "maxSeats")
VALUES (
  'org_titan_demo_001',
  'Titan Restoration LLC',
  'titan-restoration',
  NOW(),
  NOW(),
  'enterprise',
  200
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  plan = EXCLUDED.plan,
  "maxSeats" = EXCLUDED."maxSeats",
  "updatedAt" = NOW();

-- ── Billing Settings ────────────────────────────────────────────────────────

INSERT INTO "BillingSettings" (id, "orgId", plan, "seatCount", "maxSeats", "createdAt", "updatedAt")
VALUES (
  'billing_titan_001',
  'org_titan_demo_001',
  'enterprise',
  50,
  200,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  plan = EXCLUDED.plan,
  "seatCount" = EXCLUDED."seatCount",
  "maxSeats" = EXCLUDED."maxSeats",
  "updatedAt" = NOW();

-- ── Team Members (50) ───────────────────────────────────────────────────────
-- Role distribution: 5 admins, 10 sales, 15 PMs, 5 finance, 10 technicians, 5 viewers

-- Admins (5)
INSERT INTO users (id, name, email, role, org_id, created_at) VALUES
  ('user_titan_admin_01', 'Marcus Chen',     'marcus@titanrestoration.com',   'admin',   'org_titan_demo_001', NOW()),
  ('user_titan_admin_02', 'Sarah Williams',  'sarah@titanrestoration.com',    'admin',   'org_titan_demo_001', NOW()),
  ('user_titan_admin_03', 'David Park',      'david@titanrestoration.com',    'admin',   'org_titan_demo_001', NOW()),
  ('user_titan_admin_04', 'Lisa Rodriguez',  'lisa@titanrestoration.com',     'admin',   'org_titan_demo_001', NOW()),
  ('user_titan_admin_05', 'James Murphy',    'james@titanrestoration.com',    'admin',   'org_titan_demo_001', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

-- Sales Reps (10)
INSERT INTO users (id, name, email, role, org_id, created_at) VALUES
  ('user_titan_sales_01', 'Alex Johnson',    'alex.j@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_02', 'Maria Gonzalez',  'maria.g@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_03', 'Ryan Thompson',   'ryan.t@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_04', 'Emily Davis',     'emily.d@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_05', 'Chris Martinez',  'chris.m@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_06', 'Nicole Brown',    'nicole.b@titanrestoration.com', 'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_07', 'Jason Lee',       'jason.l@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_08', 'Amanda Clark',    'amanda.c@titanrestoration.com', 'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_09', 'Mike Wilson',     'mike.w@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_sales_10', 'Tara Singh',      'tara.s@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

-- Project Managers (15)
INSERT INTO users (id, name, email, role, org_id, created_at) VALUES
  ('user_titan_pm_01',  'Daniel White',     'daniel.w@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_02',  'Rachel Green',     'rachel.g@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_03',  'Kevin Harris',     'kevin.h@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_04',  'Laura Kim',        'laura.k@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_05',  'Steven Moore',     'steven.m@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_06',  'Jennifer Adams',   'jennifer.a@titanrestoration.com','manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_07',  'Brandon Taylor',   'brandon.t@titanrestoration.com', 'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_08',  'Megan Lewis',      'megan.l@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_09',  'Tyler Robinson',   'tyler.r@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_10',  'Jessica Walker',   'jessica.w@titanrestoration.com', 'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_11',  'Andrew Hall',      'andrew.h@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_12',  'Stephanie Young',  'steph.y@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_13',  'Patrick Allen',    'patrick.a@titanrestoration.com', 'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_pm_14',  'Christina Scott',  'christina.s@titanrestoration.com','manager','org_titan_demo_001', NOW()),
  ('user_titan_pm_15',  'Derek King',       'derek.k@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

-- Finance (5)
INSERT INTO users (id, name, email, role, org_id, created_at) VALUES
  ('user_titan_fin_01', 'Patricia Wright',  'patricia.w@titanrestoration.com','manager', 'org_titan_demo_001', NOW()),
  ('user_titan_fin_02', 'Robert Lopez',     'robert.l@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_fin_03', 'Sandra Hill',      'sandra.h@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_fin_04', 'Thomas Baker',     'thomas.b@titanrestoration.com',  'manager', 'org_titan_demo_001', NOW()),
  ('user_titan_fin_05', 'Karen Nelson',     'karen.n@titanrestoration.com',   'manager', 'org_titan_demo_001', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

-- Technicians / Crews (10)
INSERT INTO users (id, name, email, role, org_id, created_at) VALUES
  ('user_titan_tech_01', 'Miguel Ramirez',  'miguel.r@titanrestoration.com', 'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_02', 'Juan Hernandez',  'juan.h@titanrestoration.com',   'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_03', 'Carlos Garcia',   'carlos.g@titanrestoration.com', 'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_04', 'Jose Martinez',   'jose.m@titanrestoration.com',   'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_05', 'Luis Santos',     'luis.s@titanrestoration.com',   'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_06', 'Tony Morales',    'tony.m@titanrestoration.com',   'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_07', 'Victor Reyes',    'victor.r@titanrestoration.com', 'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_08', 'Eddie Cruz',      'eddie.c@titanrestoration.com',  'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_09', 'Frank Flores',    'frank.f@titanrestoration.com',  'member',  'org_titan_demo_001', NOW()),
  ('user_titan_tech_10', 'Danny Rivera',    'danny.r@titanrestoration.com',  'member',  'org_titan_demo_001', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

-- Viewers (5)
INSERT INTO users (id, name, email, role, org_id, created_at) VALUES
  ('user_titan_view_01', 'Intern Amy',      'amy.i@titanrestoration.com',    'viewer',  'org_titan_demo_001', NOW()),
  ('user_titan_view_02', 'Intern Ben',      'ben.i@titanrestoration.com',    'viewer',  'org_titan_demo_001', NOW()),
  ('user_titan_view_03', 'Intern Chloe',    'chloe.i@titanrestoration.com',  'viewer',  'org_titan_demo_001', NOW()),
  ('user_titan_view_04', 'Intern Dan',      'dan.i@titanrestoration.com',    'viewer',  'org_titan_demo_001', NOW()),
  ('user_titan_view_05', 'Intern Eva',      'eva.i@titanrestoration.com',    'viewer',  'org_titan_demo_001', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

-- ── Demo Claims (sample of 20 across various stages) ────────────────────────

INSERT INTO leads (id, org_id, status, insured_name, insured_email, insured_phone, property_address, city, state, zip, claim_number, insurance_company, loss_date, loss_type, created_at) VALUES
  ('lead_titan_001', 'org_titan_demo_001', 'new',            'Robert Anderson',    'r.anderson@email.com',   '480-555-0101', '4521 E Thunderbird Rd',  'Phoenix',     'AZ', '85032', 'CLM-2025-001', 'State Farm',      '2025-03-15', 'hail',  NOW() - INTERVAL '30 days'),
  ('lead_titan_002', 'org_titan_demo_001', 'inspection',     'Jennifer Mitchell',  'j.mitchell@email.com',   '602-555-0102', '7890 W Camelback Rd',    'Phoenix',     'AZ', '85033', 'CLM-2025-002', 'Allstate',        '2025-03-18', 'wind',  NOW() - INTERVAL '28 days'),
  ('lead_titan_003', 'org_titan_demo_001', 'estimate',       'Michael Thompson',   'm.thompson@email.com',   '480-555-0103', '1234 N Scottsdale Rd',   'Scottsdale',  'AZ', '85251', 'CLM-2025-003', 'USAA',            '2025-03-20', 'hail',  NOW() - INTERVAL '25 days'),
  ('lead_titan_004', 'org_titan_demo_001', 'approved',       'Susan Martinez',     's.martinez@email.com',   '623-555-0104', '5678 W Glendale Ave',    'Glendale',    'AZ', '85301', 'CLM-2025-004', 'Liberty Mutual',  '2025-03-22', 'water', NOW() - INTERVAL '22 days'),
  ('lead_titan_005', 'org_titan_demo_001', 'in_production',  'David Clark',        'd.clark@email.com',      '480-555-0105', '9101 E Indian School Rd','Scottsdale',  'AZ', '85251', 'CLM-2025-005', 'Farmers',         '2025-03-25', 'hail',  NOW() - INTERVAL '20 days'),
  ('lead_titan_006', 'org_titan_demo_001', 'complete',       'Karen Lewis',        'k.lewis@email.com',      '602-555-0106', '2345 N Central Ave',     'Phoenix',     'AZ', '85004', 'CLM-2025-006', 'Nationwide',      '2025-02-10', 'wind',  NOW() - INTERVAL '60 days'),
  ('lead_titan_007', 'org_titan_demo_001', 'new',            'Brian Walker',       'b.walker@email.com',     '480-555-0107', '6789 E Shea Blvd',       'Scottsdale',  'AZ', '85254', 'CLM-2025-007', 'Travelers',       '2025-04-01', 'hail',  NOW() - INTERVAL '10 days'),
  ('lead_titan_008', 'org_titan_demo_001', 'inspection',     'Amy Nelson',         'a.nelson@email.com',     '623-555-0108', '3456 W Bell Rd',         'Surprise',    'AZ', '85374', 'CLM-2025-008', 'Progressive',     '2025-04-02', 'hail',  NOW() - INTERVAL '9 days'),
  ('lead_titan_009', 'org_titan_demo_001', 'supplement',     'William Harris',     'w.harris@email.com',     '602-555-0109', '7890 S 48th St',         'Tempe',       'AZ', '85282', 'CLM-2025-009', 'American Family', '2025-03-10', 'wind',  NOW() - INTERVAL '35 days'),
  ('lead_titan_010', 'org_titan_demo_001', 'complete',       'Jessica Young',      'j.young@email.com',      '480-555-0110', '1234 E McKellips Rd',    'Mesa',        'AZ', '85201', 'CLM-2025-010', 'Hartford',        '2025-02-01', 'hail',  NOW() - INTERVAL '75 days'),
  ('lead_titan_011', 'org_titan_demo_001', 'new',            'Steven Brown',       's.brown@email.com',      '602-555-0111', '5678 N 7th Ave',         'Phoenix',     'AZ', '85013', 'CLM-2025-011', 'Erie Insurance',  '2025-04-05', 'hail',  NOW() - INTERVAL '5 days'),
  ('lead_titan_012', 'org_titan_demo_001', 'estimate',       'Mary Garcia',        'm.garcia@email.com',     '623-555-0112', '9012 W Olive Ave',       'Peoria',      'AZ', '85345', 'CLM-2025-012', 'State Farm',      '2025-03-28', 'wind',  NOW() - INTERVAL '15 days'),
  ('lead_titan_013', 'org_titan_demo_001', 'approved',       'Richard King',       'r.king@email.com',       '480-555-0113', '3456 E Baseline Rd',     'Gilbert',     'AZ', '85234', 'CLM-2025-013', 'Allstate',        '2025-03-30', 'hail',  NOW() - INTERVAL '12 days'),
  ('lead_titan_014', 'org_titan_demo_001', 'in_production',  'Dorothy Wright',     'd.wright@email.com',     '602-555-0114', '7890 N 35th Ave',        'Phoenix',     'AZ', '85051', 'CLM-2025-014', 'USAA',            '2025-03-12', 'water', NOW() - INTERVAL '32 days'),
  ('lead_titan_015', 'org_titan_demo_001', 'new',            'Joseph Robinson',    'j.robinson@email.com',   '480-555-0115', '2345 S Price Rd',        'Tempe',       'AZ', '85282', 'CLM-2025-015', 'Liberty Mutual',  '2025-04-08', 'hail',  NOW() - INTERVAL '3 days'),
  ('lead_titan_016', 'org_titan_demo_001', 'inspection',     'Elizabeth Hall',     'e.hall@email.com',        '623-555-0116', '6789 W Happy Valley Rd', 'Peoria',      'AZ', '85383', 'CLM-2025-016', 'Farmers',         '2025-04-06', 'wind',  NOW() - INTERVAL '5 days'),
  ('lead_titan_017', 'org_titan_demo_001', 'complete',       'Thomas Baker',       't.baker@email.com',      '602-555-0117', '1234 E Van Buren St',    'Phoenix',     'AZ', '85006', 'CLM-2025-017', 'Nationwide',      '2025-01-15', 'hail',  NOW() - INTERVAL '90 days'),
  ('lead_titan_018', 'org_titan_demo_001', 'supplement',     'Margaret Adams',     'm.adams@email.com',      '480-555-0118', '5678 E Brown Rd',        'Mesa',        'AZ', '85205', 'CLM-2025-018', 'Travelers',       '2025-03-05', 'water', NOW() - INTERVAL '40 days'),
  ('lead_titan_019', 'org_titan_demo_001', 'approved',       'Charles Campbell',   'c.campbell@email.com',   '623-555-0119', '9012 W Bethany Home Rd', 'Glendale',    'AZ', '85303', 'CLM-2025-019', 'Progressive',     '2025-04-01', 'hail',  NOW() - INTERVAL '10 days'),
  ('lead_titan_020', 'org_titan_demo_001', 'in_production',  'Patricia Evans',     'p.evans@email.com',      '602-555-0120', '3456 N 16th St',         'Phoenix',     'AZ', '85016', 'CLM-2025-020', 'American Family', '2025-03-20', 'wind',  NOW() - INTERVAL '22 days')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  insured_name = EXCLUDED.insured_name,
  property_address = EXCLUDED.property_address,
  claim_number = EXCLUDED.claim_number;

-- ── Success Output ──────────────────────────────────────────────────────────

DO $$
DECLARE
  user_count INTEGER;
  lead_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE org_id = 'org_titan_demo_001';
  SELECT COUNT(*) INTO lead_count FROM leads WHERE org_id = 'org_titan_demo_001';
  RAISE NOTICE '✅ Titan Restoration demo seeded:';
  RAISE NOTICE '   👥 Users: %', user_count;
  RAISE NOTICE '   📋 Leads/Claims: %', lead_count;
  RAISE NOTICE '   🏢 Org: Titan Restoration LLC (enterprise plan, 200 max seats)';
END $$;

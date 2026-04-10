SET search_path TO app;
BEGIN;

-- Create demo contacts (slug must be unique)
INSERT INTO contacts (id, "orgId", "firstName", "lastName", email, phone, slug, "createdAt", "updatedAt")
VALUES 
  ('demo-contact-maria', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'Maria', 'Garcia', 'maria.garcia@example.com', '602-555-0101', 'maria-garcia-demo', NOW(), NOW()),
  ('demo-contact-james', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'James', 'Wilson', 'james.wilson@example.com', '480-555-0202', 'james-wilson-demo', NOW(), NOW()),
  ('demo-contact-sarah', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'Sarah', 'Johnson', 'sarah.johnson@example.com', '623-555-0303', 'sarah-johnson-demo', NOW(), NOW()),
  ('demo-contact-mike', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'Mike', 'Thompson', 'mike.thompson@example.com', '928-555-0404', 'mike-thompson-demo', NOW(), NOW()),
  ('demo-contact-lisa', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'Lisa', 'Anderson', 'lisa.anderson@example.com', '520-555-0505', 'lisa-anderson-demo', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo properties
INSERT INTO properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "yearBuilt", "squareFootage", "roofType", "roofAge", "createdAt", "updatedAt")
VALUES 
  ('demo-prop-garcia', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-maria', 'Garcia Residence', 'residential', '2847 E Camelback Rd', 'Phoenix', 'AZ', '85016', 2005, 2400, 'Tile', 8, NOW(), NOW()),
  ('demo-prop-wilson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-james', 'Wilson Home', 'residential', '1523 N Scottsdale Rd', 'Scottsdale', 'AZ', '85257', 1998, 3200, 'Shingle', 12, NOW(), NOW()),
  ('demo-prop-johnson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-sarah', 'Johnson Property', 'residential', '4102 W Thunderbird Rd', 'Glendale', 'AZ', '85306', 2010, 1800, 'Tile', 5, NOW(), NOW()),
  ('demo-prop-thompson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-mike', 'Thompson Ranch', 'residential', '8901 N Pima Rd', 'Prescott', 'AZ', '86301', 1992, 4500, 'Metal', 15, NOW(), NOW()),
  ('demo-prop-anderson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-lisa', 'Anderson Office', 'commercial', '6200 S Rural Rd', 'Tempe', 'AZ', '85283', 2015, 5000, 'Flat/TPO', 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo claims (mix of statuses for dashboard widgets)
INSERT INTO claims (id, "orgId", "propertyId", "claimNumber", title, description, "damageType", "dateOfLoss", carrier, "adjusterName", status, priority, "estimatedValue", "deductible", "isDemo", "createdAt", "updatedAt")
VALUES
  ('demo-claim-garcia-hail', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-garcia', 'CLM-2025-001', 'Garcia Hail Damage', 'Significant hail damage to tile roof and gutters from March storm', 'hail', '2025-03-15', 'State Farm', 'Tom Richards', 'in_progress', 'high', 18500, 2500, true, NOW() - interval '30 days', NOW()),
  ('demo-claim-wilson-wind', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-wilson', 'CLM-2025-002', 'Wilson Wind Damage', 'Wind damage to shingles and fascia boards on north-facing roof', 'wind', '2025-02-28', 'Allstate', 'Jennifer Lee', 'in_progress', 'medium', 12000, 1500, true, NOW() - interval '45 days', NOW()),
  ('demo-claim-johnson-water', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-johnson', 'CLM-2025-003', 'Johnson Water Intrusion', 'Water damage from failed roof flashing around chimney', 'water', '2025-01-20', 'USAA', 'Mike Chen', 'pending', 'high', 22000, 3000, true, NOW() - interval '60 days', NOW()),
  ('demo-claim-thompson-fire', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-thompson', 'CLM-2025-004', 'Thompson Wildfire Smoke', 'Smoke and heat damage from nearby wildfire', 'fire', '2025-04-02', 'Farmers', 'Dave Brown', 'pending', 'urgent', 45000, 5000, true, NOW() - interval '15 days', NOW()),
  ('demo-claim-anderson-storm', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-anderson', 'CLM-2025-005', 'Anderson Commercial Storm', 'Monsoon damage to commercial flat roof and HVAC units', 'storm', '2025-03-28', 'Liberty Mutual', 'Sarah White', 'approved', 'medium', 35000, 4000, true, NOW() - interval '20 days', NOW()),
  ('demo-claim-garcia-tree', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-garcia', 'CLM-2025-006', 'Garcia Tree Impact', 'Large tree fell on carport and damaged vehicle and structure', 'impact', '2025-04-10', 'State Farm', 'Tom Richards', 'approved', 'high', 28000, 2500, true, NOW() - interval '7 days', NOW()),
  ('demo-claim-wilson-leak', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-wilson', 'CLM-2025-007', 'Wilson Interior Leak', 'Ongoing interior water damage from compromised roof valley', 'water', '2025-03-05', 'Allstate', 'Jennifer Lee', 'new', 'low', 8500, 1500, true, NOW() - interval '40 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo leads (mix of stages and temps)
INSERT INTO leads (id, "orgId", "contactId", title, description, source, value, probability, stage, temperature, "isDemo", "createdAt", "updatedAt")
VALUES
  ('demo-lead-garcia', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-maria', 'Garcia - Full Roof Replacement', 'Interested in full tile roof replacement after hail claim', 'referral', 25000, 80, 'qualified', 'hot', true, NOW() - interval '25 days', NOW()),
  ('demo-lead-wilson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-james', 'Wilson - Shingle Repair', 'Needs shingle repair and gutter replacement', 'website', 15000, 60, 'proposal', 'warm', true, NOW() - interval '35 days', NOW()),
  ('demo-lead-johnson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-sarah', 'Johnson - Chimney Flashing', 'Chimney flashing and waterproofing job', 'door_knock', 8000, 40, 'new', 'cold', true, NOW() - interval '50 days', NOW()),
  ('demo-lead-thompson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-mike', 'Thompson - Smoke Remediation', 'Full smoke damage restoration project', 'insurance', 55000, 70, 'qualified', 'hot', true, NOW() - interval '10 days', NOW()),
  ('demo-lead-anderson', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-lisa', 'Anderson - Commercial Roof', 'Commercial flat roof repair and HVAC pad restoration', 'canvass', 40000, 50, 'negotiation', 'warm', true, NOW() - interval '18 days', NOW()),
  ('demo-lead-extra1', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-maria', 'Garcia - Gutter System', 'Complete gutter system upgrade and leaf guard install', 'referral', 6500, 90, 'won', 'hot', true, NOW() - interval '5 days', NOW()),
  ('demo-lead-extra2', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-contact-james', 'Wilson - Interior Paint', 'Interior paint and drywall repair after water damage', 'website', 4500, 30, 'lost', 'cold', true, NOW() - interval '60 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo jobs
INSERT INTO jobs (id, "orgId", "propertyId", "claimId", title, description, "jobType", "scheduledStart", "scheduledEnd", status, priority, "crewSize", "estimatedCost", "createdAt", "updatedAt")
VALUES
  ('demo-job-garcia-roof', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-garcia', 'demo-claim-garcia-hail', 'Garcia Tile Roof Repair', 'Replace damaged tiles and repair underlayment', 'roof_repair', NOW() + interval '3 days', NOW() + interval '5 days', 'scheduled', 'high', 4, 18500, NOW() - interval '5 days', NOW()),
  ('demo-job-wilson-shingle', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-wilson', 'demo-claim-wilson-wind', 'Wilson Shingle Replacement', 'Strip and replace wind-damaged shingles on north face', 'roof_repair', NOW() + interval '7 days', NOW() + interval '9 days', 'scheduled', 'medium', 3, 12000, NOW() - interval '3 days', NOW()),
  ('demo-job-johnson-flash', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-johnson', 'demo-claim-johnson-water', 'Johnson Chimney Reflash', 'Remove old flashing, install new step and counter flashing', 'flashing', NOW() - interval '10 days', NOW() - interval '8 days', 'in_progress', 'high', 2, 8000, NOW() - interval '15 days', NOW()),
  ('demo-job-thompson-restore', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-thompson', 'demo-claim-thompson-fire', 'Thompson Smoke Restoration', 'Full exterior and interior smoke remediation', 'restoration', NOW() + interval '14 days', NOW() + interval '21 days', 'pending', 'urgent', 6, 45000, NOW() - interval '2 days', NOW()),
  ('demo-job-anderson-tpo', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-anderson', 'demo-claim-anderson-storm', 'Anderson TPO Repair', 'Repair TPO membrane and replace damaged HVAC pads', 'commercial_roof', NOW() - interval '5 days', NOW() - interval '2 days', 'completed', 'medium', 5, 35000, NOW() - interval '25 days', NOW()),
  ('demo-job-garcia-carport', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-garcia', 'demo-claim-garcia-tree', 'Garcia Carport Rebuild', 'Rebuild carport structure after tree impact', 'structural', NOW() + interval '10 days', NOW() + interval '15 days', 'pending', 'high', 4, 28000, NOW() - interval '1 day', NOW()),
  ('demo-job-gutter', '8c173d40-b926-48a6-ab5b-f7097e1b8c15', 'demo-prop-garcia', NULL, 'Garcia Gutter Install', 'Retail gutter system with leaf guards', 'gutters', NOW() + interval '5 days', NOW() + interval '6 days', 'scheduled', 'low', 2, 6500, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

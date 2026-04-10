-- Seed demo data for current org: 0f3dfe0b-43be-4478-add4-b2ac50803673
-- Run with: psql "$DATABASE_URL" -f db/seed-current-org-demo.sql

-- Insert demo contacts with Bob Smith name (using correct column names)
INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES 
  ('demo-contact-bob-smith-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'Bob', 'Smith', 'bob.smith@demo.test', '555-111-2222', '123 Main St', 'Prescott', 'AZ', '86301', NOW(), NOW(), 'demo-bob-smith-001')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Bob', "lastName" = 'Smith', "updatedAt" = NOW();

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES 
  ('demo-contact-jane-doe-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'Jane', 'Doe', 'jane.doe@demo.test', '555-333-4444', '456 Oak Ave', 'Prescott Valley', 'AZ', '86314', NOW(), NOW(), 'demo-jane-doe-001')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Jane', "lastName" = 'Doe', "updatedAt" = NOW();

INSERT INTO app.contacts (id, "orgId", "firstName", "lastName", email, phone, street, city, state, "zipCode", "createdAt", "updatedAt", slug)
VALUES 
  ('demo-contact-mike-johnson-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'Mike', 'Johnson', 'mike.j@demo.test', '555-555-6666', '789 Pine Rd', 'Flagstaff', 'AZ', '86001', NOW(), NOW(), 'demo-mike-johnson-001')
ON CONFLICT (id) DO UPDATE SET "firstName" = 'Mike', "lastName" = 'Johnson', "updatedAt" = NOW();

-- Insert demo properties linked to contacts
INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-property-bob-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-bob-smith-001', '123 Main St', 'residential', '123 Main St', 'Prescott', 'AZ', '86301', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '123 Main St', "updatedAt" = NOW();

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-property-jane-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-jane-doe-001', '456 Oak Ave', 'residential', '456 Oak Ave', 'Prescott Valley', 'AZ', '86314', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '456 Oak Ave', "updatedAt" = NOW();

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES
  ('demo-property-mike-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-mike-johnson-001', '789 Pine Rd', 'residential', '789 Pine Rd', 'Flagstaff', 'AZ', '86001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = '789 Pine Rd', "updatedAt" = NOW();

-- Insert demo claims for the current org (with propertyId)
INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", "createdAt", "updatedAt")
VALUES 
  ('demo-claim-current-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-property-bob-001', 'DEMO-CLM-001', 'Bob Smith Hail Damage - Insurance Claim', 'new', 'Hail', NOW() - INTERVAL '30 days', 'State Farm', 1850000, 1650000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Bob Smith Hail Damage - Insurance Claim', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", "createdAt", "updatedAt")
VALUES 
  ('demo-claim-current-002', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-property-jane-001', 'DEMO-CLM-002', 'Jane Doe Storm Damage Roof', 'active', 'Wind', NOW() - INTERVAL '15 days', 'Allstate', 2250000, 2100000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Jane Doe Storm Damage Roof', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", "createdAt", "updatedAt")
VALUES 
  ('demo-claim-current-003', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-property-mike-001', 'DEMO-CLM-003', 'Mike Johnson Water Damage', 'approved', 'Water', NOW() - INTERVAL '45 days', 'USAA', 890000, 800000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Mike Johnson Water Damage', "updatedAt" = NOW();

-- Insert demo leads/jobs for the current org (for Job Center)
INSERT INTO app.leads (id, "orgId", "contactId", title, description, stage, source, value, "jobCategory", "createdAt", "updatedAt")
VALUES 
  ('demo-lead-current-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-bob-smith-001', 'Bob Smith - Roof Repair Job', 'Hail damage roof repair approved by insurance', 'QUALIFIED', 'demo', 1850000, 'repair', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Bob Smith - Roof Repair Job', "updatedAt" = NOW();

INSERT INTO app.leads (id, "orgId", "contactId", title, description, stage, source, value, "jobCategory", "createdAt", "updatedAt")
VALUES 
  ('demo-lead-current-002', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-jane-doe-001', 'Jane Doe - Bathroom Remodel', 'Full bathroom renovation - Out of Pocket', 'PROPOSAL', 'demo', 2200000, 'out_of_pocket', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Jane Doe - Bathroom Remodel', "updatedAt" = NOW();

INSERT INTO app.leads (id, "orgId", "contactId", title, description, stage, source, value, "jobCategory", "createdAt", "updatedAt")
VALUES 
  ('demo-lead-current-003', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-mike-johnson-001', 'Mike Johnson - Insurance Claim Roof', 'Storm damage claim in progress', 'NEW', 'demo', 890000, 'claim', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Mike Johnson - Insurance Claim Roof', "updatedAt" = NOW();

-- Link claims to leads where appropriate
UPDATE app.leads SET "claimId" = 'demo-claim-current-001' WHERE id = 'demo-lead-current-001';
UPDATE app.leads SET "claimId" = 'demo-claim-current-003' WHERE id = 'demo-lead-current-003';

SELECT 'Demo data seeded successfully!' as result;
SELECT COUNT(*) as claims_count FROM app.claims WHERE "orgId" = '0f3dfe0b-43be-4478-add4-b2ac50803673';
SELECT COUNT(*) as leads_count FROM app.leads WHERE "orgId" = '0f3dfe0b-43be-4478-add4-b2ac50803673';
SELECT COUNT(*) as contacts_count FROM app.contacts WHERE "orgId" = '0f3dfe0b-43be-4478-add4-b2ac50803673';

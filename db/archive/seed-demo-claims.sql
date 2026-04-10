-- Seed demo properties and claims for current org
-- Run with: psql "$DATABASE_URL" -f ./db/seed-demo-claims.sql

-- Create demo properties first
INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES 
  ('demo-property-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-bob-smith-001', 'Bob Smith Residence', 'residential', '123 Main St', 'Prescott', 'AZ', '86301', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = 'Bob Smith Residence';

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES 
  ('demo-property-002', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-jane-doe-001', 'Jane Doe Home', 'residential', '456 Oak Ave', 'Prescott Valley', 'AZ', '86314', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = 'Jane Doe Home';

INSERT INTO app.properties (id, "orgId", "contactId", name, "propertyType", street, city, state, "zipCode", "createdAt", "updatedAt")
VALUES 
  ('demo-property-003', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-contact-mike-johnson-001', 'Mike Johnson Property', 'residential', '789 Pine Rd', 'Flagstaff', 'AZ', '86001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = 'Mike Johnson Property';

-- Create demo claims with propertyId
INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", "createdAt", "updatedAt")
VALUES 
  ('demo-claim-current-001', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-property-001', 'DEMO-CLM-001', 'Bob Smith Hail Damage - Insurance Claim', 'new', 'Hail', NOW() - INTERVAL '30 days', 'State Farm', 1850000, 1650000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Bob Smith Hail Damage - Insurance Claim', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", "createdAt", "updatedAt")
VALUES 
  ('demo-claim-current-002', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-property-002', 'DEMO-CLM-002', 'Jane Doe Storm Damage Roof', 'active', 'Wind', NOW() - INTERVAL '15 days', 'Allstate', 2250000, 2100000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Jane Doe Storm Damage Roof', "updatedAt" = NOW();

INSERT INTO app.claims (id, "orgId", "propertyId", "claimNumber", title, status, "damageType", "dateOfLoss", carrier, "estimatedValue", "approvedValue", "createdAt", "updatedAt")
VALUES 
  ('demo-claim-current-003', '0f3dfe0b-43be-4478-add4-b2ac50803673', 'demo-property-003', 'DEMO-CLM-003', 'Mike Johnson Water Damage', 'approved', 'Water', NOW() - INTERVAL '45 days', 'USAA', 890000, 800000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = 'Mike Johnson Water Damage', "updatedAt" = NOW();

-- Link leads to claims
UPDATE app.leads SET "claimId" = 'demo-claim-current-001' WHERE id = 'demo-lead-current-001';
UPDATE app.leads SET "claimId" = 'demo-claim-current-003' WHERE id = 'demo-lead-current-003';

-- Verify
SELECT 'DEMO DATA SEEDING COMPLETE' as status;
SELECT id, title, status, carrier FROM app.claims WHERE "orgId" = '0f3dfe0b-43be-4478-add4-b2ac50803673';

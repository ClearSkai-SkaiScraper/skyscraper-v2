-- Fix Demo Leads: Create exactly 3 demo leads
-- 1. John Smith - Insurance Claim
-- 2. Jane Smith - Out of Pocket  
-- 3. Bob Smith - Repair Lead

-- Insert John Smith lead (claim)
INSERT INTO leads (id, "orgId", "contactId", title, description, source, value, stage, "jobCategory", "createdAt", "updatedAt", "claimId")
VALUES (
  'demo-lead-john-smith',
  'cmhe0kl1j0000acz0am77w682',
  'demo-john-smith-cmhe0kl1j0000acz0am77w682',
  'John Smith - Hail Damage Claim',
  'Insurance claim for hail damage to roof',
  'Insurance',
  1850000,
  'qualified',
  'claim',
  NOW(),
  NOW(),
  'demo-claim-john-cmhe0kl1j0000acz0am77w682'
) ON CONFLICT (id) DO NOTHING;

-- Insert Bob Smith lead (repair)
INSERT INTO leads (id, "orgId", "contactId", title, description, source, value, stage, "jobCategory", "createdAt", "updatedAt")
VALUES (
  'demo-lead-bob-smith',
  'cmhe0kl1j0000acz0am77w682',
  'demo-contact-0-cmhe0kl1j0000acz0am77w682',
  'Bob Smith - Storm Damage Repair',
  'New lead for storm damage repair work',
  'Referral',
  1800000,
  'new',
  'repair',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

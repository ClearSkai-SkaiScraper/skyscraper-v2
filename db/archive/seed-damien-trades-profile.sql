-- Seed: Damien Willingham — ClearSkai Technologies founder trades profile
-- Run: psql "$DATABASE_URL" -f db/seed-damien-trades-profile.sql
-- Idempotent: uses ON CONFLICT DO UPDATE to safely re-run

SET search_path TO app;

-- Ensure TradesProfile exists for the primary account
INSERT INTO "TradesProfile" (
  id, "userId", "orgId", "companyName", "contactName", email,
  phone, address, city, state, zip,
  specialties, certifications, bio,
  "logoUrl", website, "yearsInBusiness", "crewSize",
  rating, "reviewCount", "projectCount",
  verified, active, "createdAt", "updatedAt"
) VALUES (
  'tp-damien-willingham-001',
  'user_35Lks8c1cQpyxGpsXEO2cmBZNvb',
  'cmhe0kl1j0000acz0am77w682',
  'ClearSkai Technologies, LLC',
  'Damien Willingham',
  'buildwithdamienray@gmail.com',
  NULL, NULL, 'Prescott', 'AZ', '86301',
  ARRAY['Roofing', 'General Contracting', 'Storm Damage'],
  ARRAY['Licensed Contractor'],
  'Founder of ClearSkai Technologies — AI-powered preloss inspection and claims platform for contractors and adjusters.',
  NULL,
  'https://www.skaiscrape.com',
  5, 3,
  5.0, 0, 0,
  true, true, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "companyName" = EXCLUDED."companyName",
  "contactName" = EXCLUDED."contactName",
  email         = EXCLUDED.email,
  active        = true,
  "updatedAt"   = NOW();

-- Verify
SELECT id, "userId", "companyName", "contactName", email, active
FROM "TradesProfile"
WHERE "userId" = 'user_35Lks8c1cQpyxGpsXEO2cmBZNvb';

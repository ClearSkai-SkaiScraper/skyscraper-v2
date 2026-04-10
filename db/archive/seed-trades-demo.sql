-- Seed demo data for Trades Network
-- Run with: psql $DATABASE_URL -f db/seed-trades-demo.sql

-- Create demo trades company members
INSERT INTO public."tradesCompanyMember" (id, "userId", "companyId", "firstName", "lastName", "tradeType", "jobTitle", "yearsExperience", status, "onboardingStep", email, "createdAt", "updatedAt")
VALUES 
-- (gen_random_uuid(), 'demo_user_1', '36a6ac3d-6199-4210-8ee1-fd7eeb80b8b8', 'John', 'Martinez', 'Roofing', 'Roofing Contractor', 15, 'active', 'complete', 'john@demo.com', now(), now()),
  (gen_random_uuid(), 'demo_user_2', '36a6ac3d-6199-4210-8ee1-fd7eeb80b8b8', 'Sarah', 'Thompson', 'Solar', 'Solar Installer', 8, 'active', 'complete', 'sarah@demo.com', now(), now()),
  (gen_random_uuid(), 'demo_user_3', '36a6ac3d-6199-4210-8ee1-fd7eeb80b8b8', 'Mike', 'Rodriguez', 'HVAC', 'HVAC Technician', 12, 'active', 'complete', 'mike@demo.com', now(), now())
ON CONFLICT DO NOTHING;

-- Verify
SELECT "firstName", "lastName", "tradeType" FROM public."tradesCompanyMember";

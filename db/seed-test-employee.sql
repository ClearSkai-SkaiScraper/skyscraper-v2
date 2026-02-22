-- ============================================================================
-- Seed: Add QA Test Account as ClearSKai Technologies Employee
-- ============================================================================
-- Run AFTER damien.willingham@outlook.com has signed in at least once via Clerk
-- so the users table has their Clerk user ID.
--
-- Execute: psql "$DATABASE_URL" -f db/seed-test-employee.sql
-- Idempotent: safe to re-run
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 0: Clean up demo/fake employees (no more demo data)
-- ============================================================================
-- Remove demo seed employees that were never real users
DELETE FROM "tradesCompanyMember"
WHERE "userId" IN ('demo_user_1', 'demo_user_2', 'demo_user_3');

-- ============================================================================
-- STEP 1: Find the test user's Clerk ID from the users table
-- ============================================================================
-- The user must have signed in at least once for this to work.
-- If no user found, the DO block will raise a notice and skip.
DO $$
DECLARE
  v_clerk_id TEXT;
  v_company_id UUID;
  v_owner_member_id UUID;
  v_existing_member_id UUID;
BEGIN
  -- Find test user by email
  SELECT "clerkUserId" INTO v_clerk_id
  FROM users
  WHERE email = 'damien.willingham@outlook.com'
  LIMIT 1;

  IF v_clerk_id IS NULL THEN
    RAISE NOTICE '⚠️  User damien.willingham@outlook.com not found in users table.';
    RAISE NOTICE '    Sign in at https://skaiscrape.com first, then re-run this script.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found test user: %', v_clerk_id;

  -- Find the ClearSKai Technologies company via the owner's member record
  SELECT "companyId", id INTO v_company_id, v_owner_member_id
  FROM "tradesCompanyMember"
  WHERE email = 'buildwithdamienray@gmail.com'
    AND "isOwner" = true
  LIMIT 1;

  -- Fallback: find by owner's known userId patterns
  IF v_company_id IS NULL THEN
    SELECT "companyId", id INTO v_company_id, v_owner_member_id
    FROM "tradesCompanyMember"
    WHERE "userId" LIKE 'user_35Lks8c%'
      AND "isOwner" = true
    LIMIT 1;
  END IF;

  -- Fallback: find by company name
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM "tradesCompany"
    WHERE name ILIKE '%ClearSkai%' OR name ILIKE '%ClearSKai%'
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '⚠️  ClearSKai Technologies company not found.';
    RAISE NOTICE '    Make sure the owner account has set up the company first.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found company: %', v_company_id;

  -- Check if test user already has a member record
  SELECT id INTO v_existing_member_id
  FROM "tradesCompanyMember"
  WHERE "userId" = v_clerk_id;

  IF v_existing_member_id IS NOT NULL THEN
    -- Update existing record to link to ClearSKai company as member (not owner)
    UPDATE "tradesCompanyMember"
    SET
      "companyId" = v_company_id,
      role = 'member',
      "isOwner" = false,
      "isAdmin" = false,
      "canEditCompany" = false,
      "isActive" = true,
      status = 'active',
      "onboardingStep" = 'complete',
      "firstName" = COALESCE("firstName", 'Damien'),
      "lastName" = COALESCE("lastName", 'Willingham'),
      email = 'damien.willingham@outlook.com',
      "tradeType" = COALESCE("tradeType", 'Smart Home & Technology'),
      "jobTitle" = COALESCE("jobTitle", 'Field Technician'),
      "yearsExperience" = COALESCE("yearsExperience", 3),
      bio = COALESCE(bio, 'Smart home installation technician specializing in home automation, security systems, and network infrastructure. ClearSkai Technologies team member.'),
      specialties = CASE WHEN specialties = '{}' THEN ARRAY['Smart Home Installation', 'Security Systems', 'Network Infrastructure']::text[] ELSE specialties END,
      certifications = CASE WHEN certifications = '{}' THEN ARRAY['Smart Home Certified', 'Network+']::text[] ELSE certifications END,
      city = COALESCE(city, 'Prescott'),
      state = COALESCE(state, 'AZ'),
      zip = COALESCE(zip, '86301'),
      "updatedAt" = NOW()
    WHERE id = v_existing_member_id;

    RAISE NOTICE '✅ Updated existing member record → linked to ClearSKai as member (not admin)';
  ELSE
    -- Create new member record as employee of ClearSKai
    INSERT INTO "tradesCompanyMember" (
      id, "userId", "companyId", role,
      "isOwner", "isAdmin", "canEditCompany", "isActive", status, "onboardingStep",
      "firstName", "lastName", email, phone,
      "tradeType", "jobTitle", "yearsExperience",
      bio, specialties, certifications,
      city, state, zip,
      "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      v_clerk_id,
      v_company_id,
      'member',               -- role: member (NOT owner/admin)
      false,                  -- isOwner: false
      false,                  -- isAdmin: false
      false,                  -- canEditCompany: false — validates RBAC
      true,                   -- isActive
      'active',               -- status
      'complete',             -- onboardingStep: skip onboarding
      'Damien',               -- firstName
      'Willingham',           -- lastName
      'damien.willingham@outlook.com',
      NULL,                   -- phone
      'Smart Home & Technology',
      'Field Technician',
      3,                      -- yearsExperience
      'Smart home installation technician specializing in home automation, security systems, and network infrastructure. ClearSkai Technologies team member.',
      ARRAY['Smart Home Installation', 'Security Systems', 'Network Infrastructure']::text[],
      ARRAY['Smart Home Certified', 'Network+']::text[],
      'Prescott',             -- city
      'AZ',                   -- state
      '86301',                -- zip
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ Created new member record → ClearSKai employee (member role, no admin)';
  END IF;

  -- Also ensure they have a TradesProfile (legacy model — some pages still read this)
  INSERT INTO "TradesProfile" (
    id, "userId", "orgId",
    "companyName", "contactName", email,
    city, state, zip,
    specialties, certifications, bio,
    website, "yearsInBusiness", "crewSize",
    rating, "reviewCount", "projectCount",
    verified, active,
    "createdAt", "updatedAt"
  ) VALUES (
    'tp-test-willingham-001',
    v_clerk_id,
    'cmhe0kl1j0000acz0am77w682',
    'ClearSkai Technologies, LLC',
    'Damien Willingham',
    'damien.willingham@outlook.com',
    'Prescott', 'AZ', '86301',
    ARRAY['Smart Home Installation', 'Security Systems', 'Network Infrastructure'],
    ARRAY['Smart Home Certified', 'Network+'],
    'Smart home installation technician at ClearSkai Technologies.',
    'https://www.skaiscrape.com',
    3, 1,
    0, 0, 0,
    true, true,
    NOW(), NOW()
  )
  ON CONFLICT ("userId") DO UPDATE SET
    "companyName" = 'ClearSkai Technologies, LLC',
    "contactName" = 'Damien Willingham',
    email = 'damien.willingham@outlook.com',
    active = true,
    "updatedAt" = NOW();

  RAISE NOTICE '✅ TradesProfile upserted for legacy compatibility';

END $$;

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT
  m."firstName" || ' ' || m."lastName" AS name,
  m.email,
  m.role,
  m."isOwner",
  m."isAdmin",
  m."canEditCompany",
  m."tradeType",
  c.name AS company_name
FROM "tradesCompanyMember" m
LEFT JOIN "tradesCompany" c ON c.id = m."companyId"
WHERE m."companyId" IS NOT NULL
  AND m."isActive" = true
  AND m.status = 'active'
ORDER BY m."isOwner" DESC, m."createdAt" ASC;

COMMIT;

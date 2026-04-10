-- Add Northern Arizona vendor locations
-- Execute with: psql "$DATABASE_URL" -f ./db/seed-vendors-northern-az.sql
-- Validate (Prisma + Postgres): pnpm prisma db execute --file db/seed-vendors-northern-az.sql --schema prisma/schema.prisma

BEGIN;

-- Ensure vendors exist (uses the existing vendor-* id convention)
INSERT INTO "Vendor" (
  "id",
  "slug",
  "name",
  "description",
  "category",
  "website",
  "primaryPhone",
  "primaryEmail",
  "isActive",
  "verifiedAt"
)
VALUES (
  'vendor-abc-supply',
  'abc-supply',
  'ABC Supply',
  'Leading roofing, siding, and window supply distributor with locations throughout Arizona.',
  'Building Supply Distributor',
  'https://www.abcsupply.com',
  '(800) 786-3532',
  'info@abcsupply.com',
  true,
  NOW()
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Vendor" (
  "id",
  "slug",
  "name",
  "description",
  "category",
  "website",
  "primaryPhone",
  "primaryEmail",
  "isActive",
  "verifiedAt"
)
VALUES (
  'vendor-srs',
  'srs',
  'SRS Distribution',
  'Building supply distributor serving professional contractors.',
  'Building Supply Distributor',
  'https://www.srs.com',
  NULL,
  NULL,
  true,
  NOW()
)
ON CONFLICT ("slug") DO NOTHING;

-- Insert locations with deterministic IDs so the script is idempotent.
-- Also avoids Postgres "::" cast syntax (some SQL validators mis-detect these as errors).
INSERT INTO "VendorLocation" (
  "id",
  "vendorId",
  "name",
  "address",
  "city",
  "state",
  "zip",
  "phone",
  "hours",
  "lat",
  "lng",
  "isActive"
)
VALUES
  (
    'vendorloc-abc-supply-prescott-valley',
    'vendor-abc-supply',
    'ABC Supply - Prescott Valley',
    '3250 N. Glassford Hill Road',
    'Prescott Valley',
    'AZ',
    '86314',
    '(928) 775-2233',
    CAST('{"mon":"7:00 AM - 5:00 PM","tue":"7:00 AM - 5:00 PM","wed":"7:00 AM - 5:00 PM","thu":"7:00 AM - 5:00 PM","fri":"7:00 AM - 5:00 PM","sat":"Closed","sun":"Closed"}' AS JSONB),
    34.6019,
    -112.3229,
    true
  ),
  (
    'vendorloc-abc-supply-flagstaff',
    'vendor-abc-supply',
    'ABC Supply - Flagstaff',
    '2455 E. Huntington Drive',
    'Flagstaff',
    'AZ',
    '86004',
    '(928) 526-1313',
    CAST('{"mon":"7:00 AM - 5:00 PM","tue":"7:00 AM - 5:00 PM","wed":"7:00 AM - 5:00 PM","thu":"7:00 AM - 5:00 PM","fri":"7:00 AM - 5:00 PM","sat":"Closed","sun":"Closed"}' AS JSONB),
    35.1983,
    -111.6113,
    true
  ),
  (
    'vendorloc-abc-supply-anthem',
    'vendor-abc-supply',
    'ABC Supply - Anthem',
    '3738 W. Anthem Way, Suite 110',
    'Anthem',
    'AZ',
    '85086',
    '(623) 551-2233',
    CAST('{"mon":"7:00 AM - 5:00 PM","tue":"7:00 AM - 5:00 PM","wed":"7:00 AM - 5:00 PM","thu":"7:00 AM - 5:00 PM","fri":"7:00 AM - 5:00 PM","sat":"Closed","sun":"Closed"}' AS JSONB),
    33.8670,
    -112.1467,
    true
  ),
  (
    'vendorloc-srs-prescott-valley',
    'vendor-srs',
    'SRS Distribution - Prescott Valley',
    '4100 N. Robert Road',
    'Prescott Valley',
    'AZ',
    '86314',
    '(928) 772-8844',
    CAST('{"mon":"7:00 AM - 5:00 PM","tue":"7:00 AM - 5:00 PM","wed":"7:00 AM - 5:00 PM","thu":"7:00 AM - 5:00 PM","fri":"7:00 AM - 5:00 PM","sat":"Closed","sun":"Closed"}' AS JSONB),
    34.6065,
    -112.3170,
    true
  )
ON CONFLICT ("id") DO NOTHING;

COMMIT;

SELECT 'Vendor locations seeded for Northern Arizona' AS status;

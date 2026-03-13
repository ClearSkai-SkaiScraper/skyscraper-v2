-- ============================================================================
-- Fix Vendor Logos — Replace dead Clearbit URLs with Google Favicons
-- Clearbit Logo API is permanently offline, causing all vendor logos to fail.
-- Google Favicons API is free, reliable, and requires no API key.
-- Run: psql "$DATABASE_URL" -f ./db/migrations/20260313_fix_vendor_logos.sql
-- ============================================================================

BEGIN;

-- GAF
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=gaf.com&sz=128'
WHERE slug = 'gaf' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- ABC Supply
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=abcsupply.com&sz=128'
WHERE slug = 'abc-supply' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- SRS Distribution
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=srsdistribution.com&sz=128'
WHERE slug = 'srs-distribution' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Westlake Royal
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=westlakeroyalbuildingproducts.com&sz=128'
WHERE slug = 'westlake-royal' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Elite Roofing Supply
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=eliteroofingsupply.com&sz=128'
WHERE slug = 'elite-roofing-supply' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- CertainTeed
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=certainteed.com&sz=128'
WHERE slug = 'certainteed' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Owens Corning
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=owenscorning.com&sz=128'
WHERE slug = 'owens-corning' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- TAMKO
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=tamko.com&sz=128'
WHERE slug = 'tamko' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- IKO
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=iko.com&sz=128'
WHERE slug = 'iko' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Atlas Roofing
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=atlasroofing.com&sz=128'
WHERE slug = 'atlas-roofing' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- PABCO Roofing
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=pabcoroofing.com&sz=128'
WHERE slug = 'pabco-roofing' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Boral
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=boral.com&sz=128'
WHERE slug = 'boral' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- DaVinci Roofscapes
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=davinciroofscapes.com&sz=128'
WHERE slug = 'davinci-roofscapes' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Eagle Roofing Products
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=eagleroofing.com&sz=128'
WHERE slug = 'eagle-roofing' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Malarkey Roofing
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=malarkeyroofing.com&sz=128'
WHERE slug = 'malarkey-roofing' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- James Hardie
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=jameshardie.com&sz=128'
WHERE slug = 'james-hardie' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- LP Building Solutions
UPDATE "Vendor" SET logo = 'https://www.google.com/s2/favicons?domain=lpcorp.com&sz=128'
WHERE slug = 'lp-building' AND (logo IS NULL OR logo LIKE '%clearbit%');

-- Catch-all: fix any remaining vendors with clearbit logos
UPDATE "Vendor" SET logo = NULL WHERE logo LIKE '%clearbit%';

COMMIT;

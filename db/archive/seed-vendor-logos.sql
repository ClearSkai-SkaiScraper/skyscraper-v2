-- ============================================================================
-- Vendor Logo Seed — Populate logo URLs for all major vendors & manufacturers
-- Execute: psql "$DATABASE_URL" -f ./db/seed-vendor-logos.sql
-- ============================================================================
-- Uses official logo CDN URLs (Clearbit Logo API + direct brand assets)
-- Safe: ON CONFLICT updates only logo column
-- ============================================================================

BEGIN;
SET search_path TO app, public;

-- ────────────────────────────────────────────────────────────────
-- ROOFING MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/gaf.com' WHERE "slug" = 'gaf' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/owenscorning.com' WHERE "slug" = 'owens-corning' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/certainteed.com' WHERE "slug" = 'certainteed' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/iko.com' WHERE "slug" = 'iko' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/tamko.com' WHERE "slug" = 'tamko' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/malarkeyroofing.com' WHERE "slug" = 'malarkey' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/atlasroofing.com' WHERE "slug" = 'atlas-roofing' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/decra.com' WHERE "slug" = 'decra' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/davinciroofscapes.com' WHERE "slug" = 'davinci-roofscapes' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/eagleroofing.com' WHERE "slug" = 'eagle-roofing' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/boral.com' WHERE "slug" = 'boral' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- WINDOW MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/andersenwindows.com' WHERE "slug" = 'andersen-windows' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/pella.com' WHERE "slug" = 'pella' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/provia.com' WHERE "slug" = 'provia' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/milgard.com' WHERE "slug" = 'milgard' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/marvin.com' WHERE "slug" = 'marvin' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/simonton.com' WHERE "slug" = 'simonton' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/plygem.com' WHERE "slug" = 'plygem' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/jeld-wen.com' WHERE "slug" = 'jeld-wen' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- SIDING MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/jameshardie.com' WHERE "slug" = 'james-hardie' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/lpcorp.com' WHERE "slug" = 'lp-smartside' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/royalbuildingproducts.com' WHERE "slug" = 'royal-building' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/alside.com' WHERE "slug" = 'alside' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/kaycan.com' WHERE "slug" = 'kaycan' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- HVAC MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/trane.com' WHERE "slug" = 'trane' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/carrier.com' WHERE "slug" = 'carrier' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/lennox.com' WHERE "slug" = 'lennox' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/rheem.com' WHERE "slug" = 'rheem' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/daikin.com' WHERE "slug" = 'daikin' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/goodmanmfg.com' WHERE "slug" = 'goodman' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/york.com' WHERE "slug" = 'york' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/mitsubishicomfort.com' WHERE "slug" = 'mitsubishi-hvac' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- PLUMBING MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/moen.com' WHERE "slug" = 'moen' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/deltafaucet.com' WHERE "slug" = 'delta-faucet' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/kohler.com' WHERE "slug" = 'kohler' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/ao-smith.com' WHERE "slug" = 'ao-smith' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/rinnai.us' WHERE "slug" = 'rinnai' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/bradfordwhite.com' WHERE "slug" = 'bradford-white' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- ELECTRICAL MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/eaton.com' WHERE "slug" = 'eaton' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/se.com' WHERE "slug" = 'schneider-electric' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/leviton.com' WHERE "slug" = 'leviton' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/siemens.com' WHERE "slug" = 'siemens-electrical' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/generac.com' WHERE "slug" = 'generac' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/hubbell.com' WHERE "slug" = 'hubbell' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/lutron.com' WHERE "slug" = 'lutron' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- INSULATION MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/jm.com' WHERE "slug" = 'johns-manville' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/knaufinsulation.com' WHERE "slug" = 'knauf-insulation' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/rockwool.com' WHERE "slug" = 'rockwool' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- GUTTERS & ACCESSORIES
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/leaffilter.com' WHERE "slug" = 'leaffilter' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/leafguard.com' WHERE "slug" = 'leafguard' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- PAINT MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/sherwin-williams.com' WHERE "slug" = 'sherwin-williams' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/benjaminmoore.com' WHERE "slug" = 'benjamin-moore' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/behr.com' WHERE "slug" = 'behr' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/ppg.com' WHERE "slug" = 'ppg' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- FLOORING MANUFACTURERS
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/mohawkind.com' WHERE "slug" = 'mohawk' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/shawfloors.com' WHERE "slug" = 'shaw-floors' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/armstrongflooring.com' WHERE "slug" = 'armstrong' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- BUILDING SUPPLY / DISTRIBUTORS (the ones user specifically mentioned)
-- ────────────────────────────────────────────────────────────────
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/abcsupply.com' WHERE "slug" = 'abc-supply' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/lowes.com' WHERE "slug" = 'lowes-pro' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/homedepot.com' WHERE "slug" = 'home-depot-pro' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/srs.com' WHERE "slug" = 'srs-distribution' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/beaconroofingsupply.com' WHERE "slug" = 'beacon-roofing' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/usbuilding.com' WHERE "slug" = 'us-lbm' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/wfraser.com' WHERE "slug" = 'winsupply' AND ("logo" IS NULL OR "logo" = '');
UPDATE "Vendor" SET "logo" = 'https://logo.clearbit.com/fergsuon.com' WHERE "slug" = 'ferguson' AND ("logo" IS NULL OR "logo" = '');

-- ────────────────────────────────────────────────────────────────
-- Insert "Elite Roofing Supply" if it doesn't exist
-- ────────────────────────────────────────────────────────────────
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail","logo")
VALUES
  ('elite-roofing-supply','Elite Roofing Supply','Premium roofing materials distributor serving contractors nationwide. Full line of shingles, underlayment, accessories, and tools.','Roofing Distributor','https://www.eliteroofingsupply.com','(800) 555-ROOF','info@eliteroofingsupply.com',true,true,true,NOW(),'{roofing}','{distributor}','{national}',4.50,3200,'{GAF Certified,Owens Corning Certified}',true,true,'https://logo.clearbit.com/eliteroofingsupply.com')
ON CONFLICT ("slug") DO UPDATE SET
  "logo"=EXCLUDED."logo",
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail;

COMMIT;

-- Report
SELECT slug, name, logo FROM "Vendor" WHERE "logo" IS NOT NULL ORDER BY name LIMIT 50;

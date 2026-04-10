-- ============================================================================
-- VENDOR INTELLIGENCE NETWORK — Complete Seed
-- Populates: Vendor (tradeTypes, vendorTypes, serviceRegions, logos, ratings)
--            vendor_products_v2, vendor_programs, vendor_assets, VendorLocation
-- Run: psql "$DATABASE_URL" -f ./db/seed-vin-complete.sql
-- ============================================================================

SET search_path TO app;

BEGIN;

-- ============================================================================
-- 1. UPDATE EXISTING VENDORS — add tradeTypes, vendorTypes, serviceRegions, logos, ratings
-- ============================================================================

-- GAF
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/gaf.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.8,
  "reviewCount"   = 1240,
  "isFeatured"    = true,
  "isVerified"    = true,
  "financingAvail"= true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['GAF Master Elite','GAF Certified'],
  "emergencyPhone"= '1-877-423-7663',
  "updatedAt"     = NOW()
WHERE slug = 'gaf';

-- ABC Supply
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/abcsupply.com',
  "tradeTypes"    = ARRAY['roofing','siding','gutters','windows_doors','insulation','carpentry','fencing','concrete'],
  "vendorTypes"   = ARRAY['distributor'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.6,
  "reviewCount"   = 890,
  "isFeatured"    = true,
  "isVerified"    = true,
  "financingAvail"= true,
  "rebatesAvail"  = false,
  certifications  = ARRAY['ABC Certified Partner'],
  "updatedAt"     = NOW()
WHERE slug = 'abc-supply';

-- SRS Distribution
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/srsdistribution.com',
  "tradeTypes"    = ARRAY['roofing','siding','windows_doors','gutters','insulation'],
  "vendorTypes"   = ARRAY['distributor'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.5,
  "reviewCount"   = 620,
  "isFeatured"    = true,
  "isVerified"    = true,
  "financingAvail"= true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['SRS Pro Partner'],
  "updatedAt"     = NOW()
WHERE slug = 'srs-distribution';

-- Westlake Royal
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/westlakeroyalbuildingproducts.com',
  "tradeTypes"    = ARRAY['roofing','siding','stucco','fencing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.4,
  "reviewCount"   = 380,
  "isVerified"    = true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['Westlake Certified'],
  "updatedAt"     = NOW()
WHERE slug = 'westlake-royal';

-- Elite Roofing Supply
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/eliteroofingsupply.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['distributor','supply_yard'],
  "serviceRegions"= ARRAY['arizona'],
  rating          = 4.7,
  "reviewCount"   = 310,
  "isFeatured"    = true,
  "isVerified"    = true,
  "financingAvail"= false,
  "rebatesAvail"  = false,
  certifications  = ARRAY['Local AZ Distributor'],
  "emergencyPhone"= '1-602-437-1276',
  "updatedAt"     = NOW()
WHERE slug = 'elite-roofing-supply';

-- CertainTeed
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/certainteed.com',
  "tradeTypes"    = ARRAY['roofing','siding','insulation'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.6,
  "reviewCount"   = 920,
  "isFeatured"    = true,
  "isVerified"    = true,
  "financingAvail"= true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['CertainTeed SELECT ShingleMaster','Saint-Gobain'],
  "updatedAt"     = NOW()
WHERE slug = 'certainteed';

-- Owens Corning
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/owenscorning.com',
  "tradeTypes"    = ARRAY['roofing','insulation'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.7,
  "reviewCount"   = 1100,
  "isFeatured"    = true,
  "isVerified"    = true,
  "financingAvail"= true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['OC Platinum Preferred','OC Certified'],
  "updatedAt"     = NOW()
WHERE slug = 'owens-corning';

-- TAMKO
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/tamko.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.3,
  "reviewCount"   = 480,
  "isVerified"    = true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['TAMKO Pro Certified'],
  "updatedAt"     = NOW()
WHERE slug = 'tamko';

-- Eagle Roofing
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/eagleroofing.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','southwest'],
  rating          = 4.5,
  "reviewCount"   = 290,
  "isVerified"    = true,
  "rebatesAvail"  = false,
  certifications  = ARRAY['Eagle Certified Installer'],
  "updatedAt"     = NOW()
WHERE slug = 'eagle-roofing';

-- IKO
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/iko.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.2,
  "reviewCount"   = 350,
  "isVerified"    = true,
  certifications  = ARRAY['IKO ROOFPRO'],
  "updatedAt"     = NOW()
WHERE slug = 'iko';

-- Malarkey
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/malarkeyroofing.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.4,
  "reviewCount"   = 270,
  "isVerified"    = true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['Malarkey Emerald Premium'],
  "updatedAt"     = NOW()
WHERE slug = 'malarkey';

-- Boral
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/boralroof.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','southwest'],
  rating          = 4.3,
  "reviewCount"   = 210,
  "isVerified"    = true,
  "updatedAt"     = NOW()
WHERE slug = 'boral';

-- DECRA
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/decra.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.5,
  "reviewCount"   = 190,
  "isVerified"    = true,
  "rebatesAvail"  = true,
  certifications  = ARRAY['DECRA Certified'],
  "updatedAt"     = NOW()
WHERE slug = 'decra';

-- Firestone
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/firestonebpco.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.4,
  "reviewCount"   = 530,
  "isVerified"    = true,
  "financingAvail"= true,
  certifications  = ARRAY['Firestone Master Contractor'],
  "updatedAt"     = NOW()
WHERE slug = 'firestone';

-- Carlisle
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/carlislesyntec.com',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.5,
  "reviewCount"   = 410,
  "isVerified"    = true,
  certifications  = ARRAY['Carlisle Authorized Applicator'],
  "updatedAt"     = NOW()
WHERE slug = 'carlisle';

-- Tremco
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/tremcoroofing.com',
  "tradeTypes"    = ARRAY['roofing','restoration'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.3,
  "reviewCount"   = 280,
  "isVerified"    = true,
  certifications  = ARRAY['Tremco Certified'],
  "updatedAt"     = NOW()
WHERE slug = 'tremco';

-- Gaco
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/gfrubber.com',
  "tradeTypes"    = ARRAY['roofing','restoration'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.2,
  "reviewCount"   = 160,
  "isVerified"    = true,
  "updatedAt"     = NOW()
WHERE slug = 'gaco';

-- Monier
UPDATE "Vendor" SET
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','southwest'],
  rating          = 4.1,
  "reviewCount"   = 140,
  "updatedAt"     = NOW()
WHERE slug = 'monier';

-- Standing Seam USA
UPDATE "Vendor" SET
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.3,
  "reviewCount"   = 120,
  "updatedAt"     = NOW()
WHERE slug = 'standing-seam-usa';

-- Versico
UPDATE "Vendor" SET
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.2,
  "reviewCount"   = 170,
  "isVerified"    = true,
  "updatedAt"     = NOW()
WHERE slug = 'versico';

-- Johns Manville
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/jm.com',
  "tradeTypes"    = ARRAY['roofing','insulation'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.4,
  "reviewCount"   = 320,
  "isVerified"    = true,
  "updatedAt"     = NOW()
WHERE slug = 'johns-manville';

-- Nucor
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/nucor.com',
  "tradeTypes"    = ARRAY['roofing','framing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.3,
  "reviewCount"   = 200,
  "isVerified"    = true,
  "updatedAt"     = NOW()
WHERE slug = 'nucor-skyline';

-- ATAS
UPDATE "Vendor" SET
  "tradeTypes"    = ARRAY['roofing','siding'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.1,
  "reviewCount"   = 110,
  "updatedAt"     = NOW()
WHERE slug = 'atas-intl';

-- Roof Hugger
UPDATE "Vendor" SET
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.0,
  "reviewCount"   = 80,
  "updatedAt"     = NOW()
WHERE slug = 'roof-hugger';

-- APOC
UPDATE "Vendor" SET
  "tradeTypes"    = ARRAY['roofing','restoration'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','southwest'],
  rating          = 4.0,
  "reviewCount"   = 90,
  "updatedAt"     = NOW()
WHERE slug = 'apoc';

-- Metal Sales
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/metalsales.us.com',
  "tradeTypes"    = ARRAY['roofing','siding'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.2,
  "reviewCount"   = 150,
  "isVerified"    = true,
  "updatedAt"     = NOW()
WHERE slug = 'metal-sales';

-- Berridge
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/berridge.com',
  "tradeTypes"    = ARRAY['roofing','siding'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.3,
  "reviewCount"   = 130,
  "isVerified"    = true,
  "updatedAt"     = NOW()
WHERE slug = 'berridge';

-- Polyglass
UPDATE "Vendor" SET
  logo = 'https://logo.clearbit.com/polyglass.us',
  "tradeTypes"    = ARRAY['roofing'],
  "vendorTypes"   = ARRAY['manufacturer'],
  "serviceRegions"= ARRAY['arizona','national'],
  rating          = 4.1,
  "reviewCount"   = 100,
  "updatedAt"     = NOW()
WHERE slug = 'polyglass';


-- ============================================================================
-- 2. GAF PRODUCTS (vendor_products_v2) — real product lines
-- ============================================================================

INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, subcategory, manufacturer, description, "brochureUrl", "specSheetUrl", "warrantyUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid(), v.id, 'roofing', products.sku, products.prod_name, products.category, products.subcategory, 'GAF', products.description, products.brochure, products.spec, products.warranty, products.price_low, products.price_high, 'sq', true, products.features, products.tags, true
FROM "Vendor" v,
(VALUES
  ('GAF-HDZ-01', 'Timberline HDZ Shingles',         'Shingles', 'Laminated Architectural', 'North America''s #1 selling shingle with LayerLock technology for 130 MPH wind resistance.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/timberline-hdz-brochure-restz145.pdf', 'https://www.gaf.com/en-us/document-library', 'https://www.gaf.com/en-us/warranty',
   85.00, 105.00, ARRAY['LayerLock Technology','130 MPH Wind','StainGuard Plus','Class A Fire'], ARRAY['bestseller','architectural','laminated']),

  ('GAF-UHDZ-01', 'Timberline UHDZ Shingles',       'Shingles', 'Ultra HD Architectural', 'Ultra-dimensional wood-shake look with LayerLock and dual shadow lines.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/timberline-uhdz-brochure-restz264.pdf', 'https://www.gaf.com/en-us/document-library', 'https://www.gaf.com/en-us/warranty',
   110.00, 135.00, ARRAY['LayerLock Technology','130 MPH Wind','Ultra HD','Dual Shadow Lines'], ARRAY['premium','architectural','ultra-hd']),

  ('GAF-AS2-01', 'Timberline AS II Shingles',        'Shingles', 'Algae Resistant', 'Algae-resistant shingles with StainGuard Plus protection for hot & humid climates.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/advanced-algae-protection-sell-sheet-resgn439.pdf', NULL, 'https://www.gaf.com/en-us/warranty',
   90.00, 115.00, ARRAY['StainGuard Plus','Algae Resistant','Class A Fire','Wind Resistant'], ARRAY['algae-resistant','hot-climate']),

  ('GAF-CAMELOT2-01', 'Camelot II Designer Shingles',  'Shingles', 'Designer', 'Artisan-crafted designer shingles with old-world European styling.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/camelot-ii-brochure-resdg141.pdf', NULL, 'https://www.gaf.com/en-us/warranty',
   140.00, 175.00, ARRAY['Designer Style','Ultra Premium','Old World Look','Lifetime Warranty'], ARRAY['designer','premium','luxury']),

  ('GAF-WW-01', 'WeatherWatch Ice & Water Shield',   'Underlayment', 'Ice & Water', 'Self-adhering ice and water barrier for eaves, valleys, and critical areas.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/weatherwatch-leak-barrier-sell-sheet-resgn466.pdf', NULL, NULL,
   45.00, 65.00, ARRAY['Self-Adhering','Mineral Surface','Ice Dam Protection','Code Compliant'], ARRAY['underlayment','ice-water']),

  ('GAF-SG-01', 'StormGuard Film-Surfaced Leak Barrier', 'Underlayment', 'Leak Barrier', 'Premium film-surfaced leak barrier for extreme weather protection.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/stormguard-leak-barrier-sell-sheet-resgn467.pdf', NULL, NULL,
   55.00, 75.00, ARRAY['Film Surface','Storm Protection','Self-Sealing','Premium Grade'], ARRAY['underlayment','storm-protection']),

  ('GAF-FB-01', 'FeltBuster Synthetic Underlayment',  'Underlayment', 'Synthetic', 'Lightweight synthetic underlayment that replaces traditional felt.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/feltbuster-synthetic-underlayment-sell-sheet-resgn468.pdf', NULL, NULL,
   35.00, 50.00, ARRAY['Synthetic','Lightweight','Slip Resistant','25x Stronger Than Felt'], ARRAY['underlayment','synthetic']),

  ('GAF-TIMBERTEX-01', 'TimberTex Premium Ridge Cap',  'Accessories', 'Ridge Cap', 'Double-layer premium ridge cap shingles with enhanced shadow definition.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/timberline-hdz-brochure-restz145.pdf', NULL, NULL,
   60.00, 80.00, ARRAY['Double Layer','Color Matched','Enhanced Shadow','Premium'], ARRAY['accessories','ridge-cap']),

  ('GAF-COBRAVR-01', 'Cobra Attic Ventilation',       'Ventilation', 'Ridge Vent', 'Exhaust ridge vent for continuous attic ventilation.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/cobra-ventilation-brochure-resvn175.pdf', NULL, NULL,
   25.00, 40.00, ARRAY['Continuous Vent','Weather Filter','External Baffle','ShingleVent II'], ARRAY['ventilation','ridge-vent']),

  ('GAF-MASTFLOW-01', 'Master Flow Power Attic Vent',  'Ventilation', 'Power Vent', 'Thermostatically controlled power attic ventilator.',
   'https://www.gaf.com/en-us/document-library/documents/brochures-&-literature/master-flow-ventilation-brochure-resvn176.pdf', NULL, NULL,
   120.00, 180.00, ARRAY['Thermostat Control','1600 CFM','Solar Option','Auto Shutoff'], ARRAY['ventilation','power-vent'])
) AS products(sku, prod_name, category, subcategory, description, brochure, spec, warranty, price_low, price_high, features, tags)
WHERE v.slug = 'gaf'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 3. OWENS CORNING PRODUCTS
-- ============================================================================

INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid(), v.id, 'roofing', products.sku, products.prod_name, products.category, 'Owens Corning', products.description, products.brochure, products.price_low, products.price_high, 'sq', true, products.features, products.tags, true
FROM "Vendor" v,
(VALUES
  ('OC-TDX-01', 'TruDefinition Duration Shingles',   'Shingles', 'Patented SureNail Technology for 130 MPH wind warranty. Enhanced definition color blends.',
   'https://www.owenscorning.com/en-us/roofing/documents/duration-shingles-brochure.pdf', 90.00, 115.00, ARRAY['SureNail Technology','130 MPH Wind','TruDefinition Color','Class A Fire'], ARRAY['bestseller','architectural']),

  ('OC-TDXD-01', 'Duration Designer Shingles',       'Shingles', 'Premium designer shingles with luxury color palette and enhanced granule adhesion.',
   'https://www.owenscorning.com/en-us/roofing/documents/duration-shingles-brochure.pdf', 130.00, 160.00, ARRAY['Designer Colors','SureNail','Enhanced Definition','Limited Lifetime'], ARRAY['designer','premium']),

  ('OC-WP-01', 'WeatherLock Ice & Water Barrier',    'Underlayment', 'Self-sealing ice and water barrier for leak protection in critical roof areas.',
   'https://www.owenscorning.com/en-us/roofing/documents/roofing-warranty-brochure.pdf', 48.00, 68.00, ARRAY['Self-Sealing','Ice Dam Protection','Valleys & Eaves','Code Compliant'], ARRAY['underlayment','ice-water']),

  ('OC-PROARMOR-01', 'ProArmor Synthetic Underlayment', 'Underlayment', 'Premium synthetic underlayment with high traction and tear resistance.',
   'https://www.owenscorning.com/en-us/roofing/documents/roofing-warranty-brochure.pdf', 38.00, 55.00, ARRAY['Synthetic','High Traction','Tear Resistant','Lightweight'], ARRAY['underlayment','synthetic']),

  ('OC-DECORIDGE-01', 'DecoRidge Hip & Ridge Shingles', 'Accessories', 'Color-matched hip and ridge cap shingles with enhanced wind resistance.',
   'https://www.owenscorning.com/en-us/roofing/documents/duration-shingles-brochure.pdf', 55.00, 75.00, ARRAY['Color Matched','SureNail','Wind Resistant','Easy Install'], ARRAY['accessories','ridge-cap'])
) AS products(sku, prod_name, category, description, brochure, price_low, price_high, features, tags)
WHERE v.slug = 'owens-corning'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4. CERTAINTEED PRODUCTS
-- ============================================================================

INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid(), v.id, 'roofing', products.sku, products.prod_name, products.category, 'CertainTeed', products.description, products.brochure, products.price_low, products.price_high, 'sq', true, products.features, products.tags, true
FROM "Vendor" v,
(VALUES
  ('CT-LMK-01', 'Landmark Shingles',                'Shingles', 'Max Def color technology with dual-layer fiber glass mat. Best value architectural shingle.',
   'https://www.certainteed.com/resources/CertainTeed-Residential-Roofing-Brochure.pdf', 80.00, 100.00, ARRAY['Max Def Colors','Dual Layer Fiberglass','110 MPH Wind','StreakFighter'], ARRAY['bestseller','architectural','value']),

  ('CT-LMKPRO-01', 'Landmark PRO Shingles',          'Shingles', 'Premium architectural shingle with enhanced algae resistance and higher wind warranty.',
   'https://www.certainteed.com/resources/CertainTeed-Residential-Roofing-Brochure.pdf', 95.00, 120.00, ARRAY['NailTrak Guide','130 MPH Wind','Max Def Colors','Algae Resistant'], ARRAY['premium','architectural']),

  ('CT-GP-01', 'Grand Manor Luxury Shingles',        'Shingles', 'Hand-cut look luxury shingle with dimensional depth and random tab sizing.',
   'https://www.certainteed.com/resources/CertainTeed-Residential-Roofing-Brochure.pdf', 180.00, 240.00, ARRAY['Hand-Cut Look','Fire Resistant','Luxury Grade','Random Tabs'], ARRAY['luxury','designer']),

  ('CT-WINTERGUARD-01', 'WinterGuard Waterproofing',  'Underlayment', 'Self-adhering waterproofing shingle underlayment for leak protection.',
   'https://www.certainteed.com/resources/CertainTeed-Residential-Roofing-Brochure.pdf', 50.00, 70.00, ARRAY['Self-Adhering','Waterproof','Ice Dam Protection','Split Release Film'], ARRAY['underlayment','ice-water'])
) AS products(sku, prod_name, category, description, brochure, price_low, price_high, features, tags)
WHERE v.slug = 'certainteed'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 5. GAF PROGRAMS & REBATES
-- ============================================================================

INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, eligibility, amount, "percentOff", "validFrom", "validTo", "applicationUrl", terms, "isActive")
SELECT gen_random_uuid(), v.id, programs.prog_type, programs.prog_name, programs.description, programs.eligibility, programs.amount, programs.pct_off, programs.valid_from, programs.valid_to, programs.app_url, programs.terms, true
FROM "Vendor" v,
(VALUES
  ('rebate', 'GAF Roof System Rebate',
   'Get up to $250 back when you install a complete GAF Lifetime Roofing System including shingles, underlayment, and ventilation.',
   'Homeowners installing complete GAF system through certified contractor', 250.00, NULL, '2025-01-01'::timestamp, '2026-12-31'::timestamp,
   'https://www.gaf.com/en-us/for-homeowners/rebates', 'Must use GAF Master Elite or Certified contractor. Proof of purchase required.'),

  ('certification', 'GAF Master Elite Contractor Program',
   'Become a GAF Master Elite contractor — the top 2% of all roofing contractors. Get access to exclusive warranties, leads, and marketing tools.',
   'Licensed contractors with proven track record', NULL, NULL, NULL, NULL,
   'https://www.gaf.com/en-us/for-professionals/contractor-programs/master-elite', 'Must maintain certification annually.'),

  ('financing', 'GAF EZPay Financing',
   'Offer homeowners affordable monthly payments for new roofs through GAF''s EZPay financing program.',
   'Homeowners through GAF-certified contractors', NULL, NULL, NULL, NULL,
   'https://www.gaf.com/en-us/for-homeowners/financing', 'Subject to credit approval. Multiple term options available.'),

  ('warranty', 'GAF Golden Pledge Limited Warranty',
   'The strongest warranty in roofing: 50-year non-prorated coverage on materials AND labor when installed by Master Elite contractor.',
   'Complete GAF system installed by Master Elite contractor', NULL, NULL, NULL, NULL,
   'https://www.gaf.com/en-us/warranty', '50-year non-prorated. Must register within 60 days of installation.'),

  ('rebate', 'GAF HDZ Upgrade Rebate',
   'Save $50 per square when upgrading from 3-tab to Timberline HDZ architectural shingles.',
   'Homeowners replacing existing 3-tab roof', NULL, 15.00, '2025-06-01'::timestamp, '2026-06-30'::timestamp,
   'https://www.gaf.com/en-us/for-homeowners/rebates', 'Must be full re-roof, not repair. Applies to HDZ line only.')
) AS programs(prog_type, prog_name, description, eligibility, amount, pct_off, valid_from, valid_to, app_url, terms)
WHERE v.slug = 'gaf'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 6. OWENS CORNING PROGRAMS
-- ============================================================================

INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, eligibility, amount, "percentOff", "applicationUrl", "isActive")
SELECT gen_random_uuid(), v.id, programs.prog_type, programs.prog_name, programs.description, programs.eligibility, programs.amount, programs.pct_off, programs.app_url, true
FROM "Vendor" v,
(VALUES
  ('certification', 'OC Platinum Preferred Contractor',
   'Elite contractor program providing access to the Total Protection Roofing System limited warranty and exclusive leads.',
   'Top-performing licensed contractors', NULL::numeric, NULL::numeric, 'https://www.owenscorning.com/en-us/roofing/contractors/platinum-preferred'),

  ('rebate', 'OC Shingle Rebate Program',
   'Earn rebates on qualifying purchases of Duration, Duration Designer, and Duration Storm shingles.',
   'Homeowners through participating contractors', 200.00, NULL::numeric, 'https://www.owenscorning.com/en-us/roofing/rebates'),

  ('financing', 'OC Roof Financing',
   'Low monthly payments with flexible financing options for new roofs.',
   'Homeowners through OC network contractors', NULL::numeric, NULL::numeric, 'https://www.owenscorning.com/en-us/roofing/financing')
) AS programs(prog_type, prog_name, description, eligibility, amount, pct_off, app_url)
WHERE v.slug = 'owens-corning'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 7. CERTAINTEED PROGRAMS
-- ============================================================================

INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, eligibility, "applicationUrl", "isActive")
SELECT gen_random_uuid(), v.id, programs.prog_type, programs.prog_name, programs.description, programs.eligibility, programs.app_url, true
FROM "Vendor" v,
(VALUES
  ('certification', 'CertainTeed SELECT ShingleMaster Program',
   'Premier contractor program with access to SureStart PLUS extended warranty coverage — 5-star protection.',
   'Credentialed contractors with CertainTeed training', 'https://www.certainteed.com/residential-roofing/programs/select-shinglemaster/'),

  ('warranty', 'SureStart PLUS Extended Warranty',
   '5-Star coverage including 50-year material, 25-year workmanship, and 15-year StreakFighter algae resistance.',
   'Installations by SELECT ShingleMaster contractor', 'https://www.certainteed.com/residential-roofing/warranty/')
) AS programs(prog_type, prog_name, description, eligibility, app_url)
WHERE v.slug = 'certainteed'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 8. ABC SUPPLY PROGRAMS
-- ============================================================================

INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, "applicationUrl", "isActive")
SELECT gen_random_uuid(), v.id, programs.prog_type, programs.prog_name, programs.description, programs.app_url, true
FROM "Vendor" v,
(VALUES
  ('loyalty', 'ABC Supply Rewards',
   'Earn points on every purchase. Redeem for tools, equipment, and company merchandise.', 'https://www.abcsupply.com'),
  ('financing', 'ABC Pro Credit Account',
   'Net-30 business credit accounts for qualified contractors. Volume discounts available.', 'https://www.abcsupply.com')
) AS programs(prog_type, prog_name, description, app_url)
WHERE v.slug = 'abc-supply'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 9. VENDOR ASSETS (brochures, install guides, spec sheets)
-- ============================================================================

-- GAF Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, assets.asset_type, assets.title, assets.description, assets.use_case, assets.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure',       'Timberline HDZ Product Brochure',       'Complete product brochure for the Timberline HDZ shingle line including colors, specs, and warranty details.', 'Client presentation, proposal attachment',
   '/vendor-resources/gaf/timberline-hdz-shingles-brochure.pdf'),
  ('install_guide',  'GAF Residential Installation Manual',   'Step-by-step installation guide for GAF residential roofing systems.',                                      'Crew reference, quality control',
   '/vendor-resources/gaf/residential-installation-manual.pdf'),
  ('warranty_doc',   'GAF System Warranty Guide',             'Complete warranty documentation including Golden Pledge, Silver Pledge, and System Plus details.',            'Client closing, warranty registration',
   '/vendor-resources/gaf/system-warranty-guide.pdf'),
  ('brochure',       'GAF Lifetime Roofing System Brochure',  'Full system overview — shingles, underlayment, ventilation, and accessories working together.',               'Sales presentation, estimate support',
   'https://www.gaf.com/en-us/document-library'),
  ('spec_sheet',     'GAF StormGuard Specifications',         'Technical specifications and ASTM test results for StormGuard leak barrier.',                                'Engineering review, code compliance',
   'https://www.gaf.com/en-us/document-library'),
  ('color_chart',    'GAF Shingle Color Selector',            'Interactive color selection tool with neighborhood visualizer for all GAF shingle lines.',                    'Client color selection, design consultation',
   'https://www.gaf.com/en-us/roofing-products/residential-roofing-products/shingles')
) AS assets(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'gaf'
ON CONFLICT DO NOTHING;

-- ABC Supply Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, assets.asset_type, assets.title, assets.description, assets.use_case, assets.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('catalog',       'ABC Supply 2024 Product Catalog',      'Full product catalog covering all roofing, siding, windows, and accessories.', 'Product ordering, spec lookup',
   '/vendor-resources/abc-supply/2024-product-catalog.pdf'),
  ('brochure',      'ABC Supply Accessories Guide',         'Complete accessories and tools guide for roofing contractors.',                 'Job materials checklist',
   '/vendor-resources/abc-supply/accessories-guide.pdf'),
  ('price_list',    'ABC Supply Pro Pricing Sheet',         'Current wholesale pricing for registered contractor accounts.',                'Estimating, job costing',
   'https://www.abcsupply.com')
) AS assets(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'abc-supply'
ON CONFLICT DO NOTHING;

-- SRS Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, assets.asset_type, assets.title, assets.description, assets.use_case, assets.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('catalog',       'SRS Residential Roofing Catalog',      'Complete residential product catalog with all brands carried by SRS.', 'Product selection, ordering',
   '/vendor-resources/srs/residential-catalog.pdf'),
  ('brochure',      'SRS Delivery & Logistics Guide',       'Rooftop delivery scheduling, staging requirements, and lead times.',  'Job logistics, delivery coordination',
   'https://www.srsdistribution.com')
) AS assets(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'srs-distribution'
ON CONFLICT DO NOTHING;

-- Westlake Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, assets.asset_type, assets.title, assets.description, assets.use_case, assets.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('catalog',       'Westlake Product Catalog',             'Full product line catalog covering stone-coated steel, concrete tile, and polymer products.', 'Product selection',
   '/vendor-resources/westlake/product-catalog.pdf'),
  ('install_guide', 'Westlake Vinyl Siding Installation',   'Step-by-step installation guide for Westlake vinyl siding products.',                        'Crew reference',
   '/vendor-resources/westlake/installation-guide-vinyl-siding.pdf')
) AS assets(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'westlake-royal'
ON CONFLICT DO NOTHING;

-- Elite Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, 'catalog', 'Elite Roofing Supply Product Line Card', 'Quick reference product line card with all available materials and pricing tiers.', 'Quick ordering reference',
   '/vendor-resources/elite/product-line-card.pdf', 'roofing', true
FROM "Vendor" v
WHERE v.slug = 'elite-roofing-supply'
ON CONFLICT DO NOTHING;

-- Owens Corning Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, assets.asset_type, assets.title, assets.description, assets.use_case, assets.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure',       'OC Duration Shingle Brochure',         'Complete product brochure for TruDefinition Duration line with SureNail technology details.', 'Client presentation',
   'https://www.owenscorning.com/en-us/roofing/shingles/trudefinition-duration'),
  ('color_chart',    'OC Shingle Color Gallery',             'Full color gallery with all TruDefinition color blends and visualizer tool.',                 'Client color selection',
   'https://www.owenscorning.com/en-us/roofing/shingles/colors'),
  ('warranty_doc',   'OC Total Protection Warranty',         'Complete warranty documentation for Total Protection Roofing System.',                        'Client closing, registration',
   'https://www.owenscorning.com/en-us/roofing/warranty')
) AS assets(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'owens-corning'
ON CONFLICT DO NOTHING;

-- CertainTeed Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, assets.asset_type, assets.title, assets.description, assets.use_case, assets.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure',       'CertainTeed Landmark Brochure',        'Product brochure for Landmark and Landmark PRO architectural shingles.',     'Client presentation',
   'https://www.certainteed.com/residential-roofing/products/landmark/'),
  ('color_chart',    'CertainTeed Color Explorer',           'Full color exploration tool with all residential shingle color options.',     'Client color selection',
   'https://www.certainteed.com/residential-roofing/colors/'),
  ('warranty_doc',   'CertainTeed SureStart Warranty',       'SureStart and SureStart PLUS warranty details and registration process.',    'Client closing',
   'https://www.certainteed.com/residential-roofing/warranty/')
) AS assets(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'certainteed'
ON CONFLICT DO NOTHING;

-- TAMKO Assets
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid(), v.id, assets.asset_type, assets.title, assets.description, assets.use_case, assets.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure',       'TAMKO Heritage Series Brochure',        'Product brochure for Heritage laminated shingle line with color options.',    'Client presentation',
   'https://www.tamko.com/residential-roofing/heritage-shingles/'),
  ('spec_sheet',     'TAMKO MetalWorks Spec Sheet',           'Technical specifications for TAMKO MetalWorks stone-coated steel panels.',    'Engineering review',
   'https://www.tamko.com/metalworks/')
) AS assets(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'tamko'
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 10. VENDOR LOCATIONS — with hours
-- ============================================================================

-- ABC Supply Locations
INSERT INTO "VendorLocation" (id, "vendorId", name, address, city, state, zip, phone, email, hours, lat, lng, "deliveryRadiusMi", "deliveryCutoffTime", "localRepName", "localRepPhone", "isActive")
SELECT gen_random_uuid(), v.id, loc_name, address, city, 'AZ', zip, phone, email,
  '{"monday":"6:00 AM - 4:00 PM","tuesday":"6:00 AM - 4:00 PM","wednesday":"6:00 AM - 4:00 PM","thursday":"6:00 AM - 4:00 PM","friday":"6:00 AM - 4:00 PM","saturday":"7:00 AM - 12:00 PM","sunday":"Closed"}'::jsonb,
  lat, lng, delivery_radius, cutoff, rep_name, rep_phone, true
FROM "Vendor" v,
(VALUES
  ('ABC Supply - Phoenix',           '2828 E Washington St',    'Phoenix',          '85034', '602-275-5556', 'phoenix@abcsupply.com',    '33.4484', '-111.9970', 60, '2:00 PM', 'Mike Torres', '602-555-0101'),
  ('ABC Supply - Prescott Valley',   '7601 E Hwy 69',          'Prescott Valley',  '86314', '928-772-6882', 'prescott@abcsupply.com',   '34.5700', '-112.3268', 45, '1:00 PM', 'Josh Martinez', '928-555-0102'),
  ('ABC Supply - Flagstaff',         '2301 E Route 66',        'Flagstaff',        '86004', '928-526-3766', 'flagstaff@abcsupply.com',  '35.1983', '-111.6311', 50, '1:00 PM', 'Sarah Chen', '928-555-0103'),
  ('ABC Supply - Tucson',            '3960 E Irvington Rd',    'Tucson',           '85714', '520-294-7700', 'tucson@abcsupply.com',     '32.1540', '-110.9370', 55, '2:00 PM', 'Carlos Ruiz', '520-555-0104'),
  ('ABC Supply - Mesa',              '1550 S Country Club Dr',  'Mesa',            '85210', '480-833-5600', 'mesa@abcsupply.com',       '33.3942', '-111.8421', 50, '2:00 PM', 'Dave Wilson', '480-555-0105')
) AS locations(loc_name, address, city, zip, phone, email, lat, lng, delivery_radius, cutoff, rep_name, rep_phone)
WHERE v.slug = 'abc-supply'
ON CONFLICT DO NOTHING;

-- SRS Locations
INSERT INTO "VendorLocation" (id, "vendorId", name, address, city, state, zip, phone, hours, lat, lng, "deliveryRadiusMi", "isActive")
SELECT gen_random_uuid(), v.id, loc_name, address, city, 'AZ', zip, phone,
  '{"monday":"6:30 AM - 4:30 PM","tuesday":"6:30 AM - 4:30 PM","wednesday":"6:30 AM - 4:30 PM","thursday":"6:30 AM - 4:30 PM","friday":"6:30 AM - 4:30 PM","saturday":"7:00 AM - 11:30 AM","sunday":"Closed"}'::jsonb,
  lat, lng, delivery_radius, true
FROM "Vendor" v,
(VALUES
  ('SRS - Phoenix',    '4002 E University Dr',  'Phoenix',   '85034', '602-267-1818', '33.4214', '-111.9867', 55),
  ('SRS - Tucson',     '3701 E 44th St',        'Tucson',    '85713', '520-747-5656', '32.1837', '-110.9267', 50),
  ('SRS - Tempe',      '1920 E University Dr',  'Tempe',     '85281', '480-968-4545', '33.4214', '-111.9167', 45)
) AS locations(loc_name, address, city, zip, phone, lat, lng, delivery_radius)
WHERE v.slug = 'srs-distribution'
ON CONFLICT DO NOTHING;

-- Elite Roofing Supply Locations
INSERT INTO "VendorLocation" (id, "vendorId", name, address, city, state, zip, phone, hours, lat, lng, "deliveryRadiusMi", "emergencyPhone", "isActive")
SELECT gen_random_uuid(), v.id, loc_name, address, city, 'AZ', zip, phone,
  '{"monday":"5:30 AM - 4:00 PM","tuesday":"5:30 AM - 4:00 PM","wednesday":"5:30 AM - 4:00 PM","thursday":"5:30 AM - 4:00 PM","friday":"5:30 AM - 4:00 PM","saturday":"6:00 AM - 12:00 PM","sunday":"Closed"}'::jsonb,
  lat, lng, delivery_radius, emergency, true
FROM "Vendor" v,
(VALUES
  ('Elite Roofing Supply - Phoenix',   '4235 W Lower Buckeye Rd', 'Phoenix',   '85043', '602-437-1276', '33.4284', '-112.1167', 40, '602-437-1276'),
  ('Elite Roofing Supply - Chandler',  '700 N 56th St',           'Chandler',  '85226', '480-753-3700', '33.3062', '-111.9367', 35, '480-753-3700')
) AS locations(loc_name, address, city, zip, phone, lat, lng, delivery_radius, emergency)
WHERE v.slug = 'elite-roofing-supply'
ON CONFLICT DO NOTHING;


COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Vendors' as entity, COUNT(*) as count FROM "Vendor" WHERE "isActive" = true
UNION ALL
SELECT 'With tradeTypes', COUNT(*) FROM "Vendor" WHERE array_length("tradeTypes", 1) > 0
UNION ALL
SELECT 'Products', COUNT(*) FROM vendor_products_v2 WHERE "isActive" = true
UNION ALL
SELECT 'Programs', COUNT(*) FROM vendor_programs WHERE "isActive" = true
UNION ALL
SELECT 'Assets', COUNT(*) FROM vendor_assets WHERE "isActive" = true
UNION ALL
SELECT 'Locations', COUNT(*) FROM "VendorLocation" WHERE "isActive" = true;

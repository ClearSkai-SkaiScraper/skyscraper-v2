-- ============================================================================
-- VIN Seed — Real Products, Programs, Brochures for All Vendors
-- Replaces local /vendor-resources/ paths with real manufacturer URLs
-- Run: psql "$DATABASE_URL" -f ./db/migrations/20260313_seed_vin_real_data.sql
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- CLEAN existing seed data (safe re-run)
-- ────────────────────────────────────────────────────────────────────────────
DELETE FROM vendor_assets WHERE "pdfUrl" LIKE '/vendor-resources/%' OR "pdfUrl" IS NULL;
DELETE FROM vendor_products_v2 WHERE "brochureUrl" LIKE '/vendor-resources/%' OR "brochureUrl" IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- GAF — Products (10)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid()::text, v.id, 'roofing', p.sku, p.name, p.category, 'GAF', p.description, p.brochure, p.price_low, p.price_high, p.unit, true, p.features, p.tags, true
FROM "Vendor" v,
(VALUES
  ('GAF-THZ-01', 'Timberline HDZ Shingles', 'Laminated Shingles', 'Americas #1 selling shingle with LayerLock technology and StrikeZone nailing area.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/timberline-shingles/timberline-hdz-shingles', 95.00, 115.00, 'bundle', ARRAY['LayerLock','WindProven','StainGuard Plus'], ARRAY['shingles','architectural','premium']),
  ('GAF-THUHDZ-01', 'Timberline UHDZ Shingles', 'Laminated Shingles', 'Ultra-dimensional shingles with dual shadow line for striking curb appeal.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/timberline-shingles/timberline-uhdz-shingles', 110.00, 135.00, 'bundle', ARRAY['LayerLock','WindProven','StainGuard Plus','Ultra HD'], ARRAY['shingles','architectural','ultra-premium']),
  ('GAF-TAS-01', 'Timberline AS II Shingles', 'Laminated Shingles', 'Algae-resistant architectural shingles with StainGuard Plus protection.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/timberline-shingles', 85.00, 105.00, 'bundle', ARRAY['StainGuard Plus','LayerLock'], ARRAY['shingles','architectural']),
  ('GAF-SG-01', 'StormGuard Leak Barrier', 'Underlayment', 'Film-surfaced leak barrier for critical areas including valleys and eaves.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/leak-barriers/stormguard-film-surfaced-leak-barrier', 75.00, 95.00, 'roll', ARRAY['Self-sealing','Film surface','Ice dam protection'], ARRAY['underlayment','leak-barrier']),
  ('GAF-FT-01', 'FeltBuster Synthetic Underlayment', 'Underlayment', 'Lightweight synthetic underlayment that replaces traditional felt.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/roof-deck-protection/feltbuster-synthetic-roofing-underlayment', 55.00, 70.00, 'roll', ARRAY['Lightweight','Skid-resistant','UV stable 180 days'], ARRAY['underlayment','synthetic']),
  ('GAF-CV-01', 'Cobra Exhaust Vent', 'Ventilation', 'Ridge vent providing balanced attic ventilation for optimal energy efficiency.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/ventilation/cobra-exhaust-vent', 45.00, 65.00, 'piece', ARRAY['Exhaust ventilation','Weather protection'], ARRAY['ventilation','ridge-vent']),
  ('GAF-STR-01', 'TimberTex Hip & Ridge', 'Accessories', 'Premium hip and ridge cap shingles for finished look and added protection.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/hip-and-ridge-cap-shingles/timbertex-premium-ridge-cap-shingles', 60.00, 80.00, 'bundle', ARRAY['Color-matched','Double-layer'], ARRAY['accessories','hip-ridge']),
  ('GAF-DS-01', 'DecoShield Starter Strip', 'Accessories', 'Pre-cut starter strip for fast, easy installation at eaves and rakes.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/starter-strip-shingles', 25.00, 35.00, 'bundle', ARRAY['Pre-cut','Fast install'], ARRAY['accessories','starter-strip']),
  ('GAF-WW-01', 'WeatherWatch Leak Barrier', 'Underlayment', 'Mineral-surfaced leak barrier for use at eaves, valleys, and around penetrations.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/leak-barriers/weatherwatch-mineral-surfaced-leak-barrier', 65.00, 85.00, 'roll', ARRAY['Mineral surface','Self-sealing'], ARRAY['underlayment','leak-barrier']),
  ('GAF-MR-01', 'Master Flow Power Ventilator', 'Ventilation', 'Powered attic ventilator for maximum air flow in hot climates.', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/ventilation', 185.00, 250.00, 'piece', ARRAY['Thermostat controlled','High CFM'], ARRAY['ventilation','powered'])
) AS p(sku, name, category, description, brochure, price_low, price_high, unit, features, tags)
WHERE v.slug = 'gaf'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- OWENS CORNING — Products (6)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid()::text, v.id, 'roofing', p.sku, p.name, p.category, 'Owens Corning', p.description, p.brochure, p.price_low, p.price_high, p.unit, true, p.features, p.tags, true
FROM "Vendor" v,
(VALUES
  ('OC-TD-01', 'TruDefinition Duration Shingles', 'Laminated Shingles', 'Architectural shingles with patented SureNail Technology for 130 MPH wind resistance.', 'https://www.owenscorning.com/en-us/roofing/shingles/trudefinition-duration', 90.00, 110.00, 'bundle', ARRAY['SureNail','130 MPH wind','Total Protection'], ARRAY['shingles','architectural']),
  ('OC-TDFLEX-01', 'TruDefinition Duration FLEX', 'Laminated Shingles', 'SBS-modified shingles with extra flexibility for extreme temperature performance.', 'https://www.owenscorning.com/en-us/roofing/shingles/trudefinition-duration-flex', 100.00, 125.00, 'bundle', ARRAY['SBS modified','SureNail','Flexible'], ARRAY['shingles','architectural','sbs']),
  ('OC-STORM-01', 'Duration STORM Impact Resistant', 'Laminated Shingles', 'Class 4 impact-resistant shingles for hail-prone areas.', 'https://www.owenscorning.com/en-us/roofing/shingles/trudefinition-duration-storm', 120.00, 150.00, 'bundle', ARRAY['Class 4 impact','SureNail','Hail resistant'], ARRAY['shingles','impact-resistant']),
  ('OC-WA-01', 'WeatherLock G Ice & Water Barrier', 'Underlayment', 'Self-adhering ice and water barrier for critical roof areas.', 'https://www.owenscorning.com/en-us/roofing/underlayment', 70.00, 90.00, 'roll', ARRAY['Self-adhering','Ice dam protection'], ARRAY['underlayment','ice-water']),
  ('OC-PA-01', 'ProArmor Synthetic Underlayment', 'Underlayment', 'Premium synthetic underlayment with 180-day UV exposure.', 'https://www.owenscorning.com/en-us/roofing/underlayment', 50.00, 70.00, 'roll', ARRAY['Synthetic','UV stable','Lightweight'], ARRAY['underlayment','synthetic']),
  ('OC-VC-01', 'VentSure 4-Foot Strip', 'Ventilation', 'Rigid ridge vent for balanced attic ventilation.', 'https://www.owenscorning.com/en-us/roofing/ventilation', 40.00, 55.00, 'piece', ARRAY['Rigid design','Weather filter'], ARRAY['ventilation','ridge-vent'])
) AS p(sku, name, category, description, brochure, price_low, price_high, unit, features, tags)
WHERE v.slug = 'owens-corning'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- CERTAINTEED — Products (5)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid()::text, v.id, 'roofing', p.sku, p.name, p.category, 'CertainTeed', p.description, p.brochure, p.price_low, p.price_high, p.unit, true, p.features, p.tags, true
FROM "Vendor" v,
(VALUES
  ('CT-LM-01', 'Landmark Shingles', 'Laminated Shingles', 'Architectural shingles with dual-tone color blends and Max Def colors.', 'https://www.certainteed.com/residential-roofing/products/landmark/', 80.00, 100.00, 'bundle', ARRAY['Max Def colors','Dual-tone','StreakFighter'], ARRAY['shingles','architectural']),
  ('CT-LP-01', 'Landmark PRO Shingles', 'Laminated Shingles', 'Premium architectural shingles with thicker profile and enhanced granule adhesion.', 'https://www.certainteed.com/residential-roofing/products/landmark-pro/', 95.00, 120.00, 'bundle', ARRAY['Thick profile','NailTrak','StreakFighter'], ARRAY['shingles','architectural','premium']),
  ('CT-LI-01', 'Landmark Impact Resistant', 'Laminated Shingles', 'Class 4 impact-resistant shingles for hail-prone areas.', 'https://www.certainteed.com/residential-roofing/products/landmark-ir/', 115.00, 140.00, 'bundle', ARRAY['Class 4 IR','NailTrak','StreakFighter'], ARRAY['shingles','impact-resistant']),
  ('CT-DR-01', 'DiamondDeck Underlayment', 'Underlayment', 'Synthetic underlayment with excellent traction and tear resistance.', 'https://www.certainteed.com/residential-roofing/products/', 45.00, 65.00, 'roll', ARRAY['Synthetic','High traction','Tear resistant'], ARRAY['underlayment','synthetic']),
  ('CT-WG-01', 'WinterGuard Waterproofing', 'Underlayment', 'Self-adhering waterproofing for eaves, valleys, and penetrations.', 'https://www.certainteed.com/residential-roofing/products/', 65.00, 85.00, 'roll', ARRAY['Self-adhering','Waterproof'], ARRAY['underlayment','ice-water'])
) AS p(sku, name, category, description, brochure, price_low, price_high, unit, features, tags)
WHERE v.slug = 'certainteed'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- TAMKO — Products (4)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid()::text, v.id, 'roofing', p.sku, p.name, p.category, 'TAMKO', p.description, p.brochure, p.price_low, p.price_high, p.unit, true, p.features, p.tags, true
FROM "Vendor" v,
(VALUES
  ('TAM-HER-01', 'Heritage Laminated Shingles', 'Laminated Shingles', 'Architectural shingles with rich multi-toned color blends.', 'https://www.tamko.com/residential/roofing/heritage/', 75.00, 95.00, 'bundle', ARRAY['Algae resistant','Multi-tone'], ARRAY['shingles','architectural']),
  ('TAM-HV-01', 'Heritage Vintage Shingles', 'Laminated Shingles', 'Premium laminated shingles with deep shadow lines.', 'https://www.tamko.com/residential/roofing/heritage-vintage/', 90.00, 110.00, 'bundle', ARRAY['Deep shadow','Premium colors'], ARRAY['shingles','architectural','premium']),
  ('TAM-EGS-01', 'Elite Glass-Seal Shingles', 'Three-Tab Shingles', 'Traditional 3-tab shingles with consistent color and reliable performance.', 'https://www.tamko.com/residential/roofing/elite-glass-seal/', 55.00, 70.00, 'bundle', ARRAY['Economical','Consistent color'], ARRAY['shingles','3-tab']),
  ('TAM-TW-01', 'Titan XT Underlayment', 'Underlayment', 'Synthetic underlayment with reinforced slip-resistant coating.', 'https://www.tamko.com/residential/roofing/', 40.00, 55.00, 'roll', ARRAY['Synthetic','Slip resistant'], ARRAY['underlayment','synthetic'])
) AS p(sku, name, category, description, brochure, price_low, price_high, unit, features, tags)
WHERE v.slug = 'tamko'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- ABC SUPPLY — Products (4, distributor carries multiple brands)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid()::text, v.id, 'roofing', p.sku, p.name, p.category, p.manufacturer, p.description, p.brochure, p.price_low, p.price_high, p.unit, true, p.features, p.tags, true
FROM "Vendor" v,
(VALUES
  ('ABC-NAIL-01', 'Coil Roofing Nails 1-1/4"', 'Fasteners', 'GAF', 'Galvanized coil roofing nails for pneumatic nailers. 7200/box.', 'https://www.abcsupply.com/products/roofing/', 45.00, 55.00, 'box', ARRAY['Galvanized','Pneumatic coil'], ARRAY['fasteners','nails']),
  ('ABC-FLSH-01', 'Step Flashing 4x4x8"', 'Flashing', 'Various', 'Pre-bent aluminum step flashing for sidewall-to-roof transitions.', 'https://www.abcsupply.com/products/roofing/', 25.00, 35.00, 'bundle', ARRAY['Pre-bent','Aluminum'], ARRAY['flashing','accessories']),
  ('ABC-DRIP-01', 'Drip Edge 10ft White', 'Accessories', 'Various', 'Standard T-style drip edge for eave and rake protection.', 'https://www.abcsupply.com/products/roofing/', 8.00, 12.00, 'piece', ARRAY['Aluminum','Pre-painted'], ARRAY['accessories','drip-edge']),
  ('ABC-VENT-01', 'Off Ridge Vent 4ft', 'Ventilation', 'Various', 'Low-profile off-ridge vent for supplemental attic ventilation.', 'https://www.abcsupply.com/products/roofing/', 20.00, 30.00, 'piece', ARRAY['Low profile','Weather filter'], ARRAY['ventilation','off-ridge'])
) AS p(sku, name, category, manufacturer, description, brochure, price_low, price_high, unit, features, tags)
WHERE v.slug = 'abc-supply'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- SRS DISTRIBUTION — Products (3)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO vendor_products_v2 (id, "vendorId", "tradeType", sku, name, category, manufacturer, description, "brochureUrl", "priceRangeLow", "priceRangeHigh", unit, "inStock", features, tags, "isActive")
SELECT gen_random_uuid()::text, v.id, 'roofing', p.sku, p.name, p.category, p.manufacturer, p.description, p.brochure, p.price_low, p.price_high, p.unit, true, p.features, p.tags, true
FROM "Vendor" v,
(VALUES
  ('SRS-PIPE-01', 'Pipe Boot 1-3"', 'Flashing', 'Various', 'EPDM rubber pipe boot flashing for plumbing vent penetrations.', 'https://www.srsdistribution.com/products/', 12.00, 18.00, 'piece', ARRAY['EPDM rubber','UV resistant'], ARRAY['flashing','pipe-boot']),
  ('SRS-RIDGE-01', 'Universal Ridge Cap', 'Accessories', 'Various', 'Pre-bent universal ridge cap shingles. Compatible with most architectural lines.', 'https://www.srsdistribution.com/products/', 55.00, 75.00, 'bundle', ARRAY['Universal fit','Pre-bent'], ARRAY['accessories','ridge-cap']),
  ('SRS-TARP-01', 'Emergency Roof Tarp 20x30', 'Emergency', 'Various', 'Heavy-duty blue poly tarp for emergency storm damage protection.', 'https://www.srsdistribution.com/products/', 35.00, 50.00, 'piece', ARRAY['Heavy duty','UV treated','Grommeted'], ARRAY['emergency','tarp'])
) AS p(sku, name, category, manufacturer, description, brochure, price_low, price_high, unit, features, tags)
WHERE v.slug = 'srs-distribution'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- PROGRAMS & REBATES
-- ════════════════════════════════════════════════════════════════════════════

-- GAF Programs (5)
INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, eligibility, amount, "percentOff", "applicationUrl", "isActive")
SELECT gen_random_uuid()::text, v.id, p.ptype, p.name, p.description, p.eligibility, p.amount, p.pct, p.url, true
FROM "Vendor" v,
(VALUES
  ('rebate', 'GAF Master Elite Contractor Rebate', 'Earn rebates on qualifying GAF product purchases through the Factory-Certified program.', 'GAF Master Elite or Certified contractors', 500.00::numeric, NULL::numeric, 'https://www.gaf.com/en-us/for-professionals'),
  ('rebate', 'GAF Timberline HDZ Contractor Rebate', '$2/bundle rebate on Timberline HDZ purchases through qualifying distributor.', 'Certified GAF contractors', 200.00::numeric, NULL::numeric, 'https://www.gaf.com/en-us/for-professionals'),
  ('financing', 'GAF Smart Choice Financing', 'Offer homeowners financing options for GAF roofing systems at competitive rates.', 'GAF Factory-Certified contractors', NULL::numeric, NULL::numeric, 'https://www.gaf.com/en-us/for-professionals/tools/financing'),
  ('training', 'GAF CARE Training Program', 'Free training courses for contractors covering installation, sales, and safety.', 'All contractors', NULL::numeric, NULL::numeric, 'https://www.gaf.com/en-us/for-professionals/training'),
  ('warranty', 'Golden Pledge Limited Warranty', 'Premium warranty with 50-year non-prorated coverage and workmanship guarantee.', 'GAF Master Elite contractors only', NULL::numeric, NULL::numeric, 'https://www.gaf.com/en-us/for-homeowners/warranties')
) AS p(ptype, name, description, eligibility, amount, pct, url)
WHERE v.slug = 'gaf'
ON CONFLICT DO NOTHING;

-- Owens Corning Programs (3)
INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, eligibility, "applicationUrl", "isActive")
SELECT gen_random_uuid()::text, v.id, p.ptype, p.name, p.description, p.eligibility, p.url, true
FROM "Vendor" v,
(VALUES
  ('rebate', 'OC Preferred Contractor Rewards', 'Earn points on qualifying Owens Corning purchases redeemable for merchandise, trips, and business tools.', 'Owens Corning Preferred Contractors', 'https://www.owenscorning.com/en-us/roofing/contractors'),
  ('training', 'OC University Online Training', 'Free online courses covering product knowledge, installation techniques, and sales strategies.', 'All contractors', 'https://www.owenscorning.com/en-us/roofing/contractors'),
  ('warranty', 'Total Protection Roofing System Warranty', 'Complete system warranty covering all OC components when installed together by a credentialed contractor.', 'Platinum Preferred Contractors', 'https://www.owenscorning.com/en-us/roofing/warranty')
) AS p(ptype, name, description, eligibility, url)
WHERE v.slug = 'owens-corning'
ON CONFLICT DO NOTHING;

-- CertainTeed Programs (2)
INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, eligibility, "applicationUrl", "isActive")
SELECT gen_random_uuid()::text, v.id, p.ptype, p.name, p.description, p.eligibility, p.url, true
FROM "Vendor" v,
(VALUES
  ('rebate', 'CertainTeed SELECT ShingleMaster Rewards', 'Annual rebate program for qualifying roofing product purchases.', 'SELECT ShingleMaster certified contractors', 'https://www.certainteed.com/credentials/'),
  ('warranty', 'SureStart PLUS Warranty', '5-Star warranty with 50-year non-prorated coverage on materials and workmanship.', 'SELECT ShingleMaster or Master Shingle Applicator', 'https://www.certainteed.com/residential-roofing/warranty/')
) AS p(ptype, name, description, eligibility, url)
WHERE v.slug = 'certainteed'
ON CONFLICT DO NOTHING;

-- ABC Supply Programs (2)
INSERT INTO vendor_programs (id, "vendorId", "programType", name, description, eligibility, "applicationUrl", "isActive")
SELECT gen_random_uuid()::text, v.id, p.ptype, p.name, p.description, p.eligibility, p.url, true
FROM "Vendor" v,
(VALUES
  ('rebate', 'ABC Supply Contractor Rewards', 'Earn points on every purchase redeemable for tools, trips, and business services.', 'All registered contractors', 'https://www.abcsupply.com/contractor-rewards/'),
  ('financing', 'ABC Supply Trade Credit', 'Business credit lines for qualified contractors with net-30 terms.', 'Approved contractor accounts', 'https://www.abcsupply.com/')
) AS p(ptype, name, description, eligibility, url)
WHERE v.slug = 'abc-supply'
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- BROCHURES & CATALOGS (vendor_assets)
-- Using real manufacturer URLs that open PDFs or product pages directly
-- ════════════════════════════════════════════════════════════════════════════

-- GAF Brochures (6)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure', 'Timberline HDZ Product Brochure', 'Complete product guide for Americas #1 selling shingle with LayerLock technology.', 'Client presentation, proposal attachment', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/timberline-shingles/timberline-hdz-shingles'),
  ('brochure', 'GAF Lifetime Roofing System', 'Full system overview: shingles, underlayment, ventilation, and accessories working together.', 'Sales presentation, estimate support', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products'),
  ('install_guide', 'GAF Residential Installation Manual', 'Step-by-step installation guide for all GAF residential roofing systems.', 'Crew reference, quality control', 'https://www.gaf.com/en-us/for-professionals/resources/product-documentation'),
  ('warranty_doc', 'GAF System Warranty Guide', 'Complete warranty documentation: Golden Pledge, Silver Pledge, and System Plus.', 'Client closing, warranty registration', 'https://www.gaf.com/en-us/for-homeowners/warranties'),
  ('spec_sheet', 'GAF StormGuard Leak Barrier Specs', 'Technical specifications and ASTM test results for StormGuard products.', 'Engineering review, code compliance', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/leak-barriers/stormguard-film-surfaced-leak-barrier'),
  ('color_chart', 'GAF Shingle Color Selector', 'Interactive color selection tool with neighborhood visualizer for all shingle lines.', 'Client color selection, design consultation', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-products/shingles')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'gaf'
ON CONFLICT DO NOTHING;

-- Owens Corning Brochures (5)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure', 'OC TruDefinition Duration Brochure', 'Complete product brochure for Duration line with SureNail technology details.', 'Client presentation, sales tool', 'https://www.owenscorning.com/en-us/roofing/shingles/trudefinition-duration'),
  ('brochure', 'OC Total Protection System Guide', 'How all OC components work together for Total Protection Roofing System.', 'System selling, proposal support', 'https://www.owenscorning.com/en-us/roofing/total-protection-roofing-system'),
  ('color_chart', 'OC Shingle Color Gallery', 'Full color gallery with all TruDefinition color blends and visualizer tool.', 'Client color selection', 'https://www.owenscorning.com/en-us/roofing/shingles/colors'),
  ('warranty_doc', 'OC Warranty Information', 'Complete warranty documentation for Total Protection Roofing System.', 'Client closing, registration', 'https://www.owenscorning.com/en-us/roofing/warranty'),
  ('catalog', 'OC Insulation Product Catalog', 'PINK Fiberglas, FOAMULAR XPS, and blown-in insulation product catalog.', 'Insulation projects, energy audits', 'https://www.owenscorning.com/en-us/insulation')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'owens-corning'
ON CONFLICT DO NOTHING;

-- CertainTeed Brochures (4)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure', 'CertainTeed Landmark Shingles Brochure', 'Complete product guide for Landmark series shingles with Max Def colors.', 'Client presentation', 'https://www.certainteed.com/residential-roofing/products/landmark/'),
  ('install_guide', 'CertainTeed Installation Manual', 'Complete installation guide for all CertainTeed residential shingles.', 'Crew reference', 'https://www.certainteed.com/residential-roofing/resources/'),
  ('warranty_doc', 'CertainTeed Warranty Guide', 'SureStart warranty coverage, registration, and transferability details.', 'Client closing', 'https://www.certainteed.com/residential-roofing/warranty/'),
  ('color_chart', 'CertainTeed Color Selection Guide', 'Complete color palette for all CertainTeed shingle products.', 'Client color selection', 'https://www.certainteed.com/residential-roofing/color-selector/')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'certainteed'
ON CONFLICT DO NOTHING;

-- TAMKO Brochures (3)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('brochure', 'TAMKO Heritage Shingles Brochure', 'Product information for Heritage laminated shingles with color options.', 'Client presentation', 'https://www.tamko.com/residential/roofing/heritage/'),
  ('spec_sheet', 'TAMKO Elite Glass-Seal Spec Sheet', 'Technical specifications for Elite Glass-Seal 3-tab shingles.', 'Product comparison', 'https://www.tamko.com/residential/roofing/elite-glass-seal/'),
  ('warranty_doc', 'TAMKO Warranty Guide', 'Limited warranty coverage for all TAMKO roofing products.', 'Client closing', 'https://www.tamko.com/support/warranties/')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'tamko'
ON CONFLICT DO NOTHING;

-- ABC Supply Brochures (3)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('catalog', 'ABC Supply Product Catalog', 'Full product catalog covering roofing, siding, windows, and accessories.', 'Product ordering, spec lookup', 'https://www.abcsupply.com/products/roofing/'),
  ('brochure', 'ABC Supply Contractor Services', 'Services overview: delivery, tool rental, estimating support, and training.', 'Vendor capabilities review', 'https://www.abcsupply.com/services/'),
  ('brochure', 'ABC Contractor Rewards Program', 'Details on the ABC Supply contractor loyalty and rewards program.', 'Business development', 'https://www.abcsupply.com/contractor-rewards/')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'abc-supply'
ON CONFLICT DO NOTHING;

-- SRS Distribution Brochures (2)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('catalog', 'SRS Residential Roofing Catalog', 'Complete residential product catalog with all brands carried by SRS.', 'Product selection, ordering', 'https://www.srsdistribution.com/products/'),
  ('brochure', 'SRS Delivery & Logistics Guide', 'Rooftop delivery scheduling, staging requirements, and lead times.', 'Job logistics, delivery coordination', 'https://www.srsdistribution.com/')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'srs-distribution'
ON CONFLICT DO NOTHING;

-- Westlake Royal Brochures (2)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('catalog', 'Westlake Product Catalog', 'Full product line covering stone-coated steel, concrete tile, and polymer products.', 'Product selection', 'https://www.westlakeroyalbuildingproducts.com/products/'),
  ('brochure', 'Westlake Stone-Coated Steel Guide', 'Product guide for DECRA and other stone-coated steel roofing systems.', 'Premium roofing proposals', 'https://www.westlakeroyalbuildingproducts.com/products/roofing/')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'westlake-royal'
ON CONFLICT DO NOTHING;

-- Elite Roofing Supply Brochures (2)
INSERT INTO vendor_assets (id, "vendorId", type, title, description, "jobUseCase", "pdfUrl", "tradeType", "isActive")
SELECT gen_random_uuid()::text, v.id, a.asset_type, a.title, a.description, a.use_case, a.pdf_url, 'roofing', true
FROM "Vendor" v,
(VALUES
  ('catalog', 'Elite Roofing Supply Product Line Card', 'Quick reference product line card with all available materials.', 'Quick ordering reference', 'https://www.eliteroofingsupply.com/'),
  ('brochure', 'Elite Local Delivery Guide', 'Same-day and next-day delivery zones, hours, and staging requirements for Phoenix metro.', 'Delivery coordination', 'https://www.eliteroofingsupply.com/')
) AS a(asset_type, title, description, use_case, pdf_url)
WHERE v.slug = 'elite-roofing-supply'
ON CONFLICT DO NOTHING;

COMMIT;

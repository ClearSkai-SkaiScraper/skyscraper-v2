-- ============================================================================
-- Comprehensive Supplier, Dealer & Distributor Seed
-- The companies pros ACTUALLY order from — not the manufacturers
-- Execute: psql "$DATABASE_URL" -f ./db/seed-vin-suppliers-dealers.sql
-- ============================================================================
-- 90% of the time contractors order from suppliers/dealers/distributors,
-- NOT directly from the manufacturer. This seed covers every trade category
-- with the major suppliers and distribution companies.
-- Uses ON CONFLICT DO UPDATE to enrich existing rows.
-- ============================================================================

BEGIN;
SET search_path TO app, public;

-- ═══════════════════════════════════════════════════════════════════════════
-- HVAC SUPPLIERS & DISTRIBUTORS
-- Where pros actually buy HVAC equipment and parts
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('carrier-enterprise','Carrier Enterprise','Largest HVAC distributor in the US. Carrier, Bryant, Payne equipment. Parts, supplies, and controls. 200+ locations.','HVAC Distributor','https://www.carrierenterprise.com','(800) 586-8336','info@carrierenterprise.com',true,true,true,NOW(),'{hvac}','{distributor,dealer}','{national}',4.55,8400,'{Carrier Factory Authorized}',true,true),
  ('re-michel','RE Michel Company','HVAC/R parts, equipment, and supplies since 1935. 450+ locations across 27 states. Same-day delivery.','HVAC Parts Distributor','https://www.remichel.com','(800) 638-4535','info@remichel.com',true,false,true,NOW(),'{hvac}','{distributor}','{east,southeast,midwest}',4.45,5200,'{}',false,false),
  ('watsco','Watsco / Gemaire Distributors','World''s largest HVAC distributor. Gemaire, Comfort Products, ACR Group brands. 670+ locations.','HVAC Distributor','https://www.watsco.com','(305) 714-4100','info@watsco.com',true,true,true,NOW(),'{hvac}','{distributor}','{national}',4.50,7800,'{}',true,true),
  ('baker-distributing','Baker Distributing Company','Full-line HVAC/R distributor. Equipment, parts, controls, and sheet metal. 200+ locations.','HVAC Distributor','https://www.bakerdist.com','(800) 765-1456','info@bakerdist.com',true,false,true,NOW(),'{hvac}','{distributor}','{national}',4.40,4600,'{}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- PLUMBING SUPPLIERS & DISTRIBUTORS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('core-main','Core & Main','Water, sewer, storm drain, and fire protection. Formerly HD Supply Waterworks. 300+ branches.','Waterworks Distributor','https://www.coreandmain.com','(314) 432-4700','info@coreandmain.com',true,true,true,NOW(),'{plumbing}','{distributor}','{national}',4.50,6200,'{}',true,false),
  ('fw-webb','F.W. Webb Company','Plumbing, HVAC, fire protection, and PVF. Largest distributor in the Northeast. Pro showrooms.','Plumbing Distributor','https://www.fwwebb.com','(800) 362-9322','info@fwwebb.com',true,false,true,NOW(),'{plumbing,hvac}','{distributor}','{northeast}',4.55,3800,'{F.W. Webb Pro Partner}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ELECTRICAL SUPPLIERS & DISTRIBUTORS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('ced-electrical','Consolidated Electrical Distributors','Full-line electrical, lighting, and automation supplies. 700+ locations.','Electrical Distributor','https://www.cedcareers.com','(972) 650-3800','info@ced.net',true,true,true,NOW(),'{electrical}','{distributor}','{national}',4.45,5800,'{}',false,false),
  ('wesco','WESCO International','Electrical, communications, data networking, and industrial supplies. Global network.','Electrical & Industrial Distributor','https://www.wesco.com','(412) 454-2200','info@wesco.com',true,false,true,NOW(),'{electrical}','{distributor}','{national}',4.40,4200,'{}',false,false),
  ('border-states','Border States Electric','Employee-owned electrical distributor. 130+ branches. Strong contractor programs.','Electrical Distributor','https://www.borderstates.com','(701) 232-7281','info@borderstates.com',true,false,true,NOW(),'{electrical}','{distributor}','{midwest,west}',4.50,3400,'{Employee-Owned}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- SOLAR SUPPLIERS & DISTRIBUTORS
-- Where solar pros actually buy panels, inverters, and racking
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('ced-greentech','CED Greentech','#1 solar distributor in the US. Panels, inverters, racking, batteries, EV chargers. 50+ warehouses.','Solar Distributor','https://www.cedgreentech.com','(855) 233-4783','info@cedgreentech.com',true,true,true,NOW(),'{solar}','{distributor}','{national}',4.55,6800,'{NABCEP Approved Distributor}',true,true),
  ('baywa-re','BayWa r.e. Solar Distribution','Solar modules, inverters, storage, and racking. Global supply chain with US warehouses.','Solar Distributor','https://solar-distribution.baywa-re.us','(888) 229-9270','solar.us@baywa-re.com',true,false,true,NOW(),'{solar}','{distributor}','{national}',4.45,3200,'{}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- LANDSCAPING SUPPLIERS & DISTRIBUTORS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('ewing-outdoor','Ewing Outdoor Supply','Irrigation, landscape, turf, and outdoor lighting. 220+ locations. Green Industry hub.','Landscape Distributor','https://www.ewingirrigation.com','(800) 343-9464','info@ewingirrigation.com',true,true,true,NOW(),'{landscaping}','{distributor}','{national}',4.50,4800,'{Ewing Pro Partner}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- POOLS & SPAS SUPPLIERS & DISTRIBUTORS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('leslies-pool','Leslie''s Pool Supplies','Largest pool supplies retailer. Chemicals, equipment, parts, and accessories. 1000+ locations.','Pool Supply Dealer','https://www.lesliespool.com','(800) 537-5437','pro@lesliespool.com',true,true,true,NOW(),'{pools}','{distributor,dealer}','{national}',4.35,14200,'{Leslie''s Pro Program}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- CONCRETE & MASONRY SUPPLIERS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('calportland','CalPortland','Ready-mix concrete, cement, aggregates, and asphalt. Major West Coast supplier.','Concrete Supplier','https://www.calportland.com','(888) 777-3640','info@calportland.com',true,true,true,NOW(),'{concrete}','{supplier}','{west,southwest}',4.50,5800,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- GENERAL / MULTI-TRADE SUPPLIERS & DISTRIBUTORS
-- The big box and industrial suppliers pros use across all trades
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('grainger','W.W. Grainger','#1 industrial distribution company. MRO products, safety, tools, fasteners, and building materials. 300+ branches.','Industrial Distributor','https://www.grainger.com','(800) 472-4643','info@grainger.com',true,true,true,NOW(),'{general_contractor,electrical,plumbing,hvac}','{distributor}','{national}',4.55,18400,'{Grainger Pro Account}',true,false),
  ('united-rentals','United Rentals','Largest equipment rental company. Aerial, earthmoving, material handling, power, and climate control.','Equipment Rental','https://www.unitedrentals.com','(800) 877-3687','info@unitedrentals.com',true,true,true,NOW(),'{demolition,excavation,general_contractor}','{service_provider}','{national}',4.50,12600,'{United Academy Certified}',true,false),
  ('bmc-building','BMC Building Materials','Lumber, trusses, millwork, doors, and windows. Contractor-focused building supply.','Building Supply Distributor','https://www.buildwithbmc.com','(919) 431-1000','info@buildwithbmc.com',true,false,true,NOW(),'{framing,windows,doors,general_contractor}','{distributor}','{east,southeast,midwest}',4.40,3800,'{}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- FLOORING & TILE DISTRIBUTORS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('msi-surfaces','MSI Surfaces','Natural stone, porcelain, LVT, quartz countertops. 35+ distribution centers.','Tile & Surface Distributor','https://www.msisurfaces.com','(800) 580-6674','info@msisurfaces.com',true,true,true,NOW(),'{tile,countertops,flooring}','{distributor}','{national}',4.50,7200,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- PAINT DEALERS & STORES
-- Pros buy paint from the store/dealer, not the factory
-- ═══════════════════════════════════════════════════════════════════════════
-- Note: Sherwin-Williams, Benjamin Moore, PPG are already in vendorLogos as
-- manufacturers. They also act as their own dealers through retail stores.
-- We update them to include 'dealer' in vendorTypes so they appear in VIN.
UPDATE "Vendor" SET
  "vendorTypes" = ARRAY(SELECT DISTINCT unnest("vendorTypes" || '{dealer}'))
WHERE "slug" IN ('sherwin-williams','benjamin-moore','ppg-paints')
  AND NOT "vendorTypes" @> '{dealer}';

COMMIT;

-- Verify counts
SELECT
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true AND "vendorTypes" @> '{distributor}') AS distributors,
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true AND "vendorTypes" @> '{dealer}') AS dealers,
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true AND "vendorTypes" @> '{supplier}') AS suppliers,
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true AND "vendorTypes" @> '{manufacturer}') AS manufacturers,
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true) AS total;

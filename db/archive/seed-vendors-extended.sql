-- ============================================================================
-- Comprehensive Vendor Seed — Extended Trades (v3)
-- Execute: psql "$DATABASE_URL" -f ./db/seed-vendors-extended.sql
-- ============================================================================
-- Adds missing trade categories: Tile/Stone, Concrete/Masonry, Drywall,
-- Cabinets/Countertops, Appliances, Solar, Fencing, Stucco/EIFS,
-- Restoration/Water/Mold, Pools/Spas, Foundation, Landscaping,
-- Demolition/Excavation, + extended Paint/Distributors/Suppliers
-- Uses ON CONFLICT DO UPDATE to enrich existing rows.
-- ============================================================================

BEGIN;
SET search_path TO app, public;

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL WINDOWS / DOORS (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('mi-windows','MI Windows and Doors','Vinyl, aluminum, and impact-resistant windows. 1687, 3500, and V3 series.','Window Manufacturer','https://www.miwindows.com','(800) 644-1461','info@miwindows.com',true,false,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.35,3800,'{MI Certified Dealer}',true,true),
  ('weather-shield','Weather Shield Windows & Doors','Premium wood and clad windows. Visions, Premium, Contemporary lines.','Window Manufacturer','https://www.weathershield.com','(800) 477-6808','info@weathershield.com',true,false,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.45,2900,'{Weather Shield Authorized}',true,false),
  ('kolbe-windows','Kolbe Windows & Doors','Ultra, Heritage, and VistaLuxe collections. Custom architectural windows.','Window Manufacturer','https://www.kolbewindows.com','(800) 955-8177','info@kolbewindows.com',true,false,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.60,2200,'{Kolbe Authorized Dealer}',true,false),
  ('therma-tru','Therma-Tru Doors','#1 entry door brand. Classic-Craft, Fiber-Classic, Smooth-Star lines.','Door Manufacturer','https://www.thermatru.com','(800) 843-7628','info@thermatru.com',true,true,true,NOW(),'{doors}','{manufacturer}','{national}',4.55,7800,'{Therma-Tru Certified Installer}',true,true),
  ('masonite-doors','Masonite','Interior and exterior doors. Heritage, VistaGrande, Performance Door System.','Door Manufacturer','https://www.masonite.com','(800) 895-2723','info@masonite.com',true,false,true,NOW(),'{doors}','{manufacturer}','{national}',4.40,5100,'{Masonite Certified}',false,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL SIDING (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('norandex-siding','Norandex','Vinyl siding, trim, accessories. Sagebrush, Regatta, MainStreet lines.','Siding Manufacturer','https://www.norandex.com','(800) 528-0942','info@norandex.com',true,false,true,NOW(),'{siding}','{manufacturer}','{national}',4.20,2100,'{Norandex Certified}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL HVAC (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('ruud-hvac','Ruud','Air conditioners, heat pumps, water heaters. Achiever Plus, Ultra series.','HVAC Manufacturer','https://www.ruud.com','(800) 621-5622','info@ruud.com',true,false,true,NOW(),'{hvac}','{manufacturer}','{national}',4.40,4600,'{Ruud Pro Partner}',true,true),
  ('mitsubishi-hvac','Mitsubishi Electric HVAC','Ductless mini-splits, multi-zone, VRF. M-Series, P-Series.','HVAC Manufacturer','https://www.mitsubishicomfort.com','(800) 433-4822','info@mitsubishicomfort.com',true,true,true,NOW(),'{hvac}','{manufacturer}','{national}',4.65,7200,'{Diamond Contractor,Ductless Pro}',true,true),
  ('fujitsu-hvac','Fujitsu General','Halcyon and Airstage ductless HVAC systems. Single and multi-zone.','HVAC Manufacturer','https://www.fujitsugeneral.com','(888) 888-3424','info@fujitsugeneral.com',true,false,true,NOW(),'{hvac}','{manufacturer}','{national}',4.45,3800,'{Fujitsu Elite Installer}',true,true),
  ('honeywell','Honeywell Home','Smart thermostats, IAQ, humidifiers. T-Series, VisionPRO, Lyric.','HVAC Controls Manufacturer','https://www.honeywellhome.com','(800) 468-1502','info@honeywellhome.com',true,true,true,NOW(),'{hvac}','{manufacturer}','{national}',4.55,18400,'{Honeywell Pro Partner}',false,false),
  ('ecobee','ecobee','Smart thermostats with room sensors. SmartThermostat Premium, Enhanced.','Smart Home Manufacturer','https://www.ecobee.com','(877) 932-6233','info@ecobee.com',true,false,true,NOW(),'{hvac}','{manufacturer}','{national}',4.50,9200,'{ecobee Pro}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL PLUMBING (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('bradford-white','Bradford White','Water heaters — gas, electric, tankless. eF Series, AeroTherm.','Plumbing Manufacturer','https://www.bradfordwhite.com','(800) 523-2931','info@bradfordwhite.com',true,false,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.50,4800,'{Bradford White Certified}',true,false),
  ('grohe','GROHE','Premium faucets, showers, kitchen. Euphoria, Essence, Ladylux.','Plumbing Manufacturer','https://www.grohe.us','(800) 444-7643','info@grohe.us',true,false,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.60,5600,'{GROHE Professional}',false,true),
  ('pfister-faucets','Pfister','Kitchen and bath faucets. React touchless, Deckard, Stellen.','Plumbing Manufacturer','https://www.pfisterfaucets.com','(800) 732-8238','info@pfisterfaucets.com',true,false,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.35,4200,'{Pfister Pro Partner}',false,true),
  ('insinkerator','InSinkErator','Garbage disposals and hot water dispensers. Evolution, Badger.','Plumbing Manufacturer','https://www.insinkerator.com','(800) 558-5700','info@insinkerator.com',true,false,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.45,8600,'{InSinkErator Pro}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL ELECTRICAL (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('ge-electrical','GE Electrical','Current by GE lighting. LED, connected lighting, fixtures.','Electrical Manufacturer','https://www.gecurrent.com','(800) 626-2000','info@gecurrent.com',true,false,true,NOW(),'{electrical}','{manufacturer}','{national}',4.40,3200,'{GE Authorized}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL PAINT (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('valspar','Valspar','Interior and exterior paints. Reserve, Ultra, Signature lines. Lowe''s exclusive.','Paint Manufacturer','https://www.valspar.com','(800) 845-9061','info@valspar.com',true,false,true,NOW(),'{painting}','{manufacturer}','{national}',4.40,11200,'{Valspar Pro Partner}',false,true),
  ('rust-oleum','Rust-Oleum','Specialty coatings, primers, sprays. Stops Rust, Universal, Painter''s Touch.','Paint & Coatings Manufacturer','https://www.rustoleum.com','(800) 553-8444','info@rustoleum.com',true,false,true,NOW(),'{painting}','{manufacturer}','{national}',4.50,14600,'{Rust-Oleum Pro}',false,true),
  ('diamond-vogel','Diamond Vogel','Premium architectural coatings. Interior and exterior, industrial coatings.','Paint Manufacturer','https://www.diamondvogel.com','(800) 553-8444','info@diamondvogel.com',true,false,true,NOW(),'{painting}','{manufacturer}','{midwest,southwest}',4.40,2800,'{Diamond Vogel Pro}',false,true),
  ('california-paints','California Paints','West Coast premium paints. Storm Coat, Fres-Coat, Ultra Aquaborne.','Paint Manufacturer','https://www.californiapaints.com','(800) 225-1141','info@californiapaints.com',true,false,true,NOW(),'{painting}','{manufacturer}','{west}',4.35,1900,'{California Paints Pro}',false,true),
  ('farrow-ball','Farrow & Ball','Luxury paints and wallpapers. Eco-friendly, rich pigment formulations.','Paint Manufacturer','https://www.farrow-ball.com','(888) 511-1121','info@farrow-ball.com',true,false,true,NOW(),'{painting}','{manufacturer}','{national}',4.70,3200,'{Farrow & Ball Specified Painter}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL FLOORING (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('coretec-floors','COREtec Floors','Waterproof luxury vinyl plank. COREtec Plus, Pro Plus, Originals.','Flooring Manufacturer','https://www.coretecfloors.com','(866) 267-3832','info@coretecfloors.com',true,false,true,NOW(),'{flooring}','{manufacturer}','{national}',4.55,6400,'{COREtec Certified}',true,true),
  ('daltile','Daltile','Ceramic, porcelain, natural stone, mosaics. Largest US tile manufacturer.','Tile & Flooring Manufacturer','https://www.daltile.com','(800) 933-8453','info@daltile.com',true,true,true,NOW(),'{flooring,tile}','{manufacturer}','{national}',4.55,9200,'{Daltile Preferred Installer}',true,true),
  ('msi-surfaces','MSI Surfaces','Quartz, natural stone, porcelain, LVT. Premium surfaces nationwide.','Surfaces Manufacturer','https://www.msisurfaces.com','(800) 532-0294','info@msisurfaces.com',true,true,true,NOW(),'{flooring,tile,countertops}','{manufacturer}','{national}',4.50,7800,'{MSI Preferred Dealer}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- TILE & STONE
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('florida-tile','Florida Tile','Porcelain and ceramic tile. TekTile, HDP, and Streamline collections.','Tile Manufacturer','https://www.floridatile.com','(800) 352-8453','info@floridatile.com',true,false,true,NOW(),'{tile}','{manufacturer}','{national}',4.40,3600,'{Florida Tile Preferred}',false,true),
  ('american-olean','American Olean','Dal-Tile subsidiary. Ceramic, porcelain, glass, natural stone.','Tile Manufacturer','https://www.americanolean.com','(888) 268-8453','info@americanolean.com',true,false,true,NOW(),'{tile}','{manufacturer}','{national}',4.45,4200,'{American Olean Certified}',true,true),
  ('emser-tile','Emser Tile','Premium tile and natural stone. 65+ showrooms. 5000+ products.','Tile Manufacturer','https://www.emser.com','(323) 650-2000','info@emser.com',true,false,true,NOW(),'{tile}','{manufacturer}','{national}',4.50,3100,'{Emser Pro Dealer}',true,false),
  ('bedrosians','Bedrosians Tile & Stone','Family-owned since 1948. Porcelain, natural stone, mosaics.','Tile Manufacturer','https://www.bedrosians.com','(800) 232-3767','info@bedrosians.com',true,false,true,NOW(),'{tile}','{manufacturer}','{national}',4.45,2800,'{Bedrosians Pro}',true,false),
  ('schluter-systems','Schluter Systems','Tile installation systems — DITRA, KERDI, RONDEC profiles.','Tile Installation Manufacturer','https://www.schluter.com','(800) 472-4588','info@schluter.com',true,true,true,NOW(),'{tile}','{manufacturer}','{national}',4.70,5600,'{Schluter SET Certified,DITRA Certified}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- CONCRETE & MASONRY
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('quikrete','QUIKRETE','Concrete, mortar, stucco, blacktop. America''s #1 packaged concrete.','Concrete Manufacturer','https://www.quikrete.com','(800) 282-5828','info@quikrete.com',true,true,true,NOW(),'{concrete,masonry}','{manufacturer}','{national}',4.55,12400,'{QUIKRETE Pro}',false,false),
  ('sakrete','Sakrete','Concrete, mortar, stucco products. Pro Mix, High Strength, Fast Setting.','Concrete Manufacturer','https://www.sakrete.com','(866) 725-7383','info@sakrete.com',true,false,true,NOW(),'{concrete,masonry}','{manufacturer}','{national}',4.40,5800,'{Sakrete Pro}',false,false),
  ('belgard','Belgard','Premium pavers, retaining walls, outdoor living products. Oldcastle APG brand.','Hardscape Manufacturer','https://www.belgard.com','(877) 235-4273','info@belgard.com',true,true,true,NOW(),'{concrete,masonry,landscaping}','{manufacturer}','{national}',4.60,8200,'{Belgard Authorized Contractor,Master Craftsman}',true,true),
  ('pavestone','Pavestone','Pavers, retaining walls, edging, stepping stones. Available at Home Depot.','Hardscape Manufacturer','https://www.pavestone.com','(800) 972-8ite','info@pavestone.com',true,false,true,NOW(),'{concrete,masonry}','{manufacturer}','{national}',4.35,4600,'{Pavestone Certified}',false,false),
  ('oldcastle-apg','Oldcastle APG','Largest US manufacturer of hardscape and masonry products.','Masonry Manufacturer','https://www.oldcastleapg.com','(800) 899-8455','info@oldcastleapg.com',true,false,true,NOW(),'{concrete,masonry}','{manufacturer}','{national}',4.40,3200,'{Oldcastle APG Pro}',false,false),
  ('eagle-materials','Eagle Materials','Cement, concrete, aggregates, gypsum wallboard. Major SW producer.','Building Materials Manufacturer','https://www.eaglematerials.com','(214) 432-2000','info@eaglematerials.com',true,false,true,NOW(),'{concrete,masonry,drywall}','{manufacturer}','{southwest,national}',4.35,2100,'{Eagle Pro Partner}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- DRYWALL & INTERIOR
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('usg-corporation','USG Corporation','Sheetrock brand drywall, joint compounds, ceiling tiles. Industry leader.','Drywall Manufacturer','https://www.usg.com','(800) 874-4968','info@usg.com',true,true,true,NOW(),'{drywall}','{manufacturer}','{national}',4.60,9800,'{USG Certified Applicator}',false,false),
  ('national-gypsum','National Gypsum','Gold Bond brand drywall and finishing products. XP, Hi-Abuse lines.','Drywall Manufacturer','https://www.nationalgypsum.com','(800) 628-4662','info@nationalgypsum.com',true,false,true,NOW(),'{drywall}','{manufacturer}','{national}',4.45,4200,'{National Gypsum Pro}',false,false),
  ('georgia-pacific-gypsum','Georgia-Pacific Gypsum','DensArmor Plus, ToughRock, DensShield. Koch Industries subsidiary.','Drywall Manufacturer','https://www.buildgp.com','(800) 225-6119','info@buildgp.com',true,false,true,NOW(),'{drywall}','{manufacturer}','{national}',4.40,3600,'{GP Pro Partner}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- CABINETS & COUNTERTOPS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('kraftmaid','KraftMaid','Semi-custom cabinetry. Kitchen and bath. 80+ door styles, wide finish palette.','Cabinet Manufacturer','https://www.kraftmaid.com','(888) 562-7744','info@kraftmaid.com',true,true,true,NOW(),'{cabinets}','{manufacturer}','{national}',4.50,8400,'{KraftMaid Authorized Dealer}',true,true),
  ('merillat','Merillat','Kitchen and bath cabinets. Classic, Essentials, Masterpiece lines.','Cabinet Manufacturer','https://www.merillat.com','(866) 850-8557','info@merillat.com',true,false,true,NOW(),'{cabinets}','{manufacturer}','{national}',4.35,5200,'{Merillat Certified}',true,false),
  ('diamond-cabinets','Diamond Cabinets','Full-access frameless and framed cabinetry. Sold at Lowe''s.','Cabinet Manufacturer','https://www.diamondcabinets.com','(800) 325-2150','info@diamondcabinets.com',true,false,true,NOW(),'{cabinets}','{manufacturer}','{national}',4.30,4100,'{Diamond Certified}',true,true),
  ('thomasville-cabinetry','Thomasville Cabinetry','Premium kitchen and bath cabinets. Available at Home Depot.','Cabinet Manufacturer','https://www.thomasvillecabinetry.com','(800) 756-6497','info@thomasvillecabinetry.com',true,false,true,NOW(),'{cabinets}','{manufacturer}','{national}',4.40,3800,'{Thomasville Pro}',true,true),
  ('cambria-quartz','Cambria','American-made quartz countertops. 200+ designs. Lifetime warranty.','Countertop Manufacturer','https://www.cambriausa.com','(866) 226-2742','info@cambriausa.com',true,true,true,NOW(),'{countertops}','{manufacturer}','{national}',4.65,6800,'{Cambria Premier Dealer}',true,false),
  ('caesarstone','Caesarstone','Premium quartz surfaces. Over 60 colors. 25-year residential warranty.','Countertop Manufacturer','https://www.caesarstoneus.com','(818) 779-0999','info@caesarstoneus.com',true,false,true,NOW(),'{countertops}','{manufacturer}','{national}',4.55,4200,'{Caesarstone Certified}',true,false),
  ('silestone','Silestone by Cosentino','HybriQ+ technology quartz. N-Boost bacteriostatic. 25-year warranty.','Countertop Manufacturer','https://www.cosentino.com','(786) 686-6700','info@cosentino.com',true,true,true,NOW(),'{countertops}','{manufacturer}','{national}',4.60,5600,'{Cosentino Elite Studio}',true,false),
  ('wilsonart-counters','Wilsonart','Laminate, quartz, solid surface countertops.?"Thinscape" collection.','Countertop Manufacturer','https://www.wilsonart.com','(800) 433-3222','info@wilsonart.com',true,false,true,NOW(),'{countertops}','{manufacturer}','{national}',4.35,3400,'{Wilsonart Certified Fabricator}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- APPLIANCES
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('whirlpool','Whirlpool','Kitchen and laundry appliances. Ranges, refrigerators, dishwashers, washers.','Appliance Manufacturer','https://www.whirlpool.com','(866) 698-2538','info@whirlpool.com',true,true,true,NOW(),'{appliances}','{manufacturer}','{national}',4.45,22000,'{Whirlpool Preferred Partner}',true,true),
  ('ge-appliances','GE Appliances','Full line kitchen and laundry. Profile, Cafe, Monogram series.','Appliance Manufacturer','https://www.geappliances.com','(800) 626-2005','info@geappliances.com',true,true,true,NOW(),'{appliances}','{manufacturer}','{national}',4.50,19800,'{GE Pro Builder}',true,true),
  ('samsung-appliances','Samsung Home Appliances','Smart appliances. Bespoke, Family Hub. Ranges, refrigerators, laundry.','Appliance Manufacturer','https://www.samsung.com/us/home-appliances','(800) 726-7864','info@samsung.com',true,true,true,NOW(),'{appliances}','{manufacturer}','{national}',4.40,24600,'{Samsung Pro Partner}',true,true),
  ('lg-appliances','LG Appliances','ThinQ smart appliances. InstaView, WashTower, Styler.','Appliance Manufacturer','https://www.lg.com/us/appliances','(800) 243-0000','info@lg.com',true,true,true,NOW(),'{appliances}','{manufacturer}','{national}',4.40,21400,'{LG Pro Builder}',true,true),
  ('bosch','Bosch Home Appliances','German engineering. 100 Series, 500, 800, Benchmark lines.','Appliance Manufacturer','https://www.bosch-home.com/us','(800) 944-2904','info@bosch-home.com',true,true,true,NOW(),'{appliances}','{manufacturer}','{national}',4.60,12800,'{Bosch Trade Partner}',true,false),
  ('kitchenaid','KitchenAid','Premium kitchen appliances. Stand mixers, ranges, refrigerators.','Appliance Manufacturer','https://www.kitchenaid.com','(800) 541-6390','info@kitchenaid.com',true,false,true,NOW(),'{appliances}','{manufacturer}','{national}',4.55,15200,'{KitchenAid Pro Partner}',true,true),
  ('maytag','Maytag','Dependable appliances. Extra Power wash, Pet Pro. "Built to Last" warranty.','Appliance Manufacturer','https://www.maytag.com','(800) 344-1274','info@maytag.com',true,false,true,NOW(),'{appliances}','{manufacturer}','{national}',4.40,11600,'{Maytag Commercial Partner}',true,true),
  ('frigidaire','Frigidaire','Affordable kitchen and laundry. Gallery, Professional, Classic lines.','Appliance Manufacturer','https://www.frigidaire.com','(800) 374-4432','info@frigidaire.com',true,false,true,NOW(),'{appliances}','{manufacturer}','{national}',4.35,13200,'{Frigidaire Pro}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- SOLAR
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('tesla-solar','Tesla Solar','Solar panels, Solar Roof, Powerwall battery. Full home energy.','Solar Manufacturer','https://www.tesla.com/solarpanels','(888) 518-3752','solar@tesla.com',true,true,true,NOW(),'{solar}','{manufacturer}','{national}',4.30,18400,'{Tesla Certified Installer}',true,true),
  ('sunpower','SunPower','Maxeon technology panels. 25-year warranty. 22.8% efficiency.','Solar Manufacturer','https://www.sunpower.com','(800) 786-7693','info@sunpower.com',true,true,true,NOW(),'{solar}','{manufacturer}','{national}',4.55,9200,'{SunPower Authorized Dealer,Elite Dealer}',true,true),
  ('enphase','Enphase Energy','Microinverters, IQ battery, Enlighten monitoring. Industry-leading reliability.','Solar Equipment Manufacturer','https://www.enphase.com','(877) 797-4743','info@enphase.com',true,true,true,NOW(),'{solar}','{manufacturer}','{national}',4.60,7800,'{Enphase Platinum Installer}',true,false),
  ('solaredge','SolarEdge','Power optimizers, inverters, batteries. HD-Wave technology.','Solar Equipment Manufacturer','https://www.solaredge.com','(877) 360-5292','info@solaredge.com',true,false,true,NOW(),'{solar}','{manufacturer}','{national}',4.50,6400,'{SolarEdge Certified}',true,false),
  ('qcells','Q CELLS','High-efficiency solar panels. Q.PEAK DUO, Q.TRON series. Made in USA.','Solar Manufacturer','https://www.q-cells.com','(800) 529-8850','info@q-cells.com',true,false,true,NOW(),'{solar}','{manufacturer}','{national}',4.45,4800,'{Q CELLS Certified Partner}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- FENCING & DECKING
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('master-halco','Master Halco','#1 fence products distributor. Chain link, wood, vinyl, ornamental.','Fencing Manufacturer','https://www.masterhalco.com','(800) 848-8707','info@masterhalco.com',true,true,true,NOW(),'{fencing}','{manufacturer,distributor}','{national}',4.40,5200,'{Master Halco Pro}',false,false),
  ('trex','Trex','#1 composite decking and railing brand. Enhance, Select, Transcend.','Decking & Fencing Manufacturer','https://www.trex.com','(800) 289-8739','info@trex.com',true,true,true,NOW(),'{fencing,decking}','{manufacturer}','{national}',4.65,14600,'{TrexPro Gold,TrexPro Platinum}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- STUCCO / EIFS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('lahabra-stucco','LaHabra','Traditional and synthetic stucco systems. #1 brand in the Southwest.','Stucco Manufacturer','https://www.lahabra.com','(866) 524-2272','info@lahabra.com',true,true,true,NOW(),'{stucco}','{manufacturer}','{southwest,west,national}',4.50,4800,'{LaHabra Certified Applicator}',false,false),
  ('omega-stucco','Omega Products','Stucco, plaster, lath, EIFS systems. Southwest and West coast focus.','Stucco Manufacturer','https://www.omegaproducts.com','(800) 446-6342','info@omegaproducts.com',true,false,true,NOW(),'{stucco}','{manufacturer}','{southwest,west}',4.40,2600,'{Omega Certified Applicator}',false,false),
  ('parex-usa','ParexUSA','Exterior wall finishing. EIFS, stucco, air/water barriers.','Stucco/EIFS Manufacturer','https://www.parexusa.com','(800) 537-2739','info@parexusa.com',true,false,true,NOW(),'{stucco}','{manufacturer}','{national}',4.35,1800,'{Parex Certified Applicator}',false,false),
  ('dryvit-stucco','Dryvit Systems','EIFS and continuous insulation systems. Outsulation, NewBrick.','EIFS Manufacturer','https://www.dryvit.com','(800) 556-7752','info@dryvit.com',true,false,true,NOW(),'{stucco}','{manufacturer}','{national}',4.45,2200,'{Dryvit ADVANTAGE Contractor}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- RESTORATION / WATER / MOLD
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('servpro','SERVPRO','Fire & water cleanup and restoration. 2100+ franchises nationwide.','Restoration Franchise','https://www.servpro.com','(800) 737-8776','info@servpro.com',true,true,true,NOW(),'{restoration,water_damage,mold}','{manufacturer}','{national}',4.40,28000,'{SERVPRO Certified,IICRC Certified}',false,false),
  ('servicemaster-restore','ServiceMaster Restore','Water, fire, mold restoration. 4500+ locations.','Restoration Franchise','https://www.servicemasterrestore.com','(800) 737-8423','info@servicemasterrestore.com',true,true,true,NOW(),'{restoration,water_damage,mold}','{manufacturer}','{national}',4.35,18200,'{ServiceMaster Certified,IICRC Firm}',false,false),
  ('legend-brands','Legend Brands (Dri-Eaz)','Professional restoration equipment. Dehumidifiers, air movers, extractors.','Restoration Equipment Manufacturer','https://www.legendbrands.com','(800) 932-3030','info@legendbrands.com',true,false,true,NOW(),'{restoration,water_damage}','{manufacturer}','{national}',4.55,3400,'{Legend Brands Certified}',false,false),
  ('xactimate','Xactimate by Verisk','Industry-standard estimating software for insurance claims.','Restoration Technology','https://www.xactware.com','(800) 424-9228','info@xactware.com',true,true,true,NOW(),'{restoration}','{manufacturer}','{national}',4.50,8600,'{Xactimate Certified}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- POOLS & SPAS
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('pentair','Pentair','Pool pumps, filters, heaters, automation. IntelliFlo, MasterTemp.','Pool Equipment Manufacturer','https://www.pentair.com','(800) 831-7133','info@pentair.com',true,true,true,NOW(),'{pools}','{manufacturer}','{national}',4.55,7800,'{Pentair Certified Partner}',true,false),
  ('hayward','Hayward','Pool equipment — pumps, filters, heaters, salt chlorine. OmniLogic.','Pool Equipment Manufacturer','https://www.hayward.com','(908) 355-7995','info@hayward.com',true,true,true,NOW(),'{pools}','{manufacturer}','{national}',4.50,6200,'{Hayward Totally Certified}',true,false),
  ('jandy-pool','Jandy','Pool & spa equipment. AquaLink, VS FloPro, LXi heaters.','Pool Equipment Manufacturer','https://www.jandy.com','(800) 227-1442','info@jandy.com',true,false,true,NOW(),'{pools}','{manufacturer}','{national}',4.45,4200,'{Jandy Pro Partner}',true,false),
  ('pebble-technology','Pebble Technology International','PebbleTec, PebbleFina, PebbleSheen pool finishes. Arizona-based.','Pool Finish Manufacturer','https://www.pebbletec.com','(480) 948-5058','info@pebbletec.com',true,true,true,NOW(),'{pools}','{manufacturer}','{national,southwest}',4.65,5600,'{PebbleTec Authorized Applicator}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- FOUNDATION
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('foundation-supportworks','Foundation Supportworks','Foundation repair products — piers, wall anchors, waterproofing.','Foundation Manufacturer','https://www.foundationsupportworks.com','(800) 281-8545','info@foundationsupportworks.com',true,true,true,NOW(),'{foundation}','{manufacturer}','{national}',4.55,4800,'{Supportworks Authorized Dealer}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- LANDSCAPING
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('hunter-industries','Hunter Industries','Irrigation systems — rotors, sprays, controllers, valves. Hydrawise smart.','Irrigation Manufacturer','https://www.hunterindustries.com','(760) 744-5240','info@hunterindustries.com',true,true,true,NOW(),'{landscaping}','{manufacturer}','{national}',4.60,7200,'{Hunter Preferred Contractor}',false,false),
  ('rain-bird','Rain Bird','Smart irrigation — sprinklers, drip, controllers. Water-efficient.','Irrigation Manufacturer','https://www.rainbird.com','(800) 724-6247','info@rainbird.com',true,true,true,NOW(),'{landscaping}','{manufacturer}','{national}',4.60,8400,'{Rain Bird Select Contractor}',false,false),
  ('toro-irrigation','Toro','Irrigation, outdoor lighting, drainage. Residential and commercial.','Landscaping Manufacturer','https://www.toro.com','(888) 384-9939','info@toro.com',true,false,true,NOW(),'{landscaping}','{manufacturer}','{national}',4.50,6800,'{Toro NSN Member}',false,false),
  ('scotts-miracle-gro','Scotts Miracle-Gro','Lawn care, fertilizers, pest control. Scotts Turf Builder, Miracle-Gro.','Landscaping Manufacturer','https://www.scotts.com','(888) 270-3714','info@scotts.com',true,true,true,NOW(),'{landscaping}','{manufacturer}','{national}',4.45,16800,'{Scotts Pro Partner}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- DEMOLITION / EXCAVATION EQUIPMENT
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('caterpillar','Caterpillar (CAT)','Excavators, loaders, dozers, skid steers. World leader in heavy equipment.','Heavy Equipment Manufacturer','https://www.cat.com','(309) 675-1000','info@cat.com',true,true,true,NOW(),'{demolition,excavation}','{manufacturer}','{national}',4.65,14200,'{CAT Certified Rental,Dealer Network}',true,false),
  ('john-deere','John Deere','Compact and full-size construction equipment. Excavators, loaders.','Heavy Equipment Manufacturer','https://www.deere.com','(800) 537-8233','info@deere.com',true,true,true,NOW(),'{demolition,excavation,landscaping}','{manufacturer}','{national}',4.60,12800,'{John Deere Certified}',true,false),
  ('bobcat','Bobcat','Compact equipment — skid-steer loaders, excavators, utility vehicles.','Heavy Equipment Manufacturer','https://www.bobcat.com','(866) 823-7898','info@bobcat.com',true,true,true,NOW(),'{demolition,excavation}','{manufacturer}','{national}',4.55,9400,'{Bobcat Certified Dealer}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL DISTRIBUTORS & SUPPLIERS (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('westlake-royal','Westlake Royal Building Products','Siding, trim, stone, windows, roofing accessories. 600+ distributors.','Building Products Distributor','https://www.westlakeroyalbuildingproducts.com','(855) 937-8538','info@westlakeroyalbp.com',true,true,true,NOW(),'{roofing,siding,windows}','{distributor,manufacturer}','{national}',4.45,5200,'{Westlake Royal Pro Partner}',true,false),
  ('az-building-supply','AZ Building Supply','Arizona''s premier building materials supplier. Roofing, stucco, drywall, insulation.','Building Supply Distributor','https://www.azbuildingsupply.com','(602) 258-7888','info@azbuildingsupply.com',true,true,true,NOW(),'{roofing,stucco,drywall,insulation}','{distributor}','{southwest}',4.55,3200,'{AZ Building Supply Pro}',true,false),
  ('84-lumber','84 Lumber','Lumber, building materials, trusses, panels. 310+ stores.','Building Supply Distributor','https://www.84lumber.com','(844) 284-5623','info@84lumber.com',true,false,true,NOW(),'{windows,doors,roofing,siding}','{distributor}','{national}',4.40,6800,'{84 Lumber Pro Partner}',true,false),
  ('hd-supply','HD Supply','Maintenance, repair, operations. Plumbing, electrical, HVAC supplies.','Building Supply Distributor','https://www.hdsupply.com','(800) 431-3000','info@hdsupply.com',true,false,true,NOW(),'{plumbing,electrical,hvac}','{distributor}','{national}',4.35,8200,'{HD Supply Pro}',false,false),
  ('home-depot-pro','Home Depot Pro','Professional contractor supply. Bulk pricing, job site delivery.','Building Supply Retailer','https://www.homedepot.com/c/pro','(800) 466-3337','pro@homedepot.com',true,true,true,NOW(),'{roofing,siding,windows,plumbing,electrical,flooring}','{distributor}','{national}',4.30,42000,'{Home Depot Pro Xtra}',true,true),
  ('lowes-pro','Lowe''s Pro Supply','Professional contractor programs. Volume pricing, managed accounts.','Building Supply Retailer','https://www.lowes.com/l/pro','(800) 445-6937','pro@lowes.com',true,true,true,NOW(),'{roofing,siding,windows,plumbing,electrical,flooring}','{distributor}','{national}',4.25,38000,'{Lowe''s Pro Loyalty}',true,true),
  ('ferguson-enterprises','Ferguson Enterprises','#1 US plumbing distributor.?"?"HVAC, waterworks. 1700+ locations.','Plumbing & HVAC Distributor','https://www.ferguson.com','(888) 337-4786','info@ferguson.com',true,true,true,NOW(),'{plumbing,hvac}','{distributor}','{national}',4.55,9200,'{Ferguson Pro Partner}',true,false),
  ('winsupply','WinSupply','HVAC, plumbing, waterworks, industrial. 600+ locations.','HVAC & Plumbing Distributor','https://www.winsupplyinc.com','(937) 294-5331','info@winsupplyinc.com',true,false,true,NOW(),'{plumbing,hvac}','{distributor}','{national}',4.40,4600,'{WinSupply Pro Partner}',true,false),
  ('johnstone-supply','Johnstone Supply','HVAC/R parts and supplies. 430+ stores. Technical training.','HVAC Distributor','https://www.johnstonesupply.com','(800) 669-4328','info@johnstonesupply.com',true,false,true,NOW(),'{hvac}','{distributor}','{national}',4.50,5800,'{Johnstone Pro Partner}',false,false),
  ('hajoca','Hajoca Corporation','Plumbing, heating, industrial. 400+ locations. Oldest US distributor.','Plumbing Distributor','https://www.hajoca.com','(800) 441-2345','info@hajoca.com',true,false,true,NOW(),'{plumbing,hvac}','{distributor}','{national}',4.45,3800,'{Hajoca Pro Partner}',false,false),
  ('graybar-electric','Graybar Electric','Electrical, communications, data networking. 290+ locations.','Electrical Distributor','https://www.graybar.com','(800) 825-5517','info@graybar.com',true,false,true,NOW(),'{electrical}','{distributor}','{national}',4.45,4200,'{Graybar Pro Partner}',false,false),
  ('rexel-electrical','Rexel USA','Electrical supplies, lighting, automation. Global network.','Electrical Distributor','https://www.rexelusa.com','(800) 283-5943','info@rexelusa.com',true,false,true,NOW(),'{electrical}','{distributor}','{national}',4.35,3100,'{Rexel Pro}',false,false),
  ('poolcorp','POOLCORP','World''s largest pool/spa distributor. SCP, Superior, Horizon brands.','Pool Supply Distributor','https://www.poolcorp.com','(800) 288-7665','info@poolcorp.com',true,true,true,NOW(),'{pools}','{distributor}','{national}',4.50,6800,'{POOLCORP Pro Partner}',true,false),
  ('floor-decor','Floor & Decor','Hard surface flooring retailer. Tile, stone, wood, laminate, vinyl.','Flooring Retailer','https://www.flooranddecor.com','(877) 675-0002','info@flooranddecor.com',true,true,true,NOW(),'{flooring,tile}','{distributor}','{national}',4.50,12400,'{Floor & Decor Pro}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL ROOFING (not in v2 seed)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('eagle-roofing','Eagle Roofing Products','Concrete roof tiles. Southwest''s #1 tile manufacturer. Bel Air, Capistrano.','Roofing Tile Manufacturer','https://www.eagleroofing.com','(800) 400-3245','info@eagleroofing.com',true,true,true,NOW(),'{roofing}','{manufacturer}','{southwest,west}',4.50,3800,'{Eagle Roofing Certified Installer}',false,true),
  ('boral','Boral Roofing','Clay and concrete roof tiles. Barcelona, Saxony Slate lines.','Roofing Tile Manufacturer','https://www.boralroof.com','(800) 669-8453','info@boralroof.com',true,false,true,NOW(),'{roofing}','{manufacturer}','{national}',4.45,2600,'{Boral Certified Installer}',false,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

COMMIT;

-- Verify final counts
SELECT
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true) AS total_active_vendors,
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true AND ARRAY_LENGTH("vendorTypes", 1) > 0 AND "vendorTypes" @> '{manufacturer}') AS total_manufacturers,
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true AND "vendorTypes" @> '{distributor}') AS total_distributors;

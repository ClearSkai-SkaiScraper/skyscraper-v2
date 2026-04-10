-- ============================================================================
-- Extended Vendor Seed — Additional Trade Types (v1)
-- Execute: psql "$DATABASE_URL" -f ./db/seed-vendors-extended-trades.sql
-- ============================================================================
-- Covers MISSING categories not in seed-vendors-all-trades.sql:
-- Solar, Concrete, Landscaping, Restoration, Fencing,
-- Masonry, Tile, Pools, Drywall, Carpentry/Framing,
-- Fire Restoration, Water/Mold, Demolition, Excavation,
-- Foundation, Stucco, Cabinets, Countertops, Appliances,
-- General Contractor (supply)
-- ============================================================================

BEGIN;

SET search_path TO app;

-- ---------- SOLAR ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('tesla-solar','Tesla Energy','Solar Roof, Powerwall, and solar panel systems. Integrated energy ecosystem with app monitoring.','Solar Manufacturer','https://www.tesla.com/solarpanels','(888) 518-3752','solar@tesla.com',true,true,true,NOW(),'{solar}','{manufacturer}','{national}',4.30,18500,'{}',true,true),
  ('enphase','Enphase Energy','IQ8 microinverters, Enphase Energy System, IQ Batteries. Leading microinverter technology.','Solar Equipment Manufacturer','https://www.enphase.com','(877) 797-4743','info@enphase.com',true,true,true,NOW(),'{solar}','{manufacturer}','{national}',4.55,9200,'{Enphase Certified Installer}',false,true),
  ('solaredge','SolarEdge Technologies','Power optimizers, inverters, and EV chargers. HD-Wave technology for residential.','Solar Equipment Manufacturer','https://www.solaredge.com','(510) 498-3200','info@solaredge.com',true,false,true,NOW(),'{solar}','{manufacturer}','{national}',4.50,7800,'{SolarEdge Certified}',false,false),
  ('qcells','Q CELLS (Hanwha)','Q.PEAK DUO solar panels with Anti-LID and Anti-PID technology. German engineering.','Solar Panel Manufacturer','https://www.q-cells.us','(800) 540-6306','info@q-cells.us',true,false,true,NOW(),'{solar}','{manufacturer}','{national}',4.45,5400,'{Q.PARTNER Certified}',true,true),
  ('sunpower','SunPower / Maxeon','Maxeon solar panels with 40-year warranty. Industry-leading efficiency ratings.','Solar Panel Manufacturer','https://us.sunpower.com','(800) 786-7693','support@sunpower.com',true,true,true,NOW(),'{solar}','{manufacturer}','{national}',4.60,11200,'{SunPower Elite Dealer,Master Dealer}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount";

-- ---------- CONCRETE ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('quikrete','QUIKRETE','Concrete mixes, mortars, stuccos, and repair products. #1 selling packaged concrete.','Concrete & Masonry Manufacturer','https://www.quikrete.com','(800) 282-5828','info@quikrete.com',true,true,true,NOW(),'{concrete,masonry,stucco}','{manufacturer}','{national}',4.55,8900,'{}',false,true),
  ('sakrete','Sakrete','Concrete and mortar mixes, polymeric sand, and repair products since 1936.','Concrete Manufacturer','https://www.sakrete.com','(866) 725-7383','info@sakrete.com',true,false,true,NOW(),'{concrete,masonry}','{manufacturer}','{national}',4.40,4200,'{}',false,false),
  ('boral-concrete','Boral Industries','Decorative concrete, roof tile, and fly ash products. Artisan Stone Collection.','Concrete & Building Products','https://www.boralamerica.com','(800) 446-8763','info@boralamerica.com',true,false,true,NOW(),'{concrete,roofing}','{manufacturer}','{national}',4.35,3100,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- LANDSCAPING ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('belgard','Belgard (Oldcastle APG)','Premium pavers, retaining walls, outdoor living products. Hardscape design resources.','Hardscape Manufacturer','https://www.belgard.com','(877) 235-4273','info@belgard.com',true,true,true,NOW(),'{landscaping,concrete}','{manufacturer}','{national}',4.60,7600,'{Belgard Authorized Contractor,Master Craftsman}',true,false),
  ('techo-bloc','Techo-Bloc','Engineered pavers, slabs, walls, and steps. Architectural-grade hardscaping.','Hardscape Manufacturer','https://www.techo-bloc.com','(855) 832-4625','info@techo-bloc.com',true,false,true,NOW(),'{landscaping,concrete}','{manufacturer}','{national,east}',4.55,4800,'{Authorized Contractor}',false,false),
  ('siteone','SiteOne Landscape Supply','Largest landscape supply distributor. Irrigation, hardscape, nursery, outdoor lighting.','Landscape Distributor','https://www.siteone.com','(844) 748-3663','info@siteone.com',true,true,true,NOW(),'{landscaping}','{distributor}','{national}',4.45,6200,'{}',true,false),
  ('rain-bird','Rain Bird','Irrigation systems, controllers, sprinklers, and drip products since 1933. Smart irrigation.','Irrigation Manufacturer','https://www.rainbird.com','(800) 247-3782','info@rainbird.com',true,false,true,NOW(),'{landscaping}','{manufacturer}','{national}',4.60,5400,'{Rain Bird Select Contractor}',false,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- RESTORATION ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('servpro','SERVPRO','Fire & water cleanup and restoration. Over 2,000 franchises. IICRC certified.','Restoration Franchise','https://www.servpro.com','(800) 737-8776','info@servpro.com',true,true,true,NOW(),'{restoration,water_mold,fire}','{service_provider}','{national}',4.40,15800,'{IICRC Certified}',true,false),
  ('servicemaster','ServiceMaster Restore','Disaster restoration: water, fire, mold remediation. National franchise network.','Restoration Franchise','https://www.servicemasterrestore.com','(888) 264-5678','info@servicemasterrestore.com',true,true,true,NOW(),'{restoration,water_mold,fire}','{service_provider}','{national}',4.35,12400,'{IICRC Certified}',true,false),
  ('belfor','BELFOR Property Restoration','Largest property restoration company globally. Commercial and residential.','Restoration Company','https://www.belfor.com','(800) 856-3333','info@belfor.com',true,false,true,NOW(),'{restoration,water_mold,fire}','{service_provider}','{national}',4.50,8200,'{IICRC Firm,FSQS Certified}',true,false),
  ('xactimate-verisk','Verisk (Xactimate)','Insurance claims estimating software. Industry standard for restoration contractors.','Software Provider','https://www.verisk.com','(800) 424-9228','info@verisk.com',true,true,true,NOW(),'{restoration}','{technology}','{national}',4.30,6500,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- FENCING ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('master-halco','Master Halco','Largest fence distributor in North America. Chain link, wood, vinyl, ornamental.','Fence Distributor','https://www.masterhalco.com','(800) 950-1590','info@masterhalco.com',true,true,true,NOW(),'{fencing}','{distributor}','{national}',4.45,5600,'{}',false,false),
  ('bufftech','Bufftech (CertainTeed)','Premium vinyl fencing systems. Privacy, picket, ranch, and ornamental styles.','Fence Manufacturer','https://www.bufftech.com','(800) 233-8990','info@bufftech.com',true,false,true,NOW(),'{fencing}','{manufacturer}','{national}',4.50,3200,'{CertainTeed Certified}',false,false),
  ('trex-fencing','Trex Fencing','Composite fencing from recycled materials. Seclusions privacy system. Eco-friendly.','Fence Manufacturer','https://www.trexfencing.com','(800) 289-8739','info@trexfencing.com',true,false,true,NOW(),'{fencing}','{manufacturer}','{national}',4.40,2800,'{}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- MASONRY & TILE ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('daltile','Daltile (Mohawk)','Largest tile manufacturer in North America. Porcelain, ceramic, natural stone, mosaics.','Tile Manufacturer','https://www.daltile.com','(800) 933-8453','info@daltile.com',true,true,true,NOW(),'{tile,masonry}','{manufacturer}','{national}',4.55,9100,'{Daltile Pro Partner}',false,true),
  ('msi-surfaces','MSI Surfaces','Natural stone, porcelain, LVT, quartz countertops. 35+ distribution centers.','Tile & Stone Distributor','https://www.msisurfaces.com','(800) 580-6674','info@msisurfaces.com',true,true,true,NOW(),'{tile,countertops}','{distributor}','{national}',4.50,7200,'{}',false,false),
  ('eldorado-stone','Eldorado Stone','Manufactured architectural stone and brick veneer. Interior and exterior applications.','Masonry Manufacturer','https://www.eldoradostone.com','(800) 925-1491','info@eldoradostone.com',true,false,true,NOW(),'{masonry,siding}','{manufacturer}','{national}',4.60,4500,'{Certified Stone Installer}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- POOLS ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('pentair','Pentair','Pool pumps, filters, heaters, automation, and LED lighting. IntelliCenter control system.','Pool Equipment Manufacturer','https://www.pentair.com','(800) 831-7133','pool@pentair.com',true,true,true,NOW(),'{pools}','{manufacturer}','{national}',4.50,8400,'{Pentair Certified Partner}',true,true),
  ('hayward','Hayward Pool Products','Pumps, filters, heaters, chlorinators, and robotic cleaners. OmniLogic automation.','Pool Equipment Manufacturer','https://www.hayward.com','(908) 355-7995','info@hayward.com',true,true,true,NOW(),'{pools}','{manufacturer}','{national}',4.45,7600,'{Hayward Elite Dealer}',true,false),
  ('pebble-tec','Pebble Technology International','Pool finishes: PebbleTec, PebbleSheen, PebbleBrilliance. Natural stone textures.','Pool Finish Manufacturer','https://www.pebbletec.com','(800) 937-5058','info@pebbletec.com',true,false,true,NOW(),'{pools}','{manufacturer}','{national}',4.55,4200,'{Authorized PebbleTec Applicator}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- DRYWALL ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('usg','USG Corporation','Sheetrock brand drywall, joint compounds, and finishing products. Industry standard.','Drywall Manufacturer','https://www.usg.com','(800) 874-4968','info@usg.com',true,true,true,NOW(),'{drywall}','{manufacturer}','{national}',4.55,7200,'{}',false,false),
  ('georgia-pacific-gypsum','Georgia-Pacific Gypsum','DensArmor Plus, ToughRock, and DensGlass gypsum boards. Mold/moisture resistant.','Drywall Manufacturer','https://www.buildgp.com','(800) 225-6119','info@gp.com',true,false,true,NOW(),'{drywall}','{manufacturer}','{national}',4.45,5100,'{}',false,false),
  ('national-gypsum','National Gypsum','Gold Bond brand drywall and joint compounds. ProForm finishing products.','Drywall Manufacturer','https://www.nationalgypsum.com','(800) 628-4662','info@nationalgypsum.com',true,false,true,NOW(),'{drywall}','{manufacturer}','{national}',4.40,3800,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- CARPENTRY / FRAMING ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('84-lumber','84 Lumber','Lumber, building materials, trusses, and installed services. Contractor-focused.','Lumber Distributor','https://www.84lumber.com','(844) 584-3678','info@84lumber.com',true,true,true,NOW(),'{framing,general_contractor}','{distributor}','{national}',4.45,6800,'{}',true,false),
  ('boise-cascade','Boise Cascade','Engineered wood products: I-joists, LVL, plywood, and glulam beams.','Engineered Wood Manufacturer','https://www.bc.com','(208) 384-6161','info@bc.com',true,false,true,NOW(),'{framing}','{manufacturer}','{national}',4.50,3900,'{APA Certified}',false,false),
  ('weyerhaeuser','Weyerhaeuser','Trus Joist TJI joists, Microllam LVL, Parallam PSL. Engineered lumber.','Timber & Engineered Wood','https://www.weyerhaeuser.com','(855) 456-3647','info@weyerhaeuser.com',true,true,true,NOW(),'{framing}','{manufacturer}','{national}',4.55,5200,'{}',false,false),
  ('simpson-strong-tie','Simpson Strong-Tie','Structural connectors, anchors, fasteners, and lateral systems. Code-listed.','Structural Hardware Manufacturer','https://www.strongtie.com','(800) 999-5099','info@strongtie.com',true,true,true,NOW(),'{framing,general_contractor}','{manufacturer}','{national}',4.70,11400,'{Simpson Certified}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- FOUNDATION ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('ram-jack','Ram Jack','Foundation repair: steel piers, helical piers, and concrete leveling. Nationally franchised.','Foundation Repair Franchise','https://www.ramjack.com','(888) 330-0679','info@ramjack.com',true,true,true,NOW(),'{foundation}','{service_provider}','{national}',4.40,5600,'{ICC Certified}',true,false),
  ('foundation-supportworks','Foundation Supportworks','Foundation repair, basement waterproofing, and concrete leveling dealer network.','Foundation Repair Network','https://www.foundationsupportworks.com','(800) 698-8903','info@foundationsupportworks.com',true,false,true,NOW(),'{foundation}','{service_provider}','{national}',4.45,4100,'{Authorized Dealer}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- STUCCO ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('lahabra','LaHabra','Premium stucco, EIFS, and plaster products. Color Coat finish system. Parex USA.','Stucco Manufacturer','https://www.lahabra.com','(800) 772-7391','info@lahabra.com',true,true,true,NOW(),'{stucco}','{manufacturer}','{national}',4.45,3800,'{}',false,false),
  ('omega-products','Omega Products','Stucco systems, EIFS, and specialty coatings. OmegaFlex finish system.','Stucco Manufacturer','https://www.omega-products.com','(909) 598-1025','info@omega-products.com',true,false,true,NOW(),'{stucco}','{manufacturer}','{west,southwest}',4.40,2600,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- CABINETS ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('kraftmaid','KraftMaid','Semi-custom cabinetry for kitchen and bath. Wide variety of finishes and styles.','Cabinet Manufacturer','https://www.kraftmaid.com','(888) 562-7744','info@kraftmaid.com',true,true,true,NOW(),'{cabinets}','{manufacturer}','{national}',4.45,8700,'{KCMA Certified}',true,false),
  ('merillat','Merillat Cabinetry','Stock and semi-custom kitchen and bath cabinets. Classic, Masterpiece, and Portrait lines.','Cabinet Manufacturer','https://www.merillat.com','(866) 850-8557','info@merillat.com',true,false,true,NOW(),'{cabinets}','{manufacturer}','{national}',4.35,5400,'{KCMA Certified}',true,false),
  ('rev-a-shelf','Rev-A-Shelf','Cabinet storage and organization solutions. Pull-outs, lazy susans, waste containers.','Cabinet Accessory Manufacturer','https://www.rev-a-shelf.com','(800) 626-1126','info@rev-a-shelf.com',true,false,true,NOW(),'{cabinets}','{manufacturer}','{national}',4.60,6100,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- COUNTERTOPS ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('caesarstone','Caesarstone','Premium quartz surfaces for kitchens and baths. Wide range of colors and finishes.','Countertop Manufacturer','https://www.caesarstoneus.com','(818) 779-0999','info@caesarstoneus.com',true,true,true,NOW(),'{countertops}','{manufacturer}','{national}',4.55,7300,'{Caesarstone Certified Fabricator}',false,false),
  ('cambria','Cambria','American-made natural quartz surfaces. 200+ designs. Lifetime warranty.','Countertop Manufacturer','https://www.cambriausa.com','(866) 226-2742','info@cambriausa.com',true,true,true,NOW(),'{countertops}','{manufacturer}','{national}',4.65,9800,'{Cambria Premium Partner}',false,false),
  ('silestone','Silestone (Cosentino)','Quartz surfaces with N-Boost technology. HybriQ+ sustainability program.','Countertop Manufacturer','https://www.silestone.com','(866) 786-4695','info@cosentino.com',true,false,true,NOW(),'{countertops}','{manufacturer}','{national}',4.50,6100,'{Cosentino Certified}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- APPLIANCES ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('whirlpool-pro','Whirlpool Corporation','KitchenAid, Maytag, and Whirlpool brands. Builder/contractor program.','Appliance Manufacturer','https://www.whirlpoolpro.com','(800) 253-1301','pro@whirlpool.com',true,true,true,NOW(),'{appliances}','{manufacturer}','{national}',4.40,14200,'{Whirlpool Pro Partner}',true,true),
  ('ge-appliances','GE Appliances (Haier)','GE, GE Profile, Café, and Monogram brands. Builder programs available.','Appliance Manufacturer','https://www.geappliances.com','(800) 626-2005','pro@geappliances.com',true,true,true,NOW(),'{appliances}','{manufacturer}','{national}',4.35,12600,'{}',true,true),
  ('bosch-home','Bosch Home Appliances','German-engineered dishwashers, refrigerators, ranges. Quiet performance.','Appliance Manufacturer','https://www.bosch-home.com/us','(800) 944-2904','info@bshg.com',true,false,true,NOW(),'{appliances}','{manufacturer}','{national}',4.55,8900,'{}',false,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- GENERAL CONTRACTOR SUPPLY ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('home-depot-pro','The Home Depot Pro','Pro Xtra loyalty, volume pricing, delivery, and job-lot quotes. Largest home improvement retailer.','General Contractor Supply','https://www.homedepot.com/c/Pro','(866) 333-3551','pro@homedepot.com',true,true,true,NOW(),'{general_contractor}','{distributor}','{national}',4.30,22000,'{Pro Xtra Member}',true,true),
  ('lowes-pro','Lowe''s Pro Supply','Pro loyalty program, business tools, and volume pricing. National pro delivery.','General Contractor Supply','https://www.lowes.com/l/Pro','(800) 445-6937','pro@lowes.com',true,true,true,NOW(),'{general_contractor}','{distributor}','{national}',4.25,19500,'{Lowe''s Pro Member}',true,true),
  ('menards','Menards','Midwest building supply retailer. Lumber, building materials, tools. Contractor pricing.','General Contractor Supply','https://www.menards.com','(715) 876-5911','info@menards.com',true,false,true,NOW(),'{general_contractor}','{distributor}','{midwest}',4.30,8200,'{}',false,true),
  ('fastenal','Fastenal','Fasteners, tools, safety equipment, and industrial supplies. Vending and inventory programs.','Industrial & Construction Supply','https://www.fastenal.com','(507) 454-5374','info@fastenal.com',true,false,true,NOW(),'{general_contractor}','{distributor}','{national}',4.50,9600,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- DEMOLITION / EXCAVATION ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('cat-equipment','Caterpillar (CAT)','Excavators, loaders, dozers, and compact equipment. Rental and purchase programs.','Heavy Equipment Manufacturer','https://www.cat.com','(309) 675-1000','info@cat.com',true,true,true,NOW(),'{excavation,demolition}','{manufacturer}','{national}',4.65,16800,'{}',true,false),
  ('bobcat','Bobcat Company','Compact excavators, skid-steer loaders, and attachments. Industry-leading compact equipment.','Compact Equipment Manufacturer','https://www.bobcat.com','(866) 823-7898','info@bobcat.com',true,true,true,NOW(),'{excavation,demolition}','{manufacturer}','{national}',4.55,12400,'{}',true,false),
  ('sunbelt-rentals','Sunbelt Rentals','Equipment rental for construction: excavators, loaders, scaffolding, aerial lifts.','Equipment Rental','https://www.sunbeltrentals.com','(866) 892-2122','info@sunbeltrentals.com',true,false,true,NOW(),'{demolition,excavation,general_contractor}','{service_provider}','{national}',4.40,7800,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- WATER/MOLD REMEDIATION ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('dri-eaz','Dri-Eaz (Legend Brands)','Dehumidifiers, air movers, air scrubbers for water damage restoration. Industry standard.','Restoration Equipment','https://www.dri-eaz.com','(800) 932-3030','info@dri-eaz.com',true,true,true,NOW(),'{water_mold}','{manufacturer}','{national}',4.55,5400,'{IICRC Approved}',false,false),
  ('fiberlock','Fiberlock Technologies','Mold remediation coatings, encapsulants, and lead paint solutions. IAQCure system.','Remediation Products','https://www.fiberlock.com','(800) 342-3755','info@fiberlock.com',true,false,true,NOW(),'{water_mold}','{manufacturer}','{national}',4.45,3200,'{}',false,false),
  ('xactimate-water','Xactimate Water Module','Industry-standard estimating for water damage claims. Integrates with carrier systems.','Software Provider','https://www.verisk.com/insurance/products/xactimate','(800) 424-9228','support@verisk.com',true,false,true,NOW(),'{water_mold,restoration}','{technology}','{national}',4.30,4100,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

-- ---------- FIRE RESTORATION ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail") VALUES
  ('bio-one','Bio-One','Biohazard cleanup, fire/smoke damage restoration, and decontamination services. Nationally franchised.','Restoration Franchise','https://www.biooneinc.com','(888) 246-6631','info@biooneinc.com',true,false,true,NOW(),'{fire,restoration}','{service_provider}','{national}',4.35,3800,'{IICRC Certified}',false,false),
  ('fire-dawgs','Fire Dawgs Junk Removal','Fire damage cleanup, debris removal, and content cleaning. Veteran-owned franchise.','Fire Restoration Service','https://www.firedawgs.com','(317) 291-3294','info@firedawgs.com',true,false,true,NOW(),'{fire,demolition}','{service_provider}','{midwest,east}',4.30,2100,'{}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","tradeTypes"=EXCLUDED."tradeTypes";

COMMIT;

-- Verify counts per trade type
SELECT unnest("tradeTypes") AS trade, COUNT(*) AS vendor_count
FROM "Vendor" WHERE "isActive" = true
GROUP BY trade ORDER BY vendor_count DESC;

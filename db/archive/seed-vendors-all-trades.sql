-- ============================================================================
-- Comprehensive Vendor Seed — All Trade Types (v2)
-- Execute: psql "postgresql://...:5432/postgres" -f ./db/seed-vendors-all-trades.sql
-- ============================================================================
-- Covers: Roofing, Windows, Siding, HVAC, Plumbing, Electrical,
--         Gutters, Insulation, Paint, Flooring, General Building Supply
-- Uses ON CONFLICT DO UPDATE to enrich existing rows.
-- Uses slug subqueries for contacts & resources (real UUID FKs).
-- ============================================================================

BEGIN;
SET search_path TO app, public;

-- ============================================================================
-- VENDORS — UPSERT (enrich existing + insert new)
-- ============================================================================

-- ---------- ROOFING ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('gaf','GAF','North America''s largest roofing manufacturer. Timberline HDZ shingles, flat roof systems, and contractor certification programs.','Roofing Manufacturer','https://www.gaf.com','(973) 628-3000','info@gaf.com',true,true,true,NOW(),'{roofing}','{manufacturer}','{national}',4.70,12500,'{Master Elite,Certified Installer}',true,true),
  ('owens-corning','Owens Corning','Premium roofing shingles including Duration, TruDefinition, and Oakridge. SureNail technology.','Roofing & Insulation Manufacturer','https://www.owenscorning.com','(800) 438-7465','roofing@owenscorning.com',true,true,true,NOW(),'{roofing,insulation}','{manufacturer}','{national}',4.65,9800,'{Platinum Preferred,Preferred Contractor}',true,true),
  ('certainteed','CertainTeed','Saint-Gobain company. Landmark, Presidential Shake shingles. Cedar Impressions siding. Insulation products.','Roofing Siding & Insulation Manufacturer','https://www.certainteed.com','(800) 233-8990','info@certainteed.com',true,true,true,NOW(),'{roofing,siding,insulation}','{manufacturer}','{national}',4.60,8200,'{SELECT ShingleMaster,Master Shingle Applicator,5-Star Contractor}',true,true),
  ('iko','IKO Industries','Global roofing manufacturer. Cambridge, Dynasty, and Nordic shingle lines. Commercial membranes.','Roofing Manufacturer','https://www.iko.com','(888) 766-2468','info@iko.com',true,false,true,NOW(),'{roofing}','{manufacturer}','{national}',4.40,5600,'{ROOFPRO Certified,Shield Pro Plus}',true,false),
  ('tamko','TAMKO Building Products','Heritage and Elite Glass-Seal shingles. Family-owned since 1944.','Roofing Manufacturer','https://www.tamko.com','(800) 641-4691','info@tamko.com',true,false,true,NOW(),'{roofing}','{manufacturer}','{national}',4.35,4200,'{Pro Certified Contractor}',false,true),
  ('malarkey','Malarkey Roofing Products','Legacy, Vista, and Windsor shingles with Scotchgard Protector. Eco-friendly NEX polymer.','Roofing Manufacturer','https://www.malarkeyroofing.com','(800) 545-1191','info@malarkeyroofing.com',true,false,true,NOW(),'{roofing}','{manufacturer}','{national,west}',4.55,3800,'{Emerald Premium Contractor}',true,true),
  ('atlas-roofing','Atlas Roofing','StormMaster Slate and Pinnacle Pristine shingles with Scotchgard. HP42 technology.','Roofing Manufacturer','https://www.atlasroofing.com','(800) 933-2721','info@atlasroofing.com',true,false,true,NOW(),'{roofing,insulation}','{manufacturer}','{national}',4.30,3100,'{Pro Plus Contractor}',false,true),
  ('decra','DECRA Roofing Systems','Stone-coated steel roofing. Villa Tile, Shake XD, Shingle XD lines. 50-year warranty.','Roofing Manufacturer','https://www.decra.com','(800) 258-9693','info@decra.com',true,false,true,NOW(),'{roofing}','{manufacturer}','{national}',4.50,2400,'{Certified Installer}',true,false),
  ('davinci-roofscapes','DaVinci Roofscapes','Composite slate and shake roofing tiles. Bellaforte, Multi-Width, and Single-Width lines.','Roofing Manufacturer','https://www.davinciroofscapes.com','(800) 328-4624','info@davinciroofscapes.com',true,false,true,NOW(),'{roofing}','{manufacturer}','{national}',4.60,1800,'{Masterpiece Contractor}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail",
  "isFeatured"=EXCLUDED."isFeatured","isVerified"=EXCLUDED."isVerified","verifiedAt"=EXCLUDED."verifiedAt";

-- ---------- WINDOWS ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('andersen-windows','Andersen Windows & Doors','America''s most trusted window brand since 1903. 400 Series, Renewal, and A-Series product lines.','Window Manufacturer','https://www.andersenwindows.com','(888) 888-7020','info@andersenwindows.com',true,true,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.70,15200,'{Andersen Certified Contractor}',true,true),
  ('pella','Pella Windows & Doors','Premium windows and doors. Lifestyle, Architect, Defender, and Encompass series.','Window Manufacturer','https://www.pella.com','(888) 847-3552','info@pella.com',true,true,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.65,13400,'{Pella Certified Contractor,Platinum Certified}',true,true),
  ('provia','ProVia','Professional-class windows, doors, siding, and stone. Endure, ecoLite, and Aeris window lines.','Window & Door Manufacturer','https://www.provia.com','(877) 611-2772','info@provia.com',true,true,true,NOW(),'{windows,doors,siding}','{manufacturer}','{national}',4.60,7800,'{ProVia Platinum Dealer,Certified Installer}',true,true),
  ('milgard','Milgard Windows & Doors','Western US leader. Trinsic, Ultra, Tuscany, and Style Line series. Full lifetime warranty.','Window Manufacturer','https://www.milgard.com','(800) 645-4273','info@milgard.com',true,true,true,NOW(),'{windows,doors}','{manufacturer}','{west}',4.55,8900,'{Milgard Certified Dealer}',true,true),
  ('marvin','Marvin Windows & Doors','Premium and luxury windows. Signature, Modern, Essential, and Elevate collections.','Window Manufacturer','https://www.marvin.com','(888) 537-7828','info@marvin.com',true,false,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.70,6200,'{Marvin Authorized Replacement Contractor}',true,false),
  ('simonton','Simonton Windows & Doors','Vinyl windows and patio doors. Reflections 5500, Impressions, and Daylight Max lines.','Window Manufacturer','https://www.simonton.com','(800) 746-6686','info@simonton.com',true,false,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.40,5100,'{Simonton Pro Partner}',true,true),
  ('plygem','Ply Gem Windows & Siding','Full line of vinyl and aluminum windows. Mira, Premium, and Classic series.','Window Manufacturer','https://www.plygem.com','(888) 975-9436','info@plygem.com',true,false,true,NOW(),'{windows,siding}','{manufacturer}','{national}',4.30,4300,'{Ply Gem Certified}',false,true),
  ('jeld-wen','JELD-WEN Windows & Doors','Global manufacturer. Siteline, W-5500, and Custom Wood lines. AuraLast pine technology.','Window Manufacturer','https://www.jeld-wen.com','(800) 535-3936','info@jeld-wen.com',true,false,true,NOW(),'{windows,doors}','{manufacturer}','{national}',4.35,7400,'{JELD-WEN Certified}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail",
  "isFeatured"=EXCLUDED."isFeatured","isVerified"=EXCLUDED."isVerified","verifiedAt"=EXCLUDED."verifiedAt";

-- ---------- SIDING ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('james-hardie','James Hardie','#1 brand of fiber cement siding. HardiePlank, HardieShingle, HardiePanel. ColorPlus technology.','Siding Manufacturer','https://www.jameshardie.com','(888) 542-7343','info@jameshardie.com',true,true,true,NOW(),'{siding}','{manufacturer}','{national}',4.75,11200,'{James Hardie Preferred Contractor,Elite Preferred Contractor}',true,true),
  ('lp-smartside','LP SmartSide','Engineered wood siding and trim. SmartGuard process for durability. Lap, panel, and shake.','Siding Manufacturer','https://www.lpcorp.com/smartside','(888) 820-0325','info@lpcorp.com',true,true,true,NOW(),'{siding}','{manufacturer}','{national}',4.55,6800,'{LP SmartSide Certified Installer}',true,true),
  ('royal-building','Royal Building Products','Vinyl siding and accessories. Portsmouth Shake, Haven, and Crest lines.','Siding Manufacturer','https://www.royalbuildingproducts.com','(800) 368-3117','info@royalbuildingproducts.com',true,false,true,NOW(),'{siding}','{manufacturer}','{national}',4.30,3600,'{Royal Certified}',false,true),
  ('alside','Alside','Vinyl siding, windows, and trim. Charter Oak, Prodigy, and Odyssey Plus lines.','Siding & Window Manufacturer','https://www.alside.com','(800) 922-6009','info@alside.com',true,false,true,NOW(),'{siding,windows}','{manufacturer}','{national}',4.35,4100,'{Alside Certified}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- HVAC ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('trane','Trane','Premium HVAC systems. XV, XR, and XL series. Variable speed, high SEER2 ratings.','HVAC Manufacturer','https://www.trane.com','(877) 280-3336','info@trane.com',true,true,true,NOW(),'{hvac}','{manufacturer}','{national}',4.70,14800,'{Trane Comfort Specialist,Trane Authorized Dealer}',true,true),
  ('carrier','Carrier','Inventor of modern AC. Infinity, Performance, and Comfort series. Greenspeed intelligence.','HVAC Manufacturer','https://www.carrier.com','(800) 227-7437','info@carrier.com',true,true,true,NOW(),'{hvac}','{manufacturer}','{national}',4.65,13200,'{Carrier Factory Authorized Dealer,Carrier Expert}',true,true),
  ('lennox','Lennox','High-efficiency HVAC. SL, XC, XP, and EL series. iComfort smart thermostat integration.','HVAC Manufacturer','https://www.lennox.com','(800) 953-6669','info@lennox.com',true,true,true,NOW(),'{hvac}','{manufacturer}','{national}',4.60,11500,'{Lennox Premier Dealer}',true,true),
  ('goodman','Goodman Manufacturing','Affordable HVAC. GSXC, GSZC, and GVXC series. Lifetime compressor warranty.','HVAC Manufacturer','https://www.goodmanmfg.com','(877) 254-4729','info@goodmanmfg.com',true,false,true,NOW(),'{hvac}','{manufacturer}','{national}',4.30,9400,'{Goodman Certified Installer}',true,true),
  ('daikin','Daikin','World''s largest HVAC manufacturer. DX, FIT, and One+ systems. Mini-split and VRV leaders.','HVAC Manufacturer','https://www.daikincomfort.com','(888) 432-4546','info@daikincomfort.com',true,true,true,NOW(),'{hvac}','{manufacturer}','{national}',4.55,7600,'{Daikin Comfort Pro}',true,true),
  ('rheem','Rheem','HVAC, water heaters, and pool heaters. Prestige, Classic Plus, and Select series.','HVAC & Plumbing Manufacturer','https://www.rheem.com','(800) 432-8373','info@rheem.com',true,false,true,NOW(),'{hvac,plumbing}','{manufacturer}','{national}',4.45,8700,'{Rheem Pro Partner}',true,true),
  ('york','York (Johnson Controls)','Affinity, LX, and YC2 series. SmartEnergy management.','HVAC Manufacturer','https://www.york.com','(877) 874-7378','info@york.com',true,false,true,NOW(),'{hvac}','{manufacturer}','{national}',4.35,6100,'{York Certified Comfort Expert}',true,false),
  ('american-standard-hvac','American Standard Heating & Air','AccuComfort, Gold, Silver, and Platinum series. Same parent as Trane.','HVAC Manufacturer','https://www.americanstandardair.com','(800) 654-7220','info@americanstandardair.com',true,false,true,NOW(),'{hvac}','{manufacturer}','{national}',4.50,5800,'{American Standard Customer Care Dealer}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- PLUMBING ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('moen','Moen','#1 faucet brand in North America. MotionSense and Power Boost technology.','Plumbing Manufacturer','https://www.moen.com','(800) 289-6636','info@moen.com',true,true,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.65,16200,'{Moen Pro Preferred}',false,true),
  ('delta-faucet','Delta Faucet','Touch2O, ShieldSpray, and H2Okinetic technologies.','Plumbing Manufacturer','https://www.deltafaucet.com','(800) 345-3358','info@deltafaucet.com',true,true,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.60,14300,'{Delta Preferred Installer}',false,true),
  ('kohler','Kohler','Premium kitchen and bath. Sensate faucets, DTV+ digital showering.','Plumbing Manufacturer','https://www.kohler.com','(800) 456-4537','info@kohler.com',true,true,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.70,18500,'{Kohler Registered Installer}',true,true),
  ('american-standard','American Standard','Toilets, faucets, bath fixtures. Champion, Cadet, VorMax flush.','Plumbing Manufacturer','https://www.americanstandard.com','(800) 442-1902','info@americanstandard.com',true,false,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.45,9800,'{American Standard Preferred}',false,true),
  ('rinnai','Rinnai','Tankless water heaters, boilers, ductless HVAC. Sensei and SE+.','Plumbing & HVAC Manufacturer','https://www.rinnai.us','(800) 621-9419','info@rinnai.us',true,false,true,NOW(),'{plumbing,hvac}','{manufacturer}','{national}',4.55,6400,'{Rinnai ACE Pro}',true,true),
  ('ao-smith','A.O. Smith','Water heaters. ProLine, Signature, Voltex hybrid heat pump.','Plumbing Manufacturer','https://www.aosmith.com','(800) 527-1953','info@aosmith.com',true,false,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.45,7200,'{A.O. Smith ProMax Partner}',true,true),
  ('navien','Navien','Premium tankless water heaters and boilers. NPE-2, NCB-E. 0.96+ UEF.','Plumbing Manufacturer','https://www.navieninc.com','(800) 519-8794','info@navieninc.com',true,false,true,NOW(),'{plumbing}','{manufacturer}','{national}',4.50,4500,'{Navien Certified Installer}',true,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- ELECTRICAL ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('eaton','Eaton Electrical','Circuit breakers, panels, surge protection, EV charging. CH and BR series.','Electrical Manufacturer','https://www.eaton.com/electrical','(800) 386-1911','info@eaton.com',true,true,true,NOW(),'{electrical}','{manufacturer}','{national}',4.60,8900,'{Eaton Certified Contractor}',false,false),
  ('leviton','Leviton','Wiring devices, lighting controls, networking. Decora, SmartlockPro.','Electrical Manufacturer','https://www.leviton.com','(800) 323-8920','info@leviton.com',true,true,true,NOW(),'{electrical}','{manufacturer}','{national}',4.55,7200,'{Leviton Pro Partner}',false,true),
  ('square-d','Square D (Schneider Electric)','Circuit breakers, panels, surge devices. QO and Homeline.','Electrical Manufacturer','https://www.se.com/us/en/brands/squared','(888) 778-2733','info@se.com',true,true,true,NOW(),'{electrical}','{manufacturer}','{national}',4.55,9400,'{Square D Certified}',false,false),
  ('lutron','Lutron Electronics','Lighting controls, dimmers, smart home. Caseta, RadioRA 3, HomeWorks.','Electrical Manufacturer','https://www.lutron.com','(888) 588-7661','info@lutron.com',true,true,true,NOW(),'{electrical}','{manufacturer}','{national}',4.70,6800,'{Lutron Certified Installer,HomeWorks Dealer}',true,false),
  ('generac','Generac','Home standby generators, portable generators, PWRcell energy storage.','Electrical Manufacturer','https://www.generac.com','(888) 436-3722','info@generac.com',true,true,true,NOW(),'{electrical}','{manufacturer}','{national}',4.50,11200,'{Generac Authorized Service Dealer,PowerPro Elite}',true,true),
  ('siemens-electrical','Siemens Electrical','Load centers, circuit breakers, surge protection. VersiCharge EV.','Electrical Manufacturer','https://www.siemens.com/residential','(800) 964-4114','info@siemens.com',true,false,true,NOW(),'{electrical}','{manufacturer}','{national}',4.45,5600,'{Siemens Certified}',false,false),
  ('hubbell','Hubbell','Wiring devices, lighting, power distribution. Kellems, TayMac, Bryant.','Electrical Manufacturer','https://www.hubbell.com','(800) 288-6000','info@hubbell.com',true,false,true,NOW(),'{electrical}','{manufacturer}','{national}',4.40,3800,'{Hubbell Certified}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- INSULATION ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('johns-manville','Johns Manville','Berkshire Hathaway company. Fiberglass batts, blown-in, spray foam, mineral wool.','Insulation Manufacturer','https://www.jm.com','(800) 654-3103','info@jm.com',true,true,true,NOW(),'{insulation,roofing}','{manufacturer}','{national}',4.55,5400,'{JM Certified Installer}',true,true),
  ('knauf','Knauf Insulation','EcoBatt fiberglass with ECOSE bio-based binder. Batts, blowing wool.','Insulation Manufacturer','https://www.knaufinsulation.com','(800) 825-4434','info@knaufinsulation.com',true,false,true,NOW(),'{insulation}','{manufacturer}','{national}',4.45,3200,'{Knauf Certified Installer}',false,true),
  ('rockwool','ROCKWOOL','Stone wool insulation. Comfortbatt, Safe n Sound. Fire-resistant up to 2150F.','Insulation Manufacturer','https://www.rockwool.com','(800) 265-6878','info@rockwool.com',true,true,true,NOW(),'{insulation}','{manufacturer}','{national}',4.60,4100,'{ROCKWOOL Certified}',false,true),
  ('icynene','Icynene-Lapolla (Huntsman)','Spray foam insulation. Classic Max, Classic Plus, ProSeal.','Insulation Manufacturer','https://www.icynene.com','(800) 758-7325','info@icynene.com',true,false,true,NOW(),'{insulation}','{manufacturer}','{national}',4.40,2800,'{Icynene Licensed Dealer}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- GUTTERS ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('leaffilter','LeafFilter Gutter Protection','#1 rated gutter guard. Micro-mesh stainless steel. Lifetime warranty.','Gutter Guard Manufacturer','https://www.leaffilter.com','(800) 290-6106','info@leaffilter.com',true,true,true,NOW(),'{gutters}','{manufacturer}','{national}',4.55,22000,'{LeafFilter Authorized Installer}',true,false),
  ('leafguard','LeafGuard','One-piece seamless gutter with built-in hood. ScratchGuard finish.','Gutter Manufacturer','https://www.leafguard.com','(800) 516-1180','info@leafguard.com',true,true,true,NOW(),'{gutters}','{manufacturer}','{national}',4.45,8900,'{LeafGuard Certified Installer}',true,false),
  ('spectra-metals','Spectra Gutter Systems','Aluminum gutters, downspouts, accessories. K-Style, Half-Round.','Gutter Manufacturer','https://www.spectrametals.com','(800) 925-4434','info@spectrametals.com',true,false,true,NOW(),'{gutters}','{manufacturer}','{national}',4.40,3200,'{Spectra Certified}',false,false),
  ('senox','Senox Corporation','Commercial and residential gutter coil, machines, accessories.','Gutter Manufacturer','https://www.senox.com','(866) 473-6692','info@senox.com',true,false,true,NOW(),'{gutters}','{manufacturer}','{national}',4.30,1800,'{Senox Pro Partner}',false,false),
  ('raindrop-gutter','Raindrop Gutter Guard','Polypropylene gutter guard. 20-year warranty. 150 in/hr capacity.','Gutter Guard Manufacturer','https://www.raindropgutterguard.com','(800) 816-0199','info@raindropgutterguard.com',true,false,true,NOW(),'{gutters}','{manufacturer}','{national}',4.35,2100,'{Raindrop Certified Installer}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- PAINT ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('sherwin-williams','Sherwin-Williams','#1 paint brand. Duration, Emerald, SuperPaint, Harmony. 4900+ stores.','Paint Manufacturer','https://www.sherwin-williams.com','(800) 474-3794','info@sherwin-williams.com',true,true,true,NOW(),'{painting}','{manufacturer}','{national}',4.75,24000,'{Sherwin-Williams Pro Preferred,PaintPerks Member}',false,true),
  ('benjamin-moore','Benjamin Moore','Premium paints. Regal Select, Aura, ben, Natura. Gennex color technology.','Paint Manufacturer','https://www.benjaminmoore.com','(855) 724-6802','info@benjaminmoore.com',true,true,true,NOW(),'{painting}','{manufacturer}','{national}',4.70,18600,'{Benjamin Moore Certified Applicator}',false,true),
  ('ppg-paints','PPG Paints','Global coatings leader. PPG Timeless, Manor Hall, SpeedHide.','Paint Manufacturer','https://www.ppg.com','(888) 774-1010','info@ppg.com',true,false,true,NOW(),'{painting}','{manufacturer}','{national}',4.50,9200,'{PPG Pro Partner}',false,true),
  ('behr','BEHR Paint','Home Depot exclusive. Marquee, Ultra, Premium Plus, Dynasty.','Paint Manufacturer','https://www.behr.com','(800) 854-0133','info@behr.com',true,true,true,NOW(),'{painting}','{manufacturer}','{national}',4.45,21000,'{BEHR Pro Partner}',false,true),
  ('dunn-edwards','Dunn-Edwards Paints','Southwest leader. Evershield, Aristoshield, Spartashield. 140+ AZ/CA/NV/TX stores.','Paint Manufacturer','https://www.dunnedwards.com','(888) 337-2468','info@dunnedwards.com',true,true,true,NOW(),'{painting}','{manufacturer}','{southwest,west}',4.55,5800,'{Dunn-Edwards Pro Partner}',false,true)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- FLOORING ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('shaw-industries','Shaw Floors','Largest US flooring manufacturer. Hardwood, LVP, laminate, carpet. Coretec, Floorte.','Flooring Manufacturer','https://www.shawfloors.com','(800) 441-7429','info@shawfloors.com',true,true,true,NOW(),'{flooring}','{manufacturer}','{national}',4.60,13400,'{Shaw Certified Installer}',true,true),
  ('mohawk','Mohawk Flooring','World''s largest flooring company. RevWood, SolidTech, SmartStrand.','Flooring Manufacturer','https://www.mohawkflooring.com','(800) 266-4295','info@mohawkflooring.com',true,true,true,NOW(),'{flooring}','{manufacturer}','{national}',4.55,12100,'{Mohawk Floorscapes,ColorCenter Dealer}',true,true),
  ('armstrong-flooring','Armstrong Flooring','Luxury vinyl, hardwood, laminate. Pryzm, Vivero, TimberBrushed.','Flooring Manufacturer','https://www.armstrongflooring.com','(800) 233-3823','info@armstrongflooring.com',true,false,true,NOW(),'{flooring}','{manufacturer}','{national}',4.45,7800,'{Armstrong Elite Retailer}',true,true),
  ('mannington','Mannington','Premium residential flooring. ADURA Max, Restoration, WetProtect.','Flooring Manufacturer','https://www.mannington.com','(800) 356-6787','info@mannington.com',true,false,true,NOW(),'{flooring}','{manufacturer}','{national}',4.50,5200,'{Mannington Certified}',true,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";

-- ---------- DISTRIBUTORS ----------
INSERT INTO "Vendor" ("slug","name","description","category","website","primaryPhone","primaryEmail","isActive","isFeatured","isVerified","verifiedAt","tradeTypes","vendorTypes","serviceRegions","rating","reviewCount","certifications","financingAvail","rebatesAvail")
VALUES
  ('abc-supply','ABC Supply','America''s largest wholesale distributor of roofing, siding, windows, gutters.','Building Supply Distributor','https://www.abcsupply.com','(800) 786-3532','info@abcsupply.com',true,true,true,NOW(),'{roofing,siding,windows,gutters}','{distributor}','{national}',4.55,8900,'{ABC Supply Pro Rewards}',true,false),
  ('srs-distribution','SRS Distribution','Multi-brand roofing, siding, building products. 760+ locations.','Building Supply Distributor','https://www.srsdistribution.com','(877) 726-4077','info@srsdistribution.com',true,true,true,NOW(),'{roofing,siding,windows}','{distributor}','{national}',4.45,6200,'{SRS Pro Partner}',true,false),
  ('beacon-building','Beacon Building Products','Roofing, siding, waterproofing products. 500+ branches.','Building Supply Distributor','https://www.becn.com','(866) 232-2669','info@becn.com',true,true,true,NOW(),'{roofing,siding,windows,insulation}','{distributor}','{national}',4.40,7100,'{Beacon PRO+ Member}',true,false),
  ('us-lbm','US LBM','Building materials. Lumber, windows, doors, roofing, siding. 400+ locations.','Building Supply Distributor','https://www.uslbm.com','(888) 875-2669','info@uslbm.com',true,false,true,NOW(),'{roofing,siding,windows,doors}','{distributor}','{national}',4.30,3400,'{US LBM Partner}',false,false),
  ('builders-firstsource','Builders FirstSource','Largest US supplier of structural building products.','Building Supply Distributor','https://www.bldr.com','(800) 284-7866','info@bldr.com',true,false,true,NOW(),'{windows,doors,roofing}','{distributor}','{national}',4.35,4800,'{BMC Pro Partner}',false,false)
ON CONFLICT ("slug") DO UPDATE SET
  "description"=EXCLUDED."description","category"=EXCLUDED."category","website"=EXCLUDED."website",
  "primaryPhone"=EXCLUDED."primaryPhone","primaryEmail"=EXCLUDED."primaryEmail",
  "tradeTypes"=EXCLUDED."tradeTypes","vendorTypes"=EXCLUDED."vendorTypes","serviceRegions"=EXCLUDED."serviceRegions",
  "rating"=EXCLUDED."rating","reviewCount"=EXCLUDED."reviewCount","certifications"=EXCLUDED."certifications",
  "financingAvail"=EXCLUDED."financingAvail","rebatesAvail"=EXCLUDED."rebatesAvail";


-- ============================================================================
-- VENDOR CONTACTS — slug subqueries for FK resolution
-- ============================================================================

INSERT INTO "VendorContact" ("id","vendorId","name","title","email","phone","territory","isPrimary","isActive")
SELECT 'vc-gaf-rep',id,'Mike Torres','Territory Manager','mtorres@gaf.com','(602) 555-0101','{AZ,NM}'::text[],true,true FROM "Vendor" WHERE slug='gaf'
UNION ALL SELECT 'vc-oc-rep',id,'Sarah Chen','Regional Sales Rep','schen@owenscorning.com','(602) 555-0102','{AZ,NV}'::text[],true,true FROM "Vendor" WHERE slug='owens-corning'
UNION ALL SELECT 'vc-iko-rep',id,'David Park','Territory Manager','dpark@iko.com','(602) 555-0103','{AZ,NM,UT}'::text[],true,true FROM "Vendor" WHERE slug='iko'
UNION ALL SELECT 'vc-malarkey-rep',id,'Jennifer Walsh','West Region Rep','jwalsh@malarkeyroofing.com','(602) 555-0104','{AZ,CA,NV}'::text[],true,true FROM "Vendor" WHERE slug='malarkey'
UNION ALL SELECT 'vc-andersen-rep',id,'Robert Kim','Certified Contractor Rep','rkim@andersenwindows.com','(602) 555-0201','{AZ,NV}'::text[],true,true FROM "Vendor" WHERE slug='andersen-windows'
UNION ALL SELECT 'vc-pella-rep',id,'Amanda Rodriguez','Pro Sales Rep','arodriguez@pella.com','(602) 555-0202','{AZ}'::text[],true,true FROM "Vendor" WHERE slug='pella'
UNION ALL SELECT 'vc-provia-rep',id,'Chris Martin','Dealer Development','cmartin@provia.com','(602) 555-0203','{AZ,NM,CO}'::text[],true,true FROM "Vendor" WHERE slug='provia'
UNION ALL SELECT 'vc-milgard-rep',id,'Lisa Nguyen','Southwest Region Rep','lnguyen@milgard.com','(602) 555-0204','{AZ,NV,CA}'::text[],true,true FROM "Vendor" WHERE slug='milgard'
UNION ALL SELECT 'vc-marvin-rep',id,'Tom Bradley','Authorized Dealer Rep','tbradley@marvin.com','(602) 555-0205','{AZ}'::text[],true,true FROM "Vendor" WHERE slug='marvin'
UNION ALL SELECT 'vc-hardie-rep',id,'Kevin OBrien','Contractor Alliance Rep','kobrien@jameshardie.com','(602) 555-0301','{AZ,NM}'::text[],true,true FROM "Vendor" WHERE slug='james-hardie'
UNION ALL SELECT 'vc-lp-rep',id,'Rachel Greene','Territory Manager','rgreene@lpcorp.com','(602) 555-0302','{AZ,NV,UT}'::text[],true,true FROM "Vendor" WHERE slug='lp-smartside'
UNION ALL SELECT 'vc-trane-rep',id,'Mark Johnson','Comfort Specialist Rep','mjohnson@trane.com','(602) 555-0401','{AZ}'::text[],true,true FROM "Vendor" WHERE slug='trane'
UNION ALL SELECT 'vc-carrier-rep',id,'Diana Phillips','Factory Auth Rep','dphillips@carrier.com','(602) 555-0402','{AZ,NM}'::text[],true,true FROM "Vendor" WHERE slug='carrier'
UNION ALL SELECT 'vc-lennox-rep',id,'Steve Williams','Premier Dealer Rep','swilliams@lennox.com','(602) 555-0403','{AZ,NV}'::text[],true,true FROM "Vendor" WHERE slug='lennox'
UNION ALL SELECT 'vc-daikin-rep',id,'Yuki Tanaka','Comfort Pro Rep','ytanaka@daikincomfort.com','(602) 555-0404','{AZ,CA}'::text[],true,true FROM "Vendor" WHERE slug='daikin'
UNION ALL SELECT 'vc-kohler-rep',id,'Brian Foster','Pro Rep','bfoster@kohler.com','(602) 555-0501','{AZ,NM}'::text[],true,true FROM "Vendor" WHERE slug='kohler'
UNION ALL SELECT 'vc-moen-rep',id,'Emily Davis','Pro Preferred Rep','edavis@moen.com','(602) 555-0502','{AZ,NV}'::text[],true,true FROM "Vendor" WHERE slug='moen'
UNION ALL SELECT 'vc-generac-rep',id,'Jason Wright','PowerPro Dealer Rep','jwright@generac.com','(602) 555-0601','{AZ,NM,NV}'::text[],true,true FROM "Vendor" WHERE slug='generac'
UNION ALL SELECT 'vc-lutron-rep',id,'Michelle Lee','Certified Installer Rep','mlee@lutron.com','(602) 555-0602','{AZ}'::text[],true,true FROM "Vendor" WHERE slug='lutron'
UNION ALL SELECT 'vc-sw-rep',id,'Carlos Ramirez','Pro Sales Rep','cramirez@sherwin-williams.com','(602) 555-0701','{AZ}'::text[],true,true FROM "Vendor" WHERE slug='sherwin-williams'
UNION ALL SELECT 'vc-bm-rep',id,'Natalie Brown','Contractor Sales','nbrown@benjaminmoore.com','(602) 555-0702','{AZ,NM}'::text[],true,true FROM "Vendor" WHERE slug='benjamin-moore'
UNION ALL SELECT 'vc-de-rep',id,'Marcus Valle','Pro Partner Rep','mvalle@dunnedwards.com','(602) 555-0703','{AZ,NV}'::text[],true,true FROM "Vendor" WHERE slug='dunn-edwards'
UNION ALL SELECT 'vc-rockwool-rep',id,'Peter Strand','Certified Installer Rep','pstrand@rockwool.com','(602) 555-0801','{AZ,NM,CO}'::text[],true,true FROM "Vendor" WHERE slug='rockwool'
UNION ALL SELECT 'vc-leaffilter-rep',id,'Tony Russo','Authorized Installer Rep','trusso@leaffilter.com','(602) 555-0901','{AZ,NV}'::text[],true,true FROM "Vendor" WHERE slug='leaffilter'
UNION ALL SELECT 'vc-abc-rep',id,'Rick Hernandez','Branch Manager','rhernandez@abcsupply.com','(602) 555-1001','{AZ}'::text[],true,true FROM "Vendor" WHERE slug='abc-supply'
UNION ALL SELECT 'vc-beacon-rep',id,'Diane Kowalski','Account Manager','dkowalski@becn.com','(602) 555-1002','{AZ,NM}'::text[],true,true FROM "Vendor" WHERE slug='beacon-building'
ON CONFLICT ("id") DO NOTHING;


-- ============================================================================
-- VENDOR RESOURCES — Brochures, Spec Sheets, Catalogs
-- ============================================================================

-- ROOFING
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-gaf-timberline',(SELECT id FROM "Vendor" WHERE slug='gaf'),'Timberline HDZ Brochure','GAF Timberline HDZ shingles with color options.','brochure','https://www.gaf.com/en-us/document-library/documents/productdocuments/residentialroofingdocuments/shingledocuments/timberlinehdzdocuments/timberline-hdz-brochure','PDF','product','{roofing,shingles,timberline}',true),
  ('vr-gaf-warranty',(SELECT id FROM "Vendor" WHERE slug='gaf'),'GAF Lifetime System Warranty','Full system warranty for certified installations.','spec_sheet','https://www.gaf.com/en-us/document-library/documents/productdocuments/residentialroofingdocuments/warrantydocuments/gaf-roofing-system-limited-warranty','PDF','warranty','{roofing,warranty}',true),
  ('vr-oc-duration',(SELECT id FROM "Vendor" WHERE slug='owens-corning'),'Duration Shingles Brochure','Duration series with SureNail technology.','brochure','https://www.owenscorning.com/en-us/roofing/shingles/duration','PDF','product','{roofing,shingles,duration}',true),
  ('vr-ct-landmark',(SELECT id FROM "Vendor" WHERE slug='certainteed'),'Landmark Shingles Brochure','Landmark series specifications and colors.','brochure','https://www.certainteed.com/residential-roofing/products/landmark','PDF','product','{roofing,shingles,landmark}',true),
  ('vr-iko-dynasty',(SELECT id FROM "Vendor" WHERE slug='iko'),'Dynasty Shingles Brochure','Dynasty with ArmourZone reinforced nailing.','brochure','https://www.iko.com/na/residential-roofing/shingles/dynasty','PDF','product','{roofing,shingles,dynasty}',true),
  ('vr-tamko-heritage',(SELECT id FROM "Vendor" WHERE slug='tamko'),'Heritage Shingles Brochure','Heritage laminated shingle specs and colors.','brochure','https://www.tamko.com/residential-roofing/laminated-shingles/heritage','PDF','product','{roofing,shingles,heritage}',true),
  ('vr-malarkey-legacy',(SELECT id FROM "Vendor" WHERE slug='malarkey'),'Legacy Shingles Brochure','Legacy with Scotchgard Protector.','brochure','https://www.malarkeyroofing.com/roofing-products/residential/legacy','PDF','product','{roofing,shingles,legacy}',true),
  ('vr-decra-villa',(SELECT id FROM "Vendor" WHERE slug='decra'),'Villa Tile Brochure','Stone-coated steel roofing specifications.','brochure','https://www.decra.com/products/villa-tile','PDF','product','{roofing,metal,tile}',true)
ON CONFLICT ("id") DO NOTHING;

-- WINDOWS
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-andersen-400',(SELECT id FROM "Vendor" WHERE slug='andersen-windows'),'400 Series Brochure','Andersen 400 Series wood windows.','brochure','https://www.andersenwindows.com/windows-and-doors/400-series','PDF','product','{windows,400-series}',true),
  ('vr-andersen-renewal',(SELECT id FROM "Vendor" WHERE slug='andersen-windows'),'Renewal by Andersen Brochure','Full-service replacement with Fibrex.','brochure','https://www.renewalbyandersen.com/windows','PDF','product','{windows,replacement}',true),
  ('vr-andersen-energy',(SELECT id FROM "Vendor" WHERE slug='andersen-windows'),'Energy Performance Guide','U-Factor, SHGC, Energy Star details.','spec_sheet','https://www.andersenwindows.com/support/energy-performance','PDF','technical','{windows,energy}',true),
  ('vr-pella-lifestyle',(SELECT id FROM "Vendor" WHERE slug='pella'),'Lifestyle Series Brochure','Wood interior, fiberglass exterior.','brochure','https://www.pella.com/windows-doors/lifestyle-series','PDF','product','{windows,lifestyle}',true),
  ('vr-pella-architect',(SELECT id FROM "Vendor" WHERE slug='pella'),'Architect Series Brochure','Premium wood windows and hardware.','brochure','https://www.pella.com/windows-doors/architect-series','PDF','product','{windows,architect}',true),
  ('vr-provia-endure',(SELECT id FROM "Vendor" WHERE slug='provia'),'Endure Vinyl Windows Brochure','Triple-pane, SuperNova low-E glass.','brochure','https://www.provia.com/windows/endure','PDF','product','{windows,vinyl,endure}',true),
  ('vr-provia-aeris',(SELECT id FROM "Vendor" WHERE slug='provia'),'Aeris Wood Windows Brochure','Oak/pine interior, ComforTech glazing.','brochure','https://www.provia.com/windows/aeris','PDF','product','{windows,wood,aeris}',true),
  ('vr-milgard-trinsic',(SELECT id FROM "Vendor" WHERE slug='milgard'),'Trinsic Series Brochure','Narrow frames, contemporary design.','brochure','https://www.milgard.com/windows/vinyl/trinsic','PDF','product','{windows,vinyl,trinsic}',true),
  ('vr-milgard-ultra',(SELECT id FROM "Vendor" WHERE slug='milgard'),'Ultra Series Fiberglass Brochure','Full lifetime warranty, fiberglass.','brochure','https://www.milgard.com/windows/fiberglass/ultra','PDF','product','{windows,fiberglass}',true),
  ('vr-marvin-signature',(SELECT id FROM "Vendor" WHERE slug='marvin'),'Signature Collection Brochure','Ultimate and Modern premium windows.','brochure','https://www.marvin.com/windows/signature','PDF','product','{windows,premium}',true),
  ('vr-simonton-5500',(SELECT id FROM "Vendor" WHERE slug='simonton'),'Reflections 5500 Brochure','ProSolar low-E glass, multi-chamber.','brochure','https://www.simonton.com/windows/reflections-5500','PDF','product','{windows,vinyl}',true),
  ('vr-jeldwen-siteline',(SELECT id FROM "Vendor" WHERE slug='jeld-wen'),'Siteline Wood Windows Brochure','AuraLast pine technology.','brochure','https://www.jeld-wen.com/en-us/products/windows/siteline','PDF','product','{windows,wood}',true)
ON CONFLICT ("id") DO NOTHING;

-- SIDING
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-hardie-plank',(SELECT id FROM "Vendor" WHERE slug='james-hardie'),'HardiePlank Lap Siding Brochure','Fiber cement, ColorPlus, warranty.','brochure','https://www.jameshardie.com/products/hardieplank-lap-siding','PDF','product','{siding,fiber-cement}',true),
  ('vr-hardie-color',(SELECT id FROM "Vendor" WHERE slug='james-hardie'),'ColorPlus Collection','Factory-applied finish color guide.','brochure','https://www.jameshardie.com/colorplus-technology','PDF','product','{siding,colors}',true),
  ('vr-hardie-install',(SELECT id FROM "Vendor" WHERE slug='james-hardie'),'HardiePlank Installation Guide','Professional installation instructions.','installation_guide','https://www.jameshardie.com/installation','PDF','installation','{siding,installation}',true),
  ('vr-lp-lap',(SELECT id FROM "Vendor" WHERE slug='lp-smartside'),'LP SmartSide Lap Siding Brochure','SmartGuard process, 50-year warranty.','brochure','https://www.lpcorp.com/smartside/products/lap-siding','PDF','product','{siding,engineered-wood}',true),
  ('vr-lp-install',(SELECT id FROM "Vendor" WHERE slug='lp-smartside'),'LP SmartSide Installation Manual','Complete professional installation.','installation_guide','https://www.lpcorp.com/smartside/resources/installation','PDF','installation','{siding,installation}',true),
  ('vr-ct-cedar',(SELECT id FROM "Vendor" WHERE slug='certainteed'),'Cedar Impressions Brochure','Polymer shake and shingle siding.','brochure','https://www.certainteed.com/siding/products/cedar-impressions','PDF','product','{siding,polymer}',true)
ON CONFLICT ("id") DO NOTHING;

-- HVAC
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-trane-xv',(SELECT id FROM "Vendor" WHERE slug='trane'),'XV Series AC Brochure','XV20i/XV18 variable-speed specifications.','brochure','https://www.trane.com/residential/en/products/air-conditioners/xv-series','PDF','product','{hvac,air-conditioner}',true),
  ('vr-trane-catalog',(SELECT id FROM "Vendor" WHERE slug='trane'),'Trane Product Guide','Complete residential HVAC catalog.','catalog','https://www.trane.com/residential/en/resources/product-catalog','PDF','product','{hvac,catalog}',true),
  ('vr-carrier-infinity',(SELECT id FROM "Vendor" WHERE slug='carrier'),'Infinity Series AC Brochure','Greenspeed intelligence, 26 SEER2.','brochure','https://www.carrier.com/residential/en/us/products/air-conditioners/24VNA6','PDF','product','{hvac,air-conditioner}',true),
  ('vr-lennox-xc',(SELECT id FROM "Vendor" WHERE slug='lennox'),'XC25 AC Brochure','Precise comfort, 26 SEER2, iComfort.','brochure','https://www.lennox.com/products/air-conditioners/xc25','PDF','product','{hvac,air-conditioner}',true),
  ('vr-daikin-fit',(SELECT id FROM "Vendor" WHERE slug='daikin'),'Daikin FIT System Brochure','Side-discharge, inverter technology.','brochure','https://www.daikincomfort.com/products/daikin-fit','PDF','product','{hvac,heat-pump}',true),
  ('vr-daikin-mini',(SELECT id FROM "Vendor" WHERE slug='daikin'),'Daikin Mini-Split Brochure','Ductless systems. Aurora, Emura.','brochure','https://www.daikincomfort.com/products/ductless','PDF','product','{hvac,mini-split}',true),
  ('vr-rheem-prestige',(SELECT id FROM "Vendor" WHERE slug='rheem'),'Prestige Series HVAC Brochure','High-efficiency AC and heat pumps.','brochure','https://www.rheem.com/product-category/air-conditioners','PDF','product','{hvac,prestige}',true)
ON CONFLICT ("id") DO NOTHING;

-- PLUMBING
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-kohler-kitchen',(SELECT id FROM "Vendor" WHERE slug='kohler'),'Kohler Kitchen Faucets Catalog','Sensate, Artifacts, Purist lines.','catalog','https://www.kohler.com/en/browse/kitchen-faucets','PDF','product','{plumbing,faucets}',true),
  ('vr-kohler-bath',(SELECT id FROM "Vendor" WHERE slug='kohler'),'Kohler Bathroom Collection','Toilets, faucets, showers, bathtubs.','catalog','https://www.kohler.com/en/browse/bathroom','PDF','product','{plumbing,bathroom}',true),
  ('vr-moen-motionsense',(SELECT id FROM "Vendor" WHERE slug='moen'),'MotionSense Faucets Brochure','Touchless kitchen faucets.','brochure','https://www.moen.com/kitchen/motionsense-hands-free-faucets','PDF','product','{plumbing,touchless}',true),
  ('vr-delta-touch',(SELECT id FROM "Vendor" WHERE slug='delta-faucet'),'Touch2O Technology Brochure','Touch2O faucet technology specs.','brochure','https://www.deltafaucet.com/design-innovation/innovations/touch-technology','PDF','product','{plumbing,touchless}',true),
  ('vr-rinnai-tankless',(SELECT id FROM "Vendor" WHERE slug='rinnai'),'Tankless Water Heater Guide','Sensei, SE+, RE series comparison.','brochure','https://www.rinnai.us/tankless-water-heater','PDF','product','{plumbing,tankless}',true),
  ('vr-aosmith-hybrid',(SELECT id FROM "Vendor" WHERE slug='ao-smith'),'Voltex Hybrid Electric Brochure','Heat pump water heater, 3.75 UEF.','brochure','https://www.aosmith.com/products/water-heaters/residential-electric/voltex','PDF','product','{plumbing,water-heater}',true),
  ('vr-navien-npe2',(SELECT id FROM "Vendor" WHERE slug='navien'),'NPE-2 Tankless Brochure','Condensing, 0.96 UEF, ComfortFlow.','brochure','https://www.navieninc.com/products/tankless-water-heaters/npe-2','PDF','product','{plumbing,tankless}',true)
ON CONFLICT ("id") DO NOTHING;

-- ELECTRICAL
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-generac-standby',(SELECT id FROM "Vendor" WHERE slug='generac'),'Home Standby Generator Guide','10kW-26kW with Mobile Link.','brochure','https://www.generac.com/all-products/generators/home-backup-generators','PDF','product','{electrical,generator}',true),
  ('vr-generac-pwrcell',(SELECT id FROM "Vendor" WHERE slug='generac'),'PWRcell Energy Storage Brochure','Battery storage, solar integration.','brochure','https://www.generac.com/all-products/clean-energy/pwrcell','PDF','product','{electrical,battery}',true),
  ('vr-lutron-caseta',(SELECT id FROM "Vendor" WHERE slug='lutron'),'Caseta Smart Lighting Brochure','Wireless dimmers, switches, Pico.','brochure','https://www.casetawireless.com','PDF','product','{electrical,smart-home}',true),
  ('vr-eaton-panels',(SELECT id FROM "Vendor" WHERE slug='eaton'),'Residential Loadcenter Catalog','CH and BR series panels/breakers.','catalog','https://www.eaton.com/us/en-us/catalog/electrical-circuit-protection/residential-loadcenters.html','PDF','product','{electrical,panels}',true),
  ('vr-leviton-decora',(SELECT id FROM "Vendor" WHERE slug='leviton'),'Decora Smart Product Guide','Smart switches, dimmers, outlets.','brochure','https://www.leviton.com/products/decora-smart','PDF','product','{electrical,smart-home}',true),
  ('vr-squared-qo',(SELECT id FROM "Vendor" WHERE slug='square-d'),'QO Load Center Catalog','Plug-on neutral, AFCI/GFCI.','catalog','https://www.se.com/us/en/product-range/61273-qo-load-centers','PDF','product','{electrical,panels}',true)
ON CONFLICT ("id") DO NOTHING;

-- INSULATION
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-oc-atticat',(SELECT id FROM "Vendor" WHERE slug='owens-corning'),'AttiCat Blown-In System Guide','Expanding blown-in for attics.','brochure','https://www.owenscorning.com/en-us/insulation/products/atticat-expanding-blown-in-insulation','PDF','product','{insulation,blown-in}',true),
  ('vr-oc-rvalue',(SELECT id FROM "Vendor" WHERE slug='owens-corning'),'Insulation R-Value Guide','R-value by climate zone.','spec_sheet','https://www.owenscorning.com/en-us/insulation/resources/r-value-chart','PDF','technical','{insulation,r-value}',true),
  ('vr-jm-batts',(SELECT id FROM "Vendor" WHERE slug='johns-manville'),'Fiberglass Batt Guide','R-11 through R-38 specifications.','brochure','https://www.jm.com/en/building-insulation/batt-insulation','PDF','product','{insulation,fiberglass}',true),
  ('vr-jm-spray',(SELECT id FROM "Vendor" WHERE slug='johns-manville'),'Spray Foam Brochure','Open-cell and closed-cell specs.','brochure','https://www.jm.com/en/building-insulation/spray-foam-insulation','PDF','product','{insulation,spray-foam}',true),
  ('vr-rockwool-comfort',(SELECT id FROM "Vendor" WHERE slug='rockwool'),'Comfortbatt Product Guide','Stone wool, fire-resistant, R-15-R-30.','brochure','https://www.rockwool.com/north-america/products-and-applications/products/comfortbatt','PDF','product','{insulation,stone-wool}',true),
  ('vr-knauf-ecobatt',(SELECT id FROM "Vendor" WHERE slug='knauf'),'EcoBatt Insulation Guide','ECOSE bio-based binder.','brochure','https://www.knaufinsulation.com/products/ecobatt-insulation','PDF','product','{insulation,fiberglass}',true)
ON CONFLICT ("id") DO NOTHING;

-- GUTTERS
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-leaffilter-guide',(SELECT id FROM "Vendor" WHERE slug='leaffilter'),'LeafFilter Product Brochure','Micro-mesh gutter protection.','brochure','https://www.leaffilter.com/how-it-works','PDF','product','{gutters,gutter-guard}',true),
  ('vr-leafguard-brochure',(SELECT id FROM "Vendor" WHERE slug='leafguard'),'LeafGuard Seamless Gutter Brochure','One-piece with built-in hood.','brochure','https://www.leafguard.com/our-system','PDF','product','{gutters,seamless}',true),
  ('vr-spectra-catalog',(SELECT id FROM "Vendor" WHERE slug='spectra-metals'),'Spectra Gutter Systems Catalog','Complete gutter/downspout catalog.','catalog','https://www.spectrametals.com/products','PDF','product','{gutters,aluminum}',true)
ON CONFLICT ("id") DO NOTHING;

-- PAINT
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-sw-duration',(SELECT id FROM "Vendor" WHERE slug='sherwin-williams'),'Duration Paint Brochure','Advanced acrylic, one-coat coverage.','brochure','https://www.sherwin-williams.com/en-us/products/duration','PDF','product','{painting,interior}',true),
  ('vr-sw-emerald',(SELECT id FROM "Vendor" WHERE slug='sherwin-williams'),'Emerald Collection Brochure','Premium self-priming paint.','brochure','https://www.sherwin-williams.com/en-us/products/emerald','PDF','product','{painting,premium}',true),
  ('vr-sw-pro',(SELECT id FROM "Vendor" WHERE slug='sherwin-williams'),'Pro Contractor Guide','Contractor program and benefits.','catalog','https://www.sherwin-williams.com/en-us/pro','PDF','product','{painting,contractor}',true),
  ('vr-bm-regal',(SELECT id FROM "Vendor" WHERE slug='benjamin-moore'),'Regal Select Brochure','Color Lock technology interior.','brochure','https://www.benjaminmoore.com/en-us/interior-exterior-paints-stains/product-catalog/rsp-regal-select-paint','PDF','product','{painting,interior}',true),
  ('vr-bm-aura',(SELECT id FROM "Vendor" WHERE slug='benjamin-moore'),'Aura Paint Collection','Premium Gennex technology.','brochure','https://www.benjaminmoore.com/en-us/interior-exterior-paints-stains/product-catalog/aip-aura-interior-paint','PDF','product','{painting,premium}',true),
  ('vr-behr-marquee',(SELECT id FROM "Vendor" WHERE slug='behr'),'BEHR Marquee Brochure','One-coat hide, stain-blocking.','brochure','https://www.behr.com/consumer/products/marquee','PDF','product','{painting,one-coat}',true),
  ('vr-de-evershield',(SELECT id FROM "Vendor" WHERE slug='dunn-edwards'),'Evershield Exterior Brochure','Desert-climate tested, UV-resistant.','brochure','https://www.dunnedwards.com/products/evershield','PDF','product','{painting,exterior}',true)
ON CONFLICT ("id") DO NOTHING;

-- FLOORING
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-shaw-coretec',(SELECT id FROM "Vendor" WHERE slug='shaw-industries'),'COREtec Waterproof Flooring Brochure','LVP and tile specs, colors.','brochure','https://www.shawfloors.com/flooring/vinyl/coretec','PDF','product','{flooring,lvp}',true),
  ('vr-shaw-hardwood',(SELECT id FROM "Vendor" WHERE slug='shaw-industries'),'Shaw Hardwood Catalog','Engineered and solid hardwood.','catalog','https://www.shawfloors.com/flooring/hardwood','PDF','product','{flooring,hardwood}',true),
  ('vr-mohawk-revwood',(SELECT id FROM "Vendor" WHERE slug='mohawk'),'RevWood Laminate Brochure','Waterproof laminate, Uniclic.','brochure','https://www.mohawkflooring.com/laminate/revwood','PDF','product','{flooring,laminate}',true),
  ('vr-mohawk-solidtech',(SELECT id FROM "Vendor" WHERE slug='mohawk'),'SolidTech LVP Brochure','All Pet Plus protection.','brochure','https://www.mohawkflooring.com/vinyl/solidtech','PDF','product','{flooring,lvp}',true),
  ('vr-mannington-adura',(SELECT id FROM "Vendor" WHERE slug='mannington'),'ADURA Max Brochure','Waterproof, HydroLoc core.','brochure','https://www.mannington.com/residential/resilient/adura-max','PDF','product','{flooring,lvp}',true)
ON CONFLICT ("id") DO NOTHING;

-- DISTRIBUTORS
INSERT INTO "VendorResource" ("id","vendorId","title","description","type","url","format","category","tags","isActive") VALUES
  ('vr-abc-catalog',(SELECT id FROM "Vendor" WHERE slug='abc-supply'),'ABC Supply Product Catalog','Roofing, siding, windows, more.','catalog','https://www.abcsupply.com/products','PDF','product','{distributor,catalog}',true),
  ('vr-beacon-catalog',(SELECT id FROM "Vendor" WHERE slug='beacon-building'),'Beacon Product Catalog','Multi-category building supply.','catalog','https://www.becn.com/products','PDF','product','{distributor,catalog}',true),
  ('vr-beacon-pro',(SELECT id FROM "Vendor" WHERE slug='beacon-building'),'Beacon PRO+ Program','Loyalty program, benefits, rebates.','brochure','https://www.becn.com/pro-plus','PDF','program','{distributor,rewards}',true)
ON CONFLICT ("id") DO NOTHING;

COMMIT;

-- Verify final counts
SELECT
  (SELECT COUNT(*) FROM "Vendor" WHERE "isActive" = true) AS total_vendors,
  (SELECT COUNT(*) FROM "VendorContact" WHERE "isActive" = true) AS total_contacts,
  (SELECT COUNT(*) FROM "VendorResource" WHERE "isActive" = true) AS total_resources;

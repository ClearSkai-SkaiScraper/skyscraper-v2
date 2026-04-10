-- Comprehensive Vendor Seed for SkaiScrape
-- Creates 28 vendors across all roofing categories

BEGIN;

-- Clear existing for clean slate (optional - comment out to preserve)
-- DELETE FROM "VendorResource";
-- DELETE FROM "VendorContact";
-- DELETE FROM "VendorLocation";
-- DELETE FROM "Vendor";

-- 1. GAF (if not exists)
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "primaryEmail", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'gaf', 'GAF', 'North America''s largest roofing manufacturer with full residential & commercial systems.', '/images/vendors/gaf.png', 'https://www.gaf.com', 'Shingle', '1-877-423-7663', 'gafpro@gaf.com', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 2. ABC Supply
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'abc-supply', 'ABC Supply', 'America''s largest wholesale distributor of roofing and exterior products.', '/images/vendors/abc.png', 'https://www.abcsupply.com', 'Distribution', '1-800-786-1089', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 3. SRS Distribution
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'srs-distribution', 'SRS Distribution', 'Premier distributor of roofing and building products.', '/images/vendors/srs.png', 'https://www.srsdistribution.com', 'Distribution', '1-800-927-7761', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 4. Westlake Royal
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'westlake-royal', 'Westlake Royal Building Products', 'Stone-coated steel, concrete tile, and polymer shakes.', '/images/vendors/westlake.png', 'https://www.westlakeroyalbuildingproducts.com', 'Multi-Category', '1-888-333-4552', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 5. Elite Roofing Supply
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'elite-roofing-supply', 'Elite Roofing Supply', 'Arizona''s premier roofing materials supplier.', '/images/vendors/elite.png', 'https://www.eliteroofingsupply.com', 'Distribution', '1-602-437-1276', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 6. CertainTeed
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "primaryEmail", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'certainteed', 'CertainTeed', 'Premium roofing shingles with industry-leading warranties and energy efficiency.', '/images/vendors/certainteed.png', 'https://www.certainteed.com', 'Shingle', '1-800-233-8990', 'certainteed@saint-gobain.com', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 7. Owens Corning
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'owens-corning', 'Owens Corning', 'Premium residential shingles and total protection roofing systems.', '/images/vendors/oc.png', 'https://www.owenscorning.com', 'Shingle', '1-800-438-7465', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 8. TAMKO
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "primaryEmail", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'tamko', 'TAMKO Building Products', 'Premium roofing products including Heritage laminated shingles and MetalWorks systems.', '/images/vendors/tamko.png', 'https://www.tamko.com', 'Shingle', '1-800-641-4691', 'info@tamko.com', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 9. Eagle Roofing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'eagle-roofing', 'Eagle Roofing Products', 'Concrete tile systems with profiles for Southwest aesthetics and durability.', '/images/vendors/eagle.png', 'https://eagleroofing.com', 'Tile', '1-800-333-2353', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 10. IKO Industries
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'iko', 'IKO Industries', 'Premium roofing systems including Dynasty, Cambridge, and Marathon shingles.', '/images/vendors/iko.png', 'https://www.iko.com', 'Shingle', '1-888-456-7663', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 11. Malarkey Roofing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'malarkey', 'Malarkey Roofing Products', 'Sustainable roofing with recycled rubber and polymer-modified shingles.', '/images/vendors/malarkey.png', 'https://www.malarkeyroofing.com', 'Shingle', '1-800-545-1191', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 12. Boral Roofing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'boral', 'Boral Roofing', 'Premium clay and concrete tiles for residential and commercial roofing.', '/images/vendors/boral.png', 'https://www.boralroof.com', 'Tile', '1-800-669-8453', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 13. Monier Lifetile
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'monier', 'Monier Lifetile', 'Concrete roof tiles with natural aesthetics and fire resistance.', '/images/vendors/monier.png', 'https://www.monierlifetile.com', 'Tile', '1-800-571-8453', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 14. DECRA Metal Roofing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'decra', 'DECRA Metal Roofing', 'Stone-coated steel roofing systems with 50+ year life expectancy.', '/images/vendors/decra.png', 'https://www.decra.com', 'Metal', '1-800-258-9693', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 15. Standing Seam USA
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'standing-seam-usa', 'Standing Seam USA', 'Premium standing seam metal panels for commercial and residential.', '/images/vendors/ssusa.png', 'https://standingseamusa.com', 'Metal', '1-844-776-6537', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 16. Firestone Building Products
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'firestone', 'Firestone Building Products', 'Commercial TPO, EPDM, and SBS roofing membranes.', '/images/vendors/firestone.png', 'https://www.firestonebpco.com', 'Flat/TPO', '1-800-428-4442', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 17. Carlisle SynTec
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'carlisle', 'Carlisle SynTec', 'Commercial single-ply roofing with TPO, EPDM, and PVC membranes.', '/images/vendors/carlisle.png', 'https://www.carlislesyntec.com', 'Flat/TPO', '1-800-479-6832', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 18. Versico Roofing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'versico', 'Versico Roofing Systems', 'Commercial TPO and EPDM systems with VersiWeld technology.', '/images/vendors/versico.png', 'https://www.versico.com', 'Flat/TPO', '1-800-992-7663', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 19. Johns Manville
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'johns-manville', 'Johns Manville', 'Commercial roofing membranes and insulation products.', '/images/vendors/jm.png', 'https://www.jm.com', 'Flat/TPO', '1-800-654-3103', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 20. Nucor Building Systems
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'nucor-skyline', 'Nucor Building Systems', 'Metal building systems and metal roof panels.', '/images/vendors/nucor.png', 'https://www.nucorskyline.com', 'Metal', '1-800-527-6823', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 21. ATAS International
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'atas-intl', 'ATAS International', 'Architectural metal panels and wall systems.', '/images/vendors/atas.png', 'https://www.atas.com', 'Metal', '1-800-468-1441', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 22. Roof Hugger
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'roof-hugger', 'Roof Hugger', 'Sub-purlin retrofit system for standing seam roofs.', '/images/vendors/roof-hugger.png', 'https://www.roofhugger.com', 'Metal', '1-800-771-1711', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 23. Tremco Roofing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'tremco', 'Tremco Roofing', 'Commercial roofing coatings and restoration systems.', '/images/vendors/tremco.png', 'https://www.tremcoroofing.com', 'Coatings', '1-800-321-6357', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 24. Gaco Western
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'gaco', 'Gaco Western', 'Silicone roof coatings and spray foam systems.', '/images/vendors/gaco.png', 'https://www.gaco.com', 'Coatings', '1-800-331-0196', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 25. APOC Coatings
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'apoc', 'APOC Coatings', 'Reflective roof coatings and waterproofing products.', '/images/vendors/apoc.png', 'https://www.apoc.com', 'Coatings', '1-888-994-2762', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 26. Metal Sales Manufacturing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'metal-sales', 'Metal Sales Manufacturing', 'Metal roofing and wall panels for agriculture, commercial, and residential.', '/images/vendors/metal-sales.png', 'https://www.metalsales.us.com', 'Metal', '1-800-406-7387', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 27. Berridge Manufacturing
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'berridge', 'Berridge Manufacturing', 'Architectural metal roofing and wall panels.', '/images/vendors/berridge.png', 'https://www.berridge.com', 'Metal', '1-800-669-0009', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- 28. Polyglass USA
INSERT INTO "Vendor" (id, slug, name, description, logo, website, category, "primaryPhone", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'polyglass', 'Polyglass USA', 'SBS modified bitumen roofing and waterproofing.', '/images/vendors/polyglass.png', 'https://www.polyglass.us', 'Flat/TPO', '1-800-832-3826', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Show count
SELECT COUNT(*) as "Total Vendors" FROM "Vendor";
SELECT name, category, website FROM "Vendor" ORDER BY name;

-- Seed Arizona roofing vendors
INSERT INTO vendors (id, name, category, website, phone, email, is_active, state, city, created_at, updated_at) VALUES
(gen_random_uuid(), 'GAF Materials Corporation', 'Manufacturer', 'https://www.gaf.com', '877-423-7663', 'info@gaf.com', true, 'AZ', 'Phoenix', NOW(), NOW()),
(gen_random_uuid(), 'ABC Supply Co.', 'Distributor', 'https://www.abcsupply.com', '623-580-1200', 'customerservice@abcsupply.com', true, 'AZ', 'Phoenix', NOW(), NOW()),
(gen_random_uuid(), 'SRS Distribution', 'Distributor', 'https://www.srs.com', '602-437-9720', 'info@srs.com', true, 'AZ', 'Phoenix', NOW(), NOW()),
(gen_random_uuid(), 'Beacon Building Products', 'Distributor', 'https://www.becn.com', '602-276-5811', 'info@becn.com', true, 'AZ', 'Phoenix', NOW(), NOW()),
(gen_random_uuid(), 'Owens Corning', 'Manufacturer', 'https://www.owenscorning.com', '800-438-7465', 'info@owenscorning.com', true, 'AZ', 'Tempe', NOW(), NOW()),
(gen_random_uuid(), 'CertainTeed', 'Manufacturer', 'https://www.certainteed.com', '800-233-8990', 'info@certainteed.com', true, 'AZ', 'Scottsdale', NOW(), NOW()),
(gen_random_uuid(), 'EagleView Technologies', 'Technology', 'https://www.eagleview.com', '866-659-8439', 'support@eagleview.com', true, 'AZ', 'Phoenix', NOW(), NOW()),
(gen_random_uuid(), 'Westlake Royal Roofing Solutions', 'Manufacturer', 'https://www.westlakeroyal.com', '800-221-0397', 'info@westlakeroyal.com', true, 'AZ', 'Mesa', NOW(), NOW()),
(gen_random_uuid(), 'Polyglass USA', 'Manufacturer', 'https://www.polyglass.us', '800-543-4009', 'info@polyglass.us', true, 'AZ', 'Phoenix', NOW(), NOW()),
(gen_random_uuid(), 'Tremco Roofing', 'Manufacturer', 'https://www.tremcoroofing.com', '800-321-7906', 'roofing@tremcoinc.com', true, 'AZ', 'Chandler', NOW(), NOW()),
(gen_random_uuid(), 'Johns Manville', 'Manufacturer', 'https://www.jm.com', '800-654-3103', 'roofing@jm.com', true, 'AZ', 'Glendale', NOW(), NOW()),
(gen_random_uuid(), 'Versico Roofing Systems', 'Manufacturer', 'https://www.versico.com', '800-992-7663', 'info@versico.com', true, 'AZ', 'Gilbert', NOW(), NOW()),
(gen_random_uuid(), 'Firestone Building Products', 'Manufacturer', 'https://www.firestonebpco.com', '800-428-4442', 'info@fbpco.com', true, 'AZ', 'Peoria', NOW(), NOW()),
(gen_random_uuid(), 'Carlisle Construction Materials', 'Manufacturer', 'https://www.carlislesyntec.com', '800-479-6832', 'ccm@carlisle.com', true, 'AZ', 'Scottsdale', NOW(), NOW()),
(gen_random_uuid(), 'Atlas Roofing Corporation', 'Manufacturer', 'https://www.atlasroofing.com', '800-933-2383', 'info@atlasroofing.com', true, 'AZ', 'Surprise', NOW(), NOW());

-- Add vendor locations
INSERT INTO vendor_locations (id, vendor_id, address, city, state, zip, phone, is_primary, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  id,
  '123 Industrial Pkwy',
  city,
  state,
  '85001',
  phone,
  true,
  true,
  NOW(),
  NOW()
FROM vendors;

-- Add vendor contacts
INSERT INTO vendor_contacts (id, vendor_id, name, title, email, phone, is_primary, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  id,
  'Sales Representative',
  'Account Manager',
  email,
  phone,
  true,
  true,
  NOW(),
  NOW()
FROM vendors;

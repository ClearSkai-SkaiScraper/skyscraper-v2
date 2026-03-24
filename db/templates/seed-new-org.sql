-- =====================================================
-- NEW ORGANIZATION SEED DATA TEMPLATE
-- =====================================================
-- Provides optional demo/welcome data for new organizations
-- Replace placeholders: {{ORG_ID}}, {{USER_ID}}, {{USER_EMAIL}}
-- =====================================================

-- Variables (replace these with actual values)
-- {{ORG_ID}} = 'your-org-uuid-here'
-- {{USER_ID}} = 'your-user-uuid-here'
-- {{USER_EMAIL}} = 'user@example.com'

-- 1. Welcome Lead (Optional Demo Data)
-- =====================================================
INSERT INTO leads (
  id,
  org_id,
  user_id,
  name,
  email,
  phone,
  status,
  source,
  notes,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '{{ORG_ID}}'::uuid,
  '{{USER_ID}}'::uuid,
  'Welcome to SkaiScraper! 👋',
  'hello@preloss.com',
  '555-0100',
  'new',
  'system',
  'This is a sample lead to help you explore the platform. Feel free to edit or delete it once you''re comfortable with the system!',
  NOW(),
  NOW()
);

-- 2. Sample Vendor (Optional)
-- =====================================================
INSERT INTO vendors (
  id,
  org_id,
  name,
  type,
  service_types,
  region,
  website,
  contact_email,
  contact_phone,
  description,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '{{ORG_ID}}'::uuid,
  'Sample Roofing Supply Co.',
  'vendor',
  ARRAY['roofing', 'materials', 'supplies'],
  'Arizona',
  'https://example-vendor.com',
  'sales@example-vendor.com',
  '555-0200',
  'Example vendor for roofing materials and supplies. This is demo data.',
  NOW(),
  NOW()
);

-- 3. Sample Contractor (Optional)
-- =====================================================
INSERT INTO contractors (
  id,
  user_id,
  trade,
  region,
  company_name,
  website,
  contact_email,
  description,
  premium,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '{{USER_ID}}'::uuid,
  'roofer',
  'Arizona',
  'Example Roofing Pros',
  'https://example-contractor.com',
  'info@example-contractor.com',
  'Professional roofing contractor specializing in residential and commercial projects. This is demo data.',
  false,
  NOW(),
  NOW()
);

-- 4. Welcome Tokens (Starter Balance)
-- =====================================================
INSERT INTO tokens_ledger (
  id,
  org_id,
  user_id,
  amount,
  type,
  description,
  created_at
) VALUES (
  gen_random_uuid(),
  '{{ORG_ID}}'::uuid,
  '{{USER_ID}}'::uuid,
  100,
  'purchase',
  'Welcome bonus - 100 starter tokens to explore AI features',
  NOW()
);

-- 5. Sample Notification (Onboarding Reminder)
-- =====================================================
INSERT INTO notifications (
  id,
  user_id,
  title,
  message,
  type,
  read,
  created_at
) VALUES (
  gen_random_uuid(),
  '{{USER_ID}}'::uuid,
  '🎨 Complete Your Branding',
  'Add your company logo and brand colors to personalize all reports and documents. Visit Settings → Branding to get started.',
  'action',
  false,
  NOW()
),
(
  gen_random_uuid(),
  '{{USER_ID}}'::uuid,
  '🤖 Try the AI Assistant',
  'Generate professional reports instantly with our AI tools. Check out AI → DOL Analysis or AI → Weather Reports.',
  'info',
  false,
  NOW()
),
(
  gen_random_uuid(),
  '{{USER_ID}}'::uuid,
  '👥 Explore the Contractor Network',
  'Connect with verified contractors and vendors in your area. Visit Directory → Contractors or Directory → Vendors.',
  'info',
  false,
  NOW()
);

-- 6. Initialize Feature Flags (Optional)
-- =====================================================
INSERT INTO feature_flags (
  id,
  org_id,
  feature_name,
  enabled,
  created_at
) VALUES 
  (gen_random_uuid(), '{{ORG_ID}}'::uuid, 'ai_assistant', true, NOW()),
  (gen_random_uuid(), '{{ORG_ID}}'::uuid, 'pdf_generation', true, NOW()),
  (gen_random_uuid(), '{{ORG_ID}}'::uuid, 'vendor_directory', true, NOW()),
  (gen_random_uuid(), '{{ORG_ID}}'::uuid, 'contractor_network', true, NOW()),
  (gen_random_uuid(), '{{ORG_ID}}'::uuid, 'team_collaboration', false, NOW()),
  (gen_random_uuid(), '{{ORG_ID}}'::uuid, 'advanced_reporting', false, NOW())
ON CONFLICT (org_id, feature_name) DO NOTHING;

-- 7. Audit Log Entry
-- =====================================================
INSERT INTO audit_log (
  id,
  org_id,
  user_id,
  action,
  description,
  metadata,
  created_at
) VALUES (
  gen_random_uuid(),
  '{{ORG_ID}}'::uuid,
  '{{USER_ID}}'::uuid,
  'org_seeded',
  'Organization initialized with welcome data',
  jsonb_build_object(
    'seed_version', '1.0',
    'timestamp', NOW(),
    'user_email', '{{USER_EMAIL}}'
  ),
  NOW()
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check what was created
SELECT 
  'Leads' as item, COUNT(*) as count FROM leads WHERE org_id = '{{ORG_ID}}'::uuid
UNION ALL
SELECT 'Vendors', COUNT(*) FROM vendors WHERE org_id = '{{ORG_ID}}'::uuid
UNION ALL
SELECT 'Contractors', COUNT(*) FROM contractors WHERE user_id = '{{USER_ID}}'::uuid
UNION ALL
SELECT 'Tokens', SUM(amount) FROM tokens_ledger WHERE org_id = '{{ORG_ID}}'::uuid
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications WHERE user_id = '{{USER_ID}}'::uuid;

-- Check token balance
SELECT 
  org_id,
  user_id,
  SUM(amount) as total_tokens,
  COUNT(*) as transaction_count
FROM tokens_ledger
WHERE org_id = '{{ORG_ID}}'::uuid
GROUP BY org_id, user_id;

-- =====================================================
-- CLEAN UP (Remove Demo Data)
-- =====================================================
-- Run these queries when user wants to remove demo data

-- DELETE FROM leads WHERE org_id = '{{ORG_ID}}'::uuid AND source = 'system';
-- DELETE FROM vendors WHERE org_id = '{{ORG_ID}}'::uuid AND contact_email LIKE '%example%';
-- DELETE FROM contractors WHERE user_id = '{{USER_ID}}'::uuid AND contact_email LIKE '%example%';
-- DELETE FROM notifications WHERE user_id = '{{USER_ID}}'::uuid AND type = 'info';

-- =====================================================
-- END OF SEED TEMPLATE
-- =====================================================

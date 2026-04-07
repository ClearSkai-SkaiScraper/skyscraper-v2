# 🚀 MASTER CLEANUP SPRINT — April 2026

> **Created:** April 6, 2026  
> **Goal:** Fix ALL issues uncovered in comprehensive audit  
> **Tracking:** Check boxes as completed

---

## PHASE 1: CRITICAL FIXES (Do First) ⏱️ ~2 hours

### 1.1 Environment Variables

- [ ] **Add missing Clerk keys to `.env.local`:**
  ```bash
  CLERK_SECRET_KEY=sk_live_xxxxx
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
  ```
- [ ] **Verify Clerk keys work:** `curl https://skaiscrape.com/api/health`
- [ ] **Remove deprecated VITE\_ prefix vars** from `.env.local`

### 1.2 Verify Org Resolution Fix

- [ ] **Test claims load:** Open any claim in browser after deploy
- [ ] **Run diagnostic:** `curl https://skaiscrape.com/api/__truth -H "Cookie: ..."`
- [ ] **Verify cross-org:** Test with user who has multiple org memberships

---

## PHASE 2: PDF/REPORTS LINT CLEANUP ⏱️ ~4 hours

### 2.1 Create Shared Types (src/types/pdf.ts)

- [ ] Create `src/types/pdf.ts` with:

  ```typescript
  export interface PDFBranding {
    companyName?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    companyLicense?: string;
    logoUrl?: string;
    brandColor?: string;
    accentColor?: string;
    employeeName?: string;
    employeeTitle?: string;
    employeeEmail?: string;
    employeePhone?: string;
    headshotUrl?: string;
  }

  export interface PDFContext {
    reports?: unknown[];
    branding?: PDFBranding;
    addons?: Record<string, unknown>;
    sections?: string[];
    ai?: Record<string, unknown>;
  }

  export interface PDFSection {
    id: string;
    title: string;
    content?: string;
    paragraphs?: string[];
  }
  ```

### 2.2 Fix High-Error PDF Files

- [ ] **src/lib/pdf/ExportOrchestrator.ts** (25 errors)
  - Replace `any` with `PDFContext`
  - Remove unused `SectionRegistry` import
  - Prefix unused vars with `_`

- [ ] **src/lib/pdf/clientBrandedHeader.ts** (20 errors)
  - Import and use `PDFBranding` interface
  - Fix import sort order

- [ ] **src/lib/pdf/clientCoverPage.ts** (8 errors)
  - Remove direct `process.env` access
  - Import from `@/lib/config`
  - Remove unused `darkenRgb` function

- [ ] **src/lib/pdf/PdfDocument.tsx** (5 errors)
  - Add `alt=""` to decorative images
  - Prefix unused `index` with `_index`

- [ ] **src/lib/pdf/TemplateLayouts.ts** (12 errors)
  - Type the context parameter properly

- [ ] **src/lib/pdf/annotations.ts** (6 errors)
  - Rename `ox`, `oy` to `_ox`, `_oy`
  - Rename catch `e` to `_e`

- [ ] **src/lib/pdf/baseTemplate.tsx** (2 errors)
  - Add `alt=""` to images

- [ ] **src/lib/pdf/components.tsx** (7 errors)
  - Add `alt=""` to all Image components
  - Fix `any` type on line 341

- [ ] **src/lib/pdf/components/PDFHeader.tsx** (3 errors)
  - Type `__branding` properly

- [ ] **src/lib/pdf/contractorPacketRenderer.tsx** (3 errors)
  - Add alt text, fix `any` types

- [ ] **src/lib/pdf/coverPage.ts** - Audit and fix
- [ ] **src/lib/pdf/brandedHeader.ts** - Audit and fix
- [ ] **src/lib/pdf/weather-report-pdf.ts** - Audit and fix (large file)
- [ ] **src/lib/pdf/weather-pdf.ts** - Audit and fix
- [ ] **src/lib/pdf/weatherPdfEngine.ts** - Audit and fix
- [ ] **src/lib/pdf/weatherTemplate.ts** - Audit and fix
- [ ] **src/lib/pdf/enhancedReportBuilder.ts** - Audit and fix
- [ ] **src/lib/pdf/generateReport.ts** - Audit and fix
- [ ] **src/lib/pdf/generateReportPDF.tsx** - Audit and fix
- [ ] **src/lib/pdf/hybridExport.ts** - Audit and fix
- [ ] **src/lib/pdf/justification-pdf.ts** - Audit and fix
- [ ] **src/lib/pdf/pdfConfig.ts** - Audit and fix
- [ ] **src/lib/pdf/reportBuilder.ts** - Audit and fix
- [ ] **src/lib/pdf/safePdfGenerate.ts** - Audit and fix
- [ ] **src/lib/pdf/damageReport.ts** - Audit and fix
- [ ] **src/lib/pdf/exportTimeline.ts** - Audit and fix
- [ ] **src/lib/pdf/financialPdfEngine.ts** - Audit and fix
- [ ] **src/lib/pdf/full-claim-packet.ts** - Audit and fix
- [ ] **src/lib/pdf/buildShowcase.ts** - Audit and fix
- [ ] **src/lib/pdf/renderEngine.ts** - Audit and fix
- [ ] **src/lib/pdf/utils.ts** - Audit and fix
- [ ] **src/lib/pdf/proposalRenderer.tsx** - Audit and fix
- [ ] **src/lib/pdf/rebuttalRenderer.tsx** - Audit and fix
- [ ] **src/lib/pdf/supplementRenderer.tsx** - Audit and fix

### 2.3 Fix Reports Library Files

- [ ] **src/lib/reports/renderReportHtml.ts** - Add types, fix unsafe access
- [ ] **src/lib/reports/getAllUserReports.ts** - Add types
- [ ] **src/lib/reports/generator.ts** - Add types
- [ ] **src/lib/reports/generators.ts** - Add types
- [ ] **src/lib/reports/queue.ts** - Add types
- [ ] **src/lib/reports/pdf-utils.ts** - Add types
- [ ] **src/lib/reports/recommendation-engine.ts** - Add types
- [ ] **src/lib/reports/recommendation-analytics.ts** - Add types
- [ ] **src/lib/reports/recommendation-schema.ts** - Audit
- [ ] **src/lib/reports/report-metrics.ts** - Add types
- [ ] **src/lib/reports/buildReportData.ts** - Add types
- [ ] **src/lib/reports/claims-html.ts** - Add types
- [ ] **src/lib/reports/retail-html.ts** - Add types
- [ ] **src/lib/reports/saveAiPdfToStorage.ts** - Add types
- [ ] **src/lib/reports/saveReportHistory.ts** - Add types
- [ ] **src/lib/reports/section-ordering.ts** - Add types
- [ ] **src/lib/reports/sectionBuilders.ts** - Add types
- [ ] **src/lib/reports/sectionRegistry.ts** - Add types
- [ ] **src/lib/reports/templateSections.ts** - Add types
- [ ] **src/lib/reports/types.ts** - Already types, verify complete
- [ ] **src/lib/reports/ai/** - Audit all files in subfolder

---

## PHASE 3: IMPLEMENT MISSING FEATURES ⏱️ ~6 hours

### 3.1 Email Integration (Currently Stub)

- [ ] **src/lib/email.ts** - Wire Resend properly
  ```typescript
  // Current: TODO: Integrate with your email provider
  // Fix: Import and use Resend client
  ```
- [ ] **src/lib/mailer.ts** - Verify Resend integration works
- [ ] **src/lib/storm-intake/email-notifications.ts** - Verify works
- [ ] **Test email flow:** Create claim → trigger email → verify delivery

### 3.2 Queue System (Currently Stub)

- [ ] **src/lib/queue.ts** - Implement with existing pg-boss
  ```typescript
  // Current: TODO: Implement actual queue with Redis/BullMQ
  // Fix: Wire pg-boss (already in schema)
  ```
- [ ] **src/lib/queue/enqueue-job-safe.ts** - Wire to pg-boss

### 3.3 Storage Integration (Currently Stub)

- [ ] **src/lib/supabaseStorage.ts** - Wire real Supabase client
- [ ] **Verify upload works:** Test file upload flow

### 3.4 Weather API (Currently Stub)

- [ ] **src/lib/ai/weather-verification.ts** - Wire real weather API
- [ ] **Verify WeatherStack API key set**

### 3.5 Import Features (Currently Stub)

- [ ] **src/lib/import/xactimateParser.ts** - Implement ESX/XML parsing
- [ ] **src/lib/import/csvParser.ts** - Implement CSV parsing
- [ ] **src/lib/import/autoMatcher.ts** - Implement field matching

---

## PHASE 4: FIX TODO/FIXME COMMENTS ⏱️ ~3 hours

### 4.1 API Route TODOs (13 items)

- [ ] **src/app/api/settings/lead-routing/route.ts**
  - `// TODO: Persist to org_settings table when it exists`
  - Fix: Use existing org settings or create migration

- [ ] **src/app/api/contacts/invite/route.ts**
  - `// TODO: Send actual invite email via Resend`
  - Fix: Wire Resend email

- [ ] **src/app/api/carrier/export/route.ts**
  - `// TODO: Generate actual file URL when PDF export is wired`
  - Fix: Wire PDF generation

- [ ] **src/app/api/claims/[claimId]/import/route.ts** (2 TODOs)
  - `// TODO: Implement import using estimate_line_items model`
  - Fix: Implement import logic

### 4.2 Lib TODOs (115 items) - High Priority

- [ ] **src/lib/feature-flags.ts** (2 TODOs)
  - Add featureFlags field to Org model

- [ ] **src/lib/branding/resolveTheme.ts**
  - Fetch from database based on orgId

- [ ] **src/lib/security/roles.ts**
  - Implement actual org ownership check

- [ ] **src/lib/security/serverSecurity.ts**
  - Implement role-based permissions

- [ ] **src/lib/guard.ts**
  - Re-enable strict enforcement after beta

- [ ] **src/lib/ai/report-generator.ts** (4 TODOs)
  - claim_photo_meta model doesn't exist
  - Auto-detect discontinued products
  - Extract pre-existing repairs from photos
  - Count cracked tiles from AI

- [ ] **src/lib/ai/costEstimation.ts** (4 TODOs)
  - Implement regional pricing database
  - Implement material costs database
  - Implement labor rates database
  - Fetch estimates from database

- [ ] **src/lib/ai/workflowAutomation.ts** (3 TODOs)
  - Smart assignment based on workload
  - Automation based on action type
  - Pattern analysis

- [ ] **src/lib/ai/feedback/logAction.ts** (4 TODOs)
  - Create ai_actions migration
  - Query ai_actions table

- [ ] **src/lib/monitoring/healthCheck.ts** (5 TODOs)
  - Implement Redis check
  - Check S3/R2 connectivity
  - Check email service
  - Check WebSocket status
  - Implement CPU monitoring

- [ ] **src/lib/notifications/sendNotification.ts** (2 TODOs)
  - Queue email via email_queue
  - Send via push service

- [ ] **src/lib/claim/buildClaimContext.ts** (2 TODOs)
  - Add brandLogoUrl to org model
  - Add contactInfo to org model

- [ ] **src/lib/client-portal/authentication.ts**
  - Implement email sending via Resend

- [ ] **src/lib/client-portal/dashboard.ts**
  - Store in messages table

### 4.3 Component TODOs (20 items)

- [ ] **src/components/branding/LicensingTab.tsx** (2 TODOs)
  - Add roc_number field to org_branding schema

- [ ] **src/components/branding/TeamLibraryTab.tsx** (2 TODOs)
  - Team members functionality
  - Team member photo upload

- [ ] **src/components/ai/ClaimWriterPanel.tsx** (2 TODOs)
  - Implement PDF export
  - Implement email/send functionality

- [ ] **src/components/ai/BATFPanel.tsx**
  - Upload to Supabase storage

- [ ] **src/components/claims/ClaimFiles.tsx**
  - Implement file upload to Firebase Storage

- [ ] **src/components/claims/ClaimMessages.tsx**
  - Implement POST /api/claims/[id]/messages

---

## PHASE 5: ENV VAR CONSOLIDATION ⏱️ ~2 hours

### 5.1 Create Centralized Config

- [ ] **Create `src/lib/config/index.ts`** with all env vars:
  ```typescript
  export const config = {
    clerk: {
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    },
    database: {
      url: process.env.DATABASE_URL!,
    },
    // ... all vars
  } as const;
  ```

### 5.2 Replace Direct process.env Access (745 usages)

- [ ] **Run codemod:** Find all `process.env.` and replace with config import
- [ ] **Priority files:**
  - src/lib/pdf/clientCoverPage.ts
  - src/lib/demo/constants.ts
  - src/lib/demo/config.ts
  - src/lib/mailer.ts
  - src/lib/intel/emailDeliveryChannel.ts

### 5.3 Clean Up .env.example

- [ ] Remove deprecated vars marked in `src/types/global.d.ts`
- [ ] Consolidate duplicate vars (SUPABASE_URL vs NEXT_PUBLIC_SUPABASE_URL)
- [ ] Remove unused vars (audit against actual usage)

---

## PHASE 6: PRISMA SCHEMA UPDATES ⏱️ ~2 hours

### 6.1 Add Missing Models

- [ ] **Add `claim_photo_meta` model:**

  ```prisma
  model claim_photo_meta {
    id        String   @id @default(cuid())
    claimId   String
    photoUrl  String
    aiAnalysis Json?
    createdAt DateTime @default(now())
    claim     claims   @relation(fields: [claimId], references: [id])
    @@index([claimId])
  }
  ```

- [ ] **Add featureFlags to Org model:**

  ```prisma
  model Org {
    // ... existing fields
    featureFlags Json? @default("{}")
  }
  ```

- [ ] **Add ParsedDocument model:**
  ```prisma
  model ParsedDocument {
    id         String   @id @default(cuid())
    claimId    String?
    sourceUrl  String
    parsedText String?
    metadata   Json?
    createdAt  DateTime @default(now())
  }
  ```

### 6.2 Add Missing Fields

- [ ] Add `roc_number` to `org_branding`
- [ ] Add `brandLogoUrl` to Org (if not exists)
- [ ] Add `contactInfo` JSON to Org (if not exists)

### 6.3 Create Migration

- [ ] Generate migration: `pnpm prisma migrate dev --name add_missing_models`
- [ ] Apply to production: `pnpm prisma migrate deploy`

---

## PHASE 7: MIGRATION CONSOLIDATION ⏱️ ~3 hours

### 7.1 Audit Duplicate Migrations

- [ ] **user_organizations** - 3 different files
  - 20251114_create_user_organizations.sql
  - 20251120_create_user_organizations.sql
  - URGENT_20251222_create_user_organizations_public.sql
  - Consolidate into one

- [ ] **client_portal_tables** - Multiple files
  - 20251123_client_portal_phase1.sql
  - 20251128_create_client_portal_tables.sql
  - 20260111_create_client_portal_tables.sql
  - 20260112_create_portal_tables.sql
  - Consolidate

- [ ] **notifications** - Multiple files
  - 20251130_create_notifications.sql
  - 20251130_notifications_enhancements.sql
  - 20251201_create_notifications.sql
  - 20260115_create_notification.sql
  - 20260201_canonical_notifications.sql
  - Consolidate

### 7.2 Create Baseline Migration

- [ ] Export current schema: `pg_dump --schema-only $DATABASE_URL > db/baseline.sql`
- [ ] Archive old migrations: `mv db/migrations/*.sql db/migrations/archive/`
- [ ] Create fresh migration from Prisma schema

---

## PHASE 8: LEGACY CODE CLEANUP ⏱️ ~2 hours

### 8.1 Archive Deprecated Files

- [ ] **src/lib/legacy/disabled.ts** - Review and delete if unused
- [ ] **src/app/storm-intake/[id]/page.tsx** - Archive (model doesn't exist)
- [ ] **src/app/(app)/vendor-network/\_components/VendorLogo.tsx** - Delete (use @/components/vendors/VendorLogo)

### 8.2 Remove Legacy Patterns

- [ ] **src/app/(app)/dashboard/trades/clients/page.tsx**
  - Remove lowercase "accepted"/"connected" support
  - Standardize on uppercase

- [ ] **src/app/(app)/dashboard/trades/connections/ConnectionRequestCard.tsx**
  - Remove lowercase "pending" support

### 8.3 Clean Deprecated Env Vars

- [ ] Remove from `src/types/global.d.ts`:
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - NEXT_PUBLIC_MAPBOX_TOKEN (use NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)
  - NEXT_PUBLIC_API_URL (use NEXT_PUBLIC_API_BASE_URL)
  - NEXT_PUBLIC_URL (use NEXT_PUBLIC_BASE_URL)
  - VITE_CLERK_PUBLISHABLE_KEY

---

## PHASE 9: COMPONENT & STORE AUDIT ⏱️ ~2 hours

### 9.1 Run Knip for Unused Exports

- [ ] Run: `pnpm knip`
- [ ] Review output and remove unused exports
- [ ] Delete unused components

### 9.2 Zustand Store Audit

- [ ] **src/stores/wizardStore.ts** - Verify usage
- [ ] **src/stores/assistantStore.ts** - Verify usage
- [ ] **src/stores/claimIQStore.ts** - Verify usage
- [ ] **src/stores/onboardingStore.ts** - Verify usage
- [ ] Consider adding stores for:
  - Claim state
  - User preferences
  - Navigation state

### 9.3 Component Deduplication

- [ ] Check for duplicate VendorLogo components
- [ ] Check for duplicate modal implementations
- [ ] Check for duplicate button variants

---

## PHASE 10: SCRIPTS & ARCHIVE CLEANUP ⏱️ ~1 hour

### 10.1 Archive Old Scripts

- [ ] Review `scripts/delete-demo-org*.sql` - Keep only latest
- [ ] Archive `scripts/agent-qa-sprint*.md` - Move to `.archive/old-docs`
- [ ] Review all `.cjs` scripts for relevance

### 10.2 Clean .archive Folder

- [ ] Review `old-docs/` (97 items) - Delete if >6 months old
- [ ] Review `old-env-files/` (8 items) - Delete all
- [ ] Review `old-scripts/` (15 items) - Delete if unused

---

## VERIFICATION CHECKLIST

After completing all phases:

```bash
# 1. Lint should pass with 0 errors
pnpm lint:core

# 2. TypeScript should compile
pnpm typecheck

# 3. Prisma should validate
pnpm prisma validate

# 4. Build should succeed
pnpm build

# 5. Tests should pass
pnpm test:smoke

# 6. No TODO count should be < 30
grep -rn "TODO\|FIXME" src --include="*.ts" --include="*.tsx" | wc -l
```

---

## PROGRESS TRACKER

| Phase                            | Status | Est. Time | Actual |
| -------------------------------- | ------ | --------- | ------ |
| Phase 1: Critical Fixes          | ⬜     | 2h        | -      |
| Phase 2: PDF/Reports Lint        | ⬜     | 4h        | -      |
| Phase 3: Implement Features      | ⬜     | 6h        | -      |
| Phase 4: Fix TODOs               | ⬜     | 3h        | -      |
| Phase 5: Env Consolidation       | ⬜     | 2h        | -      |
| Phase 6: Prisma Updates          | ⬜     | 2h        | -      |
| Phase 7: Migration Consolidation | ⬜     | 3h        | -      |
| Phase 8: Legacy Cleanup          | ⬜     | 2h        | -      |
| Phase 9: Component Audit         | ⬜     | 2h        | -      |
| Phase 10: Scripts Cleanup        | ⬜     | 1h        | -      |
| **TOTAL**                        |        | **27h**   | -      |

---

## EXECUTION ORDER

1. **Phase 1** - Critical fixes (auth must work)
2. **Phase 6** - Prisma schema (needed for Phase 3)
3. **Phase 2** - Lint cleanup (biggest pain point)
4. **Phase 3** - Implement features
5. **Phase 4** - Fix TODOs
6. **Phase 5** - Env consolidation
7. **Phase 7** - Migration cleanup
8. **Phase 8** - Legacy cleanup
9. **Phase 9** - Component audit
10. **Phase 10** - Scripts cleanup

---

**Ready to start? Begin with Phase 1!**

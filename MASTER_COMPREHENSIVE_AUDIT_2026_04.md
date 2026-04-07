# 🔬 MASTER COMPREHENSIVE AUDIT — April 2026

> **Generated:** April 6, 2026  
> **Scope:** Full codebase audit - broken code, missing pieces, legacy cleanup, technical debt

---

## 📊 CODEBASE STATISTICS

| Metric                        | Count     |
| ----------------------------- | --------- |
| **Prisma Models**             | 297       |
| **API Route Files**           | 650       |
| **HTTP Endpoints**            | 892       |
| **App Pages**                 | 478       |
| **Components**                | 546       |
| **UI Components**             | 70        |
| **Zustand Stores**            | 4         |
| **Migration Files**           | 282       |
| **Env Vars in .env.example**  | 332       |
| **Env Vars Currently Set**    | 67        |
| **Schema Lines**              | 7,525     |
| **Direct process.env Usages** | 745       |
| **TODO/FIXME Comments**       | 148 total |

---

## 🚨 CRITICAL ISSUES (P0 - Fix Immediately)

### 1. MISSING CLERK ENV VARS

**Impact:** Authentication completely broken in production  
**Files:** `.env.local`

```
❌ CLERK_SECRET_KEY - NOT SET
❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY - NOT SET
✅ VITE_CLERK_PUBLISHABLE_KEY - Set (wrong format, use NEXT_PUBLIC_)
```

**FIX:**

```bash
# Add to .env.local:
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
```

---

### 2. ORG RESOLUTION INCONSISTENCY (JUST FIXED)

**Impact:** Claims not loading for users with multiple org memberships  
**Status:** ✅ Fixed in commit `1e9cf104`  
**Files Changed:**

- `src/lib/auth/getActiveOrgSafe.ts` - Reordered to DB membership first
- `src/app/api/diag/org/route.ts` - New diagnostic endpoint
- `src/app/api/__truth/route.ts` - Auth truth endpoint

---

## 🔴 HIGH PRIORITY (P1 - Fix This Week)

### 3. PDF/REPORTS LINT ERRORS — 964 Problems

**Impact:** Code quality, potential runtime crashes  
**Location:** `src/lib/pdf/`, `src/lib/reports/`

**Summary of Issues:**
| Issue Type | Count | Files |
|------------|-------|-------|
| `@typescript-eslint/no-explicit-any` | ~200 | All PDF files |
| `@typescript-eslint/no-unsafe-member-access` | ~300 | PDF generators |
| `@typescript-eslint/no-unused-vars` | ~50 | Various |
| `jsx-a11y/alt-text` missing | ~20 | TSX components |
| `no-restricted-syntax` (direct process.env) | ~10 | Cover pages |

**Files Needing Work:**

```
src/lib/pdf/ExportOrchestrator.ts - 25 errors
src/lib/pdf/clientCoverPage.ts - 8 errors (includes process.env violation)
src/lib/pdf/clientBrandedHeader.ts - 20 errors
src/lib/pdf/coverPage.ts - High error count
src/lib/pdf/weather-report-pdf.ts - 38KB, likely many errors
src/lib/pdf/enhancedReportBuilder.ts - 27KB file
src/lib/reports/renderReportHtml.ts - 19KB, needs typing
src/lib/reports/getAllUserReports.ts - 14KB
```

**Fix Strategy:**

1. Create types in `src/types/pdf.ts` for common structures
2. Add proper interfaces for PDF context, branding, sections
3. Replace `any` with proper types incrementally
4. Prefix unused vars with `_`

---

### 4. INCOMPLETE TODO/FIXME IMPLEMENTATIONS

**Impact:** Features returning stubs, not real functionality  
**Count:** 115 in src/lib, 13 in API routes, 20 in components

**Critical Unimplemented:**

```typescript
// src/lib/email.ts - Email not actually sending
// TODO: Integrate with your email provider (SendGrid, AWS SES, etc.)

// src/lib/queue.ts - No real queue
// TODO: Implement actual queue with Redis/BullMQ

// src/lib/supabaseStorage.ts - Storage not wired
// TODO: Replace with real Supabase storage client once configured

// src/lib/ai/weather-verification.ts - Weather API stub
// TODO: Integrate with your existing weather API

// src/lib/import/xactimateParser.ts - Critical feature missing
// TODO: Implement Xactimate ESX/XML file parsing

// src/lib/security/serverSecurity.ts - RBAC incomplete
// TODO: Implement role-based permissions
```

---

### 5. ENVIRONMENT VARIABLE CHAOS

**Impact:** Runtime failures, config inconsistency

**Problems:**

- 332 vars defined in `.env.example`
- Only 67 vars actually set in `.env.local`
- 745 direct `process.env` accesses (should use config)
- Duplicate var names (e.g., `SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL`)

**Deprecated Vars Still Referenced:**

```typescript
// src/types/global.d.ts shows these deprecated:
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // Use NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_MAPBOX_TOKEN; // Duplicate
NEXT_PUBLIC_API_URL; // Use NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_URL; // Use NEXT_PUBLIC_BASE_URL
```

**Fix:** Run `tsx scripts/audit/check-env.ts` and consolidate

---

## 🟡 MEDIUM PRIORITY (P2 - Fix This Month)

### 6. MIGRATIONS NEED CONSOLIDATION

**Impact:** Slow DB setup, potential conflicts  
**Count:** 282 migration files in `db/migrations/`

**Issues Found:**

- Multiple migrations creating same tables on different dates
- No clear migration order (filenames are timestamps but inconsistent)
- Some migrations reference tables that may not exist yet

**Example Duplicates:**

```
20251114_create_user_organizations.sql
20251120_create_user_organizations.sql
URGENT_20251222_create_user_organizations_public.sql
```

**Fix Strategy:**

1. Create consolidated baseline migration
2. Archive old migrations
3. Use Prisma migrate for new changes

---

### 7. LEGACY/DEPRECATED CODE TO REMOVE

**Impact:** Maintenance burden, confusion

**Files/Patterns to Archive:**

```
src/lib/legacy/disabled.ts - Explicit legacy folder
src/app/storm-intake/[id]/page.tsx - "DEPRECATED: stormIntake model doesn't exist"
src/app/(app)/vendor-network/_components/VendorLogo.tsx - "@deprecated Import from @/components/vendors/VendorLogo"
```

**Legacy Patterns Still in Use:**

```typescript
// src/app/(app)/layout.tsx:29
// Replaced legacy UnifiedNavigation with new AppSidebar

// src/app/(app)/dashboard/trades/clients/page.tsx:68
// Accept both "ACCEPTED" and legacy lowercase "accepted"/"connected"
```

---

### 8. MISSING PRISMA MODEL FIELDS

**Impact:** Features can't work as designed

**Referenced but Not in Schema:**

```typescript
// src/lib/ai/report-generator.ts
// TODO: claim_photo_meta model doesn't exist in schema

// src/lib/ai/similarity/embedClaim.ts
// TODO: Store embedding once claimEmbedding model is added to Prisma schema

// src/lib/ai/documentProcessing.ts
// TODO: Add ParsedDocument model to Prisma schema if needed

// src/lib/feature-flags.ts
// TODO: Add featureFlags field to Org model in Prisma schema
// TODO: Add featureFlags JSONB column to Org model
```

---

### 9. COMPONENT REDUNDANCY

**Impact:** Inconsistent UI, maintenance burden

**Potential Duplicates:**

- Multiple VendorLogo components
- Multiple button variants with overlapping purposes
- Multiple modal/dialog implementations

**Check Script:** `pnpm knip` to find unused exports

---

## 🟢 LOW PRIORITY (P3 - Backlog)

### 10. ZUSTAND STORES AUDIT

**Current Stores:**

```
src/stores/wizardStore.ts
src/stores/assistantStore.ts
src/stores/claimIQStore.ts
src/stores/onboardingStore.ts
```

**Issues:**

- Only 4 stores for a large app - might need more for better state isolation
- Check if all stores use persist middleware consistently

---

### 11. ARCHIVE CLEANUP

**Location:** `.archive/`  
**Files:** 114 archived files

**Subdirectories:**

- `old-docs/` - 97 items
- `old-env-files/` - 8 items
- `old-scripts/` - 15 items

**Action:** Review and delete if >6 months old

---

### 12. SCRIPTS AUDIT

**Location:** `scripts/`  
**Files:** 43 scripts

**Potentially Obsolete:**

```
scripts/delete-demo-org-v2.sql - Superseded by v3?
scripts/delete-demo-org-v3.sql - Which is current?
scripts/delete-demo-org.sql - Multiple versions
scripts/agent-qa-sprint21.md through sprint26 - Old sprint docs
```

---

## 📋 MASTER TODO CHECKLIST

### IMMEDIATE (Today/Tomorrow)

- [ ] Add CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.local
- [ ] Verify claims load after org resolution fix deployment
- [ ] Run `/api/__truth?testClaim=<id>` to verify auth consistency

### THIS WEEK

- [ ] Create `src/types/pdf.ts` with proper PDF interfaces
- [ ] Fix top 5 worst PDF files (clientCoverPage, ExportOrchestrator, etc.)
- [ ] Consolidate env var usage - create `src/lib/config/index.ts`
- [ ] Remove direct process.env in cover page files

### THIS SPRINT (2 Weeks)

- [ ] Fix all 964 lint errors (or reduce to <100)
- [ ] Implement missing email sending (Resend integration)
- [ ] Wire up supabaseStorage.ts properly
- [ ] Add claim_photo_meta model to Prisma schema
- [ ] Add featureFlags JSONB to Org model

### THIS MONTH

- [ ] Consolidate migrations into baseline + incremental
- [ ] Archive legacy code and deprecated components
- [ ] Run `pnpm knip` and remove unused exports
- [ ] Implement Xactimate parser
- [ ] Wire Redis/BullMQ queue

### BACKLOG

- [ ] Review Zustand store architecture
- [ ] Clean up `.archive/` folder
- [ ] Audit and remove obsolete scripts
- [ ] Create comprehensive API documentation
- [ ] Add missing indexes to frequently queried Prisma fields

---

## 🧪 VERIFICATION COMMANDS

```bash
# Check lint errors
pnpm lint:core

# Find TODO/FIXME
grep -rn "TODO\|FIXME" src --include="*.ts" --include="*.tsx" | wc -l

# Check unused exports
pnpm knip

# Verify Prisma schema
pnpm prisma validate

# Run type check
pnpm typecheck

# Count API routes
find src/app/api -name "route.ts" | wc -l

# Check env coverage
tsx scripts/audit/check-env.ts
```

---

## 📈 SUCCESS METRICS

| Metric                | Current | Target             |
| --------------------- | ------- | ------------------ |
| Lint Errors           | 964     | <50                |
| TODO Comments         | 148     | <30                |
| Env Vars Used/Defined | 67/332  | 80/100             |
| Migration Files       | 282     | <50 (consolidated) |
| Type Coverage         | ~70%    | >95%               |

---

**Next Review:** April 13, 2026

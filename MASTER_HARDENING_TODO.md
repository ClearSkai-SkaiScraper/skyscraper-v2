# SkaiScraper — MASTER HARDENING TODO

> **Created:** 2026-03-23
> **Companion:** [MASTER_HARDENING_AUDIT.md](MASTER_HARDENING_AUDIT.md) — detailed audit findings
> **Phase:** Late Beta → DAU-Ready Production Hardening
> **Scope:** 200+ action items across 15 tracks — **everything** needed for real daily active usage

---

## Status Key

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked / needs decision

---

## Table of Contents

1. [Track 1 — SECURITY (P0)](#track-1--security-p0)
2. [Track 2 — RBAC CONSOLIDATION (P0)](#track-2--rbac-consolidation-p0)
3. [Track 3 — DATA MODEL FIXES (P0)](#track-3--data-model-fixes-p0)
4. [Track 4 — API ROUTE HARDENING (P0)](#track-4--api-route-hardening-p0)
5. [Track 5 — DOCUMENT & PDF SYSTEM (P1)](#track-5--document--pdf-system-p1)
6. [Track 6 — BRANDING CONSOLIDATION (P1)](#track-6--branding-consolidation-p1)
7. [Track 7 — ESTIMATOR COMPLETENESS (P1)](#track-7--estimator-completeness-p1)
8. [Track 8 — CLAIM WORKSPACE & UI GAPS (P1)](#track-8--claim-workspace--ui-gaps-p1)
9. [Track 9 — PORTAL & CLIENT FLOWS (P1)](#track-9--portal--client-flows-p1)
10. [Track 10 — EMAIL & NOTIFICATION SYSTEM (P1)](#track-10--email--notification-system-p1)
11. [Track 11 — ONBOARDING FLOWS (P2)](#track-11--onboarding-flows-p2)
12. [Track 12 — TESTING & CI (P2)](#track-12--testing--ci-p2)
13. [Track 13 — VISUAL CONSISTENCY & EMPTY STATES (P2)](#track-13--visual-consistency--empty-states-p2)
14. [Track 14 — CODE QUALITY & DEAD CODE (P2)](#track-14--code-quality--dead-code-p2)
15. [Track 15 — INFRASTRUCTURE & OPS (P2)](#track-15--infrastructure--ops-p2)
16. [Track 16 — END-TO-END GOLDEN PATH TESTS (P1)](#track-16--end-to-end-golden-path-tests-p1)
17. [Track 17 — ZUSTAND STORES (P2)](#track-17--zustand-stores-p2)
18. [Track 18 — STUB/TODO TRIAGE (P2)](#track-18--stubtodo-triage-p2)

---

## Track 1 — SECURITY (P0)

> These items represent real, exploitable vulnerabilities. Fix before any public exposure.

### 1.1 — Credential & Secret Exposure

- [ ] 🔴 **SEC-001** — Rotate Firebase service account key. `firebase-service-account.json` contains the full private key for `firebase-adminsdk-fbsvc@skaiscraper.iam.gserviceaccount.com` (key ID: `2c8df52...`). Remove from git history with `git filter-repo` or BFG. Use only `FIREBASE_SERVICE_ACCOUNT_BASE64` env var.
- [ ] 🔴 **SEC-002** — Remove hardcoded superuser email `buildingwithdamienray@gmail.com` from `src/lib/auth/rbac.ts`. Move to `PLATFORM_OWNER_EMAIL` env var.
- [ ] 🔴 **SEC-003** — Remove emergency auto-ADMIN on DB failure in `src/lib/auth/rbac.ts` (lines ~252–273). Transient DB errors should NOT grant admin access. Return 503 instead.
- [ ] 🔴 **SEC-004** — Default role when no role found is `admin` in `src/lib/auth/rbac.ts` (line ~217). Change default to `viewer` or `member`.

### 1.2 — Middleware & Auth

- [ ] 🔴 **SEC-005** — Middleware fails open for page routes on error (line ~337–343). Change to fail-closed — redirect to `/sign-in` on auth error, not passthrough.
- [ ] 🟡 **SEC-006** — `x-user-type` cookie is unsigned. A browser extension or client-side JS can set `x-user-type=pro` to force pro-surface routing for a client user. Sign the cookie or use httpOnly + server-set only.
- [ ] 🟡 **SEC-007** — `resolveOrg()` swallows ALL exceptions and returns `null`. DB outages silently degrade to "user has no org" instead of 500. Add error classification — return null for "not found," throw for infrastructure errors.
- [ ] 🟡 **SEC-008** — `resolveOrg()` returns `"build-time-placeholder"` during builds. Ensure no real data can be created/queried with this string. Add guard in Prisma middleware or `withOrgScope`.
- [ ] 🟡 **SEC-009** — Auto-provision org when `ALLOW_AUTO_PROVISION=1` creates predictable org IDs (`org_${userId}`) and auto-assigns `"owner"` (lowercase). Could be exploited to create phantom orgs. Disable in production.

### 1.3 — SQL Injection & XSS

- [ ] 🔴 **SEC-010** — Three routes use `$queryRawUnsafe` which bypasses Prisma's parameterized queries. Migrate to `$queryRaw` tagged template literals:
  - `src/app/api/branding/` — 2 calls
  - `src/app/api/admin/` — 1 call
- [ ] 🔴 **SEC-011** — Multiple components render AI/API-generated HTML via `dangerouslySetInnerHTML` without sanitization:
  - `src/components/claims/EvidencePhotoCard.tsx`
  - `src/app/(app)/weather/analytics/page.tsx` (line ~691)
  - Add `DOMPurify.sanitize()` before rendering, or use a Markdown renderer.

### 1.4 — Exposed Endpoints

- [ ] 🟡 **SEC-012** — Debug page at `src/app/(app)/diag/page.tsx` is publicly accessible with no auth guard. Exposes Clerk config and environment info. Gate behind `requireRole("ADMIN")` or delete.
- [ ] 🟡 **SEC-013** — `/api/cron/usage-reset` has NO auth check. Anyone can trigger the monthly reset. Add `CRON_SECRET` verification.
- [ ] 🟡 **SEC-014** — `/api/cron/trial-expiry` only checks `CRON_SECRET` if the env var is set. When missing, no auth at all. Make `CRON_SECRET` required.
- [ ] 🟡 **SEC-015** — Duplicate `/api/diag/ready` in public route matcher (lines 95 and 100 of middleware.ts). Remove duplicate.

### 1.5 — PII Logging

- [ ] 🟡 **SEC-016** — `console.log` statements log sensitive data in production:
  - `src/lib/ai/index.ts` (line 228) — logs AI model, token count, cost (billing-sensitive)
  - `src/app/portal/page.tsx` (lines 111, 119) — logs identity info (PII)
  - `src/lib/ai/carrier-negotiation.ts` (line 94) — logs negotiation strategy (business-sensitive)
  - `src/lib/auth/tenant.ts` (line 332) — logs org resolution details
  - Replace all with `logger.info()` / `logger.debug()` from `src/lib/logger.ts`

---

## Track 2 — RBAC CONSOLIDATION (P0)

> Three incompatible RBAC systems is the biggest permissions risk. Consolidate to one.

### 2.1 — Pick Canonical System

- [ ] 🔴 **RBAC-001** — Choose ONE RBAC system as canonical. Recommendation: **System B** (`src/lib/auth/rbac.ts`) — it has the most permissions (23), HOF wrappers (`withRoleGuard`, `withPermissionGuard`), and is the most mature.
- [ ] 🔴 **RBAC-002** — Deprecate System A (`src/lib/rbac.ts`) — 6 roles, 17 permissions, returns `null` on success (foot-gun API).
- [ ] 🔴 **RBAC-003** — Deprecate System C (`src/lib/auth/permissions.ts`) — 3 roles, verb:noun format, always returns `EDITOR` for portal users, has userId/email field mismatch bug.

### 2.2 — Unify Role Names

- [ ] 🔴 **RBAC-004** — Standardize role names across all tables and modules:
  - System A: `OWNER`, `ADMIN`, `MANAGER`, `FIELD_TECH`, `SALES_REP`, `VIEWER`
  - System B: `admin`, `manager`, `member`, `viewer`
  - System C: `ADMIN`, `MANAGER`, `MEMBER`
  - `requireAuth.ts`: `PROJECT_MANAGER`, `SALES_REP`, `FINANCE` (don't exist in any permission matrix)
  - `tenant.ts` auto-creates with `"owner"` (lowercase)
  - `requireOrg.ts` defaults to `"MEMBER"` (uppercase)
  - Pick ONE casing convention and ONE role set. Migrate all DB records.
- [ ] 🔴 **RBAC-005** — Fix role case mismatch — `"admin"` vs `"ADMIN"` vs `"Admin"` across modules causes runtime lookup failures.

### 2.3 — Fix DB Table Confusion

- [ ] 🟡 **RBAC-006** — System A queries `users.role` + `user_organizations`. System B queries `team_members` → `users`. System C queries `user_organizations` only. Consolidate to ONE role source table.
- [ ] 🟡 **RBAC-007** — Update client-side `RBACGuard` component (`src/components/rbac/RBACGuard.tsx`) to match canonical system's role names and permissions. Currently mirrors System A.
- [ ] 🟡 **RBAC-008** — `src/lib/auth/permissions.ts` compares `userId` (Clerk ID) against `email` field in permission checks. Portal upload permission is always denied. Fix field mapping.

### 2.4 — Clean Up Auth Helpers

- [ ] 🟡 **RBAC-009** — `withOrgScope` calls `auth()` twice per request (once for userId, once inside `resolveOrg`). Cache the auth result.
- [ ] 🟡 **RBAC-010** — `requireRole()` / `requirePermission()` in System A return `null` on success. Callers must check `if (result) return result`. Easy to misuse — refactor to throw on failure (matching System B/C pattern).
- [ ] 🟡 **RBAC-011** — Remove deprecated `resolveProjectRole()` and `resolveResourceAction()` from System C — they ignore their parameters and call other functions internally.
- [ ] 🟡 **RBAC-012** — `resolveOrg()` returns the _oldest_ membership if user has multiple. Add active org selection support or at minimum return the most recent.

---

## Track 3 — DATA MODEL FIXES (P0)

> Schema gaps that cause broken workflows and missing data.

### 3.1 — Claims Table

- [ ] 🔴 **DM-001** — Deduplicate homeowner email columns. Both `homeownerEmail` and `homeowner_email` exist on claims. Remove `homeownerEmail`, keep `homeowner_email` (matches snake_case convention). Write migration to merge data.
- [ ] 🔴 **DM-002** — Add `homeowner_phone` column to claims table. Currently phone requires fragile `property→contacts[0].phone` join. Denormalize to claims (same pattern as `homeowner_email`).
- [ ] 🔴 **DM-003** — Fix `loader.ts` — `policy_number` IS in the Prisma schema but loader hardcodes `null` with comment "Not in schema - add if needed". Add `policy_number` to the Prisma select in `loadClaimData()`.
- [ ] 🟡 **DM-004** — Fix `loader.ts` — `coverPhotoUrl` same issue. Exists in schema but not selected.
- [ ] 🟡 **DM-005** — `claims.carrier` is free-text string, not FK to `carriers` table. Carrier data is duplicated/inconsistent. Add `carrierId` FK or at minimum validate against `carriers.name`.
- [ ] 🟡 **DM-006** — Claim intake wizard saves phone to `contacts` record but never denormalizes onto claims row (unlike `insured_name` and `homeowner_email` which ARE denormalized). Fix the intake API to also set `homeowner_phone`.

### 3.2 — Model Duplication

- [ ] 🟡 **DM-007** — Duplicate `Client` (PascalCase, portal-facing) vs `clients` (lowercase, trades marketplace) models. `clients` has no `orgId`, no relations — appears orphaned. Audit usage and remove if dead.
- [ ] 🟡 **DM-008** — Duplicate `ReportTemplate` (PascalCase) vs `report_templates` (lowercase) models — two models for the same concept. Consolidate.
- [ ] 🟡 **DM-009** — Duplicate `CarrierProfile` (AI-detected) vs `carrier_profiles` (communication profiles) — different purpose but confusing names. Rename for clarity.
- [ ] 🟡 **DM-010** — `org_branding` has `orgId` with `@unique` but NO `@relation` to `Org`. Add FK constraint.

### 3.3 — Missing Fields

- [ ] 🟡 **DM-011** — `properties` has no `lat`/`lng` — only `property_profiles` does. Weather reports re-geocode on every generation. Add coordinates to `properties`.
- [ ] 🟡 **DM-012** — `users` has single `name` field — no `firstName`/`lastName`. Complicates personalization.
- [ ] 🟡 **DM-013** — `org_branding.companyAddress` is unstructured free-text. Consider splitting into `street/city/state/zip`.
- [ ] 🟡 **DM-014** — Dual logo storage: `org_branding.logoUrl` AND `Org.brandLogoUrl`. Pick one source of truth.
- [ ] 🟠 **DM-015** — `Client.address` is single free-text string vs `contacts` which has proper `street/city/state/zipCode`. Inconsistent data modeling.
- [ ] 🟠 **DM-016** — `customer_accounts` has no address fields at all. Must use `customer_properties` for address.
- [ ] 🟠 **DM-017** — `carriers` table has no phone, physical address, or adjuster roster. Sparse.

---

## Track 4 — API ROUTE HARDENING (P0)

> 77% of API routes lack rate limiting. Critical routes missing auth/validation.

### 4.1 — Rate Limiting

- [ ] 🔴 **API-001** — Add rate limiting to all upload/file endpoints:
  - `/api/upload/`
  - `/api/files/`
  - `/api/branding/upload/`
  - Use `standard` or `relaxed` preset from `src/lib/rateLimit.ts`
- [ ] 🔴 **API-002** — Add rate limiting to all AI endpoints that don't have it:
  - `/api/ai/` (all sub-routes)
  - Use `ai` preset (5/min)
- [ ] 🟡 **API-003** — Add rate limiting to core CRUD endpoints:
  - `/api/claims/` — all sub-routes
  - `/api/contacts/`
  - `/api/properties/`
  - `/api/leads/`
  - Use `standard` preset (10/min)
- [ ] 🟡 **API-004** — Add rate limiting to all portal API routes (15+ routes currently unprotected)
- [ ] 🟡 **API-005** — Add rate limiting to all webhook endpoints (defense against replay attacks)

### 4.2 — Auth & Validation

- [ ] 🔴 **API-006** — Audit all 425+ API route files for `orgId` filtering. Spot-check at least 30 critical routes.
- [ ] 🟡 **API-007** — Add Zod validation to all API routes accepting request bodies that don't have it.
- [ ] 🟡 **API-008** — Ensure no API routes return raw stack traces or internal error details to clients. Use `apiError(status, code, message)` consistently.

### 4.3 — Cron Security

- [ ] 🔴 **API-009** — Make `CRON_SECRET` required (not optional) for all cron endpoints:
  - `/api/cron/trial-expiry` — currently only checks if env var is set
  - `/api/cron/usage-reset` — no auth at all
  - `/api/cron/storm-alerts`
  - `/api/cron/stale-claims`
  - `/api/cron/weekly-digest`

---

## Track 5 — DOCUMENT & PDF SYSTEM (P1)

> 5 PDF libraries, 4 cover page systems, 5 reports with no branding.

### 5.1 — Cover Page Gaps (Fix These Reports)

- [ ] 🔴 **PDF-001** — Justification report (`src/lib/pdf/justification-pdf.ts`) — add unified cover page using `pdfHeader.ts`. Currently has inline header with only `companyName` + `pdfFooterText`.
- [ ] 🔴 **PDF-002** — Claim packet (`src/lib/pdf/claimPacketPdf.ts`) — add branding. Currently uses hardcoded colors, no logo, no headshot.
- [ ] 🔴 **PDF-003** — Financial audit report (`src/lib/pdf/financialAuditPdf.ts`) — add cover page and branding. Currently has just a header with hardcoded colors.
- [ ] 🔴 **PDF-004** — Damage report (`src/lib/pdf/damage-report.ts`) — add cover page. Also fix: writes to `/tmp` filesystem (won't work on Vercel serverless). Convert to in-memory buffer.
- [ ] 🟡 **PDF-005** — Timeline export (`src/lib/pdf/timeline-export.ts`) — add cover page and branding. Currently plain header with no branding.

### 5.2 — Library Consolidation

- [ ] 🟡 **PDF-006** — Consolidate 3 separate weather PDF files into one implementation:
  - `src/lib/pdf/weather-report-pdf.ts` (jsPDF)
  - `src/lib/pdf/weather-pdf.ts` (jsPDF)
  - `src/lib/pdf/weatherPdfEngine.ts` (pdf-lib)
- [ ] 🟡 **PDF-007** — Migrate Puppeteer-based PDFs away from Chromium (will fail on Vercel serverless):
  - `src/lib/pdf/generate-pdf.ts` → convert to jsPDF or pdf-lib
- [ ] 🟡 **PDF-008** — PDFKit damage report writes to filesystem. Convert to in-memory stream.
- [ ] 🟠 **PDF-009** — Remove dead proposal PDF stub (`src/components/pdf/ProposalPdf.tsx` — "AI Proposals feature has been removed")
- [ ] 🟠 **PDF-010** — Module reports system (`src/lib/reports/`) is best-architected but underused. Evaluate migrating other reports to use its section registry + branding provider pattern.

### 5.3 — PDF Quality Checklist

For every PDF type, verify:

- [ ] 🔴 **PDF-011** — Browser preview matches downloaded file (no render differences)
- [ ] 🔴 **PDF-012** — Long names/addresses don't overflow containers
- [ ] 🔴 **PDF-013** — Missing fields don't break alignment (graceful omission)
- [ ] 🟡 **PDF-014** — No orphan headings (heading at bottom of page, content on next)
- [ ] 🟡 **PDF-015** — Map/property images render correctly
- [ ] 🟡 **PDF-016** — Footer is consistent across all pages
- [ ] 🟡 **PDF-017** — No duplicate fields across sections
- [ ] 🟡 **PDF-018** — Page breaks are logical (never mid-section)

---

## Track 6 — BRANDING CONSOLIDATION (P1)

> 6 overlapping fetchers, 4 different default blues, 3 different "complete" definitions.

### 6.1 — Single Branding Fetch Path

- [ ] 🔴 **BRAND-001** — Consolidate to ONE Prisma-based branding fetch. Keep:
  - ✅ `getBrandingWithDefaults()` — server-side canonical
  - ✅ `loadBrandingWithFallback()` — PDF path
  - ✅ `GET /api/branding` — client-side
- [ ] 🔴 **BRAND-002** — Deprecate and remove:
  - ❌ `getOrgBranding()` — raw SQL via pool
  - ❌ `fetchBranding()` — Supabase client (legacy)
  - ❌ `fetchUserProfile()` — Supabase admin
- [ ] 🔴 **BRAND-003** — Unify branding TypeScript types. Currently 4 different shapes: `OrgBranding`, `BrandingData`, `BrandingWithDefaults`, `DefaultBrand`. Create ONE canonical `Branding` type.

### 6.2 — Fallback Consistency

- [ ] 🟡 **BRAND-004** — Unify default fallback colors. Currently 4 different "default blues":
  - `#117CFF` (in `getOrgBranding`)
  - `#0A1A2F` (in defaults config)
  - `#1e40af` (in some PDFs)
  - `#0f172a` (in theme)
  - Pick ONE and use it everywhere.
- [ ] 🟡 **BRAND-005** — Standardize "branding complete" definition. Three different checks disagree:
  - Check A: requires `companyName` + `logoUrl` + `phone`
  - Check B: requires `companyName` + `phone` + `email` + `logoUrl` + `teamPhotoUrl`
  - Check C: requires `companyName` + `phone` + `logoUrl`
  - Pick ONE definition. Apply everywhere.
- [ ] 🟡 **BRAND-006** — Dual branding defaults configs: `src/lib/branding/defaults.ts` and `src/lib/config/branding.ts` — different shapes. Merge into one.

### 6.3 — Branding Completeness

- [ ] 🟡 **BRAND-007** — `getThemeColors()` in `src/lib/theme/getThemeColors.ts` always returns default, never queries DB. Wire it up or remove the TODO.
- [ ] 🟡 **BRAND-008** — `Org` model has `brandLogoUrl` AND `org_branding` has `logoUrl`. Pick one canonical source. Currently both are queried by different code paths.

---

## Track 7 — ESTIMATOR COMPLETENESS (P1)

> Missing options, conflicting constants, roofing-only pricing.

### 7.1 — Shared Constants (Create These)

- [ ] 🔴 **EST-001** — Create `src/lib/constants/roofing.ts` with shared pitch constant:
  - Add `0/12` and `1/12` (currently missing — needed for flat/commercial)
  - Include `0/12` through `12/12` minimum
  - Consider `14/12`, `16/12`, `18/12` for steep-slope
  - ALL three locations must reference this: Material Estimator page, Step4_RoofDetails, Inspection Overview
- [ ] 🔴 **EST-002** — Create shared roof material constant:
  - Unify: `wood` vs `wood-shake` vs `wood_shake`
  - Include: asphalt-3tab, asphalt-architectural, asphalt-designer, metal, tile, slate, tpo, epdm, wood-shake, modified-bitumen
- [ ] 🔴 **EST-003** — Consolidate trade type lists into ONE canonical list in `src/lib/constants/trades.ts`:
  - Currently 5 competing lists: 11 trades, 20 trades, 27 trades, 55 trades, 75 trades
  - Different formats: `camelCase` vs `Title Case` vs `UPPER_CASE`
  - All UI, API, seed files, and estimator must reference one list
- [ ] 🔴 **EST-004** — Fix tax rate conflicts. Scottsdale is `8.55%` in `materials-estimator.ts` but `7.65%` in Estimate Export Panel. Create single `src/lib/constants/taxRates.ts`.
- [ ] 🟡 **EST-005** — Unify condition options: Step4 has `excellent`/`good`/`fair`/`poor`, Inspection Overview has `good`/`fair`/`poor`/`critical`. Merge to: `excellent`, `good`, `fair`, `poor`, `critical`.

### 7.2 — Estimator Capabilities

- [ ] 🟡 **EST-006** — Material estimator deterministic engine only supports asphalt shingles. Add deterministic support for at least metal and tile roofing.
- [ ] 🟡 **EST-007** — Pricing table (`src/lib/estimator/pricing-table.ts`) has 17 Xactimate codes — ALL roofing. Add pricing codes for siding, gutters, painting, flooring, drywall at minimum.
- [ ] 🟡 **EST-008** — Line items generator (`src/lib/estimator/line-items.ts`) only covers hail/wind/structural damage. Add water, fire, and interior trade line items.
- [ ] 🟡 **EST-009** — Xactimate export (`src/lib/estimator/estimator-engine.ts`) only maps `RFG*`, `DRP*`, `PJK*`, `VNT*` codes. Add categories for siding, painting, flooring.
- [ ] 🟡 **EST-010** — Tax rate coverage is only 6 states (AZ, CA, CO, FL, NV, TX). Expand to cover all states where contractors operate.
- [ ] 🟡 **EST-011** — No Zod schemas for estimate data in `src/schemas/`. Validation lives inline in API routes. Extract to shared schemas.
- [ ] 🟡 **EST-012** — No DB persistence for estimates (noted as TODO in codebase). Estimate results are client-side only — lost on refresh.

### 7.3 — Per-Trade Audit

Each of the 27 estimator trades needs a completeness check:

- [ ] 🟡 **EST-013** — Audit all 27 trades for: missing options, illogical defaults, placeholder values, incomplete dropdowns, bad unit handling, missing validation, missing regional/material variants.

---

## Track 8 — CLAIM WORKSPACE & UI GAPS (P1)

> Missing fields, read-only phone, property details not shown.

### 8.1 — Claim Overview Fixes

- [ ] 🔴 **UI-001** — Make homeowner phone editable in claim overview. Currently read-only because data comes from contact relation join, not a direct claim field. After DM-002 (add `homeowner_phone` to claims), wire up editing.
- [ ] 🔴 **UI-002** — Add `homeowner_phone` to the PATCH `/api/claims/[claimId]/update` allowed fields list. Currently not supported for writes.
- [ ] 🟡 **UI-003** — Show property details in claim workspace: `yearBuilt`, `squareFootage`, `roofType`, `roofAge`. These exist in DB but aren't displayed.
- [ ] 🟡 **UI-004** — Workspace API uses fragile `property.contacts[0].phone` join for phone. After DM-002, switch to direct `claims.homeowner_phone`.
- [ ] 🟡 **UI-005** — Claim layout header shows `insured_name`, `carrier`, `claimNumber` but NOT adjuster info or client phone/email. Consider adding quick-contact actions.

### 8.2 — Data Flow Fixes

- [ ] 🟡 **UI-006** — Intake wizard creates contact with phone but doesn't denormalize phone onto claims row (unlike name and email which ARE denormalized). Fix after DM-002.
- [ ] 🟡 **UI-007** — Two sidebar components exist: `ClaimsSidebar.tsx` (older, may be unused) and `ClaimWorkspaceShell.tsx` (active). Verify and remove the unused one.
- [ ] 🟡 **UI-008** — `ClaimWorkspaceShell.tsx` has ~14 `any`-typed props and callbacks. Create a proper `ClaimSummary` type.

---

## Track 9 — PORTAL & CLIENT FLOWS (P1)

> Portal is well-built but has gaps in some areas.

### 9.1 — Portal Completeness

- [ ] 🟡 **PORTAL-001** — `/portal/products` route appears to be a stub (single page with unclear purpose). Flesh out or remove.
- [ ] 🟡 **PORTAL-002** — No review/rating system for completed projects visible in portal. Add if planned.
- [ ] 🟡 **PORTAL-003** — Document signing flow: signed docs are fetched and displayed but creation/signing path is unclear from portal side.
- [ ] 🟡 **PORTAL-004** — `/portal/company/[companyId]` — minimal, likely stub. Verify and complete.

### 9.2 — Portal Security

- [ ] 🟡 **PORTAL-005** — Verify all portal API routes use `requireClientAuth()` consistently.
- [ ] 🟡 **PORTAL-006** — Verify claims scoping: `OR: [{ homeownerEmail }, { clientId }, { clientId: identity.clientProfileId }]` — confirm no cross-client data leakage.

---

## Track 10 — EMAIL & NOTIFICATION SYSTEM (P1)

> 3 templates use wrong brand name, mixed formats, duplicates.

### 10.1 — Branding Fixes

- [ ] 🔴 **EMAIL-001** — 3 email templates still use **"PreLoss Vision"** instead of "SkaiScraper":
  - `emails/InviteTeamMember.tsx`
  - `emails/WelcomeNewUser.tsx`
  - `emails/TrialExpiringSoon.tsx`
  - Find and replace all instances.

### 10.2 — Template Cleanup

- [ ] 🟡 **EMAIL-002** — Duplicate templates: both `WelcomeEmail.tsx` and `Welcome.tsx` exist. Consolidate.
- [ ] 🟡 **EMAIL-003** — Mixed email formats: 4 raw HTML templates + 14 React Email `.tsx`. Convert HTML templates to React Email for consistent tooling and preview support.
- [ ] 🟡 **EMAIL-004** — Templates split across two directories (`emails/` and `src/emails/`). Consolidate into one location.
- [ ] 🟡 **EMAIL-005** — No email rendering/snapshot tests for any of the 18 templates. Add at least one snapshot test per template.

### 10.3 — Notification Stubs

- [ ] 🟡 **EMAIL-006** — Stub: "Receipt email not yet wired. Will use Resend when template is ready." (`src/app/api/billing/`)
- [ ] 🟡 **EMAIL-007** — Stub: "Send actual invite email via Resend when email templates are ready" (`src/app/api/team/invite/`)
- [ ] 🟡 **EMAIL-008** — `src/lib/notifications/channels/email.ts` — TODO: "Integrate with email provider (SendGrid, AWS SES)"
- [ ] 🟡 **EMAIL-009** — `src/lib/notifications/channels/sms.ts` — TODO: "Integrate with SMS provider (Twilio, AWS SNS)"
- [ ] 🟡 **EMAIL-010** — `src/lib/notifications/queue.ts` — TODO: "Implement actual queue with Redis/BullMQ"

---

## Track 11 — ONBOARDING FLOWS (P2)

> Two competing client onboarding wizards, mismatched pro onboarding steps.

### 11.1 — Client Onboarding

- [ ] 🟡 **ONBOARD-001** — Two competing client onboarding flows:
  - Page-based wizard (`portal/onboarding/page.tsx`) — 3 steps: Basic Info → Location → Profile Photo & Bio
  - Overlay wizard (`ClientOnboardingOverlay.tsx`) — 4 steps: Who Are You? → What Do You Need? → Describe Project → Upload Photos
  - Different data models, different step counts. Pick one canonical flow and remove the other.

### 11.2 — Pro Onboarding

- [ ] 🟡 **ONBOARD-002** — `OnboardingWizard.tsx` has 6 steps (Import Claim → Upload Photos → AI Analysis → Generate Scope → Export PDF → Retail Handoff) but `onboardingStore` has 5 tooltip steps (Welcome → Create Job → Dashboard → Billing → Support). These don't coordinate.
- [ ] 🟡 **ONBOARD-003** — Onboarding doesn't include branding setup step. New users can generate reports with default branding before knowing they need to configure it.

---

## Track 12 — TESTING & CI (P2)

> Zero component tests. ~97 test files exist but many areas untested.

### 12.1 — Critical Test Gaps

- [ ] 🔴 **TEST-001** — Zero React component tests (no React Testing Library). Add tests for at minimum:
  - `RBACGuard` component
  - Claim Overview page data rendering
  - Client Info Card
  - Empty State components
  - Key form components
- [ ] 🟡 **TEST-002** — Zero Zustand store tests. Add tests for:
  - `onboardingStore` — step navigation
  - `wizardStore` — auto-save, stale data handling
  - `assistantStore` — suggestion management
  - `claimIQStore` — timer/interval handling
- [ ] 🟡 **TEST-003** — Zero email template tests. Add snapshot tests for all 18 templates.
- [ ] 🟡 **TEST-004** — Zero branding pipeline tests. Add tests for branding fetch + fallback chain.
- [ ] 🟡 **TEST-005** — Zero PDF generation tests. Add snapshot/output tests for cover pages and at least weather report + claims report.
- [ ] 🟡 **TEST-006** — No functional tests for portal pages. Only smoke-level "does it 500?" tests exist.

### 12.2 — CI Improvements

- [ ] 🟡 **TEST-007** — ESLint is disabled during builds (`eslint.ignoreDuringBuilds = true`). The comment references "40+ scattered lint errors." Fix the lint errors and re-enable.
- [ ] 🟡 **TEST-008** — Auth drift threshold in CI is `700` files importing Clerk directly instead of through auth guards. This is very high — track and reduce over time.
- [ ] 🟡 **TEST-009** — Add golden-path E2E tests:
  - Insurance claim flow: create → edit → generate report → download PDF
  - Retail job flow: create → estimate → export
  - Team invite flow: invite → accept → verify role
- [ ] 🟡 **TEST-010** — Add PDF snapshot tests with fixed seeded data to catch cover page regressions.

---

## Track 13 — VISUAL CONSISTENCY & EMPTY STATES (P2)

> Dual EmptyState components, missing not-found pages, fallback gaps.

### 13.1 — EmptyState Consolidation

- [ ] 🟡 **VIS-001** — Merge two EmptyState components:
  - `src/components/ui/empty-state.tsx` — uses `title`, `description`, `icon`, `actionLabel`/`onAction`
  - `src/components/ErrorStates.tsx` — uses `message`, `onRetry`, `icon` as ReactNode, fixed `min-h-[400px]`
  - Keep `src/components/ui/empty-state.tsx` as canonical. Migrate all usages of the other.

### 13.2 — Missing Error Pages

- [ ] 🟡 **VIS-002** — Add `not-found.tsx` to key dynamic routes (currently only 4 exist, need more):
  - `src/app/(app)/claims/[claimId]/not-found.tsx`
  - `src/app/(app)/contacts/[id]/not-found.tsx`
  - `src/app/(app)/intelligence/[id]/not-found.tsx`
  - `src/app/(app)/team/member/[memberId]/not-found.tsx`
  - Users hitting invalid IDs currently get the generic root 404.

### 13.3 — Fallback Audit

Every missing-data scenario should degrade gracefully, not crash:

- [ ] 🟡 **VIS-003** — Verify graceful fallback for all 16 missing-data scenarios:
  1. No headshot → colored circle with initial
  2. No company logo → company name text
  3. No phone → "No phone on file" or hide row
  4. No weather data → empty state message
  5. No property image → placeholder or map thumbnail
  6. No carrier → "Not specified"
  7. No team assigned → "Unassigned"
  8. No company branding → platform defaults + branding CTA
  9. No policy number → "Not provided"
  10. No adjuster info → hide section
  11. No email → "No email on file"
  12. No estimate data → empty state with CTA
  13. No supplements → empty state
  14. No photos → upload CTA
  15. No claim number → should never happen (auto-generated)
  16. No date of loss → should never happen (required)

### 13.4 — Visual Standards

- [ ] 🟡 **VIS-004** — Audit page headers for consistent `<PageHero>` usage across all modules
- [ ] 🟡 **VIS-005** — Audit button usage for consistent variant application (`default`, `primaryBubble`, `secondary`, `outline`, `ghost`, `destructive`, `success`)
- [ ] 🟡 **VIS-006** — Audit date formatting for consistency (pick one: "Mar 23, 2026" vs "03/23/2026" vs "2026-03-23")
- [ ] 🟡 **VIS-007** — Audit currency formatting for consistent cents→dollars, comma separators
- [ ] 🟡 **VIS-008** — Audit phone number formatting for consistent `(XXX) XXX-XXXX` format

### 13.5 — Accessibility

- [ ] 🟡 **VIS-009** — Fix empty `alt=""` on non-decorative images in `FeaturedJobsSection`, `GroupFeed`, network trades/crews
- [ ] 🟡 **VIS-010** — Fix generic alt text (e.g., `alt="Logo"`, `alt="Image"`) — make descriptive

---

## Track 14 — CODE QUALITY & DEAD CODE (P2)

> 500+ `any` types, 62 console.logs, 25+ dead files, 116 TODO comments.

### 14.1 — Dead Code Removal

- [ ] 🟡 **CODE-001** — Delete 7 `.bak` files:
  - `CompanyMapClient.tsx.bak`
  - `route.ts.bak` (db-fix, diagnostics)
  - `MapboxMap.tsx.bak`, `MapClient.tsx.bak`, `LeadMapLazy.tsx.bak`
  - `debug.ts.bak`
- [ ] 🟡 **CODE-002** — Delete `_disabled/` directory (7 disabled API routes)
- [ ] 🟡 **CODE-003** — Delete `legacy/` directories (contact, pricing placeholders, Mapbox components)
- [ ] 🟡 **CODE-004** — Remove dead proposal PDF stub (`src/components/pdf/ProposalPdf.tsx`)

### 14.2 — Console.log Cleanup

- [ ] 🟡 **CODE-005** — Replace 62 `console.log` statements with `logger.*` calls:
  - `src/app/` — 5 instances
  - `src/components/` — 43 instances (MOST)
  - `src/lib/` — 6 instances
  - `src/hooks/` — 1 instance
  - `src/stores/` — 1 instance
  - Priority: the 6 PII/sensitive-data logs identified in SEC-016.

### 14.3 — TypeScript Quality

- [ ] 🟡 **CODE-006** — Reduce `any` type usage. 500+ instances found. Priority targets:
  - `ClaimWorkspaceShell` props (~14 `any`)
  - `contacts/page.tsx` (~15 `any`)
  - `portal/page.tsx` (~8 `any`)
  - `claims/[claimId]/layout.tsx` (~8 `any`)
  - Create shared types: `ClaimSummary`, `ContactSummary`, `PropertySummary`
- [ ] 🟡 **CODE-007** — Add ESLint rule: `@typescript-eslint/no-explicit-any` as warning, upgrade to error over time.
- [ ] 🟡 **CODE-008** — Fix `as any` casts (~40+ instances) — these suppress real type errors.

---

## Track 15 — INFRASTRUCTURE & OPS (P2)

> Deprecated Next.js config, permissive CSP, Sentry gaps, 250+ migrations.

### 15.1 — Next.js Config Cleanup

- [ ] 🟡 **INFRA-001** — Remove deprecated config in `next.config.mjs`:
  - `swcMinify: true` — default since Next.js 15
  - `serverComponentsExternalPackages` → move to top-level `serverExternalPackages`
  - `instrumentationHook: true` — stable since Next.js 14.1
- [ ] 🟡 **INFRA-002** — Re-enable ESLint during builds. Fix the "40+ scattered lint errors" and remove `eslint.ignoreDuringBuilds = true`.

### 15.2 — Security Headers

- [ ] 🟡 **INFRA-003** — Tighten CSP: change `object-src 'self'` to `object-src 'none'` to prevent Flash/plugin-based attacks.

### 15.3 — Sentry

- [ ] 🟡 **INFRA-004** — Enable Sentry source map uploads. Currently both `hideSourceMaps` and `disableServerWebpackPlugin` are `true` — production stack traces are minified/unresolved.
- [ ] 🟡 **INFRA-005** — Uncomment/install `prismaIntegration()` in Sentry config for automatic DB query tracing.
- [ ] 🟡 **INFRA-006** — Extract shared Sentry `denyUrls` config from 3 duplicated files into one shared constant.

### 15.4 — Environment

- [ ] 🟡 **INFRA-007** — Create `.env.example` file documenting all required env vars. `env.d.ts` only declares 12 but codebase uses 30+:
  - `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `MAPBOX_ACCESS_TOKEN`, `RESEND_API_KEY`
  - `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`
  - All `NEXT_PUBLIC_PRICE_*` vars
- [ ] 🟡 **INFRA-008** — Expand `env.d.ts` to declare all env vars used in the codebase.

### 15.5 — Database

- [ ] 🟡 **INFRA-009** — 250+ migration files in `db/migrations/` with no single runner. Some have overlapping/conflicting names. Consider consolidating or creating an ordered migration runner script.
- [ ] 🟡 **INFRA-010** — Logger outputs all levels (including `info`) to console in production via `console.log`. For Vercel, this increases logging costs. Gate `info` level behind a `LOG_LEVEL` env var.

### 15.6 — Cron Coordination

- [ ] 🟠 **INFRA-011** — Two Vercel cron jobs share overlapping schedules. On the 1st of the month, both fire simultaneously. Verify no resource contention.

---

## Track 16 — END-TO-END GOLDEN PATH TESTS (P1)

> These are the acceptance criteria. If these pass, the system works as a business.

### 16.1 — Insurance Claim Flow (18 steps)

| Step | Action                           | Verify                                              | Status |
| ---- | -------------------------------- | --------------------------------------------------- | ------ |
| 1    | Navigate to `/claims/new`        | Intake wizard loads, all 5 steps visible            | [ ]    |
| 2    | Select loss type (WIND_HAIL)     | Step advances, type stored                          | [ ]    |
| 3    | Select trade type (ROOFING)      | Step advances                                       | [ ]    |
| 4    | Enter client: name, email, phone | All save; `contacts` record created                 | [ ]    |
| 5    | Enter property address           | `properties` record created, linked to contact      | [ ]    |
| 6    | Enter date of loss               | Claim created, redirects to workspace               | [ ]    |
| 7    | Verify workspace overview        | Client name, email, phone all shown                 | [ ]    |
| 8    | Add carrier, policy number       | Fields save and persist on reload                   | [ ]    |
| 9    | Add adjuster: name, phone, email | Fields save and persist                             | [ ]    |
| 10   | Upload property photos           | Photos appear, AI analysis runs                     | [ ]    |
| 11   | Navigate to Weather tab          | Weather data loads for location + DOL               | [ ]    |
| 12   | Generate weather report          | PDF generates with correct branding                 | [ ]    |
| 13   | Download PDF                     | File downloads, matches browser preview             | [ ]    |
| 14   | Verify PDF branding              | Logo, company name, contact info, headshot correct  | [ ]    |
| 15   | Verify PDF claim data            | Insured name, carrier, policy, claim #, DOL correct | [ ]    |
| 16   | Verify PDF client data           | Client name, property address correct               | [ ]    |
| 17   | Verify PDF alignment             | No overflow, clipping, empty sections               | [ ]    |
| 18   | Share/send document              | Share flow works, recipient gets link               | [ ]    |

### 16.2 — Retail Job Flow (8 steps)

| Step | Action                        | Verify                                   | Status |
| ---- | ----------------------------- | ---------------------------------------- | ------ |
| 1    | Create retail lead            | Lead record created                      | [ ]    |
| 2    | Attach property               | Property linked                          | [ ]    |
| 3    | Define project type           | Type saved                               | [ ]    |
| 4    | Create estimate               | Estimator loads with correct trade       | [ ]    |
| 5    | Generate report               | PDF with retail metadata (not insurance) | [ ]    |
| 6    | Verify branding               | Logo, name, contact info correct         | [ ]    |
| 7    | Verify client/project details | Client name, project type, scope shown   | [ ]    |
| 8    | Download/share                | Works correctly                          | [ ]    |

### 16.3 — Team Flow (7 steps)

| Step | Action                       | Verify                                        | Status |
| ---- | ---------------------------- | --------------------------------------------- | ------ |
| 1    | Invite user (email + role)   | `team_invitations` record created, email sent | [ ]    |
| 2    | Accept invite                | User joins org, correct role                  | [ ]    |
| 3    | Assign company branding      | New user inherits org branding                | [ ]    |
| 4    | Assign role                  | Role persists, RBAC enforced                  | [ ]    |
| 5    | Verify visibility boundaries | User sees only own org's data                 | [ ]    |
| 6    | Verify branding inheritance  | Reports use org branding                      | [ ]    |
| 7    | Verify headshot in docs      | User's headshot in generated reports          | [ ]    |

### 16.4 — Client Portal Flow (6 steps)

| Step | Action                       | Verify                                      | Status |
| ---- | ---------------------------- | ------------------------------------------- | ------ |
| 1    | Client signs in at `/portal` | Dashboard loads with correct greeting       | [ ]    |
| 2    | View connected claims        | Only their claims visible, scoped correctly | [ ]    |
| 3    | Open claim workspace         | Photos, docs, timeline, messages accessible | [ ]    |
| 4    | Send message to pro          | Message appears in pro's dashboard          | [ ]    |
| 5    | View contractor profile      | Contractor details, reviews visible         | [ ]    |
| 6    | Complete onboarding          | Profile setup wizard completes              | [ ]    |

---

## Track 17 — ZUSTAND STORES (P2)

> Hydration mismatches, stale state, non-serializable handles.

- [ ] 🟡 **STORE-001** — Add hydration guards (`skipHydration` or `onRehydrateStorage`) to all stores. SSR/client hydration mismatches cause flicker.
- [ ] 🟡 **STORE-002** — `wizardStore` persists entire job data with no TTL. Abandoned wizards leave stale data in localStorage forever. Add 24-hour expiry.
- [ ] 🟡 **STORE-003** — `onboardingStore` persists `completedAt` as a `Date`. Zustand persist serializes it as a string. On rehydration, Date methods fail. Use ISO string or epoch timestamp.
- [ ] 🟡 **STORE-004** — `claimIQStore` stores interval handle in state — non-serializable. Move to a ref or external variable.
- [ ] 🟡 **STORE-005** — `assistantStore.autoOpenPanel` is NOT persisted, but `recentSuggestions` IS. Behavior after page reload is inconsistent. Decide which fields should persist.

---

## Track 18 — STUB/TODO TRIAGE (P2)

> 116 TODO/STUB comments found across the codebase. Triage into ship-blocking vs post-launch.

### 18.1 — Ship-Blocking Stubs (must fix before real users)

- [ ] 🔴 **STUB-001** — `src/app/api/billing/` — "Receipt email not yet wired" — users won't get payment confirmations
- [ ] 🔴 **STUB-002** — `src/app/api/team/invite/` — "Send actual invite email via Resend" — team invites don't actually email
- [ ] 🔴 **STUB-003** — `src/app/api/reports/export/` — "Upload PDF to storage and get fileUrl" — exports may not persist
- [ ] 🔴 **STUB-004** — `src/lib/billing/guard.ts` — "Re-enable strict enforcement after beta when Stripe is activated" — billing guard is currently loose

### 18.2 — Important But Not Blocking (fix in first sprint post-launch)

- [ ] 🟡 **STUB-005** — `src/lib/notifications/queue.ts` — "Implement actual queue with Redis/BullMQ"
- [ ] 🟡 **STUB-006** — `src/app/api/dispatch/route.ts` — "contractor_dispatch model pending schema design"
- [ ] 🟡 **STUB-007** — `src/app/api/ai/agent-runs/route.ts` — "agent_runs table not yet in schema"
- [ ] 🟡 **STUB-008** — `src/app/api/mailer/batch/route.ts` — "BatchJob, MailerBatch, MailerJob models not yet in Prisma schema"
- [ ] 🟡 **STUB-009** — `src/app/(app)/archive/page.tsx` — "Implement Stripe checkout for $7.99/mo cold storage"
- [ ] 🟡 **STUB-010** — `src/app/(app)/exports/carrier/actions.ts` — "Implement ZIP bundling with JSZip" + "Fetch and add actual files"
- [ ] 🟡 **STUB-011** — `src/lib/ai/estimate.ts` — "Implement regional pricing database" + "Implement material costs database" + "Implement labor rates database"
- [ ] 🟡 **STUB-012** — Multiple photo upload stubs: "Upload to Firebase Storage" / "Upload to S3/Cloudinary" / "Upload to Supabase storage" — 3 different TODOs, 3 different target systems
- [ ] 🟡 **STUB-013** — `src/lib/features.ts` — "Add featureFlags field to Org model" (x2 TODOs)

### 18.3 — Nice-to-Have (post-launch backlog)

- [ ] 🟠 **STUB-014** — 8 AI vision functions ALL stubbed in `src/lib/ai/vision/`:
  - `detectHailDamage` — TODO: "Vision + heuristic scoring"
  - `classifyMaterial` — TODO: "Vision-based classification"
  - `segmentDamage` — TODO: "Replicate model call + mask polygons"
  - `annotateImage` — TODO: "OpenAI Vision call"
  - `assessCausation` — TODO: "weather + materials + damage patterns"
  - `classifyDamageType` — TODO: "Vision classification prompt to GPT-4o"
  - `generateRepairScope` — TODO: "Assemble line items"
  - `measureDamageArea` — TODO: "Derive measurements from geometry"
- [ ] 🟠 **STUB-015** — 5 report engine external collectors are stubs:
  - Weather data integration
  - Building codes API
  - Manufacturer databases
  - Climate risk APIs
  - Recommendation engine
- [ ] 🟠 **STUB-016** — `src/lib/ai/ocr.ts` — "Integrate with OCR service (Tesseract, Google Cloud Vision, AWS Textract)"
- [ ] 🟠 **STUB-017** — `src/lib/ai/intelligence.ts` — "Implement smart assignment" + "Implement pattern analysis"
- [ ] 🟠 **STUB-018** — `src/lib/health.ts` — Redis, S3, email service, OpenAI connectivity checks all return stubbed "OK"
- [ ] 🟠 **STUB-019** — `src/lib/ai/background-remover.ts` — "Integrate with remove.bg API or local ML model"

---

## Execution Timeline

```
╔══════════════════════════════════════════════════════════════════╗
║  WEEK 1 — SECURITY & AUTH HARDENING                             ║
║  ┌─ Track 1: SEC-001 through SEC-011 (critical security)        ║
║  ├─ Track 2: RBAC-001 through RBAC-005 (pick & consolidate)     ║
║  └─ Track 4: API-009 (cron security)                            ║
╠══════════════════════════════════════════════════════════════════╣
║  WEEK 2 — DATA MODEL & API ROUTES                               ║
║  ┌─ Track 3: DM-001 through DM-006 (schema fixes + migration)   ║
║  ├─ Track 4: API-001, API-002 (rate limiting critical paths)     ║
║  └─ Track 8: UI-001, UI-002 (phone editable)                    ║
╠══════════════════════════════════════════════════════════════════╣
║  WEEK 3 — PDF & BRANDING                                        ║
║  ┌─ Track 5: PDF-001 through PDF-005 (add cover pages)           ║
║  ├─ Track 6: BRAND-001 through BRAND-003 (consolidate)           ║
║  └─ Track 10: EMAIL-001 (fix PreLoss Vision branding)            ║
╠══════════════════════════════════════════════════════════════════╣
║  WEEK 4 — ESTIMATORS & CONSTANTS                                 ║
║  ┌─ Track 7: EST-001 through EST-005 (shared constants)          ║
║  ├─ Track 7: EST-006 through EST-012 (capabilities)              ║
║  └─ Track 18: STUB-001 through STUB-004 (ship-blockers)          ║
╠══════════════════════════════════════════════════════════════════╣
║  WEEK 5 — TESTING & GOLDEN PATHS                                 ║
║  ┌─ Track 12: TEST-001, TEST-009 (component + E2E tests)         ║
║  ├─ Track 16: All 4 golden path flows                            ║
║  └─ Track 13: VIS-001 through VIS-003 (empty states)             ║
╠══════════════════════════════════════════════════════════════════╣
║  WEEK 6 — POLISH & PRODUCTION                                    ║
║  ┌─ Track 14: CODE-001 through CODE-005 (dead code + logs)       ║
║  ├─ Track 15: INFRA-001 through INFRA-008 (config + env)         ║
║  ├─ Track 11: ONBOARD-001 (consolidate onboarding)               ║
║  └─ Track 17: STORE-001 through STORE-005 (Zustand fixes)        ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Completion Criteria — When Are We DAU-Ready?

| Gate              | Criteria                                                                                                                  | Status |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Security**      | All 🔴 SEC items resolved. No exposed credentials, no auto-admin, no XSS.                                                 | [ ]    |
| **Auth**          | Single RBAC system active. Other two deprecated. Role names consistent.                                                   | [ ]    |
| **Data Model**    | Phone on claims. No duplicate email columns. Loader bugs fixed.                                                           | [ ]    |
| **PDFs**          | All 10 report types have unified cover page with branding.                                                                | [ ]    |
| **Branding**      | Single fetch path. Single fallback color. Single "complete" definition.                                                   | [ ]    |
| **Estimators**    | Shared pitch/material/trade constants. No conflicting tax rates.                                                          | [ ]    |
| **Email**         | No "PreLoss Vision" references. All templates use correct brand.                                                          | [ ]    |
| **Golden Paths**  | Insurance flow (18 steps) passes. Retail flow (8 steps) passes. Team flow (7 steps) passes. Portal flow (6 steps) passes. | [ ]    |
| **Rate Limiting** | All upload, AI, and CRUD endpoints have rate limits.                                                                      | [ ]    |
| **Empty States**  | All 16 missing-data scenarios degrade gracefully.                                                                         | [ ]    |
| **Cron Security** | All cron endpoints require `CRON_SECRET`.                                                                                 | [ ]    |
| **Tests**         | Component tests exist for key components. E2E golden paths automated.                                                     | [ ]    |

---

## Item Count Summary

| Track              | Items         | 🔴 Critical | 🟡 Medium | 🟠 Low |
| ------------------ | ------------- | ----------- | --------- | ------ |
| 1. Security        | 16            | 6           | 10        | 0      |
| 2. RBAC            | 12            | 5           | 7         | 0      |
| 3. Data Model      | 17            | 6           | 9         | 2      |
| 4. API Routes      | 9             | 4           | 5         | 0      |
| 5. PDF System      | 18            | 5           | 13        | 0      |
| 6. Branding        | 8             | 3           | 5         | 0      |
| 7. Estimators      | 13            | 4           | 9         | 0      |
| 8. Claim UI        | 8             | 2           | 6         | 0      |
| 9. Portal          | 6             | 0           | 6         | 0      |
| 10. Email          | 10            | 1           | 9         | 0      |
| 11. Onboarding     | 3             | 0           | 3         | 0      |
| 12. Testing        | 10            | 1           | 9         | 0      |
| 13. Visual         | 10            | 0           | 10        | 0      |
| 14. Code Quality   | 8             | 0           | 8         | 0      |
| 15. Infrastructure | 11            | 0           | 10        | 1      |
| 16. Golden Paths   | 4 flows       | —           | —         | —      |
| 17. Stores         | 5             | 0           | 5         | 0      |
| 18. Stubs          | 19            | 4           | 9         | 6      |
| **TOTAL**          | **187 items** | **41**      | **147**   | **9**  |

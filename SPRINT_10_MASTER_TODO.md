# 🎯 SPRINT 10 — MASTER TODO

**Generated:** Sprint 10 (Post-Branding Merge Fix)  
**Status:** Active  
**Scope:** Everything remaining from Sprints 8c–9, plus newly discovered issues

---

## 🔴 P0 — CRITICAL (Revenue/Data Integrity)

### ✅ COMPLETED THIS SPRINT
- [x] **Branding → Preview Merge Gap** — Preview route only queried `org` table (4 legacy fields), never read `org_branding` table. Users who saved branding via Settings → Branding saw "missing placeholders" on Preview Merge. **FIXED:** Now queries `org_branding` and merges all fields (companyName, logoUrl, phone, email, website, license, colors, teamPhotoUrl).

### 🔲 STILL OPEN
- [ ] **PDF Export uses MOCK data** — `src/app/api/reports/[reportId]/export/route.ts` calls `useReportBranding()` which returns hardcoded placeholder data (phone: "(555) 123-4567", email: "contact@skaiscrape.com"). Actual PDF downloads will show mock branding, NOT the user's saved branding. **File:** `src/modules/reports/core/DataProviders.ts` lines 21-33.
- [ ] **PDF Export mock claim data** — Same export route uses `useReportClaimData()` returning fake claim/address/carrier info. Real PDF will show "Jane Homeowner" and "456 Oak Ave, Phoenix" regardless of actual claim.
- [ ] **`coverPhotoUrl` never saved** — Branding save route destructures `coverPhotoUrl` from body but never includes it in the Prisma upsert. The field also doesn't exist in the `org_branding` schema. Either add the column or remove the destructure.

---

## 🟠 P1 — HIGH (Auth/Security)

### Remaining Route Conversions (25 routes left from Sprint 9 audit)
- [ ] **`/api/claims/[claimId]/route.ts`** — Uses raw `auth()` for GET/PUT/DELETE (high-traffic)
- [ ] **`/api/claims/[claimId]/status/route.ts`** — Uses raw `auth()`
- [ ] **`/api/claims/[claimId]/photos/route.ts`** — Uses raw `auth()`  
- [ ] **`/api/claims/[claimId]/notes/route.ts`** — Uses raw `auth()`
- [ ] **`/api/claims/[claimId]/timeline/route.ts`** — Uses raw `auth()`
- [ ] **`/api/claims/[claimId]/contractors/route.ts`** — Uses raw `auth()`
- [ ] **`/api/properties/[propertyId]/route.ts`** — Uses raw `auth()`
- [ ] **`/api/properties/route.ts`** — Uses raw `auth()`
- [ ] **`/api/settings/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/settings/team/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/settings/branding/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/weather/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/weather/[claimId]/route.ts`** — Uses raw `auth()`
- [ ] **`/api/ai/analyze/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/ai/scope/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/scopes/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/scopes/[scopeId]/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/contacts/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/contacts/[contactId]/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/leads/route.ts`** — Uses `getCurrentUserPermissions()` pattern (semi-safe)
- [ ] **`/api/leads/[leadId]/route.ts`** — Uses raw `auth()`
- [ ] **`/api/onboarding/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/uploads/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/file-assets/route.ts`** — Uses `getActiveOrgContext()` pattern
- [ ] **`/api/branding/save/route.ts`** — Uses manual `currentUser()` + `getActiveOrgContext()`

---

## 🟡 P2 — MEDIUM (Functionality/UX)

### Report System Gaps
- [ ] **Wire PDF export to real data** — Replace ALL mock DataProviders with actual DB queries. Each `useReport*()` function in `src/modules/reports/core/DataProviders.ts` must accept `orgId`/`claimId` and query the real tables.
- [ ] **Template placeholder validation alignment** — `templates/[templateId]/validate/route.ts` checks for `company.phone`, `company.email` in REQUIRED_PLACEHOLDERS but preview was not providing them until this fix. Verify the validation flow end-to-end.
- [ ] **Missing `company.address` in org_branding schema** — `BrandingConfig` type expects `address` field but `org_branding` table has no address column. Either add a migration or handle it differently.
- [ ] **Team photo in PDF** — `teamPhotoUrl` is now exposed in preview but no PDF template section uses it yet.

### Branding Form Gaps  
- [ ] **Add address fields to branding form** — The branding save form at `/settings/branding` doesn't have address input fields. The `BrandingConfig` type for reports expects an address. Add `address_line1`, `address_line2`, `city`, `state`, `zip` to `org_branding` schema and form.
- [ ] **Cover photo upload broken** — `coverPhotoUrl` is accepted by the save endpoint but never persisted (no schema column, not in upsert).

### Dashboard & Data
- [ ] **Demo mode data** — Dashboard routes now properly use `withAuth` but demo mode seeded data should be reviewed for accuracy.
- [ ] **KPI calculation validation** — After Sprint 9 `user.id` fallback removal, verify KPIs show real data vs zeros.

---

## 🟢 P3 — LOW (Polish/Tech Debt)

### Code Quality
- [ ] **Remove legacy `brandLogoUrl` from org table** — Now superseded by `org_branding.logoUrl`. Preview has fallback chain but legacy field should be deprecated.
- [ ] **Remove legacy `pdfHeaderText`/`pdfFooterText` from org table** — Same as above.
- [ ] **Consolidate branding fetchers** — Multiple places query branding differently. Create a single `getBranding(orgId)` utility.
- [ ] **Error.message exposure audit** — Sprint 9 fixed `dashboard/charts` but other routes may still expose raw error messages.
- [ ] **Unused imports cleanup** — Some converted routes may have leftover `auth` imports from `@clerk/nextjs/server`.

### Testing
- [ ] **Run AI Agent Testing Playbook** — Execute all 12 phases from `scripts/AI_AGENT_TESTING_PLAYBOOK.md`.
- [ ] **Add branding merge regression test** — Add test to `scripts/sprint8c-regression-test.sh` that hits `/api/reports/preview` and verifies `company.phone`, `company.email` are populated.
- [ ] **Cross-org isolation tests** — Verify branding queries use `orgId` scoping (confirmed in this fix).
- [ ] **PDF export integration test** — Once mock data is replaced, test real PDF generation end-to-end.

### Infrastructure
- [ ] **Sentry error tracking** — Review recent Sentry errors related to reports/preview.
- [ ] **Rate limiting on preview endpoint** — Preview does 7 parallel DB queries; should have rate limiting.
- [ ] **Caching** — Org branding changes infrequently; add short TTL cache to `org_branding` queries in preview.

---

## 📊 Sprint History

| Sprint | Focus | Key Fix | Status |
|--------|-------|---------|--------|
| 8b | CRM QA Lockdown | Auth + org isolation | ✅ Deployed |
| 8c | Report Builder Auth | `PREVIEW FAILED: AUTH_REQUIRED` → `withAuth` on 9 report routes | ✅ Deployed |
| 9 | Route Conversions | 10 routes → `withAuth`, fixed `user.id` fallback bugs | ✅ Deployed |
| 10 | Branding Merge Fix | Preview now reads `org_branding` table, exposes all branding fields | 🚀 In Progress |

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/api/reports/preview/route.ts` | Preview merge — **FIXED this sprint** |
| `src/app/api/branding/save/route.ts` | Saves branding to `org_branding` |
| `src/modules/reports/core/DataProviders.ts` | **MOCK** data — needs real DB wiring |
| `src/modules/reports/types/index.ts` | `BrandingConfig` interface |
| `src/app/api/templates/[templateId]/validate/route.ts` | Template placeholder validation |
| `prisma/schema.prisma` (line 4018) | `org_branding` model definition |
| `scripts/AI_AGENT_TESTING_PLAYBOOK.md` | 12-phase testing playbook |
| `scripts/sprint8c-regression-test.sh` | Regression test suite (65+ tests) |

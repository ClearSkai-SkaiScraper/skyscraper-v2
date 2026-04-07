# Session 9: A+ Sprint — Master Comprehensive TODO

> **Goal:** Move every scorecard area to A+  
> **Date:** April 6, 2026  
> **Starting Scorecard:** Auth A, Error Handling A, Type Safety A, Build A, Tenant Isolation A-, API Validation B+, Observability B+, Test Coverage C+, UX B

---

## 🔴 P0 — CRITICAL: Active Data Leaks & Injection Risks

### Tenant Isolation (3 bugs)

- [ ] **C-1: `pilot/stats` GET — `orgId || undefined` removes tenant filter entirely**
  - File: `src/app/api/pilot/stats/route.ts`
  - All 5 parallel queries use `orgId: orgId || undefined` — when orgId is null, Prisma omits the filter → returns ALL orgs' data
  - Fix: Replace `auth()` with `resolveOrg()` or `withAuth`. Fail 403 if no org.

- [ ] **C-2: `pilot/stats` GET — same pattern on feedback query**
  - Same file, feedback query section
  - Fix: Same as C-1

- [ ] **C-3: Stripe checkout uses DB orgId to search `clerkOrgId` column**
  - File: `src/app/api/stripe/checkout/route.ts`
  - `withManager` provides DB org UUID, but code does `prisma.org.findUnique({ where: { clerkOrgId: orgId } })` — never matches for enterprise orgs
  - Fix: Use `prisma.org.findUnique({ where: { id: orgId } })` since withManager already resolves to DB ID

### API Validation (2 bugs)

- [ ] **C-4: `trades/onboard` POST — raw body spread into Prisma create**
  - File: `src/app/api/trades/onboard/route.ts`
  - `...body` spread allows arbitrary column injection
  - Fix: Add Zod schema, validate before write

- [ ] **C-5: `estimates/save` POST — raw body spread into JSON field**
  - File: `src/app/api/estimates/save/route.ts`
  - Allows arbitrary JSON injection into estimates
  - Fix: Add Zod schema

---

## 🟠 P1 — HIGH: Wrong Resolver = Wrong Tenant

### 12 Routes Using `auth()` Clerk orgId as DB orgId

- [ ] **H-1:** `analytics/export` — empty export for team orgs
- [ ] **H-2:** `analytics/team` — team analytics empty
- [ ] **H-3:** `analytics/claims` — claims analytics empty
- [ ] **H-4:** `claims/[claimId]/damage-weather` — correlation fails
- [ ] **H-5:** `hoa/notices/[id]/send` — double mismatch (notice + org lookup)
- [ ] **H-6:** `notifications/[id]` DELETE — wrong org check
- [ ] **H-7:** `notifications/[id]/read` — wrong org check
- [ ] **H-8:** `pilot/feedback` POST — writes Clerk orgId or "unknown"
- [ ] **H-9:** `pilot/stats` POST — writes Clerk orgId or "unknown"
- [ ] **H-10:** `branding/upload` — falls back to Clerk orgId on resolveOrg failure
- [ ] **H-11:** `reports/[reportId]/page.tsx` — compares DB field with Clerk orgId → always 404
- [ ] **H-12:** `ai/chat` — missing `await` on auth() → both userId and orgId undefined

---

## 🟡 P2 — API Validation Expansion

### Portal Routes (16 — external attack surface)

- [ ] All portal POST/PATCH/DELETE routes need Zod schemas

### Other HIGH DB-Write Routes (57 remaining)

- [ ] trades/_ (10 routes), vin/_ (7), jobs/_ (3), team/_ (8), billing/_ (4), core/_ (18)

---

## 🔵 P3 — Observability → A+

### Systemic Fix (covers 176 routes)

- [ ] Wire `withRequestContext()` into `withAuth`, `withOrgScope`, `withManager` HOF wrappers

### Logger Gaps

- [ ] Add logger to 45 unlogged routes (P0: billing, stripe, auth; P1: claims, cron)
- [ ] Fix 33 silent catch blocks
- [ ] Add success-path logging to critical routes (billing, claims CRUD, cron)

---

## 🟣 P4 — Test Coverage → A+

### Auth Core Unit Tests (1,741 lines, 0 tests)

- [ ] `getActiveOrgSafe.ts` — all 3 return paths + error paths + pending invite
- [ ] `tenant.ts` — resolveOrg + getTenant + retry backoff
- [ ] `rbac.ts` — requireRole, requirePermission, role hierarchy
- [ ] `apiError.ts` — apiError, withErrorHandler, requireOrThrow

### New Smoke Suites

- [ ] RBAC enforcement audit
- [ ] Rate limiting coverage audit
- [ ] Portal route isolation audit

### Coverage Thresholds

- [ ] Raise from 5% to 15% (statements, branches, lines)

---

## 🟢 P5 — UX Consistency → A+

### Loading States (25 hand-rolled)

- [ ] Convert 19 raw animate-pulse → PageSkeleton
- [ ] Convert 2 PageLoadingSpinner → PageSkeleton
- [ ] Review 3 Skeleton (shadcn) for migration

### Error Boundaries (81 generic)

- [ ] Convert 81 route-error-boundary → makeSectionError with section labels

### Empty States (34 inline)

- [ ] Wire EmptyStatePresets into 34 pages with inline "No X" messages

---

## Scorecard Targets

| Area             | Current | Target | Key Actions                                     |
| ---------------- | ------- | ------ | ----------------------------------------------- |
| Tenant Isolation | A-      | **A+** | Fix 3 CRITICAL + 12 HIGH resolver issues        |
| API Validation   | B+      | **A+** | Fix 2 raw body spreads + validate portal routes |
| Observability    | B+      | **A+** | Wire requestContext into HOF wrappers           |
| Test Coverage    | C+      | **A+** | Unit tests for auth core (4 files)              |
| UX Consistency   | B       | **A+** | Convert 25 loading + 81 error + 34 empty        |

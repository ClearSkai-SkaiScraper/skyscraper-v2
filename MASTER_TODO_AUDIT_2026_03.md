# MASTER TODO — Deep Audit Sprint (March 2026)

> Generated from comprehensive codebase audit on 2026-03-08.
> Build: ✅ 0 TypeScript errors | ✅ Compiles successfully | ✅ All 548 API routes have `force-dynamic`

---

## Status Legend

- ✅ Done (completed this session)
- 🔥 P0 — Must fix before next deploy
- ⚡ P1 — Fix this sprint
- 🛡️ P2 — Security hardening
- 🧹 P3 — Code quality / tech debt
- 📈 P4 — Performance & observability

---

## ✅ COMPLETED THIS SESSION

| #   | Task                                                                                                                                                       | Status  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| C1  | Add `export const dynamic = "force-dynamic"` to ALL 548 API routes                                                                                         | ✅ Done |
| C2  | Fix 6 broken `@/lib/db/prisma` → `@/lib/prisma` imports                                                                                                    | ✅ Done |
| C3  | Fix missing `DollarSign` + `Send` icon imports in claims overview                                                                                          | ✅ Done |
| C4  | Fix `prisma.membership` → `prisma.user_organizations` in notifyManagers                                                                                    | ✅ Done |
| C5  | Fix `ctx.orgId` null-narrowing in finance/overview route                                                                                                   | ✅ Done |
| C6  | Fix `WorkspaceData` interface missing job-value fields                                                                                                     | ✅ Done |
| C7  | Add rate limiting to 9 high-priority AI routes (damage/analyze, orchestrate, plan/generate, video, history, status, usage, recommendations, smart-actions) | ✅ Done |

---

## SPRINT 1 — Security & Rate Limiting (🔥 P0 + 🛡️ P2)

### 1.1 — Remaining AI Rate Limits (19 routes)

Add `getRateLimitIdentifier` + `rateLimiters.ai.check()` to these AI routes:

| #   | Route                                 | Risk         |
| --- | ------------------------------------- | ------------ |
| 1   | `ai/3d/route.ts`                      | GPU-heavy    |
| 2   | `ai/report-builder/route.ts`          | Token-heavy  |
| 3   | `ai/suggest-status/route.ts`          | Medium       |
| 4   | `ai/enhanced-report-builder/route.ts` | Token-heavy  |
| 5   | `ai/inspect/route.ts`                 | Vision API   |
| 6   | `ai/plan/export/route.ts`             | PDF gen      |
| 7   | `ai/dispatch/[claimId]/route.ts`      | Orchestrator |
| 8   | `ai/job-scanner/route.ts`             | Token-heavy  |
| 9   | `ai/agents/route.ts`                  | Orchestrator |
| 10  | `ai/supplement/[claimId]/route.ts`    | Token-heavy  |
| 11  | `ai/supplement/export-pdf/route.ts`   | PDF gen      |
| 12  | `ai/weather/run/route.ts`             | External API |
| 13  | `ai/estimate/[claimId]/route.ts`      | Token-heavy  |
| 14  | `ai/geometry/detect-slopes/route.ts`  | Vision API   |
| 15  | `ai/run/route.ts`                     | Orchestrator |
| 16  | `ai/dashboard-assistant/route.ts`     | Token-heavy  |
| 17  | `ai/domain/route.ts`                  | Medium       |
| 18  | `ai/damage/export/route.ts`           | PDF gen      |
| 19  | `ai/rebuttal/export-pdf/route.ts`     | PDF gen      |

### 1.2 — Auth Gaps (~110 routes)

Routes with no detectable auth middleware. Need audit — some may be intentionally public, others need `auth()` or `withAuth()`:

**High-priority domains (likely need auth):**

- `api/appointments/` — all CRUD
- `api/batch/` — bulk operations
- `api/commissions/` — financial data
- `api/crews/` — team management
- `api/finance/` — all financial endpoints
- `api/invoices/` — billing
- `api/jobs/` — job management
- `api/materials/` — cost data
- `api/permits/` — permit management
- `api/work-orders/` — work order CRUD

**Action:** For each domain, verify if the route uses auth indirectly (through `safeOrgContext`, `requireApiAuth`, etc.) or is truly unprotected. Add `withAuth()` wrapper where missing.

### 1.3 — Validate Zod on Request Bodies

Audit all POST/PUT/PATCH routes for Zod validation. Convention per copilot-instructions: "Zod schema at top, validate in handler, catch ZodError → 400."

---

## SPRINT 2 — Auth Pattern Consolidation (⚡ P1)

### Current State (4 competing patterns):

| Pattern          | Count | When to Use                                        |
| ---------------- | ----- | -------------------------------------------------- |
| `withOrgScope()` | 12    | Tier 1: standard CRUD (provides userId + orgId)    |
| `withAuth()`     | 94    | Tier 2: wrapper HOF                                |
| `requireAuth()`  | 35    | Tier 2: returns auth object or NextResponse        |
| raw `auth()`     | 206   | Tier 3: direct Clerk — simplest but no org scoping |

### 2.1 — Standardize Auth Tiers

1. **Define official tiers** in `src/lib/auth/README.md`:
   - Tier 1 → `withOrgScope()` for org-scoped CRUD
   - Tier 2 → `requireAuth()` for enterprise features
   - Tier 3 → `auth()` only for non-org-scoped endpoints
2. **Migrate** the 206 raw `auth()` routes:
   - Routes that query by orgId → convert to `withOrgScope()`
   - Routes that need role checks → convert to `requireAuth()`
   - Public/webhook routes → leave as-is

### 2.2 — Consolidate `withAuth` vs `requireAuth`

These two do almost the same thing. Pick one, alias the other, then gradually migrate.

---

## SPRINT 3 — Prisma Model Safety (⚡ P1)

### 3.1 — Tenant Isolation Audit

Every Prisma query MUST filter by `orgId`. Audit all routes for:

```
prisma.<model>.findMany({ where: { /* missing orgId */ } })
```

**Priority models:** claims, contacts, properties, jobs, invoices, documents, file_assets

### 3.2 — Wrong Prisma Model References

Scan for model names that don't match the schema:

- `prisma.membership` → should be `prisma.user_organizations`
- `prisma.org_members` → should be `prisma.user_organizations`
- Any other stale model references from schema evolution

### 3.3 — `prismaModel()` vs `prisma.` Direct Access

Audit usage of `prismaModel("claims")` helper vs direct `prisma.claims`. Decide on one pattern.

---

## SPRINT 4 — Code Quality (🧹 P3)

### 4.1 — Dead Code Removal

- [ ] Scan for exported functions/components with zero imports
- [ ] Remove stale page routes (check for orphan pages with no nav links)
- [ ] Clean up `archive/` folder references
- [ ] Remove temporary `scripts/` that are no longer needed

### 4.2 — Import Path Consistency

- [ ] Ensure all imports use `@/` aliases consistently
- [ ] No relative `../../` deep imports — convert to `@/lib/`, `@/components/`, etc.
- [ ] Audit for circular dependencies

### 4.3 — Error Handling Standardization

- [ ] All API routes should use `apiError(status, code, message)` from `@/lib/apiError`
- [ ] Catch `ZodError` → 400, `PrismaClientKnownRequestError` → appropriate status
- [ ] `NEXT_REDIRECT` errors must be re-thrown (not caught)
- [ ] Ensure all routes return proper error shapes `{ error, code, message }`

### 4.4 — Logger Consistency

- [ ] All API routes should use `logger` from `@/lib/logger` (not `console.log`)
- [ ] Ensure tag format: `[MODULE_ACTION]` (e.g., `[CLAIMS_CREATE]`, `[AI_CHAT]`)
- [ ] Remove all `console.log` / `console.error` in production routes

---

## SPRINT 5 — Performance & Observability (📈 P4)

### 5.1 — Bundle Size Optimization

- [ ] Audit dynamic imports — heavy packages (pdf-lib, @react-pdf/renderer, chart.js) should be lazy-loaded
- [ ] Check for `"use client"` on pages that could be Server Components
- [ ] Verify tree-shaking works for lucide-react (import individual icons, not `*`)

### 5.2 — Database Query Optimization

- [ ] Add missing Prisma indexes for frequent query patterns
- [ ] Audit N+1 queries (findMany → map → findUnique pattern)
- [ ] Use `select` to limit fields on large queries
- [ ] Add `take` limits to unbounded findMany calls

### 5.3 — Observability

- [ ] Ensure Sentry error capture on all unhandled errors
- [ ] Add structured logging to critical paths (payment flows, e-sign, AI)
- [ ] Health check endpoints return meaningful status (DB, Redis, external APIs)

---

## SPRINT 6 — Testing (📈 P4)

### 6.1 — Unit Test Coverage

- [ ] Add tests for `src/lib/auth/` (managerScope, tenant, rbac)
- [ ] Add tests for `src/lib/notifications/` (notifyManagers, templates)
- [ ] Add tests for `src/lib/services/claimsService.ts` (listClaims with visibleUserIds)
- [ ] Add tests for `src/lib/rate-limit.ts`

### 6.2 — Integration / Smoke Tests

- [ ] Playwright smoke tests for critical paths: sign-in → dashboard → create claim → upload → AI analyze
- [ ] API smoke tests for payment webhook flow
- [ ] E-sign flow end-to-end test

---

## Metrics Summary

| Metric                      | Before | After       | Target |
| --------------------------- | ------ | ----------- | ------ |
| TypeScript Errors           | 0      | 0           | 0      |
| Build Status                | ✅     | ✅          | ✅     |
| API Routes Total            | 548    | 548         | —      |
| Routes with `force-dynamic` | ~355   | **548**     | 548 ✅ |
| AI Routes with Rate Limit   | 20/39  | **20/39**   | 39/39  |
| Auth Pattern: withOrgScope  | 12     | 12          | ~200+  |
| Auth Pattern: raw auth()    | ~247   | ~206        | <50    |
| Broken Prisma Imports       | 6      | **0**       | 0 ✅   |
| Wrong Prisma Model Refs     | 1+     | **0 known** | 0      |

---

## Quick Reference — What Was Fixed Today

1. **548/548 API routes** now have `export const dynamic = "force-dynamic"` (was ~355)
2. **6 broken imports** fixed: `@/lib/db/prisma` → `@/lib/prisma`
3. **9 AI routes** got rate limiting (damage/analyze, orchestrate, plan/generate, video, history, status, usage, recommendations, smart-actions)
4. **Missing icon imports** fixed: `DollarSign` + `Send` in claims/[claimId]/overview
5. **Wrong Prisma model** fixed: `prisma.membership` → `prisma.user_organizations` in notifyManagers.ts
6. **Type narrowing** fixed: `ctx.orgId` in finance/overview (null to string)
7. **Interface gap** fixed: `WorkspaceData` missing signingStatus, estimatedJobValue, jobValueStatus, jobValueApprovedBy, jobValueApprovalNotes

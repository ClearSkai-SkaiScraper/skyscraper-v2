# SkaiScraper — Production Readiness Audit

> Generated: June 2025  
> Scope: Multi-tenant security, auth enforcement, persistence integrity, observability

---

## 1. Tenant Isolation — COMPLETED ✅

### 1a. HIGH Severity — Cross-Tenant Data Access (6 fixed)

| Route                                  | Vulnerability                                                  | Fix Applied                                                  |
| -------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `api/video/create`                     | Bare `auth()`, no org scoping on claim lookup                  | Upgraded to `requireAuth()`, `findFirst` with `orgId`        |
| `api/esign/envelopes/[id]/send`        | Org check conditional on `claimId` presence — bypassed if null | Made org verification mandatory; returns 400 if no `claimId` |
| `api/pipeline/move`                    | Post-hoc `orgId` comparison after unscoped `findUnique`        | Atomic `findFirst` with `orgId` in where clause              |
| `api/signatures/request`               | Document lookup by `id` only — no org scope                    | Added `orgId` to document `findFirst` where clause           |
| `api/weather/export`                   | `findUnique` by id, post-hoc org check could be bypassed       | `findFirst` with `claims: { orgId }` relation filter         |
| `api/automation/recommendation/accept` | Downstream `claims.update`/`jobs.update` missing `orgId`       | Added `orgId` to all 3 mutation where clauses                |

### 1b. MEDIUM Severity — TOCTOU Find-Then-Mutate (20 mutations across 12 files, all fixed)

**Pattern:** `findFirst({ where: { id, orgId } })` → `delete/update({ where: { id } })` creates a race window where org scoping is lost between the check and the mutation.

**Fix strategy:**

- **Deletes:** Replaced with `deleteMany({ where: { id, orgId } })` + `result.count === 0` check for 404
- **Updates needing return value:** Wrapped in `prisma.$transaction()` with find+update in same atomic block
- **Updates not needing return value:** Replaced with `updateMany({ where: { id, orgId } })`

| Route                               | Operations Fixed                                             |
| ----------------------------------- | ------------------------------------------------------------ |
| `api/crews/[id]`                    | PATCH ($transaction), DELETE (deleteMany)                    |
| `api/permits/[id]`                  | PATCH ($transaction), DELETE (deleteMany)                    |
| `api/canvass-pins`                  | PATCH ($transaction), DELETE (deleteMany)                    |
| `api/finance/commission-plans/[id]` | PUT (updateMany), DELETE (deleteMany)                        |
| `api/reports/[reportId]`            | DELETE (deleteMany)                                          |
| `api/templates/[templateId]`        | PATCH (inline async), DELETE (deleteMany)                    |
| `api/partners/[id]`                 | PATCH ($transaction), DELETE (deleteMany)                    |
| `api/damage/[id]`                   | DELETE (deleteMany)                                          |
| `api/claims/[claimId]/timeline`     | DELETE (deleteMany with org_id)                              |
| `api/report-templates/[id]`         | DELETE (findFirst + deleteMany, removed post-hoc comparison) |
| `api/measurements/[id]`             | PATCH ($transaction), DELETE (updateMany soft-cancel)        |
| `api/tasks/[taskId]`                | PUT ($transaction), DELETE (deleteMany)                      |

### 1c. LOW Severity — Informational

| Route                            | Issue                                                        | Risk                                                       | Notes |
| -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ----- |
| `api/claims/[claimId]/notes`     | Notes scoped by `claimId` only, no direct `orgId` check      | Low — claim itself is org-scoped by `getOrgClaimOrThrow()` |
| `api/portal/messages/[threadId]` | Portal auth + thread membership check, no org_id on messages | Low — portal auth is separate from pro auth                |
| `api/claims/[claimId]/update`    | Uses `getOrgClaimOrThrow()` which is atomic                  | Info — already safe                                        |
| 5 additional portal routes       | Portal routes use email/userId-based access, not org scoping | Low — different auth model by design                       |

---

## 2. Auth & Role Matrix — TO DO

### Priority checks:

- [ ] Audit all routes using bare `auth()` instead of `requireAuth()`/`withAuth()`/`withOrgScope()`
- [ ] Verify RBAC role requirements match business logic (e.g., only ADMIN can delete users)
- [ ] Check `RBACGuard` client components match server-side role enforcement
- [ ] Audit portal routes for proper `requirePortalAuth()` usage
- [ ] Verify middleware `isPortalRoute` detection covers all portal paths

### Known patterns:

```
Tier 1: withOrgScope(handler)          — DB-verified orgId, recommended
Tier 2: requireAuth()                  — returns auth object or NextResponse
Tier 3: auth() from @clerk/nextjs      — no org resolution, AVOID
```

---

## 3. Database Constraints & Indexes — TO DO

### Priority checks:

- [ ] Verify all models with `orgId`/`org_id` have composite indexes: `@@index([orgId, ...])`
- [ ] Check for missing foreign key constraints (e.g., `claimId` references)
- [ ] Audit `@@unique` constraints on business-critical fields (claim numbers, email+org combinations)
- [ ] Verify cascade delete rules won't orphan records across tenant boundaries
- [ ] Check that `id` fields use `createId()` (cuid2), not auto-increment

### Known gaps:

- `claim_timeline_events.org_id` is `String?` (nullable) — should be required for tenant isolation
- Some models use `orgId` (camelCase) and others use `org_id` (snake_case) — inconsistent but functional

---

## 4. Regression Tests — TO DO

### Critical paths needing test coverage:

- [ ] Tenant isolation: Create resource as Org A, attempt to read/update/delete as Org B → expect 404
- [ ] RBAC: Viewer cannot create claims, Member cannot delete users
- [ ] Portal claim submission: Full wizard flow (create claim → upload photos → submit)
- [ ] Pipeline moves: Moving claims/leads between stages preserves org scoping
- [ ] Video/signature flows: Cross-tenant access denied
- [ ] Automation acceptance: Downstream mutations scoped correctly

### Suggested test file locations:

```
tests/api/tenant-isolation.test.ts     — Cross-org access tests
tests/api/rbac-enforcement.test.ts     — Role-based access tests
tests/api/portal-flows.test.ts         — Portal submission tests
```

---

## 5. E2E Smoke Suite — TO DO

### Critical user journeys:

- [ ] Pro: Sign in → Dashboard → Create Claim → Add Timeline Event → Generate Report
- [ ] Pro: Claims List → Open Claim → Upload Photo → View in Gallery
- [ ] Pro: Pipeline View → Drag Claim to New Stage → Verify Update
- [ ] Portal: Client Sign In → View Claim → Upload Photo → Send Message
- [ ] Admin: Settings → Team Members → Invite User → Assign Role

### Infrastructure:

- Playwright config exists at `playwright.config.ts`
- E2E directory at `e2e/`
- Smoke tests should target: `pnpm test:smoke`

---

## 6. Error Handling & Observability — TO DO

### Priority checks:

- [ ] Verify all API routes catch and log errors with structured tags (`[MODULE_ACTION]`)
- [ ] Check Sentry integration captures unhandled exceptions
- [ ] Verify `NEXT_REDIRECT` errors are re-thrown (not swallowed)
- [ ] Audit rate limiting coverage: AI endpoints (5/min), standard CRUD (10/min)
- [ ] Check that `apiError()` from `@/lib/apiError` is used consistently

### Known patterns:

- Logger: `import { logger } from "@/lib/logger"` — Sentry-integrated
- Rate limits: `checkRateLimit(userId, preset)` — Upstash Redis
- Error utility: `apiError(status, code, message)` — standardized responses

---

## 7. Performance Hotspots — TO DO

### Priority checks:

- [ ] Identify N+1 query patterns (findMany followed by individual lookups in loops)
- [ ] Check for missing pagination on list endpoints (unbounded `findMany`)
- [ ] Verify `select` is used to limit returned fields on heavy models
- [ ] Audit `include` depth — deeply nested includes can cause slow queries
- [ ] Check Prisma connection pooling configuration for Supabase

### Known concerns:

- `canvass-pins GET` returns up to 500 pins — may need cursor pagination for scale
- Several routes use `findMany` without `take` limit
- Report generation involves multiple AI calls — ensure proper timeout/retry

---

## 8. Build & Deploy Safety — COMPLETED ✅

| Guard                         | Status | Location                                                     |
| ----------------------------- | ------ | ------------------------------------------------------------ |
| TypeScript typecheck in build | ✅     | `scripts/typecheck-guard.sh`, `vercel.json` buildCommand     |
| Pre-build hook                | ✅     | `package.json` → `prebuild` script                           |
| Pre-push git hook             | ✅     | `.husky/pre-push` → `pnpm typecheck`                         |
| Pre-commit git hook           | ✅     | `.husky/pre-commit` → `pnpm lint:core`                       |
| CI TypeScript gate            | ✅     | `.github/workflows/deploy-vercel.yml`, `preview-vercel.yml`  |
| VS Code real-time validation  | ✅     | `.vscode/settings.json` → `typescript.validate.enable: true` |

---

## Summary

| Area                      | Status         | Severity Fixed                         |
| ------------------------- | -------------- | -------------------------------------- |
| Tenant Isolation (HIGH)   | ✅ Complete    | 6 cross-tenant access vulnerabilities  |
| Tenant Isolation (MEDIUM) | ✅ Complete    | 20 TOCTOU mutations across 12 routes   |
| Tenant Isolation (LOW)    | ℹ️ Documented  | 5 informational items, acceptable risk |
| Auth/Role Matrix          | ❌ Not started | —                                      |
| DB Constraints            | ❌ Not started | —                                      |
| Regression Tests          | ❌ Not started | —                                      |
| E2E Smoke Suite           | ❌ Not started | —                                      |
| Error Handling            | ❌ Not started | —                                      |
| Performance               | ❌ Not started | —                                      |
| Build Safety              | ✅ Complete    | 6-layer defense                        |

**Total security fixes applied this session:** 26 mutations across 18 files  
**TypeScript errors:** 0 (verified)

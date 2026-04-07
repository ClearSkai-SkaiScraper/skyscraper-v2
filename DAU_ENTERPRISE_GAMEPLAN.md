# 🎯 DAU Enterprise-Ready Master Game Plan

> **Goal:** Take SkaiScraper from "early production-ready" → **"polished enterprise-ready"** in 7 days  
> **Generated:** April 6, 2026  
> **Baseline:** 0 TypeScript errors · 781/781 tests passing · 54 test files green

---

## 📊 Current State Audit (Hard Numbers)

| Dimension                              | Current                   | Target                             | Gap                         |
| -------------------------------------- | ------------------------- | ---------------------------------- | --------------------------- |
| TypeScript errors                      | **0**                     | 0                                  | ✅ Done                     |
| Test suite                             | **781/781 passing**       | 800+                               | ≈20 new tests needed        |
| API routes total                       | **650**                   | —                                  | —                           |
| Routes using `withAuth` HOF            | **166** (25%)             | 295+ (45%+)                        | 129 HIGH-RISK routes        |
| Pro routes with raw `auth()` + `orgId` | **129**                   | **0**                              | 🔴 CRITICAL                 |
| Portal routes with Zod                 | **15** / 54               | 30+                                | ~15 more POST/PATCH routes  |
| Routes without logger                  | **44** / 650              | 0                                  | 44 routes to add            |
| ESLint problems (lint:core)            | **23,089** (5,696 errors) | <500 errors                        | Triage by rule              |
| TODO/FIXME markers                     | **149**                   | <30                                | Triage or resolve           |
| Root markdown debt files               | **48**                    | 5                                  | Archive 43 files            |
| DB migration files                     | **284**                   | consolidated                       | Squash history              |
| Feature flag files                     | **3 duplicates**          | 1 canonical                        | Consolidate                 |
| Auth lib files                         | **25 files**              | rationalized                       | Audit for dead code         |
| Env files                              | **6**                     | 3 (.env, .env.example, .env.local) | Consolidate                 |
| Rate-limited routes                    | **123** / 650             | 200+                               | Add to write routes         |
| Error boundaries                       | **148** error.tsx         | audit quality                      | Check for generic fallbacks |
| Loading states                         | **126** loading.tsx       | audit quality                      | Verify they're not stubs    |

---

## 🗓️ 7-Day Sprint Schedule

### DAY 1 (Mon) — CRITICAL: Tenant Isolation Sweep

**Goal: Zero raw `auth()` + `orgId` routes in high-traffic surfaces**

The #1 enterprise risk. 129 pro routes use `auth()` from Clerk and pass the Clerk `org_xxx` format ID directly into Prisma queries. This silently returns 0 rows for multi-tenant orgs.

**Priority tiers (by blast radius):**

| Tier | Routes                                  | Count | Risk              |
| ---- | --------------------------------------- | ----- | ----------------- |
| P0   | claims, leads, team, admin              | 8     | Data loss         |
| P1   | messages, tasks, contacts, uploads      | 14    | Cross-tenant leak |
| P2   | branding, settings, ai, agents          | 21    | Wrong org context |
| P3   | estimates, trades, completion, exports  | 30+   | Degraded UX       |
| P4   | remaining (org, migrations, diag, etc.) | 56    | Low traffic       |

**Day 1 deliverables:**

- [ ] **Convert P0 routes to `withAuth`** (claims, leads, team, admin) — ~8 routes
- [ ] **Convert P1 routes to `withAuth`** (messages, tasks, contacts, uploads) — ~14 routes
- [ ] **Convert P2 routes to `withAuth`** (branding, settings, AI, agents) — ~21 routes
- [ ] Run `npx tsc --noEmit` → 0 errors
- [ ] Run `npx vitest run` → all green

**Mechanical pattern (same for every route):**

```typescript
// BEFORE:
import { auth } from "@clerk/nextjs/server";
const { userId, orgId } = await auth();

// AFTER:
import withAuth from "@/lib/auth/withAuth";
export const POST = withAuth(async (req, { orgId, userId }) => { ... });
```

---

### DAY 2 (Tue) — CRITICAL: Complete Tenant Sweep + Portal Hardening

**Goal: Finish auth conversion, harden remaining portal surfaces**

**Day 2 deliverables:**

- [ ] **Convert P3 + P4 routes to `withAuth`** — remaining ~86 routes
- [ ] **Add Zod validation to 15 more portal POST/PATCH routes** (39 without Zod, prioritize routes accepting `req.json()`)
- [ ] **Add structured logger** to 44 routes missing it
- [ ] Run full test suite → green

**Portal Zod prioritization:**

1. Portal messages routes (5 routes — user-generated content)
2. Portal jobs sub-routes (3 routes — [jobId]/actions, etc.)
3. Portal community routes (3 routes — posts, groups)
4. Portal claims routes (3 routes — create, messages)
5. Remaining portal (save-pro, work-request, moderate, etc.)

---

### DAY 3 (Wed) — ESLint Triage + Code Quality

**Goal: Cut ESLint errors from 5,696 → <1,000**

The 23,089 lint problems break down as:

| Rule                                 | Count | Type  | Strategy                                                           |
| ------------------------------------ | ----- | ----- | ------------------------------------------------------------------ |
| `no-unsafe-member-access`            | 9,825 | warn  | Bulk-suppress in config (warnings not blocking)                    |
| `no-unsafe-assignment`               | 7,277 | warn  | Bulk-suppress in config (warnings not blocking)                    |
| `no-explicit-any`                    | 2,362 | error | Fix top 50 files, suppress rest with `// eslint-disable-next-line` |
| `no-unused-vars`                     | 965   | error | Auto-fixable: remove or prefix with `_`                            |
| `no-restricted-syntax` (process.env) | 782   | error | Pragmatic: suppress for now, note in tech debt                     |
| `no-floating-promises`               | 536   | error | Add `await` or `void` — REAL bugs here                             |
| `no-restricted-imports` (Clerk)      | 434   | error | Will drop to ~0 after Day 1-2 auth conversion                      |
| `await-thenable`                     | 376   | error | Remove unnecessary `await`                                         |
| `no-unescaped-entities`              | 178   | error | `&apos;` → `{&apos;}` in JSX                                       |
| `no-img-element`                     | 160   | error | Change `<img>` → `<Image>` (Next.js)                               |
| `exhaustive-deps`                    | 83    | warn  | Add missing deps or suppress                                       |
| `rules-of-hooks`                     | 47    | error | REAL bugs — fix immediately                                        |
| `simple-import-sort`                 | 15    | error | Auto-fixable with `--fix`                                          |

**Day 3 deliverables:**

- [ ] **Fix `rules-of-hooks` violations** — 47 real bugs (conditional hook calls)
- [ ] **Fix `no-floating-promises`** — 536 missing `await` (real async bugs)
- [ ] **Fix `no-unused-vars`** — 965 instances (auto-fixable)
- [ ] **Fix `await-thenable`** — 376 unnecessary awaits
- [ ] **Run `eslint --fix`** for auto-fixable rules (import sort, etc.)
- [ ] **Downgrade warnings** in eslint config: `no-unsafe-assignment` → `off`, `no-unsafe-member-access` → `off` (these are noise, not bugs)
- [ ] **Suppress `no-restricted-syntax` for process.env** in legacy files (pragmatic)
- [ ] Run `pnpm lint:core` → target <1,000 remaining errors

---

### DAY 4 (Thu) — PDF Subsystem + Report Pipeline

**Goal: PDF reports generate cleanly end-to-end**

**Current state:** 37 PDF files in `src/lib/pdf/`, 0 TS errors but heavy lint debt and TODO markers.

**Day 4 deliverables:**

- [ ] **Audit all 37 PDF files** — identify dead code, stub implementations
- [ ] **Fix all TODO/FIXME in PDF** (~15 markers)
- [ ] **Verify PDF generation path** works: template → AI content → render → download
- [ ] **Test report types:** damage report, claim packet, proposal, timeline export
- [ ] **Fix `generateReport.ts`** — largest file, most complex, core entry point
- [ ] **Fix `enhancedReportBuilder.ts`** — secondary pipeline
- [ ] **Clean up dead PDF files** (if any are unused)
- [ ] Write **3 PDF integration tests** (generate + verify output structure)

---

### DAY 5 (Fri) — Consolidation + Cleanup

**Goal: Eliminate structural debt**

**Day 5 deliverables:**

**Feature Flag Consolidation:**

- [ ] Audit 3 flag files: `feature-flags.ts`, `featureFlags.ts`, `flags.ts`
- [ ] Consolidate to **1 canonical** `src/lib/flags/index.ts`
- [ ] Update all imports (expected: 30-50 files)
- [ ] Delete dead flag files

**Auth Lib Rationalization:**

- [ ] Audit 25 auth files in `src/lib/auth/`
- [ ] Identify unused/dead exports (e.g., `ensureOrg`, `getActiveOrgSafe`, `orgScope`)
- [ ] Consolidate re-exports into clean barrel file
- [ ] Document canonical auth patterns in `ARCHITECTURE.md`

**Env Consolidation:**

- [ ] Audit 6 env files → reduce to 3: `.env`, `.env.example`, `.env.local`
- [ ] Delete `.env.vercel-check`, `.env.vercel-prod`, `.env.production.local`
- [ ] Ensure `.env.example` has ALL required vars with descriptions
- [ ] Verify `validateEnv.ts` covers all critical vars

**Root Markdown Cleanup:**

- [ ] Archive 43 legacy TODO/AUDIT/SPRINT markdown files → `docs/archive/`
- [ ] Keep only: `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `DEPLOYMENT.md`, `SECURITY.md`, `DAU_ENTERPRISE_GAMEPLAN.md`

---

### DAY 6 (Sat) — Testing + Observability

**Goal: 800+ tests, full observability coverage**

**Day 6 deliverables:**

**Test Coverage Expansion:**

- [ ] Add **10 new auth conversion tests** (verify withAuth on converted routes)
- [ ] Add **5 portal Zod validation tests** (verify 400 on bad input)
- [ ] Add **3 PDF generation tests** (smoke test report output)
- [ ] Add **2 rate limit tests** (verify 429 on excess)
- [ ] Target: **800+ tests passing**

**Observability Hardening:**

- [ ] Add logger to remaining 44 routes without it
- [ ] Audit catch blocks — ensure NO silent swallows
- [ ] Verify Sentry `captureException` in all critical error paths
- [ ] Add structured log tags `[MODULE_ACTION]` format where missing

**Rate Limiting:**

- [ ] Audit write routes (POST/PATCH/DELETE) without rate limiting
- [ ] Add `checkRateLimit` to top 20 unprotected write routes
- [ ] Verify rate limit on all AI routes (expensive operations)

---

### DAY 7 (Sun) — Final Verification + Production Readiness

**Goal: Full green across all dimensions**

**Day 7 deliverables:**

**Full Verification Matrix:**

- [ ] `npx tsc --noEmit` → **0 errors**
- [ ] `npx vitest run` → **800+ tests, all green**
- [ ] `pnpm lint:core` → **<500 errors** (warnings acceptable)
- [ ] `pnpm build` → **successful production build**
- [ ] Manual E2E: Create claim → Generate report → Download PDF → View in portal

**Security Checklist:**

- [ ] All pro routes use `withAuth` (orgId = DB UUID)
- [ ] All portal POST/PATCH routes have Zod validation
- [ ] No `process.env` in API routes (use `@/lib/config`)
- [ ] Security headers present in middleware
- [ ] Rate limiting on all write + AI routes

**Production Readiness:**

- [ ] Health check endpoint responds: `/api/health/live`
- [ ] Error boundaries on all page routes
- [ ] Loading states on all page routes
- [ ] Sentry capturing errors
- [ ] Structured logging throughout

---

## 📋 Master TODO Checklist (Prioritized)

### 🔴 P0 — Must-have for DAU (Days 1-2)

- [ ] Convert 129 pro routes from `auth()` to `withAuth` (tenant isolation)
- [ ] Add Zod to 15+ more portal routes
- [ ] Add logger to 44 routes
- [ ] Fix `rules-of-hooks` — 47 violations (real bugs)
- [ ] Fix `no-floating-promises` — 536 violations (async bugs)

### 🟡 P1 — Strong enterprise signal (Days 3-4)

- [ ] Cut ESLint errors from 5,696 → <1,000
- [ ] PDF subsystem: verify end-to-end generation works
- [ ] Fix unused vars — 965 instances
- [ ] Fix await-thenable — 376 instances
- [ ] Write PDF integration tests

### 🟢 P2 — Polish (Days 5-6)

- [ ] Consolidate 3 feature flag files → 1
- [ ] Rationalize 25 auth lib files
- [ ] Consolidate 6 env files → 3
- [ ] Archive 43 root markdown files
- [ ] Expand test suite to 800+
- [ ] Add rate limiting to unprotected write routes

### 🔵 P3 — Nice-to-have (Day 7+)

- [ ] Resolve 149 TODO/FIXME markers (triage: fix or promote to issues)
- [ ] Migration squash (284 → consolidated baseline)
- [ ] Full production E2E test
- [ ] Performance audit (bundle size, API latency)
- [ ] Accessibility audit on portal pages

---

## 🎯 Success Criteria (DAU-Ready)

| Metric            | Current       | DAU Target    | Status |
| ----------------- | ------------- | ------------- | ------ |
| TypeScript errors | 0             | 0             | ✅     |
| Test suite        | 781 pass      | 800+ pass     | 🟡     |
| Auth conversion   | 25% withAuth  | 95%+ withAuth | 🔴     |
| Portal Zod        | 28% coverage  | 70%+ coverage | 🟡     |
| ESLint errors     | 5,696         | <500          | 🔴     |
| Logger coverage   | 93%           | 100%          | 🟡     |
| PDF E2E           | untested      | verified      | 🔴     |
| Production build  | untested      | passing       | 🔴     |
| Root file hygiene | 48 debt files | 5 clean files | 🟡     |

**When ALL rows show ✅ → the system is DAU enterprise-ready.**

---

## ⚡ Execution Notes

1. **Always run after each batch:** `npx tsc --noEmit && npx vitest run`
2. **auth → withAuth is mechanical:** Same pattern every time, can batch 10-15 per session
3. **ESLint --fix handles:** import sort, some unused vars automatically
4. **Portal routes don't need withAuth** — they use userId only, not orgId
5. **Build must pass with `BUILD_PHASE=1`** env var set
6. **Never `new PrismaClient()`** — always `import prisma from "@/lib/prisma"`
7. **Never `new OpenAI()`** — always `import { getAIClient } from "@/lib/ai"`

---

_This is the single source of truth. All previous MASTER_TODO files are superseded._

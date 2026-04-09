# MASTER FINAL TODO — A+ Ship-Ready / Sell-Ready / DAU-Ready

> **Created:** 2026-04-09  
> **Baseline:** 906/906 tests ✅ | typecheck ✅ | lint:ship ✅ | pushes green  
> **Goal:** Go from "Pre-Revenue Technically Ready" → "Sellable Product"  
> **Total items:** 251  
> **Phases:** 3 — Stabilize → Sell → Scale

---

## Current Platform Snapshot

| Metric                     | Count                  | Status |
| -------------------------- | ---------------------- | ------ |
| API route.ts files         | 653                    | ✅     |
| Pro dashboard pages        | 358                    | ✅     |
| Portal pages               | 26                     | 🟡     |
| Marketing pages            | 14                     | ✅     |
| Unit tests                 | 906/906                | ✅     |
| error.tsx coverage (app)   | 170/173 needed         | 🟡     |
| loading.tsx coverage (app) | 165                    | 🟡     |
| not-found.tsx coverage     | 4 total                | 🔴     |
| Email templates            | 18                     | ✅     |
| Lint errors (full repo)    | 4,799                  | 🔴     |
| Lint warnings (full repo)  | 17,194                 | 🟡     |
| lint:ship gate             | 0 errors               | ✅     |
| Seed SQL files             | 23 (heavy overlap)     | 🟡     |
| Billing mode               | BETA (guard bypassed)  | 🔴     |
| Onboarding steps           | 10-step funnel defined | 🟢     |

---

# ═══════════════════════════════════════════════════════

# PHASE 1 — STABILIZE (Sprints 12, 15, 16)

# "Lock the foundation so nothing breaks in front of a customer"

# ═══════════════════════════════════════════════════════

---

## Sprint 12 — Auto-Fix + Instant Wins (1 session)

> **Goal:** Kill every auto-fixable error + lowest-hanging fruit  
> **Entry gate:** `lint:ship` = 0 errors  
> **Exit gate:** Full-repo errors drop from 4,799 → ~4,350

### 12A — ESLint Auto-Fix (81 errors → 0)

- [ ] **12A-01** Run `eslint --fix` on full `src/` — kills 81 `simple-import-sort/imports` errors
- [ ] **12A-02** Review auto-fix diff for unexpected changes
- [ ] **12A-03** Run typecheck after auto-fix
- [ ] **12A-04** Run test:unit after auto-fix
- [ ] **12A-05** Commit: `chore(12A): eslint --fix auto-sort imports`

### 12B — Unescaped Entities (177 errors → 0)

- [ ] **12B-01** Find all `react/no-unescaped-entities` violations
- [ ] **12B-02** Batch-fix `'` → `&apos;` in JSX text content
- [ ] **12B-03** Batch-fix `"` → `&quot;` in JSX text content
- [ ] **12B-04** Batch-fix `>` → `&gt;` / `<` → `&lt;` if any
- [ ] **12B-05** Verify no text content was corrupted
- [ ] **12B-06** Commit: `fix(12B): escape JSX entities — 177 violations`

### 12C — Config Layer Exemptions (12 errors → 0)

- [ ] **12C-01** Add `/* eslint-disable no-restricted-syntax */` to `src/config/env.ts` (it IS the env layer)
- [ ] **12C-02** Add eslint-disable to `src/config/version.ts` (legitimate env access)
- [ ] **12C-03** Add explanatory comments on why these files are exempt
- [ ] **12C-04** Expand `lint:ship` scope to include all of `src/config/`
- [ ] **12C-05** Run `lint:ship` to verify 0 new errors
- [ ] **12C-06** Commit: `chore(12C): exempt config env layer + expand lint:ship`

### 12D — Console + Quick Warning Cleanup (~20 warnings)

- [ ] **12D-01** Replace all 17 `no-console` usages with `logger.info` / `logger.debug` or remove
- [ ] **12D-02** Fix 4 `import/no-anonymous-default-export` warnings
- [ ] **12D-03** Commit: `chore(12D): replace console.log with logger, fix anon exports`

### 12E — Sprint 12 Ship Gate

- [ ] **12E-01** Full `pnpm typecheck`
- [ ] **12E-02** Full `pnpm test:unit`
- [ ] **12E-03** Full `npm run lint:ship`
- [ ] **12E-04** Push to origin

---

## Sprint 15 — TradesConnection Migration (1 session)

> **Goal:** Eliminate the last schema weirdness + remove all `as any` casts  
> **Prereq:** Production DB access  
> **Exit gate:** 0 `tradesConnection as any` in codebase

### 15A — Verify + Drop Dead Model

- [ ] **15A-01** Run `SELECT COUNT(*) FROM "TradesConnection"` on production
- [ ] **15A-02** Confirm 0 rows (if >0, create data migration plan first)
- [ ] **15A-03** Backup production DB before migration
- [ ] **15A-04** Write migration SQL: `DROP TABLE IF EXISTS "TradesConnection"`
- [ ] **15A-05** Apply migration to production
- [ ] **15A-06** Commit migration SQL to `db/migrations/`

### 15B — Schema + Prisma Cleanup

- [ ] **15B-01** Remove `model TradesConnection { ... }` from `prisma/schema.prisma`
- [ ] **15B-02** Remove `TradesConnection` references from `TradesProfile` relations
- [ ] **15B-03** Run `npx prisma generate`
- [ ] **15B-04** Verify `prisma.tradesConnection` now types correctly to camelCase model

### 15C — Remove All `as any` Casts (7 files, ~34 operations)

- [ ] **15C-01** `src/app/api/network/clients/[slug]/profile/route.ts` — remove alias + fix types
- [ ] **15C-02** `src/app/api/trades/actions/route.ts` — remove alias + fix types
- [ ] **15C-03** `src/app/api/trades/company/seats/accept/route.ts` — remove alias + fix types
- [ ] **15C-04** `src/app/api/trades/connections/route.ts` — remove alias + fix types
- [ ] **15C-05** `src/app/api/trades/mutual/route.ts` — remove alias + fix types
- [ ] **15C-06** `src/app/api/trades/profile/route.ts` — remove alias + fix types
- [ ] **15C-07** `src/app/(app)/contacts/page.tsx` — remove alias + fix types
- [ ] **15C-08** Delete `db/migrations/PENDING_trades_connection_cleanup.md` (completed)

### 15D — Sprint 15 Ship Gate

- [ ] **15D-01** Full `pnpm typecheck`
- [ ] **15D-02** Full `pnpm test:unit`
- [ ] **15D-03** Grep for `as any` in trades files — must be 0
- [ ] **15D-04** Push to origin

---

## Sprint 16 — Observability + DAU Production Checklist (1 session)

> **Goal:** Prove the money path works end-to-end on production  
> **Exit gate:** Every DAU flow verified + Sentry fully operational

### 16A — Sentry Production Setup

- [ ] **16A-01** Set `SENTRY_AUTH_TOKEN` in Vercel environment variables (Production)
- [ ] **16A-02** Set `SENTRY_UPLOAD_ENABLED=1` in Vercel environment variables
- [ ] **16A-03** Deploy to trigger source map upload
- [ ] **16A-04** Verify Sentry shows release with correct `VERCEL_GIT_COMMIT_SHA`
- [ ] **16A-05** Trigger a test error on production, verify it shows source-mapped stack trace
- [ ] **16A-06** Verify Sentry performance monitoring captures transactions

### 16B — DAU Production Checklist (10 flows)

- [ ] **16B-01** Flow 1: Sign In → org resolution → dashboard loads with correct data
- [ ] **16B-02** Flow 2: Create Claim → all form fields work → claim appears in list
- [ ] **16B-03** Flow 3: Upload Photos → file upload works → photos appear on claim
- [ ] **16B-04** Flow 4: AI Damage Detection → triggers successfully → results display
- [ ] **16B-05** Flow 5: Weather Report → fetches data → report generates
- [ ] **16B-06** Flow 6: Generate Report → PDF renders → download works
- [ ] **16B-07** Flow 7: Claim Lifecycle → status transitions → timeline updates
- [ ] **16B-08** Flow 8: Tasks → create task → assign → complete → updates
- [ ] **16B-09** Flow 9: Messages → send message → thread renders → read receipts
- [ ] **16B-10** Flow 10: Contacts → add contact → profile renders → search works
- [ ] **16B-11** Flow 11: Trades → send work request → accept → job created
- [ ] **16B-12** Flow 12: Billing → view subscription → seat management → Stripe portal opens
- [ ] **16B-13** Flow 13: Settings → profile saves → branding updates → team invite works
- [ ] **16B-14** Flow 14: Notifications → receive → mark read → badge clears
- [ ] **16B-15** Flow 15: Reports Hub → list renders → filters work → download works

### 16C — Document Failures + Create Punch List

- [ ] **16C-01** Log every failure/bug found during 16B into a punch list
- [ ] **16C-02** Categorize as P0 (blocks demo) / P1 (bad UX) / P2 (polish)
- [ ] **16C-03** Fix all P0 items immediately
- [ ] **16C-04** Schedule P1 items for Sprint 17 or Lane H
- [ ] **16C-05** Commit any P0 fixes: `fix(16C): DAU punch list P0 items`

---

# ═══════════════════════════════════════════════════════

# PHASE 2 — SELL (Lane H + Sprint 14)

# "Make it sellable — demo, seed data, pricing, onboarding"

# ═══════════════════════════════════════════════════════

---

## Lane H — Revenue Readiness (2-3 sessions)

> **Goal:** Transform from "impressive tech" → "product people pay for"  
> **This is the most important lane for revenue.**

### H1 — Demo Flow Lock (THE demo script)

- [ ] **H1-01** Audit existing `DEMO_SCRIPT.md` (342 lines) — identify stale sections
- [ ] **H1-02** Audit existing `demo-day.sh` (153 lines) — verify all API calls still work
- [ ] **H1-03** Resolve `src/lib/demoMode.ts` vs `src/lib/demo-mode.ts` duplication — pick canonical
- [ ] **H1-04** Delete the duplicate demo mode file
- [ ] **H1-05** Verify demo mode flags: `DEMO_MODE` + `NEXT_PUBLIC_DEMO_MODE` env vars
- [ ] **H1-06** Create the **5-Minute Demo Script** (new DEMO_FLOW.md):
  - [ ] **H1-06a** Act 1: Login → Dashboard wow moment (stats, cards, activity)
  - [ ] **H1-06b** Act 2: Create claim → upload photos → AI detection fires
  - [ ] **H1-06c** Act 3: Weather report auto-fetches → scope + damage mapped
  - [ ] **H1-06d** Act 4: Generate report → PDF downloads → professional output
  - [ ] **H1-06e** Act 5: Lifecycle → tasks → messages → work requests → "it all connects"
  - [ ] **H1-06f** Closing: Show billing page → "$80/seat saves you 10 hours/claim"
- [ ] **H1-07** Test the full demo flow on production with demo org
- [ ] **H1-08** Time the demo — must fit in 5-7 minutes
- [ ] **H1-09** Commit: `docs(H1): production demo flow script`

### H2 — Seed Data Consolidation

- [ ] **H2-01** Inventory all 23 seed SQL files — identify overlaps
- [ ] **H2-02** Consolidate vendor seeds: merge 6 vendor files → 1 canonical `db/seed-vendors.sql`
- [ ] **H2-03** Consolidate demo claims: merge 7 demo seed files → 1 `db/seed-demo-claims.sql`
- [ ] **H2-04** Consolidate delete scripts: merge 3 delete-demo-org versions → 1 `scripts/delete-demo-org.mjs`
- [ ] **H2-05** Create `db/seed-complete-demo.sql` — single file that seeds an entire realistic demo org:
  - [ ] **H2-05a** 1 organization with branding
  - [ ] **H2-05b** 3 team members (admin, manager, viewer)
  - [ ] **H2-05c** 5 claims at different lifecycle stages (new, inspection, estimate, approved, closed)
  - [ ] **H2-05d** Photos + AI results on 3 claims
  - [ ] **H2-05e** Weather data on 2 claims
  - [ ] **H2-05f** 1 generated report
  - [ ] **H2-05g** 5 tasks (mix of open, in-progress, completed)
  - [ ] **H2-05h** 3 message threads with replies
  - [ ] **H2-05i** 2 contacts with profiles
  - [ ] **H2-05j** 1 trade connection + work request
  - [ ] **H2-05k** Vendor list (top 20)
- [ ] **H2-06** Add `"seed:demo"` script to `package.json` that runs the complete seed
- [ ] **H2-07** Test seed on local DB — verify demo flow works against seeded data
- [ ] **H2-08** Delete obsolete seed files (keep only canonical ones)
- [ ] **H2-09** Commit: `chore(H2): consolidate seed data — single canonical demo seed`

### H3 — Billing: Exit Beta Mode

- [ ] **H3-01** Audit `src/lib/guard.ts` — understand BETA_MODE flag and `assertPaidAccess()` logic
- [ ] **H3-02** Audit `src/lib/acl.ts` — understand hardcoded `userRole()` and `userPlan()` stubs
- [ ] **H3-03** Wire `userPlan()` to real org subscription data from Prisma `BillingSettings` model
- [ ] **H3-04** Wire `userRole()` to real Clerk membership role data
- [ ] **H3-05** Define tier gates: what Solo gets vs Business vs Enterprise
  - [ ] **H3-05a** Solo: 1 seat, 5 claims/mo, basic reports
  - [ ] **H3-05b** Business: 1-10 seats, unlimited claims, all reports, AI tools
  - [ ] **H3-05c** Enterprise: 10+ seats, custom, API access, SSO
- [ ] **H3-06** Implement `assertPaidAccess()` for real — check actual subscription status
- [ ] **H3-07** Add graceful upgrade prompts when free users hit gates (not hard blocks)
- [ ] **H3-08** Verify `src/lib/billing/seat-pricing.ts` is the SSOT — $80/seat
- [ ] **H3-09** Remove deprecated token system: audit `auto-refill` route, `getTokenBalance()` returning 999999
- [ ] **H3-10** Fix `settings/subscription/page.tsx` line 38 — read plan name from Org model instead of hardcode
- [ ] **H3-11** Verify Stripe webhook handler processes all events correctly:
  - [ ] **H3-11a** `checkout.session.completed`
  - [ ] **H3-11b** `customer.subscription.updated`
  - [ ] **H3-11c** `customer.subscription.deleted`
  - [ ] **H3-11d** `invoice.payment_succeeded`
  - [ ] **H3-11e** `invoice.payment_failed`
- [ ] **H3-12** Test full billing flow: free → checkout → paid → manage → cancel
- [ ] **H3-13** Commit: `feat(H3): exit billing beta — wire real subscription gates`

### H4 — Onboarding Polish

- [ ] **H4-01** Resolve `/onboarding` vs `/getting-started` ambiguity — pick ONE canonical entry
- [ ] **H4-02** Redirect the non-canonical route to the canonical one
- [ ] **H4-03** Verify 10-step onboarding funnel tracks correctly:
  - [ ] **H4-03a** Step 1: signup → org_created
  - [ ] **H4-03b** Step 2: org_created → company_info
  - [ ] **H4-03c** Step 3: company_info → branding_configured
  - [ ] **H4-03d** Step 4: branding_configured → team_invited
  - [ ] **H4-03e** Step 5: team_invited → first_login
  - [ ] **H4-03f** Step 6: first_login → first_claim
  - [ ] **H4-03g** Step 7: first_claim → first_upload
  - [ ] **H4-03h** Step 8: first_upload → first_report
  - [ ] **H4-03i** Step 9: first_report → activated
- [ ] **H4-04** Add "skip" option on non-critical steps (branding, team invite)
- [ ] **H4-05** Verify getting-started checklist shows progress accurately
- [ ] **H4-06** Add `auto-onboard` page.tsx if missing (route dir exists, page doesn't)
- [ ] **H4-07** Verify onboarding overlay dismisses properly and doesn't re-show
- [ ] **H4-08** Test onboarding end-to-end: sign-up → activated (all 10 steps)
- [ ] **H4-09** Commit: `feat(H4): onboarding polish — canonical entry, funnel verification`

### H5 — Error Confidence Layer

- [ ] **H5-01** Add missing `error.tsx` to `src/app/(app)/ai-video-reports/`
- [ ] **H5-02** Add missing `error.tsx` to `src/app/(app)/auto-onboard/`
- [ ] **H5-03** Add missing `error.tsx` to `src/app/(app)/weather-report/`
- [ ] **H5-04** Add missing `error.tsx` to `src/app/portal/feed/`
- [ ] **H5-05** Add missing `error.tsx` to `src/app/portal/profiles/`
- [ ] **H5-06** Add missing `error.tsx` to `src/app/portal/projects/`
- [ ] **H5-07** Add `not-found.tsx` to `src/app/(app)/claims/[claimId]/` (branded 404 for invalid claim IDs)
- [ ] **H5-08** Add `not-found.tsx` to `src/app/(app)/contacts/[contactId]/` if dynamic route exists
- [ ] **H5-09** Add `not-found.tsx` to `src/app/(app)/trades/[tradeId]/` if dynamic route exists
- [ ] **H5-10** Add `not-found.tsx` to `src/app/portal/jobs/[jobId]/` (portal branded 404)
- [ ] **H5-11** Add `not-found.tsx` to `src/app/portal/claims/[claimId]/` (portal branded 404)
- [ ] **H5-12** Add missing `loading.tsx` to 12 portal subdirs that lack them:
  - [ ] **H5-12a** `/portal/claims`
  - [ ] **H5-12b** `/portal/contractors`
  - [ ] **H5-12c** `/portal/documents`
  - [ ] **H5-12d** `/portal/feed`
  - [ ] **H5-12e** `/portal/invite/[token]`
  - [ ] **H5-12f** `/portal/jobs`
  - [ ] **H5-12g** `/portal/messages`
  - [ ] **H5-12h** `/portal/network`
  - [ ] **H5-12i** `/portal/onboarding`
  - [ ] **H5-12j** `/portal/profiles`
  - [ ] **H5-12k** `/portal/projects`
  - [ ] **H5-12l** `/portal/settings`
- [ ] **H5-13** Verify all error boundaries have:
  - [ ] **H5-13a** Friendly message (not stack trace)
  - [ ] **H5-13b** "Try Again" retry button
  - [ ] **H5-13c** "Go to Dashboard" escape hatch
  - [ ] **H5-13d** "Contact Support" link
- [ ] **H5-14** Resolve possible portal error boundary duplicate: `portal-error-boundary.tsx` vs `PortalErrorBoundary.tsx`
- [ ] **H5-15** Commit: `feat(H5): complete error.tsx, loading.tsx, not-found.tsx coverage`

### H6 — Positioning + Pitch Materials

- [ ] **H6-01** Write 1-page product positioning doc:
  - [ ] **H6-01a** Problem statement (what contractors suffer today)
  - [ ] **H6-01b** Solution (what SkaiScraper does)
  - [ ] **H6-01c** Key differentiators (AI damage detection, weather integration, full lifecycle)
  - [ ] **H6-01d** Target customer profile (storm restoration contractors, 3-50 person shops)
- [ ] **H6-02** Write ROI calculator:
  - [ ] **H6-02a** Average claim value
  - [ ] **H6-02b** Time saved per claim with SkaiScraper
  - [ ] **H6-02c** Close rate improvement
  - [ ] **H6-02d** Break-even: "close 1 extra claim = pays for the software for the year"
- [ ] **H6-03** Write 3 pricing tiers (landing page ready):
  - [ ] **H6-03a** Solo: $80/mo — 1 seat, 5 active claims, basic reports
  - [ ] **H6-03b** Business: $80/seat/mo — unlimited claims, all AI tools, trades network
  - [ ] **H6-03c** Enterprise: Custom — SSO, API, dedicated support
- [ ] **H6-04** Update marketing pricing page with real tiers
- [ ] **H6-05** Write 5 case study outlines (even if fictional/composite):
  - [ ] **H6-05a** "Solo roofer closes 3x more claims"
  - [ ] **H6-05b** "5-person crew saves 10 hours/week on paperwork"
  - [ ] **H6-05c** "Weather data catches carrier denials"
  - [ ] **H6-05d** "Client portal reduces phone calls 60%"
  - [ ] **H6-05e** "Trades network fills crew gaps in 24 hours"
- [ ] **H6-06** Commit: `docs(H6): positioning, ROI calculator, pricing tiers`

---

## Sprint 14 — Orphan Route Triage + Navigation Clarity (1-2 sessions)

> **Goal:** Every page either in nav, deep-linked, or explicitly gated/deleted  
> **Context:** 80 top-level pages NOT in navConfig (of 136 total)

### 14A — Discovery + Categorization

- [ ] **14A-01** Generate full orphan page inventory with file sizes and last-modified dates
- [ ] **14A-02** Categorize each orphan into one of 5 buckets:
  - **DAU-critical**: Must be in nav (billing, contacts, weather, etc.)
  - **Deep-link only**: Valid but only reachable from parent pages (claims/[id]/_, settings/_)
  - **Internal/dev-only**: dev tools, inspector, deployment, ops
  - **Redundant**: duplicates of pages already in nav under different paths
  - **Dead**: no inbound links, no purpose, safe to delete
- [ ] **14A-03** Build import graph for each dead candidate — verify 0 inbound links
- [ ] **14A-04** Document decisions in `ORPHAN_ROUTE_DECISIONS.md`

### 14B — Add Missing DAU Pages to Nav

- [ ] **14B-01** Add `billing` to navConfig (currently orphaned — redirects to settings/billing)
- [ ] **14B-02** Add `contacts` to navConfig if missing
- [ ] **14B-03** Add `weather` to navConfig if missing
- [ ] **14B-04** Add `evidence` to navConfig if missing
- [ ] **14B-05** Add `search` to navConfig if missing
- [ ] **14B-06** Review remaining 75 orphans and add any other DAU-critical pages
- [ ] **14B-07** Commit: `feat(14B): add missing DAU pages to navConfig`

### 14C — Gate Internal-Only Pages

- [ ] **14C-01** Identify all internal/dev-only pages (deployment, go-no-go, inspector, ops, etc.)
- [ ] **14C-02** Add admin role check to internal pages: `requireRole("ADMIN")`
- [ ] **14C-03** Add `[INTERNAL]` or `[DEV]` visual indicator on internal pages
- [ ] **14C-04** Optionally: move internal pages behind a feature flag
- [ ] **14C-05** Commit: `feat(14C): gate internal pages behind admin role`

### 14D — Delete Dead Orphans

- [ ] **14D-01** Delete confirmed dead pages (verified 0 inbound links)
- [ ] **14D-02** Delete associated components that become orphaned after page deletion
- [ ] **14D-03** Run `knip` to find any newly orphaned exports
- [ ] **14D-04** Run typecheck to verify no broken imports
- [ ] **14D-05** Commit: `chore(14D): delete dead orphan pages`

### 14E — Sprint 14 Ship Gate

- [ ] **14E-01** Full `pnpm typecheck`
- [ ] **14E-02** Full `pnpm test:unit`
- [ ] **14E-03** Full `npm run lint:ship`
- [ ] **14E-04** Verify nav renders correctly on desktop + mobile
- [ ] **14E-05** Push to origin

---

# ═══════════════════════════════════════════════════════

# PHASE 3 — SCALE (Sprints 13, 17)

# "Long-term code health — do AFTER first sales"

# ═══════════════════════════════════════════════════════

---

## Sprint 13 — Unused Vars + Type Safety Core (2-3 sessions)

> **Goal:** Eliminate 1,007 unused vars + fix critical React bugs  
> **Exit gate:** Full-repo errors < 3,500

### 13A — Critical Correctness Bugs (6 errors → P0)

- [ ] **13A-01** Fix 4 `react-hooks/rules-of-hooks` violations — these are REAL BUGS:
  - [ ] **13A-01a** Find all 4 files with rules-of-hooks errors
  - [ ] **13A-01b** Fix conditional hook calls / hooks inside loops
  - [ ] **13A-01c** Verify components render correctly after fix
  - [ ] **13A-01d** Add regression tests if possible
- [ ] **13A-02** Fix 1 `@typescript-eslint/no-floating-promises` — unhandled promise rejection
- [ ] **13A-03** Fix 1 `@next/next/no-assign-module-variable` — build risk
- [ ] **13A-04** Commit: `fix(13A): fix 6 critical lint bugs — hooks, promises, module`

### 13B — Unused Variables (1,007 errors)

- [ ] **13B-01** Batch 1: Fix unused vars in `src/lib/**` (~100 files)
  - [ ] **13B-01a** Prefix unused parameters with `_`
  - [ ] **13B-01b** Remove unused imports
  - [ ] **13B-01c** Remove unused local variables
- [ ] **13B-02** Batch 2: Fix unused vars in `src/components/**` (~150 files)
- [ ] **13B-03** Batch 3: Fix unused vars in `src/app/api/**` (~200 files)
- [ ] **13B-04** Batch 4: Fix unused vars in `src/app/(app)/**` (~200 files)
- [ ] **13B-05** Batch 5: Fix unused vars in remaining `src/**`
- [ ] **13B-06** Run typecheck after each batch
- [ ] **13B-07** Commit per batch: `chore(13B-N): fix unused vars in <directory>`

### 13C — React Hooks Exhaustive Deps (84 warnings)

- [ ] **13C-01** Audit all 84 `react-hooks/exhaustive-deps` warnings
- [ ] **13C-02** Categorize: real missing deps vs intentional omissions
- [ ] **13C-03** Fix real missing deps (add to dependency array)
- [ ] **13C-04** Add `// eslint-disable-next-line` with reason for intentional omissions
- [ ] **13C-05** Commit: `fix(13C): fix 84 exhaustive-deps warnings`

### 13D — Begin `no-explicit-any` Reduction (target: -200)

- [ ] **13D-01** Fix `any` types in `src/lib/**` (~200 of 2,281)
- [ ] **13D-02** Focus on exported function signatures first (public API surface)
- [ ] **13D-03** Use `unknown` + type guards for genuinely dynamic data
- [ ] **13D-04** Use specific types for API responses (Prisma types, Zod inferred types)
- [ ] **13D-05** Commit: `chore(13D): replace any with proper types in src/lib`

### 13E — Sprint 13 Ship Gate

- [ ] **13E-01** Full `pnpm typecheck`
- [ ] **13E-02** Full `pnpm test:unit`
- [ ] **13E-03** Verify error count dropped below 3,500
- [ ] **13E-04** Push to origin

---

## Sprint 17 — Final Lint Reduction + Ship Candidate (2-3 sessions)

> **Goal:** Get `lint:full` under 1,000 errors → declare FINAL SHIP CANDIDATE  
> **Exit gate:** `lint:full` < 1,000 errors, `lint:ship` covers 80%+ of code

### 17A — `no-restricted-syntax` Bulk Fix (761 errors)

- [ ] **17A-01** Audit all 761 `no-restricted-syntax` violations (mostly `process.env` direct access)
- [ ] **17A-02** Categorize: should use `@/lib/config` vs legitimate exemptions
- [ ] **17A-03** Batch-fix files that should import from config
- [ ] **17A-04** Add eslint-disable for legitimate runtime env access (middleware, edge)
- [ ] **17A-05** Commit: `chore(17A): fix no-restricted-syntax — centralize env access`

### 17B — `no-restricted-imports` Fix (286 errors)

- [ ] **17B-01** Audit all 286 `no-restricted-imports` violations
- [ ] **17B-02** Fix incorrect import paths (likely `new PrismaClient()` or direct `OpenAI` imports)
- [ ] **17B-03** Redirect to singleton patterns: `@/lib/prisma`, `@/lib/ai`
- [ ] **17B-04** Commit: `chore(17B): fix restricted imports — use singletons`

### 17C — Continue `no-explicit-any` (target: another -500)

- [ ] **17C-01** Fix `any` types in `src/app/api/**` (~300 files)
- [ ] **17C-02** Fix `any` types in `src/components/**` (~200 files)
- [ ] **17C-03** Focus on Prisma query return types — leverage generated types
- [ ] **17C-04** Focus on API route request/response typing
- [ ] **17C-05** Commit per batch: `chore(17C-N): type-safe <directory>`

### 17D — `@next/next/no-img-element` (166 warnings)

- [ ] **17D-01** Replace `<img>` with `next/image` `<Image>` in all 166 locations
- [ ] **17D-02** Add proper `width`, `height`, or `fill` props
- [ ] **17D-03** Add `alt` text for 25 `jsx-a11y/alt-text` warnings
- [ ] **17D-04** Commit: `fix(17D): migrate img to next/image + add alt text`

### 17E — `await-thenable` (200 errors)

- [ ] **17E-01** Audit all 200 `@typescript-eslint/await-thenable` errors
- [ ] **17E-02** Remove `await` from non-Promise expressions
- [ ] **17E-03** Or add proper return types to functions that should be async
- [ ] **17E-04** Commit: `fix(17E): remove incorrect await usage`

### 17F — Expand `lint:ship` to Cover 80%+

- [ ] **17F-01** Add `src/app/api/**` to `lint:ship` scope
- [ ] **17F-02** Add `src/components/**` to `lint:ship` scope
- [ ] **17F-03** Measure: what % of `src/` files are now covered by `lint:ship`?
- [ ] **17F-04** Target: `lint:ship` = `lint:full` (merge them into one)
- [ ] **17F-05** Commit: `chore(17F): lint:ship now covers full src/`

### 17G — Sprint 17 Ship Gate — FINAL

- [ ] **17G-01** Full `pnpm typecheck`
- [ ] **17G-02** Full `pnpm test:unit`
- [ ] **17G-03** Full `npm run lint:ship` (now = lint:full)
- [ ] **17G-04** Verify `< 1,000` total errors
- [ ] **17G-05** Run `knip` for dead export scan
- [ ] **17G-06** Run production DAU checklist one more time
- [ ] **17G-07** Push to origin
- [ ] **17G-08** Tag release: `v1.0.0-rc1`

---

# ═══════════════════════════════════════════════════════

# SCOREBOARD — Track Progress Here

# ═══════════════════════════════════════════════════════

## Phase 1 — Stabilize

| Sprint                | Status         | Errors Before | Errors After | Key Metric           |
| --------------------- | -------------- | ------------- | ------------ | -------------------- |
| 12 — Auto-Fix         | ⬜ Not started | 4,799         | ~4,350       | –450 errors          |
| 15 — TradesConnection | ⬜ Not started | —             | —            | 0 `as any` on trades |
| 16 — Sentry + DAU     | ⬜ Not started | —             | —            | 15 flows verified    |

## Phase 2 — Sell

| Lane                   | Status         | Key Metric                   |
| ---------------------- | -------------- | ---------------------------- |
| H1 — Demo Flow         | ⬜ Not started | 5-min demo script tested     |
| H2 — Seed Data         | ⬜ Not started | 1 canonical seed file        |
| H3 — Billing Exit Beta | ⬜ Not started | Real subscription gates      |
| H4 — Onboarding Polish | ⬜ Not started | 10-step funnel verified      |
| H5 — Error Confidence  | ⬜ Not started | 100% error.tsx + loading.tsx |
| H6 — Positioning       | ⬜ Not started | Pricing + ROI doc            |
| 14 — Orphan Triage     | ⬜ Not started | 80 orphans resolved          |

## Phase 3 — Scale

| Sprint                   | Status         | Errors Before | Errors After | Key Metric           |
| ------------------------ | -------------- | ------------- | ------------ | -------------------- |
| 13 — Unused Vars + Types | ⬜ Not started | ~4,350        | ~3,150       | –1,200 errors        |
| 17 — Final Lint + Ship   | ⬜ Not started | ~3,150        | < 1,000      | FINAL SHIP CANDIDATE |

---

## Total Item Count: 251

| Phase     | Sprint/Lane           | Items   |
| --------- | --------------------- | ------- |
| Phase 1   | Sprint 12             | 22      |
| Phase 1   | Sprint 15             | 16      |
| Phase 1   | Sprint 16             | 21      |
| Phase 2   | Lane H1 (Demo)        | 14      |
| Phase 2   | Lane H2 (Seed)        | 20      |
| Phase 2   | Lane H3 (Billing)     | 22      |
| Phase 2   | Lane H4 (Onboarding)  | 11      |
| Phase 2   | Lane H5 (Errors)      | 26      |
| Phase 2   | Lane H6 (Positioning) | 12      |
| Phase 2   | Sprint 14 (Orphans)   | 20      |
| Phase 3   | Sprint 13             | 20      |
| Phase 3   | Sprint 17             | 27      |
| **TOTAL** |                       | **251** |

---

## Priority Execution Order

If time is short, do these 4 moves first:

1. **Sprint 12** — 1 hour, instant error reduction
2. **Sprint 16B** — DAU production checklist (proves the product works)
3. **Lane H1** — Demo flow (proves you can sell it)
4. **Lane H3** — Exit billing beta (proves people can pay)

Everything else is important but won't block a first customer from signing up and paying.

---

> **North Star:** The codebase doesn't need to be perfect.  
> It needs to be **good enough that nothing breaks in front of a customer**  
> and **clear enough that you can demo it with confidence.**  
> You are 4 sprints away from that.

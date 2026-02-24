# SkaiScraper — Master QA Findings & Fixes Log

**Last Updated:** February 24, 2026
**Sprints Covered:** 22 → 23 → 24

---

## Sprint 22 — Commit `76ab258`

| # | Finding | Severity | Root Cause | Fix | Status |
|---|---|---|---|---|---|
| 1 | **Financial tab: "Claims Unavailable"** | P1 | API route returned wrong shape — missing `findings`, `recommendations`, `confidence` fields that `FinancialAnalysisResult` type requires | Rewrote `/api/intel/financial/route.ts` to return correct shape with all required fields | ✅ FIXED, verified Sprint 23 |
| 2 | **Claims Tracker: "Claim not found"** | P1 | `contacts` field could be `null` from Prisma but code assumed `Contact[]` — `.map()` on null crashed | Added `?? []` fallback for contacts array in tracker page | ✅ FIXED, verified Sprint 23 |

---

## Sprint 23 — Commit `3936c86`

| # | Finding | Severity | Root Cause | Fix | Status |
|---|---|---|---|---|---|
| 3 | **Permit edit not persisting** (QA 7.3) | P1 | Next.js 14 Router Cache (30s TTL) served stale RSC payload after PATCH — navigating back showed old data | Added `router.refresh()` after successful save in `/permits/[id]/page.tsx` | ✅ FIXED, verified Sprint 24 |
| 4 | **Proposals → "Pro Login" redirect** (QA 8.6) | P1 | Used `auth().orgId` which is **always null** in this app (Clerk orgId not used — app uses custom `safeOrgContext()`) | Replaced `auth()` with `safeOrgContext()` in `/proposals/page.tsx` | ✅ FIXED, verified Sprint 24 |
| 5 | **6 export pages → sign-in redirect** | P1 | Same `auth().orgId` bug as #4, in 6 additional export/template pages | Replaced `auth()` with `safeOrgContext()` in all 6 pages | ✅ FIXED, verified Sprint 24 |

**Systemic pattern identified:** Any server component using `const { orgId } = await auth()` and checking `if (!orgId)` will ALWAYS fail because Clerk's orgId is null in this app. Must use `safeOrgContext()` instead.

---

## Sprint 24 — Commit `c93b8d6`

| # | Finding | Severity | Root Cause | Fix | Status |
|---|---|---|---|---|---|
| 6 | **Depreciation page: "App Error: Something went wrong"** (QA 9.7) | P1 | React Rules of Hooks violation — second `useEffect` for claims fetch was placed AFTER conditional `if (!isLoaded) return` early exit, causing hook count mismatch across renders | Moved the `useEffect` above the conditional return; added `if (!isLoaded \|\| !isSignedIn) return;` guard inside the effect body | ✅ FIXED, awaiting QA verification |
| 7 | **Claims Analysis: JSON parse error "Unexpected token '<'"** (QA 11.3) | P1 | `fetch()` to `/api/agents/claims-analysis` sometimes receives an HTML redirect (302 → login page) instead of JSON. Code had `content-type` guard but did not check `response.redirected` | Added `response.redirected` check before JSON parse; improved error messages; typed catch clause | ✅ FIXED, awaiting QA verification |
| 8 | **Root `/` shows marketing page for logged-in users** (QA 15.3) | P2 | Middleware had no redirect rule for `/` → `/dashboard` when user is authenticated | Added `if (pathname === "/" && userId)` redirect before `isPublicRoute` early return in `middleware.ts` | ✅ FIXED, awaiting QA verification |
| 9 | **Map view: "Map Unavailable"** (QA 13.2) | P2 | Missing `NEXT_PUBLIC_MAPBOX_TOKEN` env var in Vercel deployment. Code showed raw developer error. | Replaced developer-facing `EmptyState` error with user-friendly "Map Coming Soon" card. Real fix: set env var in Vercel dashboard. | ✅ CODE FIXED, needs Vercel env var |
| 10 | **Billing → 404** (QA 16.2) | P2 | `/billing/` directory had `layout.tsx`, `error.tsx`, `loading.tsx` but NO `page.tsx` | Created `billing/page.tsx` that redirects to `/settings/billing` where actual billing UI exists | ✅ FIXED, awaiting QA verification |

---

## Patterns & Systemic Issues

### 🔴 Pattern 1: `auth().orgId` is ALWAYS null
- **Scope:** Any server component using Clerk's `auth().orgId`
- **Impact:** Page redirects to sign-in even when user is logged in
- **Fix:** Replace with `safeOrgContext()` from `@/lib/safeOrgContext`
- **Pages fixed so far:** proposals, 6 export pages, reports/templates/new
- **Action:** Audit remaining server components for this pattern

### 🟡 Pattern 2: React hooks after conditional returns
- **Scope:** Client components with `useUser()` + early return
- **Impact:** "App Error: Something went wrong" crash
- **Fix:** Move ALL hooks (useState, useEffect, etc.) BEFORE any conditional return
- **Pages fixed:** depreciation
- **Action:** Audit remaining client components for hook ordering

### 🟡 Pattern 3: Missing `response.redirected` guard on fetch
- **Scope:** Any client-side `fetch()` to internal API routes
- **Impact:** JSON parse error when middleware intercepts and returns HTML redirect
- **Fix:** Check `response.redirected` before `response.json()`
- **Pages fixed:** claims-analysis
- **Action:** Audit other pages with client-side API fetches

### 🟡 Pattern 4: Next.js Router Cache staleness
- **Scope:** Client components that mutate data (PATCH/POST) then navigate back
- **Impact:** User sees old data after saving
- **Fix:** Call `router.refresh()` after successful mutation
- **Pages fixed:** permits/[id]
- **Action:** Audit other edit/save flows

---

## Deployment / Infra Items

| Item | Status | Owner |
|---|---|---|
| Set `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel env vars | ⬜ TODO | DevOps |
| Verify all Vercel env vars match `.env.local` | ⬜ TODO | DevOps |

---

## QA Verification Matrix

| Fix # | Finding | Sprint Fixed | Sprint Verified | Final Status |
|---|---|---|---|---|
| 1 | Financial tab shape | 22 | 23 ✅ | CLOSED |
| 2 | Tracker contacts null | 22 | 23 ✅ | CLOSED |
| 3 | Permit edit stale | 23 | 24 ✅ | CLOSED |
| 4 | Proposals auth redirect | 23 | 24 ✅ | CLOSED |
| 5 | 6 export auth redirects | 23 | 24 ✅ | CLOSED |
| 6 | Depreciation hooks crash | 24 | 25 ❓ | AWAITING |
| 7 | Claims analysis JSON | 24 | 25 ❓ | AWAITING |
| 8 | Root redirect | 24 | 25 ❓ | AWAITING |
| 9 | Map view error | 24 | 25 ❓ | AWAITING (+ env var) |
| 10 | Billing 404 | 24 | 25 ❓ | AWAITING |

---

## Cumulative Stats

- **Total findings across 3 sprints:** 10
- **Closed & verified:** 5
- **Fixed, awaiting verification:** 5
- **Systemic patterns identified:** 4
- **Infra items:** 2

# MASTER COMPREHENSIVE TODO — SkaiScraper Release Gate

> Generated: 2026-04-17 | Branch: `main` | Commit: `52aa9998`  
> Codebase: 3,492 TS/TSX files | 687 API routes | 497 pages | 243 Prisma models

---

## COMPLETED THIS SESSION ✅

### 1. AI Damage Analyzer — Only Detecting 2 Hits

- **Root cause:** Hallucination detection in `/api/ai/photo-annotate` triggered "cookie-cutter" pattern for hail impacts (all similar-sized boxes), then `sorted.slice(0, 2)` kept only 2
- **Fix (commit `3cfaaa53`):**
  - Cookie-cutter pattern alone no longer triggers hallucination for hail/storm claims
  - Requires 2+ independent signals before declaring hallucination
  - Keeps top 10 detections instead of 2 when hallucination IS detected

### 2. "Yellow Box" / Random Text on Annotate Tab

- **Root cause:** JS comment `// eslint-disable-next-line` inside JSX renders as literal visible text
- **Fix (commit `3cfaaa53`):** Converted to proper `{/* */}` JSX comment in PhotoOverlay.tsx

### 3. Same Bug Pattern — 29 More Instances Across 23 Components

- **Root cause:** Identical JS-comment-in-JSX bug in 23 files
- **Fix (commit `52aa9998`):** Automated fix across all 23 components. Zero remaining.
- **Affected:** VendorLogo, BrandPreview, BrandingUpload, CompanyBrandingPreview, LogosTab, TeamLibraryTab, TradesFeed, UniversalContactCard, ContactDetailModal, DamageReportPreview, ClaimPhotoUploadWithAnalysis, VisionAnalyzerPanel, CoverPageCanvas, ImageLibraryCard, CompanyLeaderboard, TeamMemberPublicCard, PhotoAnnotator, PhotoUploadWidget, PhotoDetailModal, PhotoGallery, ClientOnboardingWizard, AnnotatedPhotoGallery, ClientPhotosPanel

### 4. Previous Session Fixes

- **RBAC root cause** — `getDelegate("teamMember")` crash (commit `fe32f8dc`)
- **Claims widgets bigger** (commit `fe32f8dc`)
- **Native camera viewfinder** with getUserMedia + measurement overlay (commit `531b29fa`)

---

## P0 — BLOCKING RELEASE 🔴

### P0-1: Raw Role `===` Comparisons (RBAC Violations)

**Risk: Users falsely blocked or granted wrong access**

The codebase still has raw `role === "admin"` comparisons that will fail for `"OWNER"`, `"Admin"`, `"ADMIN"` etc. These MUST use `isAdminRole()` / `roleEquals()` / `isManagerOrAbove()` from `src/lib/auth/roleCompare.ts`.

Known dangerous locations:

- `src/app/(app)/trades/company/employees/page.tsx:91` — `e.role === "admin" || e.role === "owner"`
- `src/app/(app)/trades/company/employees/page.tsx:117` — `e.role === "manager"`
- `src/app/(app)/trades/company/employees/page.tsx:391,634` — `employee.role === "owner"`
- `src/app/(app)/team/member/[memberId]/page.tsx:191-193` — `member.role === "ADMIN"` / `"MANAGER"`
- `src/app/(app)/teams/CompanySeatsClient.tsx:440,985` — `member.role === "Admin" || member.role === "admin"`
- `src/app/(app)/teams/TeamsClient.tsx:82,159,161` — raw role checks
- `src/app/(app)/settings/team/page.tsx:125` — `member.role === "admin"`

**Action:** Replace all with `isAdminRole()`, `isManagerOrAbove()`, `roleEquals()` imports.

### P0-2: Tenant Isolation Audit

**Risk: Cross-org data leakage**

Every Prisma query on tenant-scoped models MUST include `orgId`. Need automated scan of:

- All `prisma.claim.findFirst/findUnique/findMany` without `orgId`
- All `prisma.report.*` without `orgId`
- All `prisma.client.*` without `orgId`
- All `prisma.job.*` without `orgId`
- All `prisma.invoice.*` / `prisma.estimate.*` without `orgId`

**Action:** Run `scripts/audit-tenant-isolation.ts` and fix any violations.

### P0-3: Error Handling — `NEXT_REDIRECT` Swallowed in try/catch

**Risk: Navigation broken silently**

Next.js throws `NEXT_REDIRECT` internally for `redirect()`. If caught by a try/catch, the redirect silently fails and the page appears blank or stuck.

**Action:** Grep for `redirect(` inside try/catch blocks and ensure they re-throw `NEXT_REDIRECT`.

---

## P1 — HIGH PRIORITY (Pre-Manual-Test) 🟡

### P1-1: 4,653 eslint-disable Comments

**Risk: Hiding real bugs (we just found 30 that were causing visible UI bugs)**

Not all are dangerous — most are `@typescript-eslint/no-explicit-any` or `no-unused-vars` which are messy but not functional. The dangerous categories are:

- `react/jsx-no-comment-textnodes` — **FIXED** (0 remaining)
- `@next/next/no-img-element` — cosmetic (perf only, not broken)
- `react-hooks/exhaustive-deps` — **can cause stale data** — needs audit
- `no-restricted-syntax` — project-specific, usually safe

**Action:** Audit `react-hooks/exhaustive-deps` disables — each one could be a stale closure bug.

### P1-2: Build Warnings (17K+ Reported)

**Will these cause failures?** Mostly NO for functional behavior. The 17K warnings are likely:

1. **ESLint warnings** (~4,653 disables means thousands more not disabled)
2. **TypeScript `any` usage** — won't crash but reduces type safety
3. **Unused imports/variables** — dead code, no functional impact
4. **Next.js Image optimization** warnings — perf impact, not functional

**Functional risk from warnings:** LOW. The one class that WAS causing issues (jsx-no-comment-textnodes) is now fixed.

**Action:** Run `pnpm build 2>&1 | grep -c "warning"` to get actual build warning count.

### P1-3: File-Level eslint-disable Blankets

Files with `/* eslint-disable */` at the top suppress ALL warnings. These are the riskiest:

- Files disabling `react/jsx-no-comment-textnodes` at file level (still have unfixed inline comments)
- Files disabling `no-restricted-syntax` (may bypass singleton checks)

**Action:** Grep for `/* eslint-disable react/jsx-no-comment-textnodes` files and check for remaining `//` comments inside JSX.

### P1-4: Stale React Hooks (exhaustive-deps violations)

**Risk: UI showing outdated data, infinite re-renders, or missing updates**

```bash
grep -rn "exhaustive-deps" src/ --include="*.tsx" --include="*.ts" | wc -l
```

**Action:** Audit each `exhaustive-deps` disable. Common bugs: stale state in event handlers, missing refetch on dep change.

### P1-5: Portal Authentication Separation

**Risk: Portal users accessing pro dashboard or vice versa**

Portal uses `clientId` not Clerk `userId`. Verify:

- `/portal/*` routes check `clientId` not `userId`
- No portal route accidentally uses `withAuth` (pro auth)
- Middleware correctly routes portal vs pro

### P1-6: Invite Flow End-to-End

**Risk: Invited users land in broken state**

Verify all invite types actually work:

- Team member invite → correct org + role
- Client portal invite → correct client record
- Trades company invite → correct company
- Seat assignment on accept

---

## P2 — MEDIUM PRIORITY (Polish) 🟢

### P2-1: Dead Code / Legacy Files

The codebase has legacy files that are no longer imported:

- `src/lib/rbac.ts` — System A (deleted but may have been recreated)
- `src/lib/permissions/legacy.ts` — must not exist
- Legacy map components in `src/components/maps/legacy/`

**Action:** Run `knip` (configured in `knip.json`) to find unused exports/files.

### P2-2: Large File Complexity

Files over 1000 lines are hard to maintain and likely have bugs:

- `src/app/api/ai/photo-annotate/route.ts` — 2,503 lines
- `src/app/(app)/claims/[claimId]/photos/page.tsx` — 1,849 lines
- `src/components/annotations/PhotoAnnotator.tsx` — 1,357 lines

**Action:** Not blocking release but flag for future refactor.

### P2-3: Console Errors During Normal Flow

**Action:** Open DevTools, navigate through all P0 pages, log any console errors.

### P2-4: Mobile Layout Integrity

- Sidebar collapse on mobile
- Touch targets for buttons
- Camera permissions flow
- Gallery upload on iOS/Android

### P2-5: Rate Limiting Configuration

AI endpoints should use `ai` preset (5/min). Verify:

- `/api/ai/damage/analyze` — rate limited?
- `/api/ai/photo-annotate` — rate limited?
- `/api/ai/report/*` — rate limited?

---

## MANUAL TEST CHECKLIST

### Phase 1: Smoke (20 min)

```
[ ] Login as admin → dashboard loads
[ ] Refresh → session persists
[ ] Open Clients page
[ ] Open Claims page
[ ] Open Financial Overview
[ ] Open Reports / Weather
[ ] Open Estimates
[ ] Open Team/Invites
```

### Phase 2: RBAC Matrix (15 min)

```
[ ] Admin: can view admin pages, financials, send invites
[ ] Manager: sees operational pages, NOT admin financial controls
[ ] Member: limited to own claims, cannot enter admin pages
[ ] Portal: only portal-safe data, cannot navigate to /app/*
```

### Phase 3: Core CRUD (30 min)

```
[ ] Create client → appears in list
[ ] Edit client → changes persist
[ ] Search client → correct results
[ ] Create claim → appears in list
[ ] Open claim → detail loads
[ ] Update claim status → reflects everywhere
[ ] Create estimate → line items calculate correctly
[ ] Generate weather report → opens, downloads
[ ] Send invite → accept → user in correct org/role
[ ] Upload file → appears on record → download works
```

### Phase 4: Mobile/Field (15 min)

```
[ ] Open field mode on phone
[ ] Camera launches (rear default)
[ ] Take photo → saved
[ ] Flip camera works
[ ] Gallery upload works
[ ] Measurement mode works
[ ] Photo links to claim
```

### Phase 5: Error Handling (10 min)

```
[ ] Empty form submit → clear error, no crash
[ ] Invalid invite link → graceful message
[ ] Wrong role page → access denied, not white screen
[ ] AI tool empty input → handled
[ ] Cancel camera permission → handled
```

---

## GO / NO-GO CRITERIA

### GO ✅

- No auth/RBAC false failures
- No cross-tenant data leakage
- Clients/Claims/Financial/Reports/Estimates open and save
- Invites work end-to-end
- No white-screen crashes
- Production matches local on core flows

### NO-GO 🛑

- Any admin gets falsely blocked
- Wrong-role user sees restricted data
- Clients or Claims crashes
- Report generation fails
- Estimate save/load broken
- Invite acceptance broken
- Production differs from local on core flows

---

## PRIORITY EXECUTION ORDER

| Priority | Item                                     | Est. Time | Status               |
| -------- | ---------------------------------------- | --------- | -------------------- |
| ✅ Done  | AI damage analyzer 2-hit limit           | —         | Fixed                |
| ✅ Done  | Yellow box text rendering (30 instances) | —         | Fixed                |
| ✅ Done  | RBAC getDelegate crash                   | —         | Fixed (prev session) |
| ✅ Done  | Camera viewfinder + measurement          | —         | Fixed (prev session) |
| 🔴 P0-1  | Raw role `===` comparisons               | 30 min    | **TODO**             |
| 🔴 P0-2  | Tenant isolation scan                    | 20 min    | **TODO**             |
| 🔴 P0-3  | NEXT_REDIRECT swallowed                  | 15 min    | **TODO**             |
| 🟡 P1-1  | exhaustive-deps audit                    | 45 min    | **TODO**             |
| 🟡 P1-5  | Portal auth separation                   | 20 min    | **TODO**             |
| 🟡 P1-6  | Invite flow verify                       | 15 min    | **TODO**             |
| 🟢 P2-1  | Dead code cleanup (knip)                 | 30 min    | **TODO**             |
| 🟢 P2-3  | Console error audit                      | 20 min    | **Manual**           |
| 📋       | Full manual test pass                    | 90 min    | **Manual**           |

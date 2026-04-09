# MASTER UI/UX AUDIT & TODO — SkaiScraper Pro Dashboard

> Generated: 2026-04-09 | Scope: All 358 pages under `src/app/(app)/`  
> Reference implementation: **Commissions page** (`/commissions`) — only page with full design system adoption

---

## Executive Summary

| Metric                                                     | Value                                  |
| ---------------------------------------------------------- | -------------------------------------- |
| Total Pro Dashboard pages                                  | **358**                                |
| Sidebar nav items                                          | **55** (9 sections)                    |
| Topbar nav items                                           | **10**                                 |
| Orphaned pages (no nav link)                               | **~139** (39%)                         |
| Design system components defined                           | **70 UI primitives + 30 shared**       |
| Dead-code components (0 imports)                           | **12**                                 |
| Redundancy groups (same concept, multiple implementations) | **9**                                  |
| ESLint errors (full `src/`)                                | **5,117 errors + 17,992 warnings**     |
| ESLint `ignoreDuringBuilds`                                | ❌ Cannot flip — 5,117 errors block it |
| `loading.tsx` files                                        | **165** / 358 pages                    |
| `error.tsx` files                                          | **170** / 358 pages                    |

### Design System Adoption Scorecard

| Component                   | Quality    | Adoption                              | Target |
| --------------------------- | ---------- | ------------------------------------- | ------ |
| `PageHero`                  | ⭐⭐⭐⭐⭐ | **89%** (20+ pages)                   | 100%   |
| `PageContainer`             | ⭐⭐⭐⭐   | **~60%**                              | 100%   |
| `ErrorCard` (error.tsx)     | ⭐⭐⭐⭐⭐ | **~90%** (30+ boundaries)             | 100%   |
| `MetricCard` / `StatCard`   | ⭐⭐⭐⭐⭐ | **10%** (Commissions only of sampled) | 80%    |
| `ContentCard` / `DataTable` | ⭐⭐⭐⭐   | **10%** (Commissions only)            | 80%    |
| `EmptyState` + Presets      | ⭐⭐⭐⭐   | **~5%** (6 imports)                   | 90%    |
| `LoadingStates`             | ⭐⭐⭐⭐   | **<1%** (1 import)                    | 60%    |
| `ErrorStates`               | ⭐⭐⭐     | **<1%** (1 import)                    | 40%    |
| `Breadcrumbs`               | ⭐⭐⭐     | **0%** (dead code)                    | 50%    |
| `PageSkeleton`              | ⭐⭐⭐⭐   | **~50%** (in loading.tsx files)       | 90%    |

---

## SECTION 1 — NAVIGATION & INFORMATION ARCHITECTURE

### 1.1 — Sidebar ↔ Mobile Nav Sync Drift 🔴 P0

**Problem:** Comment in `AppSidebar.tsx` says "SYNCED" with `MobileNav`, but they're not.

**8 items in Sidebar but MISSING from Mobile:**

| Route                 | Sidebar Section      |
| --------------------- | -------------------- |
| `/analytics`          | Storm Command Center |
| `/tasks`              | Jobs & Field Ops     |
| `/maps/door-knocking` | Jobs & Field Ops     |
| `/hoa/notices`        | Documents            |
| `/contacts`           | Network              |
| `/invitations`        | Network              |
| `/teams/hierarchy`    | Company              |
| `/archive`            | Company              |

**1 item in Mobile but MISSING from Sidebar:**

| Route          | Mobile Section                                 |
| -------------- | ---------------------------------------------- |
| `/supplements` | Claims & Supplements (as "Supplement Tracker") |

**Section name mismatches:**

- Sidebar: "Reports" + "Documents" (separate) → Mobile: "Reports & Documents" (merged)
- Sidebar: "Network" + "Company" (separate) → Mobile: "Company & Network" (merged)

**TODO:**

- [ ] Sync `AppSidebar.tsx` and `MobileNav` to have identical items
- [ ] Decide on section grouping: keep Sidebar's 9-section model OR merge to Mobile's 6-section model
- [ ] Add missing routes to mobile nav

### 1.2 — Orphaned Pages (~139 pages with no nav entry) 🟡 P1

**Intentionally orphaned** (sub-pages, deep links, admin): ~80 pages  
**Likely should have nav entries** (~59):

| Category                | Routes                                                                                                                       | Action                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **CRM/Contacts**        | `/contacts`, `/contacts/[id]`, `/contacts/[id]/edit`, `/clients`, `/clients/[id]`, `/client-leads`, `/crm`, `/crm/pipelines` | Add "CRM" section to sidebar OR merge into Network |
| **Contracts/Estimates** | `/contracts`, `/contracts/[id]`, `/estimates`, `/estimates/new`                                                              | Add to "Build Tools" section                       |
| **Intelligence**        | `/intelligence/dashboard`, `/intelligence/[id]`, `/intelligence/tuning`, `/claimiq`                                          | Add "Intelligence" to sidebar                      |
| **Developer Tools**     | `/developers/api-docs`, `/developers/webhooks`                                                                               | Add to Settings                                    |
| **Tools**               | `/tools` (topbar links here but no sidebar entry)                                                                            | Add "Tools" to sidebar                             |
| **Help/Feedback**       | `/feedback`, `/help/knowledge-base`, `/support`                                                                              | Add to Company section                             |
| **Property Profiles**   | `/property-profiles`, `/property-profiles/[id]`, `/property-profiles/new`                                                    | Add to Jobs section                                |
| **Work Management**     | `/work-orders`, `/time-tracking`, `/operations`                                                                              | Add to Jobs section                                |
| **Search**              | `/search`                                                                                                                    | Add search icon/button to topbar (not sidebar)     |
| **Meetings/SMS**        | `/meetings`, `/sms`, `/inbox`                                                                                                | Add to Messages section                            |

**TODO:**

- [ ] Audit each orphaned page — flag as "keep", "redirect", or "delete"
- [ ] Add ~15-20 high-value orphans to sidebar nav
- [ ] Ensure every orphaned page that stays has a discoverable entry point (breadcrumb, back link, or parent page link)

### 1.3 — Claims Detail Hidden Routes 🔴 P0

**16 tabs visible in ClaimTabs**, but **14 additional routes exist with no tab link:**

| Route                  | Status                  | Action                             |
| ---------------------- | ----------------------- | ---------------------------------- |
| `/activity`            | Functional              | Add tab or merge into Timeline     |
| `/automation`          | Functional              | Add tab or link from Overview      |
| `/codes`               | Functional              | Add tab or merge into Documents    |
| `/completion`          | Functional              | Add tab or merge into Lifecycle    |
| `/edit`                | Functional              | Add tab or button on Overview      |
| `/evidence`            | Functional              | Merge with Photos                  |
| `/financial`           | Functional              | Add tab or merge into Final Payout |
| `/import`              | Functional              | Link from Documents                |
| `/report` (singular)   | Duplicate of `/reports` | Redirect to `/reports`             |
| `/supplement`          | Duplicate of `/scope`   | Redirect to `/scope`               |
| `/reports` (plural)    | Functional              | Check if different from `/report`  |
| `/artifacts/[id]/edit` | Deep link               | OK — leave as deep link            |
| `/artifacts/[id]/view` | Deep link               | OK — leave as deep link            |
| `/page.tsx` (root)     | Redirect                | Verify redirects to `/overview`    |

**TODO:**

- [ ] Add Activity, Automation, Codes, Completion, Edit, Evidence, Financial, Import to ClaimTabs or as sub-links
- [ ] Merge duplicate routes: `/report` → `/reports`, `/supplement` → `/scope`
- [ ] Add icons to ClaimTabs (16+ tabs need visual scanning aids)
- [ ] Add badge counts to Messages, Notes tabs
- [ ] Add ARIA `role="tablist"` to tab container

### 1.4 — No Breadcrumb Navigation 🟡 P1

Two breadcrumb components exist (`Breadcrumbs.tsx` + `breadcrumb.tsx`) with **0 imports anywhere**.

Deep routes like `/claims/[id]/weather`, `/reports/[id]/build`, `/settings/team` have no breadcrumb trail.

**TODO:**

- [ ] Choose one breadcrumb component (recommend shadcn `breadcrumb.tsx`)
- [ ] Delete the other (`Breadcrumbs.tsx`)
- [ ] Add breadcrumbs to: Claims detail layout, Settings pages, Reports detail, all `/[id]/` routes
- [ ] Wire breadcrumbs into `PageHero` as an optional prop

---

## SECTION 2 — DESIGN SYSTEM CONSISTENCY

### 2.1 — Three Competing Button Systems 🔴 P0

| System                | File                   | Variants                                                                                     | Adoption     |
| --------------------- | ---------------------- | -------------------------------------------------------------------------------------------- | ------------ |
| `Button` (shadcn/CVA) | `ui/button.tsx`        | default, primaryBubble, secondary, outline, ghost, destructive, success, warning, info, link | ✅ Wide      |
| `ActionButton`        | `ui/action-button.tsx` | primary, secondary, success, danger, purple, indigo, cyan, white, outline                    | ⚠️ Moderate  |
| Design tokens         | `ui/designSystem.ts`   | primaryBtn, secondaryBtn, outlineBtn (raw class strings)                                     | ❌ 0 imports |

**Plus:** Many pages use hardcoded button colors:

- Photos: `bg-red-600`, `bg-blue-600`, `bg-purple-600`
- Documents: `bg-violet-600`, `bg-purple-600`
- Carrier: `bg-indigo-600`
- Getting Started: inline colored buttons
- Hero CTAs: `bg-white text-teal-700` (custom, not a variant)

**TODO:**

- [ ] Add `loading` and `icon` props to `Button` component (match `ActionButton` features)
- [ ] Add a `hero` variant to `Button` for white-on-gradient CTAs
- [ ] Migrate all `ActionButton` usages to `Button`
- [ ] Delete `ActionButton` component
- [ ] Delete `designSystem.ts` button tokens
- [ ] Audit all hardcoded `bg-{color}-600` button classes → convert to `Button` variants
- [ ] Create a lint rule or code review checklist for button variant compliance

### 2.2 — Five Competing Card Wrappers 🟡 P1

| Component     | File                  | Style                                 | Adoption     |
| ------------- | --------------------- | ------------------------------------- | ------------ |
| `Card`        | `ui/card.tsx`         | shadcn base                           | ✅ Wide      |
| `ContentCard` | `ui/content-card.tsx` | Glass: `bg-white/80 backdrop-blur-xl` | ⚠️ 8 pages   |
| `ActionCard`  | `ui/action-card.tsx`  | Interactive with hover                | ❌ 2 imports |
| `CompactCard` | `ui/compact-card.tsx` | Dense layout                          | ❌ 0 imports |
| `BentoCard`   | `ui/bento-card.tsx`   | Magazine-style                        | ❌ 0 imports |

**TODO:**

- [ ] Keep `Card` (shadcn base) + `ContentCard` (glass variant)
- [ ] Delete `CompactCard` (0 imports), `BentoCard` (0 imports)
- [ ] Evaluate `ActionCard` — migrate 2 usages to `Card` with `onClick` or delete
- [ ] Standardize glass card pattern: `ContentCard` for data containers, `Card` for everything else

### 2.3 — MetricCard / StatCard Underadoption 🔴 P0

Design system `MetricCard` has 5 variants (default, gradient, solid, glass, outline) with trend badges and intent colors. **Only Commissions page uses it.**

**Pages that hand-roll stat cards:**

| Page             | Hand-rolled Pattern                          | Lines of Custom CSS |
| ---------------- | -------------------------------------------- | ------------------- |
| Claims           | 6-column gradient grid                       | ~60 lines           |
| Leads            | 3-column with colored icon circles           | ~40 lines           |
| Pipeline         | 3-column gradient search card                | ~45 lines           |
| Storm Center     | Inline `StatCard` function (name collision!) | ~45 lines           |
| Finance Overview | 4 KPI cards with custom gradients            | ~80 lines           |
| Dashboard        | Custom async stat widgets                    | ~30 lines           |

**TODO:**

- [ ] Migrate Claims stat cards → `MetricCard` variant="gradient"
- [ ] Migrate Leads stat cards → `MetricCard` variant="default"
- [ ] Migrate Pipeline stat cards → `MetricCard`
- [ ] Remove Storm Center's local `StatCard` function (shadows design system export)
- [ ] Migrate Finance Overview KPIs → `MetricCard` variant="gradient"
- [ ] Migrate Dashboard stat widgets → `MetricCard`

### 2.4 — EmptyState Presets Not Adopted 🟡 P1

14 carefully crafted presets exist: `NoClaims`, `NoLeads`, `NoContacts`, `NoReports`, `NoJobs`, `NoDocuments`, `NoPhotos`, `NoMessages`, `NoInvoices`, `NoTeamMembers`, `NoAnalytics`, `NoNotes`, `NoActivity`, `NoProperties`

**Only 6 pages use them.** Most pages either hand-roll empty states or omit them entirely.

**Pages missing empty states:**

| Page           | Current State                  | Recommended Preset             |
| -------------- | ------------------------------ | ------------------------------ |
| Team Settings  | Empty list, no message         | `NoTeamMembers`                |
| HOA Notices    | Empty table (headers only)     | `NoDocuments` (customize text) |
| Map View       | Map with 0 markers             | `NoProperties` (customize)     |
| Search         | "Enter a search query" text    | Custom `EmptyState`            |
| Contacts tabs  | Multiple custom inline empties | `NoContacts`                   |
| Vendor Network | Unstyled "Loading..." text     | `EmptyState` + spinner         |
| Reports Hub    | Safe mode banner only          | `NoReports`                    |

**TODO:**

- [ ] Replace all hand-rolled empty states with `EmptyState` or presets
- [ ] Add empty states to pages that omit them entirely
- [ ] Delete legacy `EmptyStateCard.tsx` (0 imports)

### 2.5 — LoadingStates Module Unused 🟡 P2

10 well-designed loading components exist in `LoadingStates.tsx` but only 1 page imports them.

**TODO:**

- [ ] Use `ClaimWorkspaceSkeleton` in claims list loading.tsx
- [ ] Use `PhotoGridSkeleton` in photos tab loading.tsx
- [ ] Use `ReportListSkeleton` in reports history loading.tsx
- [ ] Use `TableSkeleton` in invoices/tasks loading.tsx
- [ ] Use `PageLoadingSpinner` as default for remaining loading.tsx files

### 2.6 — Dead Code Cleanup 🟡 P2

**Components with 0 imports (safe to delete):**

| Component                  | File                                                   |
| -------------------------- | ------------------------------------------------------ |
| `EmptyStateCard`           | `ui/empty-state-card.tsx`                              |
| `CompactCard`              | `ui/compact-card.tsx`                                  |
| `BentoCard`                | `ui/bento-card.tsx`                                    |
| `GradientBadge`            | `ui/gradient-badge.tsx`                                |
| `IconBadge`                | `ui/icon-badge.tsx`                                    |
| `DataBadge`                | `ui/data-badge.tsx`                                    |
| `SectionHeader`            | `ui/section-header.tsx`                                |
| `MotionWrapper`            | `ui/motion-wrapper.tsx`                                |
| `Breadcrumbs` (PascalCase) | `ui/Breadcrumbs.tsx` (keep lowercase `breadcrumb.tsx`) |
| `StatCardGrid`             | `ui/stat-card.tsx` (wrapper only — keep `MetricCard`)  |
| Design tokens (most)       | `ui/designSystem.ts` (keep only `sectionThemes`)       |

**TODO:**

- [ ] Run `grep -r "ComponentName" src/` to verify 0 imports for each
- [ ] Delete all 11 dead-code components
- [ ] Move `sectionThemes` from `designSystem.ts` to `PageHero` or `lib/theme.ts`
- [ ] Delete `designSystem.ts`

---

## SECTION 3 — DARK MODE GAPS

### 3.1 — Pages with Broken Dark Mode 🔴 P0

| Page                             | Issue                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Getting Started**              | 100% hardcoded light-only: `bg-green-50`, `bg-purple-50`, `bg-blue-50`, `bg-white` — **no `dark:` variants at all** |
| **Search**                       | Hardcoded `text-gray-600`, `text-gray-500`, `hover:bg-gray-50`, `text-blue-600` — unusable in dark mode             |
| **Tasks**                        | Priority colors lack dark variants: `bg-red-100 text-red-800` etc.                                                  |
| **Teams unauthenticated state**  | No `dark:` on sign-in card                                                                                          |
| **Trades unauthenticated state** | No `dark:` on sign-in/error cards                                                                                   |
| **Vendor Network back link**     | `text-blue-600 hover:bg-blue-50` without dark                                                                       |
| **Smart Docs**                   | Status badge colors hardcoded light-only                                                                            |
| **HOA Notices hero button**      | `bg-amber-600 text-white` without dark adaptation                                                                   |
| **Settings main**                | Mixed CSS vars (`var(--surface-1)`) + Tailwind `dark:` — two theming systems                                        |
| **Finance Overview**             | Mixed CSS vars + Tailwind — competing theming                                                                       |

**TODO:**

- [ ] Fix Getting Started page dark mode (highest impact — onboarding flow)
- [ ] Fix Search page dark mode
- [ ] Fix Tasks priority badges dark mode
- [ ] Fix all unauthenticated state cards (Teams, Trades, Vendor)
- [ ] Convert CSS variable theming → Tailwind `dark:` everywhere
- [ ] Create shared `AuthRequiredState` component to replace hand-rolled sign-in cards

---

## SECTION 4 — UX PATTERN ISSUES

### 4.1 — No Settings Layout/Navigation 🟡 P1

28+ settings sub-pages exist with **no shared layout, no sidebar nav, no breadcrumbs**. Users must navigate back to `/settings` hub for every section change.

**TODO:**

- [ ] Create `src/app/(app)/settings/layout.tsx` with sidebar navigation
- [ ] Add settings sub-nav: Profile, Team, Branding, Security, Billing, Integrations, Permissions, Company, etc.
- [ ] Standardize container widths (currently varies: `max-w-4xl`, `max-w-5xl`, `max-w-6xl`)

### 4.2 — Security Page is 100% Mock Data 🔴 P0

`/settings/security` renders hardcoded fake data:

- Mock sessions array (line 56)
- Mock login history (line 80)
- Fake API key: `sk_live_abc123...xyz789` (line 293)
- MFA toggles don't persist

**TODO:**

- [ ] Either implement real security features OR mark page as "Coming Soon"
- [ ] Remove fake API key display (security anti-pattern even as mock)
- [ ] Add feature flag gate if keeping as placeholder

### 4.3 — Claims Layout Debug Info Exposed in Prod 🔴 P0

When a claim isn't found, the claims layout renders internal diagnostic info:

- Raw claim IDs and org IDs
- Links to `/api/diag/org` and `/api/__truth` debug endpoints
- Internal error reasons

**TODO:**

- [ ] Wrap debug panel in `process.env.NODE_ENV !== 'production'` check
- [ ] Show user-friendly "Claim not found" with back-to-claims link in prod

### 4.4 — Claims Layout Header Duplication 🟡 P2

~130 lines of identical header JSX rendered twice (demo claim vs real claim path).

**TODO:**

- [ ] Extract `ClaimHeader` component
- [ ] Render once with conditional data source

### 4.5 — God Components 🟡 P2

| Component         | Lines     | Concern                                                         |
| ----------------- | --------- | --------------------------------------------------------------- |
| Photos tab        | **1,849** | Upload, analysis, annotation, batch ops, grid views, modal tabs |
| Weather tab       | **1,547** | DOL scan, radar, report gen, saved scans                        |
| Finance Overview  | **822**   | KPIs, charts, tabs, filters, all hand-rolled                    |
| Onboarding Wizard | **811**   | 5-step wizard in single file                                    |
| Smart Docs        | **745**   | Template list, editor, status management                        |

**TODO:**

- [ ] Split Photos into: `PhotoUploader`, `PhotoGrid`, `PhotoAnalysis`, `PhotoAnnotation`
- [ ] Split Weather into: `WeatherScanner`, `RadarViewer`, `WeatherReport`, `SavedScans`
- [ ] Split Finance Overview into: `FinanceKPIs`, `FinanceCharts`, `FinanceTabs`
- [ ] Split Onboarding Wizard into per-step components

### 4.6 — Inconsistent Table Patterns 🟡 P1

Three table approaches:

1. `DataTable` from `ContentCard` (only Commissions uses it)
2. Raw `<table>` with manual styling (Documents, Invoices, HOA)
3. Card-based lists instead of tables (Claims, Leads)

**TODO:**

- [ ] Standardize on `DataTable` for tabular data
- [ ] Create a shared `DataTable` wrapper with sort, filter, pagination
- [ ] Migrate Documents, Invoices, HOA, Report History tables to shared component

### 4.7 — Missing `loading.tsx` / `error.tsx` Coverage 🟡 P2

| File Type     | Count | Total Routes | Coverage |
| ------------- | ----- | ------------ | -------- |
| `loading.tsx` | 165   | 358          | **46%**  |
| `error.tsx`   | 170   | 358          | **47%**  |

**TODO:**

- [ ] Add `loading.tsx` to all remaining ~193 routes
- [ ] Add `error.tsx` to all remaining ~188 routes
- [ ] Use `PageSkeleton` variants in loading.tsx files
- [ ] Use `ErrorCard` in error.tsx files

---

## SECTION 5 — REMAINING TECH DEBT

### 5.1 — ESLint `ignoreDuringBuilds` 🔴 Cannot Flip

**Full ESLint scan:** 5,117 errors + 17,992 warnings across `src/`

This is **not flippable** without a multi-sprint cleanup. The `lint:ship` scope (auth, prisma, reports, utils) is clean (0 errors, 0 warnings), but the full codebase is far from it.

**TODO:**

- [ ] Expand `lint:ship` scope incrementally (add `src/app/api/` next)
- [ ] Add `eslint-disable` headers to remaining files with only `no-unsafe-*` violations
- [ ] Target: reduce to <500 errors before attempting flip
- [ ] Long-term: flip `ignoreDuringBuilds: false` when errors < 100

### 5.2 — `getRouteParams<T>()` Migration 🟡 P2

Helper exists in `src/lib/auth/withAuth.ts`. **33 API routes** currently access `params` directly.

**TODO:**

- [ ] Migrate 33 routes to use `getRouteParams<T>()`
- [ ] Add type annotations for each route's param shape
- [ ] This is a mechanical migration — low risk, 2-3 hours

### 5.3 — Sentry Auth Token 🟡 P2

Source map uploads and release tracking require `SENTRY_AUTH_TOKEN` in Vercel env.

**TODO:**

- [ ] Generate token at https://sentry.io/settings/auth-tokens/
- [ ] Add `SENTRY_AUTH_TOKEN` to Vercel environment variables
- [ ] Verify source maps upload on next deploy

### 5.4 — TradesConnection Schema Dedup 🟡 P3

Two models: `TradesConnection` (PascalCase, follower/following) and `tradesConnection` (camelCase, requester/addressee). Different schemas, same concept area.

**TODO:**

- [ ] Check production DB for rows in PascalCase `TradesConnection` table
- [ ] If 0 rows: create migration to drop it, update `TradesProfile` relations
- [ ] If has rows: plan data migration to unify into camelCase model
- [ ] Remove `as any` casts from 9 files after schema cleanup

---

## SECTION 6 — PRIORITIZED SPRINT PLAN

### Sprint A — Critical Fixes (1-2 days) 🔴

| #   | Task                                                    | Files                         | Est. |
| --- | ------------------------------------------------------- | ----------------------------- | ---- |
| A1  | Hide claims layout debug panel in prod                  | `claims/[claimId]/layout.tsx` | 30m  |
| A2  | Flag Security page as "Coming Soon" or remove mock data | `settings/security/page.tsx`  | 1h   |
| A3  | Sync sidebar ↔ mobile nav                               | `AppSidebar.tsx`, `MobileNav` | 2h   |
| A4  | Fix Getting Started dark mode                           | `getting-started/page.tsx`    | 2h   |
| A5  | Fix Search page (PageHero + dark mode)                  | `search/page.tsx`             | 1h   |
| A6  | Create `AuthRequiredState` component                    | `components/auth/`            | 1h   |

### Sprint B — Design System Adoption (3-5 days) 🟡

| #   | Task                                                   | Files                                              | Est. |
| --- | ------------------------------------------------------ | -------------------------------------------------- | ---- |
| B1  | Migrate stat cards → MetricCard (6 pages)              | Claims, Leads, Pipeline, Storm, Finance, Dashboard | 4h   |
| B2  | Migrate empty states → EmptyState presets (10+ pages)  | Team, HOA, Map, Search, Contacts, etc.             | 3h   |
| B3  | Add `hero` variant to Button, consolidate ActionButton | `button.tsx`, `action-button.tsx`                  | 3h   |
| B4  | Create Settings shared layout                          | `settings/layout.tsx`                              | 4h   |
| B5  | Add breadcrumbs to deep routes                         | Claims layout, Settings, Reports                   | 3h   |
| B6  | Fix remaining dark mode gaps (Tasks, Smart Docs, etc.) | ~8 files                                           | 3h   |

### Sprint C — Structural Cleanup (3-5 days) 🟡

| #   | Task                                            | Files                               | Est. |
| --- | ----------------------------------------------- | ----------------------------------- | ---- |
| C1  | Delete 12 dead-code components                  | Various `ui/` files                 | 1h   |
| C2  | Split god components (Photos, Weather)          | 2 files → 8+ files                  | 6h   |
| C3  | Standardize table pattern                       | Documents, Invoices, HOA, Reports   | 4h   |
| C4  | Add loading.tsx to remaining 193 routes         | Generate with PageSkeleton variants | 4h   |
| C5  | Add error.tsx to remaining 188 routes           | Generate with ErrorCard             | 3h   |
| C6  | Claims detail: add missing tabs or merge routes | ClaimTabs.tsx + 10 routes           | 3h   |

### Sprint D — Tech Debt (2-3 days) 🟢

| #   | Task                                        | Files                        | Est. |
| --- | ------------------------------------------- | ---------------------------- | ---- |
| D1  | Migrate 33 routes to getRouteParams         | API route files              | 3h   |
| D2  | Expand lint:ship scope to `src/app/api/`    | `.eslintrc.json`, API routes | 4h   |
| D3  | Set up Sentry auth token                    | Vercel env                   | 15m  |
| D4  | Audit orphaned pages — flag/redirect/delete | 139 pages                    | 4h   |
| D5  | Extract ClaimHeader component (deduplicate) | Claims layout                | 1h   |

---

## SECTION 7 — REFERENCE: ALL SECTION THEMES

Currently all 8 section themes resolve to the same gradient:
`bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600`

| Theme Key | Used By                                           |
| --------- | ------------------------------------------------- |
| `command` | Dashboard, Storm Center, Analytics, Notifications |
| `claims`  | Claims, Claims detail                             |
| `jobs`    | Leads, Retail, Appointments, Tasks                |
| `reports` | Reports Hub, History, Templates                   |
| `network` | Trades, Vendor Network, Messages                  |
| `company` | Settings, Teams, Billing, Leaderboard             |
| `finance` | Finance, Commissions, Invoices                    |
| `build`   | Materials, AI Tools, Mockup                       |

**Future consideration:** Re-enable per-section color differentiation for wayfinding.

---

## SECTION 8 — REFERENCE: COMPONENT DEPENDENCY MAP

```
PageHero ← uses sectionThemes from designSystem.ts
  └── Auto-detects section via detectSectionFromPath()
  └── Supports: title, subtitle, icon, actions, size, gradient

MetricCard ← uses Card from ui/card.tsx
  └── 5 variants: default, gradient, solid, glass, outline
  └── Supports: trend, intent, icon, loading

ContentCard ← standalone glass card
  └── Exports: DataTable, DataTableHeader, DataTableBody, DataTableRow, etc.

EmptyState ← standalone centered card
  └── 14 presets in EmptyStatePresets

ErrorCard ← standalone, Sentry-integrated
  └── Used in 30+ error.tsx boundaries

Button ← CVA-based shadcn pattern
  └── 10 variants, 5 sizes
  └── COMPETITOR: ActionButton (should be consolidated)
```

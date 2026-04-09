# MASTER EXECUTION TODO — Full Granular Breakdown

Generated: 2026-04-09
Status baseline: commit `f954d053` shipped to `main`, gates green.
Total items: **161 action items** across 7 lanes.

## Current Baseline (Locked)

- Typecheck: ✅
- Unit tests: ✅ 906/906
- Ship lint (`lint:ship`): ✅
- Production smoke: ✅ health/home/contacts = 200
- Working tree: ✅ clean

---

## Execution Rule (Do Not Break)

1. One lane at a time
2. One scoped commit per lane batch
3. Verify gates after each batch
4. Push only when green

---

## Lane A — Critical UX Follow-Through (P0) — 29 items

### A1. Claims not-found hardening (3)

- [ ] A1.1 — Verify `claims/[claimId]/layout.tsx` debug panel only renders in dev (already done, confirm)
- [ ] A1.2 — Add unit test: debug panel hidden when `NODE_ENV=production`
- [ ] A1.3 — Verify all user-facing links in claim failure screens go to valid routes

### A2. Security settings truthfulness (10)

- [ ] A2.1 — `settings/security/page.tsx`: Replace mock active sessions with "Coming Soon" card
- [ ] A2.2 — `settings/security/page.tsx`: Replace mock login history with "Coming Soon" card
- [ ] A2.3 — `settings/security/page.tsx`: Replace fake API key display with real Clerk 2FA settings link
- [ ] A2.4 — `settings/customer-portal/page.tsx`: Add "Preview" banner (mock portal customization)
- [ ] A2.5 — `settings/customer-portal/page.tsx`: Replace fake toggle states with static preview
- [ ] A2.6 — `settings/languages/page.tsx`: Add "Preview" banner (mock i18n settings)
- [ ] A2.7 — `settings/languages/page.tsx`: Replace interactive toggles with static preview
- [ ] A2.8 — `settings/service-areas/page.tsx`: Add "Preview" banner (mock service area config)
- [ ] A2.9 — `settings/white-label/page.tsx`: Add "Preview" banner (mock white-label config)
- [ ] A2.10 — `settings/white-label/page.tsx`: Replace fake domain/color pickers with static preview

### A3. Dark mode blocker fixes (14)

**Getting-started page (6 fixes):**

- [ ] A3.1 — `getting-started/page.tsx`: Fix celebration card `bg-blue-50 text-blue-700` → add `dark:bg-blue-950/30 dark:text-blue-300`
- [ ] A3.2 — `getting-started/page.tsx`: Fix sample-data card `bg-amber-50 text-amber-700` → add `dark:bg-amber-950/30 dark:text-amber-300`
- [ ] A3.3 — `getting-started/page.tsx`: Fix help card `bg-emerald-50 text-emerald-700` → add `dark:bg-emerald-950/30 dark:text-emerald-300`
- [ ] A3.4 — `getting-started/page.tsx`: Fix "What's Next?" section `bg-gradient-to-r from-slate-50` → add dark variant
- [ ] A3.5 — `getting-started/page.tsx`: Fix completed checklist items `bg-green-50 border-green-200` → add dark variants
- [ ] A3.6 — `getting-started/page.tsx`: Fix incomplete checklist hover `hover:bg-blue-50/30` → add dark variant

**Tasks page (5 fixes):**

- [ ] A3.7 — `tasks/page.tsx`: Fix critical priority chip `bg-red-100 text-red-800` → add `dark:bg-red-900/30 dark:text-red-300`
- [ ] A3.8 — `tasks/page.tsx`: Fix high priority chip `bg-orange-100 text-orange-800` → add `dark:bg-orange-900/30 dark:text-orange-300`
- [ ] A3.9 — `tasks/page.tsx`: Fix medium priority chip `bg-yellow-100 text-yellow-800` → add `dark:bg-yellow-900/30 dark:text-yellow-300`
- [ ] A3.10 — `tasks/page.tsx`: Fix low priority chip `bg-green-100 text-green-800` → add `dark:bg-green-900/30 dark:text-green-300`
- [ ] A3.11 — `tasks/page.tsx`: Fix none priority chip `bg-gray-100 text-gray-800` → add `dark:bg-gray-900/30 dark:text-gray-300`

**Auth-required cards (3 fixes):**

- [ ] A3.12 — `teams/page.tsx`: Fix auth-required card dark mode (hardcoded light bg/border)
- [ ] A3.13 — `trades/page.tsx`: Fix auth-required card dark mode (hardcoded light bg/border)
- [ ] A3.14 — Vendor pages: Verify redirect-based auth pattern — no dark fix needed (redirect only)

### A4. Shared AuthRequiredState component (2)

- [ ] A4.1 — Create `src/components/shared/AuthRequiredState.tsx` with Lock icon, message, sign-in CTA, dark mode support
- [ ] A4.2 — Replace hand-rolled auth walls in `teams/page.tsx` and `trades/page.tsx` with `<AuthRequiredState>`

---

## Lane B — Navigation Alignment + Route Discoverability (P0/P1) — 33 items

### B1. Sidebar ↔ Mobile nav parity (15)

- [ ] B1.1 — Fix mobile "Analytics Dashboard" label → "Analytics Hub" (match sidebar)
- [ ] B1.2 — Fix mobile Analytics URL → `/analytics` (match sidebar)
- [ ] B1.3 — Remove mobile-only "Supplement Tracker" `/supplements` (not in sidebar)
- [ ] B1.4 — Add missing "Task Manager" `/tasks` to mobile Jobs section
- [ ] B1.5 — Add missing "Door Knocking" `/maps/door-knocking` to mobile Jobs section
- [ ] B1.6 — Move "Permits" `/permits` from mobile Jobs to Documents (match sidebar)
- [ ] B1.7 — Add missing "HOA Storm Notices" `/hoa/notices` to mobile
- [ ] B1.8 — Add missing "Connections & Contacts" to mobile Network section
- [ ] B1.9 — Add missing "Company Hierarchy" to mobile Company section
- [ ] B1.10 — Add missing "Archive" to mobile Company section
- [ ] B1.11 — Add missing "Invitations" to mobile Company section
- [ ] B1.12 — Un-merge mobile "Reports & Documents" into two sections (match sidebar)
- [ ] B1.13 — Un-merge mobile "Company & Network" into two sections (match sidebar)
- [ ] B1.14 — Create shared `navConfig.ts` to single-source all nav items
- [ ] B1.15 — Wire AppSidebar + MobileNav + TopNav to read from shared config

### B2. Claims tab consolidation (8)

- [ ] B2.1 — Audit 4 competing tab systems: ClaimTabs, ClaimLayoutClient, ClaimDetailClient, ClaimWorkspaceShell
- [ ] B2.2 — Pick ClaimTabs (16 tabs) as canonical; deprecate others
- [ ] B2.3 — Redirect `/claims/[id]/report` → `/claims/[id]/overview` (duplicate)
- [ ] B2.4 — Redirect `/claims/[id]/supplement` → `/claims/[id]/scope` (duplicate)
- [ ] B2.5 — Add `role="tablist"` to ClaimTabs container
- [ ] B2.6 — Add `role="tab"` + `aria-selected` to each tab link
- [ ] B2.7 — Add keyboard navigation (arrow keys) to tab bar
- [ ] B2.8 — Remove/archive unused ClaimLayoutClient and ClaimDetailClient tab implementations

### B3. Orphan route triage (10)

- [ ] B3.1 — Triage: `/marketing/*` routes → add sidebar entry or redirect to Analytics
- [ ] B3.2 — Triage: `/hoa/notices` → already in sidebar Documents section, verify mobile
- [ ] B3.3 — Triage: `/quality/*` routes → add sidebar entry under Reports or Company
- [ ] B3.4 — Triage: `/system/*` routes → admin-only, add to Settings or keep hidden
- [ ] B3.5 — Triage: `/meetings/*` → add sidebar entry under Jobs or keep orphan
- [ ] B3.6 — Triage: `/reviews/*` → add sidebar entry under Jobs or Company
- [ ] B3.7 — Triage: `/estimates/*` → add sidebar entry under Build Tools
- [ ] B3.8 — Triage: `/work-orders/*` → add sidebar entry under Jobs
- [ ] B3.9 — Triage: `/connections/*` → already in sidebar as "Connections & Contacts", verify link
- [ ] B3.10 — Add breadcrumb/back-link to all decided-keep orphan pages

---

## Lane C — Design System Convergence (P1) — 48 items

### C1. MetricCard migration (18)

- [ ] C1.1 — Migrate `claims/page.tsx` stat tiles → MetricCard
- [ ] C1.2 — Migrate `leads/page.tsx` stat tiles → MetricCard
- [ ] C1.3 — Migrate `pipeline/page.tsx` stat tiles → MetricCard
- [ ] C1.4 — Migrate `storm-center/page.tsx` stat tiles → MetricCard
- [ ] C1.5 — Migrate `measurements/page.tsx` stat tiles → MetricCard
- [ ] C1.6 — Migrate `reviews/page.tsx` stat tiles → MetricCard
- [ ] C1.7 — Migrate `meetings/page.tsx` stat tiles → MetricCard
- [ ] C1.8 — Migrate `marketing/attribution/page.tsx` remaining tiles → MetricCard
- [ ] C1.9 — Migrate `hoa/notices/page.tsx` stat tiles → MetricCard
- [ ] C1.10 — Migrate `finance/overview/page.tsx` stat tiles → MetricCard
- [ ] C1.11 — Migrate `connections/page.tsx` stat tiles → MetricCard
- [ ] C1.12 — Migrate `system/health/page.tsx` stat tiles → MetricCard
- [ ] C1.13 — Migrate `analytics/page.tsx` stat tiles → MetricCard
- [ ] C1.14 — Migrate `dashboard/page.tsx` stat tiles → MetricCard
- [ ] C1.15 — Migrate `quality/inspections/page.tsx` stat tiles → MetricCard
- [ ] C1.16 — Migrate `appointments/page.tsx` stat tiles → MetricCard
- [ ] C1.17 — Migrate `smart-docs/page.tsx` stat tiles → MetricCard
- [ ] C1.18 — Migrate `leaderboard/page.tsx` stat tiles → MetricCard

### C2. EmptyState consolidation (20)

**Consolidate 5 implementations → 1 canonical:**

- [ ] C2.1 — Pick `src/components/ui/empty-state.tsx` as canonical EmptyState
- [ ] C2.2 — Merge features from `src/components/shared/EmptyState.tsx` into canonical
- [ ] C2.3 — Delete `src/components/shared/EmptyState.tsx` after migration
- [ ] C2.4 — Delete inline EmptyState in network module
- [ ] C2.5 — Update all current imports to point to canonical

**Adopt on priority pages (15):**

- [ ] C2.6 — `vendors/page.tsx`: Replace `"No vendors found"` with EmptyState
- [ ] C2.7 — `connections/page.tsx`: Replace `"No connection requests yet"` with EmptyState
- [ ] C2.8 — `reviews/page.tsx`: Replace `"No reviews yet"` with EmptyState
- [ ] C2.9 — `work-orders/page.tsx`: Replace empty text with EmptyState
- [ ] C2.10 — `messages/page.tsx`: Replace empty text with EmptyState
- [ ] C2.11 — `appointments/page.tsx`: Replace empty text with EmptyState
- [ ] C2.12 — `crews/page.tsx`: Replace empty text with EmptyState
- [ ] C2.13 — `invoices/page.tsx`: Replace empty text with EmptyState
- [ ] C2.14 — `leads/page.tsx`: Replace empty text with EmptyState
- [ ] C2.15 — `permits/page.tsx`: Replace empty text with EmptyState
- [ ] C2.16 — `reports/page.tsx`: Replace empty text with EmptyState
- [ ] C2.17 — `commissions/page.tsx`: Replace empty text with EmptyState
- [ ] C2.18 — `materials/page.tsx`: Replace empty text with EmptyState
- [ ] C2.19 — `maps/page.tsx`: Replace empty text with EmptyState
- [ ] C2.20 — `smart-docs/page.tsx`: Replace empty text with EmptyState

### C3. DataTable adoption (5)

- [ ] C3.1 — Migrate `work-orders/page.tsx` custom table → DataTable
- [ ] C3.2 — Migrate `developers/webhooks/page.tsx` custom table → DataTable
- [ ] C3.3 — Migrate `leads/page.tsx` custom table → DataTable
- [ ] C3.4 — Migrate `connections/page.tsx` custom table → DataTable
- [ ] C3.5 — Migrate `appointments/page.tsx` custom table → DataTable

### C4. Button consistency (5)

- [ ] C4.1 — Audit all `className="...bg-blue-600..."` ad-hoc button styling across app pages
- [ ] C4.2 — Replace ad-hoc CTAs in getting-started with `<Button variant="default">`
- [ ] C4.3 — Replace ad-hoc CTAs in claims pages with `<Button>` variants
- [ ] C4.4 — Replace ad-hoc CTAs in settings pages with `<Button>` variants
- [ ] C4.5 — Verify all destructive actions use `<Button variant="destructive">`

---

## Lane D — Settings UX Systemization (P1) — 14 items

### D1. Settings layout shell (4)

- [ ] D1.1 — Create `src/app/(app)/settings/layout.tsx` with sidebar-style internal nav
- [ ] D1.2 — Add section grouping: General, Security, Billing, Integrations, Advanced
- [ ] D1.3 — Add back-to-settings breadcrumb on all sub-pages
- [ ] D1.4 — Add mobile-responsive settings nav (collapsible or horizontal scroll)

### D2. Settings page normalization (10)

- [ ] D2.1 — `settings/deployment/page.tsx`: Wrap in PageContainer + add PageHero
- [ ] D2.2 — `settings/go-no-go/page.tsx`: Wrap in PageContainer + add PageHero
- [ ] D2.3 — `settings/inspector/page.tsx`: Wrap in PageContainer + add PageHero
- [ ] D2.4 — `settings/ops/page.tsx`: Wrap in PageContainer + add PageHero
- [ ] D2.5 — `settings/notifications/page.tsx`: Wrap in PageContainer (has PageHero, missing container)
- [ ] D2.6 — `settings/onboarding-analytics/page.tsx`: Wrap in PageContainer + add PageHero
- [ ] D2.7 — `settings/production-verification/page.tsx`: Add PageContainer (has PageHero)
- [ ] D2.8 — `settings/profile/page.tsx`: Add PageContainer (has PageHero)
- [ ] D2.9 — `settings/referrals/page.tsx`: Add PageContainer (has PageHero)
- [ ] D2.10 — `settings/team/page.tsx`: Add PageContainer (has PageHero)

---

## Lane E — Engineering Debt with Product Impact (P1/P2) — 18 items

### E1. `getRouteParams<T>()` and async params migration (10)

- [ ] E1.1 — Fix missing `await` on `routeParams.params` in `api/claims/[claimId]/messages/` routes
- [ ] E1.2 — Fix missing `await` in `api/claims/[claimId]/weather/refresh/route.ts`
- [ ] E1.3 — Fix missing `await` in `api/claims/[claimId]/depreciation/export/route.ts`
- [ ] E1.4 — Audit all 50+ `routeParams.params` usages for consistent async pattern
- [ ] E1.5 — Migrate top-10 highest-traffic routes to `getRouteParams<T>()` helper
- [ ] E1.6 — Add unit test for `getRouteParams` helper
- [ ] E1.7 — Fix `generated-documents/[id]/download/route.tsx` `routeParams!.params` → proper null guard
- [ ] E1.8 — Migrate claims CRUD routes to use `getRouteParams`
- [ ] E1.9 — Migrate contacts routes to use `getRouteParams`
- [ ] E1.10 — Migrate notifications routes to use `getRouteParams`

### E2. Lint scope expansion (5)

- [ ] E2.1 — Measure current error count in `src/app/api/**` scope
- [ ] E2.2 — Fix auto-fixable lint errors in api routes (unused imports, etc.)
- [ ] E2.3 — Add `src/app/api/**` to `lint:ship` scope
- [ ] E2.4 — Measure current error count in `src/stores/**` scope
- [ ] E2.5 — Add `src/stores/**` to `lint:ship` scope

### E3. Sentry deploy completeness (3)

- [ ] E3.1 — Verify `SENTRY_AUTH_TOKEN` set in Vercel deploy env
- [ ] E3.2 — Verify `sentry.server.config.ts` has release tagging
- [ ] E3.3 — Verify sourcemap upload runs during `next build`

---

## Lane F — Schema/Model Cleanup (P2) — 4 items

### F1. TradesConnection consolidation (4)

- [ ] F1.1 — Query production: count rows in trades_connections vs trade_connections
- [ ] F1.2 — Identify all code paths referencing each table
- [ ] F1.3 — Draft migration SQL: consolidate to single canonical table
- [ ] F1.4 — Remove `any` type workarounds after schema is finalized

---

## Lane G — Dead Code & Component Hygiene (P2) — 15 items

### G1. Dead component removal (5)

- [ ] G1.1 — Delete `src/components/ui/breadcrumb.tsx` (0 imports)
- [ ] G1.2 — Delete `src/components/shared/Breadcrumbs.tsx` (0 imports)
- [ ] G1.3 — Delete `src/components/shared/StatGrid.tsx` (0 imports)
- [ ] G1.4 — Delete `src/components/shared/DashboardCharts.tsx` (0 imports)
- [ ] G1.5 — Run tests + build after deletion to confirm no breakage

### G2. Duplicate component resolution (10)

- [ ] G2.1 — Consolidate 5 EmptyState variants → 1 canonical (see C2 overlap)
- [ ] G2.2 — Consolidate claim tab systems → ClaimTabs only (see B2 overlap)
- [ ] G2.3 — Remove `ClaimLayoutClient` tab duplicate after migration
- [ ] G2.4 — Remove `ClaimDetailClient` tab duplicate after migration
- [ ] G2.5 — Remove `ClaimWorkspaceShell` tab duplicate if unused
- [ ] G2.6 — Audit `CardContent` vs `ContentCard` vs `PageSectionCard` — pick canonical card wrapper
- [ ] G2.7 — Migrate card wrapper usages to canonical
- [ ] G2.8 — Remove dead `src/components/error-states.tsx` exports (only 1 of many exports used)
- [ ] G2.9 — Remove legacy `/config/routes.ts` nav config if not referenced
- [ ] G2.10 — Final full-codebase dead-export scan with knip

---

## Master Sequence

| Order | Lane                     | Items   | Priority |
| ----- | ------------------------ | ------- | -------- |
| 1     | **A** — Critical UX      | 29      | P0       |
| 2     | **B** — Navigation       | 33      | P0/P1    |
| 3     | **C** — Design System    | 48      | P1       |
| 4     | **D** — Settings UX      | 14      | P1       |
| 5     | **E** — Engineering Debt | 18      | P1/P2    |
| 6     | **F** — Schema Cleanup   | 4       | P2       |
| 7     | **G** — Dead Code        | 15      | P2       |
|       | **TOTAL**                | **161** |          |

---

## Verification Checklist (Run Every Lane)

- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] `pnpm lint:ship`
- [ ] Production smoke: `/api/health`, `/`, `/contacts`
- [ ] Commit message scoped to lane
- [ ] Push after green

---

## Definition of Done (Whole Program)

- [ ] All 7 lanes shipped and verified
- [ ] No high-friction UX mismatches in core pro flows
- [ ] Navigation parity complete — one config, three renderers
- [ ] Design system adoption > 80% on tier-1 pages
- [ ] No mock data without "Preview" banner
- [ ] No dead components in tree
- [ ] Next master backlog regenerated from post-lane metrics

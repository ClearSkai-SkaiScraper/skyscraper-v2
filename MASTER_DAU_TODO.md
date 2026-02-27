# 🚀 MASTER DAU TODO — February 26, 2026

> **Meeting: Tomorrow Afternoon**  
> **Target: DAU-Ready in ~1 Week**  
> **Philosophy: Polished UI + Working End-to-End Flows**

---

## 📊 STATUS LEGEND

- ✅ = Done
- 🔄 = In Progress
- ⏳ = Queued
- 🔴 = Critical/Blocking
- 🟡 = High Priority
- ⚪ = Nice to Have

---

# SPRINT A: UI CONSISTENCY PASS (CRITICAL FOR DEMO)

## A1. Analytics Pages — Modernize to Reports Hub Style

All analytics pages need the gradient stat cards + consistent layout.

| #    | Page                         | Current State                                      | Status |
| ---- | ---------------------------- | -------------------------------------------------- | ------ |
| A1.1 | `/analytics/reports`         | ✅ FIXED — Rewritten with Reports Hub style        | ✅     |
| A1.2 | `/analytics/dashboard`       | Uses old Card components, needs gradient stats     | ⏳     |
| A1.3 | `/analytics/performance`     | Client component with tabs, old Card style         | ⏳     |
| A1.4 | `/analytics/claims-timeline` | Decent style but PageSectionCard not gradient      | ⏳     |
| A1.5 | `/analytics` (hub)           | Catalog page with links — OK but could be prettier | ⏳     |
| A1.6 | `/weather/analytics`         | Has StatCard but different implementation          | ⏳     |
| A1.7 | `/invitations/analytics`     | Has PageHero, decent but could unify               | ⏳     |
| A1.8 | `/trades/analytics`          | Has StatCard, PageSectionCard — close to target    | ⏳     |

## A2. Executive Dashboards — UI Polish

| #    | Page                  | Current State                              | Status |
| ---- | --------------------- | ------------------------------------------ | ------ |
| A2.1 | `/dashboard`          | Main command center — StatsCards look good | 🟡     |
| A2.2 | `/dashboard/kpis`     | Uses KPIDashboardClient — check styling    | ⏳     |
| A2.3 | `/dashboard/activity` | **OLD STYLE** — Uses GlassCard, basic list | 🔴     |
| A2.4 | `/settings/pilot`     | **OLD STYLE** — Basic Card components      | 🔴     |

## A3. Core Pages — Check & Polish

| #    | Page              | Current State                       | Status |
| ---- | ----------------- | ----------------------------------- | ------ |
| A3.1 | `/reports/hub`    | ✅ GOLD STANDARD — Use as reference | ✅     |
| A3.2 | `/claims`         | List view — check consistency       | ⏳     |
| A3.3 | `/leads`          | List view — check consistency       | ⏳     |
| A3.4 | `/vendor-network` | ✅ Added Vendor Analytics button    | ✅     |

---

# SPRINT B: NAVIGATION & ROUTING FIXES

## B1. Sidebar Navigation

| #    | Task                                           | Status |
| ---- | ---------------------------------------------- | ------ |
| B1.1 | ✅ Move Analytics Dashboard under Lead Routing | ✅     |
| B1.2 | Verify all 7 sections have working links       | ⏳     |
| B1.3 | Check for 404 pages from sidebar               | ⏳     |
| B1.4 | Badge counts working (messages, notifications) | ⏳     |

## B2. Broken Routes Audit

| #    | Route                           | Issue                                  | Status |
| ---- | ------------------------------- | -------------------------------------- | ------ |
| B2.1 | `/analytics/reports`            | ✅ FIXED — reportRecord alias + schema | ✅     |
| B2.2 | Smoke test all sidebar links    | ⏳                                     |
| B2.3 | Check AI tools routes           | ⏳                                     |
| B2.4 | Check reports generation routes | ⏳                                     |

---

# SPRINT C: DATA & DEMO READINESS

## C1. Dashboard Widgets

| #    | Task                   | Issue                       | Status |
| ---- | ---------------------- | --------------------------- | ------ |
| C1.1 | StatsCards showing 0   | API correct, likely no data | 🟡     |
| C1.2 | NetworkActivity widget | Check for errors            | ⏳     |
| C1.3 | WeatherSummaryCard     | Needs location/API key      | ⏳     |
| C1.4 | CompanyLeaderboard     | Check data source           | ⏳     |

## C2. Demo Data Seeding

| #    | Task                                      | Status |
| ---- | ----------------------------------------- | ------ |
| C2.1 | Seed realistic leads (5-10)               | ⏳     |
| C2.2 | Seed claims with various statuses         | ⏳     |
| C2.3 | Seed reports (claim packets, supplements) | ⏳     |
| C2.4 | Seed messages/activity for timeline       | ⏳     |
| C2.5 | Verify demo mode toggle works             | ⏳     |

## C3. Critical Flows — End-to-End Testing

| #    | Flow                                  | Status |
| ---- | ------------------------------------- | ------ |
| C3.1 | Create Lead → Convert to Claim        | ⏳     |
| C3.2 | Upload Photos → Generate Claim Packet | ⏳     |
| C3.3 | Generate Supplement Report            | ⏳     |
| C3.4 | Weather Report Generation             | ⏳     |
| C3.5 | Send Invitation → Accept → Onboard    | ⏳     |

---

# SPRINT D: ONBOARDING & PILOT PAGES

## D1. Onboarding Flow

| #    | Page                          | Status                      |
| ---- | ----------------------------- | --------------------------- | --- |
| D1.1 | `/onboarding` — Type selector | Works but basic UI          | ⏳  |
| D1.2 | `/onboarding/start`           | Check for issues            | ⏳  |
| D1.3 | `/trades/onboarding/*`        | Full trades onboarding flow | ⏳  |
| D1.4 | `/client/[slug]/onboarding`   | Client-side onboarding      | ⏳  |

## D2. Pilot Dashboard Fixes

| #    | Task                                        | Status |
| ---- | ------------------------------------------- | ------ |
| D2.1 | `/settings/pilot` — Modernize UI            | 🔴     |
| D2.2 | Add PageHero with section theme             | ⏳     |
| D2.3 | Replace basic Cards with gradient StatCards | ⏳     |
| D2.4 | Verify feedback API working                 | ⏳     |

---

# SPRINT E: API & SCHEMA HEALTH

## E1. Schema Mismatches (Like reports page had)

| #    | Check                                          | Status |
| ---- | ---------------------------------------------- | ------ |
| E1.1 | ✅ `/analytics/reports` — Fixed schema fields  | ✅     |
| E1.2 | `/analytics/performance` — Check API responses | ⏳     |
| E1.3 | `/dashboard/activity` — Check Prisma queries   | ⏳     |
| E1.4 | Grep for `getDelegate()` usage — audit all     | ⏳     |

## E2. API Route Health

| #    | Endpoint                     | Status              |
| ---- | ---------------------------- | ------------------- |
| E2.1 | `/api/dashboard/stats`       | ✅ Verified working |
| E2.2 | `/api/analytics/claims`      | ⏳                  |
| E2.3 | `/api/analytics/team`        | ⏳                  |
| E2.4 | `/api/feedback`              | ⏳                  |
| E2.5 | `/api/invitations/analytics` | ⏳                  |

---

# SPRINT F: SECURITY & PERFORMANCE

## F1. Security Checks

| #    | Task                                            | Status |
| ---- | ----------------------------------------------- | ------ |
| F1.1 | All routes use `safeOrgContext()` or `withAuth` | ⏳     |
| F1.2 | No raw Prisma without org filtering             | ⏳     |
| F1.3 | Client data isolation verified                  | ⏳     |
| F1.4 | API rate limiting in place                      | ⏳     |

## F2. Performance

| #    | Task                                   | Status |
| ---- | -------------------------------------- | ------ |
| F2.1 | Dashboard loads under 3s               | ⏳     |
| F2.2 | No N+1 queries in analytics            | ⏳     |
| F2.3 | Proper `export const dynamic` on pages | ⏳     |

---

# SPRINT G: POLISH & FINAL TOUCHES

## G1. Visual Consistency

| #    | Task                                   | Status |
| ---- | -------------------------------------- | ------ |
| G1.1 | All PageHero use correct section theme | ⏳     |
| G1.2 | Dark mode works on all pages           | ⏳     |
| G1.3 | Loading states are smooth              | ⏳     |
| G1.4 | Error states are user-friendly         | ⏳     |

## G2. Copy & Labels

| #    | Task                           | Status |
| ---- | ------------------------------ | ------ |
| G2.1 | Page titles consistent         | ⏳     |
| G2.2 | Subtitles descriptive          | ⏳     |
| G2.3 | Button labels action-oriented  | ⏳     |
| G2.4 | Empty states have helpful CTAs | ⏳     |

---

# 🎯 PRIORITY ORDER FOR TONIGHT

## Tier 1: Demo Blockers (Do First)

1. **A2.3** — `/dashboard/activity` UI modernization
2. **A2.4** — `/settings/pilot` UI modernization
3. **A1.2** — `/analytics/dashboard` gradient stat cards
4. **C2** — Seed demo data so widgets show numbers

## Tier 2: Visual Polish

5. **A1.3-A1.8** — Remaining analytics pages
6. **G1** — Visual consistency pass

## Tier 3: E2E Validation

7. **C3** — Critical flow testing
8. **B2** — Route audit

## Tier 4: Hardening

9. **F1** — Security checks
10. **E2** — API health

---

# 📁 FILES MODIFIED TODAY

| File                         | Change                                       | Commit     |
| ---------------------------- | -------------------------------------------- | ---------- |
| `AppSidebar.tsx`             | Moved Analytics Dashboard under Lead Routing | ✅ fd967ce |
| `analytics/reports/page.tsx` | Complete rewrite with correct schema         | ✅ fd967ce |
| `vendor-network/page.tsx`    | Added Vendor Analytics button                | ✅ fd967ce |
| `modelAliases.ts`            | Enabled reportRecord alias                   | ✅ fd967ce |

---

# 📝 NOTES

## Pattern to Follow (Reports Hub Style)

```tsx
// Gradient stat card
<div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
  <div className="flex items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm">
      <Icon className="h-6 w-6 text-blue-600" />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
</div>
```

## Components Available

- `PageContainer` — Wrapper with max-width
- `PageHero` — Header with section theme gradient
- `PageSectionCard` — Section wrapper
- `Button` — Consistent buttons
- Custom `StatCard` — Define per-page for now, could extract to shared

---

**Created:** February 26, 2026  
**Author:** Copilot + Damien  
**Target:** DAU Launch Week

# 🗺️ FINAL ROUTE MAP — Canonical Route Structure

> **Generated:** 2026-03-22  
> **Total page.tsx files:** 353 under `(app)/`  
> **Total API routes:** 647  
> **Nav items:** 67 unique hrefs  
> **Ghost nav links:** 4  
> **Orphan feature pages:** ~45 (no nav entry)

---

## NAV HEALTH STATUS

### 🔴 Ghost Nav Links (nav → 404)

| Nav Href            | Source                 | Fix                                             |
| ------------------- | ---------------------- | ----------------------------------------------- |
| `/ai/video-reports` | CORE_NAV + CONTEXT_NAV | **Remove from nav** (no page exists)            |
| `/maps`             | CORE_NAV               | **Create `/maps/page.tsx`** hub page            |
| `/trades/metrics`   | CONTEXT_NAV            | **Remove from nav** (no page exists)            |
| `/esign/on-site`    | CONTEXT_NAV            | **Remove from nav** (only dynamic child exists) |

### 🟢 Core Features Missing from Nav (Should Add)

| Route            | Feature             | Suggested Nav Location          |
| ---------------- | ------------------- | ------------------------------- |
| `/tasks`         | Task management     | CORE_NAV — Productivity section |
| `/invoices`      | Invoice management  | CORE_NAV — Financial section    |
| `/contracts`     | Contract management | CORE_NAV — Operations section   |
| `/work-orders`   | Work order tracking | CORE_NAV — Operations section   |
| `/clients`       | Client directory    | CORE_NAV — CRM section          |
| `/estimates`     | Estimate builder    | CORE_NAV — Operations section   |
| `/time-tracking` | Time tracking       | CORE_NAV — Operations section   |

---

## CANONICAL ROUTE STRUCTURE

### Tier 1 — Primary Navigation (Sidebar)

```
/dashboard                    ← Home
/claims                       ← Claims hub
  /claims/[claimId]/*         ← Claim detail (26 sub-pages)
/pipeline                     ← Pipeline/CRM
/leads                        ← Lead management
  /leads/[id]/*               ← Lead detail
/contacts                     ← Contact directory
  /contacts/[contactId]       ← Contact detail
/clients                      ← Client directory    ← ADD TO NAV
/reports                      ← Reports hub
  /reports/claims/*           ← Claim reports
  /reports/templates/*        ← Template management
/weather-chains               ← Weather/Storm hub
/maps                         ← Maps hub             ← CREATE PAGE
  /maps/door-knocking         ← Door-knocking
  /maps/map-view              ← General map
  /maps/routes                ← Route planning
/materials                    ← Materials hub
  /materials/estimator        ← Estimator
  /materials/cart              ← Cart
  /materials/orders           ← Orders
/tasks                        ← Task management      ← ADD TO NAV
/estimates                    ← Estimates             ← ADD TO NAV
/invoices                     ← Invoices              ← ADD TO NAV
/contracts                    ← Contracts             ← ADD TO NAV
/work-orders                  ← Work orders           ← ADD TO NAV
/time-tracking                ← Time tracking         ← ADD TO NAV
```

### Tier 2 — Secondary Navigation (Sidebar Sub-sections)

```
/ai/*                         ← AI Tools
  /ai/damage-builder
  /ai/plan
  /ai/tools/depreciation
  /ai/tools/rebuttal
  /ai/tools/supplement        ← ADD TO NAV (siblings are nav'd)
  /ai/mockup                  ← ADD TO NAV
  /ai/roofplan-builder        ← ADD TO NAV
/teams                        ← Team management
  /teams/hierarchy
  /teams/invite
/trades/*                     ← Trades network
/company/connections          ← Connections
/analytics/*                  ← Analytics
  /analytics/dashboard
  /analytics/claims-timeline
  /analytics/performance
/intelligence/dashboard       ← Intelligence
/finance/overview             ← Finance hub
/commissions                  ← Commissions
/smart-docs/*                 ← Smart Documents
  /smart-docs/esign
  /smart-docs/templates
/notifications/delivery       ← Notification settings
```

### Tier 3 — Settings & Config (Settings Menu)

```
/settings/profile
/settings/company
/settings/branding
/settings/team
/settings/billing (→ /settings/subscription)
/settings/integrations
/settings/customer-portal
/settings/security
/settings/permissions
/settings/service-areas
/settings/notifications
/settings/languages
/settings/export
/settings/lead-routing
```

### Tier 4 — System/Internal (No Nav, Intentional)

```
/onboarding/*                 ← Onboarding flow
/getting-started              ← First-time setup
/admin                        ← Admin panel
/system/health                ← Health check
/search                       ← Global search (cmd+K)
/exports/*                    ← Print/export views
/claims-ready-folder/*        ← Claim packet sections
```

### Tier 5 — To Be Removed/Redirected (POST-DAU)

```
/billing              → /settings/billing
/account/billing      → /settings/billing
/team                 → /teams
/connections          → /company/connections
/inbox                → /messages
/report-workbench     → /reports
/reports/hub          → /reports
/storm-center         → /weather-chains
/performance          → /analytics/performance
/financial/reports    → /finance/overview
/scope-editor         → /estimates
/damage/new           → /ai/damage-builder
/damage/new-wizard    → /ai/damage-builder
/claims/appeal        → /claims/appeal-builder
/claims/ready         → /claims-ready-folder
/integrations         → /settings/integrations
/quick-dol            → (remove)
/box-summary          → (remove)
/correlate/new        → (remove)
/builder              → (remove)
/demo-script          → (remove in prod)
/deployment-proof     → (remove in prod)
```

---

## API ROUTE STRUCTURE (647 routes)

### Well-Organized Domains

```
/api/claims/[claimId]/*       ← 35 routes, well-structured
/api/weather/*                ← 12 routes
/api/ai/*                     ← 18 routes
/api/settings/*               ← 7 routes
/api/branding/*               ← 6 routes
/api/messages/*               ← 7 routes
/api/portal/*                 ← 12 routes
/api/cron/*                   ← 8 routes
/api/intel/*                  ← 6 routes
```

### Needs Consolidation (POST-DAU)

```
/api/clients/*                ← 8 routes (overlaps with /api/portal/*)
/api/vendors/*                ← 4 routes (overlaps with /api/trades/*)
/api/notifications/*          ← 3 routes (fix orgId first)
/api/migrations/*             ← 6 routes (one-time use, can archive)
```

---

## CRON ROUTE HEALTH (10 declared)

| Cron Path                        | Handler   | Method                  | Status          |
| -------------------------------- | --------- | ----------------------- | --------------- |
| `/api/wallet/reset-monthly`      | ✅ Exists | 🔴 POST (should be GET) | Fix in Sprint 1 |
| `/api/weather/cron-daily`        | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/trials/sweep`         | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/email-retry`          | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/stripe-reconcile`     | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/user-columns`         | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/check-email-delivery` | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/process-batch-jobs`   | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/daily`                | ✅ Exists | ✅ GET                  | 🟢              |
| `/api/cron/orphan-cleanup`       | ✅ Exists | ✅ GET                  | 🟢              |

**9/10 healthy. 1 method mismatch (wallet/reset-monthly).**

---

## PRE-DAU NAV ACTIONS (Sprint 1 + Sprint 4)

### Sprint 1 (Immediate)

1. Remove `/ai/video-reports` from nav
2. Create `/maps/page.tsx` hub page
3. Remove `/trades/metrics` from context nav
4. Remove or fix `/esign/on-site` context nav

### Sprint 4 (Before DAU)

5. Add `/tasks` to CORE_NAV
6. Add `/invoices` to CORE_NAV
7. Add `/contracts` to CORE_NAV
8. Add `/work-orders` to CORE_NAV
9. Add `/clients` to CORE_NAV
10. Add `/estimates` to CORE_NAV

> **POST-DAU:** Full route consolidation per unified-system-map.md

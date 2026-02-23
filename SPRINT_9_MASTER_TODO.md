# SPRINT 9 — MASTER TODO & ROUTE CONVERSION TRACKER

> Generated: 2026-02-23 | Commit: `c5d4842`
> Sprint 9 focus: Convert 10 highest-traffic routes to `withAuth`
> Previous: Sprint 8c (report pipeline auth — 9 routes)

---

## ✅ COMPLETED — Sprint 9 (This Session)

### Dashboard Routes (4) — 🔴 CRITICAL FIX
All 4 dashboard routes had the **`user.id` fallback bug** — when `publicMetadata.orgId` was missing, they used Clerk `userId` as `orgId` in Prisma queries, matching zero records and showing all-zero stats.

- [x] `dashboard/stats/route.ts` — `currentUser()` → `withAuth` (243→180 lines, removed 60-line fallback chain)
- [x] `dashboard/kpis/route.ts` — `currentUser()` → `withAuth` (removed `user.id` fallback)
- [x] `dashboard/activities/route.ts` — `currentUser()` → `withAuth` (removed `user.id` fallback)
- [x] `dashboard/charts/route.ts` — `currentUser()` → `withAuth` (removed `user.id` fallback + fixed unsafe `error.message`)

### Billing Routes (4) — 🔴 CRITICAL FIX
- [x] `billing/status/route.ts` — `auth()` → `withAuth` (was using `clerkOrgId` raw → `prisma.org.findFirst({ where: { clerkOrgId } })` which fails when no active Clerk org)
- [x] `billing/seats/route.ts` — `auth()` → `withAuth` (eliminated manual `user_organizations` lookup, fixed unsafe `error?.message`)
- [x] `billing/info/route.ts` — `auth()` → `withAuth` (eliminated 15 lines of manual clerkOrgId resolution + membership check — withAuth does this automatically)
- [x] `billing/portal/route.ts` — `auth()` → `withAuth` (eliminated manual clerkOrgId resolution + membership check)

### Trades/Onboard (1) — 🔴 CRITICAL DATA CORRUPTION FIX
- [x] `trades/onboard/route.ts` — `auth()` → `withAuth` (**was writing raw Clerk `org_2xxx` string directly into `contractors.orgId` DB column**)

### Team Posts (1) — Standard Fix
- [x] `team/posts/route.ts` — `auth()` → `withAuth` (GET + POST, userId-scoped)

### Triaged as Safe (not converted, already semi-canonical)
- [x] `claims/route.ts` — Already uses `withOrgScope` (proper org resolution via tenant.ts)
- [x] `leads/route.ts` — Uses `getCurrentUserPermissions()` → `getActiveOrgContext()` (semi-canonical)

---

## 🔴 P0 — CRITICAL REMAINING

### 1. Trades Routes Still on Raw `auth()` (13 routes)
These are the entire trades/network hub — high traffic, some with orgId mismatches:

| Route | Auth | orgId Risk | Priority |
|-------|------|-----------|----------|
| `trades/route.ts` | `auth()` | Returns ALL contractors, no org scoping | 🔴 |
| `trades/feed/route.ts` | `auth()` | userId-only (cross-org by design) | 🟡 |
| `trades/feed/engage/route.ts` | `auth()` | userId-only | 🟡 |
| `trades/posts/route.ts` | `auth()` | userId-only (cross-org by design) | 🟡 |
| `trades/[id]/route.ts` | `auth()` | Company membership check ✓ | 🟡 |
| `trades/actions/route.ts` | `auth()` | userId-only (cross-org by design) | 🟡 |
| `trades/companies/route.ts` | `auth()` | No orgId (marketplace) | 🟢 |
| `trades/companies/search/route.ts` | `auth()` | No orgId (marketplace search) | 🟢 |
| `trades/company/actions/route.ts` | `auth()` | Membership-verified ✓ | 🟡 |
| `trades/company/join-requests/route.ts` | `auth()` | Admin check ✓ | 🟡 |
| `trades/connections/route.ts` | `auth()` | userId-scoped (cross-org) | 🟢 |
| `trades/connections/actions/route.ts` | `auth()` | userId-scoped | 🟢 |
| `trades/profile/route.ts` | `auth()` + `currentUser()` | `error.stack` leaked in 500 | 🟡 |
| `trades/profile/actions/route.ts` | `auth()` | userId-scoped | 🟢 |
| `trades/profile/[id]/route.ts` | `auth()` | Public profile view (auth optional) | 🟢 |
| `trades/onboarding/route.ts` | `auth()` + `currentUser()` | Large file (644 lines) | 🟡 |
| `trades/jobs/route.ts` | `auth()` | Requires orgId from Clerk | 🟡 |
| `trades/membership/route.ts` | `auth()` | userId-scoped | 🟢 |
| `trades/reviews/route.ts` | `auth()` | `error.message` + `error.stack` leaked | 🟡 |
| `trades/groups/route.ts` | `auth()` | Cross-org by design | 🟢 |

### 2. Export Route Uses Mock Data
- [ ] `reports/[reportId]/export/route.ts` — Uses `useReportBranding()`, `useReportClaimData()` etc. which are mock/placeholder data providers. Needs real DB queries.

### 3. Report Generate — No PDF Generation Pipeline
- [ ] `reports/generate/route.ts` — Creates `reports` DB record but `pdfUrl` is always null. Needs actual PDF generation (html-pdf, puppeteer, or react-pdf).

---

## 🟡 P1 — HIGH PRIORITY

### 4. AI Routes (12 routes)
| Route | Auth | Risk |
|-------|------|------|
| `ai/assistant/route.ts` | Clerk (Sprint 8 fixed streaming) | Low — streaming works |
| `ai/run/route.ts` | `auth()` | Medium |
| `ai/3d/route.ts` | `auth()` | Low |
| `ai/agents/route.ts` | `auth()` | Low |
| `ai/chat/route.ts` | `currentUser()` | Medium — slow |
| `ai/claim-assistant/route.ts` | `auth()` | Medium |
| `ai/claim-writer/route.ts` | `currentUser()` | Medium — slow |
| `ai/domain/route.ts` | `auth()` | Low |
| `ai/inspect/route.ts` | `currentUser()` | Medium — slow |
| `ai/retail-assistant/route.ts` | `auth()` | Low |
| `ai/video/route.ts` | `auth()` | Low |
| `ai/analyze-damage/route.ts` | `currentUser()` | Medium — slow |

### 5. Template Routes (4 remaining)
- [ ] `templates/[templateId]/pdf/route.ts` — `auth()`
- [ ] `templates/list/route.ts` — `auth()`
- [ ] `templates/my-templates/route.ts` — `auth()`
- [ ] `templates/route.ts` — `currentUser()`

### 6. Portal / Client Routes (20+ routes)
- [ ] All `portal/*` routes — separate user flow, lower priority
- [ ] `client/claims/route.ts`, `client/connect/route.ts`, etc.

### 7. Branding Routes (4)
- [ ] `branding/route.ts` — `auth()`
- [ ] `branding/save/route.ts` — `currentUser()`
- [ ] `branding/status/route.ts` — `auth()`
- [ ] `branding/upload/route.ts` — `auth()`

---

## 🟢 P2 — MEDIUM PRIORITY (Polish & Hardening)

### 8. `currentUser()` Performance (30+ routes)
`currentUser()` makes a full Clerk API call per request (~200-400ms). Should be replaced with `withAuth` which uses cached session data.

**Priority targets:**
- `dashboard/*` — ✅ DONE (Sprint 9)
- AI routes using `currentUser()` — 4 routes
- `branding/save/route.ts`
- `templates/route.ts`

### 9. Unsafe Error Handling Audit
Found 7+ routes with `error.message` without `instanceof Error` guard:
- [x] `dashboard/stats/route.ts` — FIXED (Sprint 9)
- [x] `dashboard/charts/route.ts` — FIXED (Sprint 9)
- [x] `billing/seats/route.ts` — FIXED (Sprint 9)
- [ ] `trades/profile/route.ts` — `error.stack` leaked in 500 response
- [ ] `trades/reviews/route.ts` — `error.message` + fragile check
- [ ] `claims/route.ts` — `error.message` in POST catch without instanceof
- [ ] `claims/[claimId]/workspace/route.ts` — `error.stack` leaked in 500

### 10. Missing E2E Test Coverage
- [ ] Report Builder E2E (select claim → select template → preview → generate)
- [ ] Template marketplace → add to org → appears in PDF builder
- [ ] Live feed post → appears in feed → like → unlike
- [ ] Client portal claim submission flow
- [ ] Billing subscription flow
- [ ] Dashboard data validation (verify stats match actual DB counts)

### 11. Notification/Message Routes (12+ routes)
- [ ] All `notifications/*` routes use raw `auth()` or `currentUser()`
- [ ] All `messages/*` routes (6+ routes) use raw `auth()`

---

## 📊 METRICS — Sprint 9 Progress

| Category | withAuth | Raw auth() | currentUser() | Total | Status |
|----------|----------|------------|---------------|-------|--------|
| Reports | **9** ✅ | 0 | 0 | 9 | ✅ Complete |
| Templates (CRUD) | **8** ✅ | 4 | 1 | 13 | 🟡 4 remaining |
| Dashboard | **4** ✅ | 0 | 0 | 4 | ✅ Complete |
| Billing | **4** ✅ | 0 | 0 | 4 | ✅ Complete |
| Claims | 6 + OrgScope | **1** | 0 | ~13 | 🟡 Semi-safe |
| Leads | 4 + Perms | **1** | 0 | ~9 | 🟡 Semi-safe |
| AI | 4 | **8** | **4** | 16 | 🔴 Needs work |
| Trades | 4 | **16** | **2** | 22 | 🔴 Needs work |
| Team | **1** ✅ | 0 | 0 | 1 | ✅ Complete |
| Portal | 0 | **20+** | **5+** | 25+ | 🔴 Deferred |
| Other | ~89 | ~76 | ~12 | ~177 | 🟡 Ongoing |
| **TOTAL** | **~133** | **~126** | **~24** | **~283** | |

**Sprint 9 Progress:** +10 routes converted (4 dashboard + 4 billing + trades/onboard + team/posts)
**Cumulative:** 133 routes now on canonical `withAuth` (up from 125 pre-Sprint 9)
**Net boilerplate removed:** 139 lines eliminated this sprint

---

## 🎯 RECOMMENDED NEXT SPRINT (Sprint 10)

**Priority:** AI routes (4 `currentUser()` targets) + template gaps + error handling audit

1. Convert 4 AI routes using `currentUser()` → `withAuth` (performance win)
2. Convert 4 remaining template routes
3. Fix `error.stack` leaks in trades/profile and claims/workspace
4. Fix `error.message` unsafe access in 4+ routes
5. Start real PDF generation pipeline (reports/generate)

**Estimated effort:** ~2-3 hours for route conversions, ~4-6 hours for PDF pipeline.

---

## 🔍 AI AGENT FINDINGS — Validated

The AI testing agent's report identified several issues. Here's the validation:

| Finding | Status | Action |
|---------|--------|--------|
| Dashboard shows zero data | ✅ FIXED (Sprint 9) | `currentUser()` → `withAuth` |
| Billing status unreliable | ✅ FIXED (Sprint 9) | `auth()` → `withAuth` |
| trades/onboard corrupts data | ✅ FIXED (Sprint 9) | Raw Clerk orgId → DB UUID |
| 26 trades/template routes raw auth | 🟡 Known backlog | Sprint 10+ |
| 7 unsafe error.message accesses | 🟡 3 fixed, 4 remaining | Sprint 10 |
| Report preview AUTH_REQUIRED | ✅ FIXED (Sprint 8c) | Full rewrite |
| AI Assistant 502 | ✅ FIXED (Sprint 8) | Streaming + gpt-4o-mini |
| Template dropdown blank | ✅ FIXED (Sprint 8) | Org resolution |

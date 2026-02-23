# SPRINT 8c — MASTER REGRESSION TODO

> Generated: 2026-02-23 | Commit base: `737436c` (Sprint 8b)
> Sprint 8c changes: Report pipeline auth fix (8 routes → withAuth) + preview context rewrite

---

## ✅ COMPLETED (Sprint 8c — This Session)

### Report Pipeline Auth Fix

- [x] `reports/preview/route.ts` — Rewrote from `auth()` → `withAuth`, removed ghost `/api/reports/context` dependency, built inline context gathering (claim, property, org branding, template, media, damage findings, weather, scopes)
- [x] `reports/actions/route.ts` — `auth()` → `withAuth`, removed manual `clerkOrgId → org.id` resolution
- [x] `reports/[reportId]/route.ts` — GET+DELETE → `withAuth`, removed manual org resolution
- [x] `reports/[reportId]/actions/route.ts` — `auth()` → `withAuth`, removed manual org resolution
- [x] `reports/[reportId]/ai/[sectionKey]/route.ts` — GET+POST → `withAuth`, fixed unsafe `error.message`
- [x] `reports/[reportId]/export/route.ts` — `auth()` → `withAuth`, fixed unsafe `error.message`, fixed `error.stack` leak
- [x] `reports/route.ts` — `getActiveOrgContext()` → `withAuth`, fixed unsafe `error.message`
- [x] `pdf-builder/page.tsx` — Fixed `handleGenerate` (was expecting PDF blob, now handles JSON response + redirect), removed phantom `PreviewResult.template.id` field, added `aiNotes` passthrough
- [x] TypeScript clean compile (0 errors)

---

## 🔴 P0 — CRITICAL (Blocking core CRM workflows)

### 1. Auth Pattern: 248 routes still use raw Clerk `auth()` / `currentUser()`

**Risk:** orgId mismatch — Clerk returns `org_2xxx` format, DB expects UUID. Some routes translate via `prisma.org.findUnique({ clerkOrgId })` (works but slow), others use raw orgId in queries (data corruption/silent fail).

**High-priority routes to convert next:**

- [ ] `claims/route.ts` — Main claims list (used on every page load)
- [ ] `claims/[claimId]/workspace/route.ts` — Claim workspace tabs
- [ ] `claims/[claimId]/ai/route.ts` — Claim AI analysis
- [ ] `claims/[claimId]/generate-supplement/route.tsx` — Supplement generation
- [ ] `claims/resume/route.ts` — Resume claim workflow
- [ ] `claims/ai/build/route.ts` — AI claim builder
- [ ] `claims/ai/detect/route.ts` — AI damage detection
- [ ] `leads/route.ts` — Main leads list
- [ ] `leads/[id]/files/route.ts` — Lead file uploads
- [ ] `leads/[id]/timeline/route.ts` — Lead activity timeline
- [ ] `leads/[id]/notes/from-ai/route.ts` — AI-generated notes
- [ ] `team/posts/route.ts` — Team feed (still uses `auth()`)
- [ ] `billing/status/route.ts` — Billing status check
- [ ] `billing/info/route.ts` — Billing info
- [ ] `billing/portal/route.ts` — Stripe portal redirect
- [ ] `billing/seats/route.ts` — Seat management
- [ ] `dashboard/stats/route.ts` — Dashboard KPIs (uses `currentUser()`)
- [ ] `dashboard/kpis/route.ts` — Dashboard KPIs
- [ ] `dashboard/activities/route.ts` — Activity feed
- [ ] `dashboard/charts/route.ts` — Dashboard charts

### 2. Export Route Uses Mock Data

- [ ] `reports/[reportId]/export/route.ts` — Currently uses `useReportBranding()`, `useReportClaimData()` etc. which are mock/placeholder data providers. Needs real DB queries (like preview now does).

### 3. Report Generate Route — No Actual PDF Generation

- [ ] `reports/generate/route.ts` — Creates a `reports` DB record but does NOT actually generate a PDF. `pdfUrl` is always null. Needs PDF generation pipeline (html-pdf, puppeteer, or react-pdf).

### 4. Missing `/api/reports/context` Route

- [x] **RESOLVED** — Preview no longer depends on this ghost route. Context is gathered inline.

---

## 🟡 P1 — HIGH (Affects user experience, not blocking)

### 5. Trades / Network Routes (13 routes still raw auth)

- [ ] `trades/feed/route.ts` — Uses `auth()` (Sprint 8b fixed logic but left auth pattern)
- [ ] `trades/feed/engage/route.ts` — Uses `auth()`
- [ ] `trades/posts/route.ts` — Uses `auth()`
- [ ] `trades/route.ts` — Uses `auth()`
- [ ] `trades/[id]/route.ts` — Uses `auth()`
- [ ] `trades/actions/route.ts` — Uses `auth()`
- [ ] `trades/companies/route.ts` — Uses `auth()`
- [ ] `trades/companies/search/route.ts` — Uses `auth()`
- [ ] `trades/company/actions/route.ts` — Uses `auth()`
- [ ] `trades/connections/route.ts` — Uses `auth()`
- [ ] `trades/connections/actions/route.ts` — Uses `auth()`
- [ ] `trades/profile/route.ts` — Uses `auth()` + `currentUser()`
- [ ] `trades/onboarding/route.ts` — Uses `auth()` + `currentUser()`

### 6. AI Routes (12 routes)

- [ ] `ai/assistant/route.ts` — Sprint 8 fixed streaming but still uses Clerk
- [ ] `ai/run/route.ts` — Uses `auth()`
- [ ] `ai/3d/route.ts` — Uses `auth()`
- [ ] `ai/agents/route.ts` — Uses `auth()`
- [ ] `ai/chat/route.ts` — Uses `currentUser()`
- [ ] `ai/claim-assistant/route.ts` — Uses `auth()`
- [ ] `ai/claim-writer/route.ts` — Uses `currentUser()`
- [ ] `ai/domain/route.ts` — Uses `auth()`
- [ ] `ai/inspect/route.ts` — Uses `currentUser()`
- [ ] `ai/retail-assistant/route.ts` — Uses `auth()`
- [ ] `ai/video/route.ts` — Uses `auth()`
- [ ] `ai/analyze-damage/route.ts` — Uses `currentUser()`

### 7. Portal / Client Routes (20+ routes)

- [ ] All `portal/*` routes use raw `auth()` — these power the homeowner portal
- [ ] `client/claims/route.ts`, `client/connect/route.ts`, etc.
- [ ] Deferred to future sprint — lower traffic, separate user flow

### 8. Branding Routes

- [ ] `branding/route.ts` — Uses `auth()`
- [ ] `branding/save/route.ts` — Uses `currentUser()`
- [ ] `branding/status/route.ts` — Uses `auth()`
- [ ] `branding/upload/route.ts` — Uses `auth()`

---

## 🟢 P2 — MEDIUM (Polish & hardening)

### 9. `currentUser()` Usage (Performance)

- [ ] 30+ routes call `currentUser()` which makes a full Clerk API call per request (slow, ~200-400ms). Should be replaced with `withAuth` which uses cached session data.
- [ ] Priority targets: `dashboard/stats`, `dashboard/kpis`, `dashboard/charts`, `dashboard/activities` — called on every dashboard load.

### 10. Unsafe Error Handling

- [ ] Audit all 248 raw-auth routes for `error.message` without `instanceof Error` check
- [ ] Audit for `error.stack` leaks in production responses

### 11. Template System Gaps

- [ ] `templates/[templateId]/pdf/route.ts` — Still uses `auth()`, not `withAuth`
- [ ] `templates/list/route.ts` — Still uses `auth()`
- [ ] `templates/my-templates/route.ts` — Still uses `auth()`
- [ ] `templates/route.ts` — Uses `currentUser()`

### 12. Notification Routes (6 routes)

- [ ] All `notifications/*` routes use raw `auth()` or `currentUser()`
- [ ] `messages/*` routes (6+ routes) use raw `auth()`

### 13. Missing E2E Test Coverage

- [ ] Report Builder page E2E (select claim → select template → preview → generate)
- [ ] Template marketplace → add to org → appears in PDF builder
- [ ] Live feed post → appears in feed → like → unlike
- [ ] Client portal claim submission flow
- [ ] Billing subscription flow

---

## 📊 METRICS

| Category         | withAuth | Raw auth() | currentUser() | Total    |
| ---------------- | -------- | ---------- | ------------- | -------- |
| Reports          | **9** ✅ | 0          | 0             | 9        |
| Templates (CRUD) | **8** ✅ | 4          | 1             | 13       |
| Claims           | 6        | **7**      | 0             | 13       |
| Leads            | 4        | **5**      | 0             | 9        |
| AI               | 4        | **8**      | **4**         | 16       |
| Trades           | 3        | **13**     | 1             | 17       |
| Billing          | 2        | **5**      | 1             | 8        |
| Dashboard        | 0        | 0          | **4**         | 4        |
| Portal           | 0        | **20+**    | **5+**        | 25+      |
| Other            | ~89      | ~86        | ~15           | ~190     |
| **TOTAL**        | **~125** | **~148**   | **~30**       | **~303** |

**Sprint 8c Progress:** 9 report routes + 8 template routes = **17 routes** now on canonical `withAuth` ✅

---

## 🎯 RECOMMENDED NEXT SPRINT (Sprint 9)

**Priority:** Convert the 20 most-used routes to `withAuth`:

1. `claims/route.ts` (every page load)
2. `dashboard/stats/route.ts` (dashboard homepage)
3. `dashboard/kpis/route.ts` (dashboard homepage)
4. `leads/route.ts` (CRM core)
5. `billing/status/route.ts` (subscription check)
6. `claims/[claimId]/workspace/route.ts` (claim detail)
7. All 13 `trades/*` routes (network hub)
8. Wire real PDF generation in `reports/generate`

**Estimated effort:** ~2-3 hours for the 20 routes, ~4-6 hours for PDF generation pipeline.

# SkaiScraper Pro — Agent QA Test Script (Sprint 24)

**Date:** February 24, 2026
**Commit:** `c93b8d6` (Sprint 24)
**Base URL:** https://skaiscrape.com

---

## Instructions for QA Agent

Test each item in order. For each test:

- Navigate to the URL shown
- Perform the described actions
- Report **✅ PASS**, **❌ FAIL**, or **🛑 BLOCKED** with a screenshot and notes
- If a test fails, capture the exact error message visible on screen
- **TIMEOUT RULE:** If a page takes > 10s to load, mark as FAIL with "timeout" note

**IMPORTANT:** Complete Section 0 first — these verify Sprint 24 fixes.

---

## 🔥 Section 0 — Sprint 24 Regression Tests (HIGHEST PRIORITY — 5 tests)

These verify ALL five fixes from Sprint 24. Test these FIRST.

| ID  | Test                    | Steps                                                            | Expected                                                                                                                                             |
| --- | ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | ⭐ Depreciation page    | Navigate to `/depreciation`                                      | **Depreciation Release Package page renders** with claim selector and generation form. NO "App Error" or "Something went wrong."                     |
| 0.2 | ⭐ Claims analysis tool | Navigate to `/ai/claims-analysis`, select a claim, click Analyze | **Analysis runs or shows a clear error message** (e.g. "Organization context required"). Must NOT show "Unexpected token '<'" JSON parse error.      |
| 0.3 | ⭐ Root redirect        | Navigate to `/` while logged in                                  | **Automatically redirects to `/dashboard`**. Must NOT show the marketing landing page.                                                               |
| 0.4 | ⭐ Map view             | Navigate to `/maps/map-view`                                     | **Page renders with either an interactive map OR a "Map Coming Soon" message**. Must NOT show raw developer error like "Map token missing" or crash. |
| 0.5 | ⭐ Billing page         | Navigate to `/billing`                                           | **Redirects to `/settings/billing`** and renders billing/subscription page. Must NOT return 404.                                                     |

---

## Section 1 — Environment Sanity (3 tests)

| ID  | Test                      | Steps                            | Expected                                       |
| --- | ------------------------- | -------------------------------- | ---------------------------------------------- |
| 1.1 | Site loads                | Navigate to `/dashboard`         | Dashboard page renders with navigation sidebar |
| 1.2 | Auth works                | Check that you are logged in     | Authenticated user session active              |
| 1.3 | No console errors on load | Open browser console if possible | No red errors (yellow warnings OK)             |

## Section 2 — Dashboard & Navigation (5 tests)

| ID  | Test                  | Steps                                                   | Expected                      |
| --- | --------------------- | ------------------------------------------------------- | ----------------------------- |
| 2.1 | Dashboard stats cards | Navigate to `/dashboard`                                | Stats cards display           |
| 2.2 | Sidebar navigation    | Click through: Claims, Leads, Trades, Reports, Settings | Each page loads without error |
| 2.3 | Search page           | Navigate to `/search`, type "test"                      | Search results page renders   |
| 2.4 | Getting started page  | Navigate to `/getting-started`                          | Onboarding checklist renders  |
| 2.5 | Notifications         | Navigate to `/notifications/delivery`                   | Notifications page loads      |

## Section 3 — Claims Core Workflow (10 tests)

| ID   | Test                  | Steps                                                   | Expected                                                          |
| ---- | --------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| 3.1  | Claims list page      | Navigate to `/claims`                                   | Claims table renders                                              |
| 3.2  | Create new claim      | Navigate to `/claims/new`, fill required fields, submit | Claim created, redirected to claim workspace                      |
| 3.3  | Claim workspace loads | Click into any existing claim                           | Workspace renders with tabs                                       |
| 3.4  | Claim sidebar edit    | Edit the Adjuster Name field                            | Field saves, toast confirms                                       |
| 3.5  | Add Client button     | Click "Add Client"                                      | Navigates to client intake or modal opens                         |
| 3.6  | AI Assistant tab      | Click "AI Assistant" tab                                | Chat interface loads                                              |
| 3.7  | Evidence tab          | Click "Evidence" tab                                    | Evidence upload area renders                                      |
| 3.8  | Financial tab         | Click "Financial" tab                                   | Financial analysis renders (totals, depreciation, audit findings) |
| 3.9  | Unauthorized claim    | Navigate to `/claims/invalid-id-12345`                  | "Claim not found" or 404                                          |
| 3.10 | Claims tracker        | Navigate to `/claims/tracker`                           | Kanban pipeline with columns and stats                            |

## Section 4 — Trades Feed (5 tests)

| ID  | Test                 | Steps                                                        | Expected                       |
| --- | -------------------- | ------------------------------------------------------------ | ------------------------------ |
| 4.1 | Trades page loads    | Navigate to `/trades`                                        | Trades dashboard renders       |
| 4.2 | Create a post        | Type "Sprint 24 QA test post", select category, click "Post" | Post appears without error     |
| 4.3 | Post appears in feed | Check feed                                                   | Post visible with correct text |
| 4.4 | Trades network page  | Navigate to `/network/trades`                                | Network page renders           |
| 4.5 | Trades profile       | Navigate to `/trades/profile`                                | Profile page loads             |

## Section 5 — Reports & Templates (7 tests)

| ID  | Test             | Steps                                   | Expected                                      |
| --- | ---------------- | --------------------------------------- | --------------------------------------------- |
| 5.1 | Reports hub      | Navigate to `/reports`                  | Reports page renders                          |
| 5.2 | Report templates | Navigate to `/reports/templates`        | Template gallery shows                        |
| 5.3 | New template     | Navigate to `/reports/templates/new`    | Template editor renders (no sign-in redirect) |
| 5.4 | Edit template    | Click "Edit" on a template              | Template editor opens                         |
| 5.5 | Generate report  | Select claim + template, click Generate | Report generates                              |
| 5.6 | Report history   | Navigate to `/reports/history`          | History table shows                           |
| 5.7 | Report workbench | Navigate to `/report-workbench`         | Workbench page loads                          |

## Section 6 — Leads & CRM (6 tests)

| ID  | Test               | Steps                                         | Expected                        |
| --- | ------------------ | --------------------------------------------- | ------------------------------- |
| 6.1 | Leads list         | Navigate to `/leads`                          | Leads table renders             |
| 6.2 | Create new lead    | Navigate to `/leads/new`, fill fields, submit | Lead created                    |
| 6.3 | Lead notes         | Add note: "Sprint 24 QA test note"            | Note saves, appears in timeline |
| 6.4 | Lead notes persist | Refresh page                                  | Note still appears              |
| 6.5 | CRM pipeline       | Navigate to `/crm/pipelines`                  | Pipeline view renders           |
| 6.6 | Client leads       | Navigate to `/client-leads`                   | Client leads page renders       |

## Section 7 — Crew Manager (5 tests)

| ID  | Test                | Steps                                        | Expected                                     |
| --- | ------------------- | -------------------------------------------- | -------------------------------------------- |
| 7.1 | Crews page loads    | Navigate to `/crews`                         | Crew Manager renders with scheduling buttons |
| 7.2 | Schedule labor      | Click "Schedule Labor", fill form, submit    | Card with "Labor" badge                      |
| 7.3 | Schedule delivery   | Click "Schedule Delivery", fill form, submit | Card with "Delivery" badge                   |
| 7.4 | Edit schedule       | Edit scope of work on a crew card            | Changes saved                                |
| 7.5 | Start/complete work | Click "Start Work" then "Mark Complete"      | Status: Scheduled → In Progress → Completed  |

## Section 8 — Permits (5 tests)

| ID  | Test                 | Steps                                         | Expected                  |
| --- | -------------------- | --------------------------------------------- | ------------------------- |
| 8.1 | Permits page loads   | Navigate to `/permits`                        | Permits table renders     |
| 8.2 | Create new permit    | Use create permit form                        | New permit appears        |
| 8.3 | Click into permit    | Click a permit row                            | Detail editor opens       |
| 8.4 | Edit permit & verify | Change status AND fee, click Save, click Back | List shows updated values |
| 8.5 | Delete permit        | Delete a permit, confirm                      | Permit removed from list  |

## Section 9 — Financial Pages (7 tests)

| ID  | Test                 | Steps                            | Expected                                                 |
| --- | -------------------- | -------------------------------- | -------------------------------------------------------- |
| 9.1 | Financial reports    | Navigate to `/financial/reports` | P&L report renders                                       |
| 9.2 | Date range filter    | Change date range filter         | Report updates                                           |
| 9.3 | Estimates list       | Navigate to `/estimates`         | Estimates page renders                                   |
| 9.4 | Invoices list        | Navigate to `/invoices`          | Invoices table renders                                   |
| 9.5 | Proposals page       | Navigate to `/proposals`         | Proposal Engine loads (no sign-in redirect)              |
| 9.6 | ⭐ Depreciation tool | Navigate to `/depreciation`      | Depreciation Release Package renders with claim selector |
| 9.7 | ⭐ Billing           | Navigate to `/billing`           | Redirects to settings/billing, page renders              |

## Section 10 — Financial Export Buttons (3 tests)

| ID   | Test                     | Steps                                                      | Expected            |
| ---- | ------------------------ | ---------------------------------------------------------- | ------------------- |
| 10.1 | Adjuster report download | On a claim financial tab, click "Download Adjuster Report" | Text file downloads |
| 10.2 | Homeowner summary        | Click "Download Summary (Homeowner)"                       | Text file downloads |
| 10.3 | JSON export              | Click "Export Raw JSON"                                    | JSON file downloads |

## Section 11 — Settings & Commission (4 tests)

| ID   | Test              | Steps                                    | Expected                  |
| ---- | ----------------- | ---------------------------------------- | ------------------------- |
| 11.1 | Settings page     | Navigate to `/settings`                  | Settings page renders     |
| 11.2 | Commission plans  | Navigate to `/settings/commission-plans` | Page loads                |
| 11.3 | Team settings     | Navigate to `/settings/team`             | Team management renders   |
| 11.4 | Branding settings | Navigate to `/settings/branding`         | Branding settings renders |

## Section 12 — AI Tools (4 tests)

| ID   | Test                | Steps                             | Expected                                                                                                 |
| ---- | ------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 12.1 | AI tools grid       | Navigate to `/ai`                 | Grid of AI tools renders                                                                                 |
| 12.2 | Bad faith detection | Navigate to `/ai/bad-faith`       | Tool loads with form                                                                                     |
| 12.3 | ⭐ Claims analysis  | Navigate to `/ai/claims-analysis` | Tool loads with claim selector. Selecting a claim and clicking Analyze should NOT show JSON parse error. |
| 12.4 | Damage builder      | Navigate to `/ai/damage-builder`  | Tool loads                                                                                               |

## Section 13 — Contacts & Clients (4 tests)

| ID   | Test             | Steps                                  | Expected          |
| ---- | ---------------- | -------------------------------------- | ----------------- |
| 13.1 | Contacts list    | Navigate to `/contacts`                | Page renders      |
| 13.2 | Clients list     | Navigate to `/clients`                 | Page renders      |
| 13.3 | Client invite    | Navigate to a claim, use client invite | Invite flow works |
| 13.4 | Invitations page | Navigate to `/invitations`             | Page renders      |

## Section 14 — Maps & Weather (3 tests)

| ID   | Test         | Steps                        | Expected                                             |
| ---- | ------------ | ---------------------------- | ---------------------------------------------------- |
| 14.1 | Weather page | Navigate to `/maps/weather`  | Weather dashboard loads                              |
| 14.2 | ⭐ Map view  | Navigate to `/maps/map-view` | Map renders OR "Map Coming Soon" (NOT a crash/error) |
| 14.3 | Storm center | Navigate to `/storm-center`  | Storm center loads                                   |

## Section 15 — Security & Error Handling (4 tests)

| ID   | Test                   | Steps                                        | Expected                                |
| ---- | ---------------------- | -------------------------------------------- | --------------------------------------- |
| 15.1 | Invalid claim ID       | Navigate to `/claims/aaaa-bbbb-cccc-invalid` | Sanitized "Claim not found"             |
| 15.2 | API error sanitization | Check error messages on any failure          | Generic error, no stack traces          |
| 15.3 | ⭐ Root redirect       | Navigate to `/` while authenticated          | Redirects to `/dashboard` automatically |
| 15.4 | Tracker error boundary | If tracker page errors, check UI             | "Claims Tracker Unavailable" with retry |

## Section 16 — Extended Route Coverage (12 tests)

| ID    | Test         | Steps                       | Expected                      |
| ----- | ------------ | --------------------------- | ----------------------------- |
| 16.1  | Appointments | Navigate to `/appointments` | Page renders                  |
| 16.2  | ⭐ Billing   | Navigate to `/billing`      | Redirects to settings/billing |
| 16.3  | Compliance   | Navigate to `/compliance`   | Page renders                  |
| 16.4  | Work orders  | Navigate to `/work-orders`  | Page renders                  |
| 16.5  | Materials    | Navigate to `/materials`    | Page renders                  |
| 16.6  | Commissions  | Navigate to `/commissions`  | Page renders                  |
| 16.7  | Tasks        | Navigate to `/tasks`        | Page renders                  |
| 16.8  | Inbox        | Navigate to `/inbox`        | Page renders                  |
| 16.9  | Inspections  | Navigate to `/inspections`  | Page renders                  |
| 16.10 | Scopes       | Navigate to `/scopes`       | Page renders                  |
| 16.11 | Analytics    | Navigate to `/analytics`    | Page renders                  |
| 16.12 | Operations   | Navigate to `/operations`   | Page renders                  |

## Section 17 — Supplementary & Pro Features (10 tests)

| ID    | Test           | Steps                         | Expected     |
| ----- | -------------- | ----------------------------- | ------------ |
| 17.1  | Supplements    | Navigate to `/supplements`    | Page renders |
| 17.2  | Jobs           | Navigate to `/jobs`           | Page renders |
| 17.3  | Pipeline       | Navigate to `/pipeline`       | Page renders |
| 17.4  | Vendor network | Navigate to `/vendor-network` | Page renders |
| 17.5  | Time tracking  | Navigate to `/time-tracking`  | Page renders |
| 17.6  | Templates      | Navigate to `/templates`      | Page renders |
| 17.7  | Marketplace    | Navigate to `/marketplace`    | Page renders |
| 17.8  | Pro page       | Navigate to `/pro`            | Page renders |
| 17.9  | Contracts      | Navigate to `/contracts`      | Page renders |
| 17.10 | Performance    | Navigate to `/performance`    | Page renders |

## Section 18 — Advanced AI & Intelligence (5 tests)

| ID   | Test             | Steps                           | Expected     |
| ---- | ---------------- | ------------------------------- | ------------ |
| 18.1 | Intelligence hub | Navigate to `/intelligence`     | Page renders |
| 18.2 | Vision Lab       | Navigate to `/vision-lab`       | Page renders |
| 18.3 | Smart docs       | Navigate to `/smart-docs`       | Page renders |
| 18.4 | AI proposals     | Navigate to `/ai-proposals`     | Page renders |
| 18.5 | AI video reports | Navigate to `/ai-video-reports` | Page renders |

## Section 19 — Account & Team Management (5 tests)

| ID   | Test         | Steps                       | Expected     |
| ---- | ------------ | --------------------------- | ------------ |
| 19.1 | Account page | Navigate to `/account`      | Page renders |
| 19.2 | Team page    | Navigate to `/team`         | Page renders |
| 19.3 | Help page    | Navigate to `/help`         | Page renders |
| 19.4 | Company page | Navigate to `/company`      | Page renders |
| 19.5 | Integrations | Navigate to `/integrations` | Page renders |

---

## Scoring

| Category                                | Tests                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------- |
| **Total tests**                         | **112**                                                                 |
| **Sprint 24 fixes (MUST VERIFY FIRST)** | ⭐ 0.1-0.5 (depreciation, claims-analysis, root redirect, map, billing) |
| **Critical for DAU**                    | Sections 1-6, 10, 15                                                    |
| **Revenue features**                    | Sections 7-9                                                            |
| **Extended coverage**                   | Sections 16-19                                                          |

### Expected Results

- **PASS:** 95+
- **BLOCKED:** Max 10 (file downloads, DevTools, env-specific)
- **FAIL:** 0 target

### Priority Order for Time-Limited Sessions

1. **⭐ Section 0 — Sprint 24 Fixes (5 tests)** — MUST verify all 5 fixes
2. **Sections 1-3 — Core (18 tests)** — Auth, Dashboard, Claims
3. **Sections 4-6 — CRM (18 tests)** — Trades, Reports, Leads
4. **Sections 7-9 — Revenue (17 tests)** — Crews, Permits, Financial
5. **Sections 10-15 — Settings, AI, Security (22 tests)**
6. **Sections 16-19 — Extended routes (32 tests)**

### Deployment Note

If Map View (0.4/14.2) shows "Map Coming Soon" instead of an interactive map, the `NEXT_PUBLIC_MAPBOX_TOKEN` env var needs to be added in the Vercel dashboard. This is a deployment config item, not a code bug.

### Escalation

If any ⭐ test FAILS, that is a **P0 regression**. Report immediately with:

- Screenshot
- URL in browser bar
- Exact error message
- Console errors if visible

# SkaiScraper Pro — Agent QA Test Script (Sprint 23)

**Date:** February 24, 2026
**Commit:** `3936c86` (Sprint 23)
**Base URL:** https://skaiscrape.com

---

## Instructions for QA Agent

Test each item in order. For each test:

- Navigate to the URL shown
- Perform the described actions
- Report **✅ PASS**, **❌ FAIL**, or **🛑 BLOCKED** with a screenshot and notes
- If a test fails, capture the exact error message visible on screen
- **TIMEOUT RULE:** If a page takes > 10s to load, mark as FAIL with "timeout" note

**IMPORTANT:** Some tests require data from previous tests. Complete them in order within each section.

---

## 🔥 Section 0 — Sprint 23 Regression Tests (HIGHEST PRIORITY)

Test these FIRST. These verify the two fixes from QA Sprint 22 failures.

| ID  | Test                    | Steps                                                                                                                                                              | Expected                                                                                                                         |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | ⭐ Permit edit persists | Navigate to `/permits`, click a permit, change the Status dropdown (e.g. to "Approved") and change the Fee, click **Save Changes**, then click **Back to Permits** | **List view shows the UPDATED status and fee**, NOT the old values. Toast "Permit updated successfully" should appear on save.   |
| 0.2 | ⭐ Proposals page loads | Navigate to `/proposals`                                                                                                                                           | **Proposal Engine page renders** with creation form and recent proposals list. Must NOT redirect to "Pro Login" or sign-in page. |
| 0.3 | ⭐ New report template  | Navigate to `/reports/templates/new`                                                                                                                               | Template editor renders. Must NOT redirect to sign-in.                                                                           |

---

## Section 1 — Environment Sanity (3 tests)

| ID  | Test                      | Steps                            | Expected                                       |
| --- | ------------------------- | -------------------------------- | ---------------------------------------------- |
| 1.1 | Site loads                | Navigate to `/dashboard`         | Dashboard page renders with navigation sidebar |
| 1.2 | Auth works                | Check that you are logged in     | Authenticated user session active              |
| 1.3 | No console errors on load | Open browser console if possible | No red errors (yellow warnings OK)             |

## Section 2 — Dashboard & Navigation (5 tests)

| ID  | Test                  | Steps                                                   | Expected                                          |
| --- | --------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| 2.1 | Dashboard stats cards | Navigate to `/dashboard`                                | Stats cards display (claims count, revenue, etc.) |
| 2.2 | Sidebar navigation    | Click through: Claims, Leads, Trades, Reports, Settings | Each page loads without white screen or error     |
| 2.3 | Search page           | Navigate to `/search`, type "test"                      | Search results page renders                       |
| 2.4 | Getting started page  | Navigate to `/getting-started`                          | Onboarding checklist renders                      |
| 2.5 | Notifications         | Navigate to `/notifications/delivery`                   | Notifications page loads                          |

## Section 3 — Claims Core Workflow (10 tests)

| ID   | Test                  | Steps                                                   | Expected                                                                                                                    |
| ---- | --------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | Claims list page      | Navigate to `/claims`                                   | Claims table renders with data or empty state                                                                               |
| 3.2  | Create new claim      | Navigate to `/claims/new`, fill required fields, submit | Claim created, redirected to claim workspace                                                                                |
| 3.3  | Claim workspace loads | Click into any existing claim                           | Workspace renders with tabs (Overview, Evidence, Financial, AI)                                                             |
| 3.4  | Claim sidebar edit    | Edit the Adjuster Name field                            | Field saves, toast confirms                                                                                                 |
| 3.5  | Add Client button     | Click "Add Client"                                      | Navigates to client intake or modal opens                                                                                   |
| 3.6  | AI Assistant tab      | Click "AI Assistant" tab                                | Chat interface loads                                                                                                        |
| 3.7  | Evidence tab          | Click "Evidence" tab                                    | Evidence upload area renders                                                                                                |
| 3.8  | Financial tab         | Click "Financial" tab                                   | Financial analysis section renders with Settlement Projection, Totals, Summary, Depreciation, and Audit Findings. No error. |
| 3.9  | Unauthorized claim    | Navigate to `/claims/invalid-id-12345`                  | "Claim not found" page or 404                                                                                               |
| 3.10 | Claims tracker        | Navigate to `/claims/tracker`                           | Pipeline board renders with Kanban columns (Filed, In Review, Approved) and stats cards.                                    |

## Section 4 — Trades Feed (5 tests)

| ID  | Test                 | Steps                                                        | Expected                       |
| --- | -------------------- | ------------------------------------------------------------ | ------------------------------ |
| 4.1 | Trades page loads    | Navigate to `/trades`                                        | Trades dashboard renders       |
| 4.2 | Create a post        | Type "Sprint 23 QA test post", select category, click "Post" | Post appears without error     |
| 4.3 | Post appears in feed | Check feed                                                   | Post visible with correct text |
| 4.4 | Trades network page  | Navigate to `/network/trades`                                | Network page renders           |
| 4.5 | Trades profile       | Navigate to `/trades/profile`                                | Profile page loads             |

## Section 5 — Reports & Templates (7 tests)

| ID  | Test             | Steps                                   | Expected                                 |
| --- | ---------------- | --------------------------------------- | ---------------------------------------- |
| 5.1 | Reports hub      | Navigate to `/reports`                  | Reports page renders                     |
| 5.2 | Report templates | Navigate to `/reports/templates`        | Template gallery shows                   |
| 5.3 | Template actions | Open action menu on a template card     | Menu shows options (Preview, Edit, etc.) |
| 5.4 | Edit template    | Click "Edit Template"                   | Navigates to template editor             |
| 5.5 | Generate report  | Select claim + template, click Generate | Report generates or shows generation UI  |
| 5.6 | Report history   | Navigate to `/reports/history`          | History table shows                      |
| 5.7 | Report workbench | Navigate to `/report-workbench`         | Workbench page loads                     |

## Section 6 — Leads & CRM (6 tests)

| ID  | Test               | Steps                                         | Expected                        |
| --- | ------------------ | --------------------------------------------- | ------------------------------- |
| 6.1 | Leads list         | Navigate to `/leads`                          | Leads table renders             |
| 6.2 | Create new lead    | Navigate to `/leads/new`, fill fields, submit | Lead created                    |
| 6.3 | Lead notes         | Add note: "Sprint 23 QA test note"            | Note saves, appears in timeline |
| 6.4 | Lead notes persist | Refresh page                                  | Note still appears              |
| 6.5 | CRM pipeline       | Navigate to `/crm/pipelines`                  | Pipeline view renders           |
| 6.6 | Client leads       | Navigate to `/client-leads`                   | Client leads page renders       |

## Section 7 — Crew Manager (5 tests)

| ID  | Test                | Steps                                        | Expected                                                                   |
| --- | ------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| 7.1 | Crews page loads    | Navigate to `/crews`                         | Crew Manager renders with "Schedule Labor" and "Schedule Delivery" buttons |
| 7.2 | Schedule labor      | Click "Schedule Labor", fill form, submit    | Card appears with "Labor" badge                                            |
| 7.3 | Schedule delivery   | Click "Schedule Delivery", fill form, submit | Card appears with "Delivery" badge                                         |
| 7.4 | Edit schedule       | Edit scope of work on a crew card            | Changes saved                                                              |
| 7.5 | Start/complete work | Click "Start Work" then "Mark Complete"      | Status: Scheduled → In Progress → Completed                                |

## Section 8 — Permits (5 tests)

| ID  | Test                            | Steps                                                                         | Expected                                                   |
| --- | ------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 8.1 | Permits page loads              | Navigate to `/permits`                                                        | Permits table renders                                      |
| 8.2 | Create new permit               | Use create permit form                                                        | New permit appears                                         |
| 8.3 | Click into permit               | Click a permit row                                                            | Detail editor opens                                        |
| 8.4 | ⭐ Edit permit & verify persist | Change status AND fee, click **Save Changes**, then click **Back to Permits** | **List shows updated status AND fee. Not the old values.** |
| 8.5 | Delete permit                   | Click "Delete Permit" on the detail page, confirm                             | Permit removed from list                                   |

## Section 9 — Financial Pages (7 tests)

| ID  | Test               | Steps                               | Expected                                                           |
| --- | ------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| 9.1 | Financial reports  | Navigate to `/financial/reports`    | P&L report renders                                                 |
| 9.2 | Date range filter  | Change date range filter            | Report updates                                                     |
| 9.3 | Estimates list     | Navigate to `/estimates`            | Estimates page renders                                             |
| 9.4 | Invoices list      | Navigate to `/invoices`             | Invoices table renders                                             |
| 9.5 | Click into invoice | Click an invoice row (if any exist) | Invoice detail page                                                |
| 9.6 | ⭐ Proposals page  | Navigate to `/proposals`            | Proposal Engine page renders with form. NOT a redirect to sign-in. |
| 9.7 | Depreciation page  | Navigate to `/depreciation`         | Depreciation tool loads                                            |

## Section 10 — Financial Export Buttons (3 tests)

| ID   | Test                       | Steps                                                      | Expected            |
| ---- | -------------------------- | ---------------------------------------------------------- | ------------------- |
| 10.1 | Adjuster report download   | On a claim financial tab, click "Download Adjuster Report" | Text file downloads |
| 10.2 | Homeowner summary download | Click "Download Summary (Homeowner)"                       | Text file downloads |
| 10.3 | JSON export                | Click "Export Raw JSON"                                    | JSON file downloads |

## Section 11 — Settings & Commission (4 tests)

| ID   | Test              | Steps                                    | Expected                    |
| ---- | ----------------- | ---------------------------------------- | --------------------------- |
| 11.1 | Settings page     | Navigate to `/settings`                  | Settings page renders       |
| 11.2 | Commission plans  | Navigate to `/settings/commission-plans` | Commission plans page loads |
| 11.3 | Team settings     | Navigate to `/settings/team`             | Team management renders     |
| 11.4 | Branding settings | Navigate to `/settings/branding`         | Branding settings renders   |

## Section 12 — AI Tools (4 tests)

| ID   | Test                | Steps                             | Expected                 |
| ---- | ------------------- | --------------------------------- | ------------------------ |
| 12.1 | AI tools grid       | Navigate to `/ai`                 | Grid of AI tools renders |
| 12.2 | Bad faith detection | Navigate to `/ai/bad-faith`       | Tool loads with form     |
| 12.3 | Claims analysis     | Navigate to `/ai/claims-analysis` | Tool loads               |
| 12.4 | Damage builder      | Navigate to `/ai/damage-builder`  | Tool loads               |

## Section 13 — Contacts & Clients (4 tests)

| ID   | Test             | Steps                                          | Expected                               |
| ---- | ---------------- | ---------------------------------------------- | -------------------------------------- |
| 13.1 | Contacts list    | Navigate to `/contacts`                        | Contacts page renders                  |
| 13.2 | Clients list     | Navigate to `/clients`                         | Clients page renders                   |
| 13.3 | Client invite    | Navigate to a claim, use client invite feature | Generates tokenized URL or invite flow |
| 13.4 | Invitations page | Navigate to `/invitations`                     | Invitations page renders               |

## Section 14 — Maps & Weather (3 tests)

| ID   | Test         | Steps                        | Expected                |
| ---- | ------------ | ---------------------------- | ----------------------- |
| 14.1 | Weather page | Navigate to `/maps/weather`  | Weather dashboard loads |
| 14.2 | Map view     | Navigate to `/maps/map-view` | Map renders             |
| 14.3 | Storm center | Navigate to `/storm-center`  | Storm center loads      |

## Section 15 — Security & Error Handling (4 tests)

| ID   | Test                   | Steps                                                                               | Expected                               |
| ---- | ---------------------- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| 15.1 | Invalid claim ID       | Navigate to `/claims/aaaa-bbbb-cccc-invalid`                                        | "Claim not found" — no data leaked     |
| 15.2 | API error sanitization | Check error messages on any API failure                                             | Generic error, no stack traces exposed |
| 15.3 | Middleware redirect    | Navigate to `/` while authenticated                                                 | Redirects to `/dashboard`              |
| 15.4 | Tracker error boundary | If tracker page errors, should show "Claims Tracker Unavailable" with retry buttons |

## Section 16 — Extended Route Coverage (12 tests)

| ID    | Test              | Steps                       | Expected     |
| ----- | ----------------- | --------------------------- | ------------ |
| 16.1  | Appointments page | Navigate to `/appointments` | Page renders |
| 16.2  | Billing page      | Navigate to `/billing`      | Page renders |
| 16.3  | Compliance page   | Navigate to `/compliance`   | Page renders |
| 16.4  | Work orders       | Navigate to `/work-orders`  | Page renders |
| 16.5  | Materials page    | Navigate to `/materials`    | Page renders |
| 16.6  | Commissions page  | Navigate to `/commissions`  | Page renders |
| 16.7  | Tasks page        | Navigate to `/tasks`        | Page renders |
| 16.8  | Inbox/Messages    | Navigate to `/inbox`        | Page renders |
| 16.9  | Inspections page  | Navigate to `/inspections`  | Page renders |
| 16.10 | Scopes page       | Navigate to `/scopes`       | Page renders |
| 16.11 | Analytics page    | Navigate to `/analytics`    | Page renders |
| 16.12 | Operations page   | Navigate to `/operations`   | Page renders |

## Section 17 — Supplementary & Pro Features (10 tests)

| ID    | Test             | Steps                         | Expected     |
| ----- | ---------------- | ----------------------------- | ------------ |
| 17.1  | Supplements list | Navigate to `/supplements`    | Page renders |
| 17.2  | Jobs page        | Navigate to `/jobs`           | Page renders |
| 17.3  | Pipeline page    | Navigate to `/pipeline`       | Page renders |
| 17.4  | Vendor network   | Navigate to `/vendor-network` | Page renders |
| 17.5  | Time tracking    | Navigate to `/time-tracking`  | Page renders |
| 17.6  | Templates page   | Navigate to `/templates`      | Page renders |
| 17.7  | Marketplace page | Navigate to `/marketplace`    | Page renders |
| 17.8  | Pro page         | Navigate to `/pro`            | Page renders |
| 17.9  | Contracts page   | Navigate to `/contracts`      | Page renders |
| 17.10 | Performance page | Navigate to `/performance`    | Page renders |

## Section 18 — Advanced AI & Intelligence (5 tests)

| ID   | Test             | Steps                           | Expected     |
| ---- | ---------------- | ------------------------------- | ------------ |
| 18.1 | Intelligence hub | Navigate to `/intelligence`     | Page renders |
| 18.2 | Vision Lab       | Navigate to `/vision-lab`       | Page renders |
| 18.3 | Smart docs       | Navigate to `/smart-docs`       | Page renders |
| 18.4 | AI proposals     | Navigate to `/ai-proposals`     | Page renders |
| 18.5 | AI video reports | Navigate to `/ai-video-reports` | Page renders |

## Section 19 — Account & Team Management (5 tests)

| ID   | Test              | Steps                       | Expected                      |
| ---- | ----------------- | --------------------------- | ----------------------------- |
| 19.1 | Account page      | Navigate to `/account`      | Account settings page renders |
| 19.2 | Team page         | Navigate to `/team`         | Team management page renders  |
| 19.3 | Help page         | Navigate to `/help`         | Help/support page renders     |
| 19.4 | Company page      | Navigate to `/company`      | Company profile renders       |
| 19.5 | Integrations page | Navigate to `/integrations` | Integrations page renders     |

---

## Scoring

| Category                                | Tests                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| **Total tests**                         | **106**                                                                      |
| **Sprint 23 fixes (MUST VERIFY FIRST)** | ⭐ 0.1 (Permit edit persist), ⭐ 0.2 (Proposals page), ⭐ 0.3 (New template) |
| **Re-verification of Sprint 22 fixes**  | 3.8 (Financial tab), 3.10 (Claims tracker)                                   |
| **Critical for DAU**                    | Sections 1-6, 10, 15                                                         |
| **Revenue features**                    | Sections 7-9                                                                 |
| **Extended coverage**                   | Sections 16-19                                                               |

### Expected Results

- **PASS:** 90+
- **BLOCKED:** Max 10 (file downloads, DevTools, env-specific)
- **FAIL:** 0 target

### Priority Order for Time-Limited Sessions

If running short on time, test in this order:

1. **⭐ Section 0 — Sprint 23 Regression Tests (3 tests)** — MUST verify permit edit + proposals + template
2. **Sections 1-3 — Core (18 tests)** — Auth, Dashboard, Claims (includes Financial + Tracker re-test)
3. **Sections 4-6 — CRM (18 tests)** — Trades, Reports, Leads
4. **Sections 7-9 — Revenue (17 tests)** — Crews, Permits (deeper edit test), Financial pages
5. **Sections 10-15 — Settings & Security (22 tests)**
6. **Sections 16-19 — Extended coverage (32 tests)**

### Escalation

If any ⭐ test FAILS, that is a **P0 regression**. Report immediately with:

- Screenshot
- URL in browser bar
- Exact error message
- Console errors if visible

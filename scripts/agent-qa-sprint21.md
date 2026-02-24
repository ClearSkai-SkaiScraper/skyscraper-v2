# SkaiScraper Pro — Agent QA Test Script (Sprint 21)

**Date:** February 24, 2026
**Commit:** `995df5f` (Sprint 21)
**Base URL:** https://skaiscrape.com

---

## Instructions for QA Agent

Test each item in order. For each test:

- Navigate to the URL shown
- Perform the described actions
- Report **✅ PASS**, **❌ FAIL**, or **🛑 BLOCKED** with a screenshot and notes
- If a test fails, capture the exact error message visible on screen

**IMPORTANT:** Some tests require data from previous tests. Complete them in order within each section.

---

## Section 0 — Environment Sanity (3 tests)

| ID  | Test                      | Steps                                                                 | Expected                                       |
| --- | ------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| 0.1 | Site loads                | Navigate to `/dashboard`                                              | Dashboard page renders with navigation sidebar |
| 0.2 | Auth works                | Check that you are logged in (user avatar or name visible in top nav) | Authenticated user session active              |
| 0.3 | No console errors on load | Open browser console if possible                                      | No red errors (yellow warnings OK)             |

---

## Section 1 — Dashboard & Navigation (5 tests)

| ID  | Test                  | Steps                                                        | Expected                                                                                              |
| --- | --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1.1 | Dashboard stats cards | Navigate to `/dashboard`                                     | Stats cards display (Claims, Leads, Trades Posts, Retail Jobs). Values can be 0 but cards must render |
| 1.2 | Sidebar navigation    | Click through: Claims, Leads, Trades, Reports, Settings      | Each page loads without white screen or error                                                         |
| 1.3 | Search page           | Navigate to `/search`, type "test"                           | Search results page renders (may be empty)                                                            |
| 1.4 | Getting started page  | Navigate to `/getting-started`                               | Onboarding checklist or getting started content renders                                               |
| 1.5 | Notifications         | Click the bell icon or navigate to `/notifications/delivery` | Notifications page loads                                                                              |

---

## Section 2 — Claims Core Workflow (10 tests)

| ID   | Test                  | Steps                                                      | Expected                                                           |
| ---- | --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 2.1  | Claims list page      | Navigate to `/claims`                                      | Claims table renders with columns (Claim #, Status, Date, etc.)    |
| 2.2  | Create new claim      | Navigate to `/claims/new`, fill in required fields, submit | Claim created, redirected to claim workspace                       |
| 2.3  | Claim workspace loads | Click into any existing claim                              | Workspace renders with tabs (Overview, Evidence, Financial, etc.)  |
| 2.4  | Claim sidebar edit    | On a claim workspace, edit the Adjuster Name field         | Field saves, toast confirmation appears, value persists on refresh |
| 2.5  | Add Client button     | On a claim workspace, click "Add Client"                   | Navigates to client intake page or form                            |
| 2.6  | AI Assistant tab      | On a claim workspace, click "AI Assistant" tab             | Chat interface loads                                               |
| 2.7  | Evidence tab          | On a claim workspace, click "Evidence" tab                 | Evidence upload area renders (drag-and-drop zone visible)          |
| 2.8  | Financial tab         | On a claim workspace, click "Financial" tab                | Financial analysis section renders with cards                      |
| 2.9  | Unauthorized claim    | Navigate to `/claims/invalid-id-12345`                     | "Claim not found" page renders (no data leak)                      |
| 2.10 | Claim tracker         | Navigate to `/claims/tracker`                              | Tracker page renders (may be empty if no claims)                   |

---

## Section 3 — Trades Feed (PREVIOUSLY FAILING — 5 tests)

| ID  | Test                 | Steps                                                                                              | Expected                                                                                         |
| --- | -------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 3.1 | Trades page loads    | Navigate to `/trades`                                                                              | Trades dashboard renders with feed section                                                       |
| 3.2 | **Create a post**    | In the trades feed composer: type "QA test post from Sprint 21", select any category, click "Post" | **Post appears in the feed without error.** No red error toast. This was the Sprint 18b failure. |
| 3.3 | Post appears in feed | After 3.2, check if the post is visible in the feed                                                | Post with "QA test post from Sprint 21" is shown                                                 |
| 3.4 | Trades network page  | Navigate to `/network/trades`                                                                      | Network page renders with company/posts listings                                                 |
| 3.5 | Trades profile       | Navigate to `/trades/profile`                                                                      | Profile page loads (may show setup prompt if no profile)                                         |

---

## Section 4 — Reports & Templates (7 tests)

| ID  | Test             | Steps                                                                                        | Expected                                                              |
| --- | ---------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 4.1 | Reports hub      | Navigate to `/reports` or `/reports/hub`                                                     | Reports page renders with options                                     |
| 4.2 | Report templates | Navigate to `/reports/templates`                                                             | Template gallery shows available templates                            |
| 4.3 | Template actions | On a template card, open the action menu (⋮ or right-click)                                  | Menu shows: Preview, Edit Template, Duplicate, Set as Default, Remove |
| 4.4 | Edit template    | Click "Edit Template" from the actions menu                                                  | Navigates to template editor page                                     |
| 4.5 | Generate report  | Navigate to `/reports/new` or use Generate button. Select a claim + template, click Generate | Report generates, success toast appears                               |
| 4.6 | Report history   | Navigate to `/reports/history`                                                               | History table shows previously generated reports with status column   |
| 4.7 | Report workbench | Navigate to `/report-workbench`                                                              | Workbench page loads                                                  |

---

## Section 5 — Leads & CRM (6 tests)

| ID  | Test               | Steps                                                         | Expected                                    |
| --- | ------------------ | ------------------------------------------------------------- | ------------------------------------------- |
| 5.1 | Leads list         | Navigate to `/leads`                                          | Leads table renders                         |
| 5.2 | Create new lead    | Navigate to `/leads/new`, fill in name + contact info, submit | Lead created, redirected to lead detail     |
| 5.3 | Lead notes         | On a lead detail page, add a note: "Sprint 21 QA test note"   | Note saves immediately, appears in timeline |
| 5.4 | Lead notes persist | Refresh the lead detail page                                  | The note from 5.3 still appears             |
| 5.5 | CRM pipeline       | Navigate to `/crm/pipelines`                                  | Pipeline view renders (kanban or list)      |
| 5.6 | Client leads       | Navigate to `/client-leads`                                   | Client leads page renders                   |

---

## Section 6 — Crew Manager (NEW Sprint 20 — 5 tests)

| ID  | Test                | Steps                                                                                      | Expected                                                                                            |
| --- | ------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 6.1 | Crews page loads    | Navigate to `/crews`                                                                       | Crew Manager page renders with "Schedule Labor", "Schedule Delivery", "Schedule Inspection" buttons |
| 6.2 | Schedule labor      | Click "Schedule Labor" button, fill form (select claim, date, time, scope of work), submit | Schedule created, card appears on page with blue "Labor" badge                                      |
| 6.3 | Schedule delivery   | Click "Schedule Delivery" button, fill form, submit                                        | Card appears with green "Delivery" badge                                                            |
| 6.4 | Edit schedule       | On any crew card, click edit icon, change scope of work, save                              | Changes saved, toast confirmation, card updates                                                     |
| 6.5 | Start/complete work | On a crew card, click "Start Work", then "Mark Complete"                                   | Status progresses: Scheduled → In Progress → Completed                                              |

---

## Section 7 — Permits (FIXED Sprint 20 — 4 tests)

| ID  | Test               | Steps                                                                 | Expected                                 |
| --- | ------------------ | --------------------------------------------------------------------- | ---------------------------------------- |
| 7.1 | Permits page loads | Navigate to `/permits`                                                | Permits table renders                    |
| 7.2 | Click into permit  | Click on any permit row or permit number link                         | Navigates to `/permits/[id]` detail page |
| 7.3 | Edit permit        | On permit detail page, change status dropdown, update fee, click Save | Changes saved, toast appears             |
| 7.4 | Create new permit  | On permits page, use the create permit form, submit                   | New permit appears in table              |

---

## Section 8 — Financial Pages (FIXED Sprint 20 — 6 tests)

| ID  | Test               | Steps                                  | Expected                                                      |
| --- | ------------------ | -------------------------------------- | ------------------------------------------------------------- |
| 8.1 | Financial reports  | Navigate to `/financial/reports`       | P&L report page renders with date range selector              |
| 8.2 | Date range filter  | Change date range to "Quarter to Date" | Report data updates (may show $0 if no data)                  |
| 8.3 | Estimates list     | Navigate to `/estimates`               | Estimates page renders with stats cards and table             |
| 8.4 | Invoices list      | Navigate to `/invoices`                | Invoices table renders                                        |
| 8.5 | Click into invoice | Click on any invoice row               | Navigates to `/invoices/[id]` detail page with line items     |
| 8.6 | Proposals          | Navigate to `/proposals`               | Proposals page renders (may show empty state if no proposals) |

---

## Section 9 — Financial Export Buttons (FIXED Sprint 21 — 3 tests)

| ID  | Test                       | Steps                                                                             | Expected                                                              |
| --- | -------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 9.1 | Adjuster report download   | On a claim's Financial tab (with analysis data), click "Download Adjuster Report" | Text file downloads with financial totals, audit findings, line items |
| 9.2 | Homeowner summary download | Click "Download Summary (Homeowner)"                                              | Text file downloads with plain-language summary                       |
| 9.3 | JSON export                | Click "Export Raw JSON"                                                           | JSON file downloads with complete analysis data                       |

---

## Section 10 — Settings & Commission (4 tests)

| ID   | Test              | Steps                                    | Expected                                                            |
| ---- | ----------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| 10.1 | Settings page     | Navigate to `/settings`                  | Settings page renders with sections                                 |
| 10.2 | Commission plans  | Navigate to `/settings/commission-plans` | Commission plans page loads with "Create First Plan" button or list |
| 10.3 | Team settings     | Navigate to `/settings/team`             | Team management page renders                                        |
| 10.4 | Branding settings | Navigate to `/settings/branding`         | Branding/white-label settings page renders                          |

---

## Section 11 — AI Tools (4 tests)

| ID   | Test                | Steps                             | Expected                      |
| ---- | ------------------- | --------------------------------- | ----------------------------- |
| 11.1 | AI tools grid       | Navigate to `/ai`                 | Grid of AI tools renders      |
| 11.2 | Bad faith detection | Navigate to `/ai/bad-faith`       | Bad faith analysis tool loads |
| 11.3 | Claims analysis     | Navigate to `/ai/claims-analysis` | Claims analysis tool loads    |
| 11.4 | Damage builder      | Navigate to `/ai/damage-builder`  | Damage builder tool loads     |

---

## Section 12 — Contacts & Clients (4 tests)

| ID   | Test             | Steps                                               | Expected                                   |
| ---- | ---------------- | --------------------------------------------------- | ------------------------------------------ |
| 12.1 | Contacts list    | Navigate to `/contacts`                             | Contacts page renders                      |
| 12.2 | Clients list     | Navigate to `/clients`                              | Clients page renders with list/table       |
| 12.3 | Client invite    | On a claim workspace, use the client invite feature | Generates tokenized URL and shows success  |
| 12.4 | Invitations page | Navigate to `/invitations`                          | Invitations page renders with sent invites |

---

## Section 13 — Maps & Weather (3 tests)

| ID   | Test         | Steps                        | Expected                                    |
| ---- | ------------ | ---------------------------- | ------------------------------------------- |
| 13.1 | Weather page | Navigate to `/maps/weather`  | Weather dashboard loads                     |
| 13.2 | Map view     | Navigate to `/maps/map-view` | Map renders (may need location permissions) |
| 13.3 | Storm center | Navigate to `/storm-center`  | Storm center page loads                     |

---

## Section 14 — Security & Error Handling (3 tests)

| ID   | Test                   | Steps                                                                                   | Expected                                         |
| ---- | ---------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 14.1 | Invalid claim ID       | Navigate to `/claims/aaaa-bbbb-cccc-invalid`                                            | "Claim not found" — no internal data leaked      |
| 14.2 | API error sanitization | Navigate to any page that fetches data. If an API error occurs, check the error message | Generic error message, no stack traces           |
| 14.3 | Middleware redirect    | Navigate to `/` while authenticated                                                     | Redirects to `/dashboard` (not stuck on landing) |

---

## Scoring

| Category                             | Tests                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Total tests                          | 67                                                                                                                       |
| Critical (must pass for DAU)         | Sections 1-5, 9, 14                                                                                                      |
| New features (Sprint 20-21)          | Sections 6, 7, 8, 9                                                                                                      |
| Previously failing (must verify fix) | 3.2 (trades post), 4.3-4.4 (templates), 4.6 (report history), 5.3-5.4 (lead notes), 2.4 (sidebar edit), 2.5 (add client) |

### Expected Results

- **PASS:** 60+
- **BLOCKED:** 0 (no file upload/download required in this script)
- **FAIL:** 0 target

### Escalation

If any test in Sections 1-5 or 14 fails, that is a **P0 blocker** for DAU launch. Report immediately with screenshot and URL.

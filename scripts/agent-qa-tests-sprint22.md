# SkaiScraper Pro — Agent QA Test Script (Sprint 22)

**Date:** February 24, 2026
**Commit:** `76ab258` (Sprint 22)
**Base URL:** https://skaiscrape.com

---

## Instructions for QA Agent

Test each item in order. For each test:
- Navigate to the URL shown
- Perform the described actions
- Report **✅ PASS**, **❌ FAIL**, or **🛑 BLOCKED** with a screenshot and notes
- If a test fails, capture the exact error message visible on screen
- **TIMEOUT RULE:** If a page takes > 10s to load, mark as FAIL with "timeout" note

**IMPORTANT:** Some tests require data from previous tests. Complete them in order within each section. If you get logged out, log back in and resume.

---

## Section 0 — Environment Sanity (3 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 0.1 | Site loads | Navigate to `/dashboard` | Dashboard page renders with navigation sidebar |
| 0.2 | Auth works | Check that you are logged in | Authenticated user session active |
| 0.3 | No console errors on load | Open browser console if possible | No red errors (yellow warnings OK) |

## Section 1 — Dashboard & Navigation (5 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 1.1 | Dashboard stats cards | Navigate to `/dashboard` | Stats cards display (claims count, revenue, etc.) |
| 1.2 | Sidebar navigation | Click through: Claims, Leads, Trades, Reports, Settings | Each page loads without white screen or error |
| 1.3 | Search page | Navigate to `/search`, type "test" | Search results page renders |
| 1.4 | Getting started page | Navigate to `/getting-started` | Onboarding checklist renders |
| 1.5 | Notifications | Navigate to `/notifications/delivery` | Notifications page loads |

## Section 2 — Claims Core Workflow (10 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 2.1 | Claims list page | Navigate to `/claims` | Claims table renders with data or empty state |
| 2.2 | Create new claim | Navigate to `/claims/new`, fill required fields, submit | Claim created, redirected to claim workspace |
| 2.3 | Claim workspace loads | Click into any existing claim | Workspace renders with tabs (Overview, Evidence, Financial, AI) |
| 2.4 | Claim sidebar edit | Edit the Adjuster Name field | Field saves, toast confirms |
| 2.5 | Add Client button | Click "Add Client" | Navigates to client intake or modal opens |
| 2.6 | AI Assistant tab | Click "AI Assistant" tab | Chat interface loads |
| 2.7 | Evidence tab | Click "Evidence" tab | Evidence upload area renders |
| 2.8 | Financial tab ⭐ | Click "Financial" tab | **Financial analysis section renders with: (1) Settlement Projection bar chart, (2) Totals section (RCV Carrier, RCV Contractor, Deductible), (3) Summary paragraph, (4) Depreciation section, (5) Audit Findings. NO "Claims Unavailable" error.** |
| 2.9 | Unauthorized claim | Navigate to `/claims/invalid-id-12345` | "Claim not found" page or 404 |
| 2.10 | Claims tracker ⭐ | Navigate to `/claims/tracker` | **Pipeline board renders with Kanban columns (Filed, In Review, Approved, etc.) and stats cards at top. NO "Claim not found" error.** |

## Section 3 — Trades Feed (5 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 3.1 | Trades page loads | Navigate to `/trades` | Trades dashboard renders |
| 3.2 | Create a post | Type "Sprint 22 QA test post", select category, click "Post" | Post appears without error |
| 3.3 | Post appears in feed | Check feed | Post visible with correct text |
| 3.4 | Trades network page | Navigate to `/network/trades` | Network page renders |
| 3.5 | Trades profile | Navigate to `/trades/profile` | Profile page loads |

## Section 4 — Reports & Templates (7 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 4.1 | Reports hub | Navigate to `/reports` | Reports page renders |
| 4.2 | Report templates | Navigate to `/reports/templates` | Template gallery shows |
| 4.3 | Template actions | Open action menu on a template card | Menu shows options (Preview, Edit, etc.) |
| 4.4 | Edit template | Click "Edit Template" | Navigates to template editor |
| 4.5 | Generate report | Select claim + template, click Generate | Report generates or shows generation UI |
| 4.6 | Report history | Navigate to `/reports/history` | History table shows |
| 4.7 | Report workbench | Navigate to `/report-workbench` | Workbench page loads |

## Section 5 — Leads & CRM (6 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 5.1 | Leads list | Navigate to `/leads` | Leads table renders |
| 5.2 | Create new lead | Navigate to `/leads/new`, fill fields, submit | Lead created |
| 5.3 | Lead notes | Add note: "Sprint 22 QA test note" | Note saves, appears in timeline |
| 5.4 | Lead notes persist | Refresh page | Note still appears |
| 5.5 | CRM pipeline | Navigate to `/crm/pipelines` | Pipeline view renders |
| 5.6 | Client leads | Navigate to `/client-leads` | Client leads page renders |

## Section 6 — Crew Manager (5 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 6.1 | Crews page loads | Navigate to `/crews` | Crew Manager renders with "Schedule Labor" and "Schedule Delivery" buttons |
| 6.2 | Schedule labor | Click "Schedule Labor", fill form, submit | Card appears with blue "Labor" badge |
| 6.3 | Schedule delivery | Click "Schedule Delivery", fill form, submit | Card appears with green "Delivery" badge |
| 6.4 | Edit schedule | Edit scope of work on a crew card | Changes saved |
| 6.5 | Start/complete work | Click "Start Work" then "Mark Complete" | Status: Scheduled → In Progress → Completed |

## Section 7 — Permits (4 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 7.1 | Permits page loads | Navigate to `/permits` | Permits table renders |
| 7.2 | Click into permit | Click a permit row | Navigates to permit detail page |
| 7.3 | Edit permit | Change status/fee, click Save | Changes saved |
| 7.4 | Create new permit | Use create permit form | New permit appears |

## Section 8 — Financial Pages (6 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 8.1 | Financial reports | Navigate to `/financial/reports` | P&L report renders |
| 8.2 | Date range filter | Change date range filter | Report updates |
| 8.3 | Estimates list | Navigate to `/estimates` | Estimates page renders |
| 8.4 | Invoices list | Navigate to `/invoices` | Invoices table renders |
| 8.5 | Click into invoice | Click an invoice row | Invoice detail page |
| 8.6 | Proposals | Navigate to `/proposals` | Proposals page renders |

## Section 9 — Financial Export Buttons (3 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 9.1 | Adjuster report download | On a claim financial tab, click "Download Adjuster Report" | Text file downloads |
| 9.2 | Homeowner summary download | Click "Download Summary (Homeowner)" | Text file downloads |
| 9.3 | JSON export | Click "Export Raw JSON" | JSON file downloads |

## Section 10 — Settings & Commission (4 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 10.1 | Settings page | Navigate to `/settings` | Settings page renders |
| 10.2 | Commission plans | Navigate to `/settings/commission-plans` | Commission plans page loads |
| 10.3 | Team settings | Navigate to `/settings/team` | Team management renders |
| 10.4 | Branding settings | Navigate to `/settings/branding` | Branding settings renders |

## Section 11 — AI Tools (4 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 11.1 | AI tools grid | Navigate to `/ai` | Grid of AI tools renders |
| 11.2 | Bad faith detection | Navigate to `/ai/bad-faith` | Tool loads with form |
| 11.3 | Claims analysis | Navigate to `/ai/claims-analysis` | Tool loads |
| 11.4 | Damage builder | Navigate to `/ai/damage-builder` | Tool loads |

## Section 12 — Contacts & Clients (4 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 12.1 | Contacts list | Navigate to `/contacts` | Contacts page renders |
| 12.2 | Clients list | Navigate to `/clients` | Clients page renders |
| 12.3 | Client invite | Navigate to a claim, use client invite feature | Generates tokenized URL or invite flow |
| 12.4 | Invitations page | Navigate to `/invitations` | Invitations page renders |

## Section 13 — Maps & Weather (3 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 13.1 | Weather page | Navigate to `/maps/weather` | Weather dashboard loads |
| 13.2 | Map view | Navigate to `/maps/map-view` | Map renders |
| 13.3 | Storm center | Navigate to `/storm-center` | Storm center loads |

## Section 14 — Security & Error Handling (4 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 14.1 | Invalid claim ID | Navigate to `/claims/aaaa-bbbb-cccc-invalid` | "Claim not found" — no data leaked |
| 14.2 | API error sanitization | Check error messages on any API failure | Generic error, no stack traces exposed |
| 14.3 | Middleware redirect | Navigate to `/` while authenticated | Redirects to `/dashboard` |
| 14.4 | Tracker error boundary | If tracker fails to load claims, check error UI | Shows "Claims Tracker Unavailable" with Try Again + Claims List buttons (NOT generic "Claims Unavailable") |

---

## NEW — Section 15: Extended Route Coverage (12 tests)

These routes were NOT tested in Sprint 21. Test them now.

| ID | Test | Steps | Expected |
|---|---|---|---|
| 15.1 | Appointments page | Navigate to `/appointments` | Appointments page renders |
| 15.2 | Billing page | Navigate to `/billing` | Billing page renders |
| 15.3 | Compliance page | Navigate to `/compliance` | Compliance page renders |
| 15.4 | Work orders | Navigate to `/work-orders` | Work orders page renders |
| 15.5 | Materials page | Navigate to `/materials` | Materials page renders |
| 15.6 | Commissions page | Navigate to `/commissions` | Commissions page renders |
| 15.7 | Tasks page | Navigate to `/tasks` | Tasks page renders |
| 15.8 | Inbox/Messages | Navigate to `/inbox` | Inbox page renders |
| 15.9 | Inspections page | Navigate to `/inspections` | Inspections page renders |
| 15.10 | Scopes page | Navigate to `/scopes` | Scopes page renders |
| 15.11 | Analytics page | Navigate to `/analytics` | Analytics dashboard renders |
| 15.12 | Operations page | Navigate to `/operations` | Operations page renders |

## NEW — Section 16: Supplementary Features (8 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 16.1 | Supplements list | Navigate to `/supplements` | Supplements table renders |
| 16.2 | Depreciation page | Navigate to `/depreciation` | Depreciation tool loads |
| 16.3 | Jobs page | Navigate to `/jobs` | Jobs list renders |
| 16.4 | Pipeline page | Navigate to `/pipeline` | Pipeline view renders |
| 16.5 | Vendor network | Navigate to `/vendor-network` | Vendor network page renders |
| 16.6 | Time tracking | Navigate to `/time-tracking` | Time tracking page renders |
| 16.7 | Templates page | Navigate to `/templates` | Templates page renders |
| 16.8 | Marketplace page | Navigate to `/marketplace` | Marketplace page renders |

## NEW — Section 17: Advanced AI & Intelligence (5 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 17.1 | Intelligence hub | Navigate to `/intelligence` | Intelligence page renders |
| 17.2 | Vision Lab | Navigate to `/vision-lab` | Vision Lab page renders |
| 17.3 | Smart docs | Navigate to `/smart-docs` | Smart docs page renders |
| 17.4 | AI proposals | Navigate to `/ai-proposals` | AI proposals page renders |
| 17.5 | AI video reports | Navigate to `/ai-video-reports` | Video reports page renders |

## NEW — Section 18: Account & Team Management (5 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 18.1 | Account page | Navigate to `/account` | Account settings page renders |
| 18.2 | Team page | Navigate to `/team` | Team management page renders |
| 18.3 | Help page | Navigate to `/help` | Help/support page renders |
| 18.4 | Company page | Navigate to `/company` | Company profile renders |
| 18.5 | Integrations page | Navigate to `/integrations` | Integrations page renders |

## NEW — Section 19: Pro & Enterprise Features (5 tests)

| ID | Test | Steps | Expected |
|---|---|---|---|
| 19.1 | Pro page | Navigate to `/pro` | Pro features page renders |
| 19.2 | Contracts page | Navigate to `/contracts` | Contracts page renders |
| 19.3 | E-signatures | Navigate to `/esign` | E-sign page renders |
| 19.4 | Directory page | Navigate to `/directory` | Directory renders |
| 19.5 | Performance page | Navigate to `/performance` | Performance dashboard renders |

---

## Scoring

| Category | Tests |
|---|---|
| **Total tests** | **101** |
| **Critical (must pass for DAU)** | Sections 1-5, 9, 14 |
| **Sprint 22 fixes (MUST VERIFY)** | ⭐ 2.8 (Financial tab), ⭐ 2.10 (Claims tracker) |
| **New features (Sprint 20-22)** | Sections 6, 7, 8, 9 |
| **Extended coverage (new in Sprint 22)** | Sections 15-19 |
| **Previously failing (must verify fix)** | 2.8, 2.10, 3.2 |

### Expected Results
- **PASS:** 85+
- **BLOCKED:** Max 10 (only for pages requiring env-specific features like file pickers, DevTools)
- **FAIL:** 0 target

### Priority Order for Time-Limited Sessions

If running short on time, test in this priority order:
1. **⭐ Sprint 22 Fixes (2 tests):** 2.8, 2.10 — MUST verify these pass
2. **Critical Path (Sections 0-5):** Auth, Dashboard, Claims, Trades, Reports, Leads
3. **Revenue Features (Sections 6-9):** Crews, Permits, Financial, Exports
4. **Extended Routes (Sections 15-19):** New coverage
5. **Settings & Security (10, 11, 12, 13, 14):** Lower priority

### Escalation
If any test marked with ⭐ FAILS, that is a **P0 regression**. Report immediately with:
- Screenshot
- URL in browser bar
- Exact error message
- Console errors if visible

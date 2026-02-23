# 🤖 AI Agent Testing Playbook — SkaiScraper Pro CRM

> **Target:** https://www.skaiscrape.com
> **Test Account:** damien.willingham@outlook.com
> **Generated:** 2026-02-23 | Sprint 9 deployed (commit c5d4842)
> **Purpose:** Comprehensive UI + API + workflow regression testing

---

## 📋 TESTING INSTRUCTIONS

You are a QA testing agent for SkaiScraper Pro, a property damage claims CRM.
Log in with the test account and systematically work through each section below.
For each test, report: **PASS**, **FAIL**, or **BLOCKED** with details.

---

## 🔐 PHASE 1: AUTHENTICATION & ONBOARDING

### 1.1 Sign-In Flow

- [ ] Navigate to https://www.skaiscrape.com/sign-in
- [ ] Sign in with test credentials
- [ ] Verify redirect to `/dashboard` (not `/onboarding` or blank page)
- [ ] Verify no "Sign In Required" banner appears
- [ ] Verify user name/avatar appears in top-right header

### 1.2 Organization Context

- [ ] Click on org/company name in sidebar (if visible)
- [ ] Verify an organization is active (not "No Organization")
- [ ] Check that the org name matches the expected test company
- [ ] Navigate to `/settings` — verify org settings load (not blank)

### 1.3 Public Pages (No Auth Required)

- [ ] Open a new incognito/private window
- [ ] Verify https://www.skaiscrape.com/ loads (homepage)
- [ ] Verify https://www.skaiscrape.com/pricing loads
- [ ] Verify https://www.skaiscrape.com/sign-in loads
- [ ] Verify https://www.skaiscrape.com/sign-up loads
- [ ] Verify NONE of these redirect to sign-in or show errors

---

## 📊 PHASE 2: DASHBOARD (Sprint 9 — CRITICAL)

> **What changed:** All 4 dashboard routes converted from `currentUser()` to `withAuth`.
> **Previous bug:** Dashboard showed all-zero stats when `publicMetadata.orgId` was missing.

### 2.1 Dashboard Stats Card

- [ ] Navigate to `/dashboard`
- [ ] Verify stats cards load (not all zeros)
- [ ] Check that "Claims" count is > 0 (if test data exists)
- [ ] Check that "Leads" count is > 0 (if test data exists)
- [ ] Check trend arrows display ("+X%" or "--")
- [ ] Verify NO loading spinner hangs indefinitely

### 2.2 Dashboard KPIs

- [ ] Verify KPI cards render (MTD Revenue, Claims 30d, Closed 30d, Active Claims)
- [ ] Verify numbers are NOT all "$0" or "0" (unless genuinely empty)
- [ ] Click on a KPI card — verify it navigates or shows detail (if applicable)

### 2.3 Dashboard Charts

- [ ] Verify "Claims by Status" chart renders (bar/pie chart)
- [ ] Verify "Claims Over Time" chart renders (line/bar chart)
- [ ] Verify "Leads by Source" chart renders
- [ ] Verify charts are NOT empty or erroring out

### 2.4 Dashboard Activity Feed

- [ ] Verify recent activities list loads
- [ ] Verify each activity has: icon, description, timestamp, link
- [ ] Click on an activity link — verify it navigates to the correct page
- [ ] Verify NO "Failed to fetch" error message

### 2.5 Dashboard Console Check

- [ ] Open browser DevTools (F12) → Console tab
- [ ] Reload `/dashboard`
- [ ] Report ANY red error messages (ignore warnings)
- [ ] Specifically check for: 401 errors, 500 errors, "Unauthorized" messages

---

## 📝 PHASE 3: CLAIMS PIPELINE

### 3.1 Claims List

- [ ] Navigate to `/claims`
- [ ] Verify claims table loads with data (not empty or error)
- [ ] Verify columns: Claim #, Status, Property, Date, Actions
- [ ] Try search filter — type a claim number, verify filtering works
- [ ] Try status filter dropdown — verify it filters claims

### 3.2 Create New Claim

- [ ] Click "New Claim" or "+" button
- [ ] Fill in required fields:
  - Claim Number: `TEST-AGENT-001`
  - Insurance Company: `State Farm`
  - Date of Loss: (today's date)
  - Type of Loss: `Wind/Hail`
  - Property Address: `123 Test St, Flagstaff, AZ 86001`
- [ ] Submit the form
- [ ] Verify claim appears in the claims list
- [ ] Verify redirect to claim detail page

### 3.3 Claim Detail / Workspace

- [ ] Open the newly created claim (or any existing claim)
- [ ] Verify workspace tabs load: Overview, Photos, Documents, Scope, Timeline, AI, Reports
- [ ] Click each tab — verify content loads (not blank or error)
- [ ] Check the "AI" tab — verify it loads (not 502 or blank)
- [ ] Check the "Reports" tab — verify it loads

### 3.4 Claim Photos

- [ ] Navigate to a claim's Photos tab
- [ ] Verify photo grid loads (may be empty if no photos)
- [ ] If upload button exists, verify it's clickable (don't need to actually upload)

### 3.5 Claim Timeline

- [ ] Navigate to a claim's Timeline tab
- [ ] Verify timeline entries display with dates and descriptions
- [ ] Try adding a note — verify it appears in timeline

---

## 👥 PHASE 4: LEADS PIPELINE

### 4.1 Leads List

- [ ] Navigate to `/leads`
- [ ] Verify leads table loads
- [ ] Verify columns display correctly
- [ ] Try stage filter (New, Contacted, Qualified, etc.)

### 4.2 Create New Lead

- [ ] Click "New Lead" or "+" button
- [ ] Fill in:
  - Title: `AI Agent Test Lead`
  - Contact: First Name `Test`, Last Name `Agent`
  - Source: `Referral`
- [ ] Submit
- [ ] Verify lead appears in the list
- [ ] Verify no errors in console

### 4.3 Lead Detail

- [ ] Open the created lead
- [ ] Verify detail page loads with all fields
- [ ] Check Notes tab
- [ ] Check Timeline tab
- [ ] Check Files tab (if exists)

---

## 💰 PHASE 5: BILLING (Sprint 9 — CRITICAL)

> **What changed:** All 4 billing routes converted to `withAuth`.
> **Previous bug:** `billing/status` used raw Clerk orgId without membership verification.

### 5.1 Billing Status

- [ ] Navigate to `/settings/billing` or wherever billing settings live
- [ ] Verify plan name displays (not "undefined" or error)
- [ ] Verify plan tier shows (Free, Solo, Business, Enterprise, or Beta Access)
- [ ] Verify usage stats display (claims used, claims remaining)
- [ ] Verify NO "Failed to fetch billing status" error

### 5.2 Billing Seats

- [ ] Look for seat management section on billing page
- [ ] Verify seat count displays
- [ ] Verify seat pricing displays
- [ ] Verify NO "No organization found" error

### 5.3 Billing Portal

- [ ] If a "Manage Subscription" or "Billing Portal" button exists
- [ ] Click it — verify it either redirects to Stripe portal or shows appropriate message
- [ ] Verify NO "Organization context required" error

---

## 📄 PHASE 6: REPORT BUILDER (Sprint 8c — REGRESSION CHECK)

> **What changed:** Full preview rewrite, generate flow fixed, all 9 report routes to withAuth.

### 6.1 PDF Builder Page

- [ ] Navigate to `/reports/templates/pdf-builder`
- [ ] Verify page loads (not blank, not "AUTH_REQUIRED")
- [ ] Verify claim dropdown populates with org's claims
- [ ] Verify template dropdown populates with available templates
- [ ] Select a claim from dropdown
- [ ] Select a template from dropdown

### 6.2 Preview Flow

- [ ] Click "Preview" button
- [ ] Verify preview panel loads (not "PREVIEW FAILED" error)
- [ ] Verify preview shows: template title, field counts, media count
- [ ] Check for "Missing Fields" count — should list what's incomplete
- [ ] Verify merged data JSON displays in the preview panel

### 6.3 Generate Flow

- [ ] Click "Generate Report" button
- [ ] Verify a report record is created (success message or redirect)
- [ ] If redirected, verify the report detail page loads
- [ ] Verify NO "blob" errors in console (old bug was trying to parse JSON as blob)

### 6.4 Reports List

- [ ] Navigate to `/reports`
- [ ] Verify reports list loads
- [ ] Verify the just-generated report appears in the list
- [ ] Click on a report — verify detail page loads

---

## 🔧 PHASE 7: TEMPLATE SYSTEM

### 7.1 Template Marketplace

- [ ] Navigate to templates section (sidebar or from report builder)
- [ ] Verify marketplace templates load
- [ ] Verify "Add to Company" button works on at least one template

### 7.2 Company Templates

- [ ] Navigate to company/org templates list
- [ ] Verify org-specific templates display
- [ ] Try creating a new template (if create button exists)
- [ ] Try duplicating an existing template

### 7.3 Template CRUD

- [ ] Open a template for editing
- [ ] Verify edit form loads with template data
- [ ] Try making a small change and saving
- [ ] Verify the change persists (reload and check)

---

## 🤝 PHASE 8: TRADES NETWORK

### 8.1 Trades Feed

- [ ] Navigate to `/trades` or trades section
- [ ] Verify the feed loads with posts
- [ ] Verify company badges/logos appear on posts
- [ ] Try creating a new post
- [ ] Verify the post appears in the feed

### 8.2 Team Posts (Sprint 9 — REGRESSION)

- [ ] Navigate to team posts section
- [ ] Verify team-scoped posts load
- [ ] Try creating a team post
- [ ] Verify it appears immediately
- [ ] Verify NO "Unauthorized" error

### 8.3 Feed Engagement

- [ ] Try liking a post in the feed
- [ ] Verify like count updates
- [ ] Try unliking — verify count decrements
- [ ] Try commenting on a post (if feature exists)

### 8.4 Contractor Profiles

- [ ] Navigate to a contractor profile
- [ ] Verify profile information loads
- [ ] Verify company details display

---

## 🤖 PHASE 9: AI FEATURES

### 9.1 AI Assistant

- [ ] Navigate to `/ai` or AI section
- [ ] Verify AI assistant chat loads
- [ ] Type a test message: "What can you help me with?"
- [ ] Verify streaming response (text appears word-by-word, not all at once)
- [ ] Verify NO 502 error (Sprint 8 fix)
- [ ] Verify response completes without hanging

### 9.2 Claim AI Analysis

- [ ] Open a claim → AI tab
- [ ] Verify AI analysis loads (or placeholder if no analysis yet)
- [ ] Try triggering an AI analysis (if button exists)
- [ ] Verify response streams correctly

---

## 🧭 PHASE 10: NAVIGATION & UI CONSISTENCY

### 10.1 Sidebar Navigation

- [ ] Verify all sidebar links are clickable and route correctly:
  - Dashboard → `/dashboard`
  - Claims → `/claims`
  - Leads → `/leads`
  - Reports → `/reports`
  - Trades → `/trades`
  - Messages → `/messages`
  - Settings → `/settings`
  - AI → `/ai`
- [ ] Verify active page is highlighted in sidebar
- [ ] Verify no broken links (404 pages)

### 10.2 Page Load Times

- [ ] Dashboard: Should load within 3 seconds
- [ ] Claims list: Should load within 3 seconds
- [ ] Leads list: Should load within 3 seconds
- [ ] Report builder: Should load within 5 seconds
- [ ] Note any pages that take > 5 seconds to load

### 10.3 Mobile Responsiveness

- [ ] Resize browser to mobile width (< 768px)
- [ ] Verify sidebar collapses to hamburger menu
- [ ] Verify content stacks vertically (not cut off)
- [ ] Verify buttons are still tappable
- [ ] Verify forms are still usable

### 10.4 Error Boundary Testing

- [ ] Navigate to a non-existent page (e.g., `/dashboard/nonexistent`)
- [ ] Verify a proper 404 or error page displays (not blank white screen)
- [ ] Navigate to `/api/nonexistent-route` — verify JSON error (not HTML crash)

---

## 🔒 PHASE 11: SECURITY VERIFICATION

### 11.1 Cross-Org Isolation

- [ ] If possible, create/use a second test account in a different org
- [ ] Log in as Account A — note a claim ID
- [ ] Log in as Account B — try accessing `/claims/[Account-A-claim-id]`
- [ ] Verify: 403 Forbidden or "Not found" (NOT the claim data)

### 11.2 Auth Boundary Testing

- [ ] Log out completely
- [ ] Try navigating directly to `/dashboard` — verify redirect to `/sign-in`
- [ ] Try navigating directly to `/claims` — verify redirect to `/sign-in`
- [ ] Try navigating directly to `/settings` — verify redirect to `/sign-in`

---

## 📱 PHASE 12: BROWSER CONSOLE AUDIT

### 12.1 Full Console Sweep

After completing all tests above, perform a final console sweep:

- [ ] Open DevTools → Console
- [ ] Navigate through: Dashboard → Claims → Leads → Reports → Trades → Settings
- [ ] Document ALL red (error) console messages with:
  - Page URL where error occurs
  - Full error message text
  - HTTP status code (if network error)
  - Whether it blocks functionality or is cosmetic

### 12.2 Network Tab Audit

- [ ] Open DevTools → Network tab
- [ ] Navigate to `/dashboard`
- [ ] Filter by "Fetch/XHR"
- [ ] Document any requests that return 4xx or 5xx status codes
- [ ] Specifically note: `/api/dashboard/stats`, `/api/dashboard/kpis`, `/api/dashboard/charts`, `/api/dashboard/activities`
- [ ] All 4 should return 200 with JSON data

---

## 📊 RESULTS TEMPLATE

After completing all tests, provide results in this format:

```
## Test Results Summary
- **Total Tests:** [count]
- **PASS:** [count]
- **FAIL:** [count]
- **BLOCKED:** [count]

## Critical Failures (FAIL)
| Phase | Test | Expected | Actual | Screenshot/Details |
|-------|------|----------|--------|--------------------|
| ...   | ...  | ...      | ...    | ...                |

## Warnings (Cosmetic / Non-Blocking)
| Phase | Test | Issue | Severity |
|-------|------|-------|----------|
| ...   | ...  | ...   | ...      |

## Console Errors
| Page | Error | HTTP Code | Blocking? |
|------|-------|-----------|-----------|
| ...  | ...   | ...       | ...       |

## Performance Notes
| Page | Load Time | Acceptable? |
|------|-----------|-------------|
| ...  | ...       | ...         |
```

---

## 🎯 SPRINT 9 FOCUS AREAS

The following were specifically changed in Sprint 9 and need extra attention:

1. **Dashboard** (4 routes) — Previously showed all-zero data when org metadata was missing
2. **Billing** (4 routes) — Previously used raw Clerk orgId without proper membership checks
3. **trades/onboard** — Previously wrote raw Clerk `org_2xxx` format directly to database
4. **team/posts** — Previously used raw `auth()` instead of `withAuth`

If ANY of these areas show regressions, report them as **P0 CRITICAL**.

---

## 🔄 PREVIOUS SPRINT REGRESSION AREAS

Also verify these Sprint 8/8b/8c fixes haven't regressed:

1. **AI Assistant** — Should stream responses (not 502)
2. **Template Dropdown** — Should populate with templates (not blank)
3. **Branding Gate Banner** — Should auto-populate company name/email
4. **Report Preview** — Should NOT show "AUTH_REQUIRED" error
5. **Report Generate** — Should return JSON (not blob crash)
6. **Live Feed** — Posts should have company badges, engagement should work

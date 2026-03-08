# 🚀 MASTER DAU TODO — March 7, 2026

> **Goal:** Production-ready DAU (Daily Active Users) launch — all features fully working  
> **Philosophy:** Every page works, every report is submission-ready, every flow is complete  
> **Total Tasks:** 37 across 9 sprints (~16-24 days estimated)

---

## 📊 STATUS LEGEND

| Icon | Meaning                         |
| ---- | ------------------------------- |
| ⬜   | Not started                     |
| 🔄   | In progress                     |
| ✅   | Complete                        |
| 🔴   | P0 — Critical blocker           |
| 🟠   | P1 — Must have for launch       |
| 🟡   | P1-P2 — Important               |
| 🔵   | P2 — Should have                |
| 🟣   | P2 — Audit & verify             |
| ⬛   | P1-P2 — Security/access control |

---

## 🔴 SPRINT 1 — CRITICAL BLOCKERS (Fix First)

### ✅ 1. ReportBuilderPanel — REBUILT

- **File:** `src/components/reports/ReportBuilderPanel.tsx`
- **Issue:** Renders only `<div>Report Builder Panel Component</div>` — `/reports/config` and `/reports/[reportId]/build` are both broken
- **Fix:** Build a full interactive report builder panel connecting to `/api/ai/report-builder` and `/api/ai/enhanced-report-builder`
- **Affected routes:** `/reports/config`, `/reports/[reportId]/build`
- **Priority:** 🔴 P0

### ✅ 2. Report Header Branding — Unified PDF Branding System Built

- **Files:** `src/app/api/ai/report-builder/export-pdf/route.ts`, `src/lib/pdf/enhancedReportBuilder.ts`
- **Issue:** AI Report Builder PDF hardcodes "SkaiScraper AI Report" — does NOT fetch company logo, employee headshot, or real company info from `OrganizationBranding` table
- **Fix:**
  - Header layout: **Logo (left)** → **Company name + employee name/title/license/phone (center)** → **Employee headshot (right)**
  - Pull from `OrganizationBranding`: `logoUrl`, `primaryColor`, `companyName`, `phone`, `email`, `website`
  - Pull employee headshot from user profile (`profileImageUrl`)
  - Then goes into client details if available (property address, homeowner name, claim #)
  - Apply this header template to ALL report types
- **Priority:** 🔴 P0

### ✅ 3. Notifications Page — Redirect Fixed

- **File:** `next.config.mjs` (line 69)
- **Root Cause:** Stale redirect rule in `next.config.mjs`: `{ source: "/notifications", destination: "/dashboard" }` was overriding the real page
- **Fix:** Removed the stale redirect. Page now loads correctly.
- **Priority:** 🔴 P0

### ✅ 4. Carrier Route — User Confirmed Fine As-Is

- **Files:** `middleware.ts`, `src/app/(app)/exports/carrier/page.tsx`
- **Resolution:** User confirmed `/exports/carrier` route works correctly and no changes needed
- **Priority:** 🔴 P0

---

## 🟠 SPRINT 2 — REPORT & DOCUMENT GENERATION

### ✅ 5. Bid Package — Insurance Language Removed

- **File:** `src/app/(app)/bids/page.tsx` (~line 172)
- **Issue:** "Start Claim" button text on accepted bids — should be contractor language
- **Fix:** Change "Start Claim" → "Start Job" or "Create Work Order". Update link from `/claims/new` to `/jobs/new`
- **Priority:** 🟠 P1

### ⬜ 6. Bid Package — Production-Ready PDF

- **Files:** `src/lib/pdf/exportOrchestrator.ts`, bid API routes
- **Fix:** Verify bid package PDF includes: branded header (logo + company info), scope of work, materials list, pricing breakdown, terms & conditions, signature fields, professional formatting. Must be ready for real submission
- **Priority:** 🟠 P1

### ✅ 7. Claims Packet — Test Cuts / Invasive Testing Section Built

- **File:** `src/lib/claims-folder/claimsFolderSchema.ts` (section key: `test_cuts`)
- **Issue:** Section defined in schema but renders as placeholder — no data entry or PDF export
- **Fix:** Build test cuts section with: core sample photo uploads, measurement data fields, testing date/location, inspector details, results summary. Wire into claims folder PDF export
- **Priority:** 🟠 P1

### ⬜ 8. Claims Packet — Insurance-Submission Ready PDF

- **Files:** `src/lib/claims-folder/claimsFolderAssembler.ts`, `src/lib/claims-folder/claimsFolderPdfBundler.ts`
- **Issue:** PDF bundler generates structured text/markdown — may not produce a polished rendered PDF
- **Fix:** Final export must include: professional cover page, branded headers, TOC with page numbers, photo grid layouts, narrative sections with proper typography, signature pages, carrier-compliant formatting
- **Priority:** 🟠 P1

### ✅ 9. All Reports — AI Disclaimer Footer Added

- **All report generation files**
- **Fix:** Add footer/disclaimer to every AI-generated report: _"⚠️ AI can make mistakes — please read through the final report carefully before submission."_
- **Priority:** 🟠 P1

### ✅ 10. Project Plan Builder — All Trade Types Added

- **File:** `src/app/(app)/ai/roofplan-builder/page.tsx`
- **Issue:** Siding, Gutters, Windows not in the specific trade dropdown — fall back to generic job types. URL still says "roofplan-builder"
- **Fix:**
  - Add: Siding, Gutters/Downspouts, Windows/Doors, Fencing, Drywall, Insulation, Masonry/Stone
  - Rename route: `/ai/roofplan-builder` → `/ai/project-plan-builder` (redirect old URL)
  - Update sidebar nav label: "Roof Plan Builder" → "Project Plan Builder"
- **Priority:** 🟠 P1

### ✅ 11. Project Plan PDF — Company Branding Header Wired

- **File:** `src/app/api/ai/plan/export-pdf/route.ts`
- **Issue:** Project plan PDF does NOT use company branding — only passes trade label as `companyName`
- **Fix:** Fetch `OrganizationBranding` and apply branded header: logo (left) → company + employee info (center) → headshot (right)
- **Priority:** 🟠 P1

---

## 🟡 SPRINT 3 — E-SIGN & DOCUMENT FLOW

### ✅ 12. E-Sign — Email Already Working

- **File:** `src/app/api/esign/envelopes/[envelopeId]/send/route.ts`
- **Resolution:** Resend integration with branded HTML email template already exists and works (document title, signer name, CTA button to signing page all implemented)
- **Priority:** 🟡 P1

### ✅ 13. E-Sign — Signatures Moved to Supabase Storage

- **File:** `src/app/api/esign/envelopes/[envelopeId]/signers/[signerId]/signature/route.ts`
- **Issue:** Signatures save to `public/esign/` (local filesystem) — **won't work on Vercel** (ephemeral FS)
- **Fix:** Replaced `fs/promises` writes with `getSupabaseAdmin()` uploads to `esign` bucket. Created `src/lib/esign/resolveUrl.ts` for backwards-compatible URL resolution (`supabase://` → signed download URLs). Updated finalize route to use signed URLs.
- **Priority:** 🟡 P1

### ✅ 14. Smart Docs — Client Selector Dropdown Added

- **File:** `src/app/(app)/smart-docs/page.tsx`
- **Issue:** No way to associate a document with a specific client when creating
- **Fix:** Add client picker dropdown to create document dialog (fetch from `/api/clients`). When a client is selected, link the document to that client record so it appears in their documents section
- **Priority:** 🟡 P1

### ⬜ 15. Smart Docs — Auto-Save Signed Docs to Client

- **Issue:** After signing completes (finalize), docs don't save to the connected client's document section
- **Fix:** On finalize, if document has a linked client, auto-insert into client's documents. Also update the smart-docs page to show the association
- **Priority:** 🟡 P1

### ⬜ 16. Smart Docs — Signing in Client Messages Thread

- **Issue:** Connected clients should be able to view and sign documents within their message thread
- **Fix:** When a doc is sent to a connected client, post as a message attachment with "Sign Document" CTA. Opens signing page inline. Saves back to smart-docs and client's documents on completion
- **Priority:** 🟡 P2

---

## 🔵 SPRINT 4 — UI UPDATES & PAGE POLISH

### ✅ 17. Permits Page — Already Modern UI

- **File:** `src/app/(app)/permits/page.tsx`
- **Resolution:** Audit confirmed it already uses PageHero → gradient stat cards → data table pattern with proper badges, colors, and dark mode
- **Priority:** 🔵 P2

### ✅ 18. Company Documents Page — 4-Tab Layout Added

- **File:** `src/app/(app)/trades/company/page.tsx`
- **Issue:** Too much information crammed into one view — bunched up and hard to navigate
- **Fix:** Added 4-tab progressive disclosure layout (Overview | Details & Contact | Credentials | Social & More). Dark mode variants added to all hardcoded backgrounds. Content logically grouped.
- **Priority:** 🔵 P2

### ✅ 19. Carrier Export — Explainer + PageHero Added

- **File:** `src/app/(app)/exports/carrier/page.tsx`
- **Fix:** Added PageHero with section="jobs", 3-column "How It Works" step cards (Select Project → Review & Customize → Export Package), better empty state with Package icon and improved copy.
- **Priority:** 🔵 P2

### ✅ 20. Tasks Manager — Create Task Button + Dialog Added

- **File:** `src/app/(app)/tasks/page.tsx`
- **Issue:** No manual task creation UI — empty state says "create them manually" but there's no button
- **Fix:** Add "Create Task" dialog with: title, description, priority, assignee dropdown, due date picker, linked claim/job selector. POST to task creation API
- **Priority:** 🔵 P2

### ⬜ 21. Tasks Manager — Route & Path Audit

- **Fix:** Verify all task links resolve (detail pages, edit, complete). Status changes persist immediately. Due date overdue detection works. Filter/search functional
- **Priority:** 🔵 P2

---

## 🟣 SPRINT 5 — FINANCIAL PAGES AUDIT

### ✅ 22. Financial Overview — Audited + RBAC Added

- **File:** `src/app/(app)/finance/overview/page.tsx`
- **Audit:** All API endpoints connected, KPI cards render, quick-links resolve. 496 lines, fully functional.
- **Fix:** Added `RBACGuard minimumRole="PM"` — only project managers and above can view financial data. Added Lock icon fallback for unauthorized users.
- **Priority:** 🟣 P2

### ✅ 23. Invoices — Audited + RBAC Added

- **File:** `src/app/(app)/invoices/page.tsx`
- **Audit:** 192 lines, server component with PageContainer/PageHero. Create invoice flow, stat cards, data table all working.
- **Fix:** Added `hasMinimumRole(ctx.role, "OFFICE_STAFF")` server-side RBAC check. Only office staff and above can access invoices.
- **Priority:** 🟣 P2

### ✅ 24. Commissions — Audited + RBAC Added

- **File:** `src/app/(app)/commissions/page.tsx`
- **Audit:** 200 lines, server component. Commission records, stat cards, user lookup all working. Sensitive pay data exposed.
- **Fix:** Added `hasMinimumRole(ctx.role, "PM")` server-side RBAC check. Only PM+ roles can view commission data.
- **Priority:** 🟣 P2

### ✅ 25. Mortgage Checks — Audited + RBAC Added

- **File:** `src/app/(app)/mortgage-checks/page.tsx`
- **Audit:** 202 lines, server component. Status flow tracking, lender association, form all working.
- **Fix:** Added `hasMinimumRole(ctx.role, "PM")` server-side RBAC check. Only PM+ roles can access mortgage check data.
- **Priority:** 🟣 P2

---

## 🟤 SPRINT 6 — MESSAGING & NOTIFICATIONS

### ⬜ 26. Messages Hub — Full Audit

- **File:** `src/app/(app)/messages/page.tsx`
- **Fix:**
  - Verify: thread listing, message send/receive, file attachments, read receipts, client-to-pro messaging
  - Fix PageHero description (currently says "vendors" — should say messages/communications)
  - Ensure message threads are linked to claims/jobs where applicable
- **Priority:** 🟤 P2

### ✅ 27. Notification Bell — Consolidated to UnifiedNotificationBell

- **Files:** `src/components/nav/CRMTopbar.tsx`, `src/app/(app)/trades/_components/TradesNetworkDashboard.tsx`
- **Fix:** Replaced all `NotificationCenter` usages with canonical `UnifiedNotificationBell` (supports pro/client variants, 30s polling, optimistic updates). Deleted dead `NotificationBell.tsx` (zero imports). Two files updated, one file removed.
- **Priority:** 🟤 P2

### ⬜ 28. System Notifications — Verify All Event Types

- **Fix:** Verify notifications fire for: new messages, claim status changes, task assignments, document signing requests, team invites, payment events. Each notification routes to the correct page on click
- **Priority:** 🟤 P2

---

## ⬛ SPRINT 7 — ACCESS CONTROL & SECURITY

### ✅ 29. Remote View — Already Properly RBAC-Gated

- **Files:** `src/components/remote-view/RemoteViewSelector.tsx`, `src/lib/permissions/constants.ts`
- **Audit:** RemoteViewSelector (189 lines) already checks `canUseRemoteView` permission via `useRBAC()`. Permission `remote_view:view` added to manager+ roles in previous session.
- **Priority:** ⬛ P1

### ✅ 30. Billing Access — RBAC Gated

- **Fix:**
  - `src/app/(app)/settings/billing/page.tsx`: Wrapped in `RBACGuard permission="billing:manage"` with admin-required fallback card
  - `src/app/(app)/account/billing/page.tsx`: Wrapped in `RBACGuard permission="billing:view"` with lock icon fallback
  - `src/app/api/billing/portal/route.ts`: Upgraded from `withAuth` to `withManager` (was allowing any authenticated user to open Stripe portal)
  - `create-subscription` and `update-seats` routes already use `withManager` ✓
- **Priority:** ⬛ P1

### ⬜ 31. Team Hierarchy Chart — Admin Only Edits

- **Files:** `src/app/(app)/trades/company/employees/page.tsx`, hierarchy API
- **Fix:**
  - Only admins can edit org chart (promote, assign managers, remove)
  - Managers can view chart + see direct reports but cannot edit
  - Members/viewers see their position only, not full hierarchy
- **Priority:** ⬛ P1

### ⬜ 32. Manager-Scoped Data Visibility

- **Issue:** Managers should only see data for employees under them — currently no scoped visibility
- **Fix:** Filter claims, jobs, tasks by manager's direct reports. Admins see everything. Use hierarchy API for report chain
- **Priority:** ⬛ P2

---

## ⬜ SPRINT 8 — VENDOR LOGOS & POLISH

### ⬜ 33. Vendor Logos — Audit & Fix Missing

- **Files:** `src/app/(app)/vendor-network/_components/VendorLogo.tsx`, vendor seed data
- **Issue:** Most vendor logos not showing — falling back to gradient initials
- **Fix:**
  - Audit all seeded vendors — check which have `logoUrl` set
  - For missing logos: source from clearbit/logo.dev API or upload manually
  - Verify `VendorLogo` component loads from correct Supabase Storage paths
  - Add logo upload in vendor profile editing flow
- **Priority:** ⬜ P2

### ⬜ 34. Vendor Logos — Cross-Page Consistency

- **Fix:** Ensure logos display consistently across: vendor network grid, vendor detail pages, vendor cards in claims/jobs, public profile pages
- **Priority:** ⬜ P3

---

## 🔧 SPRINT 9 — AI MODEL ROUTING & RELIABILITY

### ⬜ 35. AI Model Routing — Test All 30+ Endpoints

- **Files:** `src/app/api/ai/router/route.ts`, `src/lib/ai/aiClient.ts`
- **Fix:** Verify each registered AI module responds correctly:
  - `gpt-4o`: batfEngine, generateRebuttal, video-generator, reportGenerator, vision, photo-annotator, scopes, estimates, weather, supplements, plan/generate
  - `gpt-4o-mini`: supplementBuilder, messageAssistant, classifyDocument (lighter tasks)
  - Test the router dispatches to the correct handler for each function name
- **Priority:** 🔧 P2

### ⬜ 36. AI Rate Limiting — Verify Token Consumption

- **Fix:** Ensure AI calls properly consume tokens from user balance, rate limiters apply, and clear error messages show when limits are hit
- **Priority:** 🔧 P2

### ⬜ 37. AI Error Handling — User-Facing Messages

- **Fix:** When AI calls fail (timeout, rate limit, API error), show clear user-facing error messages. Add retry buttons where appropriate. Never show raw 500 errors
- **Priority:** 🔧 P3

---

## 📈 SPRINT SUMMARY

| Sprint    | # Tasks | Focus Area                       | Priority | Est.            |
| --------- | ------- | -------------------------------- | -------- | --------------- |
| **S1**    | 4       | Critical blockers (broken pages) | 🔴 P0    | 2-3 days        |
| **S2**    | 7       | Reports & document generation    | 🟠 P1    | 3-4 days        |
| **S3**    | 5       | E-sign & document flow           | 🟡 P1-P2 | 2-3 days        |
| **S4**    | 5       | UI polish & page updates         | 🔵 P2    | 2-3 days        |
| **S5**    | 4       | Financial pages audit            | 🟣 P2    | 1-2 days        |
| **S6**    | 3       | Messaging & notifications        | 🟤 P2    | 2-3 days        |
| **S7**    | 4       | Access control & RBAC            | ⬛ P1-P2 | 2-3 days        |
| **S8**    | 2       | Vendor logos                     | ⬜ P2-P3 | 1 day           |
| **S9**    | 3       | AI reliability                   | 🔧 P2-P3 | 1-2 days        |
| **TOTAL** | **37**  |                                  |          | **~16-24 days** |

---

> Previous version archived at `MASTER_DAU_TODO_old.md`

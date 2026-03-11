# 🎯 MASTER AUDIT TODO — Full Platform Readiness

> Generated: March 10, 2026  
> Status: Pre-Launch Audit Complete  
> Priority: P0 = Launch Blocker | P1 = High | P2 = Medium | P3 = Low
> **Last Updated: Session fixes applied**

---

## 📊 SUMMARY DASHBOARD

| Section          | P0    | P1     | P2     | P3     | Total  | Completed |
| ---------------- | ----- | ------ | ------ | ------ | ------ | --------- |
| Claims Workspace | 0     | 5      | 8      | 3      | 16     | 6 ✅      |
| Retail Workspace | 0 ✅  | 4      | 5      | 2      | 13     | 4 ✅      |
| Lead Routing     | 0     | 6      | 4      | 2      | 12     | 4 ✅      |
| Client Portal    | 0 ✅  | 5      | 8      | 4      | 18     | 4 ✅      |
| **TOTAL**        | **0** | **20** | **25** | **11** | **59** | **18 ✅** |

---

## 1️⃣ CLAIMS WORKSPACE (38 pages)

### ✅ COMPLETED

- [x] Photo upload → analyze → damage report flow (FIXED)
- [x] ClaimWorkspaceShell tabbed interface working
- [x] Proper org scoping with safeOrgContext
- [x] **[CLAIMS-01]** Supplement page wired to API ✅ (Fixed: fetch from API, save, PDF export)
- [x] **[CLAIMS-02]** Completion tracking verified ✅ (Already working)
- [x] **[CLAIMS-03]** Final payout calculations verified ✅ (Already working)
- [x] **[CLAIMS-04]** Automation rules verified ✅ (Already working)
- [x] **[CLAIMS-05]** Measurements save correctly ✅ (Already working)
- [x] **[CLAIMS-08]** Copy to clipboard added ✅

### P1 — HIGH PRIORITY

All P1 items verified/fixed ✅

### P2 — MEDIUM PRIORITY

- [ ] **[CLAIMS-06]** Add bulk photo analyze with progress indicator
  - File: `src/app/(app)/claims/[claimId]/photos/page.tsx`
  - Feature: Select multiple photos, analyze all at once

- [ ] **[CLAIMS-07]** Photo grid should show damage boxes overlay on hover
  - File: `ClaimWorkspaceShell.tsx` PhotosSection
  - Feature: Visual damage indicators on analyzed photos

- [ ] **[CLAIMS-08]** Add "Copy to Clipboard" for claim summary
  - File: `src/app/(app)/claims/[claimId]/overview/page.tsx`
  - Feature: One-click copy claim details

- [ ] **[CLAIMS-09]** Documents page — Add drag-to-reorder functionality
  - File: `src/app/(app)/claims/[claimId]/documents/page.tsx`

- [ ] **[CLAIMS-10]** Weather page — Cache weather data to reduce API calls
  - File: `src/app/(app)/claims/[claimId]/weather/page.tsx`

- [ ] **[CLAIMS-11]** Timeline — Add filters (by type, date range)
  - File: `src/app/(app)/claims/[claimId]/timeline/page.tsx`

- [ ] **[CLAIMS-12]** Add claim duplication feature
  - File: New action in ClaimHeaderActions
  - Feature: Duplicate claim with new ID

- [ ] **[CLAIMS-13]** Add claim merge feature (for duplicates)
  - Feature: Merge two claims into one

### P3 — LOW PRIORITY

- [ ] **[CLAIMS-14]** Add keyboard shortcuts for common actions
  - Global: Cmd+S save, Cmd+N new note, etc.

- [ ] **[CLAIMS-15]** Add claim comparison view (side-by-side)
  - Feature: Compare two claims

- [ ] **[CLAIMS-16]** Add claim templates for common damage types
  - Feature: Pre-fill from template

---

## 2️⃣ RETAIL WORKSPACE

### ✅ COMPLETED

- [x] TypeScript error in RetailJobWizard catch block (FIXED)
- [x] Photos linked to leadId in wizard (FIXED)

### ✅ P0 — CRITICAL (Launch Blockers) — ALL FIXED

- [x] **[RETAIL-01]** Measurements NOT SAVED ✅ FIXED
  - Added `measurementsSchema` to API, saves to PropertyProfiles

- [x] **[RETAIL-02]** Search input decorative ✅ FIXED
  - Created `RetailJobsClient.tsx` with search/filter functionality

### P1 — HIGH PRIORITY

- [x] **[RETAIL-03]** Add pagination for >50 jobs ✅ FIXED
  - Added pagination controls with page navigation

- [ ] **[RETAIL-04]** Add draft/resume for job wizard
  - File: `RetailJobWizard.tsx`
  - Feature: Auto-save draft, resume incomplete jobs

- [x] **[RETAIL-05]** Filter button ✅ FIXED
  - Integrated into RetailJobsClient with category/stage filters

- [x] **[RETAIL-06]** Description edit click handler ✅ FIXED
  - Added edit modal with save functionality

### P2 — MEDIUM PRIORITY

- [ ] **[RETAIL-07]** Add bulk actions (archive, assign, update status)
  - File: `src/app/(app)/jobs/retail/page.tsx`
  - Feature: Checkbox selection, bulk action dropdown

- [ ] **[RETAIL-08]** Add stage update from job view
  - File: `src/app/(app)/jobs/retail/[id]/page.tsx`
  - Feature: Inline stage change without full edit

- [ ] **[RETAIL-09]** Add job duplication feature
  - Feature: Clone job with new ID

- [ ] **[RETAIL-10]** Add loading.tsx skeletons
  - Files: `src/app/(app)/jobs/retail/loading.tsx`, `new/loading.tsx`

- [ ] **[RETAIL-11]** Clarify RetailWizard vs RetailJobWizard naming
  - RetailJobWizard = Job creation (6 steps)
  - RetailWizard = Packet generation (8 steps)
  - Add comments or rename for clarity

### P3 — LOW PRIORITY

- [ ] **[RETAIL-12]** Add job value trend chart
  - Feature: Visual of job values over time

- [ ] **[RETAIL-13]** Add export to CSV/Excel
  - Feature: Export job list

---

## 3️⃣ LEAD ROUTING

### ✅ COMPLETED

- [x] Manual routing (job category assignment) works
- [x] Lead to claim conversion works
- [x] Lead CRUD APIs work

### P1 — HIGH PRIORITY (Feature Gaps)

- [ ] **[LEADS-01]** Implement Round-Robin Assignment
  - File: New `src/lib/leads/autoAssign.ts`
  - Feature: Auto-distribute leads to team members

  ```typescript
  async function autoAssignLead(leadId: string, orgId: string) {
    // Get sales team members
    // Track last-assigned user per org
    // Round-robin distribute
  }
  ```

- [ ] **[LEADS-02]** Add Lead Assignment UI
  - File: `src/app/(app)/leads/[id]/page.tsx`
  - Feature: Dropdown to assign lead to team member
  - Uses existing `assignedTo` field

- [ ] **[LEADS-03]** Implement Settings Backend
  - File: New `/api/settings/lead-routing/route.ts`
  - Feature: CRUD for routing rules

- [x] **[LEADS-01]** Round-Robin Assignment ✅ FIXED
  - Created `src/lib/leads/autoAssign.ts` with round-robin logic
  - Integrated into lead creation API

- [x] **[LEADS-02]** Lead Assignment UI ✅ FIXED
  - Created `LeadAssignmentDropdown` component
  - Integrated into lead detail page header

- [x] **[LEADS-03]** Settings Backend ✅ FIXED
  - Created `/api/settings/lead-routing/route.ts`

- [x] **[LEADS-04]** Settings "Configure" buttons ✅ FIXED
  - Created `LeadsSettingsClient.tsx` with working modals

- [ ] **[LEADS-05]** Fix Auth Consistency (TODO-107 to TODO-111)
  - Files: Various lead API routes
  - Fix: Standardize on `withAuth` HOF

- [ ] **[LEADS-06]** Implement Pipeline Board (Kanban)
  - File: New `src/app/(app)/leads/pipeline/page.tsx`
  - Feature: Drag-and-drop lead management

### P2 — MEDIUM PRIORITY

- [x] **[LEADS-07]** Geo-Based Routing ✅ FIXED
  - Implemented in `autoAssign.ts` with territory lookup
  - Uses contact address data

- [ ] **[LEADS-08]** Service Type Routing
  - Feature: Route by job category to specialists

- [ ] **[LEADS-09]** Idle Lead Reminders
  - Feature: Alert when lead untouched for X days

- [ ] **[LEADS-10]** Add pagination to leads list
  - File: `src/app/(app)/leads/page.tsx`

### P3 — LOW PRIORITY

- [ ] **[LEADS-11]** Routing Rules Editor UI
  - Feature: Visual rule builder for automation

- [ ] **[LEADS-12]** Lead scoring AI
  - Feature: Qualification scoring

---

## 4️⃣ CLIENT PORTAL (16+ pages)

### ✅ COMPLETED

- [x] Work Requests API now persists to database (FIXED)
- [x] Core portal flows functional
- [x] **[PORTAL-01]** Feed social buttons ✅ FIXED (Like/Share/Comment implemented)
- [x] **[PORTAL-02]** Profile links ✅ VERIFIED (All use `/portal/profiles/`)
- [x] **[PORTAL-03]** True PDF export ✅ FIXED (Using jsPDF)
- [x] **[PORTAL-04]** Design board empty state ✅ VERIFIED (Already exists)
- [x] **[PORTAL-13]** Hardcoded company name ✅ FIXED

### P1 — HIGH PRIORITY

- [ ] **[PORTAL-05]** Messages thread sidebar inconsistency
  - File: `src/app/portal/messages/[threadId]/page.tsx`
  - Issue: Individual thread view missing sidebar that main messages page has

- [ ] **[PORTAL-06]** Settings API key_value_store dependency
  - File: `src/app/api/portal/settings/route.ts`
  - Issue: Raw SQL to `key_value_store` table may not exist
  - Fix: Migrate to user metadata or create table

### P2 — MEDIUM PRIORITY

- [ ] **[PORTAL-07]** Refactor network/page.tsx (1607 lines)
  - File: `src/app/portal/network/page.tsx`
  - Fix: Extract components: PostComposer, FeedItem, TrendingSidebar

- [ ] **[PORTAL-08]** Refactor find-a-pro/page.tsx (1048 lines)
  - File: `src/app/portal/find-a-pro/page.tsx`
  - Fix: Extract components: SearchFilters, ContractorCard, InviteModal

- [ ] **[PORTAL-09]** Add offline/error states for network failures
  - All pages: Add graceful degradation

- [ ] **[PORTAL-10]** Mobile nav has 10 items — cramped UX
  - File: Portal layout navigation
  - Fix: Group items or add collapsible sections

- [ ] **[PORTAL-11]** Profile strength calculation mismatch
  - Issue: Calculated in both server and client, may differ
  - Fix: Single source of truth

- [ ] **[PORTAL-12]** Standardize date formatting
  - Issue: Mix of formats across portal
  - Fix: Use shared `formatDate` utility

- [ ] **[PORTAL-13]** Remove hardcoded "ClearSkai Technologies" demo
  - File: `src/app/portal/my-jobs/page.tsx`
  - Fix: Use configurable branding or generic text

- [ ] **[PORTAL-14]** Add loading skeletons to all portal pages
  - Some pages missing loading.tsx

### P3 — LOW PRIORITY

- [ ] **[PORTAL-15]** Add notifications badge to nav
  - Feature: Show unread count

- [ ] **[PORTAL-16]** Add push notifications support
  - Feature: Browser push for messages/updates

- [ ] **[PORTAL-17]** Add dark mode toggle in settings
  - Feature: Manual theme control

- [ ] **[PORTAL-18]** Add profile completeness gamification
  - Feature: Progress bar, rewards for completion

---

## 5️⃣ GLOBAL / CROSS-CUTTING

### P1 — HIGH PRIORITY

- [ ] **[GLOBAL-01]** Add comprehensive error boundaries
  - All route groups: Ensure error.tsx exists

- [ ] **[GLOBAL-02]** Add rate limiting to remaining API routes
  - Check all routes use `rateLimit` from `@/lib/rateLimit`

- [ ] **[GLOBAL-03]** Audit all org scoping
  - Ensure all queries filter by `orgId`

### P2 — MEDIUM PRIORITY

- [ ] **[GLOBAL-04]** Add API response time logging
  - Feature: Track slow endpoints

- [ ] **[GLOBAL-05]** Add feature flags system
  - Feature: Toggle features per org

- [ ] **[GLOBAL-06]** Add user activity tracking
  - Feature: Analytics for feature usage

### P3 — LOW PRIORITY

- [ ] **[GLOBAL-07]** Add accessibility audit (WCAG)
  - Audit: Screen reader, keyboard nav, contrast

- [ ] **[GLOBAL-08]** Add i18n preparation
  - Feature: String extraction for future translation

---

## 📅 SPRINT ALLOCATION

### Sprint 1 (This Week) — P0 + Critical P1

- [ ] RETAIL-01: Measurements schema fix
- [ ] RETAIL-02: Search functionality
- [ ] PORTAL-01: Feed social buttons
- [ ] CLAIMS-01 to CLAIMS-05: Verify all claim sub-pages
- [ ] LEADS-02: Lead assignment UI

### Sprint 2 (Next Week) — P1 Completion

- [ ] RETAIL-03: Pagination
- [ ] RETAIL-04: Draft/resume wizard
- [ ] LEADS-01: Round-robin assignment
- [ ] LEADS-03: Settings backend
- [ ] PORTAL-02 to PORTAL-06

### Sprint 3 — P2 Features

- [ ] All P2 items from each section

### Backlog — P3 Items

- [ ] All P3 items (nice-to-have)

---

## 🔧 QUICK WINS (< 30 min each)

1. [ ] RETAIL-02: Add search filter (15 min)
2. [ ] RETAIL-06: Fix description edit handler (10 min)
3. [ ] PORTAL-04: Add design board empty state (10 min)
4. [ ] PORTAL-13: Remove hardcoded company name (5 min)
5. [ ] CLAIMS-08: Add copy to clipboard (15 min)

---

## 📝 NOTES

- All fixes should include unit tests where applicable
- PRs should reference TODO IDs (e.g., "Fixes RETAIL-01")
- Update this document as items are completed
- Run `pnpm typecheck` before committing

---

_Last Updated: March 10, 2026_

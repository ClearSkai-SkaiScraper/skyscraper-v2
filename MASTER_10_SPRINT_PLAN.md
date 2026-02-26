# 🏗️ MASTER 10-SPRINT PLAN — SKAISCRAPER DAU READINESS

> **Generated:** Sprint 29 | **Goal:** Ship a production-hardened, enterprise-grade platform  
> **Stats at start:** 528 API routes · 453 pages · 282 Prisma models · 70 test files

---

## SPRINT OVERVIEW

| Sprint        | Theme                                                               | Priority | Est. Todos |
| ------------- | ------------------------------------------------------------------- | -------- | ---------- |
| **Sprint 1**  | 🔴 Trust Killers — Zod Validation Blitz (Batch 1)                   | P0       | 52         |
| **Sprint 2**  | 🔴 Trust Killers — Zod Validation Blitz (Batch 2) + DB Transactions | P0       | 55         |
| **Sprint 3**  | 🔴 Error Boundaries + Loading States Blitz                          | P0       | 60         |
| **Sprint 4**  | 🟠 Stripe Dunning, Billing Hardening & Email Gaps                   | P0/P1    | 45         |
| **Sprint 5**  | 🟠 Onboarding Consolidation + Dead Page Cleanup                     | P1       | 50         |
| **Sprint 6**  | 🟠 Messages Consolidation + Duplicate Route Kill                    | P1       | 40         |
| **Sprint 7**  | 🟡 Test Coverage Blitz (API + Pages)                                | P1       | 65         |
| **Sprint 8**  | 🟡 Export/Accounting, Mobile Responsive, Offline                    | P1/P2    | 50         |
| **Sprint 9**  | 🔵 Monitoring, Logging, Sentry Spans + Performance                  | P2       | 45         |
| **Sprint 10** | 🔵 Final Polish, Security Audit, Load Testing, Ship                 | P2       | 40         |

**Total: ~502 todos**

---

## 📋 SPRINT 1 — TRUST KILLERS: ZOD VALIDATION BLITZ (BATCH 1)

> **Why first:** 456 of 528 API routes have zero input validation. Any malformed request can crash the server or corrupt data. This is the #1 trust killer for DAU.

### 1.1 — Zod Schema Library Setup

- [ ] 1.1.1 Create `lib/validation/api-schemas.ts` — shared Zod schemas for common types (orgId, claimId, pagination, date ranges, sort params)
- [ ] 1.1.2 Create `lib/validation/claim-schemas.ts` — Zod schemas for claim CRUD (create, update, status change, assignment)
- [ ] 1.1.3 Create `lib/validation/invoice-schemas.ts` — Zod schemas for invoice create/update/line items/payment
- [ ] 1.1.4 Create `lib/validation/contact-schemas.ts` — Zod schemas for contacts/homeowners/adjusters
- [ ] 1.1.5 Create `lib/validation/trades-schemas.ts` — Zod schemas for trades company/member/connection/invite
- [ ] 1.1.6 Create `lib/validation/report-schemas.ts` — Zod schemas for AI report generation params
- [ ] 1.1.7 Create `lib/validation/upload-schemas.ts` — Zod schemas for file upload metadata (size limits, mime types)
- [ ] 1.1.8 Create `lib/validation/middleware.ts` — reusable `validateBody()` and `validateQuery()` helpers that return 400 with structured error messages
- [ ] 1.1.9 Create `lib/validation/search-schemas.ts` — Zod schemas for search/filter/pagination params
- [ ] 1.1.10 Create `lib/validation/message-schemas.ts` — Zod schemas for thread/message CRUD

### 1.2 — Claims API Routes (critical path — most used)

- [ ] 1.2.1 Add Zod to `api/claims/route.ts` (GET list + POST create)
- [ ] 1.2.2 Add Zod to `api/claims/[claimId]/route.ts` (GET + PATCH + DELETE)
- [ ] 1.2.3 Add Zod to `api/claims/[claimId]/status/route.ts`
- [ ] 1.2.4 Add Zod to `api/claims/[claimId]/assign/route.ts`
- [ ] 1.2.5 Add Zod to `api/claims/[claimId]/notes/route.ts`
- [ ] 1.2.6 Add Zod to `api/claims/[claimId]/documents/route.ts`
- [ ] 1.2.7 Add Zod to `api/claims/[claimId]/photos/route.ts`
- [ ] 1.2.8 Add Zod to `api/claims/[claimId]/timeline/route.ts`
- [ ] 1.2.9 Add Zod to `api/claims/[claimId]/messages/route.ts`
- [ ] 1.2.10 Add Zod to `api/claims/intake/route.ts`

### 1.3 — Invoice & Finance API Routes

- [ ] 1.3.1 Add Zod to `api/invoices/route.ts` (GET + POST)
- [ ] 1.3.2 Add Zod to `api/invoices/[invoiceId]/route.ts` (GET + PATCH + DELETE)
- [ ] 1.3.3 Add Zod to `api/invoices/[invoiceId]/send/route.ts`
- [ ] 1.3.4 Add Zod to `api/invoices/[invoiceId]/payment/route.ts`
- [ ] 1.3.5 Add Zod to `api/invoices/receipts/route.ts`
- [ ] 1.3.6 Add Zod to `api/invoices/xactimate/route.ts`
- [ ] 1.3.7 Add Zod to `api/finance/route.ts`
- [ ] 1.3.8 Add Zod to `api/quotes/route.ts`

### 1.4 — Contacts & Leads API Routes

- [ ] 1.4.1 Add Zod to `api/contacts/route.ts`
- [ ] 1.4.2 Add Zod to `api/contacts/[contactId]/route.ts`
- [ ] 1.4.3 Add Zod to `api/leads/route.ts`
- [ ] 1.4.4 Add Zod to `api/leads/[leadId]/route.ts`
- [ ] 1.4.5 Add Zod to `api/homeowner/route.ts`
- [ ] 1.4.6 Add Zod to `api/homeowner/[id]/route.ts`
- [ ] 1.4.7 Add Zod to `api/adjusters/route.ts`

### 1.5 — Branding & Settings API Routes

- [ ] 1.5.1 Add Zod to `api/branding/save/route.ts`
- [ ] 1.5.2 Add Zod to `api/branding/upload/route.ts`
- [ ] 1.5.3 Add Zod to `api/branding/cover-page/route.ts`
- [ ] 1.5.4 Add Zod to `api/settings/route.ts`
- [ ] 1.5.5 Add Zod to `api/upload/route.ts`
- [ ] 1.5.6 Add Zod to `api/upload/cover/route.ts`
- [ ] 1.5.7 Add Zod to `api/upload/team-photo/route.ts`

### 1.6 — Trades/Network API Routes

- [ ] 1.6.1 Add Zod to `api/trades/company/route.ts`
- [ ] 1.6.2 Add Zod to `api/trades/company/seats/route.ts`
- [ ] 1.6.3 Add Zod to `api/trades/company/seats/invite/route.ts`
- [ ] 1.6.4 Add Zod to `api/trades/company/seats/accept/route.ts`
- [ ] 1.6.5 Add Zod to `api/trades/connections/route.ts`
- [ ] 1.6.6 Add Zod to `api/trades/connections/[connectionId]/route.ts`
- [ ] 1.6.7 Add Zod to `api/network/route.ts`
- [ ] 1.6.8 Add Zod to `api/vendors/route.ts`

---

## 📋 SPRINT 2 — ZOD VALIDATION BLITZ (BATCH 2) + DB TRANSACTIONS

### 2.1 — Messages & Communication API Routes

- [ ] 2.1.1 Add Zod to `api/messages/route.ts` (GET threads + POST create)
- [ ] 2.1.2 Add Zod to `api/messages/[threadId]/route.ts`
- [ ] 2.1.3 Add Zod to `api/messages/[threadId]/messages/route.ts`
- [ ] 2.1.4 Add Zod to `api/messages/[threadId]/read/route.ts`
- [ ] 2.1.5 Add Zod to `api/messages/[threadId]/archive/route.ts`
- [ ] 2.1.6 Add Zod to `api/trades/messages/route.ts`
- [ ] 2.1.7 Add Zod to `api/sms/route.ts`
- [ ] 2.1.8 Add Zod to `api/sms/[id]/route.ts`
- [ ] 2.1.9 Add Zod to `api/notifications/route.ts`
- [ ] 2.1.10 Add Zod to `api/email/route.ts`

### 2.2 — AI/Report API Routes

- [ ] 2.2.1 Add Zod to `api/ai/route.ts`
- [ ] 2.2.2 Add Zod to `api/ai/chat/route.ts`
- [ ] 2.2.3 Add Zod to `api/ai/generate/route.ts`
- [ ] 2.2.4 Add Zod to `api/reports/route.ts`
- [ ] 2.2.5 Add Zod to `api/reports/[reportId]/route.ts`
- [ ] 2.2.6 Add Zod to `api/reports/generate/route.ts`
- [ ] 2.2.7 Add Zod to `api/vision/route.ts`
- [ ] 2.2.8 Add Zod to `api/vision/analyze/route.ts`

### 2.3 — Pipeline, Jobs, Projects API Routes

- [ ] 2.3.1 Add Zod to `api/pipeline/route.ts`
- [ ] 2.3.2 Add Zod to `api/pipeline/[id]/route.ts`
- [ ] 2.3.3 Add Zod to `api/jobs/route.ts`
- [ ] 2.3.4 Add Zod to `api/jobs/[jobId]/route.ts`
- [ ] 2.3.5 Add Zod to `api/projects/route.ts`
- [ ] 2.3.6 Add Zod to `api/appointments/route.ts`
- [ ] 2.3.7 Add Zod to `api/appointments/[id]/route.ts`
- [ ] 2.3.8 Add Zod to `api/crews/route.ts`

### 2.4 — Auth, Admin, Health, Webhooks API Routes

- [ ] 2.4.1 Add Zod to `api/webhooks/stripe/route.ts` (validate event shape)
- [ ] 2.4.2 Add Zod to `api/webhooks/clerk/route.ts`
- [ ] 2.4.3 Add Zod to `api/admin/route.ts`
- [ ] 2.4.4 Add Zod to `api/admin/impersonate/route.ts`
- [ ] 2.4.5 Add Zod to `api/auth/route.ts`
- [ ] 2.4.6 Add Zod to `api/cron/route.ts`
- [ ] 2.4.7 Add Zod to `api/feedback/route.ts`
- [ ] 2.4.8 Add Zod to `api/search/route.ts`

### 2.5 — Remaining Batch Routes (sweep everything else)

- [ ] 2.5.1 Run `grep -rL "from \"zod\"" src/app/api/**/route.ts` — list all remaining unvalidated routes
- [ ] 2.5.2 Add Zod to all remaining GET-only routes (query param validation)
- [ ] 2.5.3 Add Zod to all remaining POST/PATCH routes (body validation)
- [ ] 2.5.4 Add Zod to all remaining DELETE routes (param validation)
- [ ] 2.5.5 Final sweep — confirm 100% of routes have validation

### 2.6 — Database Transaction Safety

- [ ] 2.6.1 Wrap `api/invoices/[invoiceId]/payment/route.ts` in `$transaction` (payment + status update must be atomic)
- [ ] 2.6.2 Wrap `api/claims/[claimId]/status/route.ts` in `$transaction` (status + timeline entry)
- [ ] 2.6.3 Wrap `api/trades/company/seats/accept/route.ts` in `$transaction` (member create + connections)
- [ ] 2.6.4 Wrap `api/trades/connections/route.ts` (mutual connection creation — both directions)
- [ ] 2.6.5 Wrap `api/billing/checkout/route.ts` in `$transaction` (plan + seat allocation)
- [ ] 2.6.6 Wrap `api/claims/intake/route.ts` in `$transaction` (claim + contact + assignment)
- [ ] 2.6.7 Wrap claim delete in `$transaction` (cascade: notes + docs + photos + timeline)
- [ ] 2.6.8 Wrap invoice delete in `$transaction` (cascade: line items + payments)
- [ ] 2.6.9 Wrap user offboarding in `$transaction` (reassign claims + revoke seats + archive)
- [ ] 2.6.10 Add `DashboardKpi` Prisma `@@index([orgId])` — the one missing index

### 2.7 — Validation Testing

- [ ] 2.7.1 Write test: malformed JSON body returns 400 not 500
- [ ] 2.7.2 Write test: missing required fields returns structured error
- [ ] 2.7.3 Write test: SQL injection strings in search params are rejected
- [ ] 2.7.4 Write test: XSS payloads in string fields are sanitized
- [ ] 2.7.5 Write test: oversized payloads are rejected (>1MB body)

---

## 📋 SPRINT 3 — ERROR BOUNDARIES + LOADING STATES BLITZ

> **Why:** 414 pages have no error boundary. 330 pages have no loading state. Users see white screens on errors and no feedback while data loads.

### 3.1 — Global Error Handling Infrastructure

- [ ] 3.1.1 Create `src/components/error/GenericErrorBoundary.tsx` — reusable error UI with retry button
- [ ] 3.1.2 Create `src/components/error/NotFoundBoundary.tsx` — reusable 404 UI with back navigation
- [ ] 3.1.3 Create `src/app/(app)/error.tsx` — catch-all error boundary for app shell
- [ ] 3.1.4 Create `src/app/(app)/not-found.tsx` — catch-all 404 for app shell
- [ ] 3.1.5 Create `src/app/error.tsx` — root error boundary
- [ ] 3.1.6 Create `lib/errors/AppError.ts` — typed error class with codes (NOT_FOUND, FORBIDDEN, VALIDATION, etc.)
- [ ] 3.1.7 Create `lib/errors/apiErrorResponse.ts` — consistent JSON error response builder
- [ ] 3.1.8 Audit & fix all `catch(e) { console.log }` — replace with `logger.error` + proper error response

### 3.2 — Critical Path Error Boundaries (top 20 most-used pages)

- [ ] 3.2.1 Add `error.tsx` to `dashboard/`
- [ ] 3.2.2 Add `error.tsx` to `claims/`
- [ ] 3.2.3 Add `error.tsx` to `claims/[claimId]/`
- [ ] 3.2.4 Add `error.tsx` to `invoices/`
- [ ] 3.2.5 Add `error.tsx` to `invoices/create/`
- [ ] 3.2.6 Add `error.tsx` to `messages/`
- [ ] 3.2.7 Add `error.tsx` to `trades/`
- [ ] 3.2.8 Add `error.tsx` to `trades/company/`
- [ ] 3.2.9 Add `error.tsx` to `trades/messages/`
- [ ] 3.2.10 Add `error.tsx` to `pipeline/`
- [ ] 3.2.11 Add `error.tsx` to `contacts/`
- [ ] 3.2.12 Add `error.tsx` to `settings/`
- [ ] 3.2.13 Add `error.tsx` to `settings/branding/`
- [ ] 3.2.14 Add `error.tsx` to `reports/`
- [ ] 3.2.15 Add `error.tsx` to `network/`
- [ ] 3.2.16 Add `error.tsx` to `analytics/`
- [ ] 3.2.17 Add `error.tsx` to `teams/`
- [ ] 3.2.18 Add `error.tsx` to `exports/`
- [ ] 3.2.19 Add `error.tsx` to `maps/`
- [ ] 3.2.20 Add `error.tsx` to `vision-lab/`

### 3.3 — Loading State Blitz (critical path pages)

- [ ] 3.3.1 Verify/add `loading.tsx` to `dashboard/`
- [ ] 3.3.2 Verify/add `loading.tsx` to `claims/`
- [ ] 3.3.3 Verify/add `loading.tsx` to `claims/[claimId]/`
- [ ] 3.3.4 Verify/add `loading.tsx` to `invoices/`
- [ ] 3.3.5 Verify/add `loading.tsx` to `messages/`
- [ ] 3.3.6 Verify/add `loading.tsx` to `trades/`
- [ ] 3.3.7 Verify/add `loading.tsx` to `trades/company/`
- [ ] 3.3.8 Verify/add `loading.tsx` to `pipeline/`
- [ ] 3.3.9 Verify/add `loading.tsx` to `contacts/`
- [ ] 3.3.10 Verify/add `loading.tsx` to `settings/`

### 3.4 — Skeleton Components Library

- [ ] 3.4.1 Create `components/skeletons/TableSkeleton.tsx` — for data tables
- [ ] 3.4.2 Create `components/skeletons/CardGridSkeleton.tsx` — for card-based layouts
- [ ] 3.4.3 Create `components/skeletons/FormSkeleton.tsx` — for settings/edit forms
- [ ] 3.4.4 Create `components/skeletons/ChatSkeleton.tsx` — for message threads
- [ ] 3.4.5 Create `components/skeletons/DetailSkeleton.tsx` — for detail/view pages
- [ ] 3.4.6 Create `components/skeletons/DashboardSkeleton.tsx` — for dashboard widgets
- [ ] 3.4.7 Create `components/skeletons/MapSkeleton.tsx` — for map views
- [ ] 3.4.8 Create `components/skeletons/TimelineSkeleton.tsx` — for claim timeline

### 3.5 — Remaining Error Boundaries (batch script)

- [ ] 3.5.1 Script: generate `error.tsx` for every `page.tsx` folder missing one under `(app)/`
- [ ] 3.5.2 Script: generate `loading.tsx` for every `page.tsx` folder missing one under `(app)/`
- [ ] 3.5.3 Add `error.tsx` to all portal routes (`/portal/**`)
- [ ] 3.5.4 Add `error.tsx` to all onboarding routes
- [ ] 3.5.5 Add `error.tsx` to all auth routes
- [ ] 3.5.6 Verify `global-error.tsx` exists at app root
- [ ] 3.5.7 Test: trigger error in each critical page — confirm boundary catches it
- [ ] 3.5.8 Test: verify loading states render skeleton, not blank page

### 3.6 — API Error Response Standardization

- [ ] 3.6.1 Audit all routes returning `{ error: string }` — standardize to `{ error: string, code: string, details?: any }`
- [ ] 3.6.2 Replace all `return new Response(JSON.stringify(...))` with `NextResponse.json()`
- [ ] 3.6.3 Add proper HTTP status codes (currently many return 200 with error body)
- [ ] 3.6.4 Add request ID to all error responses for debugging
- [ ] 3.6.5 Create `lib/api/handleApiError.ts` — centralized try/catch wrapper for route handlers

---

## 📋 SPRINT 4 — STRIPE DUNNING, BILLING HARDENING & EMAIL GAPS

### 4.1 — Stripe Dunning & Grace Period

- [ ] 4.1.1 Handle `invoice.payment_failed` webhook event — set org to grace period
- [ ] 4.1.2 Handle `customer.subscription.past_due` — send dunning email #1
- [ ] 4.1.3 Create grace period logic: allow 7-day access after payment failure
- [ ] 4.1.4 Create `GracePeriodBanner.tsx` — show "Update payment method" banner during grace
- [ ] 4.1.5 Handle `customer.subscription.deleted` — downgrade to free tier after grace expires
- [ ] 4.1.6 Create dunning email template #1: "Payment failed — update your card"
- [ ] 4.1.7 Create dunning email template #2: "Last chance — your subscription will be cancelled"
- [ ] 4.1.8 Create dunning email template #3: "Subscription cancelled — here's what you lose"
- [ ] 4.1.9 Test dunning flow end-to-end with `stripe trigger` CLI
- [ ] 4.1.10 Add Stripe customer portal deep link for self-service card update

### 4.2 — Billing Page Hardening

- [ ] 4.2.1 Show current plan details on billing page (plan name, price, next billing date)
- [ ] 4.2.2 Show payment method on file (last 4 digits, expiry)
- [ ] 4.2.3 Show invoice history with download links
- [ ] 4.2.4 Handle plan upgrade/downgrade mid-cycle (prorated)
- [ ] 4.2.5 Handle seat count changes (add/remove seats)
- [ ] 4.2.6 Add `PlanComparisonTable.tsx` — show feature comparison across tiers
- [ ] 4.2.7 Block premium features when on free tier (show upgrade modal)
- [ ] 4.2.8 Handle coupon/promo code redemption
- [ ] 4.2.9 Verify `api/billing/reconcile` cron runs daily and catches drift
- [ ] 4.2.10 Write test: webhook signature verification prevents spoofing

### 4.3 — Email Template Gaps

- [ ] 4.3.1 Create React email: "Team invite accepted" notification to admin
- [ ] 4.3.2 Create React email: "New claim assigned to you" notification
- [ ] 4.3.3 Create React email: "Invoice paid" confirmation to both parties
- [ ] 4.3.4 Create React email: "Report ready for review" notification
- [ ] 4.3.5 Create React email: "Appointment reminder" (24hr before)
- [ ] 4.3.6 Create React email: "Weekly activity digest" summary
- [ ] 4.3.7 Convert remaining 4 HTML email templates to React (for consistency)
- [ ] 4.3.8 Add unsubscribe link to all transactional emails
- [ ] 4.3.9 Create email preference center page (`/settings/notifications`)
- [ ] 4.3.10 Test: verify all emails render in Gmail, Outlook, Apple Mail
- [ ] 4.3.11 Fix stubbed `invite` email — currently doesn't send actual email
- [ ] 4.3.12 Add email send logging (track sent/delivered/bounced)

### 4.4 — Subscription Feature Gates

- [ ] 4.4.1 Create `lib/billing/featureGates.ts` — centralized feature → plan mapping
- [ ] 4.4.2 Create `UpgradeModal.tsx` — shown when free tier user hits gated feature
- [ ] 4.4.3 Gate AI report generation to Pro+ tier
- [ ] 4.4.4 Gate cover page builder to Pro+ tier
- [ ] 4.4.5 Gate CSV/Excel export to Pro+ tier
- [ ] 4.4.6 Gate team seats beyond 1 to Pro+ tier
- [ ] 4.4.7 Gate custom branding colors to Pro+ tier
- [ ] 4.4.8 Add `usePlan()` hook for client-side feature checks
- [ ] 4.4.9 Add server-side `requirePlan("pro")` middleware for API routes
- [ ] 4.4.10 Test: free user cannot access gated features, sees upgrade prompt

---

## 📋 SPRINT 5 — ONBOARDING CONSOLIDATION + DEAD PAGE CLEANUP

### 5.1 — Onboarding Audit & Consolidation

- [ ] 5.1.1 Map all 12 onboarding entry points — document which are active vs dead
- [ ] 5.1.2 Define single canonical onboarding flow: `/(app)/onboarding` → `start` → role selection → role-specific steps
- [ ] 5.1.3 Merge `/getting-started` into `/onboarding` (redirect old URL)
- [ ] 5.1.4 Merge `/auto-onboard` into `/onboarding` (redirect old URL)
- [ ] 5.1.5 Consolidate `/trades/onboarding/*` into unified flow with role=trades branch
- [ ] 5.1.6 Fix `/client/[slug]/onboarding` — verify it works for client-side onboarding
- [ ] 5.1.7 Fix `/portal/onboarding` — verify it works for homeowner portal
- [ ] 5.1.8 Create `OnboardingProgress.tsx` — progress bar showing step X of Y
- [ ] 5.1.9 Create `OnboardingChecklist.tsx` — persistent checklist widget on dashboard
- [ ] 5.1.10 Add "skip for now" on non-critical onboarding steps
- [ ] 5.1.11 Track onboarding completion % in database per user/org
- [ ] 5.1.12 Show onboarding CTA on dashboard until 100% complete

### 5.2 — Dead Page Detection & Removal

- [ ] 5.2.1 Run full route analysis: cross-reference all `page.tsx` files with sidebar nav links
- [ ] 5.2.2 Identify pages with zero inbound links (orphaned pages)
- [ ] 5.2.3 Identify pages importing from `archive/` or `legacy/` folders
- [ ] 5.2.4 Remove or redirect dead routes to canonical equivalents
- [ ] 5.2.5 Check `archive/` folder — verify nothing is importable from app routes
- [ ] 5.2.6 Remove `archive/legacy/` pages that are fully replaced
- [ ] 5.2.7 Remove `archive/dead-org-creators/` if unused
- [ ] 5.2.8 Remove `archive/duplicate-onboarding-app-group/` if consolidated
- [ ] 5.2.9 Remove `archive/orphaned-network-routes/` if replaced
- [ ] 5.2.10 Remove `archive/unused/` entirely
- [ ] 5.2.11 Remove `archive/unused-agents/` entirely
- [ ] 5.2.12 Remove `archive/unused-ai-schemas/` entirely

### 5.3 — Navigation Cleanup

- [ ] 5.3.1 Audit sidebar nav — remove links to dead pages
- [ ] 5.3.2 Audit sidebar nav — group related items (Messages + Inbox → Communication)
- [ ] 5.3.3 Fix any 404 links in sidebar/header
- [ ] 5.3.4 Add breadcrumbs to all settings sub-pages
- [ ] 5.3.5 Add breadcrumbs to all trades sub-pages
- [ ] 5.3.6 Verify all sidebar links have correct active state highlighting
- [ ] 5.3.7 Fix mobile sidebar — verify hamburger menu works on all pages
- [ ] 5.3.8 Add keyboard shortcuts for top nav items (⌘K search, etc.)

### 5.4 — URL Redirect Safety Net

- [ ] 5.4.1 Create `next.config.mjs` redirects for all removed/renamed pages
- [ ] 5.4.2 Add redirect: `/getting-started` → `/onboarding`
- [ ] 5.4.3 Add redirect: `/auto-onboard` → `/onboarding`
- [ ] 5.4.4 Add redirect for any other renamed routes
- [ ] 5.4.5 Test: old bookmarked URLs redirect properly, don't 404
- [ ] 5.4.6 Add 404 page with helpful navigation links
- [ ] 5.4.7 Track 404 hits in Sentry to find broken links in the wild

---

## 📋 SPRINT 6 — MESSAGES CONSOLIDATION + DUPLICATE ROUTE KILL

### 6.1 — Messages Architecture Decision

- [ ] 6.1.1 Decide: keep `/messages` (hub) as canonical, make `/trades/messages` a filtered view
- [ ] 6.1.2 OR: merge both into `/messages` with tabs (All | Team | Clients | Trades)
- [ ] 6.1.3 Document the chosen architecture in ARCHITECTURE.md

### 6.2 — Messages Consolidation

- [ ] 6.2.1 Extract shared `MessageThread` component from `/trades/messages` (817 lines → shared component)
- [ ] 6.2.2 Extract shared `MessageComposer` component
- [ ] 6.2.3 Extract shared `ThreadList` component with filter props
- [ ] 6.2.4 Refactor `/messages/page.tsx` to use shared components
- [ ] 6.2.5 Refactor `/trades/messages/page.tsx` to use shared components (or redirect to `/messages?filter=trades`)
- [ ] 6.2.6 Unify API: merge `/api/messages` and `/api/trades/messages` thread listing
- [ ] 6.2.7 Add thread type filter param (`?type=all|team|client|trades`)
- [ ] 6.2.8 Add real-time message indicators (unread count in sidebar badge)
- [ ] 6.2.9 Verify `/claims/[claimId]/messages` still works as scoped view
- [ ] 6.2.10 Verify `/portal/messages` works for client-side messaging
- [ ] 6.2.11 Add thread search/filter UI
- [ ] 6.2.12 Add message read receipts
- [ ] 6.2.13 Test: send message from pro → client portal receives it
- [ ] 6.2.14 Test: send message from trades → other contractor receives it

### 6.3 — Duplicate Route Sweep

- [ ] 6.3.1 Cross-reference all page routes for functional duplicates
- [ ] 6.3.2 Check for duplicate API routes (different paths, same functionality)
- [ ] 6.3.3 Check for duplicate components (same UI, different files)
- [ ] 6.3.4 Merge duplicate utility functions (check `lib/` for redundancy)
- [ ] 6.3.5 Remove legacy API routes that are superseded
- [ ] 6.3.6 Verify no circular imports exist

### 6.4 — Branding System Unification

- [ ] 6.4.1 Clarify: `/settings/branding` (org branding) vs `/trades/company/edit` (company profile) — different purposes, keep both
- [ ] 6.4.2 Add cross-link: `/settings/branding` → "Also edit your Trades company profile"
- [ ] 6.4.3 Add cross-link: `/trades/company/edit` → "Also set up your report branding"
- [ ] 6.4.4 Ensure branding data flows to cover page builder (auto-populate from org_branding)

---

## 📋 SPRINT 7 — TEST COVERAGE BLITZ

> **Why:** 70 test files for 528 routes + 453 pages = ~4% coverage. One bad deploy could break everything.

### 7.1 — Test Infrastructure

- [ ] 7.1.1 Configure vitest for API route testing (mock Prisma, mock Clerk auth)
- [ ] 7.1.2 Create `tests/helpers/mockAuth.ts` — reusable auth mock for different roles
- [ ] 7.1.3 Create `tests/helpers/mockPrisma.ts` — reusable Prisma mock with common data
- [ ] 7.1.4 Create `tests/helpers/mockStripe.ts` — Stripe mock for billing tests
- [ ] 7.1.5 Create `tests/helpers/createTestOrg.ts` — factory for test org/user/member
- [ ] 7.1.6 Set up test coverage reporting with threshold (target: 40%)
- [ ] 7.1.7 Add pre-commit hook: run affected tests only

### 7.2 — Critical API Route Tests (happy path + error cases)

- [ ] 7.2.1 Test `api/claims/route.ts` — CRUD operations
- [ ] 7.2.2 Test `api/invoices/route.ts` — CRUD + payment flow
- [ ] 7.2.3 Test `api/contacts/route.ts` — CRUD operations
- [ ] 7.2.4 Test `api/messages/route.ts` — thread CRUD + message send
- [ ] 7.2.5 Test `api/branding/save/route.ts` — save + validation
- [ ] 7.2.6 Test `api/trades/company/route.ts` — company CRUD
- [ ] 7.2.7 Test `api/trades/company/seats/invite/route.ts` — invite + revoke
- [ ] 7.2.8 Test `api/trades/company/seats/accept/route.ts` — accept + auto-connect
- [ ] 7.2.9 Test `api/billing/checkout/route.ts` — Stripe session creation
- [ ] 7.2.10 Test `api/webhooks/stripe/route.ts` — all event types

### 7.3 — Auth & Security Tests

- [ ] 7.3.1 Test: unauthenticated request to protected route → 401
- [ ] 7.3.2 Test: wrong org member accessing another org's data → 403
- [ ] 7.3.3 Test: non-admin accessing admin-only route → 403
- [ ] 7.3.4 Test: rate limiting triggers after N requests → 429
- [ ] 7.3.5 Test: CORS headers are correct on all API responses
- [ ] 7.3.6 Test: Stripe webhook without valid signature → 400
- [ ] 7.3.7 Test: Clerk webhook without valid signature → 400
- [ ] 7.3.8 Test: SQL injection attempts are blocked
- [ ] 7.3.9 Test: cross-org data isolation (user A can't see org B's claims)
- [ ] 7.3.10 Test: middleware redirects work for all identity surfaces

### 7.4 — Component Tests (React Testing Library)

- [ ] 7.4.1 Test `BrandingForm.tsx` — form validation + submit
- [ ] 7.4.2 Test `CoverPageBanner.tsx` — dismiss persistence
- [ ] 7.4.3 Test `CompanyBrandingPreview.tsx` — empty state + configured state
- [ ] 7.4.4 Test `MessageComposer.tsx` — send message
- [ ] 7.4.5 Test `InvoiceForm.tsx` — line item calculation
- [ ] 7.4.6 Test `ClaimForm.tsx` — required fields validation
- [ ] 7.4.7 Test `PipelineBoard.tsx` — drag and drop stages
- [ ] 7.4.8 Test `UpgradeModal.tsx` — renders plan comparison
- [ ] 7.4.9 Test sidebar nav — active state, mobile toggle
- [ ] 7.4.10 Test dashboard widgets — loading, error, data states

### 7.5 — E2E Tests (Playwright)

- [ ] 7.5.1 E2E: Login → Dashboard → Create Claim → View Claim
- [ ] 7.5.2 E2E: Create Invoice → Send → Verify PDF
- [ ] 7.5.3 E2E: Onboarding flow → Complete setup → Dashboard
- [ ] 7.5.4 E2E: Branding setup → Cover page builder → Save
- [ ] 7.5.5 E2E: Send message → Recipient sees it
- [ ] 7.5.6 E2E: Trades onboarding → Create company → Invite member
- [ ] 7.5.7 E2E: Portal login → View claim → Send message
- [ ] 7.5.8 E2E: Billing → Select plan → Checkout → Subscription active
- [ ] 7.5.9 E2E: Search → Filter → Export results
- [ ] 7.5.10 E2E: Mobile responsive — verify critical flows on 375px width

### 7.6 — Regression Tests

- [ ] 7.6.1 Snapshot tests for all email templates
- [ ] 7.6.2 Snapshot tests for PDF report cover page
- [ ] 7.6.3 Test: async params work on all dynamic routes (Next.js 15 compat)
- [ ] 7.6.4 Test: all routes in `config/routes.ts` actually resolve to pages
- [ ] 7.6.5 CI: add test run to GitHub Actions on every PR
- [ ] 7.6.6 CI: block merge if tests fail
- [ ] 7.6.7 CI: add coverage badge to README
- [ ] 7.6.8 CI: add Lighthouse CI checks for performance regression

---

## 📋 SPRINT 8 — EXPORT/ACCOUNTING, MOBILE RESPONSIVE, OFFLINE

### 8.1 — CSV/Excel Export

- [ ] 8.1.1 Create `lib/export/csvExporter.ts` — generic CSV builder
- [ ] 8.1.2 Create `lib/export/excelExporter.ts` — XLSX builder with formatting
- [ ] 8.1.3 Add CSV export to claims list page
- [ ] 8.1.4 Add CSV export to invoices list page
- [ ] 8.1.5 Add CSV export to contacts list page
- [ ] 8.1.6 Add CSV export to pipeline view
- [ ] 8.1.7 Add CSV export to analytics/reports page
- [ ] 8.1.8 Add date range filter to all exports
- [ ] 8.1.9 Add column selection to all exports
- [ ] 8.1.10 Test: exported CSV opens correctly in Excel, Google Sheets

### 8.2 — QuickBooks Integration

- [ ] 8.2.1 Research QuickBooks Online API — OAuth2 + invoice sync
- [ ] 8.2.2 Create `lib/integrations/quickbooks.ts` — QB API client
- [ ] 8.2.3 Add QB OAuth connect flow in Settings → Integrations
- [ ] 8.2.4 Sync invoices to QuickBooks on creation
- [ ] 8.2.5 Sync payments from QuickBooks back to platform
- [ ] 8.2.6 Map platform line items to QB chart of accounts
- [ ] 8.2.7 Add "Sync to QuickBooks" button on individual invoices
- [ ] 8.2.8 Add sync status indicator on invoice list
- [ ] 8.2.9 Handle QB rate limits and retry logic
- [ ] 8.2.10 Test: round-trip invoice sync (create in app → appears in QB)

### 8.3 — Mobile Responsive Audit

- [ ] 8.3.1 Audit dashboard at 375px — fix overflow/layout issues
- [ ] 8.3.2 Audit claims list at 375px — make table responsive (card layout on mobile)
- [ ] 8.3.3 Audit invoice creation at 375px — fix form layout
- [ ] 8.3.4 Audit messages at 375px — fix thread list + message view layout
- [ ] 8.3.5 Audit pipeline board at 375px — horizontal scroll or stacked view
- [ ] 8.3.6 Audit branding page at 375px — fix form + preview layout
- [ ] 8.3.7 Audit cover page builder at 375px — hide live preview, show mobile editor
- [ ] 8.3.8 Fix touch targets: all buttons minimum 44x44px
- [ ] 8.3.9 Fix font sizes: minimum 16px on mobile inputs (prevent iOS zoom)
- [ ] 8.3.10 Add mobile-specific navigation (bottom tab bar)
- [ ] 8.3.11 Test on real devices: iPhone 15, Galaxy S24, iPad

### 8.4 — Offline Resilience

- [ ] 8.4.1 Create `/offline` page — branded offline fallback
- [ ] 8.4.2 Update service worker to cache critical app shell
- [ ] 8.4.3 Cache dashboard page for offline viewing
- [ ] 8.4.4 Show "You're offline" banner when connection drops
- [ ] 8.4.5 Queue form submissions when offline → sync when back online
- [ ] 8.4.6 Cache recent messages for offline reading
- [ ] 8.4.7 Test: disable network → app shows offline page, not browser error
- [ ] 8.4.8 Test: fill form offline → reconnect → data syncs

---

## 📋 SPRINT 9 — MONITORING, LOGGING, SENTRY SPANS + PERFORMANCE

### 9.1 — Structured Logging

- [ ] 9.1.1 Audit all `console.log` — replace with `logger.info/warn/error`
- [ ] 9.1.2 Add request ID to all log entries
- [ ] 9.1.3 Add org ID to all log entries (for per-org debugging)
- [ ] 9.1.4 Add user ID to all log entries
- [ ] 9.1.5 Create log levels config: DEBUG in dev, INFO in staging, WARN in prod
- [ ] 9.1.6 Add structured JSON logging for server-side logs
- [ ] 9.1.7 Ship server logs to external provider (Axiom, Datadog, or Sentry)
- [ ] 9.1.8 Create `lib/logger/apiLogger.ts` — auto-log all API request/response (status, duration, orgId)
- [ ] 9.1.9 Create log rotation / cleanup for local log files
- [ ] 9.1.10 Add log alerts: notify on 5xx spike, auth failure spike

### 9.2 — Sentry Enhancement

- [ ] 9.2.1 Add Sentry performance spans to all API routes
- [ ] 9.2.2 Add Sentry breadcrumbs to key user actions (claim created, invoice sent, etc.)
- [ ] 9.2.3 Set up Sentry release tracking (tie errors to deploy versions)
- [ ] 9.2.4 Set up Sentry source maps for production debugging
- [ ] 9.2.5 Create Sentry alert rules: P0 error → Slack/email immediately
- [ ] 9.2.6 Add custom Sentry tags: orgId, userId, planTier, surface
- [ ] 9.2.7 Set up Sentry session replay for bug reproduction
- [ ] 9.2.8 Fix any unhandled promise rejection warnings
- [ ] 9.2.9 Test: trigger error → confirm Sentry alert fires
- [ ] 9.2.10 Create Sentry dashboard for DAU health metrics

### 9.3 — Performance Optimization

- [ ] 9.3.1 Add `loading="lazy"` to all below-fold images
- [ ] 9.3.2 Add `priority` to above-fold hero images (dashboard, branding preview)
- [ ] 9.3.3 Audit bundle size — identify and code-split large dependencies
- [ ] 9.3.4 Add database query optimization: `select` only needed fields (not `select *`)
- [ ] 9.3.5 Add pagination to all list API routes (default limit: 50)
- [ ] 9.3.6 Add cursor-based pagination for large datasets (claims, invoices, messages)
- [ ] 9.3.7 Add Redis caching for frequently-read data (branding, org settings, plan info)
- [ ] 9.3.8 Add `stale-while-revalidate` headers for static-ish pages
- [ ] 9.3.9 Run Lighthouse CI — fix all scores below 80
- [ ] 9.3.10 Optimize Prisma queries: add `include` only when needed (not eager-loading relations)
- [ ] 9.3.11 Add database connection pooling (PgBouncer or Prisma Accelerate)
- [ ] 9.3.12 Profile and fix N+1 query patterns

### 9.4 — Health Monitoring

- [ ] 9.4.1 Enhance `/api/health` — check DB, Redis, Stripe, Clerk, S3 connectivity
- [ ] 9.4.2 Add `/api/health/deep` — runs sample queries to verify data integrity
- [ ] 9.4.3 Create status page (public) showing system health
- [ ] 9.4.4 Set up uptime monitoring (Checkly, Better Uptime, or Vercel analytics)
- [ ] 9.4.5 Set up PagerDuty/Slack alerts for downtime
- [ ] 9.4.6 Create runbook for common failure scenarios
- [ ] 9.4.7 Add cron job health checks — verify cron jobs are running on schedule
- [ ] 9.4.8 Monitor Prisma connection pool usage
- [ ] 9.4.9 Monitor API response times p50/p95/p99

---

## 📋 SPRINT 10 — FINAL POLISH, SECURITY AUDIT, LOAD TESTING, SHIP

### 10.1 — Security Hardening

- [ ] 10.1.1 Run OWASP ZAP scan against staging environment
- [ ] 10.1.2 Verify all API routes check auth (no open endpoints)
- [ ] 10.1.3 Verify all file uploads validate mime type and size
- [ ] 10.1.4 Add Content-Security-Policy headers
- [ ] 10.1.5 Add X-Frame-Options, X-Content-Type-Options headers
- [ ] 10.1.6 Verify no secrets in client-side bundle (grep for API keys)
- [ ] 10.1.7 Verify no PII in logs (mask emails, phone numbers)
- [ ] 10.1.8 Add rate limiting to auth endpoints (login, signup, password reset)
- [ ] 10.1.9 Add rate limiting to file upload endpoints
- [ ] 10.1.10 Audit third-party dependencies for known vulnerabilities (`npm audit`)
- [ ] 10.1.11 Verify RBAC: admin-only routes blocked for regular users
- [ ] 10.1.12 Verify cross-org isolation: user can't access other org's data via API

### 10.2 — Load Testing

- [ ] 10.2.1 Create k6/Artillery load test scripts for critical API routes
- [ ] 10.2.2 Load test: 100 concurrent users on dashboard
- [ ] 10.2.3 Load test: 50 concurrent claim creates
- [ ] 10.2.4 Load test: 50 concurrent message sends
- [ ] 10.2.5 Load test: 20 concurrent AI report generations
- [ ] 10.2.6 Load test: 100 concurrent file uploads
- [ ] 10.2.7 Identify and fix bottlenecks found in load testing
- [ ] 10.2.8 Set performance budgets: API < 200ms p95, pages < 3s LCP
- [ ] 10.2.9 Stress test: 500 concurrent users — find breaking point
- [ ] 10.2.10 Document capacity limits and scaling plan

### 10.3 — UI Polish

- [ ] 10.3.1 Consistent toast notifications (replace all `alert()` calls with `toast()`)
- [ ] 10.3.2 Add success animations on key actions (claim created, invoice sent)
- [ ] 10.3.3 Fix any z-index stacking issues (modals, dropdowns, tooltips)
- [ ] 10.3.4 Verify dark mode works on all pages
- [ ] 10.3.5 Add keyboard navigation to all forms and tables
- [ ] 10.3.6 Add ARIA labels to all interactive elements
- [ ] 10.3.7 Run axe accessibility audit — fix all violations
- [ ] 10.3.8 Add empty states to all list pages (no claims yet, no invoices yet, etc.)
- [ ] 10.3.9 Polish favicon, OG image, meta tags for SEO
- [ ] 10.3.10 Add print styles for invoice and report pages

### 10.4 — Documentation & Ship Prep

- [ ] 10.4.1 Update README with setup instructions, env vars, architecture overview
- [ ] 10.4.2 Update ARCHITECTURE.md with current system design
- [ ] 10.4.3 Create API documentation (auto-generate from Zod schemas)
- [ ] 10.4.4 Create user-facing help docs / knowledge base
- [ ] 10.4.5 Create deployment runbook (Vercel, DB migrations, env setup)
- [ ] 10.4.6 Create incident response playbook
- [ ] 10.4.7 Set up staging environment for pre-prod testing
- [ ] 10.4.8 Final smoke test: run all E2E tests against staging
- [ ] 10.4.9 Final Lighthouse audit: all pages score 80+
- [ ] 10.4.10 🚀 SHIP IT — Deploy to production with confidence

---

## TOTAL COUNT

| Sprint                                | Todos   |
| ------------------------------------- | ------- |
| Sprint 1 — Zod Batch 1                | 52      |
| Sprint 2 — Zod Batch 2 + Transactions | 55      |
| Sprint 3 — Error Boundaries + Loading | 58      |
| Sprint 4 — Billing + Email            | 45      |
| Sprint 5 — Onboarding + Dead Pages    | 47      |
| Sprint 6 — Messages + Duplicates      | 40      |
| Sprint 7 — Test Coverage              | 68      |
| Sprint 8 — Export + Mobile + Offline  | 41      |
| Sprint 9 — Monitoring + Performance   | 41      |
| Sprint 10 — Security + Ship           | 42      |
| **TOTAL**                             | **489** |

---

_This plan transforms SkaiScraper from a feature-complete prototype into a battle-hardened, enterprise-grade platform ready for real daily active users. Each sprint builds on the previous one. No shortcuts. No excuses. We finish this site NOW._

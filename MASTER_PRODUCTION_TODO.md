# 🏗️ SKAISCRAPER — MASTER PRODUCTION READINESS TODO

**Generated:** February 23, 2026  
**Objective:** Get SkaiScraper Pro fully production-ready for live DAU  
**Total Routes:** 516 API routes audited  
**Auth Coverage:** 98 routes on `withAuth` · 418 routes still on legacy/raw/no auth  

---

## TABLE OF CONTENTS

1. [🔴 P0 — CRITICAL (Blocks Revenue / Data Loss Risk)](#-p0--critical)
2. [🟠 P1 — HIGH (Auth / Security / Tenant Isolation)](#-p1--high)
3. [🟡 P2 — MEDIUM (Features / Functionality Gaps)](#-p2--medium)
4. [🔵 P3 — STANDARD (UX / Consistency / Polish)](#-p3--standard)
5. [🟢 P4 — LOW (Tech Debt / Optimization)](#-p4--low)
6. [📊 Audit Stats & Sprint History](#-audit-stats--sprint-history)

---

## 🔴 P0 — CRITICAL

> These items will cause data corruption, revenue loss, or security breaches in production.

### PDF/Report Pipeline — MOCK DATA IN PRODUCTION

- [ ] **TODO-001** · Wire `useReportBranding()` to real DB — currently returns hardcoded fake data ("SkaiScraper Demo Co.", "(555) 123-4567", "contact@skaiscrape.com"). Any PDF downloaded by a paying customer shows fake company info. **File:** `src/modules/reports/core/DataProviders.ts:21-33`
- [ ] **TODO-002** · Wire `useReportClaimData()` to real DB — returns fake claim data ("Jane Homeowner", "456 Oak Ave", "CLM-2025-001234"). **File:** `DataProviders.ts:39-54`
- [ ] **TODO-003** · Wire `useReportWeather()` to real DB — returns fake weather data. **File:** `DataProviders.ts:59-80`
- [ ] **TODO-004** · Wire `useReportPhotos()` to real DB — returns placeholder.com URLs. **File:** `DataProviders.ts:85-110`
- [ ] **TODO-005** · Wire `useReportLineItems()` to real DB — returns fake line items. **File:** `DataProviders.ts:115-140`
- [ ] **TODO-006** · Wire `useReportCodes()` to real DB — returns fake building codes. **File:** `DataProviders.ts:145-165`
- [ ] **TODO-007** · Wire `useReportSupplements()` to real DB — returns fake supplements. **File:** `DataProviders.ts:170-190`
- [ ] **TODO-008** · Refactor export route to accept `orgId`+`claimId` and pass to DataProviders — `src/app/api/reports/[reportId]/export/route.ts` already has `orgId` from `withAuth` but never passes it to the mock functions.

### Token/Credits System — COMPLETELY BROKEN

- [ ] **TODO-009** · Create `/api/tokens/balance` route — frontend calls this but **no route exists** (404 in production). 
- [ ] **TODO-010** · Fix `billing/status` token balance — hardcoded to `0` with TODO comment. **File:** `src/app/api/billing/status/route.ts`
- [ ] **TODO-011** · Fix field name mismatch in token ledger — Prisma helper uses `amount`/`type` but SQL schema uses `delta`/`reason`. Writes silently fail. **File:** `src/lib/tokens/index.ts`
- [ ] **TODO-012** · Fix `stripe-reconcile` cron — token reconciliation is stubbed out with `TODO: usage_tokens model removed — wire up new token system`. **File:** `src/app/api/cron/stripe-reconcile/route.ts`
- [ ] **TODO-013** · Set real token costs — all costs in `lib/config/tokens.ts` are set to **0** (aiMockups, dolPulls, weatherReports all free forever).
- [ ] **TODO-014** · Wire token consumption into AI routes — AI features should deduct tokens but currently don't.

### Billing Route — NO-OP IN PRODUCTION

- [ ] **TODO-015** · Fix `billing/auto-refill` — uses raw `auth()` (not `withAuth`), never persists the `autoRefill` setting to `BillingSettings`, just logs and returns success. **Complete no-op mock.** **File:** `src/app/api/billing/auto-refill/route.ts`

### Error Message Exposure — 59 ROUTES

- [ ] **TODO-016** · Audit and fix 59 routes that expose raw `error.message` in JSON responses — leaks internal DB schema, Prisma errors, and stack traces to clients. Replace with generic error messages, log real errors server-side via Sentry.
- [ ] **TODO-017** · Fix AI damage analyze route — exposes `error.stack` in response. **File:** `src/app/api/ai/damage/analyze/route.ts`

### Security Config

- [ ] **TODO-018** · Remove `ignoreBuildErrors: true` from `next.config.mjs` — security-relevant TypeScript errors silently pass in production builds.
- [ ] **TODO-019** · Remove `ignoreDuringBuilds: true` for ESLint in `next.config.mjs` — security lint rules bypassed.
- [ ] **TODO-020** · Remove `'unsafe-eval'` from CSP `script-src` — enables `eval()`, allows XSS attack vectors. **File:** `next.config.mjs`

---

## 🟠 P1 — HIGH

> Auth gaps, tenant isolation risks, missing access controls.

### 58 Routes with ZERO Authentication

> These routes have no auth at all — no `withAuth`, no `requireAuth`, no `auth()`, nothing.

#### AI Routes (12 routes — CRITICAL: claim data accessible without auth)
- [ ] **TODO-021** · Add auth to `/api/ai/damage-builder` — no auth, operates on claim data
- [ ] **TODO-022** · Add auth to `/api/ai/dispatch/[claimId]` — no auth, accesses claim by ID
- [ ] **TODO-023** · Add auth to `/api/ai/enhanced-report-builder` — no auth
- [ ] **TODO-024** · Add auth to `/api/ai/estimate/[claimId]` — no auth, accesses claim by ID
- [ ] **TODO-025** · Add auth to `/api/ai/geometry/detect-slopes` — no auth
- [ ] **TODO-026** · Add auth to `/api/ai/orchestrate/[claimId]` — no auth, accesses claim by ID
- [ ] **TODO-027** · Add auth to `/api/ai/recommendations` — no auth
- [ ] **TODO-028** · Add auth to `/api/ai/report-builder` — no auth
- [ ] **TODO-029** · Add auth to `/api/ai/run` — no auth
- [ ] **TODO-030** · Add auth to `/api/ai/status` — no auth
- [ ] **TODO-031** · Add auth to `/api/ai/supplement/[claimId]` — no auth, accesses claim by ID
- [ ] **TODO-032** · Add auth to `/api/ai/usage` — no auth, exposes usage data

#### Data Routes (11 routes — claim/lead/project data exposed)
- [ ] **TODO-033** · Add auth to `/api/invoices/[id]` — no auth, exposes invoice data
- [ ] **TODO-034** · Add auth to `/api/leads/[id]/convert` — no auth, can convert leads
- [ ] **TODO-035** · Add auth to `/api/leads/[id]` — no auth, full lead CRUD
- [ ] **TODO-036** · Add auth to `/api/leads/[id]/route` — no auth
- [ ] **TODO-037** · Add auth to `/api/mortgage-checks` — no auth
- [ ] **TODO-038** · Add auth to `/api/permits/[id]` — no auth, permit data
- [ ] **TODO-039** · Add auth to `/api/permits` — no auth, permit data
- [ ] **TODO-040** · Add auth to `/api/pipeline` — no auth, pipeline/CRM data
- [ ] **TODO-041** · Add auth to `/api/projects/[id]` — no auth, project data
- [ ] **TODO-042** · Add auth to `/api/projects` — no auth, project data
- [ ] **TODO-043** · Add auth to `/api/tasks` — no auth, task data
- [ ] **TODO-044** · Add auth to `/api/retail-jobs` — no auth, job data
- [ ] **TODO-045** · Add auth to `/api/sms` — no auth, can send SMS messages

#### Template Routes (4 routes — template data exposed)
- [ ] **TODO-046** · Add auth to `/api/templates/[templateId]/placeholders` — no auth
- [ ] **TODO-047** · Add auth to `/api/templates/[templateId]/thumbnail` — no auth
- [ ] **TODO-048** · Review `/api/templates/[templateId]/public` — intentionally public? Add rate limiting
- [ ] **TODO-049** · Add rate limiting to `/api/templates/marketplace/**` — 3 routes, public but need protection

#### Intentionally Public (verify these are safe)
- [ ] **TODO-050** · Verify `/api/public/diag-org` is safe — diagnostic route, may expose org internals
- [ ] **TODO-051** · Verify `/api/public/claims` is safe — what claim data does it expose?
- [ ] **TODO-052** · Verify `/api/v1/leads/ingest` has API key auth — public lead ingestion endpoint
- [ ] **TODO-053** · Verify `/api/legal/document/[docId]` has proper access control
- [ ] **TODO-054** · Verify `/api/carrier/track/[trackingId]/[action]` is properly scoped

#### Webhook Routes (need signature verification)
- [ ] **TODO-055** · Add signature verification to `/api/integrations/quickbooks/webhook`
- [ ] **TODO-056** · Add signature verification to `/api/measurements/webhook`
- [ ] **TODO-057** · Add rate limiting to `/api/uploadthing` — no auth visible

### 233 Routes Using Raw `auth()` from Clerk

> These bypass org DB resolution, may use Clerk orgId directly, and lack standardized error handling. Converting all 233 is a long-term goal — prioritize by traffic and data sensitivity.

#### Claims CRUD (highest traffic — convert FIRST)
- [ ] **TODO-058** · Convert `/api/claims/[claimId]/route.ts` — GET/PUT/DELETE, raw `auth()`
- [ ] **TODO-059** · Convert `/api/claims/[claimId]/photos/route.ts` — raw `auth()`
- [ ] **TODO-060** · Convert `/api/claims/[claimId]/notes/route.ts` — raw `auth()`
- [ ] **TODO-061** · Convert `/api/claims/[claimId]/notes/[noteId]/route.ts` — raw `auth()`
- [ ] **TODO-062** · Convert `/api/claims/[claimId]/timeline/route.ts` — raw `auth()`
- [ ] **TODO-063** · Convert `/api/claims/[claimId]/contractors/route.ts` — raw `auth()`
- [ ] **TODO-064** · Convert `/api/claims/[claimId]/documents/route.ts` — raw `auth()`
- [ ] **TODO-065** · Convert `/api/claims/[claimId]/assets/route.ts` — raw `auth()`
- [ ] **TODO-066** · Convert `/api/claims/[claimId]/messages/route.ts` — raw `auth()`
- [ ] **TODO-067** · Convert `/api/claims/[claimId]/scope/route.ts` — raw `auth()`
- [ ] **TODO-068** · Convert `/api/claims/[claimId]/weather/route.ts` — raw `auth()`
- [ ] **TODO-069** · Convert `/api/claims/[claimId]/weather/refresh/route.ts` — raw `auth()`
- [ ] **TODO-070** · Convert `/api/claims/[claimId]/workspace/route.ts` — raw `auth()`
- [ ] **TODO-071** · Convert `/api/claims/[claimId]/update/route.ts` — raw `auth()`
- [ ] **TODO-072** · Convert `/api/claims/[claimId]/mutate/route.ts` — raw `auth()`
- [ ] **TODO-073** · Convert `/api/claims/[claimId]/import/route.ts` — raw `auth()`
- [ ] **TODO-074** · Convert `/api/claims/[claimId]/dol/route.ts` — raw `auth()`
- [ ] **TODO-075** · Convert `/api/claims/[claimId]/attach-contact/route.ts` — raw `auth()`
- [ ] **TODO-076** · Convert `/api/claims/[claimId]/ai/route.ts` — raw `auth()`
- [ ] **TODO-077** · Convert `/api/claims/[claimId]/ai/actions/route.ts` — raw `auth()`
- [ ] **TODO-078** · Convert `/api/claims/[claimId]/permissions/route.ts` — raw `auth()`
- [ ] **TODO-079** · Convert `/api/claims/[claimId]/reports/route.ts` — raw `auth()`
- [ ] **TODO-080** · Convert `/api/claims/[claimId]/supplements/route.ts` — raw `auth()`
- [ ] **TODO-081** · Convert `/api/claims/[claimId]/supplements/items/route.ts` — raw `auth()`
- [ ] **TODO-082** · Convert `/api/claims/[claimId]/trades/route.ts` — raw `auth()`
- [ ] **TODO-083** · Convert `/api/claims/[claimId]/final-payout/route.ts` — raw `auth()`
- [ ] **TODO-084** · Convert `/api/claims/[claimId]/final-payout/actions/route.ts` — raw `auth()`
- [ ] **TODO-085** · Convert `/api/claims/[claimId]/depreciation/export/route.ts` — raw `auth()`
- [ ] **TODO-086** · Convert `/api/claims/[claimId]/send-to-adjuster/route.ts` — raw `auth()`
- [ ] **TODO-087** · Convert `/api/claims/[claimId]/files/[fileId]/route.ts` — raw `auth()`
- [ ] **TODO-088** · Convert `/api/claims/route.ts` — raw `auth()` (if not using `withOrgScope`)
- [ ] **TODO-089** · Convert `/api/claims/intake/route.ts` — raw `auth()`
- [ ] **TODO-090** · Convert `/api/claims/list-lite/route.ts` — raw `auth()`
- [ ] **TODO-091** · Convert `/api/claims/resume/route.ts` — raw `auth()`
- [ ] **TODO-092** · Convert `/api/claims/parse-scope/route.ts` — raw `auth()`
- [ ] **TODO-093** · Convert `/api/claims/generate-packet/route.ts` — raw `auth()`
- [ ] **TODO-094** · Convert `/api/claims/documents/sharing/route.ts` — raw `auth()`
- [ ] **TODO-095** · Convert `/api/claims/ai/build/route.ts` — raw `auth()`
- [ ] **TODO-096** · Convert `/api/claims/ai/detect/route.ts` — raw `auth()`
- [ ] **TODO-097** · Convert `/api/claims-folder/assemble/route.ts` — raw `auth()`
- [ ] **TODO-098** · Convert `/api/claims-folder/export/route.ts` — raw `auth()`
- [ ] **TODO-099** · Convert `/api/claims-folder/score/route.ts` — raw `auth()`
- [ ] **TODO-100** · Convert `/api/claims-folder/sections/[section]/route.ts` — raw `auth()`
- [ ] **TODO-101** · Convert `/api/claims-folder/generate/*/route.ts` — 3 routes, raw `auth()`

#### Properties & Contacts
- [ ] **TODO-102** · Convert `/api/properties/route.ts` — raw `auth()`
- [ ] **TODO-103** · Convert `/api/properties/map/route.ts` — raw `auth()`
- [ ] **TODO-104** · Convert `/api/contacts/route.ts` — uses `getActiveOrgContext()`
- [ ] **TODO-105** · Convert `/api/contacts/[contactId]/route.ts` — uses `getActiveOrgContext()`
- [ ] **TODO-106** · Convert `/api/contacts/search/route.ts` — raw `auth()`

#### Leads
- [ ] **TODO-107** · Convert `/api/leads/route.ts` — uses `getCurrentUserPermissions()`
- [ ] **TODO-108** · Convert `/api/leads/[id]/files/route.ts` — raw `auth()`
- [ ] **TODO-109** · Convert `/api/leads/[id]/files/[fileId]/share/route.ts` — raw `auth()`
- [ ] **TODO-110** · Convert `/api/leads/[id]/notes/from-ai/route.ts` — raw `auth()`
- [ ] **TODO-111** · Convert `/api/leads/[id]/timeline/route.ts` — raw `auth()`

#### Settings
- [ ] **TODO-112** · Convert `/api/settings/export/route.ts` — raw `auth()`, uses Clerk orgId directly
- [ ] **TODO-113** · Convert `/api/settings/notifications/route.ts` — uses `getActiveOrgContext()`
- [ ] **TODO-114** · Convert `/api/settings/organization/route.ts` — uses `currentUser()` + raw lookups
- [ ] **TODO-115** · Add RBAC to settings/organization POST — any org member can rename the org, should require ADMIN/OWNER

#### Weather
- [ ] **TODO-116** · Convert `/api/weather/verify/route.ts` — raw `auth()`
- [ ] **TODO-117** · Convert `/api/weather/report/route.ts` — raw `auth()`
- [ ] **TODO-118** · Convert `/api/weather/quick/route.ts` — raw `auth()`
- [ ] **TODO-119** · Convert `/api/weather/quick-dol/route.ts` — raw `auth()`
- [ ] **TODO-120** · Convert `/api/weather/export/route.ts` — raw `auth()`
- [ ] **TODO-121** · Convert `/api/weather/build-smart/route.ts` — raw `auth()`
- [ ] **TODO-122** · Convert `/api/weather/analytics/route.ts` — raw `auth()`
- [ ] **TODO-123** · Convert `/api/weather/analytics/insights/route.ts` — raw `auth()`
- [ ] **TODO-124** · Convert `/api/weather/share/route.ts` — raw `auth()`

#### AI Routes (already authed but using raw patterns)
- [ ] **TODO-125** · Convert `/api/ai/analyze-damage/route.ts` — raw `auth()`
- [ ] **TODO-126** · Convert `/api/ai/analyze-photo/route.ts` — raw `auth()`
- [ ] **TODO-127** · Convert `/api/ai/chat/route.ts` — raw `auth()`
- [ ] **TODO-128** · Convert `/api/ai/claim-assistant/route.ts` — raw `auth()`
- [ ] **TODO-129** · Convert `/api/ai/claim-writer/route.ts` — raw `auth()`
- [ ] **TODO-130** · Convert `/api/ai/damage/analyze/route.ts` — raw `auth()`
- [ ] **TODO-131** · Convert `/api/ai/damage/route.ts` — raw `auth()`
- [ ] **TODO-132** · Convert `/api/ai/domain/route.ts` — raw `auth()`
- [ ] **TODO-133** · Convert `/api/ai/estimate-value/route.ts` — raw `auth()`
- [ ] **TODO-134** · Convert `/api/ai/history/route.ts` — raw `auth()`
- [ ] **TODO-135** · Convert `/api/ai/inspect/route.ts` — raw `auth()`
- [ ] **TODO-136** · Convert `/api/ai/job-scanner/route.ts` — raw `auth()`
- [ ] **TODO-137** · Convert `/api/ai/rebuttal/route.ts` — raw `auth()`
- [ ] **TODO-138** · Convert `/api/ai/rebuttal/export-pdf/route.ts` — raw `auth()`
- [ ] **TODO-139** · Convert `/api/ai/smart-actions/route.ts` — raw `auth()`
- [ ] **TODO-140** · Convert `/api/ai/suggest-status/route.ts` — raw `auth()`
- [ ] **TODO-141** · Convert `/api/ai/supplement/export-pdf/route.ts` — raw `auth()`
- [ ] **TODO-142** · Convert `/api/ai/video/route.ts` — raw `auth()`
- [ ] **TODO-143** · Convert `/api/ai/vision/analyze/route.ts` — raw `auth()`
- [ ] **TODO-144** · Convert `/api/ai/weather/run/route.ts` — raw `auth()`
- [ ] **TODO-145** · Convert `/api/ai/3d/route.ts` — raw `auth()`
- [ ] **TODO-146** · Convert `/api/ai/dashboard-assistant/route.ts` — raw `auth()`
- [ ] **TODO-147** · Convert `/api/ai/mockup/generate/route.ts` — if exists

#### Branding
- [ ] **TODO-148** · Convert `/api/branding/save/route.ts` — uses manual `currentUser()` + `getActiveOrgContext()`, should be `withAuth`
- [ ] **TODO-149** · Convert `/api/branding/route.ts` (GET/POST) — legacy duplicate of `branding/get`
- [ ] **TODO-150** · Convert `/api/branding/upload/route.ts` — raw `auth()`, no RBAC, no rate limiting
- [ ] **TODO-151** · Convert `/api/branding/status/route.ts` — raw `auth()`, different org resolution path
- [ ] **TODO-152** · Deduplicate branding GET routes — `branding/route.ts` GET and `branding/get/route.ts` GET both fetch branding with different auth and query logic. Pick one, deprecate other.

#### Team & Invitations
- [ ] **TODO-153** · Convert `/api/team/invitations/[id]/revoke/route.ts` — raw `auth()` + `getActiveOrgContext()`
- [ ] **TODO-154** · Convert `/api/team/invitations/[id]/resend/route.ts` — raw `auth()` + `getActiveOrgContext()`
- [ ] **TODO-155** · Fix invitation resend — doesn't actually send email, just extends expiration. **File:** `team/invitations/[id]/resend/route.ts`
- [ ] **TODO-156** · Add seat enforcement to invitation creation — no check if org has available seats before sending invite
- [ ] **TODO-157** · Convert `/api/team/activity/route.ts` — basic auth pattern
- [ ] **TODO-158** · Convert `/api/teams/invite/route.ts` — check if duplicate of `team/invitations`

#### Estimates
- [ ] **TODO-159** · Convert `/api/estimates/route.ts` — raw `auth()`
- [ ] **TODO-160** · Convert `/api/estimates/[id]/route.ts` — raw `auth()`
- [ ] **TODO-161** · Convert `/api/estimates/build/route.ts` — raw `auth()`
- [ ] **TODO-162** · Convert `/api/estimates/save/route.ts` — raw `auth()`
- [ ] **TODO-163** · Convert `/api/estimates/[id]/draft-email/route.ts` — raw `auth()`
- [ ] **TODO-164** · Convert `/api/estimates/[id]/export/json/route.ts` — raw `auth()`
- [ ] **TODO-165** · Convert `/api/estimates/[id]/send-packet/route.ts` — raw `auth()`
- [ ] **TODO-166** · Convert `/api/estimate/export/route.ts` — raw `auth()`
- [ ] **TODO-167** · Convert `/api/estimate/priced/route.ts` — raw `auth()`

#### Messages
- [ ] **TODO-168** · Convert `/api/messages/threads/route.ts` — raw `auth()`
- [ ] **TODO-169** · Convert `/api/messages/[threadId]/route.ts` — raw `auth()`
- [ ] **TODO-170** · Convert `/api/messages/create/route.ts` — raw `auth()`
- [ ] **TODO-171** · Convert `/api/messages/send/route.ts` — raw `auth()`
- [ ] **TODO-172** · Convert `/api/messages/[threadId]/[messageId]/read/route.ts` — raw `auth()`
- [ ] **TODO-173** · Convert `/api/messages/client/create/route.ts` — raw `auth()`
- [ ] **TODO-174** · Convert `/api/messages/pro-to-client/create/route.ts` — raw `auth()`

#### Uploads & Files
- [ ] **TODO-175** · Convert `/api/uploads/route.ts` — uses `getActiveOrgContext()`
- [ ] **TODO-176** · Convert `/api/upload/avatar/route.ts` — raw `auth()`
- [ ] **TODO-177** · Convert `/api/upload/branding/route.ts` — raw `auth()`
- [ ] **TODO-178** · Convert `/api/upload/cover/route.ts` — raw `auth()`
- [ ] **TODO-179** · Convert `/api/upload/portfolio/route.ts` — raw `auth()`
- [ ] **TODO-180** · Convert `/api/upload/supabase/route.ts` — raw `auth()`

#### Trades Network
- [ ] **TODO-181** · Convert `/api/trades/route.ts` — raw `auth()`
- [ ] **TODO-182** · Convert `/api/trades/[id]/route.ts` — raw `auth()`
- [ ] **TODO-183** · Convert `/api/trades/actions/route.ts` — raw `auth()`
- [ ] **TODO-184** · Convert `/api/trades/companies/route.ts` — raw `auth()`
- [ ] **TODO-185** · Convert `/api/trades/companies/search/route.ts` — raw `auth()`
- [ ] **TODO-186** · Convert `/api/trades/company/route.ts` — raw `auth()`
- [ ] **TODO-187** · Convert `/api/trades/company/actions/route.ts` — raw `auth()`
- [ ] **TODO-188** · Convert `/api/trades/company/employees/route.ts` — raw `auth()`
- [ ] **TODO-189** · Convert `/api/trades/company/join-requests/route.ts` — raw `auth()`
- [ ] **TODO-190** · Convert `/api/trades/company/seats/assign-manager/route.ts` — raw `auth()`
- [ ] **TODO-191** · Convert `/api/trades/connections/*` — 2 routes, raw `auth()`
- [ ] **TODO-192** · Convert `/api/trades/feed/*` — 2 routes, raw `auth()`
- [ ] **TODO-193** · Convert `/api/trades/profile/*` — 3 routes, raw `auth()`
- [ ] **TODO-194** · Convert `/api/trades/onboarding/route.ts` — raw `auth()`
- [ ] **TODO-195** · Convert `/api/trades/posts/route.ts` — raw `auth()`
- [ ] **TODO-196** · Convert `/api/trades/reviews/route.ts` — raw `auth()`
- [ ] **TODO-197** · Convert `/api/trades/search/route.ts` — raw `auth()`
- [ ] **TODO-198** · Convert `/api/trades/membership/route.ts` — raw `auth()`
- [ ] **TODO-199** · Convert `/api/trades/groups/route.ts` — raw `auth()`
- [ ] **TODO-200** · Convert `/api/trades/jobs/route.ts` — raw `auth()`

#### Notifications
- [ ] **TODO-201** · Convert `/api/notifications/route.ts` — raw `auth()`
- [ ] **TODO-202** · Convert `/api/notifications/[id]/route.ts` — raw `auth()`
- [ ] **TODO-203** · Convert `/api/notifications/[id]/read/route.ts` — raw `auth()`
- [ ] **TODO-204** · Convert `/api/notifications/mark-all-read/route.ts` — raw `auth()`
- [ ] **TODO-205** · Convert `/api/notifications/mark-all/route.ts` — raw `auth()`
- [ ] **TODO-206** · Convert `/api/notifications/mark-read/route.ts` — raw `auth()`
- [ ] **TODO-207** · Convert `/api/notifications/push/route.ts` — raw `auth()`
- [ ] **TODO-208** · Convert `/api/notifications/client-delivery/route.ts` — raw `auth()`

#### Finance & Commissions
- [ ] **TODO-209** · Convert `/api/finance/overview/route.ts` — raw `auth()`
- [ ] **TODO-210** · Convert `/api/finance/leaderboard/route.ts` — raw `auth()`
- [ ] **TODO-211** · Convert `/api/finance/commission-plans/route.ts` — raw `auth()`
- [ ] **TODO-212** · Convert `/api/finance/commission-plans/[id]/route.ts` — raw `auth()`
- [ ] **TODO-213** · Convert `/api/commissions/route.ts` — raw `auth()`
- [ ] **TODO-214** · Convert `/api/invoices/route.ts` — raw `auth()`

#### Proposals & E-Sign
- [ ] **TODO-215** · Convert `/api/proposals/route.ts` — raw `auth()`
- [ ] **TODO-216** · Convert `/api/proposals/[id]/route.ts` — raw `auth()`
- [ ] **TODO-217** · Convert `/api/proposals/[id]/publish/route.ts` — raw `auth()`
- [ ] **TODO-218** · Convert `/api/proposals/[id]/status/route.ts` — raw `auth()`
- [ ] **TODO-219** · Convert `/api/proposals/build/route.ts` — raw `auth()`
- [ ] **TODO-220** · Convert `/api/proposals/render/route.ts` — raw `auth()`
- [ ] **TODO-221** · Convert `/api/esign/envelopes/**` — 5 routes, raw `auth()`
- [ ] **TODO-222** · Convert `/api/signatures/**` — 2 routes, raw `auth()`
- [ ] **TODO-223** · Convert `/api/smart-docs/envelopes/route.ts` — raw `auth()`

#### Misc High-Traffic
- [ ] **TODO-224** · Convert `/api/nav/badges/route.ts` — raw `auth()` (called on every page load)
- [ ] **TODO-225** · Convert `/api/appointments/**` — 4 routes, raw `auth()`
- [ ] **TODO-226** · Convert `/api/damage/**` — 3 routes, raw `auth()`
- [ ] **TODO-227** · Convert `/api/jobs/**` — 4 routes, raw `auth()`
- [ ] **TODO-228** · Convert `/api/work-orders/**` — 2 routes, raw `auth()`
- [ ] **TODO-229** · Convert `/api/tasks/[taskId]/**` — 2 routes, raw `auth()`
- [ ] **TODO-230** · Convert `/api/dol-pull/route.ts` — raw `auth()`
- [ ] **TODO-231** · Convert `/api/evidence/**` — 2 routes, raw `auth()`
- [ ] **TODO-232** · Convert `/api/export/**` — 2 routes, raw `auth()`
- [ ] **TODO-233** · Convert `/api/feedback/route.ts` — raw `auth()`
- [ ] **TODO-234** · Convert `/api/pdf/generate/route.ts` — raw `auth()`
- [ ] **TODO-235** · Convert `/api/generate-pdf/route.ts` — raw `auth()`
- [ ] **TODO-236** · Convert `/api/photos/analyze/route.ts` — raw `auth()`
- [ ] **TODO-237** · Convert `/api/share/create/route.ts` — raw `auth()`
- [ ] **TODO-238** · Convert `/api/support/tickets/route.ts` — raw `auth()`
- [ ] **TODO-239** · Convert `/api/video/create/route.ts` — raw `auth()`
- [ ] **TODO-240** · Convert `/api/video-access/route.ts` — raw `auth()`
- [ ] **TODO-241** · Convert `/api/video-reports/**` — 2 routes, raw `auth()`
- [ ] **TODO-242** · Convert `/api/workflow/trigger/route.ts` — raw `auth()`
- [ ] **TODO-243** · Convert `/api/mailers/send/route.ts` — raw `auth()`
- [ ] **TODO-244** · Convert `/api/hoa/notices/[id]/send/route.ts` — raw `auth()`
- [ ] **TODO-245** · Convert `/api/correlate/damage/route.ts` — raw `auth()`
- [ ] **TODO-246** · Convert `/api/codes/analyze/route.ts` — raw `auth()`
- [ ] **TODO-247** · Convert `/api/batch/generate-addresses/route.ts` — raw `auth()`
- [ ] **TODO-248** · Convert `/api/bids/route.ts` — raw `auth()`

### Prisma Schema — Missing `orgId` Indexes

- [ ] **TODO-249** · Add `@@index([orgId])` to `DashboardKpi` model — full table scans on filtered queries
- [ ] **TODO-250** · Add `@@index([orgId])` to `door_knocks` model
- [ ] **TODO-251** · Add `@@index([orgId])` to `property_impacts` model
- [ ] **TODO-252** · Add `@@index([orgId])` to `reports` model — **critical for report queries**
- [ ] **TODO-253** · Add `@@index([orgId])` to `tradesCompany` model

### Webhook Security Gaps

- [ ] **TODO-254** · Add rate limiting to Trades webhook — currently unprotected
- [ ] **TODO-255** · Add rate limiting to Twilio webhook — currently unprotected
- [ ] **TODO-256** · Add idempotency check to Clerk webhook — duplicate events possible on retries
- [ ] **TODO-257** · Fix Trades webhook — exposes `error.message` in 500 response
- [ ] **TODO-258** · Add signature verification to QuickBooks webhook
- [ ] **TODO-259** · Add signature verification to Measurements webhook

---

## 🟡 P2 — MEDIUM

> Feature gaps, broken flows, and functional issues that affect user experience.

### Branding & Company Profile

- [ ] **TODO-260** · Add address fields to `org_branding` schema — `BrandingConfig` type expects `address` but column doesn't exist. Need migration: `address_line1`, `city`, `state`, `zip`.
- [ ] **TODO-261** · Add address fields to branding settings form — `/settings/branding` UI needs address inputs
- [ ] **TODO-262** · Fix `coverPhotoUrl` — body param accepted but never saved (not in upsert, no schema column)
- [ ] **TODO-263** · Deduplicate branding GET routes — `branding/route.ts` GET and `branding/get/route.ts` GET use different auth and queries

### Plan/Pricing System — 4 SEPARATE DEFINITIONS

- [ ] **TODO-264** · Create single `PLAN_CONFIG` object — plan limits defined in 4 different places that don't match:
  - `billing/status` → `getPlanLimits()` (claims, storage, AI credits)
  - `lib/limits.ts` → (posts, outreach)
  - `lib/config/tokens.ts` → (aiMockups, dolPulls, seats)
  - SQL `plans` table → (price_cents, posts_limit)
- [ ] **TODO-265** · Fix plan name inconsistency — `enterprise_plus` exists in billing/status but not in other definitions. `business` in limits.ts but not in billing/status.
- [ ] **TODO-266** · Wire plan limits to feature gates throughout the app — ensure pro features are actually gated for free/starter plans.

### Org Resolution — 9 FILES, INCONSISTENT USAGE

- [ ] **TODO-267** · Consolidate to 1 canonical resolver — currently 9 files in `src/lib/org/`:
  - `resolveOrg.ts`, `resolveOrgId.ts`, `resolveOrgWithFallback.ts`
  - `getActiveOrgContext.ts`, `getActiveOrgSafe.ts`, `getOrgFromApiRoute.ts`
  - `getOrg.ts`, `getOrgBranding.ts`, `getOrgLocation.ts`
- [ ] **TODO-268** · Fix auto-org-creation in `resolveOrgWithFallback` — auto-creates orgs when `required:true`, could create orphaned orgs
- [ ] **TODO-269** · Fix N+1 query in `resolveOrgWithFallback` — counts claims per org to find "canonical" one, expensive on every page load

### Team Management

- [ ] **TODO-270** · Fix invitation accept route — uses raw SQL tables (`invitations`, `org_members`) not in Prisma schema. If tables don't exist, crashes at runtime.
- [ ] **TODO-271** · Wire invitation resend to actually send email — currently just extends expiration, doesn't resend
- [ ] **TODO-272** · Add seat enforcement on invite — no check if org has remaining seats before creating invitation

### Onboarding

- [ ] **TODO-273** · Fix global trades completion bug — `onboarding/progress` uses `tradesCompany.count()` with no org filter, so `tradesCompleted` is true for everyone if ANY trades company exists globally
- [ ] **TODO-274** · Consolidate onboarding entry points — `/(app)/onboarding` and `/(app)/onboarding/start` cause user confusion

### Settings

- [ ] **TODO-275** · Add RBAC to organization settings POST — any org member can rename the organization, should require ADMIN/OWNER role
- [ ] **TODO-276** · Fix settings/export — uses Clerk orgId directly instead of DB UUID, limited to 500 claims with no pagination
- [ ] **TODO-277** · Fix settings/notifications — uses `as any` casts for notification columns that may not exist in schema

### Stripe/Billing

- [ ] **TODO-278** · Add missing Stripe event handlers — no handler for `customer.subscription.paused`, `charge.refunded`, `payment_intent.payment_failed`
- [ ] **TODO-279** · Fix referral reward logic — extends trial even for active (non-trial) subscriptions, could put active subs into trial mode
- [ ] **TODO-280** · Send receipt email after successful payment — TODO in webhook
- [ ] **TODO-281** · Fix `billing/status` `getRemainingCredits()` — always returns 0

### Reports & Templates

- [ ] **TODO-282** · Template placeholder validation alignment — `validate/route.ts` checks `company.phone` and `company.email` in REQUIRED_PLACEHOLDERS. Verify end-to-end flow now that preview provides them.
- [ ] **TODO-283** · Team photo in PDF — `teamPhotoUrl` exposed in preview but no template section renders it
- [ ] **TODO-284** · Verify report history page works — reports are created in DB but verify history list renders correctly
- [ ] **TODO-285** · Template Handlebars rendering — verify `{{company.phone}}`, `{{company.email}}` actually render in generated PDFs

### Portal (Client-Facing)

- [ ] **TODO-286** · Audit all 35 portal routes — client portal at `/api/portal/**` needs thorough review for data exposure
- [ ] **TODO-287** · Verify portal auth — portal uses different auth (client tokens vs Clerk), ensure no cross-contamination
- [ ] **TODO-288** · Client notification system — verify `/api/client-notifications/**` routes work

---

## 🔵 P3 — STANDARD

> UX polish, consistency, and non-critical improvements.

### Storage Rules

- [ ] **TODO-289** · Lock down `/temp/{allPaths=**}` in Firebase Storage — writable by ANY authenticated user without org restriction. Could be used as unlimited storage dump.
- [ ] **TODO-290** · Verify Firebase Storage org claims — custom claims must be correctly set by Clerk → Firebase token exchange for org-scoped file access.

### CSP & Headers

- [ ] **TODO-291** · Remove `'unsafe-inline'` from CSP `script-src` where possible — use nonces instead
- [ ] **TODO-292** · Add Sentry DSN domain to CSP `connect-src` — `*.ingest.sentry.io` not included, client Sentry may silently fail
- [ ] **TODO-293** · Remove duplicate `/client/sign-up(.*)` from middleware matcher
- [ ] **TODO-294** · Strip `x-org-id` header in production — exposes internal routing info to clients

### Docker

- [ ] **TODO-295** · Multi-stage Docker build — runtime stage copies ALL of `/app` from deps stage including devDependencies. Should copy only production deps and built output.
- [ ] **TODO-296** · Remove MinIO default credentials from docker-compose — `minioadmin/minioadmin` hardcoded

### Environment Variables

- [ ] **TODO-297** · Create `.env.example` file — new developers have no reference for required env vars (14 typed in `env.d.ts`, ~30+ actually needed)
- [ ] **TODO-298** · Expand `env.d.ts` — missing type declarations for UPSTASH_REDIS_URL, STRIPE_SECRET_KEY, OPENAI_API_KEY, SUPABASE_URL, RESEND_API_KEY, and ~15 others

### Cron Jobs

- [ ] **TODO-299** · Fix referenced cron route that doesn't exist — `vercel.json` references a cron path that returns 404
- [ ] **TODO-300** · Improve `ai-insights` cron — currently just counts claims/reports per org, generates no actual AI insights
- [ ] **TODO-301** · Add monitoring for silent cron failures — currently relies only on Sentry

### Sentry & Observability

- [ ] **TODO-302** · Enable Prisma integration — `@prisma/instrumentation` commented out, DB query tracing is blind
- [ ] **TODO-303** · Enable Sentry source map upload — error stacks in production are obfuscated/unhelpful
- [ ] **TODO-304** · Verify CSP allows Sentry client reporting — `connect-src` may be blocking browser error reports

### UI Pages

- [ ] **TODO-305** · Add `error.tsx` error boundaries to major route groups — `(app)/claims`, `(app)/reports`, `(app)/settings`, `(app)/dashboard`
- [ ] **TODO-306** · Add `loading.tsx` to major route groups — loading states for slow pages
- [ ] **TODO-307** · Verify dashboard displays real data post-Sprint 9 — KPIs may show zeros after `user.id` fallback removal
- [ ] **TODO-308** · Review demo mode data — seeded data should match realistic scenarios
- [ ] **TODO-309** · Verify all public pages have `metadata` exports for SEO

### Migrations & Data Integrity

- [ ] **TODO-310** · Audit for orphaned records — auto-org-creation may have left orphaned orgs with no users
- [ ] **TODO-311** · Verify `onDelete: Cascade` behavior — check critical foreign keys cascade correctly
- [ ] **TODO-312** · Run Prisma schema diff against production DB — detect any drift

---

## 🟢 P4 — LOW

> Tech debt, code cleanup, and optimization. Do when capacity allows.

### Auth Pattern Cleanup

- [ ] **TODO-313** · Convert remaining 20 `getActiveOrgContext()` routes to `withAuth`
- [ ] **TODO-314** · Convert remaining 36 `requireAuth` (non-withAuth) routes
- [ ] **TODO-315** · Convert remaining 59 `currentUser()` routes to `withAuth`
- [ ] **TODO-316** · Remove unused `getActiveOrgContext()` once all routes converted
- [ ] **TODO-317** · Remove unused `resolveOrgId.ts`, `resolveOrgWithFallback.ts` once consolidated

### Code Quality

- [ ] **TODO-318** · Remove legacy `brandLogoUrl` from org table — superseded by `org_branding.logoUrl`
- [ ] **TODO-319** · Remove legacy `pdfHeaderText`/`pdfFooterText` from org table
- [ ] **TODO-320** · Create `getBranding(orgId)` utility — consolidate all branding fetching into one function
- [ ] **TODO-321** · Remove unused imports — converted routes may have leftover `auth` imports from `@clerk/nextjs/server`
- [ ] **TODO-322** · Audit archive directory — `archive/` contains 10+ subdirectories of dead code, verify nothing references them
- [ ] **TODO-323** · Clean up duplicate `teams/invite` vs `team/invitations` routes — likely duplicate functionality

### Rate Limiting

- [ ] **TODO-324** · Add middleware-level rate limiting — each route must currently implement its own `rateLimit()` call; a new route without it is unprotected
- [ ] **TODO-325** · Fix serverless rate limit fallback — in-memory fallback when Redis unavailable is per-function-instance, effectively disabled in serverless

### Testing

- [ ] **TODO-326** · Run AI Agent Testing Playbook — execute all 12 phases from `scripts/AI_AGENT_TESTING_PLAYBOOK.md`
- [ ] **TODO-327** · Add branding merge regression test — verify `company.phone` and `company.email` populated after preview
- [ ] **TODO-328** · Add cross-org isolation tests for all data types — claims, reports, templates, branding
- [ ] **TODO-329** · PDF export integration test — once mock data replaced, test real PDF generation end-to-end
- [ ] **TODO-330** · Add token system tests — balance, consumption, refill
- [ ] **TODO-331** · Add Stripe webhook replay tests — verify all event handlers work with real payloads
- [ ] **TODO-332** · Add onboarding flow integration test — walk through all 8 steps
- [ ] **TODO-333** · Load test critical endpoints — `/api/claims`, `/api/dashboard/stats`, `/api/reports/preview`

### Performance

- [ ] **TODO-334** · Cache org branding — changes infrequently, add 5-minute TTL cache to `org_branding` queries
- [ ] **TODO-335** · Cache plan limits — plan data is static, queried on every billing/status call
- [ ] **TODO-336** · Optimize `/api/nav/badges` — called on every page load, should be cached
- [ ] **TODO-337** · Add DB connection pooling metrics — monitor Prisma connection pool usage
- [ ] **TODO-338** · Preview route does 7 parallel DB queries — add rate limiting to prevent abuse

### Documentation

- [ ] **TODO-339** · Create API documentation — 516 routes with no public docs
- [ ] **TODO-340** · Create onboarding developer guide — setup instructions for new team members
- [ ] **TODO-341** · Create runbook for common production issues — webhook failures, Stripe sync, token issues

---

## 📊 AUDIT STATS & SPRINT HISTORY

### Auth Coverage Breakdown (516 total routes)

| Pattern | Count | Status |
|---------|-------|--------|
| `withAuth` / `withAdmin` / `withManager` | 98 | ✅ Converted |
| `requireAuth` (older, no org scope) | 36 | ⚠️ Needs review |
| Raw `auth()` from `@clerk/nextjs` | 233 | 🔴 Needs conversion |
| `getActiveOrgContext()` | 20 | ⚠️ Manual pattern |
| `currentUser()` direct | 59 | 🔴 Needs conversion |
| `verifyCronSecret` | 8 | ✅ Cron-specific |
| **No auth at all** | **58** | **🔴 CRITICAL** |
| Health/public (intentional) | ~15 | ✅ OK |

### Error Exposure

| Issue | Count |
|-------|-------|
| Routes exposing `error.message` in responses | 59 |
| Routes exposing `error.stack` in responses | 1+ |

### Sprint History

| Sprint | Focus | Routes Fixed | Key Fix | Status |
|--------|-------|-------------|---------|--------|
| 8b | CRM QA Lockdown | — | Auth + org isolation | ✅ Deployed |
| 8c | Report Builder Auth | 9 | `PREVIEW FAILED: AUTH_REQUIRED` → `withAuth` | ✅ Deployed |
| 9 | Route Conversions | 10 | `user.id` fallback bugs, trades data corruption | ✅ Deployed |
| 10 | Branding Merge Fix | 1 | Preview reads `org_branding` table | ✅ Deployed |
| 11+ | This TODO | 341 items | Full production readiness | 🔲 Planned |

### Systems Grade Card

| System | Grade | Blocking? |
|--------|-------|-----------|
| Auth (withAuth routes) | B+ | No |
| Auth (remaining 418 routes) | D | **YES** |
| Report Preview | A | No |
| Report PDF Export | F | **YES** |
| Token/Credits | F | **YES** |
| Stripe Webhooks | A- | No |
| Billing Routes | B- | Partial |
| Branding | B | No |
| Team Management | B | No |
| Onboarding | B+ | No |
| Settings | C+ | Partial |
| Org Resolution | C | Partial |
| Plan/Pricing | C- | Partial |
| Email System | B+ | No |
| Cron Jobs | B+ | No |
| Security Headers | B+ | No |
| Error Handling | D | **YES** |
| Testing | D | **YES** |

---

## 📁 KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/lib/auth/withAuth.ts` | ✅ Canonical auth wrapper |
| `src/lib/auth/requireAuth.ts` | Older auth pattern (pre-withAuth) |
| `src/lib/org/resolveOrg.ts` | Primary org resolver |
| `src/lib/org/getActiveOrgContext.ts` | Manual org context (9 files total) |
| `src/app/api/reports/preview/route.ts` | ✅ Preview merge — FIXED Sprint 10 |
| `src/modules/reports/core/DataProviders.ts` | 🔴 MOCK data — 7 functions need real DB |
| `src/modules/reports/types/index.ts` | `BrandingConfig` / `ReportContext` types |
| `src/app/api/branding/save/route.ts` | Saves branding to `org_branding` |
| `src/app/api/billing/status/route.ts` | 🔴 Token balance hardcoded to 0 |
| `src/app/api/billing/auto-refill/route.ts` | 🔴 No-op mock |
| `src/lib/config/tokens.ts` | 🔴 All costs set to 0 |
| `prisma/schema.prisma` (line 4018) | `org_branding` model |
| `middleware.ts` | Clerk auth middleware |
| `next.config.mjs` | CSP, security headers, build config |
| `vercel.json` | Cron jobs, function config |
| `scripts/AI_AGENT_TESTING_PLAYBOOK.md` | 12-phase testing playbook |
| `scripts/sprint8c-regression-test.sh` | Regression test suite (65+ tests) |

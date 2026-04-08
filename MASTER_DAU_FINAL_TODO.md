# MASTER DAU-READY TODO — Final Comprehensive Audit

> Generated April 7, 2026 — Based on full codebase analysis (657 API routes, 357 pages, 30+ report paths)

---

## Current Scorecard

| Dimension                       | Current                           | Target                  | Grade  |
| ------------------------------- | --------------------------------- | ----------------------- | ------ |
| Auth coverage                   | 87.6% (503/574 non-exempt routes) | 99%+                    | A-     |
| Tenant isolation (orgId)        | 81.4% (467/574)                   | 95%+ sensitive routes   | B+     |
| Zod validation                  | 35.2% (160/455 mutation routes)   | 90%+ on critical writes | D      |
| Logger coverage                 | 100% (657/657)                    | 100%                    | A+     |
| `force-dynamic`                 | 99.2% (652/657)                   | 100%                    | A      |
| Error handling (try/catch)      | ~90%                              | 100%                    | A-     |
| `loading.tsx` coverage          | 32.8% (117/357 pages)             | 80%+                    | D+     |
| `error.tsx` coverage            | 36.7% (131/357 pages)             | 80%+                    | C-     |
| EmptyState adoption             | 5 components                      | 30+ data-heavy pages    | F      |
| Test coverage                   | 879 tests, 63 files               | 1,200+ tests            | B+     |
| Cover page → report integration | 0/30+ paths connected             | All core paths          | F      |
| PDF library consolidation       | 5 libraries, 4 cover impls        | 2 libraries max         | F      |
| **Overall**                     |                                   |                         | **B+** |

---

## SPRINT A — Security & Tenant Isolation (P0)

> These are production blockers. Fix before any customer data enters the system.

### A-1: Close 71 Auth-less Routes

**Impact: CRITICAL** — 71 non-exempt routes have zero auth pattern.

#### A-1a: Financial Routes (IMMEDIATE)

- [ ] `billing/auto-refill/route.ts` — Add `withAuth` + RBAC (admin only)
- [ ] `stripe/prices/route.ts` — Add auth or mark explicitly public
- [ ] `stripe/ensure-customer/route.ts` — Verify has auth (may be internal-only)
- [ ] `vendors/orders/[orderId]/submit/route.ts` — Add `withAuth`
- [ ] `vendors/orders/route.ts` — Add `withAuth`

#### A-1b: 8 Unprotected Cron Routes

All cron routes must verify `CRON_SECRET` header or `requireCronAuth`:

- [ ] `cron/ai-insights/route.ts`
- [ ] `cron/daily/route.ts`
- [ ] `cron/email-retry/route.ts`
- [ ] `cron/process-batch-jobs/route.ts`
- [ ] `cron/stripe-reconcile/route.ts`
- [ ] `cron/trials/sweep/route.ts`
- [ ] `cron/user-columns/route.ts`
- [ ] `weather/cron-daily/route.ts`

#### A-1c: AI Routes Missing Auth (17 routes)

- [ ] `agents/bad-faith/export` — Add withAuth
- [ ] `ai/damage-builder` — Add withAuth
- [ ] `ai/dispatch/[claimId]` — Add withAuth
- [ ] `ai/enhanced-report-builder` — Add withAuth
- [ ] `ai/estimate-value` — Add withAuth
- [ ] `ai/estimate/[claimId]` — Add withAuth
- [ ] `ai/geometry/detect-slopes` — Add withAuth
- [ ] `ai/orchestrate/[claimId]` — Add withAuth
- [ ] `ai/recommendations` — Add withAuth
- [ ] `ai/report-builder` — Add withAuth
- [ ] `ai/run` — Add withAuth
- [ ] `ai/status` — Add withAuth
- [ ] `ai/supplement/[claimId]` — Add withAuth
- [ ] `ai/supplement/export-pdf` — Add withAuth
- [ ] `ai/supplement/generate-items` — Add withAuth
- [ ] `ai/usage` — Add withAuth
- [ ] `ai/vision/analyze` — Add withAuth

#### A-1d: Data Access Routes Missing Auth (15 routes)

- [ ] `artifacts/[id]` — Add withAuth
- [ ] `artifacts/[id]/export-pdf` — Add withAuth
- [ ] `artifacts/[id]/regenerate` — Add withAuth
- [ ] `client/accept-invite` — Add auth (may need portal auth)
- [ ] `clients/search` — Add withAuth
- [ ] `flags/config/[key]` — Add withAuth (admin)
- [ ] `flags/invalidate/[key]` — Add withAuth (admin)
- [ ] `jobs` — Add withAuth
- [ ] `jobs/schedule/[jobId]` — Add withAuth
- [ ] `jobs/schedule` — Add withAuth
- [ ] `legal/document/[docId]` — Add auth
- [ ] `permissions` — Add withAuth
- [ ] `rbac/me` — Add withAuth
- [ ] `supplements` — Add withAuth
- [ ] `v1/leads/ingest` — Add API key auth or mark public with rate limit

#### A-1e: Remaining Auth Gaps (audit + decide public vs auth)

- [ ] `carrier/track/[trackingId]/[action]` — Likely public share link, document exemption
- [ ] `contact` — Public contact form, document exemption
- [ ] `dev/sentry-test` — Dev only, gate behind `NODE_ENV`
- [ ] `integrations/quickbooks/webhook` — Verify webhook signature
- [ ] `measurements/webhook` — Verify webhook signature
- [ ] `migrations/acculynx` — Add withAuth (admin)
- [ ] `migrations/jobnimbus` — Add withAuth (admin)
- [ ] `pdf/create` — Add withAuth
- [ ] `remote-view/start` — Add withAuth
- [ ] `remote-view/stop` — Add withAuth
- [ ] `remote-view/team` — Add withAuth
- [ ] `templates/[templateId]/placeholders` — Add withAuth
- [ ] `templates/[templateId]/thumbnail` — Add withAuth
- [ ] `templates/marketplace/*` (3 routes) — Document as public, add rate limit
- [ ] `trades/search` — Add auth
- [ ] `uploadthing` — Library handler, verify signature
- [ ] `vin/*` (5 routes) — Add withAuth
- [ ] `weather/share/[token]` — Public share link, document exemption

### A-2: Close Org-Scoping Gaps on Sensitive Routes

**Impact: HIGH** — 107 routes missing `orgId` filtering.

#### A-2a: Trades Subsystem (16 routes — LARGEST GAP)

The entire trades subsystem lacks org-scoping. Many trades routes use `userId` from Clerk but never filter by `orgId`:

- [ ] `trades/companies/search` — Determine if cross-org by design (marketplace) or needs scoping
- [ ] `trades/company/actions` — Add orgId filter
- [ ] `trades/company/join-requests` — Add orgId filter
- [ ] `trades/company/seats/*` (4 routes) — Add orgId filter
- [ ] `trades/connections/actions` — Review scope
- [ ] `trades/feed/engage` — Add orgId filter
- [ ] `trades/invites/[inviteId]/respond` — Add orgId filter
- [ ] `trades/membership` — Add orgId filter
- [ ] `trades/onboard` — Add orgId filter
- [ ] `trades/opportunities` — Determine if cross-org marketplace
- [ ] `trades/posts` — Add orgId filter
- [ ] `trades/profile/[id]` — Add orgId filter or document public
- [ ] `trades/profile/actions` — Add orgId filter

#### A-2b: Templates (4 non-marketplace routes)

- [ ] `templates/[templateId]/generate-thumbnail` — Add orgId filter
- [ ] `templates/[templateId]/pdf` — Add orgId filter
- [ ] `templates/[templateId]/placeholders` — Add orgId filter
- [ ] `templates/[templateId]/thumbnail` — Add orgId filter

#### A-2c: Reports (4 routes)

- [ ] `reports/preview-template-options` — Add orgId filter
- [ ] `reports/recommend-template` — Add orgId filter
- [ ] `reports/recommendation-analytics` — Add orgId filter
- [ ] `reports/validate-generation-inputs` — Add orgId filter

#### A-2d: Billing & Financial (4 routes)

- [ ] `billing/auto-refill` — Add orgId filter
- [ ] `stripe/ensure-customer` — Add orgId filter
- [ ] `stripe/prices` — Determine if public catalog or org-scoped
- [ ] `wallet/reset-monthly` — Add orgId filter

#### A-2e: AI Routes (8 routes)

- [ ] `agents/runs` — Add orgId filter
- [ ] `ai/claim-writer` — Add orgId filter
- [ ] `ai/damage` — Add orgId filter
- [ ] `ai/debug/yolo` — Remove or gate behind dev mode
- [ ] `ai/plan/generate` — Add orgId filter
- [ ] `ai/status` — Add orgId filter
- [ ] `ai/usage` — Add orgId filter
- [ ] `assistant/query` — Add orgId filter

#### A-2f: Invitations (4 routes)

- [ ] `invitations/[id]/resend` — Add orgId filter
- [ ] `invitations/analytics/export` — Add orgId filter
- [ ] `invitations/analytics` — Add orgId filter
- [ ] `invitations/route.ts` — Add orgId filter

#### A-2g: Remaining Org-Scoping Gaps (~50 routes)

- [ ] Client notifications (4) — `client-notifications/*`, `clients/onboarding`
- [ ] Connections (2) — `connections/received`, `connections/request`
- [ ] Legal (3) — `legal/accept`, `legal/document/[docId]`, `legal/status`
- [ ] Upload (4) — `upload/avatar`, `upload/cover`, `upload/portfolio`, `uploadthing`
- [ ] Weather (4) — `weather/cron-daily`, `weather/quick`, `weather/radar`, `weather/share/[token]`
- [ ] Export/PDF (2) — `export/pdf`, `generate-pdf`
- [ ] Notifications/Presence (3) — `notifications/push`, `presence/heartbeat`, `presence/status`
- [ ] Profile/User/Settings (6) — `homeowner/profile`, `profile/update`, `profile/upload-photo`, `user/email-preferences`, `settings/notifications`, `me/network-metrics`
- [ ] Permissions/RBAC (2) — `permissions`, `rbac/me`
- [ ] Retail (2) — `retail/list`, `retail/resume`
- [ ] Remaining (13) — batch, bids, build-info, carrier, carriers, config, contact, customer, dol-pull, feedback, invoices/receipts, share/create, signatures/save, team/posts, vendors

### A-3: Document Intentional Exemptions

Create `src/lib/auth/EXEMPTIONS.md` listing routes that are intentionally public/unscoped with justification:

- [ ] Public marketplace routes (`templates/marketplace/*`, `trades/search`)
- [ ] Public share links (`weather/share/[token]`, `carrier/track/*`)
- [ ] Webhook receivers (`webhooks/*`, `measurements/webhook`, `uploadthing`)
- [ ] System endpoints (`health/*`, `build-info`, `config`)
- [ ] Contact form (`contact`)
- [ ] Cron jobs (verify CRON_SECRET instead of user auth)

---

## SPRINT B — Input Validation (P0)

> 295 mutation routes lack Zod validation. This is the single biggest gap.

### B-1: Webhook Payload Validation (5 routes — HIGHEST PRIORITY)

External untrusted input with zero schema validation:

- [ ] `webhooks/clerk/route.ts` — Add Svix signature verification + Zod payload schema
- [ ] `webhooks/manage/route.ts` — Add Zod schema
- [ ] `webhooks/stripe/route.ts` — Add Zod schema after signature verification
- [ ] `webhooks/trades/route.ts` — Add Zod schema
- [ ] `webhooks/twilio/route.ts` — Add Zod schema

### B-2: Financial Mutation Validation (5 routes)

- [ ] `billing/auto-refill/route.ts` — Zod schema for toggle/config
- [ ] `billing/create-subscription/route.ts` — Zod schema for plan selection
- [ ] `billing/founder-coupon/route.ts` — Zod schema for coupon code
- [ ] `billing/portal/route.ts` — Zod schema
- [ ] `billing/update-seats/route.ts` — Zod schema for seat count

### B-3: Portal Routes Validation (17 routes)

Client-facing = broadest attack surface:

- [ ] `portal/claims/[claimId]/assets` POST
- [ ] `portal/claims/[claimId]/messages` POST
- [ ] `portal/claims/upload` POST
- [ ] `portal/community/posts/[postId]/like` POST
- [ ] `portal/generate-access` POST
- [ ] `portal/job-invite` POST
- [ ] `portal/messages/*` POST (3 routes)
- [ ] `portal/moderate` POST
- [ ] `portal/network` POST
- [ ] `portal/posts` POST
- [ ] `portal/property-photos` POST, DELETE
- [ ] `portal/save-pro` POST
- [ ] `portal/settings` PUT
- [ ] `portal/upload-photo` POST
- [ ] `portal/work-request` POST

### B-4: Claims Domain Validation (23 routes)

Core business domain — every claim mutation should have Zod:

- [ ] `claims/[claimId]/ai` POST
- [ ] `claims/[claimId]/assets` POST
- [ ] `claims/[claimId]/attach-contact` POST
- [ ] `claims/[claimId]/contractors` POST, DELETE
- [ ] `claims/[claimId]/depreciation/export` POST
- [ ] `claims/[claimId]/documents` POST
- [ ] `claims/[claimId]/evidence/upload` POST
- [ ] `claims/[claimId]/files/[fileId]` PATCH, DELETE
- [ ] `claims/[claimId]/final-payout` PATCH
- [ ] `claims/[claimId]/generate-rebuttal` POST
- [ ] `claims/[claimId]/generate-supplement` POST
- [ ] `claims/[claimId]/import` POST
- [ ] `claims/[claimId]/justification` POST
- [ ] `claims/[claimId]/notes/[noteId]` DELETE
- [ ] `claims/[claimId]/photos` POST
- [ ] `claims/[claimId]/simulation` POST
- [ ] `claims/[claimId]/timeline` POST, DELETE
- [ ] `claims/[claimId]/weather/refresh` POST
- [ ] `claims/ai/build` POST
- [ ] `claims/documents/sharing` POST
- [ ] `claims/files/upload` POST
- [ ] `claims/generate-packet` POST
- [ ] `claims/intake` POST

### B-5: Upload Routes Validation (8 routes)

File uploads = injection risk:

- [ ] `upload/avatar` POST — Validate file type, size, dimensions
- [ ] `upload/branding` POST — Validate file type, size
- [ ] `upload/cover` POST — Validate file type, size
- [ ] `upload/portfolio` POST — Validate file type, size
- [ ] `upload/supabase` POST — Validate file metadata
- [ ] `uploads/file` POST — Validate file type, size
- [ ] `uploads/message-attachment` POST — Validate file type, size
- [ ] `uploads/route.ts` POST — Validate file metadata

### B-6: Trades Subsystem Validation (13 routes)

- [ ] All 13 trades mutation routes need Zod schemas

### B-7: Templates Validation (12 routes)

- [ ] All 12 template mutation routes need Zod schemas

### B-8: AI Routes Validation (20 routes)

- [ ] All 20 AI mutation routes need at minimum prompt/input Zod validation

### B-9: Remaining Mutation Routes (~200 routes)

Systematic sweep across: team, notifications, weather, intel, network, clients, leads, reports, VIN, esign, estimates, automation, integrations, migrations, messages, artifacts, appointments, settings, completion, flags, and remaining areas.

**Recommended approach**: Create a `zodRequired` lint rule or test that fails on any POST/PUT/PATCH handler without `z.` in scope.

---

## SPRINT C — Unified Document Rendering (P1)

> The cover page editor exists but is completely disconnected from all 30+ report paths.
> 4 separate cover page implementations exist across 5 different PDF libraries.

### C-1: Consolidate Cover Page System

**Current state**: 4 cover page implementations, 5 PDF libraries, zero connection to CoverPageCanvas.

#### C-1a: Design Universal Cover Page Data Format

- [ ] Define a `CoverPageConfig` TypeScript type that all renderers can consume
- [ ] Fields: logo, company name, title, subtitle, background color/image, accent color, layout preset
- [ ] Map `cover_page_data` JSONB canvas elements → `CoverPageConfig`
- [ ] Create `src/lib/reports/cover-page-config.ts` with converter

#### C-1b: Create Adapter for Each PDF Library

- [ ] jsPDF adapter: `renderCoverPage(doc: jsPDF, config: CoverPageConfig)` — update `src/lib/pdf/cover-page.ts`
- [ ] React-PDF adapter: `<CoverPage config={CoverPageConfig} />` — update `src/components/pdf/CoverPage.tsx`
- [ ] pdf-lib adapter: `addCoverPage(doc: PDFDocument, config: CoverPageConfig)` — update `src/lib/reports/modules/coverPage.ts`
- [ ] PDFKit adapter: Create new or deprecate PDFKit paths

#### C-1c: Connect Canvas Editor Output to Renderers

- [ ] In each report generation path, load `cover_page_data` from org's branding record
- [ ] Convert canvas state → `CoverPageConfig` → pass to renderer
- [ ] Fallback: if no `cover_page_data`, use default branding (logo + company name)

### C-2: Connect Cover Page to Core Report Paths

#### C-2a: Weather Reports (jsPDF)

- [ ] `src/lib/reports/weather-report-pdf.ts` — Use org's cover page config
- [ ] `src/lib/weather/premium-weather-pdf.ts` — Use org's cover page config

#### C-2b: Claims Reports (React-PDF)

- [ ] `src/lib/reports/claims-report-pdf.tsx` — Pass cover page config to `<CoverPage>`
- [ ] `src/lib/reports/universal-claims-report.tsx` — Pass cover page config
- [ ] `src/lib/pdf/supplement.tsx` — Pass cover page config
- [ ] `src/lib/pdf/rebuttal.tsx` — Pass cover page config

#### C-2c: Module Reports (pdf-lib)

- [ ] `src/lib/reports/modules/reports.ts` — Pass cover page config to `addCoverPage`
- [ ] `src/lib/reports/full-claim-packet.ts` — Pass cover page config

#### C-2d: Remaining Report Paths

- [ ] Template PDF generation — `src/lib/reports/template-pdf.ts`
- [ ] Depreciation invoice — client-side cover page
- [ ] Material estimator — client-side cover page
- [ ] AI plan export — `addCoverPage` from jsPDF

### C-3: Add Report Rendering Snapshot Tests

- [ ] Create seeded test data: fixed org branding, property, claim, weather
- [ ] Snapshot test for weather report JSON payload structure
- [ ] Snapshot test for claims report React-PDF component tree
- [ ] Snapshot test for cover page config → jsPDF output (page dimensions, text positions)
- [ ] Snapshot test for cover page config → React-PDF output
- [ ] Regression guard: if cover page data shape changes, snapshot fails

### C-4: Deprecate Redundant PDF Libraries (Long-term)

- [ ] Audit which paths use PDFKit vs jsPDF (significant overlap)
- [ ] Plan migration: PDFKit → jsPDF (or vice versa) for server-side
- [ ] Plan migration: Puppeteer → React-PDF where possible
- [ ] Target: 2 libraries max (jsPDF server + React-PDF client)

---

## SPRINT D — UX Polish: Loading, Empty, Error States (P1)

> 357 pages. Only 32.8% have loading.tsx, 36.7% have error.tsx. EmptyState used in 5 files.

### D-1: Create Shared UX Primitives

#### D-1a: Standardize EmptyState

- [ ] Create `src/components/ui/empty-state.tsx` — icon, title, description, action button
- [ ] Variants: `default`, `search` (no results), `error` (retry), `first-time` (onboarding CTA)
- [ ] Dark mode support

#### D-1b: Standardize PageSkeleton

- [ ] Create `src/components/ui/page-skeleton.tsx` — full-page loading skeleton
- [ ] Variants: `table`, `cards`, `detail`, `form`, `dashboard`
- [ ] Match existing `<PageHero>` + content area layout

#### D-1c: Standardize ErrorCard

- [ ] Create `src/components/ui/error-card.tsx` — inline error with retry
- [ ] Props: `title`, `message`, `onRetry`, `variant` (inline/fullpage)

### D-2: Add loading.tsx to High-Traffic Routes

Priority routes (no loading.tsx and high traffic):

- [ ] `claims-ready-folder/[claimId]/sections/*` — 16 pages, 0 loading
- [ ] `marketing/attribution/` — no loading
- [ ] `marketing/campaigns/` — no loading
- [ ] `leaderboard/` — no loading
- [ ] `scope-editor/` — no loading
- [ ] `storm-graph/prequal/` — no loading
- [ ] All remaining routes without a parent loading.tsx

### D-3: Add error.tsx to Critical Routes

- [ ] Every route group with data fetching should have an error.tsx
- [ ] Priority: `claims/*`, `reports/*`, `weather/*`, `trades/*`, `billing/*`
- [ ] Use `SmartErrorBoundary` or `GenericErrorBoundary` component

### D-4: Retrofit EmptyState Across Data-Heavy Pages

Pages that display lists/tables and need empty states:

- [ ] Claims list (`/claims`)
- [ ] Contacts list (`/contacts`)
- [ ] Leads list (`/leads`)
- [ ] Tasks list (`/tasks`)
- [ ] Documents list (`/claims/[id]/documents`)
- [ ] Messages (`/messages`)
- [ ] Team members (`/team`)
- [ ] Invoices/billing history
- [ ] Weather reports list
- [ ] Trades/marketplace results
- [ ] Notifications center
- [ ] AI exports/history
- [ ] Reports hub
- [ ] VIN/vendors catalog
- [ ] Job requests
- [ ] Templates gallery
- [ ] At least 30 pages should use EmptyState

### D-5: Audit Null/Undefined Rendering

- [ ] Search for `?.` chains in JSX that could render `undefined` or empty fragments
- [ ] Add fallback rendering for all optional data displays
- [ ] Verify no "flash of undefined" on slow network

---

## SPRINT E — Test Coverage Expansion (P1)

> 879 tests is strong. Target: 1,200+ with mutation route testing.

### E-1: Mutation Route Tests (Critical Writes)

- [ ] Claims create/update/delete — full Zod + auth + orgId chain
- [ ] Billing mutations — subscription create, seat update, auto-refill
- [ ] Team member invite/remove/role-change — RBAC chain
- [ ] Template CRUD — create, edit sections, delete, duplicate
- [ ] Document upload/delete — file handling + orgId scoping
- [ ] Weather report generation — end-to-end with mocked weather API

### E-2: Cross-Tenant Isolation Tests

- [ ] Add negative tests: User A cannot access User B's claims, messages, documents
- [ ] Add negative tests: Org A cannot see Org B's data in list endpoints
- [ ] Test `resolveOrg` with multiple org memberships

### E-3: Report Rendering Tests

- [ ] Snapshot test: weather report payload structure
- [ ] Snapshot test: claims report component tree
- [ ] Unit test: cover page config converter
- [ ] Unit test: each PDF adapter with fixed input → verify page count, content positions

### E-4: Portal Flow Integration Tests

- [ ] Full client journey: sign up → verify → view claims → message pro → e-sign
- [ ] Cross-client isolation: client A sees only their claims
- [ ] Portal rate limiting behavior

### E-5: Webhook Validation Tests

- [ ] Stripe webhook: valid signature → processes, invalid → rejects
- [ ] Clerk webhook: valid Svix header → processes
- [ ] Test each webhook event type handler

### E-6: Cron Job Tests

- [ ] Each cron route: valid CRON_SECRET → runs, missing → 401
- [ ] Test idempotency of critical crons (stripe-reconcile, trial-sweep)

---

## SPRINT F — Observability & Monitoring (P2)

### F-1: Structured Error Reporting

- [ ] Audit all `catch` blocks — ensure `logger.error` includes `{ orgId, userId, route }`
- [ ] Add Sentry breadcrumbs to critical flows (billing, auth, report generation)
- [ ] Add Sentry transaction names to high-traffic routes

### F-2: Performance Monitoring

- [ ] Add `Sentry.startSpan()` to report generation paths (PDF rendering is slow)
- [ ] Add timing logs to AI routes (token usage, response time)
- [ ] Add database query timing to heavy list endpoints

### F-3: Business Metrics Logging

- [ ] Log claim state transitions (`logger.info("[CLAIM_STATUS]", { from, to, claimId, orgId })`)
- [ ] Log report generation events (`logger.info("[REPORT_GENERATED]", { type, claimId, orgId })`)
- [ ] Log billing events (`logger.info("[BILLING_EVENT]", { event, orgId, amount })`)

### F-4: Health Check Expansion

- [ ] `/api/health/deep` — check DB connection, Redis, Supabase storage, AI API key
- [ ] `/api/health/dependencies` — check external service reachability
- [ ] Add health check to deployment pipeline (fail deploy if unhealthy)

### F-5: Add 5 Missing `force-dynamic` Exports

- [ ] `claims/[claimId]/generate-rebuttal/route.tsx`
- [ ] `claims/[claimId]/generate-supplement/route.tsx`
- [ ] `contractor-packet/[id]/download/route.tsx`
- [ ] `generated-documents/[id]/download/route.tsx`
- [ ] `pdf/create/route.ts`

---

## SPRINT G — API Standardization (P2)

### G-1: Response Shape Consistency

- [ ] Audit all GET endpoints — ensure consistent `{ ok: true, data: ... }` or `{ ok: false, error: ... }` shape
- [ ] Create `src/lib/apiResponse.ts` with `success(data)` and `error(status, code, message)` helpers
- [ ] Migrate top 30 most-used endpoints to standard response shape

### G-2: Pagination Standardization

- [ ] Audit all list endpoints for pagination support
- [ ] Standard shape: `{ ok: true, data: [...], pagination: { page, pageSize, total, hasMore } }`
- [ ] Add pagination to: claims list, contacts list, leads list, messages, tasks, notifications, templates

### G-3: Rate Limit Standardization

- [ ] Audit which routes have rate limiting vs which should
- [ ] All AI routes should use `ai` preset (5/min)
- [ ] All portal routes should use `standard` or `relaxed`
- [ ] All upload routes should use dedicated upload limit
- [ ] Return `Retry-After` header on 429 responses

### G-4: Error Code Standardization

- [ ] Define error code enum: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`
- [ ] All error responses include `{ error: { code, message, details? } }`
- [ ] Frontend error handling can switch on `code` instead of parsing messages

---

## SPRINT H — Production Hardening (P2)

### H-1: Database Query Safety

- [ ] Audit all `$queryRaw` / `$executeRaw` for SQL injection risk
- [ ] Convert raw queries to Prisma queries where possible
- [ ] Parameterize all remaining raw queries

### H-2: File Upload Security

- [ ] Validate MIME type server-side (not just extension) on all upload routes
- [ ] Add virus scanning hook for uploaded files (ClamAV or API-based)
- [ ] Enforce file size limits on all upload endpoints
- [ ] Sanitize filenames (strip path traversal characters)

### H-3: Session & Token Management

- [ ] Audit portal access token expiry and rotation
- [ ] Add CSRF protection to state-changing portal routes
- [ ] Verify Clerk session token validation on all auth paths

### H-4: Dependency Audit

- [ ] Run `pnpm audit` and fix critical/high vulnerabilities
- [ ] Remove unused dependencies (run `knip` analysis)
- [ ] Pin critical dependency versions

---

## Priority Execution Order

| Phase  | Sprint                               | Items             | Est. Effort | Impact      |
| ------ | ------------------------------------ | ----------------- | ----------- | ----------- |
| **1**  | A-1 (Auth gaps)                      | 71 routes         | 2-3 days    | 🔴 Critical |
| **2**  | B-1 to B-5 (Top Zod gaps)            | 58 routes         | 2-3 days    | 🔴 Critical |
| **3**  | A-2a-d (Org-scoping critical)        | 32 routes         | 1-2 days    | 🔴 High     |
| **4**  | E-1, E-5-6 (Critical tests)          | ~60 tests         | 1-2 days    | 🟠 High     |
| **5**  | C-1 (Cover page unification)         | Design + adapters | 2-3 days    | 🟠 High     |
| **6**  | D-1 (UX primitives)                  | 3 components      | 1 day       | 🟡 Medium   |
| **7**  | C-2 (Connect to report paths)        | 12+ paths         | 2-3 days    | 🟡 Medium   |
| **8**  | D-2 to D-4 (UX retrofit)             | 30+ pages         | 2-3 days    | 🟡 Medium   |
| **9**  | B-6 to B-9 (Remaining Zod)           | 237 routes        | 3-5 days    | 🟡 Medium   |
| **10** | A-2e-g (Remaining org-scope)         | 75 routes         | 2-3 days    | 🟡 Medium   |
| **11** | F (Observability)                    | 5 tasks           | 1-2 days    | 🟢 Normal   |
| **12** | G (API standardization)              | 4 tasks           | 2-3 days    | 🟢 Normal   |
| **13** | H (Production hardening)             | 4 tasks           | 1-2 days    | 🟢 Normal   |
| **14** | E-2 to E-4 (Remaining tests)         | ~100 tests        | 2-3 days    | 🟢 Normal   |
| **15** | C-3, C-4 (Snapshots + consolidation) | Long-term         | 3-5 days    | 🟢 Normal   |

**Total estimated effort: 25-40 dev-days to reach A+ across all dimensions.**

---

## Definition of Done: DAU-Ready A+

- [ ] **Auth**: 99%+ routes have auth (documented exemptions only)
- [ ] **Tenant isolation**: 95%+ sensitive routes filter by orgId
- [ ] **Input validation**: 90%+ mutation routes have Zod schemas
- [ ] **Test coverage**: 1,200+ tests, every critical write path tested
- [ ] **UX states**: Every data page has loading, empty, error states
- [ ] **Cover page**: Connected to all core report generation paths
- [ ] **Observability**: Structured logging + Sentry + performance spans on critical paths
- [ ] **API consistency**: Standard response shapes, error codes, pagination
- [ ] **0 TypeScript errors, 0 ESLint errors, 0 test failures**
- [ ] **Production deploy succeeds with all checks green**

# 🔥 MASTER SYSTEM TODO — LOCK → UNIFY → SCALE

> **Generated:** 2026-03-21  
> **Scope:** Full platform — 294+ models, 644+ API routes, 128 app route groups, 38 nav items  
> **Sources:** 13 data-integrity audit docs + AI advisor system unification analysis + codebase scan  
> **Total Items:** 168 | ✅ Completed: 38 | 🔴 Remaining: 130

---

## STATUS KEY

- ✅ = Completed (P0 emergency pass)
- 🔴 = P0 — Critical / Blocker
- 🟠 = P1 — High priority
- 🟡 = P2 — Medium priority
- ⚪ = P3 — Low priority / cleanup

---

# ═══════════════════════════════════════════════════════

# PHASE 0 — EMERGENCY FIXES (COMPLETED ✅)

# ═══════════════════════════════════════════════════════

## 0A. Cross-Tenant Leak Fixes (B-01 → B-10)

- [x] **B-01**: `/api/claims/ai/build` — replaced `auth()` with `requireAuth()`, added orgId filter ✅
- [x] **B-02**: `/api/portal/generate-access` — replaced `body.orgId` with session orgId ✅
- [x] **B-03**: `/api/weather/analytics` — scoped weather reports + events by org ✅
- [x] **B-04**: `/api/reports/[reportId]/ai/[sectionKey]` — added orgId ownership check ✅
- [x] **B-05**: `/api/templates/[templateId]/generate-assets` — added OrgTemplate access check ✅
- [x] **B-06**: `/api/templates/[templateId]/validate` — added OrgTemplate access check ✅
- [x] **B-07**: `/api/contractor/profile` — added membership verification for body.orgId ✅
- [x] **B-09**: `/api/ai/damage/analyze` — added safeOrgContext org resolution ✅
- [x] **B-10**: `/api/ai/analyze-photo` — added safeOrgContext org resolution ✅

## 0B. Schema Hardening SQL (S-01 → S-05)

- [x] **S-01**: `reports.orgId` → NOT NULL + backfill from claim.orgId ✅ (SQL created)
- [x] **S-02**: `Client.orgId` → NOT NULL + backfill ✅ (SQL created)
- [x] **S-03**: `weather_reports` → add orgId column + backfill ✅ (SQL created)
- [x] **S-04**: `tradesCompany.orgId` → required + backfill ✅ (SQL created)
- [x] **S-05**: `tradesCompanyMember.orgId` → required + backfill ✅ (SQL created)

## 0C. Storage & File Safety (F-01 → F-03)

- [x] **F-01**: Switch all Supabase buckets to private ✅ (SQL created)
- [x] **F-02**: Deprecate `getPublicUrl()`, add `getSignedUrls()` batch helper ✅
- [x] **F-03**: Add RLS policies for org-scoped access ✅ (SQL created)

## 0D. Worker Idempotency (A-01 → A-03)

- [x] **A-01**: `damage-analyze` worker → ON CONFLICT clause ✅
- [x] **A-02**: `weather-analyze` worker → ON CONFLICT clause ✅
- [x] **A-03**: `proposal-generate` worker → ON CONFLICT clause ✅

## 0E. Silent Failure Fixes (O-03 → O-04)

- [x] **O-03**: `src/lib/organizations.ts` — 3 empty catches → logger.warn ✅
- [x] **O-04**: `src/lib/flags.ts` — 4 empty catches → logger.warn ✅

## 0F. P0 Isolation Tests (T-01 → T-05)

- [x] **T-01**: Cross-tenant claim CRUD tests (2 tests) ✅
- [x] **T-02**: Portal client isolation test ✅
- [x] **T-03**: Write path body.orgId verification test ✅
- [x] **T-04**: Report + weather org-filter tests (2 tests) ✅
- [x] **T-05**: Template access control tests (2 tests) ✅

> **Phase 0 Score: 18/18 complete — 26 tests passing, 0 regressions**

---

# ═══════════════════════════════════════════════════════

# PHASE 1 — LOCK THE SYSTEM (Integrity + Tenant Safety)

# ═══════════════════════════════════════════════════════

## 1A. TypeScript / Build Health 🔴

- [ ] **TS-01**: Fix `SimilarClaimsPanel` missing import in `src/app/(app)/claims/[claimId]/overview/page.tsx` (L867) — component exists at `src/components/intelligence/SimilarClaimsPanel.tsx` 🔴
- [ ] **TS-02**: Verify `src/lib/storage/client.ts` compiles cleanly after user edits 🔴
- [x] **TS-03**: Get typecheck to ZERO errors — `pnpm typecheck` must be green ✅

## 1B. Schema Hardening — Remaining Models 🟠

- [ ] **S-06**: Add FK constraints (`@relation` to Org) to 97 models missing them 🟠
- [ ] **S-07**: Add `@@index([orgId])` to 17+ models missing org indexes (reports, team_invitations, report_history, report_drafts, vendors, tradesCompany, claim_timeline_events, feature_flags, api_tokens, DashboardKpi, activity_events) 🟠
- [ ] **S-08**: Make `Notification.orgId` required — backfill from parent relations 🟠
- [ ] **S-09**: Make `DominusChatMessage.orgId` required — backfill 🟠
- [ ] **S-10**: Make `vendors.org_id` required — add FK and index 🟠
- [ ] **S-11**: Make `claim_timeline_events.org_id` required — add FK and index 🟠
- [ ] **S-12**: Fix `team_invitations` — add FK AND index on `org_id` 🟠
- [ ] **S-13**: Add unique constraint on `scopes(org_id, claim_id, title)` 🟡
- [ ] **S-14**: Add unique constraint on `vendors(org_id, name)` 🟡
- [ ] **S-15**: Standardize 52 `org_id` fields to `orgId` via `@map("org_id")` in Prisma 🟡
- [ ] **S-16**: Standardize `createdBy` naming across all 4 variants 🟡
- [ ] **S-17**: Split `TradeNotification.recipientId` into `recipientUserId` + `recipientOrgId` 🟡
- [ ] **S-18**: Make `feature_flags.org_id` required — add FK, index, unique on `(org_id, key)` 🟡
- [ ] **S-19**: Make `EmailLog.orgId` required — add FK 🟡
- [ ] **S-20**: Fix `activity_events.org_id` UUID type mismatch with CUID orgId 🟡
- [ ] **S-21**: Add compound indexes on `(orgId, status)` for filtered queries (claims, reports, jobs) 🟡

## 1C. API Route Auth Hardening 🟠

- [ ] **B-08**: `/api/pdf/create` (or `/api/pdf/generate`) — verify session orgId used, not body.orgId 🟠
- [ ] **B-11**: `/api/weather/verify` — remove `body.orgId` fallback, use session only 🟠
- [ ] **B-12**: `/api/leads` POST — add DB org verification (currently bare `auth()`) 🟠
- [ ] **B-13**: `/api/tasks/[taskId]` — add orgId check (currently user-only check) 🟠
- [x] **B-14**: `/api/notifications/[id]` — add orgId filter on delete ✅
- [ ] **B-15**: `/api/ai/run` — verify reportId belongs to caller's org 🟠
- [ ] **B-16**: `/api/network/[id]` — add org ownership check 🟠
- [ ] **B-17**: `/api/claims/generate-packet` — verify claim data belongs to org 🟠
- [ ] **B-18**: `/api/approvals/claim/[id]` — move orgId check BEFORE claim fetch (timing side-channel) 🟠
- [ ] **B-19**: `/api/claims/[claimId]/notes` — add orgId to timeline query for defense-in-depth 🟡
- [ ] **B-20**: `/api/claims/[claimId]/timeline` — add orgId to full claim fetch 🟡
- [ ] **B-21**: `/api/export/complete-packet` — standardize auth pattern 🟡
- [ ] **B-22**: `/api/evidence/[assetId]/signed-url` — add explicit org ownership check 🟡

## 1D. Auth Pattern Migration 🟠

- [ ] **AUTH-01**: Migrate ~80 bare `auth()` routes to `withOrgScope` or `safeOrgContext` 🟠
- [ ] **AUTH-02**: Migrate ~15 `currentUser()`-only routes to proper org resolution 🟠
- [ ] **AUTH-03**: Eliminate `companyId`-as-orgId fallback in `resolveOrg()` 🟠
- [ ] **AUTH-04**: Create `requireOrgOwnership(recordId, orgId)` shared helper 🟠
- [ ] **AUTH-05**: Audit ~10 routes with NO auth at all — add auth or confirm intentionally public 🔴
- [ ] **AUTH-06**: Add ESLint rule: flag `findUnique` on tenant models without orgId in WHERE 🟡

## 1E. Write Protection — Org Guard on All Mutations 🟠

- [ ] **WP-01**: Audit all 119 UPDATE/DELETE routes — ensure orgId in WHERE clause 🟠
- [ ] **WP-02**: `/api/report-templates/[id]` DELETE — replace `.catch(() => {})` with proper error + org check 🟠
- [ ] **WP-03**: `/api/tasks/[taskId]` PATCH/DELETE — add org check (not just user check) 🟠
- [x] **WP-04**: `/api/notifications/[id]` DELETE — add org filter ✅
- [x] **WP-05**: `/api/notifications/[id]/read` POST — add org filter ✅

## 1F. Transaction Enforcement 🟠

- [ ] **TX-01**: Identify all 60 multi-write routes without `$transaction` 🟠
- [ ] **TX-02**: Wrap critical multi-write routes in `prisma.$transaction()`:
  - [ ] Report generation (DB row + PDF generation) 🟠
  - [ ] Team invitation creation + email send 🟠
  - [ ] Claim creation + property connect-or-create (already safe ✅)
  - [ ] Upload + file_assets record creation 🟠
  - [ ] AI job enqueue + status update 🟡
- [ ] **TX-03**: Document transaction policy: ">1 DB write = $transaction" 🟡

## 1G. Silent Failure Elimination 🟠

- [ ] **O-01**: Replace empty catch in `src/lib/rbac.ts` L62 (owner email check) — auth-critical 🔴
- [ ] **O-02**: Replace empty catch in `src/lib/rbac.ts` L268 (permission check) — auth-critical 🔴
- [ ] **O-05**: Replace remaining ~35 empty catch blocks with `logger.error` + Sentry capture 🟠
- [ ] **O-06**: Replace ~24 fire-and-forget `.catch(() => {})` with proper error handling 🟠
  - [x] `claims/[claimId]/mutate/route.ts` — notification send ✅
  - [ ] `team/invitations/route.ts` — invitation email
  - [x] `claims/[claimId]/documents/route.ts` — ClaimIQ readiness hook ✅
  - [x] `claims/[claimId]/photos/route.ts` — ClaimIQ readiness hook ✅
  - [x] `claims/[claimId]/update/route.ts` — ClaimIQ readiness hook ✅
  - [x] `claims/[claimId]/weather/quick-verify/route.ts` — weather verified hook ✅
  - [ ] `report-templates/[id]/route.ts` — template cleanup
  - [ ] ClaimIQ `persistReadinessEvent` — core intelligence data
- [ ] **O-07**: Migrate ~90 routes from `console.log` to structured `logger` 🟡
- [ ] **O-08**: Add audit events for user role/permission changes 🟠
- [ ] **O-09**: Add audit events for file access (upload/download/delete) 🟠
- [ ] **O-10**: Add audit events for data exports 🟠
- [ ] **O-11**: Add audit events for team member management 🟡
- [ ] **O-12**: Add portal activity logging 🟡
- [ ] **O-13**: Add business metrics endpoint for platform health 🟡
- [ ] **O-14**: Add alerting on critical failure patterns 🟡

## 1H. File / Artifact Tracking 🟠

- [ ] **F-04**: Create `file_assets` records for portal uploads (`/api/portal/claims/[claimId]/assets`) 🟠
- [ ] **F-05**: Create `file_assets` records for message attachments (`/api/uploads/message-attachment`) 🟠
- [ ] **F-06**: Create DB artifact record for video generation (`/api/video/create`) 🟠
- [ ] **F-07**: Track avatar/cover/portfolio photos in `file_assets` or implement cleanup 🟡
- [ ] **F-08**: Fix upload fallback that uses `companyId` as orgId prefix 🟠
- [ ] **F-09**: Implement orphaned file cleanup cron job 🟡
- [ ] **F-10**: Wire up `saveResult` persist layer or remove dead code in `/api/ai/run` 🟠
- [ ] **F-11**: Add branding uploads to `file_assets` tracking 🟡
- [ ] **F-12**: Add file type validation to all upload routes 🟡

## 1I. Async / AI Pipeline Hardening 🟠

- [x] **A-04**: Make orgId required (not optional) in weather-analyze worker payload ✅
- [x] **A-05**: Make orgId required in proposal-generate worker payload ✅
- [ ] **A-06**: Replace in-memory AI queue with pg-boss or persistent queue 🟠
- [ ] **A-07**: Add orgId to PDF Queue job data 🟠
- [ ] **A-08**: Add per-org rate limiting for AI operations (not just per-user) 🟠
- [ ] **A-09**: Fix module-level `getAIClient()` call — make lazy 🟡
- [ ] **A-10**: Fix Firebase Functions direct `new OpenAI()` — use singleton 🟡
- [x] **A-11**: Replace `enqueueJobSafe` no-op stub with visible logger.warn ✅
- [ ] **A-12**: Add duplicate job detection to generic `enqueue()` 🟡

## 1J. Cron / Config Drift 🔴

- [x] **CRON-01**: Create `/api/wallet/reset-monthly` GET handler — Vercel crons send GET ✅
- [ ] **CRON-02**: Audit all 10 vercel.json cron paths — verify handlers match declarations 🟠

## 1K. Additional Tests — Prove Phase 1 Works 🟠

- [ ] **T-06**: Portal auth flow tests — client auth works correctly 🟠
- [x] **T-07**: Worker tenant context tests — all workers validate orgId ✅
- [ ] **T-08**: Report generation tests — reports properly org-scoped 🟠
- [ ] **T-09**: AI damage analysis route tests — ownership verified 🟠
- [ ] **T-10**: Team management tests — invitation + member flows 🟠
- [ ] **T-11**: Weather verification flow tests 🟡
- [ ] **T-12**: Billing/subscription flow tests 🟡
- [ ] **T-13**: Contact CRUD tests 🟡
- [ ] **T-14**: Lead CRUD tests 🟡
- [ ] **T-15**: Messaging system tests 🟡
- [ ] **T-16**: Notification delivery tests 🟡
- [ ] **T-17**: Export/download tests 🟡
- [ ] **T-18**: Auth pattern consistency regression tests 🟡
- [ ] **T-19**: Load/concurrent multi-tenant tests ⚪

---

# ═══════════════════════════════════════════════════════

# PHASE 2 — UNIFY THE SYSTEM (Flows + Navigation + UX)

# ═══════════════════════════════════════════════════════

## 2A. Route ↔ Navigation Consistency 🟠

- [ ] **NAV-01**: Build canonical route map — document every legitimate route and its purpose 🟠
- [x] **NAV-02**: Fix nav links pointing to missing pages — removed 3 ghost links, created maps + esign pages ✅
- [ ] **NAV-03**: Wire ~90 orphan routes into navigation OR mark as intentionally hidden (admin, system, etc.) 🟠
- [ ] **NAV-04**: Remove dead/unreachable routes that serve no purpose 🟡
- [ ] **NAV-05**: Standardize route naming conventions (kebab-case, consistent depth) 🟡
- [ ] **NAV-06**: Create route registry — single source of truth for all valid routes 🟡

## 2B. Duplicate System Consolidation 🟠

### Reports (6 overlapping systems → 1)

- [ ] **DUP-01**: Define ONE canonical report flow: `/reports` as hub 🟠
- [ ] **DUP-02**: Merge or deprecate `/report-workbench` → fold into `/reports` 🟠
- [ ] **DUP-03**: Merge `/exports/reports` → fold into `/reports` export tab 🟡
- [ ] **DUP-04**: Merge `/analytics/reports` → fold into `/reports` analytics view 🟡
- [ ] **DUP-05**: Consolidate `/ai/report-assembly` into `/reports/builder` 🟡

### Weather / Storm (7 overlapping systems → 1)

- [ ] **DUP-06**: Define ONE canonical weather hub: `/weather` 🟠
- [ ] **DUP-07**: Merge `/storm-center` + `/storm-graph` → fold into `/weather/storms` 🟡
- [ ] **DUP-08**: Merge `/maps/weather` + `/maps/weather-chains` → fold into `/weather/maps` 🟡
- [ ] **DUP-09**: Ensure `/weather` has a proper `page.tsx` (currently only has `analytics/` subdir) 🟠

### Connections / Network (5 overlapping systems → 1)

- [ ] **DUP-10**: Define ONE canonical network hub: `/network` or `/trades` 🟠
- [ ] **DUP-11**: Merge `/connections` → fold into trades/network 🟡
- [ ] **DUP-12**: Merge `/company/connections` → fold into trades/network 🟡
- [ ] **DUP-13**: Clarify `/vendor-network` vs `/trades` — merge or differentiate clearly 🟡

### Messaging (4 overlapping systems → 1)

- [ ] **DUP-14**: Define ONE canonical messaging system: `/messages` 🟠
- [ ] **DUP-15**: Merge `/inbox` → redirect to `/messages` 🟡
- [ ] **DUP-16**: Merge `/sms` → fold into `/messages` as SMS tab 🟡
- [ ] **DUP-17**: Merge `/trades/messages` → fold into `/messages` with trades filter 🟡

### Financial (5 overlapping systems → 1)

- [ ] **DUP-18**: Define ONE canonical finance hub: `/finance` 🟠
- [ ] **DUP-19**: Merge `/financial` → fold into `/finance` 🟡
- [ ] **DUP-20**: Merge `/billing` → fold into `/finance/billing` (keep `/settings/billing` for settings) 🟡
- [ ] **DUP-21**: Merge `/invoices` → fold into `/finance/invoices` 🟡
- [ ] **DUP-22**: Merge `/commissions` → fold into `/finance/commissions` 🟡

### Team / People (4 overlapping systems → 1)

- [ ] **DUP-23**: Define ONE canonical team hub: `/teams` 🟠
- [ ] **DUP-24**: Merge `/team` → redirect to `/teams` 🟡
- [ ] **DUP-25**: Merge `/employees` → fold into `/teams/members` 🟡

### Scopes / Estimates (4 overlapping → 1)

- [ ] **DUP-26**: Define ONE canonical scope/estimate flow 🟡
- [ ] **DUP-27**: Merge `/scopes` and scope-related claim sub-routes 🟡

### Onboarding (3 overlapping → 1)

- [ ] **DUP-28**: Define ONE canonical onboarding flow: `/onboarding` 🟡
- [ ] **DUP-29**: Merge `/auto-onboard` → fold into `/onboarding` 🟡

## 2C. Ghost Feature Resolution 🟡

- [ ] **GHOST-01**: `TearOffDiscovery` — Prisma model exists, no UI → build UI or remove model 🟡
- [ ] **GHOST-02**: `CompletionPacket` — Prisma model exists, no UI → wire into claim completion flow 🟡
- [ ] **GHOST-03**: `PipelineMetrics` — Prisma model exists, no UI → wire into dashboard or remove 🟡
- [ ] **GHOST-04**: `ClaimEventReconstruction` — worker exists, no UI → wire into claim timeline or remove 🟡
- [ ] **GHOST-05**: `SupplementTracker` — complete ghost, never built → decide: build or drop from roadmap ⚪
- [ ] **GHOST-06**: `DashboardKpi` — nullable orgId, may be placeholder → wire up or remove 🟡
- [ ] **GHOST-07**: `InsightsCache` — nullable orgId, may be unused → wire up or remove 🟡
- [ ] **GHOST-08**: `portal_settings` — userId only, no org → wire up or remove 🟡
- [ ] **GHOST-09**: `/api/ai/run` — `saveResult` is a no-op stub → implement or deprecate entire route 🟠

## 2D. Canonical User Flows (Define the ONE path) 🟠

- [ ] **FLOW-01**: Define canonical CLAIM flow: Create → Upload Photos → Run AI → Generate Report → Build Supplement 🟠
- [ ] **FLOW-02**: Define canonical REPORT flow: Select Claim → Choose Template → Generate → Export 🟠
- [ ] **FLOW-03**: Define canonical CONNECTION flow: Invite → Accept → Link → Operate 🟡
- [ ] **FLOW-04**: Define canonical WEATHER flow: Verify Address → Pull Data → Generate Report 🟡
- [ ] **FLOW-05**: Define canonical ONBOARDING flow: Sign Up → Org Setup → First Claim → First Report 🟡
- [ ] **FLOW-06**: Document all canonical flows in `/docs/audits/canonical-user-flows.md` 🟡

---

# ═══════════════════════════════════════════════════════

# PHASE 3 — SCALE (Intelligence + Monitoring + Polish)

# ═══════════════════════════════════════════════════════

## 3A. Intelligence Layer 🟡

- [ ] **INT-01**: Verify pgvector embedding pipeline end-to-end with clean tenant data 🟡
- [ ] **INT-02**: Wire `SimilarClaimsPanel` into claim overview (fix TS-01 first) 🟡
- [ ] **INT-03**: Build intelligence dashboard at `/intelligence/dashboard` 🟡
- [ ] **INT-04**: Add claim clustering by damage type + geography 🟡
- [ ] **INT-05**: Add AI-powered claim outcome prediction ⚪

## 3B. Integrity Monitoring (Runtime) 🟡

- [ ] **MON-01**: Create `/api/health/integrity` endpoint — checks orphan records, missing orgId, FK violations 🟡
- [ ] **MON-02**: Create `/cron/integrity-check` — scheduled integrity scan 🟡
- [ ] **MON-03**: Create orphan record alerting — notify on drift 🟡
- [ ] **MON-04**: Add per-org usage dashboard — claims, reports, AI calls, storage 🟡

## 3C. Documentation 🟡

- [ ] **DOC-01**: Generate canonical route map document 🟡
- [ ] **DOC-02**: Document auth tier decision tree (which tier for which route type) 🟡
- [ ] **DOC-03**: Document tenant isolation patterns (with code examples) 🟡
- [ ] **DOC-04**: Update copilot-instructions.md with all new patterns 🟡

---

# ═══════════════════════════════════════════════════════

# SUMMARY BY PRIORITY

# ═══════════════════════════════════════════════════════

| Priority  | Count   | Focus Area                                                                                                                                 |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅ Done   | 38      | Phase 0 + Sprint 1-4: tenant leaks, workers, nav, write protection, fire-and-forget, observability                                         |
| 🔴 P0     | 3       | TypeScript TS-01/TS-02, remaining RBAC                                                                                                     |
| 🟠 P1     | 58      | Schema FKs/indexes, auth migration, write protection, transactions, file tracking, observability, nav consistency, duplicate consolidation |
| 🟡 P2     | 53      | Naming standardization, test coverage, ghost features, canonical flows, monitoring, docs                                                   |
| ⚪ P3     | 4       | Multi-tenant load tests, intelligence extras, cleanup                                                                                      |
| **Total** | **156** | (130 remaining)                                                                                                                            |

---

# ═══════════════════════════════════════════════════════

# EXECUTION ORDER (RECOMMENDED)

# ═══════════════════════════════════════════════════════

### Sprint 1 (Days 1-2): Get Green ← YOU ARE HERE

1. TS-01, TS-02, TS-03 — TypeScript zero errors
2. CRON-01 — Create missing wallet reset cron handler
3. O-01, O-02 — Fix RBAC silent failures
4. AUTH-05 — Audit unauthed routes

### Sprint 2 (Days 3-5): Lock Auth

5. B-08 through B-22 — Fix remaining route auth gaps
6. AUTH-01 through AUTH-04 — Migrate bare auth() routes
7. WP-01 through WP-05 — Write protection audit

### Sprint 3 (Days 6-8): Lock Schema

8. S-06 through S-12 — FK constraints, indexes, NOT NULL
9. S-13 through S-21 — Unique constraints, naming standardization

### Sprint 4 (Days 9-11): Lock Files + Async

10. F-04 through F-12 — File artifact tracking
11. A-04 through A-12 — Async pipeline hardening
12. TX-01 through TX-03 — Transaction enforcement

### Sprint 5 (Days 12-14): Lock Observability

13. O-05 through O-14 — Error visibility, audit trail, logging

### Sprint 6 (Days 15-17): Prove It — Tests

14. T-06 through T-19 — Comprehensive test coverage

### Sprint 7 (Days 18-21): Unify

15. NAV-01 through NAV-06 — Route/nav consistency
16. DUP-01 through DUP-29 — Duplicate system consolidation
17. FLOW-01 through FLOW-06 — Canonical user flows
18. GHOST-01 through GHOST-09 — Ghost feature resolution

### Sprint 8 (Days 22-24): Scale

19. INT-01 through INT-05 — Intelligence layer
20. MON-01 through MON-04 — Integrity monitoring
21. DOC-01 through DOC-04 — Documentation

---

# ═══════════════════════════════════════════════════════

# CONSTRAINTS

# ═══════════════════════════════════════════════════════

- ❌ DO NOT commit/push until explicitly told
- ❌ DO NOT add new features during Phase 1
- ❌ DO NOT expand AI features until Phase 2 is complete
- ✅ SQL migrations created as files — NOT yet applied to database
- ✅ All changes local-only
- ✅ 3 SQL migration files ready: schema hardening, private buckets, worker constraints

---

# ═══════════════════════════════════════════════════════

# SCORE PROJECTION

# ═══════════════════════════════════════════════════════

| Milestone                | Integrity Score | Status                |
| ------------------------ | --------------- | --------------------- |
| Before audits            | 43/100 🔴       | Baseline              |
| After Phase 0 (now)      | ~55/100 🟡      | P0 leaks closed       |
| After Phase 1 Sprint 1-2 | ~65/100 🟡      | Auth locked           |
| After Phase 1 Sprint 3-4 | ~75/100 🟢      | Schema + files locked |
| After Phase 1 Sprint 5-6 | ~85/100 🟢      | Observability + tests |
| After Phase 2            | ~90/100 🟢      | Unified system        |
| After Phase 3            | ~95/100 🟢      | Enterprise-ready      |

---

> **ONE TRUTH:** Lock the data → Unify the experience → Scale the intelligence.

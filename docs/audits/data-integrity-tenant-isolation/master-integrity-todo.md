# Master Integrity TODO

> Generated 2025-03-21 from comprehensive codebase audit.  
> Total items: 98 | P0: 18 | P1: 32 | P2: 30 | P3: 18

---

## 🔴 SCHEMA INTEGRITY (17 items)

### P0 — Critical

- [ ] **S-01**: Make `reports.orgId` required (NOT NULL) — backfill existing nulls from claim.orgId
- [ ] **S-02**: Make `Client.orgId` required — backfill from claim associations
- [ ] **S-03**: Add `orgId` column to `weather_reports` — backfill from claim.orgId
- [ ] **S-04**: Make `tradesCompany.orgId` required — add FK, add index
- [ ] **S-05**: Make `tradesCompanyMember.orgId` required — add FK

### P1 — High

- [ ] **S-06**: Add FK constraints (`@relation` to Org) to 97 models missing them
- [ ] **S-07**: Add `@@index([orgId])` to 17+ models missing org indexes
- [ ] **S-08**: Make `Notification.orgId` required — backfill
- [ ] **S-09**: Make `DominusChatMessage.orgId` required
- [ ] **S-10**: Make `vendors.org_id` required, add FK and index
- [ ] **S-11**: Make `claim_timeline_events.org_id` required, add FK and index
- [ ] **S-12**: Fix `team_invitations` — add FK AND index on `org_id`
- [ ] **S-13**: Add unique constraint on `scopes(org_id, claim_id, title)`
- [ ] **S-14**: Add unique constraint on `vendors(org_id, name)`

### P2 — Medium

- [ ] **S-15**: Standardize 52 `org_id` fields to `orgId` via `@map("org_id")`
- [ ] **S-16**: Standardize `createdBy` naming across all 4 variants
- [ ] **S-17**: Split `TradeNotification.recipientId` into `recipientUserId` + `recipientOrgId`

---

## 🔴 BACKEND / API ROUTE SAFETY (24 items)

### P0 — Cross-Tenant Leaks

- [ ] **B-01**: `/api/claims/ai/build` — add orgId check (findUnique by ID, no org filter)
- [ ] **B-02**: `/api/portal/generate-access` — verify client belongs to caller's org
- [ ] **B-03**: `/api/weather/events` — add orgId filter to query
- [ ] **B-04**: `/api/reports/[reportId]/ai/[sectionKey]` — add orgId ownership check
- [ ] **B-05**: `/api/templates/[templateId]/generate-assets` — add org scope
- [ ] **B-06**: `/api/templates/[templateId]/validate` — add org scope
- [ ] **B-07**: `/api/contractor/profile` — replace `body.orgId` with session orgId
- [ ] **B-08**: `/api/pdf/create` — replace `body.orgId` with session orgId
- [ ] **B-09**: `/api/ai/damage/analyze` — add claim/org ownership check
- [ ] **B-10**: `/api/ai/analyze-photo` — add claim/org ownership check

### P1 — Auth Pattern Fixes

- [ ] **B-11**: `/api/weather/verify` — remove `body.orgId` fallback, use session only
- [ ] **B-12**: `/api/leads` POST — add DB org verification (currently bare `auth()`)
- [ ] **B-13**: `/api/tasks/[taskId]` — add orgId check (currently user-only check)
- [ ] **B-14**: `/api/notifications/[id]` — add orgId filter on delete
- [ ] **B-15**: `/api/ai/run` — verify reportId belongs to caller's org
- [ ] **B-16**: `/api/network/[id]` — add org ownership check
- [ ] **B-17**: `/api/claims/generate-packet` — verify claim data belongs to org

### P2 — Auth Migration

- [ ] **B-18**: Migrate ~80 bare `auth()` routes to `withOrgScope` or `safeOrgContext`
- [ ] **B-19**: Migrate ~15 `currentUser()`-only routes to proper org resolution
- [ ] **B-20**: Eliminate `companyId`-as-orgId fallback in `resolveOrg()`
- [ ] **B-21**: Create `requireOrgOwnership(recordId, orgId)` shared helper
- [ ] **B-22**: Weather reports — scope by orgId not userId
- [ ] **B-23**: Weather analytics — scope by orgId not userId
- [ ] **B-24**: Add ESLint rule: flag `findUnique` on tenant models without orgId

---

## 🔴 FILE / ARTIFACT OWNERSHIP (12 items)

### P0 — Public URLs

- [ ] **F-01**: Switch ALL Supabase buckets from public to private
- [ ] **F-02**: Replace all `getPublicUrl()` calls with `createSignedUrl()` + expiration
- [ ] **F-03**: Configure Supabase bucket RLS policies for org-scoped access

### P1 — Untracked Files

- [ ] **F-04**: Create `file_assets` records for portal uploads (`/api/portal/claims/[claimId]/assets`)
- [ ] **F-05**: Create `file_assets` records for message attachments
- [ ] **F-06**: Create DB artifact record for video generation
- [ ] **F-07**: Track avatar/cover/portfolio photos in `file_assets` or implement cleanup
- [ ] **F-08**: Fix upload fallback that uses `companyId` as orgId prefix

### P2 — Cleanup

- [ ] **F-09**: Implement orphaned file cleanup cron job
- [ ] **F-10**: Wire up `saveResult` persist layer (currently no-op stub)
- [ ] **F-11**: Add branding uploads to `file_assets` tracking
- [ ] **F-12**: Add file type validation to all upload routes

---

## 🔴 ASYNC / AI PIPELINE (12 items)

### P0 — Data Integrity

- [ ] **A-01**: Add `ON CONFLICT` to damage-analyze worker INSERT (duplicates on retry)
- [ ] **A-02**: Add `ON CONFLICT` to weather-analyze worker INSERT
- [ ] **A-03**: Add `ON CONFLICT` to proposal-generate worker INSERT

### P1 — Tenant Context

- [ ] **A-04**: Make orgId required (not optional) in weather-analyze worker payload
- [ ] **A-05**: Make orgId required in proposal-generate worker payload
- [ ] **A-06**: Replace in-memory AI queue with pg-boss or persistent queue
- [ ] **A-07**: Add orgId to PDF Queue job data
- [ ] **A-08**: Add per-org rate limiting for AI operations (not just per-user)

### P2 — Reliability

- [ ] **A-09**: Fix module-level `getAIClient()` call — make lazy
- [ ] **A-10**: Fix Firebase Functions direct `new OpenAI()` — use singleton
- [ ] **A-11**: Remove `enqueueJobSafe` no-op or implement backing
- [ ] **A-12**: Add duplicate job detection to generic `enqueue()`

---

## 🔴 OBSERVABILITY (14 items)

### P0 — Silent Failures

- [ ] **O-01**: Replace empty catch in `src/lib/rbac.ts` L62 (owner email check) — auth-critical
- [ ] **O-02**: Replace empty catch in `src/lib/rbac.ts` L268 (permission check) — auth-critical
- [ ] **O-03**: Replace 3 empty catches in `src/lib/organizations.ts` — org resolution critical
- [ ] **O-04**: Replace 3 empty catches in `src/lib/flags.ts` — feature flags unpredictable

### P1 — Error Visibility

- [ ] **O-05**: Replace remaining ~35 empty catch blocks with `logger.error` + Sentry capture
- [ ] **O-06**: Replace ~24 fire-and-forget `.catch(() => {})` with proper error handling
- [ ] **O-07**: Migrate ~90 routes from `console.log` to structured logger
- [ ] **O-08**: Add audit events for user role/permission changes
- [ ] **O-09**: Add audit events for file access (upload/download/delete)
- [ ] **O-10**: Add audit events for data exports

### P2 — Monitoring

- [ ] **O-11**: Add audit events for team member management
- [ ] **O-12**: Add portal activity logging
- [ ] **O-13**: Add business metrics endpoint for platform health
- [ ] **O-14**: Add alerting on critical failure patterns

---

## 🔴 TESTING (19 items)

### P0 — Block DAU

- [ ] **T-01**: Cross-tenant claim CRUD integration tests — org A cannot access org B claims
- [ ] **T-02**: Cross-tenant file access tests — org A cannot access org B files
- [ ] **T-03**: Write path org validation tests — every POST/PATCH/DELETE validates session orgId
- [ ] **T-04**: Read path org filtering tests — every GET includes orgId in WHERE
- [ ] **T-05**: Public URL access tests — verify signed URLs required

### P1 — Critical Flows

- [ ] **T-06**: Portal auth flow tests — client auth works correctly
- [ ] **T-07**: Worker tenant context tests — all workers validate orgId
- [ ] **T-08**: Report generation tests — reports properly org-scoped
- [ ] **T-09**: AI damage analysis route tests — ownership verified
- [ ] **T-10**: Team management tests — invitation + member flows

### P2 — Coverage

- [ ] **T-11**: Weather verification flow tests
- [ ] **T-12**: Billing/subscription flow tests
- [ ] **T-13**: Contact CRUD tests
- [ ] **T-14**: Lead CRUD tests
- [ ] **T-15**: Messaging system tests
- [ ] **T-16**: Notification delivery tests
- [ ] **T-17**: Export/download tests
- [ ] **T-18**: Auth pattern consistency regression tests
- [ ] **T-19**: Load/concurrent multi-tenant tests

---

## Summary by Priority

| Priority  | Count  | Focus Area                                                  |
| --------- | ------ | ----------------------------------------------------------- |
| 🔴 P0     | 18     | Cross-tenant leaks, public URLs, critical silent failures   |
| 🟠 P1     | 32     | Schema FKs, auth migration, file tracking, error visibility |
| 🟡 P2     | 30     | Naming standardization, monitoring, test coverage           |
| ⚪ P3     | 18     | Cleanup, documentation, long-term improvements              |
| **Total** | **98** |                                                             |

## Execution Order

1. **Day 1-3**: All P0 items (B-01 through B-10, F-01 through F-03, A-01 through A-03) — close cross-tenant leaks
2. **Week 2-3**: Schema hardening (S-01 through S-14) — make DB enforce integrity
3. **Week 4**: Auth migration (B-11 through B-24) — standardize all route auth
4. **Week 5**: File tracking (F-04 through F-12) — track all artifacts
5. **Week 6**: Observability (O-01 through O-14) — make failures visible
6. **Week 7-8**: Testing (T-01 through T-19) — prove it all works

# 🔥 MASTER FINAL TODO — DAU EXECUTION PLAN

> **Generated:** 2026-03-22  
> **Supersedes:** `docs/MASTER_SYSTEM_TODO.md` (original 168 items)  
> **Source:** Priority stack + targeted audits + codebase verification + AI recommendations  
> **DAU Target:** April 1, 2026  
> **Days Remaining:** 10

---

## WHAT'S ALREADY DONE (30 items ✅)

Phase 0 (18 items) + newly verified (12 items) = **30 items complete**.

Key wins:

- ✅ All P0 cross-tenant leaks closed (B-01 through B-10)
- ✅ Schema hardening SQL created (S-01 through S-05)
- ✅ Storage buckets privatized + RLS policies
- ✅ Worker idempotency (A-01 through A-03)
- ✅ TypeScript = 0 errors
- ✅ RBAC silent failures fixed (O-01, O-02)
- ✅ 9 additional route fixes verified (B-11, B-12, B-13, B-15, B-19×2, B-22×2, WP-03)
- ✅ AUTH-05 verified — zero unauthed mutation routes
- ✅ Cover pages on all 5 PDF generators
- ✅ Intel tab shipped
- ✅ Visual Intelligence MVP (pgvector + embeddings)

---

# ═══════════════════════════════════════════════════════

# SPRINT 1 — STOP THE BLEEDING (Days 1-2)

# ═══════════════════════════════════════════════════════

## S1-01: Fix `enqueueJobSafe` no-op stub 🔴

**File:** Find via `grep -r "enqueueJobSafe" src/`  
**Action:** Wire to pg-boss queue OR throw Error("Not implemented") so callers know  
**Why:** Users think jobs are queued; nothing happens. Silent data loss.  
**Test:** Enqueue a job → verify it appears in pg-boss queue

## S1-02: Fix AI in-memory job queue 🔴

**File:** AI queue module (in-memory Map)  
**Action:** Replace Map-based queue with pg-boss job type  
**Why:** Server restart = all "generating..." AI jobs lost forever  
**Test:** Start AI job → restart server → job resumes

## S1-03: Fix team invitation email fire-and-forget 🔴

**File:** `src/app/api/team/invitations/route.ts` (or similar)  
**Action:** Replace `.catch(() => {})` on email send with:

```typescript
try { await sendEmail(...) } catch(e) { logger.error("[INVITE_EMAIL_FAILED]", { e, invitationId }); }
```

**Why:** DB row created but invited user never gets the email  
**Test:** Intentionally fail email → verify error logged + user can resend

## S1-04: Make notification DELETE orgId mandatory 🔴

**File:** `src/app/api/notifications/[id]/route.ts`  
**Action:** Change conditional orgId check to mandatory. Return 403 if no orgId.  
**Why:** Cross-tenant notification deletion when Clerk has no org context  
**Test:** DELETE without orgId → 403

## S1-05: Add orgId to notification read update 🔴

**File:** `src/app/api/notifications/[id]/read/route.ts`  
**Action:** Add orgId to WHERE clause in Prisma update (not just findFirst)  
**Why:** TOCTOU window — find checks org but update doesn't  
**Test:** Attempt read-mark with wrong org → fails

## S1-06: Make worker orgId required 🔴

**Files:** `src/worker/jobs/weather-analyze.ts`, `src/worker/jobs/proposal-generate.ts`  
**Action:** Change `orgId?: string` to `orgId: string` in payload interfaces. Add runtime check.  
**Why:** Cross-tenant weather/proposal data if orgId missing  
**Test:** Enqueue without orgId → job rejects with clear error

## S1-07: Fix wallet/reset-monthly cron method 🟠

**File:** `src/app/api/wallet/reset-monthly/route.ts`  
**Action:** Add `export async function GET(req)` handler (Vercel crons send GET)  
**Why:** Monthly wallet reset silently 405s  
**Test:** `curl -X GET /api/wallet/reset-monthly -H "Authorization: Bearer $CRON_SECRET"` → 200

## S1-08: Fix ghost nav links 🟠

**File:** `src/config/nav.ts`  
**Actions:**

1. Remove `/ai/video-reports` from CORE_NAV and CONTEXT_NAV
2. Remove `/trades/metrics` from CONTEXT_NAV
3. Remove `/esign/on-site` from CONTEXT_NAV (only dynamic child exists)  
   **Why:** Users see sidebar links that go to 404  
   **Test:** Click every sidebar link → no 404s

## S1-09: Create `/maps` hub page 🟠

**File:** `src/app/(app)/maps/page.tsx` (CREATE)  
**Action:** Simple hub page with cards linking to door-knocking, map-view, routes, weather  
**Why:** `/maps` is in sidebar nav but has no index page  
**Test:** Click Maps in sidebar → see hub with links to sub-pages

## S1-10: Fix report template section org scoping 🟠

**Files:** Report template section PATCH/DELETE routes  
**Action:** Add orgId to WHERE clause on template section mutations  
**Why:** Any authed user can modify any org's template sections by ID  
**Test:** Attempt to update template section from wrong org → 403

---

## 🆕 DAMIEN'S RECOMMENDATIONS — Sprint 1 Additions

## S1-11: Add `console.log` → `logger` in 6 non-compliant API routes 🟡

**Files:** `support/bug-report`, `pilot/feedback`, `pilot/stats`, `analytics/claims`, `analytics/team`, `analytics/export`  
**Action:** Replace `console.log/error` with `logger.info/error`  
**Why:** 92% adoption → push to ~100%. Easy quick win.

## S1-12: Verify Firebase Functions AI singleton 🟡

**File:** Firebase Functions file(s)  
**Action:** Create local lazy singleton instead of `new OpenAI()` per invocation  
**Why:** Minor cost/perf issue on warm Cloud Function invocations

**Sprint 1 Total: 12 items | Est. 2 days**

---

# ═══════════════════════════════════════════════════════

# SPRINT 2 — LOCK WRITES & AUTH (Days 3-5)

# ═══════════════════════════════════════════════════════

## S2-01: Fix network route orgId→userId fallback 🟠

**File:** Network route(s)  
**Action:** Remove fallback that uses userId as orgId. Fail with 403 if no org.  
**Why:** Creates phantom org records keyed on user IDs

## S2-02: Verify claims/generate-packet org ownership 🟠

**File:** `src/app/api/claims/generate-packet/route.ts`  
**Action:** Add `claim.orgId === sessionOrgId` check before packet generation

## S2-03: Move approvals org check before fetch 🟠

**File:** `src/app/api/approvals/claim/[id]/route.ts`  
**Action:** Verify orgId BEFORE loading claim data (prevent timing side-channel)

## S2-04: Add orgId to timeline claim fetch 🟡

**File:** `src/app/api/claims/[claimId]/timeline/route.ts`  
**Action:** Add orgId to claim query WHERE clause

## S2-05: Add org scoping to export routes 🟠

**Files:** Export/complete-packet routes  
**Action:** Verify session orgId matches data being exported  
**Why:** Any authed user can render any PDF payload

## S2-06: Fix report-templates DELETE error handling 🟠

**File:** `src/app/api/report-templates/[id]/route.ts`  
**Action:** Replace `.catch(() => {})` with proper error + org verification

## S2-07: Fix upload companyId-as-orgId prefix 🟠

**File:** Upload fallback code  
**Action:** Use orgId from session, not companyId, for storage path prefix

## S2-08: Batch audit remaining UPDATE/DELETE routes 🟠

**Action:** Grep all `prisma.*.update` and `prisma.*.delete` calls, verify orgId in WHERE  
**Scope:** ~20 routes estimated

## S2-09: Eliminate companyId fallback in resolveOrg() 🟠

**File:** `src/lib/auth/tenant.ts`  
**Action:** Remove `companyId` resolution path. Fail if org can't be resolved.  
**Why:** Multiple fallbacks create unpredictable org context

## S2-10: Create requireOrgOwnership() shared helper 🟠

**File:** `src/lib/auth/` (CREATE)  
**Action:** Reusable function: `async requireOrgOwnership(model, recordId, orgId) → true | NextResponse(403)`  
**Why:** Standardizes ownership checks across all routes

## S2-11: Migrate top 20 bare auth() routes 🟠

**Action:** Convert highest-traffic `auth()` routes to `withOrgScope` or `safeOrgContext`  
**Priority:** Focus on claim CRUD, report generation, weather, team routes

## S2-12: Migrate 15 currentUser()-only routes 🟠

**Action:** Add org resolution to routes that only check userId

## S2-13: Fix critical fire-and-forget patterns 🟠

**Files:**

- `onboarding/wizard/page.tsx` — 10 `.catch(() => {})` catches
- `claims/documents/route.ts` — ClaimIQ hook
- `claims/photos/route.ts` — ClaimIQ hook
- `claims/update/route.ts` — ClaimIQ hook
- `security/backupEncryption.ts` — 2 silent failures  
  **Action:** Replace with `logger.error` + Sentry capture

---

## 🆕 DAMIEN'S RECOMMENDATIONS — Sprint 2 Additions

## S2-14: Add rate limiting to export routes 🟡

**Why:** PDF generation is CPU-intensive. Without per-org rate limiting, one org can DOS the system.  
**Action:** Apply `ai` rate limit preset (5/min) to export routes.

## S2-15: Add request ID tracking to auth pipeline 🟡

**Why:** When auth fails in production, need to trace which request + which route + which user  
**Action:** Add `x-request-id` header propagation through auth functions

**Sprint 2 Total: 15 items | Est. 3 days**

---

# ═══════════════════════════════════════════════════════

# SPRINT 3 — LOCK SCHEMA & PIPELINE (Days 6-8)

# ═══════════════════════════════════════════════════════

## S3-01: Schema hardening SQL migration 🟠

**File:** `db/migrations/20260322_schema_hardening_phase1.sql` (CREATE)  
**Contents:**

- FK constraints for critical models → Org
- `@@index([orgId])` on 17+ models
- `Notification.orgId` NOT NULL + backfill
- `vendors.org_id` NOT NULL + FK + index
- `claim_timeline_events.org_id` NOT NULL
- `team_invitations` FK + index
- `activity_events.org_id` type fix

## S3-02: Update Prisma schema to match SQL 🟠

**File:** `prisma/schema.prisma`  
**Action:** Add @relation, @@index, make fields required to match SQL

## S3-03: Migrate AI queue to pg-boss 🟠

**Action:** Replace in-memory Map queue with pg-boss job type for AI operations  
**Why:** Persistence + retry + monitoring for free

## S3-04: Add orgId to PDF Queue job data 🟠

**Action:** Include orgId in all PDF generation queue payloads

## S3-05: Add per-org rate limiting for AI ops 🟠

**Action:** Extend rate limiting to check org-level AI usage, not just per-user

## S3-06: Wrap report generation in $transaction 🟠

**Action:** DB row creation + PDF generation in atomic transaction

## S3-07: Wrap team invitation in $transaction 🟠

**Action:** Invitation record + email send in transaction (rollback if email service unreachable)

## S3-08: Create file_assets for portal uploads 🟠

**File:** `src/app/api/portal/claims/[claimId]/assets/route.ts`

## S3-09: Create file_assets for message attachments 🟠

**File:** `src/app/api/uploads/message-attachment/route.ts`

## S3-10: Wire saveResult or remove dead code in ai/run 🟠

**File:** `src/app/api/ai/run/route.ts`

---

## 🆕 DAMIEN'S RECOMMENDATIONS — Sprint 3 Additions

## S3-11: Add database connection pooling health check 🟡

**Why:** 243 Prisma models + 647 routes = heavy DB load. Need to monitor pool exhaustion.  
**Action:** Add `/api/health/db` endpoint that checks connection pool stats

## S3-12: Add migration dry-run validation script 🟡

**File:** `scripts/validate-migration.sh` (CREATE)  
**Action:** Script that runs `BEGIN; <migration>; ROLLBACK;` to validate SQL without applying  
**Why:** Schema migrations are highest-risk changes. Validate before applying.

## S3-13: Identify and log all 60 multi-write routes 🟠

**Action:** Automated scan for routes with 2+ `prisma.*.create/update/delete` calls without `$transaction`  
**Output:** List in `docs/execution/multi-write-audit.md`

**Sprint 3 Total: 13 items | Est. 3 days**

---

# ═══════════════════════════════════════════════════════

# SPRINT 4 — PROVE IT & POLISH (Days 9-10)

# ═══════════════════════════════════════════════════════

## S4-01: Portal auth flow tests 🟠

**File:** `__tests__/portal-auth.test.ts` (CREATE)  
**Cases:** Client login, claim access, photo upload, message send

## S4-02: Worker tenant context tests 🟠

**File:** `__tests__/worker-tenant.test.ts` (CREATE)  
**Cases:** Job rejects without orgId, job uses correct org context

## S4-03: Report generation org-scoped tests 🟠

**File:** `__tests__/report-generation.test.ts` (CREATE)  
**Cases:** Report created with orgId, cross-org report access denied

## S4-04: AI damage analysis ownership tests 🟠

**File:** `__tests__/ai-damage.test.ts` (CREATE)  
**Cases:** Analysis scoped to org, cross-org analysis denied

## S4-05: Team management flow tests 🟠

**File:** `__tests__/team-management.test.ts` (CREATE)  
**Cases:** Invite, accept, member visible, cross-org invite denied

## S4-06: Add core features to nav 🟠

**File:** `src/config/nav.ts`  
**Action:** Add nav entries for: tasks, invoices, contracts, work-orders, clients, estimates

## S4-07: Create /weather hub page 🟡

**File:** `src/app/(app)/weather/page.tsx` (CREATE)  
**Action:** Hub redirecting to `/weather-chains` or showing weather overview

## S4-08: Final TypeScript check 🔴

**Command:** `pnpm typecheck` → must be 0 errors

## S4-09: Final isolation test run 🔴

**Command:** `pnpm test:unit` → all tests pass

## S4-10: DAU release gate check 🔴

**Action:** Go through every item in `/docs/execution/dau-release-gate.md`  
**Result:** All 45 gates must be ✅

---

## 🆕 DAMIEN'S RECOMMENDATIONS — Sprint 4 Additions

## S4-11: Create first-hour monitoring runbook 🟡

**File:** `runbooks/dau-first-hour.md` (CREATE)  
**Contents:**

- What to watch: Sentry error rate, DB connection pool, API response times
- What's normal: Expected error patterns, known warnings
- Kill switches: How to disable AI features, how to put site in maintenance mode
- Contact list: Who to call for Vercel/Supabase/Clerk/Stripe issues

## S4-12: Create rollback plan 🟡

**File:** `runbooks/rollback-plan.md` (CREATE)  
**Contents:**

- How to revert Vercel deployment (instant rollback via dashboard)
- How to revert SQL migrations (reverse migration scripts)
- How to disable features via feature flags
- Communication plan for users if rollback needed

## S4-13: Smoke test all critical flows manually 🟠

**Action:** Walk through each flow in `dau-release-gate.md` GATE 6 with a real browser  
**Log:** Record pass/fail + screenshots

## S4-14: Set up uptime monitoring 🟡

**Action:** Configure external uptime check on `/api/health` endpoint  
**Why:** Need to know within 60 seconds if the platform goes down

**Sprint 4 Total: 14 items | Est. 2 days**

---

# ═══════════════════════════════════════════════════════

# POST-DAU BACKLOG (After April 1)

# ═══════════════════════════════════════════════════════

### Phase 2 — UNIFY (Weeks 2-3 post-DAU)

- Route consolidation: 28 merges + 19 removes (see unified-system-map.md)
- Remaining auth migrations (~80 bare auth() routes)
- Console.log → logger for remaining routes
- Ghost feature resolution (9 items)
- Canonical flow documentation (6 items)
- Remaining schema naming standardization (S-13 through S-21)

### Phase 3 — SCALE (Weeks 4-6 post-DAU)

- Intelligence layer polish (INT-01 through INT-05)
- Integrity monitoring endpoints (MON-01 through MON-04)
- Remaining test coverage (T-11 through T-19)
- Remaining fire-and-forget fixes (~100 instances)
- File artifact completeness (F-06, F-07, F-09, F-11, F-12)
- Documentation (DOC-01 through DOC-04)
- Load/concurrent multi-tenant tests (T-19)

---

# ═══════════════════════════════════════════════════════

# FINAL SCORECARD

# ═══════════════════════════════════════════════════════

| Category         |  Done  | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | POST-DAU |
| ---------------- | :----: | :------: | :------: | :------: | :------: | :------: |
| Blocker fixes    |  0/14  |  **14**  |    —     |    —     |    —     |    —     |
| Write protection |  9/20  |    1     |  **8**   |    —     |    —     |    2     |
| Auth migration   |  1/6   |    —     |  **4**   |    —     |    —     |    1     |
| Fire-and-forget  | 2/154  |    1     |  **5**   |    —     |    —     |   ~146   |
| Schema hardening |  5/21  |    —     |    —     |  **7**   |    —     |    9     |
| Async pipeline   |  3/12  |    2     |    —     |  **5**   |    —     |    2     |
| File tracking    |  3/12  |    —     |    —     |  **3**   |    —     |    6     |
| Tests            |  5/19  |    —     |    —     |    —     |  **5**   |    9     |
| Nav/routes       |  0/10  |    2     |    —     |    —     |  **4**   |    4     |
| Transactions     |  0/3   |    —     |    —     |  **2**   |    —     |    1     |
| **My additions** |   —    |    2     |    2     |    3     |    4     |    —     |
| **TOTALS**       | **28** |  **22**  |  **19**  |  **20**  |  **13**  | **~180** |

### Timeline

```
Mar 23-24  → Sprint 1 (STOP THE BLEEDING)     → 22 items
Mar 25-27  → Sprint 2 (LOCK WRITES & AUTH)     → 19 items
Mar 28-30  → Sprint 3 (LOCK SCHEMA & PIPELINE) → 20 items
Mar 31-Apr 1 → Sprint 4 (PROVE IT & POLISH)    → 13 items
Apr 1      → DAU RELEASE GATE CHECK            → 45 gates
Apr 1      → 🚀 GO LIVE
```

### Integrity Score Projection

```
Today (post Phase 0 + 3 pushes):     80/100 🟢
After Sprint 1:                       86/100 🟢
After Sprint 2:                       90/100 🟢
After Sprint 3:                       94/100 🟢
After Sprint 4:                       97/100 🟢
After Phase 2 (post-DAU):             98/100 🟢
After Phase 3 (post-DAU):             99/100 🟢
```

---

# EXECUTION RULES

1. ❌ **No new features** until all 4 sprints complete
2. ❌ **No scope expansion** — if it's not on this list, it waits
3. ❌ **No broad audits** — only targeted verification tied to sprint items
4. ✅ **Each sprint gets its own commit + push**
5. ✅ **TypeScript must be 0 errors after each sprint**
6. ✅ **Test suite must pass after each sprint**
7. ✅ **DAU release gate is the ONLY authority for go-live**

---

> **This is the final TODO. No more discovery. No more audits.**  
> **Execute Sprint 1 → verify → Sprint 2 → verify → Sprint 3 → verify → Sprint 4 → GATE CHECK → LAUNCH.**
>
> Say **"RUN SPRINT 1 WITH ME"** to start.

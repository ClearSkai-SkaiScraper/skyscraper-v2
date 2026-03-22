# ✅ DAU RELEASE GATE — Go/No-Go Checklist

> **Generated:** 2026-03-22  
> **Target:** April 1, 2026  
> **Rule:** System can ONLY go live when ALL items below are checked.

---

## GATE 1 — DATA INTEGRITY (Must Pass)

- [ ] **G1-01:** All BLOCKER items resolved (14 items from priority-stack.md)
- [ ] **G1-02:** `enqueueJobSafe` wired to real queue OR all callers removed
- [ ] **G1-03:** AI job queue persists across restarts (pg-boss or equivalent)
- [ ] **G1-04:** Team invitation emails retry on failure (not fire-and-forget)
- [ ] **G1-05:** No UPDATE/DELETE route without orgId in WHERE clause
- [ ] **G1-06:** Worker job payloads require orgId (not optional)
- [ ] **G1-07:** No orphan records created by failing multi-write operations

---

## GATE 2 — AUTHENTICATION (Must Pass)

- [ ] **G2-01:** Zero routes with unintentional no-auth (currently ✅)
- [ ] **G2-02:** `resolveOrg()` has no companyId fallback
- [ ] **G2-03:** Notification DELETE requires orgId (mandatory, not conditional)
- [ ] **G2-04:** Export routes verify org ownership before rendering
- [ ] **G2-05:** Report template section mutations include orgId in WHERE
- [ ] **G2-06:** All cron routes verify `CRON_SECRET` header

---

## GATE 3 — TENANT ISOLATION (Must Pass)

- [ ] **G3-01:** Cross-tenant isolation tests passing (`pnpm test:unit`)
- [ ] **G3-02:** Vector tenant isolation tests passing
- [ ] **G3-03:** Supabase buckets set to private (SQL applied)
- [ ] **G3-04:** RLS policies active on storage
- [ ] **G3-05:** No route accepts `body.orgId` for tenant context

---

## GATE 4 — BUILD HEALTH (Must Pass)

- [ ] **G4-01:** `pnpm typecheck` = 0 errors (currently ✅)
- [ ] **G4-02:** `pnpm build` succeeds (currently ✅)
- [ ] **G4-03:** `pnpm lint:core` = 0 errors
- [ ] **G4-04:** No new TypeScript `any` in critical paths

---

## GATE 5 — NAVIGATION (Must Pass)

- [ ] **G5-01:** Zero ghost nav links (4 identified → all fixed)
- [ ] **G5-02:** `/maps` has index page
- [ ] **G5-03:** All core features accessible via nav
- [ ] **G5-04:** All cron paths have matching route handlers

---

## GATE 6 — CRITICAL FLOWS (Must Pass)

- [ ] **G6-01:** Onboarding: Sign up → Org setup → First claim (no silent failures)
- [ ] **G6-02:** Claim creation: Create → Upload → AI analysis → Report
- [ ] **G6-03:** Report generation: Select → Template → Generate → Export
- [ ] **G6-04:** Weather: Verify → Pull → Generate → Set DOL
- [ ] **G6-05:** Team: Invite → Email delivered → Accept → Member visible
- [ ] **G6-06:** Portal: Client login → View claim → Upload photos → Message pro

---

## GATE 7 — ASYNC SAFETY (Must Pass)

- [ ] **G7-01:** All worker jobs have ON CONFLICT idempotency (currently ✅ for 3/3)
- [ ] **G7-02:** AI jobs don't use in-memory Map queue
- [ ] **G7-03:** No silent job discarding (`enqueueJobSafe` wired or removed)
- [ ] **G7-04:** PDF generation jobs include orgId

---

## GATE 8 — OBSERVABILITY (Should Pass)

- [ ] **G8-01:** Sentry configured and receiving errors
- [ ] **G8-02:** Structured logger used in 90%+ of API routes (currently 92% ✅)
- [ ] **G8-03:** Health endpoint returns proper status
- [ ] **G8-04:** Critical email sends have retry/alerting

---

## GATE 9 — SECURITY (Must Pass)

- [ ] **G9-01:** No `getPublicUrl()` calls in production paths
- [ ] **G9-02:** File uploads validate type/size
- [ ] **G9-03:** Rate limiting active on AI endpoints
- [ ] **G9-04:** Webhook routes verify signatures (Stripe, Clerk, Twilio)
- [ ] **G9-05:** No secrets in client-side code

---

## SCORING

| Gate                | Items | Required | Status                          |
| ------------------- | ----- | -------- | ------------------------------- |
| G1 Data Integrity   | 7     | ALL      | 🟡 Pending Sprint 1-3           |
| G2 Authentication   | 6     | ALL      | 🟡 Pending Sprint 1-2           |
| G3 Tenant Isolation | 5     | ALL      | 🟢 4/5 done (SQL pending apply) |
| G4 Build Health     | 4     | ALL      | 🟢 3/4 done                     |
| G5 Navigation       | 4     | ALL      | 🟡 Pending Sprint 1             |
| G6 Critical Flows   | 6     | ALL      | 🟡 Pending verification         |
| G7 Async Safety     | 4     | ALL      | 🟡 Pending Sprint 1+3           |
| G8 Observability    | 4     | 3/4      | 🟢 3/4 done                     |
| G9 Security         | 5     | ALL      | 🟢 4/5 done                     |

### Current Score: **~22/45 gates passing**

### Target Score: **45/45 gates passing**

### Projected: After Sprint 1-4 → **45/45** ✅

---

## LAUNCH APPROVAL

```
[ ] Sprint 1 complete → re-check gates
[ ] Sprint 2 complete → re-check gates
[ ] Sprint 3 complete → re-check gates
[ ] Sprint 4 complete → FINAL gate check
[ ] All 45 items checked → APPROVE FOR DAU
[ ] Monitoring plan in place for first 48 hours
```

### Sign-off Required:

- [ ] Tech Lead: All gates pass
- [ ] Manual QA: Critical flows verified
- [ ] Deployment: Vercel build green + health check passes

---

> **The system launches when ALL gates are green. No exceptions. No "good enough."**

# 🔥 PRIORITY STACK — BLOCKERS → PRE-DAU → POST-DAU

> **Generated:** 2026-03-22  
> **Source:** MASTER_SYSTEM_TODO.md (168 items) + targeted codebase audits  
> **DAU Target:** April 1, 2026  
> **Methodology:** Ranked by data integrity risk → tenant isolation risk → write corruption risk → user flow breakage → system cohesion → observability

---

## STATUS FROM AUDITS — Items Already Resolved

The following TODO items are **ALREADY DONE** based on codebase verification:

| ID      | Item                          | Status                                                                     |
| ------- | ----------------------------- | -------------------------------------------------------------------------- |
| TS-03   | TypeScript zero errors        | ✅ Confirmed — `pnpm typecheck` = 0 errors                                 |
| O-01    | RBAC silent fail L62          | ✅ Resolved — proper logging + 403 response                                |
| O-02    | RBAC silent fail L268         | ✅ Resolved — proper logging + 401/403                                     |
| AUTH-05 | Audit unauthed routes         | ✅ Verified — 0 true unauthed mutation routes                              |
| B-11    | weather/verify body.orgId     | ✅ Fixed — session orgId only                                              |
| B-12    | leads POST org verification   | ✅ Fixed — strict session orgId                                            |
| B-13    | tasks/[taskId] orgId check    | ✅ Fixed — atomic orgId guard                                              |
| B-15    | ai/run reportId ownership     | ✅ Fixed — withOrgScope + ownership check                                  |
| B-19    | claims/notes orgId defense    | ✅ Fixed — orgId in all queries                                            |
| B-22    | evidence/signed-url org check | ✅ Fixed — orgId in WHERE                                                  |
| WP-03   | tasks PATCH/DELETE org check  | ✅ Fixed — same as B-13                                                    |
| CRON-01 | wallet/reset-monthly handler  | ⚠️ EXISTS but has GET/POST mismatch — cron sends GET, handler exports POST |

**Adjusted remaining: ~135 items** (18 Phase 0 done + 12 newly verified = 30 done / 168 total)

---

# ═══════════════════════════════════════════════════════

# 🔴 TIER 1 — BLOCKERS (Must fix before ANY production push)

# ═══════════════════════════════════════════════════════

> These can cause **data corruption, tenant leaks, or silent data loss** right now.

### 1.1 — Silent Data Loss (Critical)

| #   | ID         | Item                                                                        | Risk                                          |
| --- | ---------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | **NEW-C1** | `enqueueJobSafe` is a complete **no-op stub** — silently discards jobs      | 🔴 Users think jobs run; nothing happens      |
| 2   | **NEW-C2** | AI job queue is **in-memory Map** — lost on restart/cold-start              | 🔴 "Generating..." hangs forever after deploy |
| 3   | **NEW-C3** | Team invitation email `.catch(() => {})` — DB row created, email never sent | 🔴 Invited users never get the invite         |

### 1.2 — Tenant Isolation Gaps (Write Path)

| #   | ID        | Item                                                                    | Risk                                  |
| --- | --------- | ----------------------------------------------------------------------- | ------------------------------------- |
| 4   | **B-14**  | `notifications/[id]` DELETE — orgId guard is conditional, not mandatory | 🔴 Cross-tenant notification deletion |
| 5   | **WP-04** | `notifications/[id]` DELETE — no orgId in WHERE                         | 🔴 Same as B-14                       |
| 6   | **WP-05** | `notifications/[id]/read` — no orgId on update                          | 🔴 TOCTOU window                      |
| 7   | **A-04**  | `weather-analyze` worker — orgId optional in payload                    | 🔴 Cross-tenant weather data          |
| 8   | **A-05**  | `proposal-generate` worker — orgId optional in payload                  | 🔴 Cross-tenant proposal data         |

### 1.3 — Auth & Cron Gaps

| #   | ID          | Item                                                               | Risk                               |
| --- | ----------- | ------------------------------------------------------------------ | ---------------------------------- |
| 9   | **CRON-01** | wallet/reset-monthly GET/POST mismatch — silently 405s every month | 🟠 Wallets never reset             |
| 10  | **B-08**    | report-templates sections — no orgId in PATCH/DELETE WHERE         | 🟠 Cross-org template modification |

### 1.4 — Ghost Nav Links (User-Facing 404s)

| #   | ID            | Item                                                | Risk                   |
| --- | ------------- | --------------------------------------------------- | ---------------------- |
| 11  | **NAV-FIX-1** | `/ai/video-reports` nav link → no page exists (404) | 🟠 Broken sidebar link |
| 12  | **NAV-FIX-2** | `/maps` nav link → no index page (404)              | 🟠 Broken sidebar link |
| 13  | **NAV-FIX-3** | `/trades/metrics` context nav → no page (404)       | 🟡 Dead context link   |
| 14  | **NAV-FIX-4** | `/esign/on-site` context nav → no index page        | 🟡 Dead context link   |

**BLOCKER TOTAL: 14 items**

---

# ═══════════════════════════════════════════════════════

# 🟠 TIER 2 — PRE-DAU REQUIRED (Must complete before April 1)

# ═══════════════════════════════════════════════════════

> These affect **system reliability, user trust, and professional appearance**.

### 2.1 — Write Protection Remaining (8 items)

| #   | ID    | Item                                                           |
| --- | ----- | -------------------------------------------------------------- |
| 15  | B-16  | network routes — orgId fallback to userId creates phantom orgs |
| 16  | B-17  | claims/generate-packet — verify claim belongs to org           |
| 17  | B-18  | approvals/claim/[id] — move orgId check BEFORE claim fetch     |
| 18  | B-20  | claims/[claimId]/timeline — add orgId to claim fetch           |
| 19  | B-21  | export/complete-packet — no org scoping on PDF generation      |
| 20  | WP-01 | Audit remaining UPDATE/DELETE routes for orgId (batch)         |
| 21  | WP-02 | report-templates/[id] DELETE — replace .catch(() => {})        |
| 22  | F-08  | Upload fallback uses companyId as orgId prefix                 |

### 2.2 — Fire-and-Forget Critical Path Fixes (6 items)

| #   | ID    | Item                                                                  |
| --- | ----- | --------------------------------------------------------------------- |
| 23  | O-05a | Fix team/invitations email `.catch(() => {})` — MUST succeed or retry |
| 24  | O-05b | Fix claims/documents ClaimIQ hook `.catch(() => {})`                  |
| 25  | O-05c | Fix claims/photos ClaimIQ hook `.catch(() => {})`                     |
| 26  | O-05d | Fix claims/update ClaimIQ hook `.catch(() => {})`                     |
| 27  | O-05e | Fix onboarding/wizard — 10 fire-and-forget catches                    |
| 28  | O-05f | Fix security/backupEncryption — 2 silent failures                     |

### 2.3 — Schema Hardening Critical (7 items)

| #   | ID   | Item                                                 |
| --- | ---- | ---------------------------------------------------- |
| 29  | S-06 | Add FK constraints to 97 models missing org relation |
| 30  | S-07 | Add `@@index([orgId])` to 17+ models                 |
| 31  | S-08 | Notification.orgId → required + backfill             |
| 32  | S-10 | vendors.org_id → required + FK + index               |
| 33  | S-11 | claim_timeline_events.org_id → required              |
| 34  | S-12 | team_invitations — add FK + index on org_id          |
| 35  | S-20 | activity_events.org_id UUID/CUID type mismatch       |

### 2.4 — Auth Pattern Migration Priority (4 items)

| #   | ID      | Item                                                   |
| --- | ------- | ------------------------------------------------------ |
| 36  | AUTH-01 | Migrate top ~20 bare `auth()` routes (highest traffic) |
| 37  | AUTH-02 | Migrate ~15 `currentUser()`-only routes                |
| 38  | AUTH-03 | Eliminate companyId-as-orgId fallback in resolveOrg()  |
| 39  | AUTH-04 | Create `requireOrgOwnership()` shared helper           |

### 2.5 — Transaction Enforcement (3 items)

| #   | ID     | Item                                                    |
| --- | ------ | ------------------------------------------------------- |
| 40  | TX-01  | Identify all 60 multi-write routes without $transaction |
| 41  | TX-02a | Wrap report generation in $transaction                  |
| 42  | TX-02b | Wrap team invitation + email in $transaction            |

### 2.6 — Async Pipeline Safety (4 items)

| #   | ID   | Item                                                   |
| --- | ---- | ------------------------------------------------------ |
| 43  | A-06 | Replace in-memory AI queue with pg-boss                |
| 44  | A-07 | Add orgId to PDF Queue job data                        |
| 45  | A-08 | Add per-org rate limiting for AI ops                   |
| 46  | A-11 | Wire `enqueueJobSafe` to pg-boss or remove all callers |

### 2.7 — File Artifact Tracking (3 items)

| #   | ID   | Item                                               |
| --- | ---- | -------------------------------------------------- |
| 47  | F-04 | Create file_assets records for portal uploads      |
| 48  | F-05 | Create file_assets records for message attachments |
| 49  | F-10 | Wire up saveResult persist layer in /api/ai/run    |

### 2.8 — Critical Flow Verification Tests (5 items)

| #   | ID   | Item                               |
| --- | ---- | ---------------------------------- |
| 50  | T-06 | Portal auth flow tests             |
| 51  | T-07 | Worker tenant context tests        |
| 52  | T-08 | Report generation org-scoped tests |
| 53  | T-09 | AI damage analysis ownership tests |
| 54  | T-10 | Team management flow tests         |

### 2.9 — Route Cleanup & Nav (4 items)

| #   | ID     | Item                                                                                          |
| --- | ------ | --------------------------------------------------------------------------------------------- |
| 55  | NAV-01 | Build canonical route map                                                                     |
| 56  | NAV-02 | Fix all ghost nav links (4 identified)                                                        |
| 57  | NAV-03 | Add nav entries for orphaned core features (tasks, invoices, contracts, work-orders, clients) |
| 58  | DUP-09 | Create `/weather` hub page                                                                    |

**PRE-DAU TOTAL: 44 items**

---

# ═══════════════════════════════════════════════════════

# ⚪ TIER 3 — POST-DAU SAFE (Can defer, won't block users)

# ═══════════════════════════════════════════════════════

> These improve the system but don't risk data loss or user-facing failures.

### 3.1 — Schema Naming & Cleanup (9 items)

- S-09, S-13, S-14, S-15, S-16, S-17, S-18, S-19, S-21

### 3.2 — Remaining Auth Migration (2 items)

- AUTH-06 (ESLint rule), B-08 remaining edge cases

### 3.3 — Observability & Logging (10 items)

- O-06 (remaining ~100 fire-and-forget), O-07 (~90 console.log → logger, only 6 critical)
- O-08 through O-14 (audit events, portal logging, metrics, alerting)

### 3.4 — File & Artifact Completeness (5 items)

- F-06, F-07, F-09, F-11, F-12

### 3.5 — Async Pipeline Polish (4 items)

- A-09, A-10, A-12, Firebase singleton fix

### 3.6 — Duplicate System Consolidation (29 items)

- DUP-01 through DUP-29 (weather/reports/connections/messaging/financial/team/scopes/onboarding)

### 3.7 — Ghost Feature Resolution (9 items)

- GHOST-01 through GHOST-09

### 3.8 — Canonical Flow Documentation (6 items)

- FLOW-01 through FLOW-06

### 3.9 — Intelligence & Monitoring (9 items)

- INT-01 through INT-05, MON-01 through MON-04

### 3.10 — Documentation (4 items)

- DOC-01 through DOC-04

### 3.11 — Remaining Tests (9 items)

- T-11 through T-19

### 3.12 — Transaction Enforcement Remaining (2 items)

- TX-02c (upload + file_assets), TX-03 (document policy)

### 3.13 — Route Cleanup (4 items)

- NAV-04, NAV-05, NAV-06, dead route removal

**POST-DAU TOTAL: ~92 items**

---

# FINAL TALLY

| Tier            | Count    | Timeline                            |
| --------------- | -------- | ----------------------------------- |
| ✅ Already Done | 30       | Complete                            |
| 🔴 BLOCKERS     | 14       | Before next push                    |
| 🟠 PRE-DAU      | 44       | Before April 1                      |
| ⚪ POST-DAU     | ~92      | After DAU, phased                   |
| **Total**       | **~180** | (includes ~12 new items from audit) |

---

> **EXECUTION RULE:** No item moves from POST-DAU to PRE-DAU without explicit justification.  
> **SCOPE RULE:** No new features until all BLOCKERS are resolved.

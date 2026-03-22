# 🏃 SPRINT PLAN — BLOCKERS + PRE-DAU EXECUTION

> **Generated:** 2026-03-22  
> **DAU Target:** April 1, 2026  
> **Available Days:** 10  
> **Sprint Cadence:** 2-3 days each  
> **Total Items:** 58 (14 BLOCKERS + 44 PRE-DAU)

---

# SPRINT 1 — STOP THE BLEEDING (Days 1-2)

## Focus: Silent data loss + tenant leak + broken nav

### 🎯 Expected Outcome

- Zero silent data loss vectors
- All notification routes tenant-scoped
- Worker payloads require orgId
- All nav links resolve to real pages
- Cron job method mismatch fixed

### 📁 Files to Touch

**Silent Data Loss Fixes:**
| File | Change | ID |
|------|--------|----|
| `src/lib/queue/enqueueJobSafe.ts` (or equivalent) | Wire to pg-boss OR throw error instead of no-op | NEW-C1 |
| AI queue module (in-memory Map) | Replace with pg-boss queue OR add persistence layer | NEW-C2 |
| `src/app/api/team/invitations/route.ts` | Replace `.catch(() => {})` on email send with retry + logger.error | NEW-C3 |

**Tenant Isolation:**
| File | Change | ID |
|------|--------|----|
| `src/app/api/notifications/[id]/route.ts` | Make orgId check mandatory (fail 403 if no orgId) | B-14, WP-04 |
| `src/app/api/notifications/[id]/read/route.ts` | Add orgId to WHERE clause on update | WP-05 |
| `src/worker/jobs/weather-analyze.ts` | Make orgId required in payload interface | A-04 |
| `src/worker/jobs/proposal-generate.ts` | Make orgId required in payload interface | A-05 |

**Cron Fix:**
| File | Change | ID |
|------|--------|----|
| `src/app/api/wallet/reset-monthly/route.ts` | Add `export async function GET()` handler (crons send GET) | CRON-01 |

**Nav Ghost Links:**
| File | Change | ID |
|------|--------|----|
| `src/config/nav.ts` | Remove `/ai/video-reports` from nav OR create placeholder page | NAV-FIX-1 |
| `src/app/(app)/maps/page.tsx` | CREATE — hub page linking to sub-pages | NAV-FIX-2 |
| `src/config/nav.ts` | Remove `/trades/metrics` from context nav | NAV-FIX-3 |
| `src/config/nav.ts` | Remove `/esign/on-site` from context nav OR create listing page | NAV-FIX-4 |

**Report Templates org fix:**
| File | Change | ID |
|------|--------|----|
| Report template section routes | Add orgId to PATCH/DELETE WHERE clauses | B-08 |

### ✅ Test Coverage Required

- [ ] Notification delete requires orgId → 403 without it
- [ ] Worker jobs reject payloads without orgId
- [ ] All sidebar nav links resolve (no 404s)
- [ ] Cron GET handler responds 200

### ⚠️ Rollback Risk: LOW

All changes are additive guards. Worst case: overly strict auth returns 403 on edge cases.

### 🔗 Dependencies: None — can start immediately

---

# SPRINT 2 — LOCK WRITES & AUTH (Days 3-5)

## Focus: Write protection + auth pattern + critical fire-and-forget

### 🎯 Expected Outcome

- All UPDATE/DELETE routes have orgId in WHERE
- Top 20 bare `auth()` routes migrated to `withOrgScope`
- `resolveOrg()` companyId fallback eliminated
- Critical fire-and-forget patterns replaced with error handling

### 📁 Files to Touch

**Write Protection:**
| File | Change | ID |
|------|--------|----|
| Network routes | Remove orgId→userId fallback; fail if no org | B-16 |
| `src/app/api/claims/generate-packet/route.ts` | Verify claim.orgId === session.orgId | B-17 |
| `src/app/api/approvals/claim/[id]/route.ts` | Move orgId check BEFORE claim fetch | B-18 |
| `src/app/api/claims/[claimId]/timeline/route.ts` | Add orgId to claim fetch | B-20 |
| Export routes | Add org scoping to PDF generation | B-21 |
| `src/app/api/report-templates/[id]/route.ts` | Replace `.catch(() => {})` with org check + error | WP-02 |
| Upload routes | Fix companyId-as-orgId prefix | F-08 |
| Batch: remaining UPDATE/DELETE routes | Add orgId to WHERE | WP-01 |

**Auth Pattern Migration (Top 20):**
| File | Change | ID |
|------|--------|----|
| ~20 highest-traffic routes | `auth()` → `withOrgScope` or `safeOrgContext` | AUTH-01 |
| ~15 `currentUser()`-only routes | Add org resolution | AUTH-02 |
| `src/lib/auth/tenant.ts` | Remove companyId fallback from `resolveOrg()` | AUTH-03 |
| `src/lib/auth/` | Create `requireOrgOwnership(recordId, orgId)` helper | AUTH-04 |

**Fire-and-Forget Critical Path:**
| File | Change | ID |
|------|--------|----|
| `src/app/(app)/onboarding/wizard/page.tsx` | Replace 10 `.catch(() => {})` with logger.error | O-05e |
| `src/app/api/claims/[claimId]/documents/route.ts` | Await ClaimIQ hook, handle error | O-05b |
| `src/app/api/claims/[claimId]/photos/route.ts` | Await ClaimIQ hook, handle error | O-05c |
| `src/app/api/claims/[claimId]/update/route.ts` | Await ClaimIQ hook, handle error | O-05d |
| Security backup encryption | Replace silent catch with logger.error | O-05f |

### ✅ Test Coverage Required

- [ ] Claims generate-packet rejects cross-org claims
- [ ] Export routes verify org ownership
- [ ] `resolveOrg()` throws when no org found (no fallback)
- [ ] `requireOrgOwnership()` returns 403 for wrong org

### ⚠️ Rollback Risk: MEDIUM

Auth migration could break routes if orgId resolution fails for legitimate users. Test each migration individually.

### 🔗 Dependencies: Sprint 1 complete (notification/worker fixes)

---

# SPRINT 3 — LOCK SCHEMA & PIPELINE (Days 6-8)

## Focus: Database hardening + async pipeline + transactions

### 🎯 Expected Outcome

- Critical models have orgId FK + indexes
- AI jobs use persistent queue
- Multi-write operations wrapped in $transaction
- File artifacts tracked for portal/message uploads

### 📁 Files to Touch

**Schema Hardening (SQL migrations):**
| File | Change | ID |
|------|--------|----|
| `db/migrations/20260322_schema_hardening_phase1.sql` | CREATE — FK constraints for critical models | S-06 |
| Same file | Add @@index([orgId]) to 17+ models | S-07 |
| Same file | Notification.orgId NOT NULL + backfill | S-08 |
| Same file | vendors.org_id NOT NULL + FK + index | S-10 |
| Same file | claim_timeline_events.org_id NOT NULL | S-11 |
| Same file | team_invitations FK + index | S-12 |
| Same file | activity_events.org_id type fix | S-20 |
| `prisma/schema.prisma` | Update models to match SQL changes | S-06-S-12 |

**Async Pipeline:**
| File | Change | ID |
|------|--------|----|
| AI queue module | Migrate from in-memory Map to pg-boss | A-06 |
| PDF queue | Add orgId to job data | A-07 |
| AI routes | Add per-org rate limiting | A-08 |
| `enqueueJobSafe` | Wire to pg-boss (if not done in Sprint 1) | A-11 |

**Transaction Enforcement:**
| File | Change | ID |
|------|--------|----|
| Report generation routes | Wrap DB + PDF in $transaction | TX-02a |
| Team invitation routes | Wrap invite + email in $transaction | TX-02b |
| Multi-write route audit | Identify remaining 60 routes | TX-01 |

**File Artifact Tracking:**
| File | Change | ID |
|------|--------|----|
| `src/app/api/portal/claims/[claimId]/assets/route.ts` | Create file_assets records | F-04 |
| `src/app/api/uploads/message-attachment/route.ts` | Create file_assets records | F-05 |
| `src/app/api/ai/run/route.ts` | Wire saveResult or remove dead code | F-10 |

### ✅ Test Coverage Required

- [ ] Schema migration applies cleanly on dev DB
- [ ] AI jobs persist across server restart
- [ ] Report generation is atomic (both DB + PDF or neither)
- [ ] File uploads create artifact records

### ⚠️ Rollback Risk: HIGH for schema changes

SQL migrations must be tested on dev DB clone first. Use `BEGIN; ... ROLLBACK;` for validation.

### 🔗 Dependencies: Sprint 2 complete (auth patterns stable)

---

# SPRINT 4 — PROVE IT & POLISH (Days 9-10)

## Focus: Tests + nav cleanup + critical flow verification

### 🎯 Expected Outcome

- All critical flows pass automated tests
- Nav aligned to real routes
- Core orphaned features added to nav
- DAU release gate checklist passes

### 📁 Files to Touch

**Test Coverage:**
| File | Change | ID |
|------|--------|----|
| `__tests__/portal-auth.test.ts` | CREATE — portal auth flow tests | T-06 |
| `__tests__/worker-tenant.test.ts` | CREATE — worker orgId validation tests | T-07 |
| `__tests__/report-generation.test.ts` | CREATE — report org-scoped tests | T-08 |
| `__tests__/ai-damage.test.ts` | CREATE — AI damage ownership tests | T-09 |
| `__tests__/team-management.test.ts` | CREATE — team flows tests | T-10 |

**Nav Cleanup:**
| File | Change | ID |
|------|--------|----|
| `src/config/nav.ts` | Add entries for: tasks, invoices, contracts, work-orders, clients | NAV-03 |
| `src/config/nav.ts` | Build canonical route map document | NAV-01 |
| Create `/weather` hub page | Weather entry point | DUP-09 |

**Final Verification:**
| Action | Method |
|--------|--------|
| TypeScript zero errors | `pnpm typecheck` |
| All isolation tests pass | `pnpm test:unit` |
| All critical flows work | Manual + automated |
| No ghost nav links | Automated nav check |
| DAU release gate | `/docs/execution/dau-release-gate.md` checklist |

### ✅ Test Coverage Required

- [ ] 5 new test files, 20+ test cases
- [ ] All existing tests still pass
- [ ] TypeScript = 0 errors

### ⚠️ Rollback Risk: LOW

Tests and nav changes are additive only.

### 🔗 Dependencies: Sprint 3 complete (schema + pipeline stable)

---

# SPRINT SUMMARY

| Sprint       | Days        | Items  | Focus                                                      | Risk   |
| ------------ | ----------- | ------ | ---------------------------------------------------------- | ------ |
| **Sprint 1** | 1-2         | 14     | Stop the bleeding — data loss, tenant leaks, broken nav    | LOW    |
| **Sprint 2** | 3-5         | 22     | Lock writes & auth — write protection, auth migration      | MEDIUM |
| **Sprint 3** | 6-8         | 17     | Lock schema & pipeline — DB hardening, async, transactions | HIGH   |
| **Sprint 4** | 9-10        | 14     | Prove it — tests, nav, release gate                        | LOW    |
| **Total**    | **10 days** | **67** |                                                            |        |

> **Rule:** Each sprint MUST pass `pnpm typecheck` before moving to next.  
> **Rule:** Each sprint gets its own commit + push.  
> **Rule:** No scope expansion during execution.

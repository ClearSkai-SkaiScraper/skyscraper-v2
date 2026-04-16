# MASTER TODO — RC-2: Trust & Lifecycle Validation

> The next pass is **not** building. It is a ruthless production-truth pass
> focused on roles, tenants, seats, exports, email, and logs.
>
> **Go/no-go question after this sprint:**
> _"Would I trust this with a real paying company next week?"_

**Legend:** ✅ done in this pass · 🔶 needs manual verify · ⏳ still to do

---

## Phase 0 — Pre-flight already landed

- ✅ Role normalization (`OWNER`/`owner` → admin) in [src/lib/auth/rbac.ts](src/lib/auth/rbac.ts)
- ✅ Teams page legacy-row fallback + `orgId` backfill
- ✅ Notifications bell clears all 4 sources
- ✅ Seat invite route now writes `orgId` on create + update
- ✅ Backfill migration [db/migrations/20260416_fix_owner_role_and_backfill_orgid.sql](db/migrations/20260416_fix_owner_role_and_backfill_orgid.sql)
- ✅ Regression test [src/lib/auth/**tests**/rbac.owner-mapping.test.ts](src/lib/auth/__tests__/rbac.owner-mapping.test.ts) (6 tests, all pass)
- ✅ Workspace permissions route now case-insensitive + treats OWNER as admin
- ✅ getResolvedAccountContext OWNER_NO_SETUP check uses case-insensitive admin match
- ✅ New canonical helper [src/lib/auth/roleCompare.ts](src/lib/auth/roleCompare.ts) — use everywhere going forward

---

## Phase 1 — Run & verify the prod migration

⏳ **Run:**

```bash
psql "$DATABASE_URL" -f ./db/migrations/20260416_fix_owner_role_and_backfill_orgid.sql
```

⏳ **Verify with these queries (save output as evidence):**

```sql
-- 1a. No stray "OWNER" / "owner" / mixed case anywhere
select role, count(*) from user_organizations group by role order by 2 desc;
-- Expect only: ADMIN, MANAGER, MEMBER, VIEWER

-- 1b. Zero user_organizations with NULL role
select count(*) from user_organizations where role is null;
-- Expect: 0

-- 1c. Zero trades_company_members with NULL orgId
select count(*) from trades_company_members where "orgId" is null;
-- Expect: 0

-- 1d. Every Org.ownerId has an ADMIN membership row
select o.id, o."ownerId"
from orgs o
left join user_organizations uo
  on uo."userId" = o."ownerId" and uo."organizationId" = o.id
where uo.id is null or uo.role <> 'ADMIN';
-- Expect: 0 rows

-- 1e. No orphaned tradesCompanyMember rows pointing to missing orgs
select count(*) from trades_company_members tcm
left join orgs o on o.id = tcm."orgId"
where o.id is null;
-- Expect: 0

-- 1f. Duplicate active memberships per (userId, orgId)
select "userId", "organizationId", count(*)
from user_organizations
group by 1, 2 having count(*) > 1;
-- Expect: 0 rows
```

⏳ **Spot-check three real orgs in Prisma Studio:**

- [ ] Original ClearSkai owner account → role = ADMIN, can load `/finance/overview`
- [ ] Assistant account → role = MEMBER, sees the gate
- [ ] Any re-invited member → has `orgId` set, visible in Team page

⏳ **Add constraint to prevent future drift:**

```sql
ALTER TABLE user_organizations
  ADD CONSTRAINT user_organizations_role_check
  CHECK (role IN ('ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'));
```

---

## Phase 2 — Role matrix test (manual + scripted)

⏳ Create test accounts and run this exact matrix. Record PASS/FAIL for each cell.

| Page / API                              | Unauth | Viewer | Member | Manager | Admin  | Owner (legacy) | Cross-org user |
| --------------------------------------- | :----: | :----: | :----: | :-----: | :----: | :------------: | :------------: |
| `GET /dashboard`                        |   —    |   ✓    |   ✓    |    ✓    |   ✓    |       ✓        |    own only    |
| `GET /finance/overview`                 | login  |  403   |  403   |   403   |   ✓    |       ✓        |      403       |
| `GET /api/finance/overview`             |  401   |  403   |  403   |   403   |  200   |      200       |      403       |
| `GET /teams`                            | login  |  gate  |  gate  |  gate   |   ✓    |       ✓        |   empty list   |
| `POST /api/trades/company/seats/invite` |  401   |  403   |  403   |   403   |  200   |      200       |      403       |
| `DELETE /api/trades/company/employees`  |  401   |  403   |  403   |   403   |  200   |      200       |      403       |
| `GET /claims` list                      | login  | scope  | scope  |  scope  |  all   |      all       |   empty list   |
| `GET /api/claims/[id]/workspace`        |  401   | role=v | role=m | role=m  | role=a |     role=a     |      403       |
| Bell `POST /api/notifications/mark-all` |  401   |  200   |  200   |   200   |  200   |      200       |  other org=0   |
| `GET /api/reports/[id]/pdf`             |  401   | scope  | scope  |  scope  |  200   |      200       |      403       |
| `POST /api/billing/*`                   |  401   |  403   |  403   |   403   |  200   |      200       |      403       |
| `GET /portal/claims/[id]`               |   —    |   —    |   —    |    —    |   —    |       —        |  client only   |

⏳ **Build this into a Playwright smoke suite** at `tests/e2e/rbac-matrix.spec.ts`. Fail the build if any cell regresses.

⏳ **API-level unit audit** — search for every route that checks role, make sure they all go through `withAuth({ roles: [...] })` or `requireRole()`. Produce an audit file `docs/RBAC_AUDIT.md` listing every route and its guard.

Search commands to run:

```bash
# Routes that take role-mutating actions without role guard
rg "export const (POST|PUT|PATCH|DELETE)\s*=\s*withAuth\(" src/app/api --no-heading | \
  rg -v "roles:|withAdmin|withManager"
```

---

## Phase 3 — Tenant isolation attack pass

⏳ **Script this in `scripts/audit-tenant-isolation.ts`** — pick 5 high-risk routes and for each, attempt a cross-org request with a known-good cookie. Expected: 403 / empty / scoped result. Log any leaks.

### Specific attacks to try

- [ ] Guess a claim ID from another org → hit `GET /api/claims/[id]` → expect 404
- [ ] Hit `GET /api/reports/[id]/pdf` for another org's report ID → 403
- [ ] Hit `GET /api/trades/job-board/[jobId]` for another org's private job → 404 (only public fields should ever leak)
- [ ] Hit `GET /api/files/[fileId]` and signed-URL routes with another org's file ID → 403
- [ ] Hit `GET /api/trades/company/employees?companyId=<other>` → must ignore the param and use session's companyId
- [ ] Try notification mark-read with another user's `notificationId` → 403 or no-op (never cross-clears)
- [ ] Message thread fetch with guessed threadId → 403 unless participant
- [ ] Export CSV endpoints → ensure `WHERE orgId = :session.orgId` always present
- [ ] Org-settings GET → no other-org data ever returned
- [ ] `user_organizations.findMany()` — any query missing `where.userId = session.userId`?

### Code audit signals to hunt for

```bash
# findFirst / findUnique without orgId in where clause
rg "prisma\.(claims|reports|jobs|invoices|messages|files|clients)\.(findFirst|findUnique)\(" src \
  -A 3 | rg -v "orgId"

# Raw SQL without $ placeholder for orgId
rg "\\\$queryRaw.*FROM (claims|reports|jobs)" src | rg -v "org_id|orgId"
```

Any hit without scope = bug.

---

## Phase 4 — Seat & billing lifecycle pass

Run the full sequence on a **test org** and record outcomes.

1. [ ] Set seat limit to 2. Owner counts as seat 1.
2. [ ] Invite member A → `seatsUsed` = 2, `seats_available = 0`.
3. [ ] Attempt to invite member B → **must be blocked** with clear "no seats" error (not a 500).
4. [ ] Accept A's invite → `tradesCompanyMember.status = active`, `userId` replaced.
5. [ ] Remove A → `seatsUsed` = 1 again. Verify in both `orgs.seats_used` and actual row count.
6. [ ] Re-invite A's email → accepted again, no duplicate rows, no email bounce.
7. [ ] Simulate Stripe `invoice.payment_failed` → `orgs.subscription_status = 'past_due'`, dunning banner visible, paid features (AI, reports export) blocked.
8. [ ] Simulate `invoice.payment_succeeded` recovery → status back to `active`, banner gone.
9. [ ] Simulate seat increase via Stripe portal → `seatsLimit` syncs, new invites allowed.
10. [ ] Simulate seat decrease below current usage → **must reject** or queue removal, not silently break.
11. [ ] Cancel subscription → org downgrades to free plan, no data destroyed.
12. [ ] Owner changes email in Clerk → `user_organizations.userId` still correct (Clerk ID unchanged).
13. [ ] Pending invite older than 7 days → auto-expired, seat released.

⏳ **Key SQL checks:**

```sql
-- Ghost seats: pending invites counting against limit that shouldn't
select o.id, o.name, o.seats_limit, o.seats_used,
       (select count(*) from trades_company_members tcm
         where tcm."companyId" = (select id from trades_companies where "orgId" = o.id)
           and tcm."isActive" = true) as actual_active
from orgs o
where o.seats_used <> (select count(*) from ...);
```

---

## Phase 5 — Reports / exports integrity pass

For each of: PDF report, CSV export, Financial Overview download, Claim full export:

- [ ] Correct org branding (logo + name)
- [ ] Correct client name + address (or redacted for public share)
- [ ] Correct totals — cross-check against DB sum
- [ ] Date range honors filter, no leakage outside
- [ ] Cross-org ID → 403 not "empty file"
- [ ] Empty state → valid PDF/CSV (not crash or 500)
- [ ] No lowercase/uppercase enum mismatch in labels
- [ ] No orphan fields (`jobsPosted` etc removed metrics)
- [ ] Signed URLs expire
- [ ] Client portal sees only their claim's report, nothing sibling

⏳ **Automate it:** `scripts/audit-export-truth.ts` that runs 1 export per format per test org, checksums, and diffs against golden file.

---

## Phase 6 — Team / invite visibility chain

- [ ] Fresh invite → appears in Team page **within 1s** of POST
- [ ] Removed → gone from Team page, seat count updates
- [ ] Re-invite same email → single row flips to pending, **new token**, new email sent
- [ ] Old broken member (pre-migration) → now visible after backfill
- [ ] Role badge displays correctly (Owner, Admin, Manager, Member)
- [ ] `managerId` wiring: assign a manager → that manager sees the direct report's jobs/claims
- [ ] Notification sent to owner when invite accepted
- [ ] No duplicate rows for (companyId, email) after any sequence
- [ ] `orgId` persists in both update and create paths (verify with DB query)

---

## Phase 7 — Resend email truth test

- [ ] Confirm `RESEND_FROM_EMAIL` matches a domain whose status = **Verified** in Resend dashboard
- [ ] Send test invite to a Gmail, Outlook, Yahoo, Proton, and custom domain account
- [ ] All 5 arrive within 60s, none in spam
- [ ] SPF / DKIM / DMARC set on sending domain (DNS check)
- [ ] `resend.emails.send()` returns an ID; store it on the `tradesCompanyMember` row for traceability
- [ ] Add `x-resend-idempotency-key` header to prevent double-sends
- [ ] UI toasts `emailSent:false` with the actual error, not a generic "Invite sent"
- [ ] Failed deliveries appear in an `email_events` audit table
- [ ] Resend webhook → update `tradesCompanyMember.emailStatus` (`delivered | bounced | complained`)
- [ ] Rate-limit: max 10 invites per owner per minute (server-side)

---

## Phase 8 — Post-deploy production log watch

After deploy, tail Vercel / Sentry logs for 2 hours. Look for spikes in:

- [ ] 401 rate
- [ ] 403 rate (esp. `/api/finance/overview`, `/api/trades/company/*`)
- [ ] 500 rate (investigate every single one)
- [ ] "RBAC failed to get current user role" warnings
- [ ] "Prisma P2025 Record not found" (often cross-tenant attempts)
- [ ] "No org membership" warnings
- [ ] Rate limit 429s
- [ ] Resend API failures
- [ ] Stripe webhook signature failures
- [ ] Any uncaught promise rejection

⏳ **Add Sentry alerts** for:

- 500 rate > 1% over 5 minutes
- 403 rate > 10% over 5 minutes (indicates broken guard)
- Any `[RBAC] Failed to get current user role` in the last hour
- Any `Webhook signature verification failed`

---

## Phase 9 — Legacy casing cleanup (prevent relapse)

Known remaining casing hotspots to migrate to `roleCompare.ts`:

- [ ] [src/app/api/team/invitations/route.ts#L111](src/app/api/team/invitations/route.ts#L111) — uses `role === "admin" || role === "org:admin"`
- [ ] [src/app/api/team/invitations/[id]/resend/route.ts#L64](src/app/api/team/invitations/%5Bid%5D/resend/route.ts#L64)
- [ ] [src/app/api/team/member/[memberId]/route.ts#L116](src/app/api/team/member/%5BmemberId%5D/route.ts#L116) and L185
- [ ] [src/lib/auth/managerScope.ts](src/lib/auth/managerScope.ts) — has 2 parallel branches with different casing
- [ ] [src/lib/permissions/legacy.ts](src/lib/permissions/legacy.ts) — retire entirely (already marked `legacy`)
- [ ] [src/lib/rbac.ts](src/lib/rbac.ts) — System A, marked `@deprecated` but still imported by `RoleBadge`
- [ ] ESLint rule: ban raw `=== "ADMIN"` style comparisons. Custom rule `no-raw-role-compare` that forces `isAdminRole()` usage.

---

## Phase 10 — Documentation & handoff

- [ ] Write `docs/RBAC.md` — single source of truth for roles, permissions, the OWNER→admin mapping rule
- [ ] Write `docs/TENANT_ISOLATION.md` — enumerate every prisma model and which column provides org scope
- [ ] Write `docs/LAUNCH_CHECKLIST.md` that references this file + acceptance criteria
- [ ] Update [.github/copilot-instructions.md](.github/copilot-instructions.md):
  - "Never compare roles with `===`. Use `roleEquals` / `isAdminRole` from [src/lib/auth/roleCompare.ts](src/lib/auth/roleCompare.ts)."
  - "Every new query on tenant-scoped models must include `orgId` in the where clause."
- [ ] Record a 10-min Loom walking through RC-2 results with real data

---

## Acceptance criteria for "launchable"

| Gate             | Pass condition                                            |
| ---------------- | --------------------------------------------------------- |
| Migration        | All 6 verification SQL queries return expected results    |
| Role matrix      | Every cell in Phase 2 table is PASS                       |
| Tenant isolation | 0 leaks in Phase 3 attack pass                            |
| Seats/billing    | All 13 lifecycle steps pass without state drift           |
| Exports          | Golden-file diff is clean; 0 cross-org leakage            |
| Email            | 5/5 test deliveries succeed, bounce webhook wired         |
| Logs             | 0 `[RBAC] failed` entries; 500 rate < 0.1%                |
| Tests            | `pnpm test:unit` + new rbac-matrix Playwright suite green |

**Only after every gate is PASS → ship to pilot DAUs.**

---

## Not in scope for RC-2 (do NOT pursue)

- New features
- Visual polish, theme tweaks
- Secondary integrations (CRMs, DocuSign, etc.)
- Marketing page updates
- New AI tools
- Dashboard "niceties"

Distractions kill launches. Park every non-RC-2 ticket behind a label.

---

## One-line summary for the team

> **RC-2 is a ruthless production-truth pass across roles, tenants, seats, exports, email, and logs — not more building. Ship to real DAUs only after every gate in this file is green.**

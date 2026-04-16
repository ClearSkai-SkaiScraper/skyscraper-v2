# MASTER TODO — Admin Access, Company Seats, Invites, Notifications, Remote Viewer

**Status legend:** ✅ Fixed in this pass · 🔶 Needs verify/test · ⏳ Still TODO

---

## 1. Financial Overview "Admin Access Required" on the owner account ✅

**Root cause (found):** `getCurrentUserRole()` in [src/lib/auth/rbac.ts](src/lib/auth/rbac.ts#L213-L254) mapped `user_organizations.role` using strict string equality against `"ADMIN" | "MANAGER" | "MEMBER" | "VIEWER"` only. `"OWNER"` (what the original org creator gets) fell through to the `else` branch and was silently set to `"member"`. That caused `<RBACGuard minimumRole="admin">` on [src/app/(app)/finance/overview/page.tsx](<src/app/(app)/finance/overview/page.tsx#L210>) to render the amber "Admin Access Required" card for the account owner.

**Same bug also in:** [src/app/(app)/teams/page.tsx](<src/app/(app)/teams/page.tsx#L43>) where `isAdmin` check only compared against `"owner" | "admin" | "ADMIN"` — not `"OWNER"`.

**Fixed:**

- ✅ `getCurrentUserRole()` now normalizes case-insensitively and treats `OWNER` and `ADMIN` both as `admin`.
- ✅ Added fallback: if `user_organizations.role` is null/unknown, look up `users.role` (legacy column) before demoting to `member`.
- ✅ Teams page `isAdmin` check now lowercases `orgCtx.role` first.

**🔶 Verify:**

- [ ] Log in as the ClearSkai owner account → load `/finance/overview` → confirm data renders (not the amber gate).
- [ ] Log in as the test/assistant account (invited member) → confirm they still see the gate.
- [ ] Check `SELECT role FROM user_organizations WHERE "userId" = '<clerk-id>'` in prod DB to ensure values are sane.

**⏳ Backfill:**

- [ ] Write one-time migration/script: `UPDATE user_organizations SET role = 'ADMIN' WHERE role ILIKE 'owner' OR role IS NULL AND <owner criteria>` — run once against prod.
- [ ] Add DB CHECK constraint or enum to `user_organizations.role` so future writes can only be `ADMIN|MANAGER|MEMBER|VIEWER`.

---

## 2. Company Seats page empty (invited/attached users not shown) ✅ partial

**Root cause (found):** [src/app/(app)/teams/page.tsx](<src/app/(app)/teams/page.tsx#L79>) queried `tradesCompanyMember.findFirst({ where: { userId, orgId } })` for the **viewer** (the owner). If the owner's legacy `tradesCompanyMember` row was created before `orgId` was added to that table, `orgId` is `NULL`, the lookup returns null, and `companyId` is never resolved — so the team list comes back empty even though rows exist.

**Fixed:**

- ✅ Teams page now falls back to `findFirst({ where: { userId } })` when the orgId-scoped lookup misses, **and** backfills the missing `orgId` on the legacy row so subsequent queries are properly scoped.

**⏳ Still TODO:**

- [ ] Run a backfill script against prod: `UPDATE trades_company_members SET "orgId" = <derived> WHERE "orgId" IS NULL AND "userId" IN (SELECT "userId" FROM user_organizations)`.
- [ ] Confirm the **invite POST** path at [src/app/api/trades/company/seats/invite/route.ts](src/app/api/trades/company/seats/invite/route.ts#L79-L116) sets `orgId` on newly-created pending members (currently it does NOT — add `orgId` to the create payload).
- [ ] The `CompanySeatsClient` component fetches nothing on its own — verify SSR `members` prop is correctly received post-fix.

---

## 3. Invite flow (Resend emails don't re-send after remove) 🔶

**Symptoms reported:** After attaching a user then removing them, re-inviting doesn't trigger Resend to send the email again.

**Findings:**

- `DELETE /api/trades/company/employees` does a **soft delete** — sets `isActive:false, status:"removed"` ([src/app/api/trades/company/employees/route.ts](src/app/api/trades/company/employees/route.ts#L187-L192)).
- `POST /api/trades/company/seats/invite` handles re-invite for status `pending | removed | inactive` — updates the row and sends email ([src/app/api/trades/company/seats/invite/route.ts](src/app/api/trades/company/seats/invite/route.ts#L73-L96)). **This branch looks correct.**
- The Resend `try/catch` swallows errors and reports `emailSent:false, emailError` in the JSON response — the UI probably isn't surfacing that, so it looks like "nothing happened".
- The invite POST does NOT include `orgId` in the `tradesCompanyMember.update` / `create` payload — this causes problem #2 to perpetuate for every new invite.

**⏳ TODO:**

- [ ] Surface `emailSent:false` / `emailError` in `CompanySeatsClient` UI — toast the error, don't just say "Invitation sent".
- [ ] Verify `RESEND_FROM_EMAIL` env var is set on the Vercel prod deployment and the `from` domain is verified in Resend dashboard.
- [ ] Verify `RESEND_API_KEY` is not rate-limited / in test mode (test mode only delivers to verified addresses).
- [ ] Add `orgId: membership.orgId` (or resolved orgId) to **both** branches of the invite POST.
- [ ] Add `await resend.emails.send(...)` inside a dedicated try with full error logging + Sentry breadcrumb.
- [ ] Add audit row to `team_invitations` table on every send (success + failure) for traceability.
- [ ] Re-send flow: when DELETE invite + re-POST same email rapidly, ensure the old `pendingCompanyToken` is rotated (it currently is ✅).
- [ ] Resend's `idempotency-key` header — add one keyed on `${companyId}:${email}:${token}` so double-submits don't get deduped silently.

---

## 4. Notifications bell doesn't actually clear ✅

**Root cause (found):** `markAllNotificationsRead()` in [src/lib/notifications/notificationHelper.ts](src/lib/notifications/notificationHelper.ts) only updated `projectNotification.read`. But the GET endpoint at [src/app/api/notifications/route.ts](src/app/api/notifications/route.ts) aggregates from **four** sources:

1. raw `notifications` table + `notifications_reads` join
2. `projectNotification` (was cleared)
3. `tradeNotification`
4. unread `message` rows

Only #2 was getting cleared, so the red badge never went to 0.

**Fixed:**

- ✅ `markAllNotificationsRead(orgId, userId)` now clears all four sources atomically and returns the total count.
- ✅ `/api/notifications/mark-all-read` route passes `userId` through.

**🔶 Verify:**

- [ ] Hit the bell → "Mark all read" → refresh → badge should be 0 and stay 0.
- [ ] Test with a mix: trigger a project notif + a trade notif + a client message → clear all → all must disappear.

---

## 5. Admin Remote Viewer (and manager → employee view) 🔶

**Current state (found):**

- Route exists: [src/app/api/remote-view/team/route.ts](src/app/api/remote-view/team/route.ts) — returns team members the caller can view (admin sees all, manager sees direct reports).
- Start session route: [src/app/api/remote-view/start/route.ts](src/app/api/remote-view/start/route.ts).
- Permission helper: [src/lib/permissions/remoteView.ts](src/lib/permissions/remoteView.ts).
- UI selector component: [src/components/remote-view/RemoteViewSelector.tsx](src/components/remote-view/RemoteViewSelector.tsx).

**⏳ TODO — needs end-to-end verification:**

- [ ] Wire `<RemoteViewSelector />` into the owner's Topbar / profile menu (confirmed not yet rendered in the topbar — only on settings pages).
- [ ] Manager-scoped `managerScope.ts` — confirm [src/lib/auth/managerScope.ts](src/lib/auth/managerScope.ts#L58-L60) is actually called by the employee-detail pages when the viewer is a manager (grep usages).
- [ ] Add e2e test: owner opens remote viewer → picks member → lands on that member's dashboard with a "Viewing as Jane Doe — [Exit]" banner.
- [ ] Add audit log entry to `auditLog` table every time a remote-view session starts/ends.
- [ ] Confirm the member's **read-only** mode is enforced: no write API should accept an X-Remote-View-Session header without downgrading role to `viewer`.

---

## 6. Hardening / follow-ups (do not skip)

- [ ] Add a Vitest covering `getCurrentUserRole()` with fixture rows: `role='OWNER'`, `role='owner'`, `role=null`, `role='ADMIN'`, missing `user_organizations`, legacy `users.role='OWNER'`. All must resolve to `admin` except the null+no-legacy case which should resolve to `member`.
- [ ] Delete or finish migrating the deprecated [src/lib/rbac.ts](src/lib/rbac.ts) (System A) — it still defines an incompatible `Role` enum using uppercase and is imported by `RoleBadge` & `/api/rbac/me`. The partial migration is the root cause of half of these casing bugs.
- [ ] Add a one-paragraph section to [.github/copilot-instructions.md](.github/copilot-instructions.md) documenting: "System B roles are lowercase. Never compare to `ADMIN`/`OWNER` without lowercasing first."
- [ ] Add `docs/RBAC.md` with the canonical role matrix + the OWNER→admin mapping rule.
- [ ] Add Sentry alert on any `[RBAC] Failed to get current user role` log in prod.

---

## Files changed in this pass

| File                                                                                                 | Change                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [src/lib/auth/rbac.ts](src/lib/auth/rbac.ts)                                                         | OWNER→admin mapping + `users.role` fallback                                     |
| [src/app/(app)/teams/page.tsx](<src/app/(app)/teams/page.tsx>)                                       | Lowercase role compare + legacy `tradesCompanyMember` fallback + orgId backfill |
| [src/lib/notifications/notificationHelper.ts](src/lib/notifications/notificationHelper.ts)           | `markAllNotificationsRead` now clears all 4 sources                             |
| [src/app/api/notifications/mark-all-read/route.ts](src/app/api/notifications/mark-all-read/route.ts) | Pass `userId` to helper                                                         |

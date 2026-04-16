# Tenant Isolation — Canonical Reference

## Rule

**Every query against a tenant-scoped model MUST include `orgId` (or an equivalent scope column) in the `where` clause.** No exceptions.

This is enforced by:

- Code review (grep-gates in CI — see below)
- Runtime tests ([tests/e2e/rbac-matrix.spec.ts](../tests/e2e/rbac-matrix.spec.ts))
- Manual attack pass in RC-2 Phase 3

## Org resolution

Never trust Clerk `orgId` blindly. Always go through one of:

- **API routes:** `withAuth` / `requireAuth` — `orgId` comes from `user_organizations` (DB), not Clerk session.
- **Server components:** `safeOrgContext()` → returns `{ orgId, userId, role }` or a typed error state.
- **Pages:** `resolveOrgSafe()` for read-only flows.

## Model → scope column map

| Model                                  | Scope column(s)                                        | Notes                               |
| -------------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| `claim`                                | `orgId`                                                | Always required                     |
| `report`                               | `orgId`                                                | + `claim.orgId` for nested          |
| `job`                                  | `orgId`                                                | + `isPublic` gating for job-board   |
| `tradesCompanyMember`                  | `orgId` + `companyId`                                  | Both required for list queries      |
| `tradesCompany`                        | `orgId`                                                | 1:1 with org                        |
| `invoice`                              | `orgId`                                                |                                     |
| `estimate`                             | `orgId`                                                |                                     |
| `supplement`                           | `orgId`                                                |                                     |
| `message`                              | `threadId` → `messageThread.orgId` + participant check |                                     |
| `messageThread`                        | `orgId` OR `participants.has(userId)`                  |                                     |
| `client`                               | `orgId`                                                |                                     |
| `file`                                 | `orgId`                                                | Signed-URL generation must re-check |
| `notification` (`projectNotification`) | `orgId` + `read`                                       |                                     |
| `tradeNotification`                    | `recipientId` in [userId, orgId, companyId]            |                                     |
| `user_organizations`                   | `userId`                                               | Server-authoritative membership     |
| `org`                                  | `id = :session.orgId`                                  | Read by owner only for settings     |
| `org_branding`                         | `orgId`                                                |                                     |
| `tokens_ledger`                        | `orgId`                                                |                                     |
| `auditLog`                             | `orgId`                                                | Admin-only read                     |

## Forbidden patterns (CI-grep these)

```bash
# findFirst / findUnique on tenant models without orgId
rg "prisma\.(claim|report|job|invoice|estimate|supplement|file|client)\.(findFirst|findUnique|findMany|update|delete|deleteMany|updateMany)\(" src/app/api \
  -A 5 | rg -B 1 -A 5 "where:" | rg -v "orgId"

# Raw SQL on tenant tables without org_id parameter binding
rg "\\\$queryRaw.*(FROM|UPDATE|DELETE FROM)\\s+(claims|reports|jobs|invoices)" src
```

Any match without an `orgId` clause is a tenant-isolation bug.

## Cross-org attack surface (RC-2 Phase 3 targets)

1. **URL-param ID substitution** — all `/api/*/[id]` routes
2. **Public job-board detail endpoints** — public summary OK; full detail MUST re-check ownership
3. **Signed file URLs** — confirm signature regenerates server-side on every fetch, not cached
4. **Export/report downloads** — filter by `orgId` in both the list endpoint AND the detail/download endpoint
5. **Notification mark-as-read** — never accept other users' notificationIds
6. **Team/member endpoints** — never accept `companyId` / `orgId` as a client parameter; always read from session

## Client portal carve-out

The client portal ([src/app/portal/\*](../src/app/portal)) is authenticated separately (`clientId`, not Clerk `userId`). It has its own scope rule:

**Every portal query MUST filter by `clientId = session.clientId`.** Never trust `clientId` from the URL.

## Testing

- [tests/e2e/rbac-matrix.spec.ts](../tests/e2e/rbac-matrix.spec.ts) — Playwright cross-org attacks
- [scripts/audit-tenant-isolation.ts](../scripts/audit-tenant-isolation.ts) — automated probe of high-risk routes
- Manual checklist in [MASTER_RC2_TRUST_LIFECYCLE_TODO.md](../MASTER_RC2_TRUST_LIFECYCLE_TODO.md) Phase 3

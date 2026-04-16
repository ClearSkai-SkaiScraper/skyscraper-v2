# RBAC — Canonical Reference

## Single source of truth

**All role comparisons MUST go through [src/lib/auth/roleCompare.ts](../src/lib/auth/roleCompare.ts).**

Never compare roles with raw `===`. Never assume casing.

```ts
import { isAdminRole, isManagerOrAbove, roleEquals, roleIn } from "@/lib/auth/roleCompare";

if (isAdminRole(user.role)) {
  /* owner OR admin */
}
if (isManagerOrAbove(user.role)) {
  /* owner, admin, OR manager */
}
if (roleEquals(user.role, "viewer")) {
  /* case-insensitive match */
}
if (roleIn(user.role, ["admin", "manager"])) {
  /* membership test */
}
```

## Canonical roles (System B, lowercase)

| Role      | Level | Scope                                                                   |
| --------- | ----- | ----------------------------------------------------------------------- |
| `admin`   | 4     | Everything in the org (incl. billing, team mgmt, org settings)          |
| `manager` | 3     | Create/edit claims, vendors, products, reports; view team; view billing |
| `member`  | 2     | Create/edit own claims; view team; view reports                         |
| `viewer`  | 1     | Read-only                                                               |

## Legacy mapping

The DB still contains uppercase legacy values. They MUST be mapped on read:

| Raw DB value                           | Canonical role      |
| -------------------------------------- | ------------------- |
| `OWNER`, `owner`                       | `admin`             |
| `ADMIN`, `Admin`                       | `admin`             |
| `MANAGER`, `PM`                        | `manager`           |
| `MEMBER`, `FIELD_TECH`, `OFFICE_STAFF` | `member`            |
| `VIEWER`, `CLIENT`                     | `viewer`            |
| `null` / unknown                       | `member` (fallback) |

`getCurrentUserRole()` in [src/lib/auth/rbac.ts](../src/lib/auth/rbac.ts) performs this normalization. **Do not replicate this logic anywhere else.**

## API route enforcement

Preferred (declarative):

```ts
import { withAdmin, withManager, withAuth } from "@/lib/auth/withAuth";

export const DELETE = withAdmin(async (req, { orgId, userId }) => { ... });
export const POST   = withManager(async (req, { orgId, userId }) => { ... });
export const GET    = withAuth(async (req, { orgId, userId, role }) => { ... });

// With explicit role gate
export const PATCH = withAuth(handler, { roles: ["ADMIN", "MANAGER"] });
```

Imperative (server components / pages):

```ts
import { requireRole, checkRole, requirePermission } from "@/lib/auth/rbac";

await requireRole("admin"); // throws 403
const { hasAccess, role } = await checkRole("manager");
await requirePermission("claims:delete");
```

## Permission matrix

See `ROLE_PERMISSIONS` in [src/lib/auth/rbac.ts](../src/lib/auth/rbac.ts).

## Client-side

```tsx
import { RBACGuard } from "@/components/rbac/RBACGuard";

<RBACGuard minimumRole="admin" fallback={<AccessDenied />}>
  <AdminButton />
</RBACGuard>

<RBACGuard permission="claims:delete">
  <DeleteButton />
</RBACGuard>
```

The `useRBAC()` hook reads from `GET /api/rbac/me` which is the only authoritative client-side role source.

## Platform owner override

If `process.env.PLATFORM_OWNER_EMAIL` matches the authenticated user's email, that user is granted `admin` role in every org they belong to. Used for internal support/debugging. Never hardcode.

## Common pitfalls

- ❌ `if (user.role === "ADMIN")` → use `isAdminRole(user.role)`
- ❌ Checking Clerk org role directly → always read from `user_organizations.role` via `getCurrentUserRole()`
- ❌ Granting admin on DB error → **never**. Return null / 401 / 403.
- ❌ Trusting client-provided role → always resolve server-side
- ❌ Bypassing `withAuth` in a route → every API route must wrap with `withAuth` / `requireAuth`

## Regression tests

[src/lib/auth/**tests**/rbac.owner-mapping.test.ts](../src/lib/auth/__tests__/rbac.owner-mapping.test.ts) — locks in the OWNER/owner/Admin case handling. **Do not delete or weaken.**

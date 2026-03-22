# Read Path Tenant Isolation Audit

## Critical Cross-Tenant Read Leaks 🔴

| #   | Severity | Route                                         | Query Pattern                                   | Issue                                                               |
| --- | -------- | --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| 1   | 🔴 P0    | `/api/claims/ai/build`                        | `findUnique({ where: { id } })`                 | Any authed user can access any claim — no orgId check               |
| 2   | 🔴 P0    | `/api/portal/generate-access`                 | `body.clientId` used directly                   | Generates tokens for any client — no org ownership verification     |
| 3   | 🔴 P0    | `/api/weather/events`                         | `findMany()` with no orgId/userId filter        | Returns global weather events across ALL tenants                    |
| 4   | 🔴 P0    | `/api/reports/[reportId]/ai/[sectionKey]`     | `findUnique({ where: { id } })`                 | Report AI sections accessed by ID — no org check                    |
| 5   | 🟠 P1    | `/api/templates/[templateId]/generate-assets` | `findUnique({ where: { id } })`                 | Template PDFs from any org accessible (admin auth but no org scope) |
| 6   | 🟠 P1    | `/api/templates/[templateId]/validate`        | `findUnique({ where: { id } })`                 | Template validation for any org's template                          |
| 7   | 🟠 P1    | `/api/network/[id]`                           | `findUnique({ where: { id } })`                 | Network record accessed without org check                           |
| 8   | 🟠 P1    | `/api/weather/reports`                        | `findMany({ where: { createdById } })`          | Scoped by userId, not orgId — user sees cross-org reports           |
| 9   | 🟠 P1    | `/api/weather/analytics`                      | Same user-scoped pattern                        | Weather analytics not org-scoped                                    |
| 10  | 🟠 P1    | `/api/approvals/claim/[id]`                   | Fetches claim by ID, THEN checks orgId          | Timing side-channel: reveals claim existence                        |
| 11  | 🟡 P2    | `/api/claims/[claimId]/notes`                 | Claim validated, but timeline query lacks orgId | Low risk (already validated claim) but breaks defense-in-depth      |
| 12  | 🟡 P2    | `/api/claims/[claimId]/timeline`              | Full claim fetch without orgId                  | Already validated via safeOrgContext but inconsistent               |

---

## Direct ID Lookup Risks

### Pattern: `findUnique({ where: { id } })` without orgId

These routes look up records by primary key only, without verifying the record belongs to the caller's org:

| Route                                         | Model     | Consequence                                         |
| --------------------------------------------- | --------- | --------------------------------------------------- |
| `/api/claims/ai/build`                        | `claims`  | Full claim data exposed cross-tenant                |
| `/api/templates/[templateId]/generate-assets` | Templates | Template content leaked                             |
| `/api/templates/[templateId]/validate`        | Templates | Template structure leaked                           |
| `/api/reports/[reportId]/ai/[sectionKey]`     | `reports` | Report content leaked                               |
| `/api/approvals/claim/[id]`                   | `claims`  | Claim existence revealed (checks orgId after fetch) |
| `/api/network/[id]`                           | Network   | Network data leaked                                 |

### Secure Pattern (for comparison)

Routes using `withOrgScope` or `safeOrgContext` properly:

- `/api/claims/[claimId]` — Uses `withOrgScope`, queries `{ where: { id, orgId } }` ✅
- `/api/contacts/[contactId]` — Uses `withOrgScope` ✅
- `/api/damage/[id]` — Uses `withOrgScope` ✅

---

## Download/Access Bypass Risks

| Risk  | Route                                       | Issue                                                                                                          |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 🟠 P1 | `/api/claims/generate-packet`               | Uses `currentUser()`, generates packet from `body` claim data — never verifies the claim belongs to user's org |
| 🟠 P1 | `/api/export/complete-packet`               | Uses bare `auth()`, resolves orgId via raw SQL — reasonably safe but inconsistent pattern                      |
| ✅    | `/api/portal/claims/[claimId]/assets` (GET) | Uses portal auth — properly scoped                                                                             |
| ✅    | `/api/claims/[claimId]/files/[fileId]`      | org-scoped via safeOrgContext                                                                                  |

---

## Supabase Public URL Risk 🔴

**ALL files uploaded to Supabase public buckets are accessible without authentication.**

Any person with the URL can download claim photos, documents, evidence files, and generated reports. This is the single largest tenant isolation gap in the platform.

Affected buckets: `claim-photos`, `documents`, `evidence`, `avatars`, `company-docs`, `generated-reports`

---

## Top 15 Read Path Issues (Ranked)

| #   | Severity | Issue                                                                         |
| --- | -------- | ----------------------------------------------------------------------------- |
| 1   | 🔴 P0    | `/api/claims/ai/build` — cross-tenant claim access                            |
| 2   | 🔴 P0    | `/api/portal/generate-access` — token generation for any client               |
| 3   | 🔴 P0    | `/api/weather/events` — global data leak, no tenant filter                    |
| 4   | 🔴 P0    | `/api/reports/[reportId]/ai/[sectionKey]` — report sections without org check |
| 5   | 🔴 P0    | Public Supabase URLs — all uploaded files accessible without auth             |
| 6   | 🟠 P1    | `/api/templates/[templateId]/generate-assets` — cross-org template access     |
| 7   | 🟠 P1    | `/api/templates/[templateId]/validate` — cross-org template validation        |
| 8   | 🟠 P1    | `/api/network/[id]` — network data without org check                          |
| 9   | 🟠 P1    | `/api/claims/generate-packet` — packet from unverified body data              |
| 10  | 🟠 P1    | Weather reports scoped by userId not orgId                                    |
| 11  | 🟠 P1    | Weather analytics scoped by userId not orgId                                  |
| 12  | 🟠 P1    | `/api/approvals/claim/[id]` — timing side-channel                             |
| 13  | 🟡 P2    | Claims notes timeline query lacks orgId                                       |
| 14  | 🟡 P2    | 80+ routes using bare `auth()` without DB org verification                    |
| 15  | 🟡 P2    | Portal community posts accessible cross-tenant                                |

---

## Recommendation: Universal Read-Path Pattern

```typescript
// EVERY read query on tenant-scoped models MUST include orgId
export const GET = withOrgScope(async (req, { orgId }) => {
  // ALWAYS include orgId in WHERE clause
  const claims = await prisma.claims.findMany({
    where: { orgId, status: "active" },
  });
  return NextResponse.json(claims);
});

// For sub-resource lookups, verify org ownership BEFORE any data access
const claim = await prisma.claims.findFirst({
  where: { id: claimId, orgId }, // BOTH id AND orgId
});
if (!claim) return apiError(404, "NOT_FOUND", "Claim not found");
```

**Rule: Never use `findUnique({ where: { id } })` on tenant-scoped models without also verifying orgId.**

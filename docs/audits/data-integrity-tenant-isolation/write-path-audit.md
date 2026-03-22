# Write Path Safety Audit

## Auth Pattern Distribution

| Pattern                            | Count       | Org Resolution                          | Safety      |
| ---------------------------------- | ----------- | --------------------------------------- | ----------- |
| `withOrgScope()` (Tier 1)          | ~20 routes  | ✅ DB-verified orgId                    | 🟢 Safest   |
| `requireAuth()` (Tier 2)           | ~25 routes  | ✅ DB-verified orgId                    | 🟢 Safe     |
| `safeOrgContext()`                 | ~40 routes  | ✅ DB-verified orgId                    | 🟢 Safe     |
| Direct `auth()` from Clerk         | ~80+ routes | ⚠️ Clerk orgId only, no DB verification | 🟡 Partial  |
| `currentUser()` only               | ~15 routes  | ❌ No org resolution                    | 🔴 Unsafe   |
| `requireRole()` / `requireAdmin()` | ~10 routes  | ✅ Role-checked                         | 🟢 Safe     |
| **No auth at all**                 | ~10+ routes | ❌ None                                 | 🔴 Critical |

**Key finding:** ~80+ routes use direct Clerk `auth()` which returns the Clerk-side orgId but does NOT verify it against the DB `user_organizations` table. If Clerk and the DB are out of sync, these routes operate with incorrect tenant context.

---

## Client-Supplied OrgId Risks 🔴

### CRITICAL: Routes That Trust `body.orgId`

| Route                                 | Pattern                                                                                  | Risk                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`/api/contractor/profile`** (POST)  | `body.orgId` used directly in `prisma.contractor_profiles.create({ orgId: body.orgId })` | 🔴 **CRITICAL** — Any authenticated user can write to any org's contractor profile |
| **`/api/contractor/profile`** (PATCH) | `body.orgId` used in `findFirst({ where: { orgId: body.orgId } })` then update           | 🔴 **CRITICAL** — Can read and update any org's profile                            |
| **`/api/pdf/create`**                 | `body.orgId` passed to PDF generation and branding lookup                                | 🟠 HIGH — Info leak of another org's branding                                      |
| **`/api/weather/verify`**             | Body contains `orgId`, comment says "fall back to body orgId only if needed"             | 🟠 HIGH — Fallback path uses client orgId                                          |
| **`/api/portal/generate-access`**     | `const { clientId, orgId } = body` — both from client                                    | 🔴 **CRITICAL** — Can generate portal tokens for any client in any org             |
| **`/api/uploadthing/core.ts`**        | `metadata.orgId` flows through — source unclear                                          | 🟡 MEDIUM — Need to verify metadata origin                                         |

---

## Write Paths Missing Org Validation

### Claim Domain

| Route                                 | Method | Issue                              |
| ------------------------------------- | ------ | ---------------------------------- |
| `/api/claims` (POST)                  | POST   | ✅ Uses `withOrgScope` — **SAFE**  |
| `/api/claims/[claimId]` (PATCH)       | PATCH  | ✅ Uses `withOrgScope` — **SAFE**  |
| `/api/claims/[claimId]` (DELETE)      | DELETE | ✅ Uses `withOrgScope` — **SAFE**  |
| `/api/claims/intake` (POST)           | POST   | ✅ Uses `requireAuth()` — **SAFE** |
| `/api/claims/[claimId]/mutate` (POST) | POST   | ✅ Uses `requireAuth()` — **SAFE** |

### Contact/Lead Domain

| Route                                      | Method       | Issue                                                                                                           |
| ------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------- |
| `/api/contacts/[contactId]` (PATCH/DELETE) | PATCH/DELETE | ✅ Uses `withOrgScope` — **SAFE**                                                                               |
| `/api/leads` (POST)                        | POST         | ⚠️ Uses bare `auth()` — cannot use `withOrgScope` (note in code says "client forms don't send x-org-id header") |
| `/api/leads/[id]` (PATCH/DELETE)           | PATCH/DELETE | ⚠️ Same — bare `auth()`                                                                                         |

### Team/Billing Domain

| Route                                     | Method | Issue                                                    |
| ----------------------------------------- | ------ | -------------------------------------------------------- |
| `/api/team/invitations` (POST)            | POST   | Uses `currentUser()` + resolves orgId via safeOrgContext |
| `/api/team/invitations/accept` (POST)     | POST   | Uses `auth()` — creates `user_organizations` row         |
| `/api/billing/create-subscription` (POST) | POST   | Uses `currentUser()` — subscription creation             |

### AI Domain

| Route                           | Method | Issue                                                          |
| ------------------------------- | ------ | -------------------------------------------------------------- |
| `/api/ai/damage/analyze` (POST) | POST   | 🔴 Uses `currentUser()` only — no org/claim ownership verified |
| `/api/ai/analyze-damage` (POST) | POST   | 🔴 Uses `currentUser()` only — duplicate of above?             |
| `/api/ai/analyze-photo` (POST)  | POST   | 🔴 Uses `currentUser()` only                                   |
| `/api/ai/run` (POST)            | POST   | 🟠 Uses `auth()` — no ownership check on reportId              |

---

## Missing Ownership Checks on Updates/Deletes

| Route                          | Operation    | Issue                                                                                                    |
| ------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------- |
| `/api/report-templates/[id]`   | DELETE       | Uses `.catch(() => {})` — silent failure, unclear org check                                              |
| `/api/tasks/[taskId]`          | PATCH/DELETE | Uses bare `auth()` — `findUnique` by ID, then checks `assigneeId === userId` (user check, not org check) |
| `/api/notifications/[id]`      | DELETE       | Uses bare `auth()` — deletes by ID, no org filter                                                        |
| `/api/notifications/[id]/read` | POST         | Uses bare `auth()` — marks read by ID                                                                    |

---

## Orphan Creation Risks

| Scenario                          | Route                   | Issue                                                                                                          |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Claim + Property creation**     | `/api/claims` POST      | Property is `connectOrCreate` in same transaction — ✅ Safe                                                    |
| **Report without PDF**            | `/api/reports/generate` | DB record created before PDF generation — if PDF fails, orphaned `reports` row with `status: "error"`          |
| **Team invitation without email** | `/api/team/invitations` | Creates invitation row, then sends email with `.catch(() => {})` — invitation exists but user never gets email |
| **Upload without DB record**      | Multiple upload routes  | Files uploaded to Supabase/Firebase with no corresponding `file_assets` row                                    |
| **AI job without result**         | `/api/ai/run`           | Job enqueued to in-memory queue, `saveResult` is a no-op stub — AI work is silently discarded                  |

---

## Top 15 Write Path Safety Issues

| #   | Severity | Issue                                                              | Route                         |
| --- | -------- | ------------------------------------------------------------------ | ----------------------------- |
| 1   | 🔴 P0    | `body.orgId` trusted for contractor profile writes                 | `/api/contractor/profile`     |
| 2   | 🔴 P0    | `body.orgId` + `body.clientId` trusted for portal token generation | `/api/portal/generate-access` |
| 3   | 🔴 P0    | AI damage analysis — no claim/org ownership check                  | `/api/ai/damage/analyze`      |
| 4   | 🔴 P0    | AI photo analysis — no claim/org ownership                         | `/api/ai/analyze-photo`       |
| 5   | 🔴 P0    | `body.orgId` used in PDF creation and branding                     | `/api/pdf/create`             |
| 6   | 🟠 P1    | Weather verify falls back to `body.orgId`                          | `/api/weather/verify`         |
| 7   | 🟠 P1    | Leads POST uses bare `auth()` — no DB org verification             | `/api/leads`                  |
| 8   | 🟠 P1    | Tasks update uses user check, not org check                        | `/api/tasks/[taskId]`         |
| 9   | 🟠 P1    | Notifications delete by ID without org filter                      | `/api/notifications/[id]`     |
| 10  | 🟠 P1    | Team invitation email silently fails                               | `/api/team/invitations`       |
| 11  | 🟡 P2    | Report orphan on PDF failure                                       | `/api/reports/generate`       |
| 12  | 🟡 P2    | Multiple upload routes create no DB record                         | Various upload routes         |
| 13  | 🟡 P2    | AI job results silently discarded                                  | `/api/ai/run`                 |
| 14  | 🟡 P2    | `auth()` without DB org verification on 80+ routes                 | Various                       |
| 15  | 🟡 P2    | `uploadthing` metadata.orgId source unclear                        | `/api/uploadthing/core.ts`    |

---

## Canonical Write-Path Pattern Recommendation

Every write-path API route should follow this pattern:

```typescript
// ALWAYS use withOrgScope or requireAuth — NEVER bare auth()
export const POST = withOrgScope(async (req, { userId, orgId }) => {
  // 1. Validate request body with Zod
  const body = schema.parse(await req.json());

  // 2. NEVER trust body.orgId — always use session orgId
  // 3. For sub-resources, verify parent belongs to org first
  const claim = await prisma.claims.findFirst({
    where: { id: body.claimId, orgId },
  });
  if (!claim) return apiError(404, "NOT_FOUND", "Claim not found");

  // 4. Create with session orgId, NEVER body.orgId
  const result = await prisma.records.create({
    data: { ...body, orgId, createdBy: userId },
  });

  return NextResponse.json(result, { status: 201 });
});
```

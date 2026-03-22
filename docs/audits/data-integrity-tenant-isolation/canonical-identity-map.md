# Canonical Identity Map

## Identity Concepts Found

| Field                                                        | Type          | Meaning                                          | Models Using It                                                            | Count             |
| ------------------------------------------------------------ | ------------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ----------------- |
| `orgId` (camelCase)                                          | String (CUID) | Primary tenant key → `Org.id`                    | 119 models                                                                 | ~336 refs         |
| `org_id` (snake_case)                                        | String (CUID) | Same as `orgId`, naming drift                    | 52 models                                                                  | ~117 refs         |
| `companyId`                                                  | String (UUID) | FK to `tradesCompany.id`, **NOT Org**            | `ClientSavedPro`, `ClaimTradePartner`, `tradesPost`, `client_saved_trades` | ~12 refs          |
| `clerkOrgId`                                                 | String        | Clerk's external org ID, stored on `Org` model   | 1 model                                                                    | ~1 field          |
| `proId`                                                      | String (UUID) | FK to `tradesCompany.id` (a company, NOT a user) | `ClientWorkRequest`, `ClientJob`, `ClientConnection`                       | ~12 refs          |
| `clientId`                                                   | String        | FK to `Client.id` — a different entity from Org  | `claims`, `ClientJob`, `MessageThread`, portal models                      | ~30+ refs         |
| `userId` / `user_id`                                         | String        | Clerk user ID or internal user ref               | ~40+ models                                                                | Mixed naming      |
| `ownerId`                                                    | String        | Who "owns" a record                              | `file_assets`, `org_branding`                                              | 2 models          |
| `createdBy` / `created_by` / `createdById` / `created_by_id` | String        | User who created the record                      | ~20 models                                                                 | 4 naming variants |
| `contractorId`                                               | String        | References `tradesCompany` or UUID               | Trades domain                                                              | ~5 refs           |
| `recipientId`                                                | String        | **POLYMORPHIC** — stores userId OR orgId         | `TradeNotification`                                                        | 1 model           |
| `invitee_org_id`                                             | String        | Optional org reference                           | `referrals`                                                                | 1 model           |

---

## Naming Drift Analysis

### `orgId` vs `org_id` — Two Names, One Concept

**119 models use camelCase `orgId`** — newer models, claim domain, core entities  
**52 models use snake_case `org_id`** — older models, CRM, AI telemetry, admin, carriers, commission

Snake*case models include: `agent_missions`, `agent_schedules`, `ai_performance_logs`, `ai_usage`, `api_keys`, `api_tokens`, `appeal_logs`, `audit_events`, `audit_logs`, `automation_rules`, `carrier_deliveries`, `carrier_inbox`, `carrier_profiles`, `claim_tasks`, `claim_timeline_events`, `claim_trade_assignments`, `commission_plans`, `commission_records`, `completion*_`, `crm*jobs`, `damage_assessments`, `depreciation*_`, `export*jobs`, `feature_flags`, `finalization_statuses`, `insured_access`, `job_financials`, `material_forensic_reports`, `measurement_orders`, `payments`, `proposal_drafts`, `quickbooks_connections`, `referrals`, `report*_`, `scopes`, `supplement_`, `team\_\*`, `vendors`, `webhook_subscriptions`

### `createdBy` — Four Naming Variants

| Variant         | Models                                       |
| --------------- | -------------------------------------------- |
| `createdBy`     | `leads`, `documents`, `projects`, `BatchJob` |
| `created_by`    | `supplements`                                |
| `createdById`   | `reports`                                    |
| `created_by_id` | `damage_assessments`, `claim_tasks`          |

### Auth Layer Naming Confusion

In `src/lib/auth/tenant.ts`, the `resolveOrg()` function has a **defensive fallback**:

```typescript
const resolvedOrgId = membership?.orgId ?? membership?.org_id;
```

This proves the naming drift has already caused runtime issues.

---

## Identity Resolution Flow

### Primary Path (Pro Dashboard)

```
Clerk auth() → userId + orgId(Clerk)
  → resolveOrg(userId) → query user_organizations table → get DB orgId
  → return { orgId, userId, role, membership }
```

### Fallback Path (Trades)

```
Clerk auth() → userId
  → tradesCompany lookup by userId → companyId (UUID)
  → check if companyId matches any Org.id → treat as orgId
```

⚠️ **DANGEROUS**: `companyId` references `tradesCompany`, NOT `Org`. These are different entities but the code treats them interchangeably.

### Client Path

```
Client auth → clientId
  → Client.orgId (nullable!) → Org
```

⚠️ If `Client.orgId` is null, the client exists outside any tenant boundary.

---

## Recommendation

**`orgId` (camelCase) referencing `Org.id` (CUID string) should be the SINGLE canonical tenant key.**

1. Standardize all `org_id` to `orgId` via `@map("org_id")` in Prisma
2. Eliminate `companyId`-as-orgId fallback in `resolveOrg()`
3. Make `Client.orgId` required (NOT NULL)
4. Split `TradeNotification.recipientId` into `recipientUserId` + `recipientOrgId`
5. Standardize `createdBy` naming across all models

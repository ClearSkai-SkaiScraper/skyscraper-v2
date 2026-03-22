# Database Enforcement Gaps

## Missing Foreign Keys — 97 Models with orgId but NO FK to Org

The majority of models that have an `orgId` or `org_id` field do NOT have a Prisma `@relation` pointing to the `Org` model. This means the database cannot enforce referential integrity — an `orgId` value could reference a non-existent org.

### Critical Models Missing FK

| Model                 | Field    | Required? | Has Index? | Impact                |
| --------------------- | -------- | --------- | ---------- | --------------------- |
| `scopes`              | `org_id` | ✅        | ✅         | Core claim sub-entity |
| `supplement_requests` | `org_id` | ✅        | ✅         | Core claim sub-entity |
| `MessageThread`       | `orgId`  | ✅        | ✅         | Messaging system      |
| `crm_jobs`            | `org_id` | ✅        | ✅         | CRM domain            |
| `GeneratedArtifact`   | `orgId`  | ✅        | ✅         | AI outputs            |
| `BatchJob`            | `orgId`  | ✅        | ✅         | Batch processing      |
| `payments`            | `org_id` | ✅        | ✅         | Financial data        |
| `claim_tasks`         | `org_id` | ✅        | ✅         | Task management       |
| `team_members`        | `org_id` | ✅        | @@unique   | Team management       |
| `audit_logs`          | `org_id` | ✅        | ✅         | Audit trail (ironic)  |
| `carrier_deliveries`  | `org_id` | ✅        | ✅         | Carrier comms         |
| `weather_documents`   | `orgId`  | ✅        | ✅         | Weather data          |
| `export_jobs`         | `org_id` | ✅        | ✅         | Data exports          |
| `agent_missions`      | `org_id` | ✅        | ✅         | AI agents             |

---

## Nullable Tenant Fields

### Models Where orgId Should Be Required But Is Optional

| Model                       | Field                      | Business Impact                                     |
| --------------------------- | -------------------------- | --------------------------------------------------- |
| **`reports`**               | `orgId String?`            | Core entity — reports can exist without tenant      |
| **`Client`**                | `orgId String?`            | Clients can float between tenants or belong to none |
| **`Notification`**          | `orgId` (mapped, nullable) | Notifications orphaned                              |
| **`DominusChatMessage`**    | `orgId String?`            | Chat history without tenant context                 |
| **`vendors`**               | `org_id String?`           | Vendor data shared across tenants                   |
| **`tradesCompany`**         | `orgId String?`            | Trade companies without org binding                 |
| **`tradesCompanyMember`**   | `orgId String?`            | Members without org context                         |
| **`claim_timeline_events`** | `org_id String?`           | Timeline events orphaned                            |
| **`feature_flags`**         | `org_id String?`           | Config data leaks                                   |
| **`EmailLog`**              | `orgId String?`            | Email history unscoped                              |
| **`DashboardKpi`**          | `orgId String?`            | Dashboard metrics unscoped                          |
| **`InsightsCache`**         | `orgId String?`            | Cached insights unscoped                            |

---

## Missing Indexes on Tenant Fields

### Models with orgId/org_id but NO `@@index`

| Model                   | Field    | Query Impact                            |
| ----------------------- | -------- | --------------------------------------- |
| `reports`               | `orgId`  | Full table scan on report queries       |
| `team_invitations`      | `org_id` | Full scan on invitation lookups         |
| `report_history`        | `org_id` | Full scan on report history             |
| `report_drafts`         | `org_id` | Full scan on draft lookups              |
| `vendors`               | `org_id` | Full scan on vendor queries             |
| `tradesCompany`         | `orgId`  | Full scan on trades company queries     |
| `claim_timeline_events` | `org_id` | Full scan on timeline queries           |
| `feature_flags`         | `org_id` | Full scan on flag queries               |
| `api_tokens`            | `org_id` | Full scan on token lookups              |
| `DashboardKpi`          | `orgId`  | Full scan on KPI queries                |
| `activity_events`       | `org_id` | Full scan + possible UUID type mismatch |

---

## Delete Cascade Analysis

### Cascade Deletes (Risk of Cross-Effect)

| Parent                      | Child   | onDelete                               | Risk |
| --------------------------- | ------- | -------------------------------------- | ---- |
| `Org` → `claims`            | Cascade | 🔴 Deleting org cascades to ALL claims |
| `claims` → `claim_photos`   | Cascade | Expected behavior                      |
| `claims` → `documents`      | Cascade | Expected behavior                      |
| `claims` → `storm_evidence` | Cascade | Expected behavior                      |
| `claims` → `estimates`      | Cascade | Expected behavior                      |
| `Client` → `ClientJob`      | Cascade | Deleting client removes all jobs       |

### SetNull (Orphan Risk)

| Parent                   | Child   | onDelete                                       | Risk |
| ------------------------ | ------- | ---------------------------------------------- | ---- |
| Various → `reports`      | SetNull | 🟡 Reports become tenantless if parent deleted |
| Various → `Notification` | SetNull | 🟡 Notifications orphaned                      |

### No onDelete Specified (Default: Restrict)

Most models use Prisma's default `Restrict`, which blocks parent deletion if children exist. This is generally safe but can cause confusing errors when trying to delete records with dependencies.

---

## Unique Constraint Gaps

| Model                 | Expected Unique             | Current       | Issue                         |
| --------------------- | --------------------------- | ------------- | ----------------------------- |
| `contractor_profiles` | `(orgId)`                   | ✅ `@unique`  | Good                          |
| `team_members`        | `(org_id, user_id)`         | ✅ `@@unique` | Good                          |
| `scopes`              | `(org_id, claim_id, title)` | ❌ None       | Could create duplicate scopes |
| `vendors`             | `(org_id, name)`            | ❌ None       | Duplicate vendors per org     |
| `feature_flags`       | `(org_id, key)`             | ❌ None       | Duplicate flags per org       |

---

## Top 15 DB Enforcement Issues

| #   | Severity | Issue                                                                              |
| --- | -------- | ---------------------------------------------------------------------------------- |
| 1   | 🔴 P0    | 97 models with orgId but NO FK — cannot enforce referential integrity              |
| 2   | 🔴 P0    | `reports` model — nullable orgId, no FK, no index on core business entity          |
| 3   | 🔴 P0    | `Client.orgId` nullable — clients exist outside tenant boundary                    |
| 4   | 🟠 P1    | 11+ models with orgId but no index — full table scans                              |
| 5   | 🟠 P1    | `team_invitations` — required org_id but no FK AND no index                        |
| 6   | 🟠 P1    | `weather_reports` — no orgId field at all, relies on parent chain                  |
| 7   | 🟠 P1    | Cascade delete on `Org` → `claims` — bulk data loss risk                           |
| 8   | 🟠 P1    | `tradesCompany` + `tradesCompanyMember` — nullable orgId, no FK, no index          |
| 9   | 🟡 P2    | `scopes` — no unique constraint on (org_id, claim_id, title)                       |
| 10  | 🟡 P2    | `vendors` — no unique constraint on (org_id, name)                                 |
| 11  | 🟡 P2    | `activity_events.org_id` — possible UUID type mismatch with CUID orgId             |
| 12  | 🟡 P2    | No compound indexes on (orgId, status) for filtered queries                        |
| 13  | 🟡 P2    | `feature_flags` — nullable orgId, no FK, no index, no unique                       |
| 14  | 🟡 P3    | Most models use Restrict delete — could cause cascading error messages             |
| 15  | 🟡 P3    | No row-level security (RLS) at database level — all isolation is application-layer |

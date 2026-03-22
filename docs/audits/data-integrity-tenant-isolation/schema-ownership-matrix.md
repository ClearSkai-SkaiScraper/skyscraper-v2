# Schema Ownership Matrix

## Legend

- **Risk** 🟢 SAFE = orgId required + FK + Index | 🟡 PARTIAL = has orgId but missing FK or index | 🔴 UNSAFE = nullable orgId, no orgId, or no FK+index

---

## Fully Safe Models (orgId + FK + Index) 🟢 — ~65 models

| Model                      | Org Field | Notes                                       |
| -------------------------- | --------- | ------------------------------------------- |
| `claims`                   | `orgId`   | 7 indexes, strong FK, `assignedTo` as actor |
| `properties`               | `orgId`   | FK + index                                  |
| `contacts`                 | `orgId`   | FK + index                                  |
| `leads`                    | `orgId`   | FK + index, `createdBy`                     |
| `jobs`                     | `orgId`   | FK + index                                  |
| `estimates`                | `orgId`   | FK + index, `authorId`                      |
| `inspections`              | `orgId`   | FK + index, `inspectorId`                   |
| `documents`                | `orgId`   | FK + index, `createdBy`                     |
| `tasks`                    | `orgId`   | FK + index, `assigneeId`                    |
| `projects`                 | `orgId`   | FK + index, `createdBy`                     |
| `storm_events`             | `orgId`   | FK + index                                  |
| `activities`               | `orgId`   | FK + index, `userId`                        |
| `supplements`              | `org_id`  | FK + index, `created_by`                    |
| `canvassing_routes`        | `orgId`   | FK + index                                  |
| `storm_evidence`           | `orgId`   | FK + index (unique on claimId)              |
| `claim_embeddings`         | `orgId`   | FK + HNSW index                             |
| `photo_embeddings`         | `orgId`   | FK + HNSW index                             |
| `intelligence_insights`    | `orgId`   | FK + index                                  |
| `damage_assessments`       | `org_id`  | FK + index, `created_by_id`                 |
| `claim_simulations`        | `orgId`   | FK + index                                  |
| `claim_outcomes`           | `orgId`   | FK + index                                  |
| `claim_detections`         | `orgId`   | FK + index                                  |
| `carrier_playbooks`        | `orgId`   | FK + index                                  |
| `contractor_profiles`      | `orgId`   | FK + unique                                 |
| `file_assets`              | `orgId`   | FK + index, `ownerId`                       |
| `Membership`               | `orgId`   | FK + index (junction table)                 |
| `door_knocks`              | `orgId`   | FK                                          |
| `canvass_pins`             | `orgId`   | FK + index                                  |
| `CompletionPacket`         | `orgId`   | FK + index                                  |
| `CrewSchedule`             | `orgId`   | FK + index                                  |
| `JobCloseout`              | `orgId`   | FK + index                                  |
| `MaterialOrder`            | `orgId`   | FK + index                                  |
| `ReviewReferral`           | `orgId`   | FK + index                                  |
| `VendorPricing`            | `orgId`   | FK + index                                  |
| `BillingSettings`          | `orgId`   | FK + index                                  |
| `ai_reports`               | `orgId`   | FK + index                                  |
| `property_*` (6 models)    | `orgId`   | FK + index                                  |
| `maintenance_*` (4 models) | `orgId`   | FK + index                                  |
| `storm_records`            | `orgId`   | FK + index                                  |
| `sms_messages`             | `orgId`   | FK + index                                  |
| `customer_payments`        | `orgId`   | FK + index                                  |
| `permits`                  | `orgId`   | FK + index                                  |
| `mortgage_checks`          | `orgId`   | FK + index                                  |
| `commission_plans`         | `org_id`  | FK + index                                  |
| `job_financials`           | `org_id`  | FK + index                                  |

---

## Partially Safe Models (Missing FK or Index) 🟡 — ~40 models

| Model                 | Org Field | Required?   | FK?     | Index?   | Issue                                |
| --------------------- | --------- | ----------- | ------- | -------- | ------------------------------------ |
| `scopes`              | `org_id`  | ✅          | ❌      | ✅       | No FK to Org                         |
| `supplement_requests` | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `MessageThread`       | `orgId`   | ✅          | ❌      | ✅       | No FK                                |
| `crm_jobs`            | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `GeneratedArtifact`   | `orgId`   | ✅          | ❌      | ✅       | No FK                                |
| `BatchJob`            | `orgId`   | ✅          | ❌      | ✅       | No FK                                |
| `payments`            | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `claim_tasks`         | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `team_members`        | `org_id`  | ✅          | ❌      | @@unique | No FK                                |
| `weather_documents`   | `orgId`   | ✅          | ❌      | ✅       | No FK                                |
| `export_jobs`         | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `audit_logs`          | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `carrier_deliveries`  | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `carrier_inbox`       | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `agent_missions`      | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `agent_schedules`     | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `automation_triggers` | `org_id`  | ✅          | ❌      | ✅       | No FK                                |
| `EmailLog`            | `orgId`   | ❌ nullable | ❌      | ✅       | Nullable, no FK                      |
| `api_tokens`          | `org_id`  | ❌ nullable | via Org | ❌       | Nullable, no index                   |
| `report_drafts`       | `org_id`  | ✅          | ❌      | ❌       | No FK, no index                      |
| `report_history`      | `org_id`  | ✅          | ❌      | ❌       | No FK, no index                      |
| `supplement_items`    | —         | —           | —       | —        | Via `supplement_id` → org (2 hops)   |
| `Message`             | —         | —           | —       | —        | Via `threadId` → MessageThread.orgId |
| `estimate_line_items` | —         | —           | —       | —        | Via `estimate_id` → estimates.orgId  |

---

## Unsafe Models (Nullable orgId or No orgId) 🔴 — ~20 models

| Model                       | Issue                                      | Risk Level                                 |
| --------------------------- | ------------------------------------------ | ------------------------------------------ |
| **`reports`**               | `orgId` nullable, no FK, no index          | 🔴 CRITICAL — core business entity         |
| **`weather_reports`**       | NO orgId field at all                      | 🔴 CRITICAL — tenant via parent chain only |
| **`Client`**                | `orgId` nullable                           | 🔴 HIGH — clients can exist outside tenant |
| **`Notification`**          | `orgId` nullable, no FK                    | 🔴 HIGH                                    |
| **`DominusChatMessage`**    | `orgId` nullable, no FK                    | 🟠 MEDIUM                                  |
| **`vendors`**               | `org_id` nullable, no FK, no index         | 🟠 MEDIUM                                  |
| **`tradesCompany`**         | `orgId` nullable, no FK, no index          | 🔴 HIGH                                    |
| **`tradesCompanyMember`**   | `orgId` nullable, no FK                    | 🔴 HIGH                                    |
| **`team_invitations`**      | `org_id` required but NO FK AND no index   | 🔴 HIGH                                    |
| **`claim_timeline_events`** | `org_id` nullable, no FK, no index         | 🟠 MEDIUM                                  |
| **`feature_flags`**         | `org_id` nullable, no FK, no index         | 🟡 LOW                                     |
| **`TradeNotification`**     | No orgId — polymorphic `recipientId`       | 🔴 HIGH                                    |
| **`ClientNotification`**    | No orgId — via `clientId` (nullable chain) | 🔴 HIGH                                    |
| **`community_posts`**       | No orgId — `authorId` only                 | 🔴 HIGH — cross-tenant data leak           |
| **`weather_events`**        | No orgId — via `propertyId`                | 🟠 MEDIUM                                  |
| **`scope_areas`**           | No orgId — via `scope_id`                  | 🟡 MEDIUM                                  |
| **`scope_items`**           | No orgId — 3 hops to org                   | 🟡 MEDIUM                                  |
| **`contractors`**           | `user_id` only — no org scoping            | 🟠 MEDIUM                                  |
| **`DashboardKpi`**          | `orgId` nullable, no FK                    | 🟡 LOW                                     |

---

## Top 10 Schema Integrity Risks

1. **`reports` — Core entity with nullable orgId, no FK, no index** — Reports can be created without tenant binding
2. **Naming drift: 119 `orgId` vs 52 `org_id`** — Auth layer already has defensive cast to handle this
3. **`weather_reports` — No orgId at all** — Depends on parent chain join
4. **97 models have orgId but NO FK to Org** — DB cannot enforce referential integrity
5. **`Client.orgId` is nullable** — Clients can exist outside any tenant
6. **`tradesCompany` + `tradesCompanyMember` — nullable orgId, no FK, no index** — Parallel identity path
7. **`companyId` vs `orgId` confusion** — `resolveOrg()` falls back to treating `companyId` as `orgId`
8. **`TradeNotification.recipientId` is polymorphic** — Stores userId OR orgId with no type discriminator
9. **17+ models with orgId but no index** — Full table scans on tenant queries
10. **`community_posts` — No org scoping** — Cross-tenant data visible

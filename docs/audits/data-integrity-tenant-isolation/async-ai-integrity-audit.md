# Async/AI Integrity Audit

## Background Job Inventory

| #   | Job/Worker                  | Location                   | Has orgId?        | Idempotent?                             | Status Tracking?            |
| --- | --------------------------- | -------------------------- | ----------------- | --------------------------------------- | --------------------------- |
| 1   | pg-boss `damage-analyze`    | Worker scripts             | ✅ in payload     | ❌ No ON CONFLICT — duplicates on retry | ✅ proposal status + events |
| 2   | pg-boss `weather-analyze`   | Worker scripts             | ⚠️ Optional       | ❌ Always creates new row               | ✅ Weather result status    |
| 3   | pg-boss `proposal-generate` | Worker scripts             | ⚠️ Optional       | ❌ Always creates new row               | ✅ Proposal status          |
| 4   | Report Queue (`ai_reports`) | `src/lib/ai/`              | ✅ Required       | ✅ Upsert + retry counter               | ✅ Full status flow         |
| 5   | AI Job Queue (in-memory)    | `modules/ai/jobs/queue.ts` | ❌ None           | ❌ Lost on restart                      | ✅ In-memory only           |
| 6   | BullMQ Agent Queue          | Agent modules              | ❌ No enforcement | ✅ BullMQ retries                       | ✅ BullMQ built-in          |
| 7   | PDF Queue (Upstash Redis)   | PDF generation             | ❌ None           | ❌ Job ID includes timestamp            | ✅ Redis status             |
| 8   | Generic queue               | `src/lib/queue.ts`         | ❌ None           | ❌ Fire-and-forget                      | ❌ None                     |
| 9   | `enqueueJobSafe`            | `src/lib/jobs/`            | ❌ No-op stub     | N/A                                     | ❌ None                     |
| 10  | `runJob` wrapper            | Telemetry                  | ⚠️ Optional       | ✅ Via telemetry                        | ✅ start/finish             |
| 11  | Daily Weather Ingest        | Cron                       | ❌ None           | ✅ Upsert by property                   | ❌ None                     |
| 12  | Cron: trials/sweep          | Cron routes                | ✅ Per-org        | ✅ Safe                                 | ✅ Sentry                   |
| 13  | Cron: ai-insights           | Cron routes                | ✅ Per-org        | ✅ Read-only                            | ✅ Sentry                   |
| 14  | Cron: orphan-cleanup        | Cron routes                | N/A (cross-org)   | ✅ Idempotent SQL                       | ✅ Sentry                   |
| 15  | Cron: email-retry           | Cron routes                | ✅ Per-record     | ⚠️ Depends on status                    | ✅ Sentry                   |

---

## AI Pipeline Issues

### OpenAI Client Singleton

- ✅ `src/lib/ai/index.ts` — Proper lazy singleton via `getAIClient()`
- ❌ Firebase Functions have two direct `new OpenAI()` calls outside singleton
- ❌ One module calls `getAIClient()` at module level (not lazy) — cold-start risk

### orgId Flow Through AI Operations

| AI Endpoint                   | orgId Source         | Ownership Check?                 | Output Linked to Org?         |
| ----------------------------- | -------------------- | -------------------------------- | ----------------------------- |
| `/api/ai/damage/analyze`      | `currentUser()` only | ❌ **No claim/org verification** | ❌ Returns JSON, no storage   |
| `/api/ai/rebuttal`            | `safeOrgContext()`   | ✅                               | ✅ Saved with orgId           |
| `/api/reports/generate`       | `safeOrgContext()`   | ✅                               | ✅ Full linkage               |
| `/api/mockup/generate`        | `safeOrgContext()`   | ✅                               | ⚠️ Returns buffer, no storage |
| `/api/ai/run`                 | `auth()`             | ❌ **No ownership on reportId**  | ❌ `saveResult` is no-op      |
| `/api/ai/similarity/claims`   | `safeOrgContext()`   | ✅                               | ✅ Scoped by orgId            |
| `/api/ai/embeddings/generate` | `safeOrgContext()`   | ✅                               | ✅ Scoped by orgId            |

### Rate Limiting

- **Per-user, not per-org** — All AI rate limiting uses `userId` as identifier
- An org with 50 users gets 50× the AI rate limit
- No org-level AI spend cap

### Embedding Scoping

- ✅ `claimSimilarity.ts` — Properly org-scoped: `ce2."orgId" = $2` and `ce1."orgId" = $2`
- No cross-tenant leakage in vector search

---

## Idempotency Gaps

| Risk | Location                   | Issue                                                                          |
| ---- | -------------------------- | ------------------------------------------------------------------------------ |
| 🔴   | `damage-analyze` worker    | `INSERT INTO photo_findings` with no `ON CONFLICT` — retries create duplicates |
| 🔴   | `weather-analyze` worker   | `INSERT INTO weather_results` always new — duplicates on retry                 |
| 🔴   | `proposal-generate` worker | `INSERT INTO proposals_v2` always new — duplicates                             |
| 🟡   | PDF Queue                  | Job ID includes timestamp — same doc can be queued multiple times              |
| 🟡   | Generic `enqueue()`        | No dedup — calling twice runs handler twice                                    |

---

## AI Failure / Partial Artifact Risks

| Scenario                             | Impact                                         | Handled?          |
| ------------------------------------ | ---------------------------------------------- | ----------------- |
| Report PDF generation fails          | DB row exists with `status: "error"`           | ✅ User can retry |
| AI in-memory queue result            | `saveResult` is a no-op stub — work discarded  | ❌ Silently lost  |
| Rebuttal PDF storage fails           | AI text returns to client but no PDF persisted | ⚠️ Partial        |
| Embedding generation fails mid-batch | Some claims embedded, others not               | ✅ Can resume     |

---

## Top 15 Async/AI Issues

| #   | Severity | Issue                                                        |
| --- | -------- | ------------------------------------------------------------ |
| 1   | 🔴 P0    | damage-analyze creates duplicate findings on retry           |
| 2   | 🔴 P0    | `/api/ai/damage/analyze` — no org/claim ownership check      |
| 3   | 🔴 P0    | weather-analyze and proposal-generate have optional orgId    |
| 4   | 🟠 P1    | In-memory AI queue loses state on restart                    |
| 5   | 🟠 P1    | `saveResult` is a no-op — AI results silently discarded      |
| 6   | 🟠 P1    | `/api/ai/run` doesn't verify report ownership                |
| 7   | 🟠 P1    | PDF Queue has no orgId in job data                           |
| 8   | 🟠 P1    | Rate limiting per-user not per-org                           |
| 9   | 🟡 P2    | Module-level `getAIClient()` call causes cold-start failures |
| 10  | 🟡 P2    | Firebase Functions use direct `new OpenAI()`                 |
| 11  | 🟡 P2    | Generic queue is fire-and-forget                             |
| 12  | 🟡 P2    | `enqueueJobSafe` is a no-op placeholder                      |
| 13  | 🟡 P2    | PDF generation fallback uses `companyId` as orgId            |
| 14  | 🟡 P2    | Weather ingest cron has no error handling visible            |
| 15  | 🟡 P2    | BullMQ agent queue has no custom error logging               |

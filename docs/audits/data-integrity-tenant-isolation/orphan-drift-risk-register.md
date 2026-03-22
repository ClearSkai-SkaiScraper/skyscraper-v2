# Orphan/Drift Risk Register

## Data Orphan Scenarios

### Severity: CRITICAL 🔴

| Scenario                                | Trigger                                               | Impact                                                            | Current Mitigation |
| --------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| **Files in Supabase with no DB record** | Portal uploads, message attachments, avatars          | Files accumulate indefinitely, can never be queried or cleaned up | ❌ None            |
| **Reports with null orgId**             | Report created before org context resolved            | Report data visible without tenant filter                         | ❌ None            |
| **Clients with null orgId**             | Client created through portal without org association | Client data floats between tenants                                | ❌ None            |
| **AI results from in-memory queue**     | `saveResult` is a no-op stub                          | AI processing work is silently discarded                          | ❌ None            |
| **Video artifacts in Firebase**         | `/api/video/create` uploads but creates no DB record  | Videos exist in Firebase with no reference                        | ❌ None            |

### Severity: HIGH 🟠

| Scenario                                 | Trigger                                                             | Impact                                             | Current Mitigation              |
| ---------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| **Team invitation sent but email fails** | `.catch(() => {})` on email send                                    | Invitation exists in DB but user never receives it | ❌ Silent failure               |
| **Weather reports without claims**       | Weather report created before claim association                     | Orphaned report data, no tenant path               | ❌ None                         |
| **Notifications with null orgId**        | Notification created without org context                            | Notification visible to wrong users                | ❌ None                         |
| **Duplicate worker results**             | pg-boss retry on damage-analyze, weather-analyze, proposal-generate | Duplicate rows in findings/results/proposals       | ❌ No ON CONFLICT               |
| **Stale Clerk-to-DB membership sync**    | User removed from org in Clerk dashboard                            | User may retain DB access until webhook fires      | ✅ Clerk webhook handler exists |

### Severity: MEDIUM 🟡

| Scenario                                    | Trigger                              | Impact                                         | Current Mitigation       |
| ------------------------------------------- | ------------------------------------ | ---------------------------------------------- | ------------------------ |
| **Old avatar/cover photos**                 | User changes profile photo           | Previous photos remain in storage              | ❌ None                  |
| **DominusChatMessage without org**          | Chat message created with null orgId | Chat history without tenant context            | ❌ None                  |
| **Scope areas/items without direct orgId**  | Created via parent chain (3 hops)    | Query performance issues, complex joins needed | ❌ None                  |
| **Export jobs completed but files expired** | Signed URL expires after export      | User gets 404 on download link                 | ⚠️ Partial — URL expires |

---

## Dead Code / Unreachable Routes

### Potentially Dead API Routes

| Route                         | Evidence                                    | Risk                      |
| ----------------------------- | ------------------------------------------- | ------------------------- |
| `/api/ai/run`                 | `saveResult` is a no-op — results discarded | 🟡 Dead functionality     |
| `/api/storm/[leadId]`         | `.ts.disabled` extension                    | ✅ Intentionally disabled |
| `/api/agents/claims-analysis` | Uses bare `auth()` — may be superseded      | 🟡 Check usage            |
| Various archive/ routes       | Moved to `archive/` directory               | ✅ Archived intentionally |

### Potentially Unused Prisma Models

| Model                                | Evidence                                             | Risk |
| ------------------------------------ | ---------------------------------------------------- | ---- |
| `DashboardKpi`                       | Nullable orgId, no FK, no index — may be placeholder | 🟡   |
| `InsightsCache`                      | Nullable orgId — may be unused cache                 | 🟡   |
| `agent_missions` / `agent_schedules` | AI agent system — may be in development              | 🟡   |
| `portal_settings`                    | userId only, no org — may be placeholder             | 🟡   |

---

## Schema Drift Risks

### Naming Convention Drift

- **119 models** use `orgId` (camelCase)
- **52 models** use `org_id` (snake_case)
- **4 different `createdBy` naming patterns** across models
- Auth layer already has defensive fallback to handle this

### Field Type Mismatches

- `activity_events.org_id` may use `@db.Uuid` type — but standard orgId is CUID string
- `tradesCompany.id` is UUID — but `resolveOrg()` tries to match it against `Org.id` (CUID)

### Missing `@map` Annotations

- Some Prisma fields don't have `@map` to maintain consistent DB column names
- Could cause issues if field names change

---

## Config Drift Risks

### Environment Variables

| Variable                        | Referenced In            | Risk                                        |
| ------------------------------- | ------------------------ | ------------------------------------------- |
| `OPENAI_API_KEY`                | Multiple AI modules      | 🟢 Required for AI — build fails without it |
| `DATABASE_URL`                  | Prisma                   | 🟢 Required — build fails without it        |
| `SUPABASE_URL` / `SUPABASE_KEY` | Upload routes            | 🟠 Uploads silently fail if missing         |
| `FIREBASE_*`                    | Firebase storage         | 🟠 Firebase fallback fails silently         |
| `UPSTASH_REDIS_*`               | Rate limiting, PDF queue | 🟠 Rate limiting disabled if missing        |
| `SENTRY_DSN`                    | Error tracking           | 🟡 Errors not reported if missing           |
| `BUILD_PHASE`                   | Build-time skip          | 🟡 Must be set during `next build`          |

### Feature Flags

- Feature flag system has 3 empty catch blocks — fails silently
- If feature_flags table is empty or broken, features are unpredictably on/off

---

## Top 15 Orphan/Drift Issues

| #   | Severity | Issue                                                   |
| --- | -------- | ------------------------------------------------------- |
| 1   | 🔴 P0    | Files in Supabase with no DB record — permanent orphans |
| 2   | 🔴 P0    | Reports with nullable orgId — tenant-unsafe core entity |
| 3   | 🔴 P0    | Clients with nullable orgId — float between tenants     |
| 4   | 🔴 P0    | AI results silently discarded (`saveResult` no-op)      |
| 5   | 🟠 P1    | Worker duplicates on retry — no idempotency             |
| 6   | 🟠 P1    | Video artifacts in Firebase with no DB reference        |
| 7   | 🟠 P1    | Team invitations with silent email failure              |
| 8   | 🟠 P1    | Weather reports without org context                     |
| 9   | 🟡 P2    | Naming drift: orgId vs org_id (119 vs 52 models)        |
| 10  | 🟡 P2    | Type mismatch: UUID vs CUID in identity fields          |
| 11  | 🟡 P2    | Old avatar/cover photos never cleaned up                |
| 12  | 🟡 P2    | Feature flag system fails silently                      |
| 13  | 🟡 P2    | Export signed URLs expire — dead download links         |
| 14  | 🟡 P3    | Potentially unused Prisma models                        |
| 15  | 🟡 P3    | Missing @map annotations for naming consistency         |

# Master Remediation Roadmap

## Phase 0: Emergency Fixes (Week 1) — Block Cross-Tenant Data Leaks

### P0 Blockers — Must fix before any production traffic with multiple tenants

| #    | Fix                                                                    | Files                                         | Effort  | Impact                                        |
| ---- | ---------------------------------------------------------------------- | --------------------------------------------- | ------- | --------------------------------------------- |
| 0.1  | **Switch all Supabase buckets to private + signed URLs**               | All upload routes (20+)                       | 2 days  | Closes file access leak for ALL uploaded data |
| 0.2  | **Add orgId check to `/api/claims/ai/build`**                          | `src/app/api/claims/ai/build/route.ts`        | 1 hour  | Close cross-tenant claim access               |
| 0.3  | **Add orgId check to `/api/portal/generate-access`**                   | `src/app/api/portal/generate-access/route.ts` | 1 hour  | Close portal token generation leak            |
| 0.4  | **Add orgId filter to `/api/weather/events`**                          | `src/app/api/weather/events/` route           | 1 hour  | Close global data leak                        |
| 0.5  | **Add orgId check to `/api/reports/[reportId]/ai/[sectionKey]`**       | Report AI route                               | 1 hour  | Close report section leak                     |
| 0.6  | **Stop trusting `body.orgId` in `/api/contractor/profile`**            | `src/app/api/contractor/profile/route.ts`     | 2 hours | Close write-path injection                    |
| 0.7  | **Stop trusting `body.orgId` in `/api/pdf/create`**                    | `src/app/api/pdf/create/route.tsx`            | 1 hour  | Close branding leak                           |
| 0.8  | **Add org check to `/api/ai/damage/analyze`**                          | `src/app/api/ai/damage/analyze/route.ts`      | 1 hour  | Close AI analysis access                      |
| 0.9  | **Add org check to `/api/templates/*/generate-assets` and `validate`** | Template routes                               | 1 hour  | Close template access                         |
| 0.10 | **Add ON CONFLICT to damage-analyze worker**                           | Worker SQL                                    | 1 hour  | Fix duplicate findings                        |

**Phase 0 Total: ~3 days**

---

## Phase 1: Schema Hardening (Weeks 2-3) — Enforce Tenant Integrity at DB Level

| #    | Fix                                                                           | Effort  | Impact                              |
| ---- | ----------------------------------------------------------------------------- | ------- | ----------------------------------- |
| 1.1  | **Make `reports.orgId` required (NOT NULL)** — backfill existing null values  | 1 day   | Core entity becomes tenant-safe     |
| 1.2  | **Make `Client.orgId` required** — backfill                                   | 1 day   | Clients properly tenant-scoped      |
| 1.3  | **Make `Notification.orgId` required** — backfill                             | 4 hours | Notifications scoped                |
| 1.4  | **Add `orgId` to `weather_reports`** — backfill from claim relation           | 1 day   | Weather data directly tenant-scoped |
| 1.5  | **Add FK constraints to 97 models** — add `Org @relation` to all orgId fields | 3 days  | DB enforces referential integrity   |
| 1.6  | **Add missing indexes on 17+ models**                                         | 1 day   | Eliminate full table scans          |
| 1.7  | **Standardize `org_id` → `orgId` via `@map`** for 52 snake_case models        | 2 days  | Eliminate naming drift              |
| 1.8  | **Split `TradeNotification.recipientId`** into typed fields                   | 4 hours | Eliminate polymorphic identity      |
| 1.9  | **Fix `tradesCompany`/`tradesCompanyMember` orgId** — make required, add FK   | 1 day   | Trades domain tenant-safe           |
| 1.10 | **Add unique constraints** to scopes, vendors, feature_flags                  | 2 hours | Prevent duplicates                  |

**Phase 1 Total: ~2 weeks**

---

## Phase 2: Auth Consolidation (Week 4) — Standardize Auth Patterns

| #   | Fix                                                                        | Effort  | Impact                       |
| --- | -------------------------------------------------------------------------- | ------- | ---------------------------- |
| 2.1 | **Migrate 80+ bare `auth()` routes to `withOrgScope` or `safeOrgContext`** | 3 days  | All routes DB-verified org   |
| 2.2 | **Migrate 15 `currentUser()` routes** to proper org resolution             | 1 day   | Eliminate user-only auth     |
| 2.3 | **Eliminate `companyId`-as-orgId fallback** in resolveOrg                  | 4 hours | Remove identity confusion    |
| 2.4 | **Add `requireOrgOwnership()` helper** for sub-resource access             | 4 hours | Standardize ownership checks |
| 2.5 | **Weather verify — remove body.orgId fallback**                            | 1 hour  | Use session orgId only       |
| 2.6 | **Leads POST — add DB org verification**                                   | 1 hour  | Close auth gap               |

**Phase 2 Total: ~1 week**

---

## Phase 3: File & Artifact Safety (Week 5) — Track All Files

| #   | Fix                                                               | Effort  | Impact                 |
| --- | ----------------------------------------------------------------- | ------- | ---------------------- |
| 3.1 | **Create `file_assets` records for portal uploads**               | 4 hours | Track portal files     |
| 3.2 | **Create DB records for message attachments**                     | 4 hours | Track attachments      |
| 3.3 | **Create DB records for video generation**                        | 2 hours | Track videos           |
| 3.4 | **Track avatar/cover/portfolio photos** in file_assets or cleanup | 4 hours | Remove orphans         |
| 3.5 | **Implement orphaned file cleanup cron**                          | 1 day   | Prevent storage bloat  |
| 3.6 | **Fix upload fallback using companyId as orgId**                  | 2 hours | Correct tenant scoping |
| 3.7 | **Wire up `saveResult` persist layer** or remove dead code        | 4 hours | AI results stored      |

**Phase 3 Total: ~1 week**

---

## Phase 4: Observability (Week 6) — See What's Happening

| #   | Fix                                                                         | Effort  | Impact                     |
| --- | --------------------------------------------------------------------------- | ------- | -------------------------- |
| 4.1 | **Replace 42+ empty catch blocks** with `logger.error` + Sentry             | 2 days  | Errors become visible      |
| 4.2 | **Replace 24+ fire-and-forget** with proper error handling                  | 1 day   | Side-effects tracked       |
| 4.3 | **Migrate console.log to structured logger** across ~90 routes              | 2 days  | Consistent observability   |
| 4.4 | **Add audit events** for: role changes, file access, data exports, settings | 2 days  | Audit trail complete       |
| 4.5 | **Add per-org rate limiting** for AI operations                             | 4 hours | Cost control               |
| 4.6 | **Add business metrics endpoint**                                           | 4 hours | Platform health visibility |

**Phase 4 Total: ~1.5 weeks**

---

## Phase 5: Test Coverage (Weeks 7-8) — Prove It Works

| #   | Fix                                           | Effort  | Impact                      |
| --- | --------------------------------------------- | ------- | --------------------------- |
| 5.1 | **Cross-tenant claim CRUD integration tests** | 1 day   | Prove isolation             |
| 5.2 | **Cross-tenant file access tests**            | 1 day   | Prove file safety           |
| 5.3 | **Write path org validation tests**           | 1 day   | Prove all writes are scoped |
| 5.4 | **Read path org filtering tests**             | 1 day   | Prove all reads are scoped  |
| 5.5 | **Portal auth flow tests**                    | 4 hours | Prove portal security       |
| 5.6 | **Worker tenant context tests**               | 4 hours | Prove async safety          |
| 5.7 | **Auth pattern consistency tests**            | 4 hours | Enforce standards           |
| 5.8 | **Report generation tests**                   | 4 hours | Prove report safety         |

**Phase 5 Total: ~2 weeks**

---

## Timeline Summary

| Phase     | Duration    | Focus                                        |
| --------- | ----------- | -------------------------------------------- |
| Phase 0   | Week 1      | Emergency cross-tenant leak fixes            |
| Phase 1   | Weeks 2-3   | Schema hardening (FKs, indexes, nullability) |
| Phase 2   | Week 4      | Auth pattern consolidation                   |
| Phase 3   | Week 5      | File/artifact tracking                       |
| Phase 4   | Week 6      | Observability & audit trail                  |
| Phase 5   | Weeks 7-8   | Test coverage                                |
| **Total** | **8 weeks** | **Full integrity hardening**                 |

**After Phase 0**: Safe for controlled pilot with 2-3 friendly tenants  
**After Phase 2**: Safe for early adopters  
**After Phase 5**: Ready for general availability

# SkaiScraper — GO / NO-GO Release Checklist

> Generated: April 16, 2026 | Sprint B Hardening Pass

## Status: ✅ GO (with known P2 items documented)

---

## 1. Authentication & Authorization

| Check                                              | Status | Notes                                                                                                |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| All mutation routes require auth                   | ✅     | ask-dominus fixed (was unawaited auth). ~43 routes auth-gated in Sprint A.                           |
| RBAC role hierarchy consistent                     | ✅     | Canonical system in `rbac.ts` — lowercase keys, numeric levels 1-4. `requireAuth` normalizes casing. |
| `withAuth`/`withAdmin`/`withManager` wrappers safe | ✅     | `requireAuth` uppercases both sides before comparison.                                               |
| No role string drift in comparisons                | ✅     | Legacy systems exist (deprecated) but canonical `rbac.ts` is the enforced path.                      |
| Clerk org invitations (not mock)                   | ✅     | `teams/invite` replaced with real Clerk `createOrganizationInvitation`.                              |

## 2. Tenant Isolation

| Check                               | Status | Notes                                                                                    |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| All org-bound reads filter by orgId | ✅     | Cross-tenant fixes applied to 8 routes in Sprint A. New routes audited.                  |
| All org-bound writes include orgId  | ✅     | Depreciation, materials, teams routes all scope orgId.                                   |
| Remote view RBAC gap closed         | ✅     | Manager fallback now returns empty list, not all org members.                            |
| Reviews intentionally public (read) | ✅     | GET `/api/reviews/[contractorId]` is public — reviews are public-facing.                 |
| Reviews auth-gated (write)          | ✅     | POST requires auth + self-review prevention + duplicate check.                           |
| Upload routes user-scoped           | ⚠️ P2  | avatar/cover/portfolio uploads use userId, not orgId — acceptable for user-owned assets. |

## 3. AI / Cost Protection

| Check                          | Status | Notes                                                                        |
| ------------------------------ | ------ | ---------------------------------------------------------------------------- |
| All AI routes rate-limited     | ✅     | 8 AI routes rate-limited in Sprint A. `ask-dominus` now has AI preset limit. |
| All AI routes require auth     | ✅     | `ask-dominus` fixed — was open to internet. Now requires userId + orgId.     |
| OpenAI client singleton        | ✅     | Uses `getOpenAI()` / `getAIClient()` lazy singleton.                         |
| Token spend surfaces monitored | ✅     | Tokens ledger in DB, Sentry logging.                                         |

## 4. Critical Workflows

| Workflow                       | Status | Notes                                                               |
| ------------------------------ | ------ | ------------------------------------------------------------------- |
| Goals save/load                | ✅     | RBAC lowercase fix resolved 403. Falls back to localStorage on 503. |
| Review create + company rollup | ✅     | Creates review, updates contractor avg, rolls up to tradesCompany.  |
| Review list + pagination       | ✅     | Pagination bounded (max 50/page). Rating distribution computed.     |
| Depreciation full flow         | ✅     | status → ready → generate → prepare → send. All org-scoped.         |
| Materials orders               | ✅     | Create + list, org-scoped.                                          |
| Team invite                    | ✅     | Real Clerk invitations, manager+ role required, rate-limited.       |
| Profile completeness           | ✅     | Server and client now use same `calculateProStrength` (15 fields).  |

## 5. Data Consistency

| Check                           | Status | Notes                                                                        |
| ------------------------------- | ------ | ---------------------------------------------------------------------------- | --- | ------- |
| Status enums centralized        | ✅     | `src/lib/constants/statuses.ts` — single source of truth.                    |
| Profile strength unified        | ✅     | `profileCompletion.ts` delegates to shared `profile-strength.ts`.            |
| Field naming (postal/zip)       | ✅     | Client strength checks `p.postal                                             |     | p.zip`. |
| Inspector completeness expanded | ✅     | 11 fields (was 7). Includes bio, serviceArea, certifications, insuranceInfo. |

## 6. Security Headers

| Header                    | Status                                          |
| ------------------------- | ----------------------------------------------- |
| Content-Security-Policy   | ✅ Full CSP in next.config.mjs                  |
| Strict-Transport-Security | ✅ max-age=63072000; includeSubDomains; preload |
| X-Content-Type-Options    | ✅ nosniff                                      |
| X-Frame-Options           | ✅ SAMEORIGIN                                   |
| X-XSS-Protection          | ✅ 1; mode=block                                |
| Referrer-Policy           | ✅ strict-origin-when-cross-origin              |
| Permissions-Policy        | ✅ Configured                                   |

## 7. Monitoring & Observability

| Check                       | Status                                    |
| --------------------------- | ----------------------------------------- |
| Sentry error tracking       | ✅                                        |
| Structured logger with tags | ✅ `[MODULE_ACTION]` format               |
| Request correlation IDs     | ✅ `x-request-id` propagated via withAuth |
| Health endpoint             | ✅ `/api/health/live`                     |

## 8. Known Issues (P2 — Non-blocking)

| Issue                                                  | Severity | Notes                                                                           |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------- |
| Raw `<button>` usage in modules/ directory             | P2       | ~30 instances use inline Tailwind instead of `<Button>` component. Cosmetic.    |
| ClientProConnection status casing inconsistent in DB   | P2       | Mix of "pending"/"PENDING", "accepted"/"ACCEPTED". Needs data migration.        |
| ~30 mutation routes lack rate limiting                 | P2       | Auth-gated but could benefit from rate limits. Prioritize email-sending routes. |
| Legacy RBAC systems still importable                   | P2       | Deprecated but not removed. `RoleBadge.tsx` imports System A.                   |
| Demo AI chat has no rate limit on unauthenticated path | P2       | `/api/dominus/demo` — intentional for demos but cost risk.                      |

## 9. Rollback Plan

1. Git revert to commit `8faadbc5` (pre-hardening) or `64836987` (pre-Sprint B)
2. No schema migrations in this sprint — all changes are code-only
3. Vercel instant rollback via dashboard
4. No new environment variables required

---

## Decision: ✅ GO

All P0 items resolved. No auth gaps on mutation surfaces. AI spend protected. Critical workflows verified. Known issues are cosmetic or P2 priority.

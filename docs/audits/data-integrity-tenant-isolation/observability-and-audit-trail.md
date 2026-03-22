# Observability & Audit Trail Audit

## Logger Coverage

### Structured Logger Usage

The platform has a structured logger at `src/lib/logger.ts` (Sentry-integrated, tag format `[MODULE_ACTION]`).

### Pattern Distribution (Estimated)

| Pattern                                 | Routes Using | % of Total |
| --------------------------------------- | ------------ | ---------- |
| `logger.info/error/warn` (structured)   | ~50 routes   | ~35%       |
| `console.log/error/warn` (unstructured) | ~90 routes   | ~60%       |
| No logging at all                       | ~10 routes   | ~5%        |

### Key Gaps

- Most AI routes use `console.log` instead of structured logger
- Upload routes generally lack logging
- Portal routes have minimal logging
- Financial routes have good structured logging

---

## Silent Failure Map

### Empty Catch Blocks — 42+ Instances

| Category                | File                                                  | What's Swallowed                          |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------- |
| **API: Claim Mutation** | `claims/[claimId]/mutate/route.ts` L257, L293, L307   | Mutation side-effects, notification sends |
| **API: Email Retry**    | `cron/email-retry/route.ts` L106                      | Email retry failure                       |
| **API: Final Payout**   | `claims/[claimId]/final-payout/actions/route.ts` L365 | Payout action error                       |
| **API: PDF Retry**      | `weather/report/[reportId]/retry-pdf/route.ts` L164   | PDF retry error                           |
| **API: Various**        | Multiple webhook routes                               | JSON body parsing errors                  |
| **Auth/RBAC**           | `src/lib/rbac.ts` L62, L268                           | Owner email check, permission check       |
| **Feature Flags**       | `src/lib/flags.ts` L58, L80, L99                      | Three empty catches — flags fail silently |
| **AI Vision**           | `src/lib/ai/vision/*.ts` (6 files)                    | Redis cache reads AND writes              |
| **Organizations**       | `src/lib/organizations.ts` L65, L83, L100             | Three empty catches — org resolution      |
| **Client Hooks**        | `src/hooks/useClaim.ts` L6                            | Claim fetching                            |
| **AI Agents**           | Agent modules                                         | Agent error handling                      |
| **Ask Dominus**         | `ask-dominus/route.ts` L25                            | Chat error                                |

### Fire-and-Forget Patterns — 24+ Instances

| File                                                  | What's Fire-and-Forgot         |
| ----------------------------------------------------- | ------------------------------ |
| `claims/[claimId]/mutate/route.ts` L307               | Notification send              |
| `team/invitations/route.ts` L141                      | Invitation email               |
| `claims/[claimId]/documents/route.ts` L180            | ClaimIQ readiness hook         |
| `claims/[claimId]/photos/route.ts` L273               | ClaimIQ readiness hook         |
| `claims/[claimId]/update/route.ts` L252               | ClaimIQ readiness hook         |
| `claims/[claimId]/weather/quick-verify/route.ts` L281 | Weather verified hook          |
| `claims/[claimId]/attach-contact/route.ts` L117       | Contact attachment side-effect |
| `report-templates/[id]/route.ts` L29                  | Template cleanup               |
| Rate limit tracking                                   | Rate limit counter updates     |
| ClaimIQ `persistReadinessEvent`                       | Core claim intelligence data   |
| AI cache stats                                        | Cache performance tracking     |
| Client auth tracking                                  | Client auth audit              |
| Closeout notifications                                | Job closeout notification      |
| Message actions                                       | Message side-effects           |

---

## Audit Trail Coverage

### Audit Event Creation

| Operation              | Creates Audit Event? | Location                                     |
| ---------------------- | -------------------- | -------------------------------------------- |
| Claim create           | ✅ Yes               | Via `claims/route.ts`                        |
| Claim update           | ✅ Yes               | Via `claims/[claimId]/mutate/route.ts`       |
| Claim delete           | ✅ Yes               | Via `withOrgScope` wrapper                   |
| Report generate        | ✅ Yes               | Via `reports/generate/route.ts`              |
| User login             | ❌ No                | Clerk handles — no DB audit event            |
| User role change       | ❌ No                | No audit logging on RBAC changes             |
| Permission change      | ❌ No                | No audit logging                             |
| File upload            | ❌ No                | No audit event on file uploads               |
| File download          | ❌ No                | No audit event on downloads                  |
| File delete            | ❌ No                | No audit event                               |
| Team member add/remove | ❌ No                | No explicit audit event                      |
| Billing change         | ❌ No                | Stripe webhooks — no internal audit          |
| AI operation           | ✅ Partial           | Some AI routes log via `ai_performance_logs` |
| Portal access          | ❌ No                | No audit trail for portal activity           |
| Export data            | ❌ No                | No audit event for data exports              |
| Settings change        | ❌ No                | No audit event                               |

### Critical Operations Without Audit Trail 🔴

1. **User permission/role changes** — No record of who changed what access
2. **File uploads/downloads** — No record of who accessed what files
3. **Team member management** — No record of membership changes
4. **Billing operations** — Internal audit missing (Stripe has it)
5. **Data exports** — No record of bulk data exports (data exfiltration risk)
6. **Portal access** — No record of client portal activity
7. **Settings changes** — No record of configuration modifications

---

## Sentry Integration

### Coverage

| Area                      | Sentry Integration | Notes                                       |
| ------------------------- | ------------------ | ------------------------------------------- |
| `instrumentation.ts`      | ✅                 | Sentry.init with tracing                    |
| `instrumentation-edge.ts` | ✅                 | Edge runtime Sentry                         |
| `sentry.server.config.ts` | ✅                 | Server-side config                          |
| `sentry.edge.config.ts`   | ✅                 | Edge config                                 |
| Cron routes               | ✅                 | Error capture on cron failures              |
| API routes (general)      | ⚠️ Partial         | Some routes capture, many don't             |
| Empty catch blocks        | ❌                 | 42+ errors swallowed before reaching Sentry |
| Client-side errors        | ⚠️ Unclear         | `instrumentation-client.ts` exists          |

### Gap: Empty catches prevent Sentry from seeing errors

The 42+ empty catch blocks mean Sentry never knows about those failures. This creates a false sense of platform health.

---

## Health Monitoring

| Endpoint                | Purpose            | Status        |
| ----------------------- | ------------------ | ------------- |
| `/api/health`           | Basic health check | ✅ Exists     |
| `/api/health/live`      | Liveness probe     | ✅ Exists     |
| `/api/health/ready`     | Readiness probe    | ⚠️ May exist  |
| Vercel analytics        | Platform metrics   | ✅ Configured |
| Custom metrics endpoint | Business metrics   | ❌ None       |

---

## Top 15 Observability Issues

| #   | Severity | Issue                                                                        |
| --- | -------- | ---------------------------------------------------------------------------- |
| 1   | 🔴 P0    | 42+ empty catch blocks hide errors from Sentry — false health picture        |
| 2   | 🔴 P0    | Auth/RBAC failures caught and swallowed — security-relevant errors invisible |
| 3   | 🔴 P0    | Org resolution fails silently (3 catches) — downstream null orgId            |
| 4   | 🟠 P1    | No audit trail for user role/permission changes                              |
| 5   | 🟠 P1    | No audit trail for file access (upload/download/delete)                      |
| 6   | 🟠 P1    | No audit trail for data exports — exfiltration risk                          |
| 7   | 🟠 P1    | Feature flags fail silently — unpredictable feature state                    |
| 8   | 🟠 P1    | 24+ fire-and-forget operations — failures invisible                          |
| 9   | 🟠 P1    | ClaimIQ readiness events fire-and-forget — core intelligence lost            |
| 10  | 🟡 P2    | ~60% of routes use console.log instead of structured logger                  |
| 11  | 🟡 P2    | AI vision Redis cache fails silently (6 modules)                             |
| 12  | 🟡 P2    | No business metrics endpoint — can't monitor KPIs                            |
| 13  | 🟡 P2    | Portal activity has no logging or audit trail                                |
| 14  | 🟡 P2    | Rate limit tracking failures swallowed                                       |
| 15  | 🟡 P3    | No alerting on critical failure patterns                                     |

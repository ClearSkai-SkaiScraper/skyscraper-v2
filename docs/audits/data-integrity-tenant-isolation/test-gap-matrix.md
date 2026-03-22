# Test Gap Matrix

## Current Test Inventory — 35 Test Files

### Auth & Security Tests (11 files)

| File                                         | What It Tests             | Tenant Isolation? |
| -------------------------------------------- | ------------------------- | ----------------- |
| `__tests__/auth-hardening.test.ts`           | Auth hardening patterns   | ✅                |
| `__tests__/auth-routing.test.ts`             | Auth routing logic        | Partial           |
| `__tests__/auth-enforcement.test.ts`         | Auth enforcement          | ✅                |
| `__tests__/after-sign-in-routing.test.ts`    | Post-sign-in redirects    | ❌                |
| `__tests__/cross-org-isolation.test.ts`      | Cross-org data isolation  | ✅                |
| `__tests__/cross-tenant-security.test.ts`    | Cross-tenant security     | ✅                |
| `__tests__/tenant-guard.test.ts`             | Tenant guard utility      | ✅                |
| `__tests__/security-hardening.test.ts`       | Security patterns         | ✅                |
| `__tests__/vector-tenant-isolation.test.ts`  | pgvector tenant isolation | ✅                |
| `__tests__/middleware.comprehensive.test.ts` | Middleware routing        | Partial           |
| `__tests__/middleware.redirect.test.ts`      | Middleware redirects      | Partial           |

### Library Tests (10 files)

| File                                          | What It Tests               |
| --------------------------------------------- | --------------------------- |
| `__tests__/lib/auth-guard.test.ts`            | Auth guard utility          |
| `__tests__/lib/rate-limit.test.ts`            | Rate limiting               |
| `__tests__/lib/email.test.ts`                 | Email utilities             |
| `__tests__/lib/claim-velocity.test.ts`        | Claim velocity calculations |
| `__tests__/lib/domain-services.test.ts`       | Domain service layer        |
| `__tests__/lib/quickbooks.test.ts`            | QuickBooks integration      |
| `__tests__/lib/migrations.test.ts`            | Migration engine            |
| `__tests__/lib/migration-engine.test.ts`      | Migration engine v2         |
| `__tests__/lib/materials-estimator.test.ts`   | Materials estimator         |
| `__tests__/lib/billing-guard.test.ts`         | Billing guard               |
| `__tests__/lib/observability-tracing.test.ts` | Observability               |
| `__tests__/lib/recommendation-engine.test.ts` | Recommendation engine       |

### AI Tests (3 files)

| File                                                      | What It Tests                  |
| --------------------------------------------------------- | ------------------------------ |
| `src/lib/ai/__tests__/buildAIContentFromTemplate.test.ts` | AI template content generation |
| `src/lib/ai/__tests__/validateAndRetry.test.ts`           | AI validation and retry        |
| `__tests__/ai-zod-coverage.test.ts`                       | AI Zod schema coverage         |

### Intelligence Tests (2 files)

| File                                            | What It Tests               |
| ----------------------------------------------- | --------------------------- |
| `__tests__/intelligence/barrel-exports.test.ts` | Intelligence module exports |
| `__tests__/intelligence/tuning-config.test.ts`  | Tuning configuration        |

### Integration/E2E Tests (4 files)

| File                                        | What It Tests           |
| ------------------------------------------- | ----------------------- |
| `__tests__/api/auth-matrix.test.ts`         | API auth matrix         |
| `__tests__/api/integrations-status.test.ts` | Integration health      |
| `__tests__/api/webhooks/stripe.test.ts`     | Stripe webhook handling |
| `__tests__/e2e/batfEngine.test.ts`          | BATF engine flow        |
| `__tests__/e2e/carrierSupplement.test.ts`   | Carrier supplement flow |

### Other (2 files)

| File                                                | What It Tests             |
| --------------------------------------------------- | ------------------------- |
| `__tests__/org-account-state-machine.test.ts`       | Org account state machine |
| `src/lib/compliance/__tests__/code-checker.test.ts` | Compliance code checking  |

---

## Critical Test Gaps — Features With NO Tests 🔴

| Feature Area             | Routes/Files                           | Risk                                            | Priority |
| ------------------------ | -------------------------------------- | ----------------------------------------------- | -------- |
| **Claim CRUD**           | `/api/claims` (POST/GET/PATCH/DELETE)  | 🔴 Core business feature — no route-level tests | P0       |
| **File Upload**          | 20+ upload routes                      | 🔴 No upload route tests at all                 | P0       |
| **Report Generation**    | `/api/reports/generate`, report routes | 🔴 No report generation tests                   | P0       |
| **Portal Client Auth**   | Portal auth flow                       | 🔴 No portal auth tests                         | P0       |
| **Portal CRUD**          | Portal claim/document/photo routes     | 🔴 No portal route tests                        | P0       |
| **AI Damage Analysis**   | `/api/ai/damage/analyze` and variants  | 🔴 No AI analysis route tests                   | P1       |
| **Weather Verification** | `/api/weather/verify`                  | 🟠 No weather flow tests                        | P1       |
| **Team Management**      | `/api/team/invitations`, members       | 🟠 No team management tests                     | P1       |
| **Billing/Subscription** | `/api/billing/*`, Stripe flows         | 🟠 Only webhook test, no billing flow tests     | P1       |
| **Contact Management**   | `/api/contacts` CRUD                   | 🟠 No contact CRUD tests                        | P1       |
| **Lead Management**      | `/api/leads` CRUD                      | 🟠 No lead CRUD tests                           | P1       |
| **Message/Thread**       | `/api/messages/*`                      | 🟠 No messaging tests                           | P1       |
| **Notifications**        | `/api/notifications/*`                 | 🟡 No notification tests                        | P2       |
| **Export/Download**      | `/api/export/*`                        | 🟡 No export tests                              | P2       |
| **Branding**             | `/api/branding/*`                      | 🟡 No branding tests                            | P2       |

---

## Required Tests Before DAU

### Tier 1: Must Have (Block DAU)

| Test                      | Type        | Purpose                                              |
| ------------------------- | ----------- | ---------------------------------------------------- |
| Cross-tenant claim CRUD   | Integration | Verify org A cannot read/write org B's claims        |
| Cross-tenant file access  | Integration | Verify org A cannot access org B's files             |
| Write path org validation | Unit        | Every POST/PATCH/DELETE validates orgId from session |
| Read path org filtering   | Unit        | Every GET includes orgId in WHERE clause             |
| Portal token isolation    | Integration | Portal tokens scoped to correct client+org           |
| Worker tenant context     | Unit        | All workers receive and validate orgId               |
| Public URL access         | E2E         | Verify file access controls                          |

### Tier 2: Should Have

| Test                     | Type        | Purpose                                 |
| ------------------------ | ----------- | --------------------------------------- |
| Auth pattern consistency | Unit        | All routes use appropriate auth tier    |
| Silent failure detection | Unit        | No empty catch blocks on critical paths |
| RBAC enforcement         | Integration | Role hierarchy enforced correctly       |
| Audit trail creation     | Integration | Critical operations create audit events |
| Rate limit per-org       | Unit        | Org-level rate limiting works           |

### Tier 3: Nice to Have

| Test                       | Type        | Purpose                                |
| -------------------------- | ----------- | -------------------------------------- |
| Cascade delete safety      | Integration | Org deletion doesn't leak data         |
| Embedding tenant isolation | Integration | Vector search respects org boundaries  |
| Concurrent access          | Load        | Multiple orgs accessing simultaneously |
| Data export isolation      | Integration | Exports only include own org data      |

---

## Coverage Score: 30/100

### Breakdown

- **Auth/Security**: 50% covered (11 files, good but unit-level only)
- **Core CRUD**: 5% covered (no route-level tests)
- **File/Upload**: 0% covered
- **AI/ML**: 15% covered (3 files, template-level only)
- **Portal**: 0% covered
- **Billing**: 10% covered (webhook test only)
- **Integration**: 10% covered (2 e2e files)
- **Messaging**: 0% covered
- **Reports**: 0% covered

---

## Top 15 Test Gap Issues

| #   | Severity | Issue                                                         |
| --- | -------- | ------------------------------------------------------------- |
| 1   | 🔴 P0    | No cross-tenant integration tests for claim CRUD              |
| 2   | 🔴 P0    | No file upload/download access control tests                  |
| 3   | 🔴 P0    | No report generation tests                                    |
| 4   | 🔴 P0    | No portal auth flow tests                                     |
| 5   | 🔴 P0    | No route-level tests for core claim operations                |
| 6   | 🟠 P1    | No AI route-level tests (damage analysis, etc.)               |
| 7   | 🟠 P1    | No weather verification flow tests                            |
| 8   | 🟠 P1    | No team management tests                                      |
| 9   | 🟠 P1    | No billing flow tests beyond webhooks                         |
| 10  | 🟠 P1    | No messaging system tests                                     |
| 11  | 🟡 P2    | No notification delivery tests                                |
| 12  | 🟡 P2    | No export/download tests                                      |
| 13  | 🟡 P2    | No branding tests                                             |
| 14  | 🟡 P2    | No load/concurrent tests                                      |
| 15  | 🟡 P2    | Existing tests are mostly unit-level — need integration tests |

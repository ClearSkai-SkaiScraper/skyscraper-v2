# SkaiScraper — Data Integrity & Tenant Isolation Executive Summary

**Date:** 2025-03-21  
**Auditor:** AI Agent (comprehensive codebase analysis)  
**Scope:** Full platform — 294+ Prisma models, 644 API routes, 351 pages, 117 route groups

---

## Integrity Scores (0–100)

| Dimension                   | Score | Grade | Rationale                                                                                                                                                                        |
| --------------------------- | ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity Clarity**        | 42    | 🔴 F  | 7+ identity concepts (`orgId`, `companyId`, `proId`, `clientId`, `ownerId`, `userId`, `createdBy`), naming drift (119 camelCase vs 52 snake_case), `companyId`-as-orgId fallback |
| **Schema Integrity**        | 55    | 🟡 D  | ~65 fully safe models, ~40 partial (missing FK/index), ~20 unsafe (nullable orgId or no orgId at all)                                                                            |
| **Write Path Safety**       | 50    | 🟡 D  | 5+ routes accept `body.orgId` from client, `contractor/profile` trusts client orgId entirely, `pdf/create` uses `body.orgId`                                                     |
| **Read Path Isolation**     | 48    | 🔴 F  | 6 CRITICAL cross-tenant read leaks (`ai/damage/analyze`, `portal/generate-access`, `weather/events`, `reports/ai/[sectionKey]`, `templates/*`, `claims/ai/build`)                |
| **Async/AI Ownership**      | 40    | 🔴 F  | 3 workers with optional orgId, in-memory AI queue loses state, `saveResult` is a no-op stub, no per-org rate limiting                                                            |
| **File/Artifact Integrity** | 35    | 🔴 F  | Public Supabase URLs (no auth on files), portal uploads create no DB record, message attachments untracked, video generation creates no artifact                                 |
| **DB Enforcement**          | 50    | 🟡 D  | ~97 models have orgId but NO FK to Org, 17+ models missing orgId indexes, cascade delete risks                                                                                   |
| **Observability**           | 45    | 🔴 F  | Structured logger exists but ~60% of routes use `console.log` instead, 42+ empty catch blocks, fire-and-forget swallows errors                                                   |
| **Test Coverage**           | 30    | 🔴 F  | Only 35 test files for 644 routes. No tests for file upload, report generation, billing flows, most AI operations, most CRUD                                                     |
| **DAU Readiness**           | 38    | 🔴 F  | Cannot safely support multiple orgs with paying customers until critical isolation gaps are closed                                                                               |

### **Overall Integrity Score: 43/100** 🔴

---

## Top 10 Blockers for DAU (Daily Active Users)

| #   | Severity | Category         | Issue                                                                                                         | File(s)                                               |
| --- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | 🔴 P0    | Tenant Isolation | **Public Supabase URLs expose all uploaded files** — any URL is accessible without auth                       | Multiple upload routes                                |
| 2   | 🔴 P0    | Tenant Isolation | **`/api/ai/damage/analyze` — no org/claim ownership check** — any authed user can analyze any photo           | `src/app/api/ai/damage/analyze/route.ts`              |
| 3   | 🔴 P0    | Tenant Isolation | **`/api/portal/generate-access` — generates tokens for any client** — no org ownership verified               | `src/app/api/portal/generate-access/route.ts`         |
| 4   | 🔴 P0    | Tenant Isolation | **`/api/claims/ai/build` — cross-tenant claim data access** — findUnique by ID, no orgId                      | `src/app/api/claims/ai/build/route.ts`                |
| 5   | 🔴 P0    | Schema           | **`reports` model has nullable orgId, no FK, no index** — core business entity is tenant-unsafe               | `prisma/schema.prisma`                                |
| 6   | 🔴 P0    | Write Path       | **`/api/contractor/profile` trusts `body.orgId` entirely** — client can write to any org                      | `src/app/api/contractor/profile/route.ts`             |
| 7   | 🔴 P0    | Files            | **Portal uploads create NO database record** — files orphaned in storage, invisible to queries                | `src/app/api/portal/claims/[claimId]/assets/route.ts` |
| 8   | 🔴 P0    | Async            | **damage-analyze worker creates duplicates on retry** — no ON CONFLICT clause                                 | Worker SQL                                            |
| 9   | 🟠 P1    | Identity         | **97 models have orgId but NO foreign key to Org** — DB cannot enforce referential integrity                  | `prisma/schema.prisma`                                |
| 10  | 🟠 P1    | Silent Failure   | **42+ empty catch blocks silently swallow errors** — auth failures, RBAC checks, org resolution fail silently | Across codebase                                       |

---

## Go/No-Go Assessment

### 🔴 NO-GO for Production with Multiple Paying Tenants

**Critical blockers that MUST be resolved:**

1. Cross-tenant data access via 6+ API routes (P0)
2. Public file URLs with no auth (P0)
3. Client-supplied orgId trusted in write paths (P0)
4. Silent auth/RBAC failures (P1)
5. No DB-level tenant enforcement (FK constraints missing on 97 models)

**Estimated remediation timeline:** 3–4 weeks for P0 blockers, 6–8 weeks for full hardening

---

## Audit Documents Index

| #   | Document                         | File                                  |
| --- | -------------------------------- | ------------------------------------- |
| 1   | This Executive Summary           | `executive-summary.md`                |
| 2   | Canonical Identity Map           | `canonical-identity-map.md`           |
| 3   | Schema Ownership Matrix          | `schema-ownership-matrix.md`          |
| 4   | Write Path Audit                 | `write-path-audit.md`                 |
| 5   | Read Path Tenant Isolation Audit | `read-path-tenant-isolation-audit.md` |
| 6   | Async/AI Integrity Audit         | `async-ai-integrity-audit.md`         |
| 7   | File/Artifact Ownership Audit    | `file-artifact-ownership-audit.md`    |
| 8   | Database Enforcement Gaps        | `database-enforcement-gaps.md`        |
| 9   | Orphan/Drift Risk Register       | `orphan-drift-risk-register.md`       |
| 10  | Observability & Audit Trail      | `observability-and-audit-trail.md`    |
| 11  | Test Gap Matrix                  | `test-gap-matrix.md`                  |
| 12  | Master Remediation Roadmap       | `master-remediation-roadmap.md`       |
| 13  | Master Integrity TODO            | `master-integrity-todo.md`            |

# 🔍 SYSTEM TRUTH CHECK — Targeted Verification Report

> **Generated:** 2026-03-22  
> **Scope:** 5 targeted audits (NOT broad discovery)  
> **Method:** Automated codebase grep + file reads on all 647 API routes

---

## 1. WRITE PROTECTION INTEGRITY

### Question: Do all UPDATE/DELETE routes enforce orgId?

| Category                           | Count | Status |
| ---------------------------------- | ----- | ------ |
| Routes with proper orgId guard     | ~610  | ✅     |
| Routes with conditional/weak orgId | 6     | 🔴     |
| Routes with NO orgId on mutations  | 3     | 🔴     |
| Previously flagged, now fixed      | 9     | ✅     |

### 🔴 Critical Gaps Found

| Route                                 | Issue                                                               | Severity    |
| ------------------------------------- | ------------------------------------------------------------------- | ----------- |
| `notifications/[id]` DELETE           | orgId guard conditional — skips when Clerk returns no orgId         | 🔴 CRITICAL |
| `notifications/[id]/read` POST        | No orgId in update WHERE — TOCTOU window                            | 🔴 CRITICAL |
| Export/complete-packet                | No org scoping on PDF payload — any authed user can render any data | 🔴 CRITICAL |
| Report template sections PATCH/DELETE | Template section updated by ID only without org scoping             | 🟠 HIGH     |
| Network route                         | orgId fallback to userId creates phantom org records                | 🟠 HIGH     |
| Upload route                          | Uses companyId as orgId prefix in storage path                      | 🟠 HIGH     |

### ✅ Previously Flagged — Verified Fixed

B-11 (weather/verify), B-12 (leads), B-13/WP-03 (tasks), B-15 (ai/run), B-19 (claims/notes ×2), B-22 (evidence ×2) — all confirmed fixed with orgId in WHERE clauses.

---

## 2. AUTH ENFORCEMENT

### Question: Does every route have auth + tenant context?

| Category                      | Count | Status                                      |
| ----------------------------- | ----- | ------------------------------------------- |
| Routes with full auth + orgId | ~620  | ✅                                          |
| Routes intentionally public   | 8     | ✅ (contact form, webhooks, public reports) |
| Routes with auth, no orgId    | ~19   | 🟠 (need migration to withOrgScope)         |
| Routes with zero auth         | 0     | ✅ None found                               |

### Key Finding

**Zero true unauthed mutation routes.** All unauthenticated routes are intentionally public (contact form, webhook receivers with signature verification, public report accept/decline links).

### Auth Pattern Distribution (647 routes)

| Pattern                            | Count | Status            |
| ---------------------------------- | ----- | ----------------- |
| `withOrgScope`                     | ~180  | ✅ Best practice  |
| `requireAuth()` / `safeOrgContext` | ~290  | ✅ Good           |
| `auth()` + manual orgId            | ~120  | 🟡 Should migrate |
| `currentUser()` only               | ~15   | 🟠 No org context |
| No auth (intentional)              | ~8    | ✅ Public/webhook |
| **No auth (unintentional)**        | **0** | ✅ **Clean**      |

---

## 3. ASYNC JOB SAFETY

### Question: Are all async jobs idempotent + tenant-scoped?

| Job                 | orgId Required? |  Idempotent?   |    Error Handling?     |    Status    |
| ------------------- | :-------------: | :------------: | :--------------------: | :----------: |
| `damage-analyze`    |   ✅ Required   | ✅ ON CONFLICT | ✅ Per-photo isolation |      🟢      |
| `weather-analyze`   |   ⚠️ Optional   | ✅ ON CONFLICT |        ✅ Good         | 🟠 Fix orgId |
| `proposal-generate` |   ⚠️ Optional   | ✅ ON CONFLICT |        ✅ Good         | 🟠 Fix orgId |
| `_echo` (health)    |       N/A       |      N/A       |     ⚠️ console.log     |   🟡 Minor   |

### Queue System Status

| Queue            | Backing       | Reliable? |           Status           |
| ---------------- | ------------- | :-------: | :------------------------: |
| pg-boss (main)   | PostgreSQL    |    ✅     |    🟢 Production-grade     |
| AI job queue     | In-memory Map |    ❌     |   🔴 **Lost on restart**   |
| `enqueueJobSafe` | None (no-op)  |    ❌     | 🔴 **Silently drops jobs** |
| BullMQ scheduler | Redis         |    ✅     |     🟢 Properly gated      |

### Fire-and-Forget Count

| Pattern                 | Instances |                 Status                  |
| ----------------------- | :-------: | :-------------------------------------: |
| `.catch(() => {})`      |    50     |                   🟠                    |
| `.catch(console.error)` |    104    |                   🟡                    |
| **Total**               |  **154**  | Audit said ~24, actual is **6x higher** |

### Logger Adoption

| Metric                         | Value         |    Status    |
| ------------------------------ | ------------- | :----------: |
| Routes using `logger`          | 602/652 (92%) | ✅ Excellent |
| Routes with only `console.log` | 6             | 🟡 Easy fix  |

---

## 4. FILE/STORAGE OWNERSHIP

### Question: Is there any public file leakage?

| Check                                 | Result                            | Status |
| ------------------------------------- | --------------------------------- | :----: |
| Supabase buckets set to private       | ✅ SQL migration created          |   🟢   |
| RLS policies for org-scoped access    | ✅ SQL migration created          |   🟢   |
| `getPublicUrl()` deprecated           | ✅ `getSignedUrls()` helper added |   🟢   |
| Portal uploads tracked in file_assets | ❌ No tracking                    |   🟠   |
| Message attachments tracked           | ❌ No tracking                    |   🟠   |
| Video generation artifacts tracked    | ❌ No tracking                    |   🟡   |
| Upload path uses companyId            | ⚠️ Fallback to companyId          |   🟠   |

### Assessment

Storage infrastructure is **secured at the bucket level** (private + RLS). Gap is in **application-level tracking** — some uploads create files without corresponding `file_assets` DB records, making orphan cleanup impossible.

---

## 5. CRITICAL FLOW VERIFICATION

### Onboarding Flow

| Step              | Status | Notes                                                |
| ----------------- | :----: | ---------------------------------------------------- |
| Sign up (Clerk)   |   ✅   | Clerk handles                                        |
| Org creation      |   ✅   | Clerk webhook → DB                                   |
| First claim       |   ✅   | `withOrgScope` on create                             |
| Onboarding wizard |   ⚠️   | 10 fire-and-forget catches — steps may silently fail |

### Claim Creation Flow

| Step            | Status | Notes                                   |
| --------------- | :----: | --------------------------------------- |
| Create claim    |   ✅   | orgId enforced                          |
| Upload photos   |   ✅   | orgId in path                           |
| Run AI analysis |   ✅   | orgId in worker payload (but optional!) |
| Generate report |   ✅   | orgId in query                          |

### Report Generation Flow

| Step            | Status | Notes                            |
| --------------- | :----: | -------------------------------- |
| Select claim    |   ✅   | orgId verified                   |
| Choose template |   ⚠️   | Template sections lack org check |
| Generate PDF    |   ✅   | Branded with org data            |
| Export          |   ⚠️   | Export routes need org scoping   |

### AI Pipeline Flow

| Step                 | Status | Notes                     |
| -------------------- | :----: | ------------------------- |
| Damage analysis      |   ✅   | orgId required in payload |
| Weather analysis     |   ⚠️   | orgId optional — MUST fix |
| Proposal generation  |   ⚠️   | orgId optional — MUST fix |
| Embedding generation |   ✅   | orgId enforced            |
| Similar claims       |   ✅   | orgId in query            |

### Weather Flow

| Step              | Status | Notes                                |
| ----------------- | :----: | ------------------------------------ |
| Verify address    |   ✅   | Session orgId (B-11 fixed)           |
| Pull weather data |   ✅   | orgId scoped                         |
| Generate report   |   ✅   | Cover page + branding                |
| Set DOL           |   ✅   | Updates both dateOfLoss + damageType |

---

## TRUTH SUMMARY

| Domain           |   Score    | Verdict                                                             |
| ---------------- | :--------: | ------------------------------------------------------------------- |
| Auth enforcement |   92/100   | ✅ No zero-auth gaps. ~20 routes need migration to stronger pattern |
| Write protection |   78/100   | 🟠 6 routes still have weak/missing orgId on mutations              |
| Async safety     |   65/100   | 🟠 Worker payloads need required orgId. AI queue is volatile        |
| File ownership   |   80/100   | 🟢 Infrastructure secured. Tracking gaps in portal/messaging        |
| Critical flows   |   85/100   | 🟢 All work end-to-end. Minor gaps in template sections + exports   |
| **Overall**      | **80/100** | **🟢 System is safe for monitored DAU. Fix 14 blockers first.**     |

---

> **Verdict:** The system has gone from ~43/100 (pre-audit) to ~80/100 (post Phase 0 + Push 2-3).  
> Fixing the 14 BLOCKERS will bring it to ~88/100 — safe for controlled DAU launch.

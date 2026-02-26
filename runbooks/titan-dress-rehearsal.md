# Titan Dress Rehearsal Runbook

> **Purpose:** Validate full platform readiness through simulated real-world usage  
> **Run this TWICE** before DAU launch: once with clean data, once with messy data  
> **Estimated time:** 45–60 minutes per run

---

## Prerequisites

- [ ] Staging environment deployed and accessible
- [ ] Test Stripe account configured (use `4242 4242 4242 4242`)
- [ ] Test Clerk account(s) ready
- [ ] Database seeded (clean or production-like, depending on run)
- [ ] Smoke test script ready (`scripts/smoke-test.mjs`)

---

## Run 1: Clean Data 🧹

### Phase 1 — Onboarding (15 min)

| Step | Action                          | Expected                                  | ✅  |
| ---- | ------------------------------- | ----------------------------------------- | --- |
| 1.1  | Navigate to sign-up page        | Page loads, Clerk widget renders          |     |
| 1.2  | Create new account              | Account created, redirected to onboarding |     |
| 1.3  | Complete org setup (name, type) | Organization created in DB                |     |
| 1.4  | Upload company branding (logo)  | Logo uploaded and displayed in sidebar    |     |
| 1.5  | Invite a team member            | Invitation email sent (check Resend logs) |     |
| 1.6  | Accept invite in incognito      | Second user can access org dashboard      |     |

### Phase 2 — Core Workflow (20 min)

| Step | Action                      | Expected                               | ✅  |
| ---- | --------------------------- | -------------------------------------- | --- |
| 2.1  | Create new claim            | Claim appears in claims list           |     |
| 2.2  | Add homeowner contact       | Contact linked to claim                |     |
| 2.3  | Upload property photos (3+) | Photos process and display in gallery  |     |
| 2.4  | Generate inspection report  | Report generates, PDF downloadable     |     |
| 2.5  | Send message to homeowner   | Message appears in thread              |     |
| 2.6  | Close the claim             | Status updates, reflected in dashboard |     |

### Phase 3 — Billing (10 min)

| Step | Action                        | Expected                  | ✅  |
| ---- | ----------------------------- | ------------------------- | --- |
| 3.1  | Navigate to billing settings  | Current plan displayed    |     |
| 3.2  | Initiate checkout (test card) | Stripe checkout completes |     |
| 3.3  | Verify webhook received       | Subscription active in DB |     |
| 3.4  | Check token balance           | Tokens credited to org    |     |

### Phase 4 — Analytics & Support (10 min)

| Step | Action                     | Expected                      | ✅  |
| ---- | -------------------------- | ----------------------------- | --- |
| 4.1  | Open Performance Dashboard | Claims metrics displayed      |     |
| 4.2  | Export analytics (CSV)     | CSV downloads with data       |     |
| 4.3  | Submit feedback via widget | Feedback stored in activities |     |
| 4.4  | Submit bug report          | Bug report recorded           |     |
| 4.5  | Check Go/No-Go page        | All critical checks pass      |     |

---

## Run 2: Messy Data 🗑️

Repeat all steps from Run 1 but with these additional chaos scenarios:

### Chaos Injections

| Scenario                  | How to Simulate                          | Expected Recovery                      |
| ------------------------- | ---------------------------------------- | -------------------------------------- |
| **Incomplete onboarding** | Start onboarding, close tab at step 3    | User can resume where they left off    |
| **Failed file upload**    | Upload a 0-byte file or corrupt JPEG     | Graceful error message, no crash       |
| **Session expiry**        | Clear cookies mid-workflow               | Redirect to sign-in, then back to page |
| **Network blip**          | Toggle Wi-Fi off for 5 seconds           | Retry mechanism kicks in, no data loss |
| **Duplicate submission**  | Double-click submit on claim form        | Only one claim created (idempotent)    |
| **Invalid data entry**    | Enter SQL injection in claim notes       | Input sanitized, no DB error           |
| **Large file upload**     | Upload 50MB+ file                        | Size limit error shown gracefully      |
| **Concurrent editing**    | Two users edit same claim simultaneously | Last write wins, no corruption         |

### Post-Chaos Validation

- [ ] No 500 errors in Sentry
- [ ] All claims data intact (run `scripts/verify-backups.mjs`)
- [ ] User can still complete full workflow after each chaos event
- [ ] No orphaned records in database

---

## Rollback Test

After completing Run 2:

1. [ ] Note current deployment URL
2. [ ] Deploy a "broken" version (e.g., bad env var)
3. [ ] Execute rollback per `runbooks/rollback-plan.md`
4. [ ] Verify production health via smoke test
5. [ ] Verify all data from previous runs is intact

---

## Scoring

| Category       | Pass Criteria           | Run 1   | Run 2   |
| -------------- | ----------------------- | ------- | ------- |
| Onboarding     | All 6 steps complete    | /6      | /6      |
| Core Workflow  | All 6 steps complete    | /6      | /6      |
| Billing        | All 4 steps complete    | /4      | /4      |
| Analytics      | All 5 steps complete    | /5      | /5      |
| Chaos Recovery | All 8 scenarios handled | N/A     | /8      |
| Rollback       | Successful rollback     |         | /1      |
| **TOTAL**      |                         | **/21** | **/30** |

### Verdict

- **21/21 (Run 1) + 28+/30 (Run 2)** → ✅ **GO FOR LAUNCH**
- **Any critical failure** → 🔴 **Fix and re-run**
- **< 25/30 (Run 2)** → 🟡 **Review and decide**

---

## Sign-Off

| Role             | Name | Date | Go/No-Go |
| ---------------- | ---- | ---- | -------- |
| Engineering Lead |      |      |          |
| Product Owner    |      |      |          |
| QA Lead          |      |      |          |

---

_Document generated as part of Sprint 25 — Go/No-Go Release Control_

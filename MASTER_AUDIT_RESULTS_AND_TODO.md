# SkaiScraper — Master Audit Results & Execution TODO

**Generated:** April 17, 2026  
**Status:** Pre-release audit — all findings documented, prioritized, actionable

---

## AUDIT RESULTS SUMMARY

| Audit                   | Findings                                                     | Severity |
| ----------------------- | ------------------------------------------------------------ | -------- |
| Raw role comparisons    | **35 violations** across 14 files                            | 🔴 P0    |
| Tenant isolation        | **45 Prisma queries + 31 raw SQL** missing orgId             | 🔴 P0    |
| NEXT_REDIRECT swallowed | **0 violations** (all 5 instances properly re-throw)         | ✅ PASS  |
| exhaustive-deps         | **2 dangerous**, 15 risky, 75 safe                           | 🟠 P1    |
| Portal auth separation  | **3 portal files** use Clerk `auth()` instead of client auth | 🟠 P1    |
| JSX comment bugs        | **41 fixed** this session (0 remaining per typecheck)        | ✅ PASS  |
| TypeScript errors       | **0 errors** (typecheck clean)                               | ✅ PASS  |

---

## PHASE A — FIX TRUE BLOCKERS (P0)

### A1. Raw Role Comparisons — 35 violations in 14 files

**Rule:** Never compare roles with `===`. Use `isAdminRole()`, `isManagerOrAbove()`, `roleEquals()`, `roleIn()` from `src/lib/auth/roleCompare.ts`.

| #   | File                                                              | Line(s)          | Current Code                                             | Fix                                                                           |
| --- | ----------------------------------------------------------------- | ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `src/app/(app)/teams/CompanySeatsClient.tsx`                      | 129              | `m.role === "Admin" \|\| m.role === "admin"`             | `isAdminRole(m.role)`                                                         |
| 2   | `src/app/(app)/teams/actions.ts`                                  | 65, 67           | `dbUser.role === "ADMIN"` / `"MANAGER"`                  | `isAdminRole()` / `roleEquals(,"manager")`                                    |
| 3   | `src/app/(app)/teams/invite/page.tsx`                             | 202, 220, 238    | `role === "viewer"` / `"member"` / `"admin"`             | `roleEquals(role, "viewer")` etc. (UI-only, lower risk but still use helpers) |
| 4   | `src/app/api/trades/feed/route.ts`                                | 180              | `member?.role === "owner" \|\| member?.role === "admin"` | `isAdminRole(member?.role)`                                                   |
| 5   | `src/app/api/trades/company/join-requests/route.ts`               | 44-45, 239-240   | `membership.role === "owner" \|\| "admin"`               | `isAdminRole(membership.role)`                                                |
| 6   | `src/app/api/trades/company/route.ts`                             | 515-516, 582-583 | `membership.role === "admin" \|\| "owner"`               | `isAdminRole(membership.role)`                                                |
| 7   | `src/app/api/trades/company/actions/route.ts`                     | 172-173, 201-202 | `role === "admin"`                                       | `isAdminRole(role)`                                                           |
| 8   | `src/app/api/team/member/[memberId]/route.ts`                     | 254              | `role === "owner" \|\| role === "admin"`                 | `isAdminRole(role)`                                                           |
| 9   | `src/app/api/team/invitations/accept/route.ts`                    | 144              | `invitation.role === "admin" \|\| "org:admin"`           | `isAdminRole(invitation.role)`                                                |
| 10  | `src/app/api/admin/repair-user/route.ts`                          | 120, 123         | `membership.role === "org:admin"`                        | `isAdminRole(membership.role)`                                                |
| 11  | `src/app/api/messages/threads/route.ts`                           | 141              | `role === "client"`                                      | `roleEquals(role, "client")`                                                  |
| 12  | `src/components/team/CSVUploadDialog.tsx`                         | 418              | `row.role === "admin"`                                   | `isAdminRole(row.role)`                                                       |
| 13  | `src/lib/security/roles.ts`                                       | 159, 167, 175    | `role === "admin"` / `"contractor"` / `"adjuster"`       | Use roleEquals/roleIn                                                         |
| 14  | `src/lib/constants/modes.ts`                                      | 94               | `role === "admin" \|\| role.startsWith("org:admin")`     | `isAdminRole(role)`                                                           |
| 15  | `src/lib/acl.ts`                                                  | 22-23            | `role === "admin"` / `"manager"`                         | `roleEquals()`                                                                |
| 16  | `src/app/(app)/trades/groups/[slug]/_components/GroupMembers.tsx` | 37, 44           | `role === "admin"` / `"moderator"`                       | These are trades group roles (not org RBAC) — **REVIEW: may be intentional**  |
| 17  | `src/app/portal/claims/[claimId]/page.tsx`                        | 86               | `role === "EDITOR"`                                      | Portal access role — **REVIEW: may be intentional**                           |

**Excluded (safe):** AI chat `message.role === "user"/"assistant"` comparisons (~18 instances) — these are OpenAI message roles, not RBAC.

### A2. Tenant Isolation — 45 dangerous Prisma queries

**Rule:** Every query on a tenant-scoped model MUST include `orgId` in `where`.

#### P0 — Write operations without orgId (6 critical)

| #   | File                                                                 | Line     | Model.Method           | Fix                          |
| --- | -------------------------------------------------------------------- | -------- | ---------------------- | ---------------------------- |
| 1   | `src/app/api/claims/[claimId]/files/[fileId]/route.ts`               | 66       | `file_assets.update`   | Add `orgId` to where clause  |
| 2   | `src/app/api/claims/[claimId]/photos/[photoId]/annotations/route.ts` | 115, 190 | `file_assets.update`   | Add `orgId`                  |
| 3   | `src/app/api/claims/photos/[photoId]/annotations/route.ts`           | 141, 271 | `file_assets.update`   | Add `orgId`                  |
| 4   | `src/app/api/evidence/[assetId]/route.ts`                            | 37       | `file_assets.update`   | Add `orgId`                  |
| 5   | `src/app/api/trades/[id]/route.ts`                                   | 66       | `tradesCompany.update` | Add `orgId`                  |
| 6   | `src/app/api/client-portal/[slug]/profile/route.ts`                  | 125      | `client.update`        | Add `clientId` session check |

#### P1 — Read operations without orgId (39 instances)

| Category                                    | Count | Files                                           |
| ------------------------------------------- | ----- | ----------------------------------------------- |
| `file_assets.findMany` by claimId only      | 6     | claims-folder/sections, claims/[claimId]/photos |
| `client` queries by email/id only           | 13    | mutate, messages, invitations, portal           |
| `tradesCompany` unscoped reads              | 8     | trades/feed, trades/search, trades/company      |
| `tradesCompanyMember` writes by userId only | 12    | onboarding, join-requests, seats                |
| Raw SQL without org_id                      | 31    | Various (bids, notifications, cleanup)          |

### A3. NEXT_REDIRECT — ✅ PASS

All 5 instances of `redirect()` inside try/catch properly import `isRedirectError` and re-throw. **No action needed.**

---

## PHASE B — VERIFY HIGH PRIORITY (P1)

### B1. exhaustive-deps — 2 dangerous, fix immediately

| #   | File                                                      | Issue                                                                              | Fix                                                                  |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | `src/app/(app)/claims/[claimId]/overview/page.tsx` ~L87   | Unmount effect captures stale formData — saves INITIAL data on unmount, not latest | Use a ref (`formDataRef.current`) updated on every change            |
| 2   | `src/app/(app)/claims/[claimId]/documents/page.tsx` ~L111 | `loadDocuments()` fires with empty `clientId` before state is set                  | Guard with `if (!selectedClientId) return;` or move into effect body |

### B2. Portal Auth Separation — 3 files use Clerk auth()

| #   | File                                        | Issue                                                            |
| --- | ------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `src/app/portal/projects/new/page.tsx:15`   | Uses `auth()` from Clerk — should use portal client auth         |
| 2   | `src/app/portal/invite/[token]/page.tsx:17` | Uses `auth()` from Clerk                                         |
| 3   | `src/app/portal/layout.tsx:46`              | Uses `auth()` — **may be intentional** for hybrid auth detection |

### B3. Write/Read Parity — Field Mode Submit Chain

**Current flow:** Field Mode submit → `/api/claims/field-intake` → creates contact + property + claim + file_assets → returns `claimId`

**Verified:**

- ✅ API creates claim with `orgId`
- ✅ API creates property with `orgId`
- ✅ API creates contact with `orgId`
- ✅ API creates file_assets with `orgId`
- ✅ Client shows success only after `res.ok`
- ⚠️ Claim created with `status: "intake"` — verify Active Claims list includes "intake" status
- ⚠️ No `inspections` record created — Field Mode should create one
- ⚠️ Job routing dropdown sets defaults but no separate `job` record created

### B4. Status/Enum Consistency

| Dropdown Value    | Claim Status Set  | Claim Type Set | Risk                                                           |
| ----------------- | ----------------- | -------------- | -------------------------------------------------------------- |
| `insurance_claim` | `intake`          | `storm`        | ⚠️ Does "Active Claims" list query include `status: "intake"`? |
| `repair`          | `estimate_needed` | `general`      | ⚠️ Same question                                               |
| `out_of_pocket`   | `estimate_needed` | `general`      |                                                                |
| `financing`       | `pending`         | `financing`    |                                                                |

**Action needed:** Verify the claims list page query includes these statuses.

---

## PHASE C — BUILD FEATURES (Still Missing)

### C1. Photo Analysis Engine in Field Mode

**What:** Wire the AI damage analyzer (`/api/ai/damage-analysis`) into Field Mode so captured/uploaded photos get analyzed inline with damage tags, severity, and affected areas BEFORE submit.

**Current state:** `quickAnalyze()` function exists in field/page.tsx and calls `/api/ai/analyze-photo` — photos CAN be analyzed one-by-one or via "Analyze All" button. Results show as `aiLabel` badges on thumbnails.

**Missing:**

- Auto-analyze on capture (currently manual)
- Batch analysis results summary before submit
- Damage report generation from analysis results

### C2. Generate Damage Report Button

**What:** After Field Mode submit (or before), add a "Generate Damage Report" quick action that builds a structured report from analyzed photo data.

**Implementation:**

- Post-submit success screen: add "Generate Damage Report" button
- Calls `/api/reports/damage` with `claimId` + photo analysis data
- Creates a `report` record linked to the claim
- Opens the report viewer

### C3. Measurement Tool Upgrade

**What:** Drag-drop two points on a photo → calculate height/width with real-world calibration → persist structured measurement data.

**Current state:** Measurement mode exists — user taps two points, a line is drawn with pixel distance × 0.15 hardcoded factor. No calibration. Data stored only in component state, not persisted.

**Needed:**

- Calibration step: user sets a known reference length (e.g., "this line is 3 feet")
- Calculate actual scale factor from calibration
- Persist measurements as structured data in `file_assets.metadata`
- Editable measurement labels (height, width, depth, custom)
- Export measurements with the photo

### C4. Property Profile Auto-Populate from Photos

**What:** AI reads inspection photos to detect materials (tan stucco, brown vinyl siding, white hardy board, roofing type, window style, trim type, estimated age) and auto-updates `property_profiles`.

**Implementation:**

- After photo analysis, extract material/property attributes from AI response
- Update `property_profiles` record with: `exteriorMaterial`, `roofingType`, `windowType`, `trimType`, `estimatedAge`, `stories`, `condition`
- Show detected attributes in real-time on the Field Mode UI
- Allow user to confirm/edit before saving

### C5. Property Data from Internet (Public Records)

**What:** Pull public property data from county records/Zillow/similar APIs to enrich `property_profiles` with: sq ft, year built, lot size, bedrooms, bathrooms, last sale price, tax assessment.

**Current state:** Unknown if any integration was previously built. Need to check for existing Zillow/property API code.

**Implementation:**

- On property creation (or Field Mode submit with address), call a property data API
- Auto-fill `property_profiles` fields: `squareFeet`, `yearBuilt`, `lotSize`, `bedrooms`, `bathrooms`, `lastSalePrice`, `taxAssessment`
- Show "Property Details" card in property profile with internet-sourced data
- Cache results to avoid repeated API calls

### C6. Job Routing Wired End-to-End

**What:** When jobType is selected and submit is clicked, route the job to the correct destination and ensure it appears in the right list.

**Current state:** API sets claim defaults based on jobType. But no separate `job` record is created. Claims list may not show "intake" or "estimate_needed" status claims.

**Needed:**

- Verify claims list includes all statuses from job routing
- Consider creating a `job` record alongside the claim for repair/financing flows
- Ensure claim appears in correct dashboard section

### C7. Damage Report Save + Job Routing on Submit

**What:** Save the damage report to the claim and route the job based on the dropdown selection when submit is clicked.

**Flow:**

1. User captures photos in Field Mode
2. Photos are analyzed (auto or manual)
3. User selects job type from dropdown
4. User clicks Submit
5. API creates: contact → property → claim → file_assets → (NEW) inspection → (NEW) damage_report
6. Job is routed to correct list/status based on jobType
7. Success screen shows: "View Claim" + "Generate Damage Report" + "New Inspection"

---

## PHASE D — MANUAL TEST PASS

### D1. Smoke Test Checklist

| #   | Flow               | URL          | Expected                            | PASS/FAIL |
| --- | ------------------ | ------------ | ----------------------------------- | --------- |
| 1   | Login              | `/sign-in`   | Clerk login → redirect to dashboard | ⬜        |
| 2   | Dashboard refresh  | `/dashboard` | Loads stats, no console errors      | ⬜        |
| 3   | Clients list       | `/clients`   | Shows org clients, filterable       | ⬜        |
| 4   | Claims list        | `/claims`    | Shows org claims, all statuses      | ⬜        |
| 5   | Financial Overview | `/financial` | Loads invoices, estimates           | ⬜        |
| 6   | Reports/Weather    | `/reports`   | Weather map loads, reports list     | ⬜        |
| 7   | Estimates          | `/estimates` | List loads, create works            | ⬜        |
| 8   | Team/Invites       | `/teams`     | Members list, invite form           | ⬜        |

### D2. RBAC Matrix

| Page/Action   | Admin | Manager | Member | Viewer | Portal |
| ------------- | ----- | ------- | ------ | ------ | ------ |
| Dashboard     | ✅    | ✅      | ✅     | ✅     | ❌     |
| Create Claim  | ✅    | ✅      | ✅     | ❌     | ❌     |
| Delete Claim  | ✅    | ❌      | ❌     | ❌     | ❌     |
| Team Invite   | ✅    | ❌      | ❌     | ❌     | ❌     |
| Billing       | ✅    | 👀 view | ❌     | ❌     | ❌     |
| Portal Claims | ❌    | ❌      | ❌     | ❌     | ✅     |

### D3. Core CRUD

| #   | Action            | Steps                                    | Expected                          | PASS/FAIL |
| --- | ----------------- | ---------------------------------------- | --------------------------------- | --------- |
| 1   | Create client     | Clients → New → Fill form → Save         | Client appears in list            | ⬜        |
| 2   | Edit client       | Click client → Edit → Change name → Save | Updated name shown                | ⬜        |
| 3   | Create claim      | Claims → New → Fill form → Save          | Claim in list with correct status | ⬜        |
| 4   | Open/update claim | Click claim → Change status → Save       | Status updated                    | ⬜        |
| 5   | Create estimate   | Estimates → New → Add items → Save       | Estimate saved                    | ⬜        |
| 6   | Weather report    | Reports → Weather → Select area          | Report generated                  | ⬜        |
| 7   | Send invite       | Team → Invite → Enter email → Send       | Invite sent, appears in pending   | ⬜        |
| 8   | Upload file       | Claim → Files → Upload → Select file     | File uploaded, visible            | ⬜        |

### D4. Field Mode Mobile Test

| #   | Action              | Expected                                          | PASS/FAIL |
| --- | ------------------- | ------------------------------------------------- | --------- |
| 1   | Open Field Mode     | Camera viewfinder loads, GPS status shows         | ⬜        |
| 2   | Rear camera default | Rear camera active on open                        | ⬜        |
| 3   | Take photo          | Photo captured with GPS tag                       | ⬜        |
| 4   | Flip camera         | Switches to front camera                          | ⬜        |
| 5   | Gallery upload      | Photos loaded from gallery with thumbnails        | ⬜        |
| 6   | Measurement mode    | Two-point drag creates line with distance         | ⬜        |
| 7   | Job type dropdown   | Shows 4 options, persists selection               | ⬜        |
| 8   | Required validation | Submit blocked without name/address, shows errors | ⬜        |
| 9   | GPS auto-address    | Address auto-fills from GPS on mount              | ⬜        |
| 10  | Submit              | Creates claim, shows success, View Claim works    | ⬜        |

### D5. Error Handling

| #   | Scenario                 | Expected                             | PASS/FAIL |
| --- | ------------------------ | ------------------------------------ | --------- |
| 1   | Empty form submit        | Validation errors shown, no API call | ⬜        |
| 2   | Invalid invite email     | Error message, not sent              | ⬜        |
| 3   | Wrong-role page access   | 403 or redirect, not crash           | ⬜        |
| 4   | AI empty input           | Graceful error, not crash            | ⬜        |
| 5   | Cancel camera permission | Fallback UI, not stuck               | ⬜        |

---

## PHASE E — CLEANUP (Post-stability)

### E1. Dead Code (knip)

Run `npx knip` and remove unused exports, files, and dependencies.

### E2. Console Error Audit

Open each major page in browser, check console for errors/warnings. Fix any red errors.

### E3. Mobile Polish

Test all pages on mobile viewport. Fix overflow, touch targets, font sizes.

### E4. Rate Limiting Verification

Verify AI endpoints (`/api/ai/*`) use the `ai` rate limit preset (5/min).

### E5. Large File Refactor

Split files >500 lines into smaller modules. NOT a release blocker.

---

## EXECUTION ORDER

```
A1. Fix 35 raw role comparisons         ← 2 hours
A2. Fix 6 critical tenant isolation      ← 1 hour
A2b. Fix 39 P1 tenant reads             ← 3 hours
B1. Fix 2 dangerous exhaustive-deps     ← 30 min
B2. Fix 3 portal auth files             ← 30 min
B3. Verify write/read parity            ← 30 min
C1. Photo analysis auto-trigger         ← 1 hour
C2. Generate Damage Report button       ← 2 hours
C3. Measurement tool upgrade            ← 3 hours
C4. Property profile auto-populate      ← 2 hours
C5. Property data from internet         ← 2 hours
C6. Job routing end-to-end              ← 1 hour
C7. Damage report save on submit        ← 1 hour
D1-D5. Manual test pass                 ← 2 hours (human)
E1-E5. Cleanup                          ← 3 hours
```

**Total estimated:** ~24 hours of work

---

## GO / NO-GO CRITERIA

### Must pass for release:

- [ ] Zero raw role `===` comparisons on RBAC-scoped roles
- [ ] Zero tenant-scoped write queries without `orgId`
- [ ] Zero NEXT_REDIRECT swallowed (currently PASS)
- [ ] TypeScript typecheck clean (currently PASS)
- [ ] All D1-D5 manual tests PASS
- [ ] Field Mode submit creates visible claim in claims list

### Should pass:

- [ ] All P1 tenant read queries scoped
- [ ] Portal auth uses clientId not Clerk auth
- [ ] exhaustive-deps dangerous instances fixed
- [ ] Photo analysis works in Field Mode
- [ ] Measurement tool persists data

### Nice to have:

- [ ] Property profile auto-populate
- [ ] Property data from internet
- [ ] Dead code cleaned
- [ ] Console error-free

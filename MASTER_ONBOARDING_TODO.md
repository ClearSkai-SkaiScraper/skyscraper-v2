# 🚀 MASTER TODO — Operational Beta → First Revenue

> **Goal:** Get SkaiScraper ready for live company onboarding  
> **Pricing:** $80/user/month (founder rate: $59/user — added last)  
> **Date created:** March 8, 2026  
> **Status:** 🟡 Not started

---

## Sprint 1 — Onboarding Wizard (THE #1 BLOCKER)

**Why:** Right now a new org signs up → enters company name → dumps to empty dashboard. 90% drop-off. We need a guided 5-step wizard that activates every new org.

**What already exists:**

- `OnboardingProgress` step bar component (circles + connectors + %) ✅
- `/api/org/bootstrap` creates org + membership + user ✅
- `BrandingForm.tsx` at settings/branding (logo, colors, contact) ✅
- `TeamInviteForm` with role selection + email input ✅
- `/api/onboarding/create-sample` creates 1 sample claim ✅
- `OnboardingOverlay` + `OnboardingSpotlight` for product tour ✅
- `onboardingStore` (Zustand) for tour state ✅
- `useOnboardingTracking` hook with 10-step funnel analytics ✅
- `OnboardingChecklist` post-wizard dashboard widget ✅

### Tasks

- [ ] **1.1** Create wizard orchestrator page at `src/app/(app)/onboarding/wizard/page.tsx` — state machine with 5 steps, URL-synced (`?step=1` through `?step=5`), skip + back navigation
- [ ] **1.2** Step 1 — Company Profile: Embed expanded company form (name, phone, email, license #, service area). Reuse existing `CompanySettingsClient` fields. Save via `/api/org/bootstrap` or new PATCH endpoint
- [ ] **1.3** Step 2 — Branding: Embed `BrandingForm.tsx` (logo upload, primary color, company tagline). Mark `onboarding_branding_done` on completion
- [ ] **1.4** Step 3 — Invite Team: Embed `TeamInviteForm` with "Invite 2–3 team members" prompt. Show role explanations (Admin / Manager / Member). Allow "Skip for now" with re-entry
- [ ] **1.5** Step 4 — First Claim: Two paths — "Create your first claim" (guided ClaimForm) OR "Load sample data" (calls `/api/onboarding/create-sample` enhanced). Show the result on a mini claim card
- [ ] **1.6** Step 5 — Completion + Tour: Confetti animation, "Your dashboard is ready!" message, auto-launch `OnboardingOverlay` product tour. Track `activated` funnel event
- [ ] **1.7** Server-side step tracking: Add `onboardingStep` (int, default 0) and `onboardingComplete` (boolean) to Org model in Prisma schema + migration. Middleware redirects incomplete orgs to `/onboarding/wizard?step={n}`
- [ ] **1.8** Wire `useOnboardingTracking` — fire funnel events at each step transition (org_created → company_info → branding → team_invited → first_claim → activated)
- [ ] **1.9** Update middleware: if `onboardingComplete === false` and route is not `/onboarding/*` or `/api/*`, redirect to wizard
- [ ] **1.10** Update dashboard `OnboardingBanner` — if wizard complete but checklist incomplete, show "Continue setting up" with progress percentage from `/api/onboarding/progress`

---

## Sprint 2 — Demo Seed Engine (Sales Enablement)

**Why:** Every sales call needs to show a fully populated dashboard in 10 seconds. One-click demo data > static demo site.

**What already exists:**

- 8+ SQL seed files in `db/` (hardcoded orgIds, inconsistent schemas) ⚠️
- `/api/onboarding/create-sample` creates 1 claim only ⚠️
- `db/seed-titan-demo.sql` is closest to what we need (50 team members, 100 claims) ✅

### Tasks

- [ ] **2.1** Create `src/lib/seed/demoSeedEngine.ts` — programmatic seed generator that takes `orgId` as input and creates realistic demo data:
  - 15 claims (mix of: 3 new, 4 in-progress, 3 signed, 3 approved, 2 closed)
  - 8 contacts with realistic names/addresses (AZ-based)
  - 8 properties linked to contacts
  - 5 team members with different roles (admin, manager, 3 reps)
  - Job values on signed/approved claims ($8K–$45K range)
  - Leaderboard data (pre-computed rankings)
  - 3 weather reports linked to claims
  - 2 AI damage reports linked to claims
  - Pipeline stages distributed realistically
  - Lead sources distributed (door_knock, referral, canvass, website)
- [ ] **2.2** Create API route `POST /api/admin/seed-demo` — RBAC admin-only, calls demoSeedEngine, returns count summary. Rate limited (1/min)
- [ ] **2.3** Create API route `DELETE /api/admin/seed-demo` — wipes all demo data for org (cascade deletes). Confirms with `?confirm=true` param
- [ ] **2.4** Add "Load Demo Data" button to Settings > Admin panel (or onboarding Step 4). Shows confirmation modal, progress spinner, success toast with counts
- [ ] **2.5** Create `scripts/seed-demo-cli.ts` — CLI wrapper for demoSeedEngine: `pnpm seed:demo --orgId=xxx`. Add to package.json scripts
- [ ] **2.6** Ensure all seeded data respects tenant isolation (every row has orgId), uses `createId()` for IDs, and sets realistic timestamps (spread over last 90 days)

---

## Sprint 3 — Client Portal Polish

**Why:** "Your homeowners get their own portal" is a selling point no competitor has. The 28 routes exist but need data connectivity testing and UX polish.

**What already exists:**

- 28 portal routes with full layout (branded header, nav, user menu) ✅
- 14 client routes with slug-based workspaces ✅
- Portal onboarding (3-step wizard for clients) ✅
- Messages, notifications, claim views, contractor directory ✅
- `PortalGuard` + legal compliance overlay ✅
- Middleware separates pro/client auth ✅

### Tasks

- [ ] **3.1** Audit portal data connectivity — test each of the 28 portal routes with a real client account. Document which pages load data vs show empty/error states. Create checklist of broken pages
- [ ] **3.2** Fix claim status view (`/portal/claims/[claimId]`) — client should see: claim status badge, timeline of events, uploaded photos, AI reports (read-only), job value (if approved), signing status
- [ ] **3.3** Fix document sharing — `/portal/claims/[claimId]` should show documents shared by the pro (e-sign docs, weather reports, damage reports). Wire to `document_links` table we just created
- [ ] **3.4** Fix messages — `/portal/messages` must show real threads between client and their assigned rep. Test send/receive flow end-to-end. Fix any broken WebSocket or polling
- [ ] **3.5** E-sign integration — client should be able to view and sign documents from the portal. Check if existing e-sign flow (`src/lib/esign/`) generates a client-accessible signing URL
- [ ] **3.6** Notification bell — `/portal/notifications` should show real-time updates: "Your claim status changed", "New document shared", "Message from rep". Wire to push_subscriptions table
- [ ] **3.7** White-label branding — verify the portal layout pulls the contractor's branding (logo, colors, company name) from org settings. Test with custom logo + primary color
- [ ] **3.8** Client invite flow — pro invites homeowner via email → homeowner clicks link → `/portal/invite/[token]` → auto-creates client account → links to pro's org. Test full flow
- [ ] **3.9** Mobile responsiveness — test all portal pages on mobile viewport (375px). Fix any overflow, truncation, or navigation issues. Clients will primarily use phones

---

## Sprint 4 — Stripe Billing ($80/user/month)

**Why:** Revenue requires a working payment flow. The plumbing exists but seat sync is broken.

**What already exists:**

- `seat-pricing.ts` SSoT: $80/seat/month flat ✅
- `POST /api/billing/create-subscription` — creates Stripe customer + subscription ✅
- `PATCH /api/billing/update-seats` — updates quantity with proration ✅
- Stripe webhook (504 lines) handles sub updates, cancellations, dunning ✅
- Settings/Billing UI with seat picker ✅
- Stripe Billing Portal session creation ✅
- Invoice history endpoint ✅

### Tasks

- [ ] **4.1** Auto seat sync on member add — when a team member accepts an invite (Clerk webhook `organizationMembership.created`), auto-call `update-seats` to increment Stripe subscription quantity. Create/update `src/app/api/webhooks/clerk/route.ts`
- [ ] **4.2** Auto seat sync on member remove — when a member is removed (`organizationMembership.deleted`), decrement Stripe quantity. Same webhook handler
- [ ] **4.3** Seat limit enforcement — before allowing team invite, check `seatEnforcement.ts` → if current members >= subscription quantity, block invite with "Upgrade your plan to add more seats" message. Wire into TeamInviteForm
- [ ] **4.4** Trial period — add 14-day free trial to `create-subscription`: set `trial_period_days: 14` in Stripe subscription creation. Show trial banner on dashboard with days remaining. Trial ending email already wired in webhook ✅
- [ ] **4.5** Payment confirmation UX — after `create-subscription` returns clientSecret, render Stripe Elements payment form for card entry. Show success/failure state. Currently the UI calls the API but payment form rendering is unclear
- [ ] **4.6** Dunning flow — when `invoice.payment_failed` fires (webhook already handles this), show a red banner on dashboard: "Payment failed — update your card". Link to Stripe Billing Portal. Block AI features after 7 days of failed payment
- [ ] **4.7** Cancellation flow — add "Cancel subscription" button to billing settings. Confirm modal with "You'll lose access at end of billing period". Call Stripe cancel at period end (not immediate). Show "Subscription ending on {date}" banner
- [ ] **4.8** Test full billing lifecycle end-to-end: sign up → trial starts → trial ends → card charged → add member → quantity increments → remove member → quantity decrements → payment fails → dunning → update card → success. Use Stripe test mode

---

## Sprint 5 — Polish the 3 Killer Features

**Why:** These 3 features sell the product. They must be bulletproof for demos.

### 5A: AI Damage Builder

**What already exists:**

- Full 4-step UI (Upload → Analyze → Caption → PDF) — 878 lines ✅
- API with gpt-4o-mini, rate limited, saves to artifacts ✅
- HEIC conversion, thumbnail carousel, severity badges ✅
- PDF export via `/api/ai/damage/export` ✅

**Tasks:**

- [ ] **5A.1** Add retry button on analysis failure — currently just shows error text banner. Add "Try Again" button that re-submits the same photos
- [ ] **5A.2** Add loading skeleton for main page — currently no visual feedback while page loads
- [ ] **5A.3** Test with 10 different damage photos (hail, wind, water, fire, roof, siding, gutter, window, fence, tree). Verify AI returns relevant findings for each type
- [ ] **5A.4** Consolidate analyze endpoints — client calls `/api/ai/damage/analyze` but there's also `/api/ai/damage-builder`. Verify they're not duplicated, or merge into one
- [ ] **5A.5** Add "Save to Claim" button — after analysis, allow user to link findings directly to an existing claim. Auto-create timeline event "AI Damage Analysis completed"

### 5B: Job Value Pipeline

**What already exists:**

- 4-state workflow: Draft → Submitted → Approved → Rejected ✅
- RBAC: reps submit, managers approve/reject ✅
- Audit trail: timestamps, approver ID, approval notes ✅
- Manager notification via `notifyManagers.ts` ✅

**Tasks:**

- [ ] **5B.1** Add email notification to rep on approve/reject — "Your job value of $XX,XXX for [Claim Name] has been approved/rejected by [Manager Name]". Use existing Resend email system
- [ ] **5B.2** Add notification bell entry for reps — in-app notification alongside email
- [ ] **5B.3** Test the full pipeline end-to-end: rep creates claim → marks signed → enters $25,000 → submits → manager gets notification → approves with note → leaderboard updates → finance dashboard shows approved value
- [ ] **5B.4** Edge case: what happens if manager approves but claim signing status is still "pending"? Add validation: job value can only be submitted if `signingStatus === "signed"`
- [ ] **5B.5** Bulk approval — managers with 20+ pending approvals need a list view. Add `/claims/approvals` page showing all pending job values with quick approve/reject actions

### 5C: Leaderboard

**What already exists:**

- 3 ranking tabs (Revenue, Claims Signed, Lead Sources) ✅
- 4 time periods (Month, 3mo, 6mo, YTD) ✅
- Source filter dropdown ✅
- KPI summary row + per-rep stats ✅
- Avatars, rank badges, progress bars ✅

**Tasks:**

- [ ] **5C.1** Create standalone leaderboard page at `src/app/(app)/leaderboard/page.tsx` — currently only exists as dashboard widget. Full-page version with bigger cards, more stats per rep
- [ ] **5C.2** Fix auth pattern — API uses raw `getAuth()` instead of `withOrgScope()`. Migrate to standard HOF pattern for consistency
- [ ] **5C.3** Add export — "Download as PDF" or "Share" button for the leaderboard. Managers love printing/posting these in the office
- [ ] **5C.4** Real-time data — ensure leaderboard only counts claims where `signingStatus = 'signed' AND jobValueStatus = 'approved'`. Verify the API query filters correctly
- [ ] **5C.5** Add commission tracking — show earned vs paid commission per rep. Wire to existing commission fields in leaderboard_snapshots table
- [ ] **5C.6** Gamification extras — add weekly/monthly champion notifications, "New #1!" alerts, streak tracking (consecutive weeks in top 3)

---

## Sprint 6 — Demo Script + Sales Readiness

**Why:** You need a repeatable 10-minute demo that sells itself.

### Tasks

- [ ] **6.1** Write the demo script (in-app flow, not a document):
  1. Sign up as new company → wizard runs
  2. Load demo data (one-click)
  3. Open dashboard → show populated leaderboard + pipeline stats
  4. Open a claim → show signing status + job value workflow
  5. Upload damage photo → run AI Damage Builder → show findings
  6. Generate weather report for the claim
  7. Show manager approval flow (approve pending job value)
  8. Show leaderboard update in real-time
  9. Open client portal → show what homeowner sees
  10. Show billing settings → $80/user/month
- [ ] **6.2** Record 15-minute product walkthrough video following the script above. Screen recording with voiceover
- [ ] **6.3** Create landing page updates — add 3 feature screenshots to marketing site: leaderboard, damage builder, job value pipeline. Add "Book a Demo" CTA
- [ ] **6.4** Set up Calendly or Cal.com link for demo scheduling. Embed on landing page
- [ ] **6.5** Prepare founder pricing offer: $59/user/month locked lifetime rate for first 10 companies. Create a simple promo code or Stripe coupon

---

## Priority Matrix

| Sprint                    | Effort   | Impact      | Must-Have for First Customer?           |
| ------------------------- | -------- | ----------- | --------------------------------------- |
| **S1: Onboarding Wizard** | 3–4 days | 🔴 Critical | YES — without it, users churn instantly |
| **S2: Demo Seed**         | 1–2 days | 🔴 Critical | YES — needed for every sales call       |
| **S3: Portal Polish**     | 2–3 days | 🟡 High     | PARTIAL — claim view + messages minimum |
| **S4: Stripe Billing**    | 2–3 days | 🔴 Critical | YES — can't charge without it working   |
| **S5: Feature Polish**    | 2–3 days | 🟡 High     | YES — these are the selling features    |
| **S6: Sales Readiness**   | 1–2 days | 🟡 High     | YES — need demo script for calls        |

**Total estimated effort: 12–17 days**

---

## Execution Order

```
Week 1:  Sprint 1 (Onboarding) + Sprint 2 (Demo Seed)
Week 2:  Sprint 4 (Billing) + Sprint 5 (Feature Polish)
Week 3:  Sprint 3 (Portal) + Sprint 6 (Sales Readiness)
```

After Week 3: **Book first 3 demo calls.**

---

## Definition of Done

Each sprint is "done" when:

- [ ] All tasks checked off
- [ ] 0 TypeScript errors
- [ ] Production build passes
- [ ] Deployed to skaiscrape.com
- [ ] Manually tested end-to-end by walking through the user flow

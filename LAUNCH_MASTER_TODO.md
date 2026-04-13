# 🚀 SKAISCRAPER LAUNCH MASTER TODO

**Created:** April 13, 2026  
**Status:** 99% BUILD COMPLETE — READY FOR LIVE VALIDATION  
**Production URL:** https://www.skaiscrape.com

---

## 📋 MASTER CHECKLIST

### ✅ COMPLETED

- [x] All 14 enhancement components built
- [x] All components integrated into live pages
- [x] TypeScript: 0 errors
- [x] Tests: 907/907 passing
- [x] Git pushed to origin
- [x] Vercel deployed to production

### 🔴 CRITICAL — DO NOW

- [ ] Stripe Live Verification (see Section 1)
- [ ] DAU Full Walkthrough (see Section 2)
- [ ] Sentry Error Test (see Section 3)
- [ ] Demo Video Recording (see Section 4)

### 🟠 HIGH PRIORITY

- [ ] Mobile Field Test (iPhone/Android)
- [ ] Empty States Audit
- [ ] Error Recovery UX Test
- [ ] First 3 Beta Users

### 🟡 POLISH

- [ ] Loading State Audit
- [ ] Trust Signal Verification
- [ ] Billing Clarity Check

---

# 📖 SECTION 1: STRIPE VERIFICATION GUIDE

## Step-by-Step Stripe Live Mode Check

### Prerequisites

```bash
# Install Stripe CLI if not already
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login
```

### Step 1: Verify Environment Variables

```bash
# Check your .env.local has LIVE keys (not test keys)
cat .env.local | grep STRIPE

# Should see:
# STRIPE_SECRET_KEY=sk_live_... (NOT sk_test_...)
# STRIPE_PUBLISHABLE_KEY=pk_live_... (NOT pk_test_...)
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 2: Verify Webhook Configuration

1. Go to https://dashboard.stripe.com/webhooks
2. Confirm endpoint: `https://www.skaiscrape.com/api/webhooks/stripe`
3. Verify these events are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### Step 3: Test Webhook Locally

```bash
# Forward webhooks to local
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

### Step 4: Live Payment Test

1. Go to https://www.skaiscrape.com/pricing
2. Click "Start Free Trial"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify:
   - Redirected to dashboard
   - Subscription shows in Stripe Dashboard
   - User has access to Pro features

### Step 5: Verify Production Webhook

```bash
# Check production webhook delivery
curl -s https://www.skaiscrape.com/api/health && echo "✅ API Live"

# In Stripe Dashboard > Webhooks > Recent Events
# Verify events are being delivered successfully
```

### Stripe Checklist

- [ ] Live API keys configured
- [ ] Webhook endpoint registered
- [ ] Test payment successful
- [ ] Subscription created in Stripe
- [ ] User access updated after payment

---

# 📖 SECTION 2: DAU (DAILY ACTIVE USER) WALKTHROUGH CHECKLIST

## Full User Journey Test

### Phase 1: New User Signup (5 min)

- [ ] Go to https://www.skaiscrape.com
- [ ] Click "Start Free Trial" or "Get Started"
- [ ] Complete Clerk signup (email/password or OAuth)
- [ ] Verify redirected to onboarding or dashboard
- [ ] Check: Is it OBVIOUS what to do next?

### Phase 2: Onboarding (3 min)

- [ ] Complete any onboarding steps
- [ ] Verify org/company created
- [ ] Check: Any blank screens?
- [ ] Check: Any confusing steps?

### Phase 3: First Claim Creation (5 min)

- [ ] Navigate to Claims section
- [ ] Click "New Claim" or equivalent
- [ ] Fill in required fields:
  - [ ] Address
  - [ ] Date of Loss
  - [ ] Claim Number
- [ ] Save claim
- [ ] Verify claim appears in list

### Phase 4: Photo Upload (5 min)

- [ ] Open the new claim
- [ ] Navigate to Photos section
- [ ] Upload 5-10 photos
- [ ] Verify:
  - [ ] Upload progress shown
  - [ ] Photos appear after upload
  - [ ] Can view full-size images

### Phase 5: AI Analysis (5 min)

- [ ] Trigger AI damage analysis
- [ ] Verify:
  - [ ] Loading indicator shown
  - [ ] Analysis completes
  - [ ] Results display properly
  - [ ] Damage annotations visible

### Phase 6: Report Generation (5 min)

- [ ] Generate inspection report
- [ ] Verify:
  - [ ] Loading/progress shown
  - [ ] PDF downloads or displays
  - [ ] Report contains all data
  - [ ] Professional formatting

### Phase 7: Client Portal Share (3 min)

- [ ] Share claim to client portal
- [ ] Copy client access link
- [ ] Open in incognito browser
- [ ] Verify client can:
  - [ ] View claim status
  - [ ] See photos
  - [ ] Access documents

### Phase 8: Payment Flow (5 min)

- [ ] Navigate to billing/subscription
- [ ] Initiate payment (if trial)
- [ ] Complete Stripe checkout
- [ ] Verify access granted

### DAU Pass Criteria

**PASS:** All steps complete without errors, confusion, or dead ends  
**FAIL:** Any step causes user to get stuck or confused

---

# 📖 SECTION 3: SENTRY ERROR VERIFICATION GUIDE

## Step-by-Step Sentry Test

### Step 1: Verify Sentry Configuration

```bash
# Check Sentry DSN is configured
cat .env.local | grep SENTRY

# Should see:
# SENTRY_DSN=https://...@sentry.io/...
# SENTRY_AUTH_TOKEN=...
```

### Step 2: Verify Sentry Dashboard Access

1. Go to https://sentry.io
2. Login to your organization
3. Find "SkaiScraper" project
4. Verify you can see the project dashboard

### Step 3: Trigger Test Error (Dev)

```bash
# In your terminal, start dev server
pnpm dev

# Open browser to trigger client error
# Add ?sentry-test=1 to any URL
# Example: http://localhost:3000/dashboard?sentry-test=1
```

### Step 4: Trigger Production Error

```javascript
// Option A: Add temporary test button
// In any page, add:
<button
  onClick={() => {
    throw new Error("Sentry Test Error");
  }}
>
  Test Sentry
</button>;

// Option B: Use API endpoint
// Create: src/app/api/test-sentry/route.ts
export async function GET() {
  throw new Error("Sentry API Test Error");
}
// Then visit: https://www.skaiscrape.com/api/test-sentry
```

### Step 5: Verify in Sentry Dashboard

1. Go to Sentry Dashboard > Issues
2. Wait 1-2 minutes
3. Verify test error appears
4. Check error includes:
   - [ ] Stack trace
   - [ ] User info (if logged in)
   - [ ] Environment (production)
   - [ ] Browser/OS info

### Step 6: Test Alert (Optional)

1. Go to Sentry > Alerts
2. Verify alert rules configured
3. Trigger error
4. Verify email/Slack notification received

### Sentry Checklist

- [ ] Sentry DSN configured
- [ ] Can access Sentry Dashboard
- [ ] Test error appears in Sentry
- [ ] Stack trace visible
- [ ] Environment correct (production)

---

# 📖 SECTION 4: DEMO VIDEO RECORDING GUIDE

## Recommended Tools

### Best for Quick Demo (FREE)

1. **Loom** — https://loom.com
   - Free tier: 5 min videos
   - Browser extension
   - Instant shareable link
   - ⭐ RECOMMENDED for first demo

2. **macOS Screen Recording**
   - Press `Cmd + Shift + 5`
   - Select area or full screen
   - Click Record
   - Press `Cmd + Shift + 5` again to stop

### Best for Professional Demo (PAID)

1. **ScreenFlow** (Mac) — $169
2. **Camtasia** (Mac/PC) — $250
3. **OBS Studio** (Free) — More complex

## Demo Script (5 Minutes)

### Intro (30 sec)

```
"Hey, I'm [Name] from SkaiScraper.
Let me show you how storm restoration contractors
are using AI to close claims 3x faster."
```

### The Problem (30 sec)

```
"Right now, you're probably spending hours
manually documenting damage, creating reports,
and going back and forth with adjusters.

SkaiScraper automates all of that."
```

### Live Demo (3 min)

```
1. "Here's the dashboard — you can see all your active claims."
   [Show dashboard with claims]

2. "Let's create a new claim..."
   [Click new claim, fill in address]

3. "Now I'll upload some damage photos..."
   [Upload 3-5 photos]

4. "Watch this — AI analyzes the damage automatically."
   [Trigger AI analysis, show results]

5. "One click generates a professional report."
   [Generate report, show PDF]

6. "And your client can track everything in their portal."
   [Show client portal view]
```

### Call to Action (30 sec)

```
"We're offering early access to contractors right now.
Click the link below to start your free trial.

Questions? Book a call — link in description."
```

## Recording Tips

### Setup

- [ ] Close all other apps/notifications
- [ ] Use incognito browser (clean UI)
- [ ] Pre-load demo data (claims, photos)
- [ ] Test microphone audio
- [ ] Good lighting on face (if using webcam)

### During Recording

- [ ] Speak slowly and clearly
- [ ] Move mouse smoothly (not jerky)
- [ ] Pause 1 second after each action
- [ ] Zoom in on important UI elements
- [ ] Keep energy HIGH

### Post-Recording

- [ ] Trim dead air at start/end
- [ ] Add captions (Loom does this automatically)
- [ ] Upload to YouTube (unlisted) for sharing
- [ ] Create thumbnail with text overlay

## Quick Recording Workflow

```bash
# 1. Open Loom extension in Chrome
# 2. Select "Screen + Cam" or "Screen Only"
# 3. Choose recording area
# 4. Click Record
# 5. Follow demo script
# 6. Click Stop
# 7. Copy shareable link
# 8. Done!
```

---

# 📖 SECTION 5: EMPTY STATES AUDIT

## Pages to Check

### Dashboard (No Data)

- [ ] `/dashboard` with no claims → Shows CTA to create first claim
- [ ] `/dashboard` with no activity → Shows getting started guide

### Claims

- [ ] `/claims` with no claims → "Create your first claim" CTA
- [ ] `/claims/[id]/photos` with no photos → "Upload photos" CTA

### Reports

- [ ] `/reports` with no reports → "Generate your first report" CTA

### Team

- [ ] `/team` with no members → "Invite your first team member" CTA

### Client Portal

- [ ] `/portal` with no claims → Clear message for clients
- [ ] `/portal/timeline` with no activity → Progress explanation

## Empty State Best Practices

```tsx
// Good Empty State
<EmptyState
  icon={<FileText className="h-12 w-12" />}
  title="No claims yet"
  description="Create your first claim to start documenting damage and generating reports."
  action={
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Create First Claim
    </Button>
  }
/>

// Bad Empty State
<p>No data</p>  // ❌ Never do this
```

---

# 📖 SECTION 6: ERROR RECOVERY AUDIT

## Scenarios to Test

### Upload Failures

- [ ] Kill internet during photo upload
- [ ] Expected: "Upload failed — Retry" button
- [ ] NOT: Blank screen or stuck spinner

### AI Failures

- [ ] AI analysis timeout
- [ ] Expected: "Analysis failed — Try again" with explanation
- [ ] NOT: Infinite loading

### Payment Failures

- [ ] Decline test card: `4000 0000 0000 0002`
- [ ] Expected: Clear error message, retry option
- [ ] NOT: Success message or stuck state

### API Failures

- [ ] 500 error on any endpoint
- [ ] Expected: Toast/notification with retry
- [ ] NOT: Crash or blank page

---

# 📖 SECTION 7: MOBILE FIELD TEST

## Test Devices

- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (iPad)

## Critical Mobile Flows

1. [ ] Login from mobile
2. [ ] Create claim on mobile
3. [ ] Upload photos from camera (not gallery)
4. [ ] View dashboard
5. [ ] Navigate between sections
6. [ ] Complete payment on mobile

## Mobile UX Checklist

- [ ] Touch targets large enough (44px min)
- [ ] Text readable without zooming
- [ ] Forms work with keyboard
- [ ] No horizontal scrolling
- [ ] Loading states visible

---

# 🎯 EXECUTION TIMELINE

## Today (Next 2-4 Hours)

1. ✅ Git push complete
2. ✅ Vercel deploy complete
3. [ ] Run DAU Walkthrough (Section 2)
4. [ ] Verify Stripe (Section 1)
5. [ ] Test Sentry (Section 3)

## Tomorrow

1. [ ] Record Demo Video (Section 4)
2. [ ] Mobile Field Test (Section 7)
3. [ ] Empty States Audit (Section 5)

## This Week

1. [ ] Get 3 beta users
2. [ ] Watch them use it (NO HELPING)
3. [ ] Fix friction points
4. [ ] Iterate

---

# 💰 FIRST 10 CUSTOMERS ROADMAP

## Week 1: Personal Network

1. Any contractors you know personally
2. Friends of friends in construction
3. Local roofing companies

## Week 2: Outreach

1. LinkedIn direct messages to restoration contractors
2. Facebook groups for contractors
3. Local business networking events

## Week 3: Content

1. Post demo video on LinkedIn
2. Share in contractor forums
3. Create "before/after" case study

## Pitch Script

```
"Hey [Name],

I built a tool that helps storm restoration contractors
close claims 3x faster using AI.

It auto-analyzes damage photos and generates
professional reports in seconds.

Would you be open to a 5-minute demo?
First month is free for early users.

[Your Name]"
```

---

# ✅ FINAL LAUNCH CRITERIA

Before announcing publicly, verify:

- [ ] DAU walkthrough passes 100%
- [ ] Stripe payments working
- [ ] Sentry capturing errors
- [ ] Demo video recorded
- [ ] Mobile experience acceptable
- [ ] 3 beta users onboarded
- [ ] No critical bugs found

**When all boxes checked: YOU ARE LIVE 🚀**

---

_Last Updated: April 13, 2026_

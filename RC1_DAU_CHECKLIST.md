# 🚀 RC1 DAU Production Checklist — SkaiScraper v1.0.0-rc1

> **Date:** April 10, 2026  
> **Tag:** v1.0.0-rc1  
> **Purpose:** Prove every critical user flow works on production before first customer demo.  
> **URL:** https://skaiscrape.com  

---

## How to Use This

Walk through each flow **in a real browser on production**.  
Mark ✅ or ❌. If ❌, note the issue and severity (P0 blocker / P1 fix-before-sell / P2 post-launch).

---

## Flow 1 — Sign Up (New User)

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 1.1 | Go to `https://skaiscrape.com` | Marketing page loads, no console errors | | |
| 1.2 | Click "Start Free Trial" or "Sign Up" | Clerk sign-up modal appears | | |
| 1.3 | Register with email + password | Account created, redirect to onboarding | | |
| 1.4 | Complete onboarding wizard | Org created, lands on dashboard | | |
| 1.5 | Verify Clerk dashboard shows new user + org | User + org visible in Clerk admin | | |

---

## Flow 2 — Sign In (Existing User)

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 2.1 | Go to `https://skaiscrape.com/sign-in` | Clerk sign-in modal | | |
| 2.2 | Sign in with credentials from Flow 1 | Redirect to `/dashboard` | | |
| 2.3 | Sidebar loads, user avatar visible in topbar | Layout renders correctly | | |
| 2.4 | Dark mode toggle works | Theme switches without flash | | |

---

## Flow 3 — Subscription (Stripe Checkout)

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 3.1 | Navigate to `/pricing` | Pricing tiers display (Solo/Business/Enterprise) | | |
| 3.2 | Click "Subscribe" on a plan | Stripe Checkout session opens | | |
| 3.3 | Complete payment with test card `4242 4242 4242 4242` | Redirect to `/dashboard?success=true` | | |
| 3.4 | Check Stripe Dashboard → Customers | New customer + subscription visible | | |
| 3.5 | Check DB: `Subscription` record created with `status: active` | Webhook wrote to DB | | |
| 3.6 | Verify access gates unlock (no "upgrade" prompts) | `assertPaidAccess()` passes | | |

---

## Flow 4 — Create a Claim

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 4.1 | Click "New Claim" or navigate to `/claims/new` | Claim intake form loads | | |
| 4.2 | Fill in homeowner name, address, date of loss | Form validates, no errors | | |
| 4.3 | Submit claim | Claim created, redirect to claim detail page | | |
| 4.4 | Verify claim appears in claims list | `/claims` shows new claim | | |
| 4.5 | Claim detail page loads with all tabs | Overview, Photos, Weather, Documents, etc. | | |

---

## Flow 5 — Photo Upload

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 5.1 | Navigate to claim → Photos tab | Photo manager loads | | |
| 5.2 | Upload 3-5 test photos (JPG/PNG) | Upload progress shows, photos appear | | |
| 5.3 | Photos display in grid with thumbnails | Supabase Storage URLs resolve | | |
| 5.4 | Click a photo → lightbox/preview | Full-size image loads | | |
| 5.5 | Delete a photo | Photo removed from grid | | |

---

## Flow 6 — AI Damage Analysis

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 6.1 | On claim with photos, trigger AI analysis | Loading indicator appears | | |
| 6.2 | AI response returns (may take 10-30s) | Damage assessment appears | | |
| 6.3 | Damage types listed with confidence scores | Structured output, no "undefined" | | |
| 6.4 | If OpenAI key missing → graceful error message | "AI unavailable" not a crash | | |

---

## Flow 7 — Weather Report

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 7.1 | Navigate to claim → Weather tab | Weather interface loads | | |
| 7.2 | Click "Generate Weather Report" | API call fires, loading state | | |
| 7.3 | Weather data displays (hail size, wind speed, DOL) | Data from Visual Crossing / fallback | | |
| 7.4 | If Mapbox token set → map renders with storm overlay | Map visible, no blank tile | | |
| 7.5 | Weather PDF download works | PDF generates and downloads | | |

---

## Flow 8 — Report Builder

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 8.1 | Navigate to claim → Report Builder | Builder UI loads with section list | | |
| 8.2 | Toggle sections on/off | Sections enable/disable correctly | | |
| 8.3 | Reorder sections via drag-and-drop | Order persists | | |
| 8.4 | Click "Generate Report" | PDF generation starts | | |
| 8.5 | Download completed report | PDF opens in browser, content correct | | |

---

## Flow 9 — Claim Lifecycle Updates

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 9.1 | Change claim status (e.g., "In Progress" → "Submitted") | Status updates, badge changes | | |
| 9.2 | Add a note/comment to the claim | Comment appears in timeline | | |
| 9.3 | Assign claim to a team member | Assignee updates | | |
| 9.4 | Activity timeline shows all changes | Audit trail visible | | |

---

## Flow 10 — Share / Export

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 10.1 | Click "Share" on a claim or report | Share modal appears | | |
| 10.2 | Generate a share link | URL created and copyable | | |
| 10.3 | Open share link in incognito | Public/portal view loads correctly | | |
| 10.4 | Export estimate as PDF | PDF downloads with correct data | | |

---

## Flow 11 — Client Portal

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 11.1 | Navigate to `/portal` or client sign-in | Portal landing/login page loads | | |
| 11.2 | Client can view their claim status | Read-only claim view | | |
| 11.3 | Client can view shared documents | Documents load from Supabase | | |
| 11.4 | Portal is visually separate from pro dashboard | Different layout, no sidebar leak | | |

---

## Flow 12 — Team / RBAC

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 12.1 | Navigate to `/settings/team` | Team management page loads | | |
| 12.2 | Invite a team member (Clerk invite flow) | Invite sent | | |
| 12.3 | Viewer role cannot create claims | `RBACGuard` blocks UI elements | | |
| 12.4 | Admin can access all settings | Full settings visible | | |

---

## Flow 13 — Billing Portal / Cancel

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 13.1 | Navigate to `/settings/billing` | Current plan + usage visible | | |
| 13.2 | Click "Manage Subscription" → Stripe Customer Portal | Stripe portal opens | | |
| 13.3 | Cancel subscription in Stripe portal | Webhook fires `customer.subscription.deleted` | | |
| 13.4 | Access gates re-engage after cancellation | Features locked, upgrade prompt shown | | |
| 13.5 | Resubscribe → access restored | Gates unlock again | | |

---

## Flow 14 — Email Notifications

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 14.1 | Trigger a welcome email (sign-up) | Email arrives via Resend | | |
| 14.2 | Trigger trial-ending email (if applicable) | Email with CTA to subscribe | | |
| 14.3 | Check Resend dashboard for delivery status | Delivered, no bounces | | |

---

## Flow 15 — Error Handling / Edge Cases

| # | Step | Expected | ✅/❌ | Notes |
|---|------|----------|-------|-------|
| 15.1 | Hit a non-existent route `/dashboard/xyz123` | Custom 404 page, not blank | | |
| 15.2 | Trigger a server error (e.g., bad API call) | Error boundary catches, no white screen | | |
| 15.3 | Check Sentry for captured errors | Errors appear (if token set) | | |
| 15.4 | Rate limit test: hit API 15x rapidly | 429 response after limit | | |
| 15.5 | Check browser console for no critical errors | No uncaught exceptions | | |

---

## Post-Checklist Verdict

| Criteria | Result |
|----------|--------|
| All 15 flows pass? | ☐ YES / ☐ NO |
| P0 blockers found? | ☐ NONE / ☐ LIST: |
| P1 items found? | ☐ NONE / ☐ LIST: |
| Ready for first customer demo? | ☐ YES / ☐ NO |
| Ready for paid pilots? | ☐ YES / ☐ NO |

---

## Rollback Plan

| Item | Detail |
|------|--------|
| **Last known good tag** | `v1.0.0-rc1` |
| **Rollback command** | `git checkout v1.0.0-rc1 && vercel --prod --force` |
| **DB rollback posture** | No destructive migrations in RC1. `TradesConnection` drop is irreversible but had 0 rows. All other schema is additive. |
| **Who acts** | You (sole operator). Vercel auto-deploys from `main`. To rollback: push the tag, or revert commit + force deploy. |
| **Monitoring** | Sentry (once token set) + Vercel Analytics + Stripe Dashboard |
| **Incident response** | 1. Check Sentry → 2. Check Vercel logs → 3. Check Stripe Dashboard → 4. If billing broken, enable `EMERGENCY_MODE=true` in Vercel env |

---

*Generated April 10, 2026 — SkaiScraper v1.0.0-rc1*

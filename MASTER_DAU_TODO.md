# 🎯 MASTER DAU READINESS TODO — SkaiScraper Pro

> **Last Updated:** Sprint 15 (commit `708314c`)
> **Goal:** Daily Active Users — production-ready for real paying customers
> **Status:** 375+ file changes since lockdown, 0 TypeScript errors, **0 P0 items remaining**

---

## ✅ COMPLETED (Sprints 11–15)

### Sprint 11 — Foundation Lockdown

- [x] Token system removed (dead code)
- [x] Mock AI calls replaced with real OpenAI/Anthropic
- [x] Security hardening (RBAC, org scoping)
- [x] 0 TypeScript errors achieved

### Sprint 12 — QA Test Failures Fixed

- [x] Report PDF FK bug: `createdById` uses DB UUID lookup, not Clerk ID
- [x] `/ai` redirect: Removed broken redirect to `/ai-tools`
- [x] Dashboard charts: Re-imported `ChartsPanel` with dynamic import
- [x] Template CRUD: Edit, Duplicate, Set Default in dropdown
- [x] Lead detail tabs: New `LeadDetailTabs` with Notes/Timeline/Files
- [x] Claim tab scroll: ChevronLeft/Right arrows with gradient fade
- [x] 104+ API routes: `error.message` sanitized to generic messages
- [x] Trades feed: Error message leak sanitized

### Sprint 13 — Documents, Final Payout, Header Polish

- [x] **Documents tab**: Rewrote from raw SQL `claim_documents` → Prisma `file_assets`
- [x] **Document sharing API**: GET+POST rewritten for `file_assets`
- [x] **Final Payout PDF**: Real pdf-lib generator (Cover, Depreciation Schedule, Supplements, Footers)
- [x] **Final Payout routes**: Client calls unified `/actions` endpoint (was calling non-existent routes)
- [x] **Coverage B**: Removed $1,800 hardcode → $0 default
- [x] **PDF export**: Actions route returns base64 → client auto-downloads
- [x] **Claims header**: Blue/indigo gradient with Shield icon, white text, glass badges
- [x] **ClaimTabs**: White text on gradient, gradient scroll arrows
- [x] **Final Payout header**: Green gradient with Download PDF button
- [x] **Client invite**: Verified complete end-to-end (ClientConnectSection → mutate → Resend → portal accept)

### Sprint 14 — Security Audit, Error Sanitization, Scope Persistence

- [x] **🔒 Report-builder cross-org fix**: Added `orgId` filter to claim lookup (was CRITICAL — any user could access any claim's data)
- [x] **🔒 File upload size limit**: Added 20MB server-side limit to `handleFileUpload` in assets route
- [x] **🔒 Error.message sanitization**: 23 additional API routes sanitized (weather, damage, proposals, retail, claims RBAC, leads, tasks, legal, branding, upload, export)
- [x] **🔒 Error.stack removal**: Removed `error.stack` exposure from AI damage analyze route
- [x] **🔒 RBAC info leak**: Removed `error.currentRole` from forbidden responses in claims routes
- [x] **Scope POST persistence**: Replaced stub with real raw SQL upsert (`estimates` + `estimate_line_items` with ON CONFLICT)
- [x] **Contact form validation**: Replaced stub with real validation (required fields, email regex, length limits, sanitization, structured logging)
- [x] **Templates 404 fix**: Created `/templates/page.tsx` redirect → `/templates/projects`
- [x] **Global error contrast**: Fixed dark-text-on-dark-bg bug, hide `error.message` from production users

### Sprint 14 — Audit Findings (Verified Working ✅)

- [x] **Rate limiting**: ✅ Well-covered via Upstash Redis — 95+ routes with presets (AI: 10/min, UPLOAD: per-user, WEATHER: 20/min, WEBHOOK: per-IP, AUTH: per-user)
- [x] **Auth middleware**: ✅ Solid — proper public/protected route split in `middleware.ts`
- [x] **Claim creation flow**: ✅ Working — 5-step wizard, real Prisma, property+contact creation
- [x] **Photo upload**: ✅ Working — dual Supabase/Firebase storage with `file_assets` records
- [x] **Dashboard charts**: ✅ Real data via `ChartsPanel` (not mock)
- [x] **Onboarding**: ✅ Complete flow working
- [x] **Empty states**: ✅ Claims/Leads/Contacts all have proper empty states with CTAs
- [x] **Error boundaries**: ✅ Excellent — 30+ `error.tsx` files, Sentry integration, `global-error.tsx` fixed
- [x] **Loading states**: ✅ 123 `loading.tsx` files across app
- [x] **Claims CRUD API**: ✅ Real Prisma with org scoping
- [x] **Contacts API**: ✅ Real Prisma
- [x] **Notes/Timeline/Messages**: ✅ Real Prisma
- [x] **Weather API**: ✅ Real Open-Meteo integration
- [x] **Measurements API**: ✅ Real Prisma
- [x] **`verifyClaimAccess`**: ✅ NOT a no-op — 3 implementations exist, all do real DB checks (was incorrectly listed as P0)

### Sprint 15 — Twilio/Stripe Activation-Ready, Session Security, Cleanup

- [x] **🔧 Twilio canonical client** — Created `src/lib/twilio/client.ts` unified singleton with `isTwilioConfigured()`, `sendSms()`, `validateTwilioSignature()`. Graceful degradation: returns `{ success: false, status: "not_configured" }` when keys absent — no crashes
- [x] **🔒 SMS route hardened** — Added `checkRateLimit` to `/api/sms` (was entirely missing) + sanitized 2 error.message leaks in GET + POST handlers
- [x] **🔒 Session invalidation fixed** — Added `organizationMembership.deleted` webhook handler to Clerk webhook. Deletes `user_organizations` + `team_members` rows → `withOrgScope` immediately rejects removed users
- [x] **🧹 Orphan cleanup cron** — Created `/api/cron/orphan-cleanup` — daily cleanup of orphaned file_assets, expired WebhookEvents (30d), old read Notifications (90d). Added to `vercel.json` crons
- [x] **🧹 CSRF dead code deleted** — Removed 148-line `src/lib/security/csrf.ts` (in-memory Map, zero imports, useless on Vercel). Clerk JWT auth provides implicit CSRF protection for all API routes
- [x] **✅ Stripe billing verified FULLY WIRED** — Webhook (504 lines, HMAC + idempotency), billing guard on 27+ routes, checkout, seat management ($80/seat/month), reconciliation cron. **Activation = set env vars only**
- [x] **✅ Twilio SMS verified FULLY WIRED** — SMS Center UI, inbound webhook with HMAC, conversation threading, contact search. **Activation = set env vars only**
- [x] **✅ Stripe webhook signature** — Already validates via `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`

---

## 🚀 ACTIVATION PLAYBOOKS (Just Add Keys!)

### 📱 TWILIO SMS — Drop-In Ready

**Status:** ✅ Code complete. Zero code changes needed. Just set env vars.

**Step 1 — Vercel Environment Variables:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

**Step 2 — Twilio Console:**
1. Go to https://console.twilio.com
2. Buy a phone number (or use existing)
3. Under Phone Numbers → Active Numbers → your number:
   - Set **Messaging Webhook URL** to: `https://www.skaiscrape.com/api/webhooks/twilio`
   - Method: POST

**Step 3 — Clerk Dashboard:**
1. Go to Clerk Dashboard → Webhooks
2. Ensure `organizationMembership.deleted` is in subscribed events

**What activates:**
- ✅ Outbound SMS from SMS Center (`/sms`)
- ✅ Inbound SMS reception + threading
- ✅ Claim notification SMS (trade assignments, status updates)
- ✅ Client notification SMS
- ✅ HMAC signature validation on inbound webhooks

**Graceful when OFF:** Returns `{ success: false, status: "not_configured" }` — no crashes, no error spam.

---

### 💳 STRIPE BILLING — Flip the Switch

**Status:** ✅ Code complete. Production-grade webhook, billing guard on 27+ routes, seat management, reconciliation cron.

**Step 1 — Stripe Dashboard Setup:**
1. Create Products + Prices:
   - Solo plan → copy Price ID
   - Business plan → copy Price ID
   - Enterprise plan → copy Price ID
2. Create Webhook Endpoint:
   - URL: `https://www.skaiscrape.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.upcoming`, `customer.subscription.trial_will_end`

**Step 2 — Vercel Environment Variables:**
```
NEXT_PUBLIC_BETA_MODE=false          ← THE ACTIVATION SWITCH
STRIPE_SECRET_KEY=sk_live_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
STRIPE_PRICE_SOLO=price_xxxxxxxx
STRIPE_PRICE_BUSINESS=price_xxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxx
```

**What activates when `NEXT_PUBLIC_BETA_MODE=false`:**
- ✅ `requireActiveSubscription` enforces real subscription checks on 27+ premium routes
- ✅ Checkout route accepts payment (currently returns 403 during beta)
- ✅ Seat-based billing enforced on team invites ($80/seat/month)
- ✅ Trial expiration locks features + shows upgrade CTA
- ✅ Paywall modal appears for unsubscribed orgs
- ✅ Billing page shows real plan + invoice history
- ✅ Stripe portal button for self-service management
- ✅ Webhook processes real payment events with idempotency

**⚠️ Note:** In production (`NODE_ENV=production`), the middleware beta banner is ALWAYS hidden. The `NEXT_PUBLIC_BETA_MODE` flag only affects billing enforcement.

---

## ~~🔴 P0 — CRITICAL~~ ✅ ALL RESOLVED

~~### Auth & Security~~
- [x] ~~**CSRF protection is dead code**~~ → RESOLVED Sprint 15: Deleted dead code. Clerk JWT auth provides implicit CSRF protection.
- [x] ~~**Session invalidation**~~ → RESOLVED Sprint 15: Added `organizationMembership.deleted` webhook handler. Deletes DB rows on removal.

~~### Data Integrity~~
- [x] ~~**Stripe webhook signature verification**~~ → RESOLVED Sprint 15: Verified — already uses `stripe.webhooks.constructEvent()` with HMAC. Just set `STRIPE_WEBHOOK_SECRET` env var.
- [x] ~~**Orphan cleanup**~~ → RESOLVED Sprint 15: Created daily cron at `/api/cron/orphan-cleanup` (file_assets, WebhookEvents, Notifications).

~~### Report Generation~~
- [x] ~~**Report PDF timeout**~~ → RESOLVED: Vercel `maxDuration: 60` configured. PDF generation uses `pdf-lib` (fast, no puppeteer/chromium).

---

## 🟡 P1 — HIGH (Required for First Paying Customer Week)

### Stripe & Billing — ✅ ACTIVATION-READY (see playbook above)

- [x] **Checkout flow** — ✅ Verified: session → webhook → org provisioned. Set `NEXT_PUBLIC_BETA_MODE=false` to activate.
- [x] **Subscription management** — ✅ Verified: upgrade/downgrade/cancel via Stripe portal
- [x] **Seat-based billing** — ✅ Verified: seat limits enforced on team invites ($80/seat/month)
- [x] **Trial expiration** — ✅ Verified: locks features when trial ends, shows upgrade CTA
- [x] **Invoice history** — ✅ Verified: billing page with Stripe portal button

### Twilio / Comms — ✅ DROP-IN READY (see playbook above)

- [x] **SMS notifications** — ✅ Verified: canonical client at `src/lib/twilio/client.ts`, SMS Center UI, inbound webhook
- [ ] **Phone verification** — verify homeowner phone numbers (P2 — not blocking launch)

### Settings Pages

- [ ] **Security settings** — currently uses 100% mock data (has "🚧 Preview Mode" banner). Wire to Clerk session/device data or remove page.
- [ ] **Customer portal settings** — stub with "🚧 Preview Mode" banner. Needs real portal configuration.

### Code Quality

- [ ] **`verifyClaimAccess` consolidation** — 3 duplicate implementations exist (`src/lib/auth/verifyClaimAccess.ts`, `src/lib/auth/apiAuth.ts`, `src/lib/auth/withAuth.ts`). Should consolidate to one canonical version.
- [ ] **Trades API** — uses raw SQL against `claim_trade_assignments` (fragile). Consider Prisma model.
- [ ] **Contacts list auth** — weak auth on GET list route (uses orgId from metadata without strict validation)

### Notifications

- [ ] **In-app notifications** — bell icon with unread count
- [ ] **Email notifications** — claim status changes, team invites, payment receipts

### Mobile Responsiveness

- [ ] **Claims workspace** — verify gradient header doesn't break on mobile
- [ ] **Photo upload** — camera capture on mobile devices

---

## 🟢 P2 — MEDIUM (Polish Before Scale)

### UI/UX Consistency

- [ ] **Settings pages** — consistent card-based layout
- [ ] **Loading skeletons** — replace `Loader2` spinners with shimmer skeletons
- [ ] **Dark mode** — verify gradient headers render well in dark mode

### Data & Analytics

- [ ] **Org-wide analytics** — claims by status, revenue by month, close rate
- [ ] **Export** — CSV export for claims list, leads list, financial data

### Search & Filtering

- [ ] **Global search** — cmd+K search across claims, leads, contacts
- [ ] **Claims list filters** — by status, carrier, damage type, date range
- [ ] **Leads list filters** — by source, status, assigned user

### Integrations

- [ ] **QuickBooks** — verify OAuth flow and invoice sync
- [ ] **EagleView/Hover** — measurement order integration
- [ ] **Google Maps** — property lookup autocomplete
- [ ] **Resend** — transactional email templates tested

---

## 🔵 P3 — LOW (Post-Launch Roadmap)

### Advanced Features

- [ ] **Supplement detection** — AI scan of estimates for missing items
- [ ] **Video reports** — record and share video walkthroughs
- [ ] **Smart docs** — DocuSign-style envelope flow

### Team & Enterprise

- [ ] **Multi-org** — user can belong to multiple organizations
- [ ] **Audit log** — all mutations logged with user/timestamp
- [ ] **SSO/SAML** — enterprise authentication
- [ ] **White-label** — org branding on client portal and emails

### Performance & Observability

- [ ] **Sentry** — verify error tracking in production
- [ ] **Lighthouse CI** — enforce performance budgets
- [ ] **APM** — API response time monitoring
- [ ] **Uptime monitoring** — health check endpoint monitored externally

---

## 📋 DEPLOYMENT CHECKLIST (Before First DAU)

```
✅ Vercel Pro plan active
✅ middleware.ts — auth routes properly protected (Sprint 14)
✅ Run `npx tsc --noEmit` — 0 errors (Sprint 15)
✅ Claim creation — verified working end-to-end (Sprint 14)
✅ Photo upload — verified working end-to-end (Sprint 14)
✅ Final Payout PDF — verified working (Sprint 13)
✅ Client invite email + accept — verified (Sprint 13)
✅ Rate limiting — 95+ routes covered via Upstash Redis (Sprint 14)
✅ Error sanitization — 127+ routes sanitized (Sprints 12-15)
✅ CSRF — Clerk JWT implicit protection, dead code removed (Sprint 15)
✅ Session invalidation — org membership removal handled (Sprint 15)
✅ Orphan cleanup — daily cron job active (Sprint 15)
✅ SMS route hardened — rate limiting + error sanitization (Sprint 15)
✅ Stripe webhook HMAC — verified in code (Sprint 15)

□ DATABASE_URL pointing to production Supabase
□ CLERK_SECRET_KEY set for production
□ RESEND_API_KEY set, domain verified
□ OPENAI_API_KEY set (for AI features)
□ SENTRY_DSN configured
□ CRON_SECRET set (for cron job auth)
□ Run `pnpm build` — builds successfully on Vercel

TWILIO (when ready — see playbook above):
□ TWILIO_ACCOUNT_SID set
□ TWILIO_AUTH_TOKEN set
□ TWILIO_PHONE_NUMBER set
□ Twilio webhook → /api/webhooks/twilio

STRIPE (when ready — see playbook above):
□ NEXT_PUBLIC_BETA_MODE=false  ← THE SWITCH
□ STRIPE_SECRET_KEY set
□ STRIPE_WEBHOOK_SECRET set
□ STRIPE_PRICE_SOLO / BUSINESS / ENTERPRISE set
□ Stripe webhook → /api/webhooks/stripe
```

---

## 📊 SPRINT HISTORY

| Sprint | Commit      | Files Changed | Focus                                            |
| ------ | ----------- | ------------- | ------------------------------------------------ |
| 11     | —           | ~50           | Foundation lockdown, dead code removal           |
| 12     | —           | ~80           | QA test failures, error sanitization             |
| 13     | —           | ~60           | Documents rewrite, Final Payout PDF, headers     |
| 14     | `65c2d08`   | ~178          | Security audit, cross-org fix, scope persistence |
| 15     | `708314c`   | 7             | Twilio/Stripe activation-ready, session security |

**Total: 375+ files changed, 0 TypeScript errors, 0 P0 items remaining**

---

_This document is the single source of truth for DAU readiness. Update after each sprint._

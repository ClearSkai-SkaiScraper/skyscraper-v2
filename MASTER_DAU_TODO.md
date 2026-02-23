# 🎯 MASTER DAU READINESS TODO — SkaiScraper Pro

> **Last Updated:** Sprint 14 (commit `65c2d08`)
> **Goal:** Daily Active Users — production-ready for real paying customers
> **Status:** 368 file changes since lockdown, 0 TypeScript errors

---

## ✅ COMPLETED (Sprints 11–14)

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

---

## 🔴 P0 — CRITICAL (Block DAU Launch)

### Auth & Security

- [ ] **CSRF protection is dead code** — Module exists at `src/lib/security/csrf.ts` but is NEVER imported anywhere. Uses in-memory Map (useless on Vercel serverless). Needs Redis-backed implementation or Clerk session token approach. **Architecture decision required.**
- [ ] **Session invalidation** — when user removed from org, existing Clerk sessions must terminate

### Data Integrity

- [ ] **Stripe webhook signature verification** — ensure `STRIPE_WEBHOOK_SECRET` is set and validated in prod
- [ ] **Orphan cleanup** — file_assets without valid claimId after claim deletion (cron job or cascade)

### Report Generation

- [ ] **Report PDF timeout** — verify PDF generation completes under Vercel 60s timeout on prod

---

## 🟡 P1 — HIGH (Required for First Paying Customer Week)

### Stripe & Billing ⏸️ (Deferred)

- [ ] **Checkout flow** — verify session → webhook → org provisioned
- [ ] **Subscription management** — upgrade/downgrade/cancel from settings
- [ ] **Seat-based billing** — enforce seat limits on team invites
- [ ] **Trial expiration** — lock features when trial ends, show upgrade CTA
- [ ] **Invoice history** — customer billing page in settings

### Twilio / Comms ⏸️ (Deferred)

- [ ] **SMS notifications** — claim updates via Twilio
- [ ] **Phone verification** — verify homeowner phone numbers

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
□ DATABASE_URL pointing to production Supabase
□ CLERK_SECRET_KEY set for production
□ STRIPE_WEBHOOK_SECRET verified
□ RESEND_API_KEY set, domain verified
□ OPENAI_API_KEY set (for AI features)
□ SENTRY_DSN configured
□ next.config.mjs — no dev-only redirects
✅ middleware.ts — auth routes properly protected (verified Sprint 14)
✅ Run `npx tsc --noEmit` — 0 errors
□ Run `pnpm build` — builds successfully
✅ Claim creation — verified working end-to-end (Sprint 14 audit)
✅ Photo upload — verified working end-to-end (Sprint 14 audit)
□ Test report generation under prod timeout
✅ Final Payout PDF — verified working (Sprint 13)
✅ Client invite email + accept — verified (Sprint 13)
□ Test Stripe checkout → subscription active
□ DNS: skaiscrape.com → Vercel
□ SSL: valid certificate
□ robots.txt: allow search engines
□ sitemap.xml: generated
```

---

## 📊 Sprint Velocity

| Sprint | Files Changed | Key Deliverables                                              |
| ------ | ------------- | ------------------------------------------------------------- |
| 11     | 150           | Token removal, real AI, security hardening                    |
| 12     | 98            | QA failures fixed, error sanitization                         |
| 13     | 98            | Documents fix, Final Payout PDF, header polish                |
| 14     | 22            | Security audit, cross-org fix, scope persistence, 23 sanitizations |

**Total since lockdown:** 368 file changes, 0 TypeScript errors

---

_This document is the single source of truth for DAU readiness. Update after each sprint._

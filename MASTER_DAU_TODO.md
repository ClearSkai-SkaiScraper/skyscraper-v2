# 🎯 MASTER DAU READINESS TODO — SkaiScraper Pro

> **Last Updated:** Sprint 13 (commit `01b094f`)
> **Goal:** Daily Active Users — production-ready for real paying customers
> **Status:** 98 files changed in Sprint 12+13, 0 TypeScript errors

---

## ✅ COMPLETED (Sprints 11–13)

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

---

## 🔴 P0 — CRITICAL (Block DAU Launch)

### Auth & Security
- [ ] **`verifyClaimAccess` is a no-op** — always returns true. Any authenticated user can send invites on any claim. Must check org membership. (`src/app/api/claims/[claimId]/mutate/route.ts` ~line 61)
- [ ] **Rate limiting on auth-sensitive endpoints** — login, invite, password reset
- [ ] **CSRF protection** on mutation endpoints
- [ ] **Session invalidation** — when user removed from org, existing sessions must terminate

### Data Integrity
- [ ] **Stripe webhook signature verification** — ensure `STRIPE_WEBHOOK_SECRET` is set in prod
- [ ] **Database connection pooling** — verify PgBouncer/Supabase pooler config for prod load
- [ ] **File upload size limits** — enforce server-side (not just client)
- [ ] **Orphan cleanup** — file_assets without valid claimId after claim deletion

### Core Functionality Gaps
- [ ] **Claim creation flow** — verify end-to-end: form → API → DB → redirect to workspace
- [ ] **Photo upload** — verify upload → Supabase Storage → file_assets row → display
- [ ] **Report generation** — verify PDF generation completes under Vercel 60s timeout
- [ ] **Email deliverability** — verify Resend domain verification, SPF/DKIM on `skaiscrape.com`

---

## 🟡 P1 — HIGH (Required for First Paying Customer Week)

### Stripe & Billing
- [ ] **Checkout flow** — verify session → webhook → org provisioned
- [ ] **Subscription management** — upgrade/downgrade/cancel from settings
- [ ] **Seat-based billing** — enforce seat limits on team invites
- [ ] **Trial expiration** — lock features when trial ends, show upgrade CTA
- [ ] **Invoice history** — customer billing page in settings

### Onboarding
- [ ] **Org creation** — clean flow: sign up → create org → invite team → first claim
- [ ] **Guided first claim** — tooltip/wizard for new users creating their first claim
- [ ] **Sample data** — option to create demo claim for exploration

### Notifications
- [ ] **In-app notifications** — bell icon with unread count
- [ ] **Email notifications** — claim status changes, team invites, payment receipts
- [ ] **Webhook notifications** — for integrations (QuickBooks, etc.)

### Mobile Responsiveness
- [ ] **Claims workspace** — verify gradient header doesn't break on mobile
- [ ] **Photo upload** — camera capture on mobile devices
- [ ] **Tab overflow** — scroll arrows working on all screen sizes (verified ✅ but re-test in prod)

---

## 🟢 P2 — MEDIUM (Polish Before Scale)

### UI/UX Consistency
- [ ] **Leads workspace header** — already has teal gradient ✅, verify parity with claims
- [ ] **Retail workspace header** — already has amber gradient ✅, verify parity
- [ ] **Settings pages** — consistent card-based layout
- [ ] **Empty states** — all tables/lists show helpful empty states with CTAs
- [ ] **Loading skeletons** — replace `Loader2` spinners with shimmer skeletons
- [ ] **Dark mode** — verify gradient headers render well in dark mode

### Data & Analytics
- [ ] **Dashboard metrics** — verify ChartsPanel fetches real data (not mock)
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
- [ ] **AI damage analysis** — photo → AI → damage assessment (endpoint exists, needs QA)
- [ ] **Supplement detection** — AI scan of estimates for missing items
- [ ] **Weather data** — auto-populate from NOAA/OpenWeather for date of loss
- [ ] **Video reports** — record and share video walkthroughs
- [ ] **Smart docs** — DocuSign-style envelope flow
- [ ] **Proposal builder** — send branded proposals to homeowners

### Team & Enterprise
- [ ] **Role-based permissions** — admin vs member vs viewer
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
□ Vercel Pro plan active
□ DATABASE_URL pointing to production Supabase
□ CLERK_SECRET_KEY set for production
□ STRIPE_WEBHOOK_SECRET verified
□ RESEND_API_KEY set, domain verified
□ OPENAI_API_KEY set (for AI features)
□ SENTRY_DSN configured
□ next.config.mjs — no dev-only redirects
□ middleware.ts — auth routes properly protected
□ Run `npx tsc --noEmit` — 0 errors ✅
□ Run `pnpm build` — builds successfully
□ Test claim creation end-to-end
□ Test photo upload end-to-end
□ Test report generation
□ Test Final Payout PDF download
□ Test client invite email + accept
□ Test Stripe checkout → subscription active
□ DNS: skaiscrape.com → Vercel
□ SSL: valid certificate
□ robots.txt: allow search engines
□ sitemap.xml: generated
```

---

## 📊 Sprint Velocity

| Sprint | Files Changed | Key Deliverables |
|--------|-------------|-----------------|
| 11 | 150 | Token removal, real AI, security hardening |
| 12 | 98 | QA failures fixed, error sanitization |
| 13 | 98 | Documents fix, Final Payout PDF, header polish |

**Total since lockdown:** 346 file changes, 0 TypeScript errors

---

*This document is the single source of truth for DAU readiness. Update after each sprint.*

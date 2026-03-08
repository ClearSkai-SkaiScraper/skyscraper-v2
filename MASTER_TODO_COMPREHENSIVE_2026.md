# 🏗️ MASTER COMPREHENSIVE TODO — SkaiScraper Platform

> **Last Updated:** March 2026  
> **Total Items:** 147 tracked items across 12 sprints  
> **Status:** Active development — Retail/Lead pivot in progress

---

## ✅ COMPLETED (Prior Sessions)

### Session 1 — Core Hardening (All 4 Sprints)

- [x] E-Sign email integration (full rewrite with Resend)
- [x] Signature save route (rewrite to use SignatureEnvelope)
- [x] 7 AI routes hardened with auth + rate limiting
- [x] Prisma schema drift fixed (6 new models, Org fields)
- [x] Security settings page built
- [x] White-Label settings page built
- [x] Service Areas settings page built
- [x] Customer Portal settings page built
- [x] PDF generation fixed (jsPDF fallback replacing broken Puppeteer)
- [x] Retail Wizard expanded (Steps 5 Measurements + 6 Review)
- [x] Manager hierarchy UX (direct report badges + Add Direct Report)
- [x] Company edit audit logging added
- [x] RBAC verified consolidated
- [x] Master TODO updated

### Session 2 — Critical Fixes

- [x] LegalGate — reduced required docs (only TOS + Privacy gate), added "Skip for now" button
- [x] Branding persistence — layout dual-ID lookup (DB UUID + Clerk org ID)
- [x] Financial Overview — lowered RBAC from PM to FIELD_TECH (employees see own data)
- [x] RBAC `/api/rbac/me` — rewired to use `getActiveOrgContext` (fixes null Clerk orgId)
- [x] Bid Package — converted to retail-first (Retail Proposal preset default, insurance moved to secondary)
- [x] Smart Documents — added job/claim dropdown, expanded signer roles, reordered templates retail-first
- [x] Section Registry — reordered retail sections first (order 3-7), insurance sections lower (10-11)

---

## 🔴 SPRINT 1 — P0 CRITICAL (Ship-Blocking)

### 1.1 Auth & Security

- [ ] **Fix 9 unprotected portal API routes** — `/api/portal/invite`, `/api/portal/profile`, `/api/portal/uploads`, `/api/portal/claims/accept`, `/api/portal/files`, `/api/portal/events`, `/api/portal/timeline` need auth middleware
- [ ] **Portal login codes never sent** — `src/app/api/portal/auth/magic-link/route.ts` TODO at L167: email sending not implemented
- [ ] **Client portal investigation** — portal has been down per prior audit, needs end-to-end test
- [ ] **Stripe webhook signature verification** — ensure all webhook routes validate Stripe signatures

### 1.2 Data Integrity

- [ ] **Token system not wired** — `src/app/api/tokens/consume/route.ts` L18: no DB transaction for token ledger, balance always returns 0 at L151
- [ ] **Token upsell modal placeholder** — `TokenGate` L43: "TODO: Implement upsell modal"
- [ ] **Team invite emails never sent** — `src/app/api/seats/invite/route.ts` has 2 TODO stubs, invitation is created but never emailed
- [ ] **Notifications never stored** — `TradeNotification`/`ClientNotification` models missing, 6+ routes affected

### 1.3 Missing Prisma Models (Referenced in Code)

- [ ] `contractor_dispatch` — used in AI dispatch route
- [ ] `ai_actions` — used in AI dispatch route
- [ ] `claim_automation_events` — used in AI dispatch route
- [ ] `BatchJob` / `MailerBatch` / `MailerJob` — used in mailer routes
- [ ] `RetailJob` — used in retail job API
- [ ] `agent_runs` — used in AI agents API
- [ ] `universalTemplate` — used in templates API
- [ ] `share_tokens` — used in share links API
- [ ] `contractor_forms` — used in contractor forms API
- [ ] `tradesInvite` / `jobApplication` / `clientInvitation` / `claimTradesCompany` — trades network
- [ ] `tradesCompanyEmployee` / `tradesJoinRequest` / `tradesSeatInvite` — trades team
- [ ] `portfolioItem` / `verificationRequest` — trades profile
- [ ] `tradesBlock` — trades blocking
- [ ] `tradesOnboardingInvite` — onboarding flow
- [ ] `email_queue` / `email_logs` — email system
- [ ] `Notes` model — used in notes API

---

## 🟠 SPRINT 2 — P1 REVENUE-CRITICAL

### 2.1 Stripe & Billing

- [ ] **End-to-end Stripe checkout flow test** — verify signup → trial → payment works
- [ ] **Trial period verification** — cron jobs depend on missing trial fields
- [ ] **Seat-based billing calculation** — verify seat count → billing amount
- [ ] **Payment receipt emails** — `src/app/api/webhooks/stripe/route.ts` L186: "TODO: Send receipt email to customer via Resend"
- [ ] **Stripe key validation re-enable** — `L16: TODO: Re-enable Stripe key validation`
- [ ] **Archive cold storage subscription** — `src/app/(app)/archive/page.tsx` L85: Stripe checkout for $7.99/mo not implemented

### 2.2 Email System

- [ ] **Welcome email on signup** — not wired
- [ ] **Report email delivery** — `src/app/api/reports/*/route.ts` L351/359: "TODO: Integrate with Resend email system"
- [ ] **Email queue system** — `src/lib/queue/emailQueue.ts` L19: in-memory queue only, needs Redis/BullMQ
- [ ] **Claim financial email** — `src/app/(app)/claims/[claimId]/financial/page.tsx` L850: "Email integration coming soon"

### 2.3 Report Generation Pipeline

- [ ] **18 placeholder section renderers** — ALL renderers in `SectionRegistry.ts` use `placeholderRender()` returning empty HTML:
  - Cover Page, TOC, Executive Summary, Weather, Contractor Notes, Photos, Test Cuts, Scope Matrix, Code Compliance, Pricing, Supplements, Signature, Attachments, Retail Proposal, Customer Details, Materials, Payment Schedule, Warranty
- [ ] **Contractor packet PDF assembly** — `src/app/api/contractor-packet/route.ts` L156/185/359: packet assembly not wired
- [ ] **Org branding injection** — only 1/19 export routes inject branding (per MASTER_TODO)
- [ ] **DOCX export** — `claims-ready-folder/page.tsx` L534: "DOCX (Coming Soon)"

---

## 🟡 SPRINT 3 — P2 FEATURE COMPLETION

### 3.1 Job Value Approval Workflow

- [ ] **Add `predictedValue` field to leads model** — employee-entered estimated job value
- [ ] **Add `valueStatus` field** — enum: `pending_approval`, `approved`, `rejected`
- [ ] **Add `valueApprovedBy` field** — FK to user who approved
- [ ] **Build approval API** — `POST /api/leads/[id]/value-approval` with manager auth check
- [ ] **Fallback logic** — if no manager assigned, route approval to org admin
- [ ] **Job value approval UI** — card on job detail page showing predicted value + approve/reject buttons
- [ ] **Manager notification** — notify manager when employee sets a job value
- [ ] **Approval history** — track all value changes with timestamps

### 3.2 Drag-and-Drop Org Chart

- [ ] **New page** — `src/app/(app)/teams/org-chart/page.tsx`
- [ ] **Left sidebar** — scrollable list of all employees with search/filter
- [ ] **Main canvas** — drag-and-drop hierarchy builder
- [ ] **Node structure** — admin → manager → employee nesting with + buttons
- [ ] **API endpoint** — `PUT /api/teams/hierarchy` to persist parent-child relationships
- [ ] **dnd-kit integration** — use `@dnd-kit/core` for drag-and-drop
- [ ] **Auto-layout** — dagre or elkjs for automatic tree layout
- [ ] **Visual indicators** — role badges, avatar photos, department colors

### 3.3 Maps & Weather

- [ ] **Map view implementation** — `src/app/(app)/maps/map-view/page.tsx` L286: "Map Coming Soon"
- [ ] **Weather chains analysis** — `src/app/(app)/weather-chains/page.tsx` L27: "Coming Soon: Multi-year storm causation analysis"
- [ ] **Storm map images** — `src/lib/maps/storm-maps.ts` returns placeholder URLs instead of real data
- [ ] **Weather data API integration** — `src/app/api/weather/batch/route.ts` uses placeholder data when API key missing
- [ ] **DOL integration** — `src/app/api/dol/route.ts` is a placeholder

### 3.4 AI Tools

- [ ] **AI dispatch fully wired** — 3 missing models needed for dispatch tracking
- [ ] **Report assembly integration** — `ReportAssemblyClient.tsx` L19-152: placeholder data stubs
- [ ] **Damage builder intelligence** — secondary peril intelligence is placeholder
- [ ] **AI action logging** — `ai_actions` model needed for audit trail

---

## 🔵 SPRINT 4 — P2 CONTINUED

### 4.1 Claims Pipeline Gaps

- [ ] **Trade partner assignment** — trade partner integration in claims
- [ ] **Evidence collection workflow** — `evidenceAsset` model fallback to FileAsset
- [ ] **File visibility controls** — claim document sharing with clients
- [ ] **Claim import from Xactimate** — `src/app/api/claims/[claimId]/import/route.ts` is a stub
- [ ] **Claim predict AI** — prediction model not wired
- [ ] **Status lifecycle automation** — claim status transitions need automation rules

### 4.2 Materials & Scopes

- [ ] **Materials page features** — `src/app/(app)/materials/page.tsx` L105/118: 2 features "Coming Soon"
- [ ] **Scope cleanup & merge** — `src/app/(app)/scopes/new/page.tsx` L496: "Coming Soon"
- [ ] **Material estimator** — library file exists but needs real integration
- [ ] **Xactimate parser** — `src/lib/parsers/xactimate.ts` returns empty objects

### 4.3 Leads Pipeline

- [ ] **Bulk CSV import** — `src/app/(app)/leads/import/page.tsx` L30: "coming soon"
- [ ] **Lead pipeline settings** — `src/app/(app)/leads/settings/page.tsx` L16: "Placeholder for lead pipeline configuration"
- [ ] **Lead scoring algorithm** — no AI scoring for lead prioritization
- [ ] **Lead source tracking** — referral/marketing channel attribution

### 4.4 Commission System

- [ ] **Commission calculation engine** — verify math for commission plans
- [ ] **Commission approval workflow** — manager review + payment tracking
- [ ] **Commission payout integration** — Stripe Connect or manual tracking
- [ ] **Commission dispute resolution** — allow reps to dispute calculations

---

## 🟢 SPRINT 5 — P3 POLISH & UX

### 5.1 Client Portal

- [ ] **Portal auth flow** — magic link emails not sending
- [ ] **Portal branding** — `L55: TODO: Get orgId from client's linked contractor`
- [ ] **Document management** — `src/app/client/[slug]/documents/page.tsx` L32: "Full document management coming soon"
- [ ] **Client messaging** — `L371: TODO: Store in messages table`
- [ ] **Find-a-Pro page** — `portal/find-a-pro/[id]/page.tsx` L376: disabled button "Coming soon"

### 5.2 Settings Pages

- [ ] **Cover page PDF export** — `settings/branding/cover-page/page.tsx` L164: "coming soon" toast
- [ ] **Settings "Coming soon" card** — `settings/page.tsx` L414: one card placeholder
- [ ] **Team pending invitations** — `settings/team/page.tsx` L65: returns empty, model doesn't support it
- [ ] **White-label backend** — verify persistence for all white-label settings
- [ ] **Customer portal settings backend** — verify persistence for portal config
- [ ] **Migration tool API keys** — `settings/migrations/page.tsx`: integration status unknown

### 5.3 Trades Network

- [ ] **Trades orders integration** — `trades/orders/page.tsx` L334-347: "Pro account integration coming soon"
- [ ] **Vendor portal** — "Vendor Portal Integration — Coming Soon"
- [ ] **Trades blocking** — `tradesBlock` model doesn't exist, block action is no-op
- [ ] **Portfolio items** — `portfolioItem` model doesn't exist
- [ ] **Verification requests** — `verificationRequest` model doesn't exist

---

## 🔵 SPRINT 6 — P3 INFRASTRUCTURE

### 6.1 Background Workers

- [ ] **Queue system upgrade** — replace in-memory queue with Redis/BullMQ (`src/lib/queue/emailQueue.ts`)
- [ ] **Contractor packet worker** — `process-uploads-worker.js` uses placeholder content
- [ ] **Notification delivery** — push notifications stub (`L41: TODO: Send via push service`)
- [ ] **Cron job stability** — 3 cron jobs depend on missing models

### 6.2 Health & Observability

- [ ] **Health check completeness** — `src/app/api/health/live/route.ts` L62-98: Redis, S3/R2, email, WebSocket checks all stubbed
- [ ] **File upload storage** — `L187: TODO: Implement storage upload (Supabase/Vercel Blob)`
- [ ] **Error tracking coverage** — ensure Sentry captures all API route errors
- [ ] **Performance monitoring** — add tracing to critical paths

### 6.3 Cleanup

- [ ] **Remove 31 deprecated API routes** returning stubs (vendors, artifacts, templates, reports, claims, HOA, retail, jobs, AI, community, docs, mailers)
- [ ] **Remove mock/demo data** — hardcoded user IDs and placeholder emails in 4+ files
- [ ] **Remove "Dominus" references** — 15+ internal files still named "Dominus"
- [ ] **Remove console.log statements** in API routes
- [ ] **Clean stub library files** — 17 zero-implementation stubs in src/lib/

---

## 🟣 SPRINT 7 — TEST COVERAGE

### 7.1 Critical Path Tests

- [ ] **Claims CRUD** — 20+ API routes, zero test coverage
- [ ] **Stripe webhooks** — payment processing untested
- [ ] **Portal auth & routes** — client-facing security untested
- [ ] **Report generation** — revenue-critical feature untested
- [ ] **File uploads** — data integrity untested
- [ ] **Commission calculations** — financial accuracy untested

### 7.2 Integration Tests

- [ ] **Trades network** — multi-tenant data isolation
- [ ] **AI tools** — supplement, dispatch, damage-builder
- [ ] **Task system** — workflow management
- [ ] **Template system** — report generation pipeline
- [ ] **Appointment scheduling** — calendar features

### 7.3 E2E Tests

- [ ] **Signup → onboarding → first claim flow**
- [ ] **Client portal: invite → login → view claim → sign document**
- [ ] **Bid package: create → customize → export → send**
- [ ] **Commission: calculate → approve → pay**

---

## 🟤 SPRINT 8 — ADVANCED FEATURES

### 8.1 Template System

- [ ] **Consolidate 3 coexisting template systems** — per MASTER_TODO
- [ ] **Template sections CRUD** — `api/templates/[templateId]/sections/[sectionId]/route.ts` PATCH & DELETE are stubs
- [ ] **Universal template model** — `universalTemplate` doesn't exist in schema

### 8.2 Document Intelligence

- [ ] **Photo annotation AI** — text overlay SVG not implemented
- [ ] **Background removal** — image processing not implemented
- [ ] **OCR for uploaded documents** — extract text from PDFs/images
- [ ] **Smart document suggestions** — AI recommends templates based on job type

### 8.3 HOA Integration

- [ ] **HOA storm notices** — `src/app/api/hoa/notices/[id]/send/route.ts` fully stubbed
- [ ] **HOA letter template** — `src/lib/reports/hoaStormNotice.ts` is stub
- [ ] **HOA batch mailing** — send notices to HOA communities

### 8.4 Accounting Integration

- [ ] **QuickBooks sync** — test file exists but production wiring unknown
- [ ] **Accounting system integration** — `ClaimWorkspaceShell.tsx` L1770: "coming soon"

---

## ⚪ SPRINT 9 — OPTIMIZATION

### 9.1 Performance

- [ ] **Database query optimization** — N+1 queries in pipeline/claims pages
- [ ] **Image optimization** — lazy loading for photo evidence grids
- [ ] **Bundle size audit** — remove unused dependencies
- [ ] **Edge caching** — cache static API responses at edge

### 9.2 Mobile/Field Mode

- [ ] **Field mode completeness** — Builder.tsx fieldMode prop exists but not fully responsive
- [ ] **Offline support** — service worker for field use without internet
- [ ] **Camera integration** — direct photo capture → upload → evidence grid

### 9.3 Accessibility

- [ ] **WCAG 2.1 AA compliance audit**
- [ ] **Keyboard navigation** for all interactive components
- [ ] **Screen reader support** — aria labels for complex components
- [ ] **Color contrast** — verify all text meets minimum contrast ratios

---

## ⚫ SPRINT 10 — ENTERPRISE

### 10.1 Multi-Org

- [ ] **Org switching** — user belongs to multiple orgs
- [ ] **Cross-org reporting** — aggregate data across organizations
- [ ] **Org-level permissions** — different permissions per org

### 10.2 Audit & Compliance

- [ ] **Full audit trail** — every data change logged with actor + timestamp
- [ ] **Data export** — GDPR-compliant data export for users
- [ ] **Data retention policies** — automatic cleanup of old data
- [ ] **SOC 2 evidence collection** — automated compliance reporting

### 10.3 Advanced Billing

- [ ] **Usage-based billing** — metered API calls, AI usage, storage
- [ ] **Enterprise plans** — custom pricing, SLA, dedicated support
- [ ] **Billing portal** — self-service plan management
- [ ] **Invoice generation** — PDF invoices for enterprise customers

---

## 📊 SPRINT 11 — ANALYTICS & REPORTING

### 11.1 Business Intelligence

- [ ] **Executive dashboard** — company-wide KPIs, trends, forecasts
- [ ] **Revenue forecasting** — AI-powered pipeline predictions
- [ ] **Customer lifetime value** — CLV calculations per client
- [ ] **Rep performance analytics** — detailed sales metrics per team member

### 11.2 Custom Reports

- [ ] **Report builder UI** — drag-and-drop custom report creation
- [ ] **Scheduled reports** — auto-generate and email reports weekly/monthly
- [ ] **Export formats** — CSV, Excel, PDF for all report types

---

## 🔶 SPRINT 12 — SCALE & RELIABILITY

### 12.1 Infrastructure

- [ ] **Database read replicas** — for analytics queries
- [ ] **CDN for file assets** — move from Supabase to CDN edge delivery
- [ ] **Rate limiting per-plan** — different limits for free/pro/enterprise
- [ ] **Webhook retry system** — reliable delivery with exponential backoff

### 12.2 Monitoring

- [ ] **Uptime monitoring** — external health checks
- [ ] **Alert system** — PagerDuty/Slack alerts for critical failures
- [ ] **Usage dashboards** — real-time platform metrics
- [ ] **Cost tracking** — per-customer infrastructure costs

---

## 📈 Priority Matrix

| Priority         | Sprint     | Items    | Status         |
| ---------------- | ---------- | -------- | -------------- |
| **P0 Critical**  | Sprint 1   | 18 items | 🔴 Not started |
| **P1 Revenue**   | Sprint 2   | 15 items | 🟠 Not started |
| **P2 Features**  | Sprint 3-4 | 30 items | 🟡 Not started |
| **P3 Polish**    | Sprint 5-6 | 28 items | 🟢 Not started |
| **Tests**        | Sprint 7   | 15 items | 🟣 Not started |
| **Advanced**     | Sprint 8   | 12 items | 🟤 Not started |
| **Optimization** | Sprint 9   | 11 items | ⚪ Not started |
| **Enterprise**   | Sprint 10  | 10 items | ⚫ Not started |
| **Analytics**    | Sprint 11  | 8 items  | 📊 Not started |
| **Scale**        | Sprint 12  | 8 items  | 🔶 Not started |

---

## 🎯 Immediate Next Actions (This Week)

1. **Fix portal auth** — magic link email sending (Sprint 1.1)
2. **Wire token system** — DB transactions for token ledger (Sprint 1.2)
3. **Send team invite emails** — complete invite flow (Sprint 1.2)
4. **Test Stripe checkout** — end-to-end payment flow (Sprint 2.1)
5. **Implement section renderers** — start with Cover Page + Retail Proposal (Sprint 2.3)
6. **Build job value approval workflow** — new feature (Sprint 3.1)
7. **Build drag-and-drop org chart** — new feature (Sprint 3.2)

---

_This TODO is the single source of truth for all remaining SkaiScraper development work._  
_Updated automatically as sprints are completed. Never delete completed items — mark them [x]._

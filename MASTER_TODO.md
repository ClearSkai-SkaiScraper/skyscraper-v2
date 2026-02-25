# 🏗️ MASTER TODO — SkaiScraper Pro CRM

> **Last Updated:** February 25, 2026  
> **Current State:** Production-deployed at [skaiscrape.com](https://skaiscrape.com)  
> **HEAD Commit:** Sprint 28 (post `140e758`)  
> **AI Brand:** SkaiPDF (formerly "Dominus AI" — fully renamed)  
> **Pricing:** $80/seat/month

---

## 🔥 SPRINT 28 — COMPLETED (Feb 25, 2026)

### Tool Renaming (User-Facing)

- [x] **Claims-Ready Folder → Claim Packet** — sidebar, mobile nav, page titles, hero cards, help content
- [x] **Contractor Packet → Bid Package** — sidebar, mobile nav, page titles, hero cards, help content, error pages
- [x] **Report Builder → Quick Reports** — sidebar, mobile nav, page titles, hero cards, help content

### Reports Hub Upgrade

- [x] Added 3 hero feature cards: Claim Packet, Bid Package, Quick Reports
- [x] Each card: gradient icon, title, description, 3 checklist features, slide-under hover animation
- [x] CTA buttons updated to match new names

### AI Proposals Complete Removal

- [x] Deleted all AI Proposals pages (`ai-proposals/`, `proposals/`, `proposals/[id]/`)
- [x] Deleted all proposal API routes (~8 routes: build, render, publish, download, status)
- [x] Deleted all proposal templates (retail/v1, claims/v1, contractor/v1)
- [x] Deleted all proposal lib files (ai.ts, context.ts, render.ts, types.ts, proposalPresets.ts)
- [x] Cleaned sidebar, mobile nav, sectionThemes, helpContent references
- [x] Stubbed proposalRenderer.tsx for backward compat with generated_documents

### Remote View Access Control

- [x] Restricted `canRemoteView` to `hasMinRole("admin")` in client permissions
- [x] Restricted `canUseRemoteView()` to `hasMinRole(role, "admin")` in server constants
- [x] Removed `remote_view:view` from manager role in ROLE_PERMISSIONS matrix
- [x] Employee/team/manager seats no longer see Remote View

### Material Estimator Upgrade

- [x] Added ClaimJobSelect — link estimates to a job or claim
- [x] Added "Save Estimate" with localStorage persistence
- [x] Added Saved Estimates panel with card grid, material summaries, slide-under animation
- [x] Added 3-dot action menu: Transfer to ABC Supply, Request Vendor Quote, Email to Partner
- [x] Email actions auto-generate materials list as mailto body

### Dashboard & UI Fixes (Sprint 27-28)

- [x] Dashboard: Removed "Dashboard Unavailable" blocking render when orgId null
- [x] KPI Dashboard: Wrapped in outer try-catch, still renders client on error
- [x] Claims Timeline: Complete rewrite with real Prisma data, pipeline stages, KPIs
- [x] AI Mockup: Theme token CSS fix (`bg-[var(--surface-glass)]`)
- [x] Commission Plans: Merged into main commissions page as collapsible panel (368 lines)
- [x] Finance Overview: Updated commission plans link to /commissions
- [x] Messages Create API: 3-strategy recipient ID resolution (direct, Clerk lookup, internal lookup)

---

## 🚨 CRITICAL FIXES COMPLETED (Feb 20, 2026)

### Pipeline & Claims Fixes

- [x] Fixed job pipeline lifecycle_stage enum error — was using invalid values (ACTIVE, INTAKE, CLOSED)
- [x] Fixed to use valid ClaimLifecycleStage enum: FILED, ADJUSTER_REVIEW, APPROVED, DENIED, APPEAL, BUILD, COMPLETED, DEPRECIATION
- [x] Removed Community & Batch Reports from sidebar navigation (feature deferred)
- [x] Added side widgets to Claims workspace (Claim Value, Key Dates, Adjuster Contact, Quick Actions)

### Known Issues (Billing Gate - Expected Behavior)

- Weather Analytics returns HTTP 402 — This is correct behavior: `requireActiveSubscription()` gates premium features
- Users must have active subscription (status: "active" or "trialing") to access Weather Analytics

---

## 🔥 P0 — IMMEDIATE PRIORITIES (Feb 20-27, 2026)

### Manager Hierarchy System (Company Seats Page)

- [ ] Add "Manager" role type to user_organizations/tradesCompanyMember
- [ ] Create downline relationship model (manager → employees)
- [ ] UI on Company Seats page to assign employees to managers
- [ ] Managers can see only their team's data (scoped queries)

### Task & Request Routing

- [ ] Create tasks table (if not exists): task_requests with assignee, approver, status
- [ ] Tasks/requests route to assigned manager instead of admin
- [ ] Job value approval workflow: employee submits → manager approves → admin final approval
- [ ] Notification system for pending approvals

### Job Value Display

- [ ] Add job value summary in claim/lead header
- [ ] Display estimated/approved amounts prominently
- [ ] Quick edit for job value from header

### Dashboard Fixes

- [ ] Trades Pro card widget not displaying on main dashboard — investigate `/api/trades/profile`
- [ ] Clean up demo admin/test data from leaderboard — remove "Demo Admin" entries
- [ ] Ensure leaderboard pulls real user data only (no test records)

### Client Portal (CRITICAL)

- [ ] Client dashboard has been down for a week — INVESTIGATE
- [ ] Portal layout renders but may have data fetching issues
- [ ] Check `/api/portal/*` endpoints for errors
- [ ] Verify `ClientPortalWrapper` and `PortalErrorBoundary` are working

### Company Page Flow

- [ ] User reports "No Company" on trades company page despite having a company
- [ ] Check `/api/trades/company` auto-heal logic
- [ ] Verify tradesCompanyMember → tradesCompany linkage
- [ ] ClearSkai should be attached as user's company

---

## ✅ COMPLETED (Sprint 1–28+)

### Security & Auth

- [x] Clerk auth migration with 5-layer identity resolution
- [x] Cross-tenant data leak fixes (settings/export, exports/queue, branding/status, weather/export)
- [x] Dev auth backdoor removed from branding/status
- [x] RBAC enforcement across all write routes
- [x] Rate limiting (9 Upstash Redis presets: AI, UPLOAD, WEATHER, API, WEBHOOK, PUBLIC, AUTH, MIGRATION, API_KEYS)
- [x] AI Zod validation on all AI routes
- [x] Webhook HMAC verification (Stripe)

### Data Persistence (P1)

- [x] Enhanced Report Builder → `reports` table
- [x] Mockup Generator → `GeneratedArtifact` table
- [x] Vision Lab Analyzer → `GeneratedArtifact` table
- [x] All report actions persist to `ai_reports` / `claim_activities`

### Phantom Model Elimination

- [x] Eliminated 7 phantom Prisma models from report service (reportEvent, reportSend, reportPacket, reportNote, reportShareLink, emailDraft, reportQueue)
- [x] Rewrote `src/lib/domain/reports/index.ts` — uses only real `ai_reports` model
- [x] Rewrote `src/app/api/reports/actions/route.ts` — delegates to service layer

### OrgId & Branding

- [x] Fixed Clerk org_xxx → internal UUID mismatch in enhanced-report-builder
- [x] Dynamic org branding in complete-packet export (was hardcoded "Dominus AI")
- [x] Rate limit preset fix: `"complete-packet"` → `"API"`

### Mockup Route Cleanup

- [x] Archived 3 fake/dead mockup routes (ai-mockup, mockups-css-filter, generate-mockup-text-only)
- [x] Kept only real DALL-E 3 route at `/api/mockup/generate`
- [x] Updated 3 frontend references to canonical route

### AI Rebranding (Dominus → SkaiPDF)

- [x] All user-visible UI strings renamed (tasks page, automation page, CRM, command bar, god mode button)
- [x] All export engine strings renamed (Xactimate XML, Symbility JSON, carrier summary)
- [x] AI automation prompt updated ("You are SkaiPDF, the SkaiScraper AI...")
- [x] All automation executor userId/userName updated ("skai" / "SkaiPDF")
- [x] Event bus constants renamed (SKAI_ANALYSIS_STARTED, emitSkaiCompleted)
- [x] Predictor, reconstructor, timeline merger — internal variable names updated
- [x] Video worker model name updated to "skai-video"
- [x] Path constants updated (ASK_SKAI, AI_VIDEO_JOB)
- [x] Log prefixes updated from [DOMINUS] → [SKAI]

### Titan Client Reference Cleanup

- [x] Archived 9 Titan-specific planning docs to `archive/titan-planning/`
- [x] Renamed `public/titan-proof/` → `public/enterprise-proof/`
- [x] Scrubbed client name from all enterprise-proof HTML files
- [x] Updated about page links from `/titan-proof/` → `/enterprise-proof/`
- [x] Cleaned client references from load test comments and ENTERPRISE_READINESS.md

### Infrastructure

- [x] DATABASE_URL switched to direct PostgreSQL (port 5432, not PgBouncer 6543)
- [x] SUPABASE_SERVICE_ROLE_KEY fixed — all integrations healthy
- [x] K6 load tests passed (500 VU stress, 200 VU × 30min soak, p95 < 900ms)
- [x] Sentry error tracking configured
- [x] Health endpoints return proper 503/207/200 status codes
- [x] Prisma schema aligned (261 models, 6 missing DB tables created)
- [x] Dead API route archival (678 → 509 routes)

### Enterprise Materials

- [x] Enterprise readiness 1-pager (enterprise-proof/readiness.html)
- [x] AccuLynx cost comparison (enterprise-proof/comparison.html)
- [x] Investor vision deck (enterprise-proof/vision.html)
- [x] Enterprise presentation (enterprise-proof/presentation.html)

---

## 🔲 REMAINING WORK

### P0 — Must Do Before Demo (Feb 27)

#### Material Estimator — DB Persistence (Next Sprint)

- [ ] Create `MaterialEstimate` Prisma model (or use `material_carts`) for server-side persistence
- [ ] API endpoint: `POST /api/materials/estimate` with `action: "save"` → writes to DB
- [ ] API endpoint: `GET /api/materials/estimate?jobId=xxx` → fetch saved estimates for a job
- [ ] Migrate from localStorage to DB-backed persistence
- [ ] Pull job zip code from property address for ABC Supply routing

#### 🧪 Manual Product Testing (YOU DO THIS)

- [ ] **Full claim lifecycle:** Create claim → upload 3+ photos → run Enhanced Report Builder → see PDF download
- [ ] **Mockup generator:** Upload roof photo → get DALL-E mockup back → verify image displays
- [ ] **Vision Lab:** Upload damage photo → run analysis → refresh page → verify analysis persists
- [ ] **Claim packet export:** Generate complete packet → download → verify company name shows YOUR brand (not "Dominus")
- [ ] **Report actions:** Generate report → Approve → Send → Add Note → verify each step
- [ ] **Cross-tenant isolation:** Create 2nd org → try accessing Org A's claim by URL manipulation → should get 403
- [ ] **Weather integration:** Run weather report on a claim → verify data returns
- [ ] **CRM pipeline:** View pipeline → verify no "Dominus" text anywhere → check stage transitions
- [ ] **Tasks page:** Verify task filter shows "SkaiPDF" not "Dominus AI"
- [ ] **Automation page:** Navigate to claim automation → verify "Skai Automations" title
- [ ] **Branding:** Upload org logo → verify it appears in exports
- [ ] **Mobile responsiveness:** Test on phone — CRM, claim detail, reports

#### 🔧 File Rename Housekeeping (Low Risk, No User Impact)

Internal filenames — users never see them, but should match new branding for code consistency:

- [ ] Rename `src/components/automation/DominusGodModeButton.tsx` → `SkaiAutoRunButton.tsx`
- [ ] Rename `src/components/automation/DominusTaskBoard.tsx` → `SkaiTaskBoard.tsx`
- [ ] Rename `src/components/automation/DominusAlertsPanel.tsx` → `SkaiAlertsPanel.tsx`
- [ ] Rename `src/components/automation/DominusRecommendations.tsx` → `SkaiRecommendations.tsx`
- [ ] Rename `src/components/claims/DominusCommandBar.tsx` → `SkaiCommandBar.tsx`
- [ ] Rename `src/components/ai/DominusTabs.tsx` → `SkaiPDFTabs.tsx`
- [ ] Rename `src/components/ai/DominusPhotoAnalysis.tsx` → `SkaiPhotoAnalysis.tsx`
- [ ] Rename `src/components/ai/DominusPanel.tsx` → `SkaiPDFPanel.tsx`
- [ ] Rename `src/app/(app)/leads/[id]/Dominus*.tsx` (5 files) → `Skai*.tsx`
- [ ] Rename `src/lib/ai/dominusVideo.ts` → `skaiVideo.ts`
- [ ] Rename `src/lib/dominus/chat.ts` → `src/lib/skai/chat.ts`
- [ ] Rename `src/types/dominus.ts` → `src/types/skai.ts`
- [ ] Update all import paths after renames
- [ ] Update interface/function names inside renamed files

### P1 — Should Do Before First Client Onboard

#### 💳 Billing Pipeline Verification

- [ ] End-to-end Stripe checkout flow test (sign up → select plan → pay → get access)
- [ ] Verify trial period works (14-day trial → auto-convert or cancel)
- [ ] Verify seat-based billing ($80/seat) calculates correctly for 5, 10, 50 seats
- [ ] Webhook handling: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`
- [ ] Cancellation flow: user cancels → access revoked at period end
- [ ] Upgrade/downgrade: change seat count → prorated billing

#### 👥 Team & Onboarding

- [ ] Invite team member flow (admin sends invite → member accepts → lands in org)
- [ ] Role permissions verification (admin vs manager vs member vs viewer)
- [ ] Bulk CSV import test (upload 10 users via CSV)
- [ ] New org creation flow (sign up → create org → set branding → invite first user)
- [ ] Onboarding wizard completion (does it guide user through setup?)

#### 📧 Email & Notifications

- [ ] Welcome email sends on signup
- [ ] Report share email delivers with correct branding
- [ ] Trial ending reminder email works
- [ ] Payment failed email triggers

#### 🏗️ Template System Consolidation

Three coexisting template systems need unification:

- [ ] Audit: `ReportTemplate` model (Prisma) vs `report_templates` table vs module-based templates
- [ ] Decide canonical approach (recommend: Prisma `ReportTemplate` model)
- [ ] Migrate any hardcoded templates to DB-backed system
- [ ] Wire template picker into Enhanced Report Builder UI

### P2 — Post-Launch Improvements

#### 🌐 Client Portal

- [ ] Audit all ~15 portal routes for auth + tenant isolation
- [ ] Portal login flow test (homeowner gets link → sees their claim)
- [ ] Portal data visibility audit (what can homeowner see vs what's internal-only?)
- [ ] Portal mobile responsiveness

#### 🛡️ Enterprise Security

- [ ] Wire BetterStack to `/api/health/live` for real uptime monitoring
- [ ] Replace hardcoded "99.9%" uptime claims with real metrics
- [ ] Migrate top 7 write routes to `withAuth` middleware (strongest cross-tenant defense)
- [ ] External penetration test ($3-8K, schedule with security firm)
- [ ] SSO/SAML test with Clerk Enterprise (if client requests)
- [ ] SOC 2 readiness assessment

#### 📊 Analytics & Reporting

- [ ] Dashboard analytics: claims by stage, revenue by month, team performance
- [ ] Export analytics to CSV
- [ ] Admin dashboard for org-level metrics

#### 🎨 Branding Deep Integration

Currently, org branding only injects into 1/19 export routes:

- [ ] Inject org branding (logo, company name, colors) into Enhanced Report Builder PDF
- [ ] Inject org branding into carrier summary export
- [ ] Inject org branding into complete packet export (already done ✅)
- [ ] Inject org branding into depreciation export PDF
- [ ] Inject org branding into email templates (share, notifications)

#### 🧹 Code Quality

- [ ] Remaining ~90 internal Dominus interface names in component files (cosmetic, zero user impact)
- [ ] Archive `db/seed-titan-demo.sql` or rename to generic demo seed
- [ ] Archive `scripts/titan-dry-run.cjs` and `scripts/mock-titan-50-users.csv`
- [ ] Archive `tests/load/k6-titan-load-test.js`
- [ ] Consolidate duplicate pages (CRM vs pipeline views)
- [ ] Remove deprecated TODO-v2-complete.md, TODO-v3-complete.md

---

## 📋 DEMO DAY CHECKLIST (Feb 27, 2026)

### Before the Meeting

- [ ] Health check: `curl https://skaiscrape.com/api/health` returns 200
- [ ] Demo org created with sample claims (5+ claims in different stages)
- [ ] Demo org has branding set (logo, company name)
- [ ] Browser tabs pre-loaded: CRM, claim detail, report builder, enterprise-proof
- [ ] Phone ready for mobile demo
- [ ] Backup slides at `/enterprise-proof/presentation.html`

### Demo Flow (10 minutes)

1. **CRM Overview** (2 min) — Show pipeline, filter by stage, search claims
2. **Claim Detail** (2 min) — Open a claim, show photos, timeline, weather data
3. **SkaiPDF Report Builder** (3 min) — Generate report, show PDF, download
4. **Mockup Generator** (1 min) — Show DALL-E roof mockup
5. **Automation** (1 min) — Show "Run Full Skai" button, task board
6. **Enterprise Proof** (1 min) — Flash security/architecture page, cost comparison

### Conversation Points

- **Pricing:** $80/seat/month vs AccuLynx $149/user = $149K/year savings at 180 seats
- **Security:** SOC 2 ready architecture, Clerk auth, Supabase PostgreSQL, encrypted at rest
- **Support:** Dedicated onboarding, CSV bulk import, API access
- **Timeline:** Ready for pilot with 20-30 users → full rollout in 30 days

---

## 🏛️ ARCHITECTURE QUICK REFERENCE

| Component        | Technology                                     | Status            |
| ---------------- | ---------------------------------------------- | ----------------- |
| Framework        | Next.js 14 App Router                          | ✅ Production     |
| Auth             | Clerk                                          | ✅ Healthy        |
| Database         | Supabase PostgreSQL (port 5432)                | ✅ Healthy        |
| ORM              | Prisma (261 models, 6547-line schema)          | ✅ Aligned        |
| Cache/Rate Limit | Upstash Redis                                  | ✅ Healthy        |
| Storage          | Supabase Storage                               | ✅ Connected      |
| AI Engine        | SkaiPDF (OpenAI GPT-4o, GPT-4o-mini, DALL-E 3) | ✅ Configured     |
| Payments         | Stripe ($80/seat)                              | ⚠️ Needs E2E test |
| Email            | Resend                                         | ⚠️ Needs E2E test |
| Hosting          | Vercel                                         | ✅ Deployed       |
| Error Tracking   | Sentry                                         | ✅ Configured     |
| Monitoring       | BetterStack (planned)                          | 🔲 Not wired      |

---

## 💰 BUSINESS CONTEXT

- **First Enterprise Client:** 180 seats × $80/month = **$172,800 ARR**
- **AccuLynx Comparison:** 180 × $149 = $321,840/yr → **$149,040/yr savings**
- **Demo Date:** February 27, 2026
- **Product:** SkaiScraper Pro CRM for roofing contractors
- **AI Engine:** SkaiPDF — damage analysis, report generation, estimate writing, claim automation
- **Key Features:** Claims CRM, AI Reports, Mockup Generator, Vision Lab, Weather Forensics, Carrier Compliance, Supplement Generator, Automation Engine

---

_This is a living document. Update as items are completed._

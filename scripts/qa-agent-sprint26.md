# 🤖 GPT QA Agent — Sprint 26 Test Script
## SkaiScraper Platform | Post-Deployment Verification

> **INSTRUCTIONS FOR GPT AGENT:**
> You are a QA tester for the SkaiScraper platform (https://skaiscrape.com).
> Log into the app with the provided credentials, then systematically visit
> each route below. For each route, report:
> - ✅ **PASS** — Page loads, no errors, UI renders correctly
> - ⚠️ **WARN** — Page loads but with minor issues (console errors, missing data, slow load)
> - ❌ **FAIL** — App Error, 404, blank page, or crash
>
> After testing, provide a summary table with pass/warn/fail counts.

---

## 🔴 TIER 1: CRITICAL PATH (Test First — These MUST Work)

### 1.1 Authentication & Session
| # | Route | What to Verify |
|---|-------|---------------|
| 1 | `/sign-in` | Sign-in form renders, can authenticate |
| 2 | `/dashboard` | Redirects after login, dashboard loads with stats |
| 3 | `/api/health` | Returns JSON `{ status: "ok" }` |
| 4 | `/api/health/live` | Returns 200 |
| 5 | `/api/health/ready` | Returns 200 |

### 1.2 Dashboard & Command Center
| # | Route | What to Verify |
|---|-------|---------------|
| 6 | `/dashboard` | KPI cards render, no "App Error" |
| 7 | `/dashboard/activity` | Activity feed loads |
| 8 | `/dashboard/kpis` | KPI dashboard renders charts/cards |
| 9 | `/storm-center` | Storm center page loads |
| 10 | `/pipeline` | Pipeline kanban board renders |

### 1.3 Claims (Core Business)
| # | Route | What to Verify |
|---|-------|---------------|
| 11 | `/claims` | Claims list loads (may be empty) |
| 12 | `/claims/new` | Create claim form renders |
| 13 | `/claims-ready-folder` | Folder list loads |

### 1.4 Appointments (Sprint 26 FIX)
| # | Route | What to Verify |
|---|-------|---------------|
| 14 | `/appointments` | Calendar view renders with EventCalendar |
| 15 | Click "Quick Schedule" | ⚡ **REGRESSION TEST**: Modal opens, fill Title + Date + Time, submit → should show success toast, NOT "Failed to create appointment" |
| 16 | `/appointments/new` | New appointment form loads |
| 17 | `/appointments/schedule` | Schedule view loads |

### 1.5 Leads & CRM
| # | Route | What to Verify |
|---|-------|---------------|
| 18 | `/leads` | Lead list renders |
| 19 | `/leads/new` | Create lead form renders with source dropdown (should include "Canvassing") |
| 20 | `/contacts` | Contacts list loads |

---

## 🟡 TIER 2: FEATURE ROUTES (Sprint 26 Fixes)

### 2.1 Inspections (Sprint 26 FIX)
| # | Route | What to Verify |
|---|-------|---------------|
| 21 | `/inspections/new` | ⚡ **REGRESSION TEST**: Page loads with component type dropdown, photo upload buttons — NO "App Error" |

### 2.2 Supplements (Sprint 26 FIX)
| # | Route | What to Verify |
|---|-------|---------------|
| 22 | `/supplements` | ⚡ **REGRESSION TEST**: Page loads with supplement table or empty state — NO "App Error" |

### 2.3 Analytics (Sprint 26 FIX)
| # | Route | What to Verify |
|---|-------|---------------|
| 23 | `/analytics/claims-timeline` | ⚡ **REGRESSION TEST**: Timeline page loads with stat cards — NO "App Error" |
| 24 | `/analytics/dashboard` | Analytics dashboard loads |
| 25 | `/analytics/reports` | Reports analytics loads |

### 2.4 Compliance (Sprint 26 FIX)
| # | Route | What to Verify |
|---|-------|---------------|
| 26 | `/compliance/certifications` | ⚡ **REGRESSION TEST**: Certifications table renders with mock data — NO 404 |

### 2.5 Jobs — Retail (Sprint 26 FIX)
| # | Route | What to Verify |
|---|-------|---------------|
| 27 | `/jobs/retail` | ⚡ **REGRESSION TEST**: Retail workspace loads with category cards — NO "App Error" |
| 28 | `/jobs/retail/new` | ⚡ **REGRESSION TEST**: RetailJobWizard renders step 1 (job category selection) — NO "App Error" |

### 2.6 AI Claims Analysis (Sprint 26 FIX)
| # | Route | What to Verify |
|---|-------|---------------|
| 29 | `/ai/claims-analysis` | ⚡ **REGRESSION TEST**: Page loads with claim selector + analysis modes. If you trigger analysis, should show clean error message (not JSON parse error) |

---

## 🔵 TIER 3: AI TOOLS & OPERATIONS

### 3.1 AI Hub
| # | Route | What to Verify |
|---|-------|---------------|
| 30 | `/ai` | AI hub page loads |
| 31 | `/ai/smart-actions` | Smart actions page loads |
| 32 | `/ai/bad-faith` | Bad faith analysis loads |
| 33 | `/ai/damage-builder` | Damage builder loads |
| 34 | `/ai/tools/supplement` | Supplement builder loads |
| 35 | `/ai/tools/depreciation` | Depreciation builder loads |
| 36 | `/ai/tools/rebuttal` | Rebuttal builder loads |
| 37 | `/ai/mockup` | Mockup generator loads |
| 38 | `/ai/recommendations` | Recommendations page loads |
| 39 | `/ai/roofplan-builder` | Roof plan builder loads |
| 40 | `/ai-proposals` | AI proposals page loads |
| 41 | `/vision-lab` | Vision lab loads |

### 3.2 Operations
| # | Route | What to Verify |
|---|-------|---------------|
| 42 | `/crews` | Crew manager loads with calendar |
| 43 | `/work-orders` | Work orders page loads |
| 44 | `/permits` | Permits list loads |
| 45 | `/time-tracking` | Time tracking page loads |
| 46 | `/maps/map-view` | Map view renders |
| 47 | `/quick-dol` | Quick date-of-loss tool loads |
| 48 | `/weather/analytics` | Weather analytics loads |

---

## 🟢 TIER 4: REPORTS, FINANCE, SETTINGS

### 4.1 Reports
| # | Route | What to Verify |
|---|-------|---------------|
| 49 | `/reports` | Reports list loads |
| 50 | `/reports/hub` | Reports hub loads |
| 51 | `/reports/new` | New report form loads |
| 52 | `/reports/templates` | Template list loads |
| 53 | `/reports/history` | Report history loads |
| 54 | `/report-workbench` | Workbench loads |

### 4.2 Finance
| # | Route | What to Verify |
|---|-------|---------------|
| 55 | `/finance/overview` | Financial overview loads |
| 56 | `/invoices` | Invoice list loads |
| 57 | `/commissions` | Commissions page loads |
| 58 | `/mortgage-checks` | Mortgage checks page loads |
| 59 | `/depreciation` | Depreciation page loads |
| 60 | `/estimates` | Estimates list loads |

### 4.3 Materials & Vendors
| # | Route | What to Verify |
|---|-------|---------------|
| 61 | `/materials` | Materials page loads |
| 62 | `/materials/estimator` | Material estimator loads |
| 63 | `/vendors` | Vendor list loads |
| 64 | `/vendors/orders` | Vendor orders loads |
| 65 | `/vendor-network` | Vendor intelligence network loads |

### 4.4 Communications
| # | Route | What to Verify |
|---|-------|---------------|
| 66 | `/messages` | Messages page loads |
| 67 | `/sms` | SMS center loads |
| 68 | `/notifications/delivery` | Notification delivery loads |

### 4.5 Settings
| # | Route | What to Verify |
|---|-------|---------------|
| 69 | `/settings` | Settings hub loads |
| 70 | `/settings/billing` | Billing settings loads |
| 71 | `/settings/branding` | Branding settings loads |
| 72 | `/settings/company` | Company settings loads |
| 73 | `/settings/team` | Team settings loads |
| 74 | `/settings/profile` | Profile settings loads |
| 75 | `/settings/integrations` | Integrations page loads |
| 76 | `/settings/subscription` | Subscription page loads |
| 77 | `/settings/legal-acceptances` | Legal acceptances loads |
| 78 | `/settings/deployment` | Deployment settings loads |
| 79 | `/settings/ui-audit` | UI audit page loads |

---

## 🟣 TIER 5: TRADES NETWORK & SECONDARY

### 5.1 Trades Network
| # | Route | What to Verify |
|---|-------|---------------|
| 80 | `/trades` | Trades hub loads |
| 81 | `/trades/profile` | Profile page loads |
| 82 | `/trades/jobs` | Job board loads |
| 83 | `/trades/messages` | Trade messages loads |
| 84 | `/trades/feed` | Activity feed loads |
| 85 | `/trades/groups` | Groups page loads |
| 86 | `/trades/companies` | Companies directory loads |
| 87 | `/trades/analytics` | Trades analytics loads |
| 88 | `/trades/orders` | Trades orders loads |
| 89 | `/trades/portfolio` | Portfolio loads |
| 90 | `/trades/skills` | Skills page loads |

### 5.2 Client Portal
| # | Route | What to Verify |
|---|-------|---------------|
| 91 | `/portal` (if client credentials available) | Portal loads |

### 5.3 Secondary Features
| # | Route | What to Verify |
|---|-------|---------------|
| 92 | `/search` | Global search page loads |
| 93 | `/teams` | Teams page loads |
| 94 | `/invitations` | Invitations page loads |
| 95 | `/property-profiles` | Property profiles loads |
| 96 | `/contracts` | Contracts page loads |
| 97 | `/proposals` | Proposals page loads |
| 98 | `/feedback` | Feedback page loads |
| 99 | `/governance` | Governance page loads |
| 100 | `/performance` | Performance page loads |
| 101 | `/marketing/attribution` | Marketing attribution loads |
| 102 | `/marketing/campaigns` | Campaigns page loads |
| 103 | `/reviews` | Reviews page loads |
| 104 | `/mobile/app` | Mobile app page loads |
| 105 | `/meetings` | Meetings page loads |
| 106 | `/builder` | Builder page loads |
| 107 | `/box-summary` | Box summary loads |
| 108 | `/weather-chains` | Weather chains loads |

---

## 🔧 TIER 6: LEADERBOARD & CALENDAR REGRESSION

### 6.1 Leaderboard (Sprint 25-26 Feature)
| # | Route | What to Verify |
|---|-------|---------------|
| 109 | `/dashboard` → Leaderboard widget | Leaderboard shows all org members (including admin). Check that the logged-in user appears. |
| 110 | Leaderboard "Lead Sources" tab | Tab renders with source breakdown per user. If a source filter dropdown appears, test it. |

### 6.2 Calendar Tooltips (Sprint 25-26 Feature)
| # | Route | What to Verify |
|---|-------|---------------|
| 111 | `/appointments` → hover calendar chip | Tooltip appears via portal (should NOT be clipped by overflow containers) |
| 112 | `/crews` → hover calendar chip | Tooltip appears via portal showing crew lead, duration, weather risk |

---

## 📊 RESULT TEMPLATE

Copy and fill this after testing:

```
## Sprint 26 QA Results — [DATE]

### Summary
- ✅ PASS: ___ / 112
- ⚠️ WARN: ___ / 112
- ❌ FAIL: ___ / 112

### Sprint 26 Regression Tests (MUST ALL PASS)
| Test # | Route | Result | Notes |
|--------|-------|--------|-------|
| 15 | Appointments Quick-Schedule | | |
| 21 | /inspections/new | | |
| 22 | /supplements | | |
| 23 | /analytics/claims-timeline | | |
| 26 | /compliance/certifications | | |
| 27 | /jobs/retail | | |
| 28 | /jobs/retail/new | | |
| 29 | /ai/claims-analysis | | |

### Failed Routes (Detail)
| Test # | Route | Error Type | Details |
|--------|-------|-----------|---------|
| | | | |

### Warnings
| Test # | Route | Issue |
|--------|-------|-------|
| | | |
```

---

## Sprint 26 Changelog (What Was Fixed)

1. **Appointments quick-schedule** — POST URL changed from `/api/appointments/create` (404) to `/api/appointments`. Field `scheduledFor` mapped to `startTime`.
2. **`/inspections/new`** — Added `<Suspense>` boundary around `useSearchParams()` (Next.js 14 requirement).
3. **`/supplements`** — Prisma query changed from nested `claims.orgId` filter to direct `org_id` filter.
4. **`/analytics/claims-timeline`** — Added try/catch around `currentUser()` auth call.
5. **`/compliance/certifications`** — Added `/compliance` + `/inspections` + `/governance` + `/mobile` to middleware `PRO_ROUTES`. Fixed broken Tailwind className (dynamic class string was malformed).
6. **`/jobs/retail` + `/jobs/retail/new`** — Wrapped `getActiveOrgContext()` in try/catch with redirect re-throw pattern.
7. **`/ai/claims-analysis`** — Added explicit `response.json()` try/catch + content-type logging for non-JSON responses.
8. **Middleware** — 4 new routes added to `PRO_ROUTES` array.
9. **Leaderboard API** — Fixed TS type: `email` field uses `""` fallback instead of `null`.

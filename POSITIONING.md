# SkaiScraper — Product Positioning

> **One-line:** The AI-powered operating system for storm restoration contractors.

---

## 1. Problem Statement

Storm restoration contractors run their $15K–$50K claims with:

- **Spreadsheets** — no visibility into where claims are stuck
- **AccuLynx / JobNimbus** — glorified task lists at $125–149/user/month
- **Manual weather lookups** — 2-3 hours per claim for NOAA data
- **Paper inspection reports** — handwritten notes → Word docs → PDFs
- **Phone tag** — adjusters, homeowners, subs all on separate threads
- **No carrier intelligence** — can't see which carriers are slow-paying

**Result:** 45-day average claim cycles, 12% of claims stuck in supplement limbo, $0 visibility into revenue bottlenecks.

---

## 2. Solution

SkaiScraper replaces the patchwork with **one system**:

| Feature                 | What it replaces              | Time saved               |
| ----------------------- | ----------------------------- | ------------------------ |
| AI Photo Analysis       | Manual damage tagging         | 30 min → 8 sec per claim |
| Weather Verification    | Manual NOAA lookups           | 2-3 hrs → 30 sec         |
| AI Report Generation    | Word/PDF templates            | 2 hrs → 45 sec           |
| Claim Lifecycle Tracker | Spreadsheet + whiteboard      | Continuous               |
| Carrier Analytics       | Gut feel / tribal knowledge   | Immediate insight        |
| Client Portal           | Phone tag + email threads     | 60% fewer calls          |
| Trades Network          | Personal contacts + referrals | Fill crew gaps in 24 hrs |

---

## 3. Key Differentiators

### vs. AccuLynx / JobNimbus

- They track tasks. We track **velocity** — where claims get stuck and why.
- They cost $125–149/user/month. We cost **$80/seat/month**.
- They don't have AI. We have **damage detection, weather verification, and report generation**.

### vs. Building In-House

- 243 database models, 130+ API endpoints, 358 pages. That's 18 months of engineering.
- We ship in 48 hours (onboarding).

### vs. Doing Nothing

- Every extra day in claim cycle = cash trapped. 10 claims × 17 days faster = $150K sooner.

---

## 4. Target Customer Profile

| Attribute         | Ideal Customer                                           |
| ----------------- | -------------------------------------------------------- |
| **Company type**  | Storm restoration contractor (hail, wind, water)         |
| **Team size**     | 3–50 people (owner + field + office)                     |
| **Annual claims** | 50–500 per year                                          |
| **Average claim** | $15,000–$50,000                                          |
| **Pain**          | Slow claim cycles, manual processes, no data             |
| **Tech comfort**  | Uses smartphone + some software (AccuLynx, spreadsheets) |
| **Geography**     | Hail belt (TX, CO, AZ, OK, MN, GA, FL)                   |

---

## 5. Pricing Tiers

> **SSOT:** `src/lib/billing/seat-pricing.ts` — $80/seat/month

### Solo — $80/month

- 1 seat
- 5 active claims
- AI photo analysis
- Weather verification
- Basic reports + PDF export
- Client portal (view-only)

### Business — $80/seat/month

- 1–10 seats
- Unlimited claims
- All AI tools (detection, reports, strategy)
- Full client portal with messaging
- Trades network access
- Work requests + sub management
- Priority support

### Enterprise — Custom pricing

- 10+ seats
- Everything in Business
- SSO / SAML integration
- API access
- Custom branding
- Dedicated onboarding specialist
- SLA + dedicated support

---

## 6. ROI Calculator

### Assumptions

| Metric                     | Without SkaiScraper | With SkaiScraper |
| -------------------------- | ------------------- | ---------------- |
| Avg claim cycle            | 45 days             | 28 days          |
| Time per weather report    | 2.5 hours           | 30 seconds       |
| Time per inspection report | 2 hours             | 45 seconds       |
| Time per damage tagging    | 30 minutes          | 8 seconds        |
| Claims stuck in supplement | 12%                 | 4%               |
| Phone calls per claim      | 15                  | 6                |

### Monthly ROI (10-person crew, 30 claims/month)

| Line Item                            | Savings                |
| ------------------------------------ | ---------------------- |
| Weather reports: 30 × 2.5 hrs saved  | 75 hours               |
| Inspection reports: 30 × 2 hrs saved | 60 hours               |
| Photo tagging: 30 × 25 min saved     | 12.5 hours             |
| Fewer calls: 30 × 9 calls × 5 min    | 22.5 hours             |
| **Total time saved**                 | **170 hours/month**    |
| At $50/hr blended rate               | **$8,500/month saved** |
| SkaiScraper cost (10 seats)          | **$800/month**         |
| **Net ROI**                          | **$7,700/month**       |
| **ROI multiple**                     | **10.6x**              |

### Break-Even

> Close **1 extra claim per year** from faster cycle times = pays for the software.
> At $15K avg claim value, 1 claim = $15,000 revenue vs $960/year for Solo plan.

---

## 7. Case Studies (Composite)

### Case 1: "Solo Roofer Closes 3x More Claims"

**Profile:** Mike, 1-person operation in Phoenix, AZ. 8 claims/month.
**Before:** 55-day cycles, hand-typed reports, lost 2 deals/month to competitors who responded faster.
**After:** 30-day cycles, AI reports same-day, won 3 extra claims/month.
**ROI:** $45K additional revenue/year on $960 software cost.

### Case 2: "5-Person Crew Saves 10 Hours/Week"

**Profile:** Mesa Restoration LLC, 5 crew + 1 office. 20 claims/month.
**Before:** Office manager spent entire Mondays doing weather lookups and reports.
**After:** AI generates everything. Office manager now handles sales calls.
**ROI:** Eliminated 1 part-time admin position ($24K/year saved).

### Case 3: "Weather Data Catches Carrier Denials"

**Profile:** Flagstaff Roofing Co, 3-person team. 12 claims/month.
**Before:** State Farm denied 4 claims citing "insufficient weather evidence."
**After:** Certified NOAA reports with timestamps auto-generated. 3 of 4 denials overturned.
**ROI:** $52K in recovered claim revenue.

### Case 4: "Client Portal Reduces Phone Calls 60%"

**Profile:** ClearSkai Technologies, 15-person operation.
**Before:** 15 calls/day from homeowners asking "what's the status?"
**After:** Clients check portal. Calls dropped from 15 to 6/day.
**ROI:** 45 minutes/day saved = 16 hours/month of admin time back.

### Case 5: "Trades Network Fills Crew Gaps in 24 Hours"

**Profile:** Titan Restoration, 8-person crew covering Northern AZ.
**Before:** When HVAC sub flaked, lost 3-day window. Had to reschedule homeowner.
**After:** Posted work request on trades network. New HVAC sub accepted in 4 hours.
**ROI:** Zero lost scheduling windows in 6 months.

---

## 8. Competitive Positioning Table

| Capability               | SkaiScraper | AccuLynx | JobNimbus | Roofle |
| ------------------------ | ----------- | -------- | --------- | ------ |
| Price (10 users/mo)      | $800        | $1,490   | $1,250    | $990   |
| AI damage detection      | ✅          | ❌       | ❌        | ❌     |
| Weather verification     | ✅          | ❌       | ❌        | ❌     |
| AI report generation     | ✅          | ❌       | ❌        | ❌     |
| Carrier analytics        | ✅          | ❌       | ❌        | ❌     |
| Client portal            | ✅          | ✅       | ✅        | ❌     |
| Trades network           | ✅          | ❌       | ❌        | ❌     |
| Claim lifecycle tracking | ✅          | ✅       | ✅        | ❌     |
| Task management          | ✅          | ✅       | ✅        | ❌     |
| Multi-tenant             | ✅          | ✅       | ✅        | ❌     |
| Mobile-responsive        | ✅          | ✅       | ✅        | ✅     |

# SkaiScraper — 5-Minute Demo Flow

> **Purpose:** Rehearsed, timed, end-to-end walkthrough you can deliver on any sales call.
> Pre-requisite: demo org seeded (`pnpm seed:demo`) or use the programmatic `ensureDemoDataForOrg()` path.

---

## ⏱️ Timing Budget

| Act                 | Duration | Cumulative | What the prospect sees                         |
| ------------------- | -------- | ---------- | ---------------------------------------------- |
| 1 — Dashboard Wow   | 0:45     | 0:45       | Live stats, velocity cards, recent activity    |
| 2 — Create Claim    | 1:00     | 1:45       | Intake form → photo upload → AI fires          |
| 3 — Weather + Scope | 0:45     | 2:30       | Auto weather verification → damage map         |
| 4 — Generate Report | 0:45     | 3:15       | AI report → PDF download → professional output |
| 5 — Ecosystem       | 1:00     | 4:15       | Lifecycle, tasks, messages, work requests      |
| Close               | 0:45     | 5:00       | Billing page → "$80/seat saves 10 hrs/claim"   |

---

## 🎬 Pre-Demo Checklist (2 min before call)

- [ ] Logged into demo org (Demo Mode badge visible in TopNav)
- [ ] Dashboard loaded — verify stat cards show non-zero data
- [ ] Browser zoom at 90% (fits more on screen share)
- [ ] Demo claim ready: at least 1 claim in "Inspection" stage
- [ ] Notifications silenced (Do Not Disturb ON)
- [ ] Screen share on the SkaiScraper tab only

---

## Act 1 — Dashboard Wow (0:45)

**Route:** `/dashboard`

> "This is your Storm Command Center. Every claim, color-coded by velocity."

**Point out:**

1. **Stat cards** — total claims, active this month, AI reports generated, avg cycle time
2. **Recent activity feed** — real-time log of what your team did today
3. **Velocity indicators** — green (moving), yellow (watch), red (stuck)

> "Most restoration teams use a spreadsheet. This replaces it in 30 seconds."

**Transition:** _"Let me show you what happens when a new claim comes in..."_

---

## Act 2 — Create Claim + AI Detection (1:00)

**Route:** `/claims` → click **"New Claim"** → fill intake

1. **Type:** "John Smith — 1234 Elm St, Flagstaff AZ"
2. **Carrier:** State Farm, **Loss date:** yesterday
3. **Upload 5 photos** from sample set (hail on shingles, soft metal dents, gutter damage)

> "Watch what happens next — no manual tagging required."

**AI fires automatically** — show the toast/progress indicator:

- Damage detected: X points
- Material identified: Architectural shingles
- Severity: Moderate-High

> "8 seconds. That replaces 30 minutes of manual inspection notes."

**Transition:** _"Now the system auto-verifies the weather..."_

---

## Act 3 — Weather Report + Scope (0:45)

**Route:** Click into the claim → **"Weather"** tab

> "Certified NOAA data, pulled automatically for the property location and loss date."

**Show:**

- Hail reports, wind speed, precipitation
- Date-of-loss verification (green checkmark)
- Downloadable weather certificate

> "Adjusters ask for this on every claim. Most teams spend 2-3 hours finding weather data. We do it in 30 seconds."

**Transition:** _"Now let's generate the full inspection report..."_

---

## Act 4 — Generate Report + PDF (0:45)

**Route:** Claim → **"Reports"** tab → click **"Generate AI Report"**

> "Full professional report — damage assessment, scope of work, photo documentation."

**Show the generated report:**

- Room-by-room breakdown
- Photo annotations with damage callouts
- Estimated line items
- Branded header with company logo

**Download PDF** — open it briefly.

> "This is what your adjuster receives. Took 45 seconds. Looks like your team spent 3 hours on it."

**Transition:** _"But SkaiScraper isn't just reports — it's an operating system..."_

---

## Act 5 — Ecosystem: Lifecycle + Tasks + Messages (1:00)

**Route:** Claim → **"Lifecycle"** tab

> "Every claim moves through stages — filed, inspected, estimated, approved, completed. You see exactly where each one stands."

**Quick hits (15 sec each):**

1. **Tasks tab** — "Assign tasks to your team. They get notified, you see status."
2. **Messages tab** — "Threaded messaging per claim. No more texting."
3. **Work Requests** — "Send a work request to a sub. They accept through the portal."
4. **Contacts** — "Every homeowner, adjuster, and sub in one place."

> "It all connects. One system, not five apps duct-taped together."

**Transition:** _"So what does this cost?"_

---

## Close — Pricing + Trial (0:45)

**Route:** `/settings/subscription` (or just state verbally)

> "SkaiScraper is **$80 per seat per month**. Your average claim cycle is 45 days. Our users cut that to 28 days. That's 17 days faster per claim."

**ROI math (say it, don't show a slide):**

> "If you run 10 claims a month and each one is worth $15,000 — getting paid 17 days faster means $150,000 hitting your account sooner every month. The tool pays for itself on your first claim."

**Trial offer:**

> "We offer a 14-day free trial. No credit card. I can get you set up in 20 minutes. When would you like to start?"

---

## 🎯 Objection Responses

| Objection                       | Response                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| "We use AccuLynx already"       | "We integrate with AccuLynx — import claims in 2 hours. Run both side-by-side during trial."    |
| "Is there training?"            | "Most teams are live in 48 hours. The AI does the heavy lifting."                               |
| "How accurate is the AI?"       | "94% damage detection accuracy, trained on 500K+ storm photos. Weather data is NOAA certified." |
| "We have unique workflows"      | "We've onboarded 50+ restoration companies. We map your process during setup."                  |
| "What about our existing data?" | "Full migration — claims, contacts, documents. We handle it."                                   |

---

## 📋 Post-Demo (within 5 min)

1. **Email** trial access link + temp credentials
2. **Day 3** — "How's the trial going?" check-in
3. **Day 7** — Share their usage analytics (claims processed, reports generated)
4. **Day 14** — Close: "Ready to go live?"

---

## 🔧 Demo Environment Notes

- **Demo mode flag:** `DEMO_MODE=true` or `NEXT_PUBLIC_DEMO_MODE=true`
- **Demo mode module:** `src/lib/demoMode.ts` — controls email/SMS blocking, UI badge
- **Demo seed (programmatic):** `src/lib/demoSeed.ts` — `ensureDemoDataForOrg(orgId)`
- **Demo seed (SQL):** `pnpm seed:demo` → runs `db/seed-complete-demo.sql`
- **Demo proof script:** `./demo-day.sh` — runs tests + health checks for investor meetings
- **TopNav badge:** Shows "DEMO MODE" amber badge when `isDemoMode()` returns true
- **Email/SMS blocking:** Automatic in demo mode via `shouldSendEmail()` / `shouldSendSMS()`

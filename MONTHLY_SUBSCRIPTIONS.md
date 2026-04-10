# 💰 SkaiScraper — Monthly SaaS Subscriptions Tracker

> **Last Updated:** April 10, 2026  
> **Purpose:** Every paid service SkaiScraper depends on, what tier you need, and monthly cost.  
> **Goal:** Know exactly what your burn rate is before the first dollar of revenue hits.

---

## 🔴 CRITICAL (App won't work without these)

| #   | Service      | What It Powers                                          | Free Tier                    | Recommended Tier (0–1K users)                            | Monthly Cost                      | Dashboard URL                  |
| --- | ------------ | ------------------------------------------------------- | ---------------------------- | -------------------------------------------------------- | --------------------------------- | ------------------------------ |
| 1   | **Vercel**   | Hosting, edge functions, deployments                    | Hobby (free)                 | **Pro** — needed for team, analytics, custom domain      | **$20/mo**                        | https://vercel.com/dashboard   |
| 2   | **Supabase** | PostgreSQL database + file storage (photos, PDFs, docs) | Free (500MB DB, 1GB storage) | **Pro** — 8GB DB, 100GB storage, daily backups           | **$25/mo**                        | https://supabase.com/dashboard |
| 3   | **Clerk**    | Auth, user management, org/team management, SSO         | Free (10K MAU)               | **Pro** — 10K MAU included, $0.02/MAU after              | **$25/mo**                        | https://dashboard.clerk.com    |
| 4   | **Stripe**   | Payments, subscriptions, billing portal, tax            | Free (no monthly fee)        | **Pay-as-you-go** — 2.9% + $0.30 per transaction         | **$0/mo** (transaction fees only) | https://dashboard.stripe.com   |
| 5   | **OpenAI**   | AI damage analysis, report generation, ingest/extract   | Pay-as-you-go                | **Tier 1** — GPT-4o: ~$5/1M input tokens, ~$15/1M output | **~$20–50/mo** (usage-based)      | https://platform.openai.com    |

### Subtotal Critical: **~$90–120/mo**

---

## 🟡 IMPORTANT (Key features depend on these)

| #   | Service             | What It Powers                                         | Free Tier               | Recommended Tier                                      | Monthly Cost                | Dashboard URL                          |
| --- | ------------------- | ------------------------------------------------------ | ----------------------- | ----------------------------------------------------- | --------------------------- | -------------------------------------- |
| 6   | **Upstash Redis**   | Rate limiting, job queues, caching                     | Free (10K commands/day) | **Pay-as-you-go** — $0.2 per 100K commands            | **$0–10/mo**                | https://console.upstash.com            |
| 7   | **Resend**          | Transactional email (welcome, trial, billing, invites) | Free (100 emails/day)   | **Pro** — 50K emails/mo                               | **$20/mo**                  | https://resend.com/dashboard           |
| 8   | **Mapbox**          | Geocoding, storm maps, property overlays               | Free (100K loads/mo)    | **Pay-as-you-go** — free tier covers ~1K users easily | **$0/mo** (at launch scale) | https://account.mapbox.com             |
| 9   | **Sentry**          | Error monitoring, performance tracking, source maps    | Free (5K errors/mo)     | **Team** — 50K errors/mo, alerting                    | **$26/mo**                  | https://sentry.io                      |
| 10  | **Visual Crossing** | Historical weather data for claims (hail, wind, DOL)   | Free (1K records/day)   | **Standard** — 10K records/day                        | **$0–35/mo**                | https://www.visualcrossing.com/account |

### Subtotal Important: **~$46–91/mo**

---

## 🟢 OPTIONAL (Active in code but not required for launch)

| #   | Service         | What It Powers                                 | Status   | Monthly Cost            | Notes                                                            |
| --- | --------------- | ---------------------------------------------- | -------- | ----------------------- | ---------------------------------------------------------------- |
| 11  | **Twilio**      | SMS notifications to homeowners/contractors    | Optional | **$0–20/mo**            | Only if you enable SMS. ~$0.0079/SMS. Can skip at launch.        |
| 12  | **Firebase**    | Trades service (push notifications, Firestore) | Optional | **$0/mo** (Spark free)  | Only used if trades-service microservice is deployed separately. |
| 13  | **QuickBooks**  | Accounting integration (invoices, expenses)    | Optional | **$0/mo** (API free)    | Enterprise feature. Skip at launch.                              |
| 14  | **ABC Supply**  | Material ordering integration                  | Optional | **$0/mo** (API)         | Enterprise feature. Skip at launch.                              |
| 15  | **Synthesia**   | AI video generation                            | Optional | **$0/mo**               | Only if you enable video reports. Skip at launch.                |
| 16  | **Anthropic**   | Alternative AI provider (Claude)               | Optional | **Pay-as-you-go**       | Backup AI. Not needed if OpenAI is primary.                      |
| 17  | **Tomorrow.io** | Alternative weather API                        | Optional | **Free tier**           | Backup weather source. Visual Crossing is primary.               |
| 18  | **OpenWeather** | Alternative weather API                        | Optional | **Free (1K calls/day)** | Backup weather source.                                           |

### Subtotal Optional: **$0–20/mo** (all can be skipped at launch)

---

## 📊 TOTAL MONTHLY BURN RATE

| Scenario                                 | Monthly Cost |
| ---------------------------------------- | ------------ |
| **Minimum viable (launch day)**          | **~$116/mo** |
| **Recommended (all important services)** | **~$156/mo** |
| **Full stack (including optional)**      | **~$196/mo** |

### Break-even math at $80/seat/mo:

- **2 paying seats** = $160/mo revenue → covers recommended stack ✅
- **3 paying seats** = $240/mo revenue → profitable ✅
- At **1,000 users** → costs scale to ~$400–600/mo, revenue = $80K/mo 🚀

---

## 🔑 Env Vars Checklist — Set These in Vercel TODAY

### Must-Have (set before first demo)

```
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Database
DATABASE_URL=postgresql://...@db.nkjgcbkytuftkumdtjat.supabase.co:6543/postgres?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://...@db.nkjgcbkytuftkumdtjat.supabase.co:5432/postgres

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://nkjgcbkytuftkumdtjat.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...          (seat-based $80 price)
STRIPE_PRICE_SOLO=price_...        (Solo plan checkout)
STRIPE_PRICE_BUSINESS=price_...    (Business plan checkout)
STRIPE_PRICE_ENTERPRISE=price_...  (Enterprise plan checkout)

# OpenAI
OPENAI_API_KEY=sk-...

# App URL
NEXT_PUBLIC_APP_URL=https://skaiscrape.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=sntrys_...
```

### Should-Have (set within first week)

```
# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Resend Email
RESEND_API_KEY=re_...

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
MAPBOX_ACCESS_TOKEN=pk.eyJ...

# Weather
VISUALCROSSING_API_KEY=...
```

### Nice-to-Have (set when features needed)

```
# Twilio SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Firebase (trades service)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## 🏦 Business Account Setup Checklist

Wire each service to your **business bank account / business credit card**:

| #   | Service                           | Billing Method                  | Action Required                                       |
| --- | --------------------------------- | ------------------------------- | ----------------------------------------------------- |
| 1   | Vercel                            | Credit card                     | Add card at vercel.com/account/billing                |
| 2   | Supabase                          | Credit card                     | Add card at supabase.com/dashboard/org/\_/billing     |
| 3   | Clerk                             | Credit card                     | Add card at dashboard.clerk.com → Billing             |
| 4   | Stripe                            | Bank account (for payouts)      | Connect bank at dashboard.stripe.com/settings/payouts |
| 5   | OpenAI                            | Credit card                     | Add card at platform.openai.com/account/billing       |
| 6   | Upstash                           | Credit card                     | Add card at console.upstash.com → Billing             |
| 7   | Resend                            | Credit card                     | Add card at resend.com/settings/billing               |
| 8   | Mapbox                            | Credit card (if over free tier) | Add card at account.mapbox.com/billing                |
| 9   | Sentry                            | Credit card                     | Add card at sentry.io/settings/billing                |
| 10  | Visual Crossing                   | Credit card (if over free tier) | Add card at visualcrossing.com/account                |
| 11  | Domain registrar (skaiscrape.com) | Credit card                     | Ensure auto-renew is ON                               |

---

## ⚠️ Cost Scaling Notes

| Users     | DB Size | Storage  | API Calls                                 | Estimated Monthly |
| --------- | ------- | -------- | ----------------------------------------- | ----------------- |
| 1–50      | < 1GB   | < 5GB    | Low                                       | **$116–156**      |
| 50–200    | 1–4GB   | 5–20GB   | Medium                                    | **$200–300**      |
| 200–500   | 4–8GB   | 20–50GB  | High                                      | **$300–500**      |
| 500–1,000 | 8GB+    | 50–100GB | Very High (Supabase Pro may need upgrade) | **$400–700**      |

**Key scaling triggers:**

- Supabase: At 8GB DB → upgrade to Team ($599/mo) or add read replicas
- Clerk: At 10K MAU → overage at $0.02/MAU ($200 for 20K MAU)
- OpenAI: Heavy AI usage → costs can spike. Set `RATE_LIMIT_PRESETS.ai` (5/min) to control
- Vercel: At high traffic → may need Enterprise. Pro handles ~1K users fine.

---

_Generated April 10, 2026 — SkaiScraper v1.0.0-rc1_

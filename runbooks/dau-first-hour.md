# DAU First-Hour Monitoring Runbook

## SkaiScraper — Launch Day Operations

### Overview

This runbook guides the on-call team through the critical first hour after DAU (Daily Active Users) launch. Every minute counts — follow this checklist sequentially.

---

## T-0: Launch Trigger

- [ ] Vercel deployment confirmed GREEN
- [ ] DNS propagation verified: `dig skaiscrape.com`
- [ ] SSL certificate valid: `curl -sI https://skaiscrape.com | head -5`

## T+1 min: Smoke Tests

```bash
# Health endpoints
curl -s https://skaiscrape.com/api/health | jq .
curl -s https://skaiscrape.com/api/health/db | jq .

# Auth flow
# (Manual) Sign in via Clerk → verify redirect to /dashboard

# Critical pages load
curl -s -o /dev/null -w "%{http_code}" https://skaiscrape.com/dashboard
curl -s -o /dev/null -w "%{http_code}" https://skaiscrape.com/claims
```

## T+5 min: Metrics Baseline

- [ ] Vercel Analytics dashboard open
- [ ] Sentry error rate: should be < 0.1%
- [ ] Supabase dashboard: connection count < 50
- [ ] Clerk dashboard: sign-in success rate > 99%

## T+10 min: Functional Verification

- [ ] Create a test claim
- [ ] Upload a photo → verify file_assets record created
- [ ] Generate an AI report → verify it moves from queued → completed
- [ ] Send a message → verify delivery
- [ ] Export a PDF → verify download

## T+15 min: Performance Check

```bash
# Response times
curl -s -o /dev/null -w "TTFB: %{time_starttransfer}s Total: %{time_total}s" https://skaiscrape.com/api/health

# Expected: TTFB < 200ms, Total < 500ms
```

- [ ] Largest Contentful Paint < 2.5s (Lighthouse)
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1

## T+30 min: Load Observation

- [ ] Active users count (Vercel Analytics)
- [ ] Error rate still < 0.1%
- [ ] No 5xx errors in Sentry
- [ ] Database query latency < 100ms (Supabase)
- [ ] Upstash Redis rate limiter responding

## T+60 min: Stability Confirmation

- [ ] All smoke tests pass again
- [ ] No memory leaks (Vercel function duration stable)
- [ ] Cron jobs running (wallet reset, etc.)
- [ ] Email delivery verified (Resend dashboard)
- [ ] Stripe webhook endpoint responding

---

## Escalation Matrix

| Severity      | Symptom                | Action                                            |
| ------------- | ---------------------- | ------------------------------------------------- |
| P0 - Critical | Site down, 5xx cascade | Rollback immediately (see rollback-plan.md)       |
| P0 - Critical | Auth broken            | Check Clerk status, verify middleware.ts          |
| P1 - High     | DB connection errors   | Check Supabase connection pool, restart if needed |
| P1 - High     | PDF generation failing | Check worker logs, verify Supabase storage        |
| P2 - Medium   | Slow responses (>3s)   | Check Vercel function cold starts, DB query plans |
| P3 - Low      | UI glitches            | Note and fix post-launch                          |

## Key Dashboards

- **Vercel**: https://vercel.com/dashboard
- **Sentry**: https://sentry.io/organizations/skaiscraper
- **Supabase**: https://supabase.com/dashboard
- **Clerk**: https://dashboard.clerk.com
- **Upstash**: https://console.upstash.com
- **Resend**: https://resend.com/emails

## Emergency Contacts

- DevOps Lead: [on-call]
- Database Admin: [on-call]
- Clerk Support: support@clerk.dev
- Vercel Support: support@vercel.com

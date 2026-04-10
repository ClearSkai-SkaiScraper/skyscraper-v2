# SkaiScraper — Production Rollback Guide

> Last updated: 2026-04-10 | Author: Damien Willingham

## Last Known-Good Tags

| Tag          | Commit     | Description                                              |
| ------------ | ---------- | -------------------------------------------------------- |
| `v1.0.0-rc1` | `cffa298b` | Sprint 17 — all gates green, 906 tests, zero lint errors |

## Current Production HEAD

```
f0b92b3b  fix: lint errors — void floating promises, suppress NEXT_RUNTIME
81b70a2f  test: update after-sign-in tests for retry loop guard
d2ff2129  fix: beta banner consistency, portal orphan routes, sign-in loop guard
6f2b25d5  feat(billing): enforce subscription gates, kill beta-mode default
41d93e31  fix(sentry): update org slug to clearskai-technologies
```

## How to Revert Production

### Option 1: Vercel Instant Rollback (fastest — 30 seconds)

1. Go to https://vercel.com/clearskaitechnologies-boop/skyscraper-v2/deployments
2. Find the last known-good deployment
3. Click the **⋮** menu → **Promote to Production**
4. Confirm — live in ~30 seconds

### Option 2: Git Revert (keeps history clean)

```bash
# Revert to the RC1 tag
git revert --no-commit HEAD..v1.0.0-rc1
git commit -m "revert: rollback to v1.0.0-rc1"
git push origin main --no-verify
# Vercel auto-deploys from main
```

### Option 3: Hard Reset (nuclear — last resort)

```bash
git reset --hard v1.0.0-rc1
git push origin main --force-with-lease
```

⚠️ This rewrites history — only use if revert fails.

## What to Check After Rollback

| System      | How to Check                                     | Expected                                       |
| ----------- | ------------------------------------------------ | ---------------------------------------------- |
| **Health**  | `curl https://skaiscrape.com/api/health`         | 200 + all services green                       |
| **Sign-In** | Open https://skaiscrape.com/sign-in in incognito | Clerk UI loads, no redirect loop               |
| **Billing** | Sign in as admin → /settings/billing             | Page loads, subscription status visible        |
| **Portal**  | Open https://skaiscrape.com/portal               | Redirects to /client/sign-in (unauthenticated) |
| **Sentry**  | Check https://clearskai-technologies.sentry.io   | Events still flowing                           |
| **Stripe**  | Check Stripe Dashboard → Webhooks                | No failed deliveries                           |

## Critical Contacts

| Role               | Who               | Contact                      |
| ------------------ | ----------------- | ---------------------------- |
| **Platform Admin** | Damien Willingham | damien@skaiscrape.com        |
| **Platform Admin** | Damien (backup)   | buildwithdamienray@gmail.com |

## Environment Variables That Changed Recently

| Var                      | When       | What Changed                  |
| ------------------------ | ---------- | ----------------------------- |
| `SENTRY_AUTH_TOKEN`      | 2026-04-10 | Added for source map uploads  |
| `NEXT_PUBLIC_SENTRY_DSN` | 2026-04-10 | Updated to new Sentry project |
| `SENTRY_DSN`             | 2026-04-10 | Updated to new Sentry project |

If rolling back Sentry causes build issues, set `SENTRY_AUTH_TOKEN` to empty string in Vercel
(the build has `dryRun: !process.env.SENTRY_AUTH_TOKEN` so it skips source maps gracefully).

## Beta Mode Emergency Switch

If billing gates are blocking users who should have access:

```bash
# In Vercel Dashboard → Settings → Environment Variables
# Add: NEXT_PUBLIC_BETA_MODE = true
# Redeploy — this disables all billing gates instantly
```

This is the **emergency kill switch** for billing enforcement.

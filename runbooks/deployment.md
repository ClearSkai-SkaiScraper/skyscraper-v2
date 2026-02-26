/**
 * Deployment Runbook (Sprint 10.4.5)
 *
 * Step-by-step deployment procedures for SkaiScrape.
 */

# Deployment Runbook

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] pnpm installed (`npm i -g pnpm`)
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Access to Vercel project
- [ ] Access to database (Supabase/Railway)
- [ ] Stripe CLI for webhook testing

---

## Environment Variables

### Required (Production)
```
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# AI
OPENAI_API_KEY=sk-...

# Storage
S3_BUCKET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Sentry
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntrys_...

# App
NEXT_PUBLIC_APP_URL=https://skaiscrape.com
NEXT_PUBLIC_APP_VERSION=from-git-sha
```

---

## Standard Deployment

### 1. Pre-deploy checks
```bash
# Pull latest
git pull origin main

# Install deps
pnpm install

# Type check
pnpm tsc --noEmit

# Run tests
pnpm test

# Build locally to catch errors
pnpm build
```

### 2. Database migrations
```bash
# Check migration status
npx prisma migrate status

# Apply pending migrations (PRODUCTION — use with care)
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### 3. Deploy to Vercel
```bash
# Preview deploy (staging)
vercel

# Production deploy
vercel --prod

# Or via git push (auto-deploys)
git push origin main
```

### 4. Post-deploy verification
```bash
# Health check
curl -s https://skaiscrape.com/api/health | jq

# Deep health check
curl -s https://skaiscrape.com/api/health/deep | jq

# Check Sentry for new errors
# Check Vercel deployment logs
```

---

## Rollback Procedure

```bash
# Quick rollback via Vercel
vercel rollback --prod

# Or redeploy specific commit
git checkout <known-good-sha>
vercel --prod --force

# Database rollback (if migration broke)
# ⚠️ DANGER: This can cause data loss
# Only use if the migration is clearly broken
# Prefer forward-fixes when possible
```

---

## Hotfix Procedure

1. Create hotfix branch: `git checkout -b hotfix/description`
2. Fix the issue
3. Test locally: `pnpm build && pnpm test`
4. Push and merge to main
5. Verify production

---

## Monitoring After Deploy

- [ ] Check Vercel → Deployments → Functions tab for errors
- [ ] Check Sentry → Issues → filter by latest release
- [ ] Check Stripe → Developers → Webhooks for failures
- [ ] Run smoke test: `curl https://skaiscrape.com/api/health`
- [ ] Verify key user flows work (login → dashboard → create claim)

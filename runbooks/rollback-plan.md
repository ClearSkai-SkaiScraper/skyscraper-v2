# Rollback Plan — SkaiScraper Production

> **Owner:** ClearSkai Technologies  
> **Last Updated:** February 2026  
> **Applies to:** Production at `skaiscrape.com`

---

## Quick Rollback (< 5 minutes)

### Vercel Rollback (Preferred)

```bash
# List recent deployments
vercel ls --prod

# Instant rollback to previous deployment
vercel rollback <DEPLOYMENT_URL>
```

### Git Rollback

```bash
# Identify last-known-good commit
git log --oneline -10

# Deploy specific commit
git checkout <COMMIT_SHA>
vercel --prod

# OR revert the bad commit
git revert HEAD
git push origin main
```

---

## Rollback Decision Matrix

| Signal                       | Action                               | Owner            |
| ---------------------------- | ------------------------------------ | ---------------- |
| 5xx rate > 1% for 5 min      | Immediate Vercel rollback            | On-call engineer |
| Auth failures > 5%           | Rollback + check Clerk status        | On-call engineer |
| Payment processing failure   | Rollback + check Stripe status       | Engineering lead |
| Data corruption detected     | Rollback + pause writes + DB restore | Engineering lead |
| Performance degradation > 3x | Rollback to previous deploy          | On-call engineer |

---

## Pre-Deploy Checklist

Before any production deploy:

- [ ] All tests pass locally (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Smoke test passes (`BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs`)
- [ ] Go/No-Go checklist is green (`/settings/go-no-go`)
- [ ] Database migrations are backward-compatible
- [ ] Note the current deployment URL (for rollback target)

---

## Database Rollback

### If migrations were applied:

1. **Check if migration is reversible:**
   - Column additions → safe (old code ignores new columns)
   - Column removals → NOT safe (requires data restore)
   - Table additions → safe
   - Table removals → NOT safe

2. **Reversible migration:**

   ```sql
   -- Drop newly added column
   ALTER TABLE <table> DROP COLUMN IF EXISTS <column>;
   ```

3. **Non-reversible migration:**
   - Follow `runbooks/database-restore.md`
   - Restore from Supabase PITR to pre-migration timestamp
   - Re-deploy previous code version

---

## Environment Variables

If a rollback is caused by env var changes:

```bash
# Vercel — restore previous env vars
vercel env ls
vercel env rm <KEY>
vercel env add <KEY> production < value.txt
vercel --prod  # Redeploy with restored vars
```

---

## Communication Template

When executing a rollback:

```
🔴 PRODUCTION ROLLBACK IN PROGRESS

Issue: [Brief description]
Detected: [Time]
Action: Rolling back to deployment [URL/SHA]
ETA: [Time to resolution]

Updates will follow in #engineering.
```

---

## Post-Rollback

1. Verify production is healthy (`scripts/smoke-test.mjs`)
2. Capture logs/metrics from failed deployment
3. Write incident report within 24 hours
4. Create fix on feature branch (never hotfix main directly)
5. Re-deploy through normal CI/CD once fix is verified

---

## Dress Rehearsal Protocol

Run twice before DAU launch:

### Clean Data Run

1. Deploy to staging with fresh database
2. Run full onboarding flow (sign up → org → claim → report)
3. Simulate rollback to previous version
4. Verify data integrity after rollback

### Messy Data Run

1. Deploy to staging with production-like data
2. Create incomplete claims, failed uploads, partial onboarding
3. Deploy new version → verify graceful handling
4. Rollback → verify no data loss
5. Document any edge cases found

---

## Emergency Contacts

| Role             | Contact                      | Availability        |
| ---------------- | ---------------------------- | ------------------- |
| Engineering Lead | [Defined in 1Password]       | 24/7 for P0         |
| DevOps/Infra     | [Defined in 1Password]       | Business hours + P0 |
| Clerk Support    | support@clerk.com            | Business hours      |
| Stripe Support   | dashboard.stripe.com/support | 24/7 for critical   |
| Vercel Support   | vercel.com/support           | 24/7 for Enterprise |

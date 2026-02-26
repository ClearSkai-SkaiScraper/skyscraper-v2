/\*\*

- Incident Response Playbook (Sprint 10.4.6)
-
- Standard procedures for handling production incidents on SkaiScrape.
  \*/

# Incident Response Playbook

## Severity Levels

| Level  | Description                               | Response Time     | Examples                                    |
| ------ | ----------------------------------------- | ----------------- | ------------------------------------------- |
| **P0** | System down, all users affected           | < 15 min          | Database outage, auth failure, deploy broke |
| **P1** | Major feature broken, many users affected | < 1 hour          | Stripe webhooks failing, AI generation down |
| **P2** | Minor feature broken, workaround exists   | < 4 hours         | Export failing, one email template broken   |
| **P3** | Cosmetic / low impact                     | Next business day | UI glitch, typo, non-critical log noise     |

---

## P0 — System Down

### Immediate Actions (< 15 min)

1. **Check Vercel Status**: https://vercel-status.com
2. **Check Sentry**: Look for error spike → identify root cause
3. **Check health endpoint**: `curl https://skaiscrape.com/api/health/deep`
4. **Check database**: Verify Prisma can connect (run health check)
5. **Check Clerk**: https://status.clerk.com
6. **Check Stripe**: https://status.stripe.com

### If deploy broke production:

```bash
# Rollback to previous deploy on Vercel
vercel rollback --prod

# Or redeploy last known good commit
git log --oneline -5
vercel --prod --force
```

### If database is down:

1. Check connection string in Vercel env vars
2. Check Supabase/Railway dashboard for DB status
3. If migration broke: `prisma migrate status` → fix and redeploy
4. If connection pool exhausted: restart application

### If auth (Clerk) is down:

1. Check https://status.clerk.com
2. If Clerk is having an outage → nothing we can do, post status
3. If our Clerk config broke → check CLERK_SECRET_KEY env var

---

## P1 — Major Feature Broken

### Stripe Webhooks Failing

1. Check Stripe dashboard → Developers → Webhooks → Event log
2. Verify webhook secret matches: `STRIPE_WEBHOOK_SECRET`
3. Test locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Check Sentry for webhook handler errors

### AI Generation Down

1. Check OpenAI status: https://status.openai.com
2. Verify `OPENAI_API_KEY` is valid and has credits
3. Check rate limits in OpenAI dashboard
4. Fallback: disable AI features temporarily via feature flag

### File Uploads Failing

1. Check S3/R2 bucket permissions
2. Verify `AWS_ACCESS_KEY_ID` and bucket config
3. Check file size limits (max 50MB)
4. Check MIME type validation

---

## Communication Template

### Internal (Slack)

```
🔴 P{LEVEL} INCIDENT — {title}
Started: {time}
Impact: {description}
Status: Investigating / Identified / Monitoring / Resolved
Lead: {name}
```

### External (Status Page)

```
We are currently investigating an issue with {feature}.
Some users may experience {impact}.
We are working to resolve this as quickly as possible.
Last updated: {time}
```

---

## Post-Incident

1. **Write incident report** within 24 hours
2. **Root cause analysis** — what broke and why
3. **Action items** — prevent recurrence
4. **Update monitoring** — add alerts for this failure mode
5. **Update this playbook** — add new scenario if novel

---

## Key Contacts

| Role           | Who | Contact                    |
| -------------- | --- | -------------------------- |
| Lead Engineer  | —   | —                          |
| DevOps         | —   | —                          |
| Stripe Support | —   | https://support.stripe.com |
| Clerk Support  | —   | https://clerk.com/support  |
| Vercel Support | —   | https://vercel.com/support |

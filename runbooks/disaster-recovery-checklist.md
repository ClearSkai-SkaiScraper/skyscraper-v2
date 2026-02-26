# 🛡️ Disaster Recovery Readiness Checklist

> **Last Updated:** Sprint 19 — February 2026
> **Review Cadence:** Monthly
> **Owner:** Engineering Lead

---

## 🎯 RPO / RTO Targets

| Metric  | Definition                   | Target        |
| ------- | ---------------------------- | ------------- |
| **RPO** | Maximum acceptable data loss | **≤ 1 hour**  |
| **RTO** | Maximum acceptable downtime  | **≤ 4 hours** |

---

## ✅ Infrastructure Readiness

### Database (Supabase PostgreSQL)

- [x] Supabase Pro plan active (includes PITR)
- [x] Point-in-Time Recovery enabled
- [x] Daily automated backups running
- [ ] Weekly export to external storage (S3/R2)
- [ ] Monthly restore drill (staging from prod snapshot)
- [x] Prisma migrations versioned in git (`db/migrations/`)
- [x] Connection pooling configured (PgBouncer)

### File Storage

- [x] Primary: Supabase Storage
- [x] Secondary: Firebase Storage (dual-write)
- [ ] Cross-region replication configured
- [ ] Weekly backup verification (sample file download test)

### Authentication (Clerk)

- [x] Clerk webhook for membership changes
- [x] Session invalidation on org removal
- [ ] Clerk status page monitoring alert configured
- [x] JWT-based auth (stateless — no server session to recover)

### Billing (Stripe)

- [x] Webhook with HMAC signature verification
- [x] Idempotency keys on all webhook handlers
- [x] Reconciliation cron for drift detection
- [x] Stripe Dashboard as source of truth (self-healing)

### CDN / Hosting (Vercel)

- [x] Auto-failover across regions
- [x] Instant rollback via deployment history
- [ ] Custom domain DNS failover plan documented
- [x] Edge middleware for global routing

### Monitoring (Sentry)

- [x] Sentry DSN configured
- [x] Error tracking active
- [ ] Alert rules → PagerDuty/Slack configured
- [ ] Error budget defined (99.9% uptime = 43.8 min/month)

### Rate Limiting (Upstash Redis)

- [x] 95+ routes rate-limited
- [x] Fail-open design (rate limiter failure doesn't block users)
- [ ] Redis backup/replication (Upstash handles automatically)

---

## 🔐 Secrets Management

### Current State

| Secret                  | Stored In  | Backup Location |
| ----------------------- | ---------- | --------------- |
| `DATABASE_URL`          | Vercel Env | ⬜ Secure vault |
| `CLERK_SECRET_KEY`      | Vercel Env | ⬜ Secure vault |
| `STRIPE_SECRET_KEY`     | Vercel Env | ⬜ Secure vault |
| `STRIPE_WEBHOOK_SECRET` | Vercel Env | ⬜ Secure vault |
| `OPENAI_API_KEY`        | Vercel Env | ⬜ Secure vault |
| `RESEND_API_KEY`        | Vercel Env | ⬜ Secure vault |
| `SENTRY_DSN`            | Vercel Env | ⬜ Secure vault |
| `TWILIO_*`              | Vercel Env | ⬜ Secure vault |
| `UPSTASH_*`             | Vercel Env | ⬜ Secure vault |
| `CRON_SECRET`           | Vercel Env | ⬜ Secure vault |

### Action Items

- [ ] Set up 1Password / Vault for secrets backup
- [ ] Weekly automated export of Vercel env vars
- [ ] Document rotation schedule for each secret

---

## 🔄 Failover Rehearsal Protocol

### Monthly Drill (30 min)

1. **Verify backups exist**: Check Supabase Dashboard → Backups
2. **Test restore**: Restore latest backup to staging project
3. **Verify data**: Run row-count queries on critical tables
4. **Test auth**: Log into staging with test account
5. **Test critical flows**: Create claim → upload photo → generate report
6. **Document results**: Update this checklist with drill date and findings

### Quarterly Drill (2 hours)

1. All monthly drill steps PLUS:
2. **Full deployment rollback**: Roll back Vercel deployment → verify app works
3. **DNS failover test**: Simulate DNS change → verify resolution
4. **Secrets rotation**: Rotate one non-critical secret → verify app reconnects
5. **Incident simulation**: Run through incident-response runbook end-to-end

---

## 📅 Drill History

| Date | Type | Result | Notes                |
| ---- | ---- | ------ | -------------------- |
| —    | —    | —      | Schedule first drill |

---

## 🚨 Escalation Contacts

| Role             | Name | Contact             |
| ---------------- | ---- | ------------------- |
| Engineering Lead | —    | —                   |
| DevOps / Infra   | —    | —                   |
| Supabase Support | —    | support@supabase.io |
| Vercel Support   | —    | support@vercel.com  |
| Stripe Support   | —    | support@stripe.com  |
| Clerk Support    | —    | support@clerk.com   |

---

_This checklist is a living document. Update after every drill and incident._

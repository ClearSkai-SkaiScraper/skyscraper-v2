# 🔄 Database Restore Runbook

> **Last Updated:** Sprint 19 — February 2026
> **RPO Target:** 1 hour (Recovery Point Objective)
> **RTO Target:** 4 hours (Recovery Time Objective)

---

## 📋 Pre-Restore Checklist

- [ ] Confirm the incident (data loss, corruption, or accidental deletion)
- [ ] Identify the exact time of the incident (UTC)
- [ ] Notify the team in #incidents channel
- [ ] Create an incident ticket with severity level
- [ ] Determine scope: single table, single org, or full database

---

## 🗄️ Supabase Database Restore

### Option A: Point-in-Time Recovery (PITR)

> Available on Supabase Pro plan. Restores to any second within the retention window.

1. **Go to Supabase Dashboard** → Project → Settings → Database
2. **Click "Backups"** → "Point in Time Recovery"
3. **Select target timestamp** (UTC) — just BEFORE the incident
4. **Click "Restore"** → This creates a NEW project with restored data
5. **Verify data integrity** on the restored project:
   ```sql
   -- Check row counts on critical tables
   SELECT 'claims' as tbl, COUNT(*) FROM claims
   UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
   UNION ALL SELECT 'file_assets', COUNT(*) FROM file_assets
   UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
   UNION ALL SELECT 'users', COUNT(*) FROM users;
   ```
6. **If verified**, update Vercel `DATABASE_URL` to point to restored DB
7. **Run pending migrations** (if any were added after the backup point):
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Daily Backup Restore

1. **Go to Supabase Dashboard** → Backups
2. **Download the latest daily backup** (`.sql` dump)
3. **Create a new Supabase project** (or use staging)
4. **Restore**:
   ```bash
   psql "$NEW_DATABASE_URL" < backup_YYYY-MM-DD.sql
   ```
5. **Run data diff** against production to identify lost records
6. **Selectively restore** missing records via INSERT statements

### Option C: Manual Table Restore (Surgical)

> Use when only specific tables are affected.

```sql
-- 1. Create temp table from backup
CREATE TABLE claims_backup AS SELECT * FROM claims;

-- 2. Identify missing/corrupted records
SELECT b.id FROM claims_backup b
LEFT JOIN claims c ON c.id = b.id
WHERE c.id IS NULL;

-- 3. Restore missing records
INSERT INTO claims SELECT * FROM claims_backup b
WHERE b.id NOT IN (SELECT id FROM claims);

-- 4. Cleanup
DROP TABLE claims_backup;
```

---

## 📦 File Storage Restore

### Supabase Storage

1. **Check Supabase Storage browser** for deleted files
2. If files are gone, check if Firebase backup exists (dual-write)
3. For bulk restore, use Supabase Storage API:
   ```bash
   # List all files in a bucket
   curl -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
     "$SUPABASE_URL/storage/v1/object/list/uploads"
   ```

### Firebase Storage (Backup)

1. Files uploaded via dual-write are in Firebase Storage
2. Use `firebase` CLI:
   ```bash
   firebase storage:export gs://your-bucket ./backup-dir
   ```

---

## 🔐 Secrets Restore

### Vercel Environment Variables

1. **Export current env vars** (do this regularly as backup):
   ```bash
   vercel env pull .env.backup --environment=production
   ```
2. **Restore from backup**:
   ```bash
   # Re-set each variable
   vercel env add VARIABLE_NAME production < value.txt
   ```

### Critical Secrets List

| Secret                   | Source             | Recovery                    |
| ------------------------ | ------------------ | --------------------------- |
| `DATABASE_URL`           | Supabase Dashboard | Project Settings → Database |
| `CLERK_SECRET_KEY`       | Clerk Dashboard    | API Keys                    |
| `STRIPE_SECRET_KEY`      | Stripe Dashboard   | Developers → API Keys       |
| `STRIPE_WEBHOOK_SECRET`  | Stripe Dashboard   | Developers → Webhooks       |
| `OPENAI_API_KEY`         | OpenAI Dashboard   | API Keys                    |
| `RESEND_API_KEY`         | Resend Dashboard   | API Keys                    |
| `SENTRY_DSN`             | Sentry Dashboard   | Project Settings            |
| `TWILIO_ACCOUNT_SID`     | Twilio Console     | Account Info                |
| `TWILIO_AUTH_TOKEN`      | Twilio Console     | Account Info                |
| `UPSTASH_REDIS_REST_URL` | Upstash Console    | Database Details            |
| `CRON_SECRET`            | Generate new       | `openssl rand -hex 32`      |

---

## ✅ Post-Restore Verification

```bash
# 1. Health check
curl -s https://skaiscrape.com/api/health | jq .

# 2. Deep health (DB, auth, storage)
curl -s https://skaiscrape.com/api/health/deep | jq .

# 3. Smoke test — can a user log in?
# Open https://skaiscrape.com in incognito → verify login works

# 4. Smoke test — can claims load?
# Navigate to /claims → verify list loads with real data

# 5. Check Sentry for new errors
# https://sentry.io → SkaiScraper project → Issues
```

---

## 🔁 Failover Rehearsal Checklist

> Run this monthly to verify DR readiness.

- [ ] **Auth failover**: Verify Clerk status page monitoring is active
- [ ] **DB failover**: Restore staging from prod snapshot → verify data
- [ ] **Storage failover**: Verify dual-write (Supabase + Firebase) is active
- [ ] **DNS failover**: Verify Vercel auto-failover is configured
- [ ] **Secrets backup**: Export all Vercel env vars to secure vault
- [ ] **Cron verification**: Verify orphan-cleanup and reconciliation crons run
- [ ] **Monitoring**: Verify Sentry alerts are reaching on-call
- [ ] **Runbook review**: Ensure this runbook is up-to-date

---

## 📊 DR Metrics

| Metric                         | Target       | Current                      |
| ------------------------------ | ------------ | ---------------------------- |
| RPO (Recovery Point Objective) | ≤ 1 hour     | ✅ Supabase PITR (Pro plan)  |
| RTO (Recovery Time Objective)  | ≤ 4 hours    | ✅ Restore + verify + deploy |
| Backup Frequency               | Daily + PITR | ✅ Supabase automatic        |
| Backup Retention               | 30 days      | ✅ Supabase Pro              |
| Last Restore Drill             | —            | ⬜ Schedule first drill      |
| Secrets Backup                 | Weekly       | ⬜ Set up vault export       |

---

_Review this runbook after every incident. Update procedures as infrastructure changes._

# File/Artifact Ownership Audit

## File Upload Inventory

| #   | Upload Path                                  | orgId Source                            | DB Record?                         | Storage Backend              | Risk             |
| --- | -------------------------------------------- | --------------------------------------- | ---------------------------------- | ---------------------------- | ---------------- |
| 1   | `/api/claims/[claimId]/photos`               | `requireAuth()`                         | ✅ `claim_photos`                  | Supabase → Firebase fallback | 🟢               |
| 2   | `/api/claims/[claimId]/documents`            | `requireAuth()`                         | ✅ `documents`                     | Supabase                     | 🟢               |
| 3   | `/api/uploads/file`                          | `auth()` or fallback to `currentUser()` | ✅ `file_assets`                   | Supabase                     | 🟡 fallback risk |
| 4   | `/api/uploads/message-attachment`            | `auth()` only                           | ❌ **No DB record**                | Supabase                     | 🔴               |
| 5   | `/api/upload/avatar`                         | `currentUser()`                         | ❌ **No DB record**                | Supabase → Firebase          | 🟡               |
| 6   | `/api/upload/cover`                          | `currentUser()`                         | ❌ **No DB record**                | Supabase → Firebase          | 🟡               |
| 7   | `/api/upload/portfolio`                      | `auth()`                                | ❌ **No DB record**                | Supabase                     | 🟡               |
| 8   | `/api/branding/upload`                       | `auth()` + org update                   | ⚠️ Via branding update only        | Supabase                     | 🟡               |
| 9   | `/api/company-docs/upload`                   | `auth()`                                | ✅ `file_assets`                   | Supabase                     | 🟡 fallback risk |
| 10  | `/api/completion/upload-doc`                 | `currentUser()`                         | ✅ `completion_documents`          | Supabase                     | 🟢               |
| 11  | `/api/completion/upload-photo`               | `currentUser()`                         | ✅ `completion_photos`             | Supabase                     | 🟢               |
| 12  | `/api/evidence/upload`                       | `safeOrgContext()`                      | ✅ `file_assets`                   | Supabase                     | 🟢               |
| 13  | `/api/portal/upload-photo`                   | Portal auth                             | ❌ **No DB record, no claim link** | Supabase                     | 🔴               |
| 14  | `/api/portal/claims/[claimId]/assets` (POST) | Portal auth                             | ❌ **No DB record**                | Supabase                     | 🔴               |
| 15  | `/api/portal/claims/[claimId]/photos`        | Portal auth                             | ⚠️ Delegated handler               | Supabase                     | 🟡               |
| 16  | `/api/portal/claims/[claimId]/documents`     | Portal auth                             | ⚠️ Delegated handler               | Supabase                     | 🟡               |
| 17  | `/api/video/create`                          | `requireAuth()`                         | ❌ **No DB artifact**              | Firebase                     | 🔴               |
| 18  | `/api/upload/supabase`                       | `auth()` + DB resolution                | ✅ Flexible                        | Supabase                     | 🟡               |
| 19  | `/api/weather/report` (PDF)                  | `safeOrgContext()`                      | ✅ Weather report record           | Supabase                     | 🟢               |
| 20  | `/api/reports/generate` (PDF)                | `safeOrgContext()`                      | ✅ `reports` + PDF                 | Supabase                     | 🟢               |

---

## Unlinked Artifact Risks 🔴

### Files With No Database Record

| Path                                                            | Impact                                                                                         | Cleanup Possible?                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| **Portal file uploads** (`/api/portal/claims/[claimId]/assets`) | Files in Supabase bucket, no `file_assets` row — invisible to queries, can never be cleaned up | ❌ No — no reference to find them |
| **Portal photo uploads** (`/api/portal/upload-photo`)           | Generic photos under `portal/{userId}` — no claim, no org, no DB record                        | ❌ No                             |
| **Message attachments** (`/api/uploads/message-attachment`)     | Files under `messages/{userId}` — no `file_assets` row, no org linkage                         | ❌ No                             |
| **Video generation** (`/api/video/create`)                      | Video uploaded to Firebase — URL returned to client but no database record                     | ❌ No — only client has URL       |
| **Avatar/cover photos**                                         | Stored in Supabase — old versions never cleaned up                                             | ⚠️ Could scan storage             |
| **Portfolio photos**                                            | Under `portfolio/{userId}` — no tracking                                                       | ⚠️ Could scan storage             |

### AI Artifacts Without Persistence

| Source                     | Issue                                                                      |
| -------------------------- | -------------------------------------------------------------------------- |
| AI in-memory queue results | `saveResult` is a no-op — AI section generation work is silently discarded |
| Mockup generation          | Returns image buffer to client — not stored unless client explicitly saves |

---

## Public URL Exposure 🔴 CRITICAL

**Supabase `getPublicUrl()` returns unauthenticated, permanent URLs.**

Any person with the URL can download the file without any authentication.

### Affected Routes Using Public URLs

| Route               | Bucket              | Data Type                                 |
| ------------------- | ------------------- | ----------------------------------------- |
| Claim photo uploads | `claim-photos`      | Customer property damage photos           |
| Document uploads    | `documents`         | Insurance documents, estimates, contracts |
| Evidence uploads    | `evidence`          | Storm evidence, forensic photos           |
| Company docs        | `company-docs`      | Business documents                        |
| Branding uploads    | `branding`          | Company logos, letterheads                |
| Generated reports   | `generated-reports` | AI-generated damage reports               |

### Mitigation

- **Immediate**: Switch all buckets to private, use `createSignedUrl()` with expiration
- **Long-term**: Implement Supabase RLS policies for org-scoped access

### Signed URL Usage (Good Pattern — Where It Exists)

| Route                | Pattern                 | Expiry    |
| -------------------- | ----------------------- | --------- |
| Firebase uploads     | 15-min signed URLs      | ✅ Good   |
| Weather report PDFs  | `createSignedUrl(3600)` | ✅ 1 hour |
| Evidence signed URLs | `createSignedUrl()`     | ✅ Good   |

---

## Download Access Control

| Route                                       | Auth Check         | Org Check                | Risk                        |
| ------------------------------------------- | ------------------ | ------------------------ | --------------------------- |
| `/api/portal/claims/[claimId]/assets` (GET) | Portal auth        | Via claimId storage path | 🟡 No org filter on listing |
| `/api/claims/[claimId]/files/[fileId]`      | `safeOrgContext()` | ✅ orgId in query        | 🟢                          |
| `/api/evidence/[assetId]/signed-url`        | `auth()`           | ⚠️ Unclear org check     | 🟡                          |
| Public Supabase URLs                        | ❌ None            | ❌ None                  | 🔴                          |

---

## Top 15 File/Artifact Issues

| #   | Severity | Issue                                                                 |
| --- | -------- | --------------------------------------------------------------------- |
| 1   | 🔴 P0    | Public Supabase URLs expose ALL uploaded files without authentication |
| 2   | 🔴 P0    | Portal file uploads create no DB record — untracked orphans           |
| 3   | 🔴 P0    | Message attachments create no DB record — no org linkage              |
| 4   | 🔴 P0    | Video generation creates no DB artifact — URL only known to client    |
| 5   | 🟠 P1    | Portal photo uploads have no claim linkage or DB record               |
| 6   | 🟠 P1    | Upload fallback uses `companyId` as orgId — breaks tenant isolation   |
| 7   | 🟠 P1    | AI `saveResult` is a no-op — AI artifacts silently discarded          |
| 8   | 🟡 P2    | Avatar/cover/portfolio photos never cleaned up                        |
| 9   | 🟡 P2    | Evidence signed URL route has unclear org ownership check             |
| 10  | 🟡 P2    | Mockup images returned as buffer — not persisted                      |
| 11  | 🟡 P2    | Branding uploads tracked only via org update, not `file_assets`       |
| 12  | 🟡 P2    | Portal asset listing has no org filter on storage scan                |
| 13  | 🟡 P2    | Firebase and Supabase used inconsistently (mixed backends)            |
| 14  | 🟡 P3    | No file size limits on some upload routes                             |
| 15  | 🟡 P3    | No file type validation on some upload routes                         |

# 🚀 Client Flows & Platform Completion — Master Sprint Plan

> **Created:** 2025-07-10
> **Scope:** Bidirectional invite/connect flow, messaging enhancements, document management, client portal completion, work opportunities
> **Dependency:** Dashboard widget fixes (StatsCards, Messages, Documents) — completed

---

## Sprint A: Bidirectional Invite & Connect Flow (3–4 days)

### A1: Notification Bell + Invitations Page

- [ ] Create `src/app/(app)/notifications/page.tsx` — Notification center with tabs: All | Invites | Messages | System
- [ ] Create `/api/notifications/route.ts` — GET unread notifications for current user
- [ ] Add notification bell icon in top-nav/header with unread badge count
- [ ] Create Prisma model `Notification` — `{ id, userId, orgId, type, title, body, href, read, createdAt }`
- [ ] Migration: `CREATE TABLE "Notification" (...)`

### A2: Client → Pro Invitation Flow

- [ ] Client portal: "Find a Pro" or "Connect with Contractor" button
- [ ] `/api/network/clients/invite` — POST: client sends invite to pro (by email or orgId)
- [ ] Create Prisma model `ConnectionInvite` — `{ id, fromUserId, fromType, toUserId, toType, status, message, claimId?, jobId?, createdAt, respondedAt }`
- [ ] Migration: `CREATE TABLE "ConnectionInvite" (...)`
- [ ] When invite sent → create `Notification` for the pro
- [ ] Pro receives invite in Notifications page → Accept/Decline buttons

### A3: Pro → Client Invitation Flow

- [ ] Claims overview: "Invite Client" action in Actions section
- [ ] `/api/claims/[claimId]/invite-client` — POST: generates invite link + sends email
- [ ] When client accepts → create `Connection` record + `Notification` for pro
- [ ] Create Prisma model `Connection` — `{ id, proUserId, proOrgId, clientUserId, clientId, status, connectedAt, claimId?, jobId? }`
- [ ] Migration: `CREATE TABLE "Connection" (...)`

### A4: Connections Management

- [ ] Create `/connections` page — list of all connected clients/pros
- [ ] Each connection shows: name, email, connected date, linked claims/jobs, message button
- [ ] Add "Connections" to sidebar under Company & Network section
- [ ] Accepting an invite auto-creates the `Connection` and fires welcome notification to both parties

---

## Sprint B: Messaging Enhancements (2–3 days)

### B1: Accept Invite from Messages

- [ ] When pro receives message from unconnected client → show "Accept Connection" banner at top of thread
- [ ] Accepting from messages → creates `Connection` + `ConnectionInvite` acceptance
- [ ] "Send first message?" prompt when a new connection is established

### B2: Message Attachments

- [ ] Add file attachment button to message composer (trades messages, claim messages, portal messages)
- [ ] Add `attachments` field to `Message` model — `String[]` (array of URLs)
- [ ] Upload handler: reuse `DocumentUpload` component logic for message attachments
- [ ] Display attachments inline: image preview for photos, file icon + download link for docs
- [ ] Migration: `ALTER TABLE "Message" ADD COLUMN "attachments" TEXT[] DEFAULT '{}'`

### B3: Photo Sharing in Messages

- [ ] Drag-and-drop photo into message composer → upload → attach
- [ ] Image thumbnails in message bubbles with lightbox on click
- [ ] Mobile-friendly camera button for direct photo capture

---

## Sprint C: Document Management & Forwarding (2–3 days)

### C1: Universal Document Uploader

- [ ] Ensure `DocumentUpload` component works on both claim documents page AND retail job page
- [ ] Retail jobs: create `/api/leads/[leadId]/files` POST handler if missing
- [ ] Verify upload flow: file → Supabase Storage → `file_assets` record → refresh list

### C2: PDF Save-to-Documents

- [ ] When AI generates a report/supplement/rebuttal/etc., auto-save the PDF to `file_assets`
- [ ] Add "Save to Documents" button on report preview pages
- [ ] Link from Documents tab → view the generated report

### C3: Client-Facing Document Toggle

- [ ] Each document row has "Shared/Private" toggle (already implemented in `ClaimDocumentsPage`)
- [ ] Verify the toggle updates `visibleToClient` field via `/api/claims/[claimId]/files/[fileId]` PATCH
- [ ] Client portal `/portal/documents` or `/client/[slug]/documents` shows only `visibleToClient: true` docs
- [ ] Real-time: when pro toggles → client portal reflects immediately (or on next poll)

### C4: Document Forwarding to Connected Clients

- [ ] "Forward to Client" action on document row → opens modal with connected client list
- [ ] Selecting a client → sets `visibleToClient: true` + sends notification to client
- [ ] Notification links directly to the document in client portal

---

## Sprint D: Client Portal Audit & Free Account Completion (3–4 days)

### D1: Client Portal Page Inventory

- [ ] Audit all pages under `/portal/` and `/client/[slug]/`:
  - `/portal` — Dashboard
  - `/portal/claims` — My Claims list
  - `/portal/claims/[id]` — Claim detail
  - `/portal/documents` — Shared documents
  - `/portal/messages` — Message threads
  - `/portal/messages/[threadId]` — Thread detail
  - `/portal/profile` — Client profile/settings
- [ ] For each page: verify it renders, loads data, and handles edge cases

### D2: Client Claim Tracking

- [ ] Client can see all claims where they're listed as homeowner (matched by email or `clientId`)
- [ ] Claim status timeline visible to client (read-only)
- [ ] Photo gallery from claim visible if `visibleToClient: true`
- [ ] Weather report summary visible

### D3: Client Job Tracking

- [ ] Client can see retail jobs where they're the customer
- [ ] Job progress/status visible
- [ ] Invoices and estimates visible if shared

### D4: Free Client Account Registration

- [ ] Verify sign-up flow: `/sign-up` with `userType=client` → Clerk account → auto-create `Client` record
- [ ] Onboarding: name, email, phone, address (minimal)
- [ ] Auto-link to existing claim/job if email matches `homeownerEmail` or `homeowner_email`
- [ ] Fix duplicate `homeownerEmail` / `homeowner_email` fields (schema cleanup)

### D5: Client Dashboard

- [ ] Client portal dashboard shows: active claims count, shared documents count, unread messages count
- [ ] "My Contractors" section — list of connected pros
- [ ] Quick-link cards: View Claims, View Documents, Messages

---

## Sprint E: Work Opportunities Widget (1–2 days)

### E1: Real Job Invites

- [ ] `WorkOpportunityNotifications` already fetches from `/api/trades/opportunities`
- [ ] Wire up real data: query `ConnectionInvite` where `toUserId = currentUser` and `status = PENDING`
- [ ] Show job title, company name, location, posted date
- [ ] Accept/Decline actions update `ConnectionInvite.status`

### E2: Job Board Postings

- [ ] Query `network_posts` or a new `JobPosting` model for open opportunities in user's service area
- [ ] Filter by trade type, location radius, urgency
- [ ] "Express Interest" button → creates a `ConnectionInvite` back to the poster

### E3: Dashboard Widget Polish

- [ ] Show notification badge count on Work Opportunities header
- [ ] Link "View All" to full opportunities/job board page
- [ ] Empty state: "No opportunities yet — complete your trade profile to receive invites"

---

## Database Migrations Needed (consolidated)

```sql
-- Sprint A
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "orgId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'system',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "href" TEXT,
  "read" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_read_idx" ON "Notification"("userId", "read");

CREATE TABLE "ConnectionInvite" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "fromUserId" TEXT NOT NULL,
  "fromType" TEXT NOT NULL DEFAULT 'pro',
  "toUserId" TEXT,
  "toEmail" TEXT,
  "toType" TEXT NOT NULL DEFAULT 'client',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "claimId" TEXT,
  "jobId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "respondedAt" TIMESTAMPTZ
);
CREATE INDEX "ConnectionInvite_toUserId_idx" ON "ConnectionInvite"("toUserId");
CREATE INDEX "ConnectionInvite_status_idx" ON "ConnectionInvite"("status");

CREATE TABLE "Connection" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "proUserId" TEXT NOT NULL,
  "proOrgId" TEXT NOT NULL,
  "clientUserId" TEXT,
  "clientId" TEXT,
  "status" TEXT DEFAULT 'active',
  "connectedAt" TIMESTAMPTZ DEFAULT now(),
  "claimId" TEXT,
  "jobId" TEXT
);
CREATE INDEX "Connection_proUserId_idx" ON "Connection"("proUserId");
CREATE INDEX "Connection_clientUserId_idx" ON "Connection"("clientUserId");

-- Sprint B
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachments" TEXT[] DEFAULT '{}';
```

---

## Priority Order

| Priority | Sprint                     | Effort   | Impact                          |
| -------- | -------------------------- | -------- | ------------------------------- |
| 🔴 P0    | A1-A3: Invite flow core    | 2 days   | Enables client↔pro connection   |
| 🔴 P0    | C1: Document uploader      | 0.5 day  | Unblocks document management    |
| 🟡 P1    | A4: Connections page       | 1 day    | Shows relationship network      |
| 🟡 P1    | B2: Message attachments    | 1 day    | Photos/docs in messages         |
| 🟡 P1    | C3-C4: Doc forwarding      | 1 day    | Client sees shared docs         |
| 🟢 P2    | D1-D5: Client portal audit | 3 days   | Full client experience          |
| 🟢 P2    | E1-E3: Work opportunities  | 1.5 days | Real job matching               |
| 🔵 P3    | B1,B3: Message UX polish   | 1 day    | Accept-from-messages, drag-drop |

**Total estimated effort: ~11-14 working days across 5 sprints**

---

## Files to Create (New)

```
src/app/(app)/notifications/page.tsx
src/app/api/notifications/route.ts
src/app/(app)/connections/page.tsx
src/app/api/connections/route.ts
src/app/api/connections/[id]/route.ts
db/migrations/YYYYMMDD_create_notifications.sql
db/migrations/YYYYMMDD_create_connection_invites.sql
db/migrations/YYYYMMDD_create_connections.sql
db/migrations/YYYYMMDD_message_attachments.sql
```

## Files to Modify (Existing)

```
prisma/schema.prisma                          — Add Notification, ConnectionInvite, Connection models + Message.attachments
src/app/(app)/_components/AppSidebar.tsx       — Add Notifications, Connections nav items
src/app/(app)/claims/[claimId]/overview        — Wire up invite-client action
src/app/(app)/dashboard/_components/WorkOpportunityNotifications.tsx — Real data
src/app/(app)/trades/messages/page.tsx         — Attachment support
src/app/portal/messages/page.tsx               — Attachment support
src/components/uploads/DocumentUpload.tsx      — Reusable for messages
```

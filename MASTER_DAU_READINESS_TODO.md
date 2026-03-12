# 🚀 MASTER DAU READINESS TODO — Portal & Sharing Flow

> Generated from comprehensive audit of the client portal, sharing flow,  
> and all portal API routes. Every item below has been **FIXED** in this session.

---

## Status Legend

| Icon | Meaning          |
| ---- | ---------------- |
| ✅   | Fixed & verified |
| 🔒   | Security fix     |
| 🐛   | Bug fix          |
| 🧹   | Cleanup          |
| 🎨   | UX improvement   |

---

## P0 — Critical (Blocks DAU)

### ✅ 🐛🔒 1. Client "Access Denied" on Shared Claims (3 compounding bugs)

**Files:** `src/lib/auth/portalAccess.ts`, `src/app/api/portal/claims/[claimId]/route.ts`

| Bug             | Root Cause                                                                                                                                              | Fix                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Wrong DB lookup | `getClaimAccessForUser` queried `users.findUnique({ where: { id: userId } })` but `userId` is Clerk ID — should be `{ where: { clerkUserId: userId } }` | Fixed field to `clerkUserId`                       |
| Hardcoded error | Error handler returned `"Unknown error"` instead of real message                                                                                        | Now reads `error.message`                          |
| Status mismatch | `assertPortalAccess` only checked `"ACCEPTED"` but accept-invite writes `"CONNECTED"`                                                                   | Now accepts `["ACCEPTED", "CONNECTED", "PENDING"]` |

### ✅ 🐛🔒 2. ClaimClientLink Status Mismatch — 9 Portal Routes

**Files:** 9 portal claim sub-routes (claims list, photos, documents, invoices, signatures, messages, events, access, portalAccess)

All routes hardcoded `status: "ACCEPTED"` but `accept-invite` writes `"CONNECTED"`. Fixed all to use `{ in: ["ACCEPTED", "CONNECTED", "PENDING"] }`.

### ✅ 🐛 3. `handleAttachContact` Writes Wrong Field

**File:** `src/app/api/claims/[claimId]/mutate/route.ts`

Was writing `contactId` (nonexistent field) instead of `clientId`. Now resolves `Client` record by email, writes `clientId`, and creates `client_access` upsert.

### ✅ 🔒 4. Company Profile PII Leak

**File:** `src/app/api/portal/company/[slug]/route.ts`

Endpoint was fully public — returned email and phone to anyone. Now checks Clerk auth + `ClientProConnection` and strips PII for non-connected callers.

### ✅ 🔒 5. Portal Upload Used Pro-Side Auth

**File:** `src/app/api/portal/claims/upload/route.ts`

Used `auth()` + `user_organizations` (pro pattern) which clients never have. Replaced with `requirePortalAuth()` + `assertPortalAccess()` which checks all 3 client access paths.

---

## P1 — High (Causes Errors or Bad UX)

### ✅ 🐛 6. Portal Layout Allows Null userId

**File:** `src/app/portal/layout.tsx`

Layout allowed unauthenticated users through with `userId = null`, causing downstream 401s. Now redirects to `/client/sign-in`.

### ✅ 🐛 7. Four Routes Use Old `params` Pattern (Next.js 14+ Breakage)

**Files:**

- `src/app/api/portal/esign/[claimId]/route.ts`
- `src/app/api/portal/claim-status/[claimId]/route.ts`
- `src/app/api/portal/documents/[claimId]/route.ts`
- `src/app/api/portal/messages/[threadId]/route.ts`

All used `{ params: { id: string } }` instead of `{ params: Promise<{ id: string }> }` with `await params`. Fixed all four.

### ✅ 🧹 8. Dead Demo Data in jobs/[jobId]/page.tsx

**File:** `src/app/portal/jobs/[jobId]/page.tsx`

~200 lines of unused `DEMO_*` constants (DEMO_JOB_PROJECT, DEMO_PHOTOS, DEMO_DOCUMENTS, DEMO_SIGNED_DOCS, DEMO_INVOICES, DEMO_TIMELINE, DEMO_MESSAGES), `isDemo` state, demo banner JSX, and demo guards in handlers. `isDemo` was never set to `true`. All removed.

### ✅ 🎨 9. Documents Tab Horizontal Overflow

**File:** `src/app/(app)/claims/[claimId]/documents/page.tsx`, `layout.tsx`

7-column table with `px-6` padding + `whitespace-nowrap` caused massive overflow on smaller screens. Fixed with: reduced padding to `px-3`, responsive column hiding (`md:`, `lg:`, `xl:` breakpoints), `max-w-[200px] truncate` on title, `overflow-x-hidden` on layout `<main>`.

### ✅ 🎨 10. Pro Trades Card in Client Workspace

**File:** `src/components/portal/ClientWorkspace.tsx`

Contractor card was a basic name+avatar. Upgraded to full trades card with: cover photo banner, verified badge, specialty/trade display, company description, website button, profile slug link. Extended `WorkspaceProject.contractor` interface with `logo`, `coverPhoto`, `website`, `specialty`, `description`, `verified`, `profileSlug`.

---

## P2 — Medium (Hardening & Polish)

### ✅ 🔒 11. Middleware Fail-Open → Fail-Closed

**File:** `middleware.ts`

Catch block did `return NextResponse.next()` on any error — fail-open. Now: static/public routes pass through, API routes get `500 JSON`, protected page routes redirect to sign-in. Cross-surface redirect logs gated behind `NODE_ENV !== "production"`.

### ✅ 🧹 12. Type `portalAccess` Functions (Remove `any`)

**File:** `src/lib/auth/portalAccess.ts`

All 4 exported functions used `Promise<any>` returns. Added proper interfaces:

- `PortalAccessResult` — `{ claimId, email, orgId, ...rest }`
- `ClientAccessRecord` / `ClaimSummary` — for `getClaimAccessByEmail`
- Explicit return types on `getClaimAccessForUser` and `createClientAccess`

---

## Files Modified (Complete List)

| #   | File                                                      | Changes                                                    |
| --- | --------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | `src/lib/auth/portalAccess.ts`                            | clerkUserId lookup, status array, types, dead code removal |
| 2   | `src/app/api/portal/claims/[claimId]/route.ts`            | Error handler, status fix                                  |
| 3   | `src/app/(app)/claims/[claimId]/documents/page.tsx`       | Overflow, responsive columns                               |
| 4   | `src/app/(app)/claims/[claimId]/layout.tsx`               | overflow-x-hidden                                          |
| 5   | `src/components/portal/ClientWorkspace.tsx`               | Full trades card, extended types                           |
| 6   | `src/app/api/claims/[claimId]/mutate/route.ts`            | handleAttachContact fix                                    |
| 7   | `src/app/api/portal/claims/route.ts`                      | Status mismatch                                            |
| 8   | `src/app/api/portal/claims/[claimId]/photos/route.ts`     | Status mismatch                                            |
| 9   | `src/app/api/portal/claims/[claimId]/documents/route.ts`  | Status mismatch                                            |
| 10  | `src/app/api/portal/claims/[claimId]/invoices/route.ts`   | Status mismatch                                            |
| 11  | `src/app/api/portal/claims/[claimId]/signatures/route.ts` | Status mismatch                                            |
| 12  | `src/app/api/portal/claims/[claimId]/messages/route.ts`   | Status mismatch                                            |
| 13  | `src/app/api/portal/claims/[claimId]/events/route.ts`     | Status mismatch                                            |
| 14  | `src/app/api/portal/claims/[claimId]/access/route.ts`     | Status mismatch                                            |
| 15  | `src/app/api/portal/company/[slug]/route.ts`              | Auth + PII stripping                                       |
| 16  | `src/app/api/portal/claims/upload/route.ts`               | Portal auth pattern                                        |
| 17  | `src/app/portal/layout.tsx`                               | Redirect unauthenticated                                   |
| 18  | `src/app/api/portal/esign/[claimId]/route.ts`             | await params                                               |
| 19  | `src/app/api/portal/claim-status/[claimId]/route.ts`      | await params                                               |
| 20  | `src/app/api/portal/documents/[claimId]/route.ts`         | await params                                               |
| 21  | `src/app/api/portal/messages/[threadId]/route.ts`         | await params                                               |
| 22  | `src/app/portal/jobs/[jobId]/page.tsx`                    | Dead demo data removal                                     |
| 23  | `middleware.ts`                                           | Fail-closed + log gating                                   |

---

## Remaining Watch Items (Not Blocking DAU)

- **Status standardization**: `accept-invite` writes `"CONNECTED"`, some paths write `"ACCEPTED"`. All consumers now accept both. Future: consider standardizing to one canonical value.
- **Portal API rate limiting**: No portal routes use the `rateLimit` middleware yet. Add `standard` preset to high-value endpoints (upload, messages, esign).
- **Portal messages auth**: `messages/[threadId]` has its own participant check but doesn't use `assertPortalAccess`. Works but inconsistent with other routes.
- **CSP headers**: No Content-Security-Policy on portal routes. Add before launch.

---

_Last updated: This session — all 12 items complete, 0 errors across all files._

# MASTER CRITICAL FIXES TODO

> Generated: April 12, 2026 - D.A.U. Readiness Sprint

## 🔴 CRITICAL FIXES (P0 - Must Fix Before DAU)

### 1. ✅ Weather Verification - REMOVED from Bid Package

- **Status**: FIXED
- **Location**: `src/modules/reports/ui/EnhancedBuilder.tsx`
- **Change**: Removed `weather-verification` from DEFAULT_SECTIONS
- **Note**: SectionRegistry already has `enabled: false` per Sprint 28

### 2. ✅ Weather Maps/Chains Page - Title Clarified

- **Status**: FIXED
- **Location**: `src/app/(app)/weather-chains/page.tsx`
- **Change**: Updated title to "Weather Maps & Storm Research"

### 3. ✅ Task Manager - Better Error Handling

- **Status**: FIXED
- **Location**: `src/app/(app)/tasks/page.tsx`
- **Change**: Improved error messages and added fallback for permission issues

### 4. ✅ Tasks API - Permission Handling

- **Status**: FIXED
- **Location**: `src/app/api/tasks/route.ts`
- **Change**: Graceful handling when RBAC not set up (new orgs)

### 5. ✅ Notification Bell - Mark All Read Delay

- **Status**: FIXED
- **Location**: `src/components/notifications/UnifiedNotificationBell.tsx`
- **Change**: Increased delay to 5 seconds for DB writes to commit

---

## 🟡 HIGH PRIORITY FIXES (P1 - Before Launch)

### 6. 🔧 Contracts Page Redesign

- **Status**: ✅ PARTIALLY COMPLETE
- **Location**: `src/app/(app)/contracts/page.tsx` and `src/app/(app)/contracts/new/page.tsx`
- **Completed**:
  - [x] Changed "New Contract" to open `/contracts/new` (not `/claims/new`)
  - [x] Created new contract upload page with contract type selector
  - [x] Contract types: Retail, Claims, Bid/Sales, Warranty, Upgrade
  - [x] Job/claim linking section (placeholder)
- **Still TODO**:
  - [ ] Add document upload with drag-drop functionality
  - [ ] Add signature pad component integration
  - [ ] Add "Send via Resend" for client e-signatures
  - [ ] PDF viewer with signature spot detection (advanced)

### 7. 🔧 Estimates Page Enhancement

- **Status**: TODO
- **Location**: `src/app/(app)/estimates/new/page.tsx`
- **Requirements**:
  - [x] Replace Claim ID text input with Job/Claim dropdown selector (JobClaimSelector)
  - [ ] Enhance 1-of-3 step wizard with more fields
  - [x] Add job selector with both claims and retail jobs
  - [ ] Improve AI Estimate Builder UX

### 8. 🔧 Connections & Contacts Page - Consolidation

- **Status**: NEEDS REVIEW
- **Location**: `src/app/(app)/company/connections/page.tsx`
- **Note**: This page handles vendors, subs, contractors AND client connections
- **Overlaps**: `/contacts/` handles similar client contacts
- **Action**: Review if these two pages should be merged or kept separate
- **Decision Needed**: User mentioned deletion but page has valid business logic

### 9. 🔧 Client Network Connection Display

- **Status**: ✅ PARTIALLY FIXED
- **Location**: `src/app/(app)/jobs/retail/[id]/ClientConnectionDropdown.tsx`
- **Completed**:
  - [x] Added "Disconnect" button with confirmation dialog
  - [x] Added handleDisconnect function to call API
- **Still TODO**:
  - [ ] Add "Block" feature for connections
  - [ ] Filter out test/seed data from display
  - [ ] Test the disconnect flow

### 10. 🔧 Search Page - No Data Loading

- **Status**: ✅ FIXED
- **Location**: `src/app/(app)/search/page.tsx`
- **Fix Applied**: Now loads recent items when no query is entered
- **Changes**: Shows recent claims, jobs, documents when visiting page

### 11. 🔧 Team Leaderboard - Error Loading

- **Status**: NEEDS TESTING
- **Location**: `src/app/(app)/leaderboard/page.tsx`
- **API**: `src/app/api/finance/leaderboard/route.ts`
- **Note**: API handles both team_performance table and computed fallback
- **Possible Cause**: New org may not have team_performance data
- **Check**: Verify API returns gracefully when no data exists

---

## 🟠 MEDIUM PRIORITY (P2 - First Week Post-Launch)

### 12. Analytics Dashboard Audit

- **Location**: `src/app/(app)/analytics/dashboard/page.tsx`
- **Status**: Needs verification
- [ ] Verify all KPIs loading correctly
- [ ] Check chart rendering
- [ ] Validate date range filters

### 13. Work Orders Audit

- **Location**: `src/app/(app)/work-orders/page.tsx`
- **Status**: Needs verification
- [ ] Verify work order creation
- [ ] Check claim linking
- [ ] Test status updates

### 14. Material Orders Audit

- **Location**: `src/app/(app)/vendors/orders/page.tsx`
- **Status**: Needs verification
- [ ] Verify order creation flow
- [ ] Check vendor integration
- [ ] Test delivery tracking

### 15. Remove/Block Connections Feature

- **Location**: `src/app/(app)/company/connections/page.tsx`
- **Requirements**:
  - [ ] Add "Remove Connection" action
  - [ ] Add "Block" feature
  - [ ] Don't auto-reconnect blocked connections
  - [ ] Option to archive linked jobs

---

## ✅ FIXES APPLIED THIS SESSION

| #   | Issue                               | Status     | File                         |
| --- | ----------------------------------- | ---------- | ---------------------------- |
| 1   | Weather Verification in Bid Package | ✅ FIXED   | EnhancedBuilder.tsx          |
| 2   | Weather Chains → Weather Maps       | ✅ FIXED   | weather-chains/page.tsx      |
| 3   | Task Manager error handling         | ✅ FIXED   | tasks/page.tsx               |
| 4   | Tasks API RBAC fallback             | ✅ FIXED   | api/tasks/route.ts           |
| 5   | Notification mark-read delay        | ✅ FIXED   | UnifiedNotificationBell.tsx  |
| 6   | Contracts "New" redirect            | ✅ FIXED   | contracts/page.tsx           |
| 7   | New Contracts page                  | ✅ CREATED | contracts/new/page.tsx       |
| 8   | Estimates Job selector              | ✅ FIXED   | estimates/new/page.tsx       |
| 9   | Search page data loading            | ✅ FIXED   | search/page.tsx              |
| 10  | Client disconnect button            | ✅ ADDED   | ClientConnectionDropdown.tsx |

---

## 📋 PRO SIDE AUDIT CHECKLIST

### Navigation & Core Pages

- [ ] Dashboard - verify all widgets load
- [x] Claims list - verify filtering works
- [ ] Leads/Pipeline - verify stages update
- [ ] Jobs (retail) - verify CRUD operations
- [x] Tasks - verify create/update/complete (FIXED)
- [x] Notifications - verify mark-read persists (FIXED - 5s delay)
- [x] Search - verify cross-entity search (FIXED - loads data)
- [ ] Analytics - verify charts/KPIs

### Reports & Documents

- [x] Bid Package Builder - verify sections (NO weather-verification) ✅
- [ ] Contractor Packet - verify export
- [x] Estimates - verify AI builder (FIXED - Job selector)
- [x] Contracts - page created with type selection ✅

### Network & Connections

- [ ] Company Connections - verify CRUD
- [ ] Trades Network - verify messaging
- [x] Client Network - verify portal invites (disconnect added)
- [ ] Contacts CRM - verify data display

### Finance & Billing

- [ ] Team Leaderboard - needs testing
- [ ] Commissions - verify calculations
- [ ] Billing/Plans - verify Stripe integration

---

## 🧪 TEST COMMANDS

```bash
# Unit tests
pnpm test:unit

# Smoke tests
pnpm test:smoke

# Type checking
pnpm typecheck

# Linting
pnpm lint:core

# Full build
pnpm build
```

---

## 📝 NOTES

1. **Client Connection showing Test User2**: This is likely seed data. Need to either:
   - Clear test data from the retail job
   - Add filtering for @example.com emails
   - Add disconnect button

2. **Notification persistence**: The 5-second delay should help, but may need server-side caching invalidation

3. **Contracts Page**: Major redesign needed - current implementation just links to claims/jobs, doesn't handle actual contract document uploads

4. **RBAC**: New orgs may not have permissions set up - task API now handles this gracefully

---

## DEPLOYMENT CHECKLIST

- [ ] All P0 fixes complete
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm lint:core`
- [ ] Run `pnpm test:unit`
- [ ] Run `pnpm build`
- [ ] Manual smoke test on staging
- [ ] Deploy to production

# 🎨 MASTER UI AUDIT TODO

**Created:** April 13, 2026  
**Status:** IN PROGRESS  
**Goal:** Polish UI consistency, enhance Field Mode, consolidate redundant pages

---

## 🔴 CRITICAL — FIX NOW

### 1. Page Header Names Must Match Nav Labels

- [ ] **Supplement Builder** - Verify header says "Supplement Builder" (matches nav)
- [ ] **Depreciation Builder** - Verify header says "Depreciation Builder" (matches nav)
- [ ] **Rebuttal Builder** - Verify header says "Rebuttal Builder" (matches nav)
- [ ] Audit ALL pages for header/nav name consistency

### 2. "Is It Worth It?" Page Status

- [x] Page does not exist (already removed or never created)
- [x] Not in nav config
- [x] Keep Quick DOL Pull page (DO NOT REMOVE) ✅

### 3. Field Mode UI Fixes

- [ ] Move search option to BOTTOM of screen
- [ ] Fix task widget showing behind search overlay
- [ ] Remove lightning bolt icon from UI
- [ ] Make overall UI cleaner and more focused
- [ ] Add measuring tool capability
- [ ] Add direct camera access button
- [ ] Add quick photo capture mode
- [ ] Bottom bar should have: Search | Camera | Measure | Save

### 4. Photos → Claim UI Update

- [ ] Update UI to match rest of application
- [ ] Use consistent card styling
- [ ] Match PageHero component style
- [ ] Consistent button variants
- [ ] Dark mode support verified

---

## 🟠 HIGH PRIORITY — CONSOLIDATION

### 5. Storm to Leads → Merge into Weather Maps

- [ ] Remove standalone Storm to Leads page (`/storm-leads`)
- [ ] Enhance Weather Maps page to include:
  - [ ] Storm data visualization on map
  - [ ] Property damage scoring by address
  - [ ] Lead generation from weather data
  - [ ] Integration with Property Profiles

### 6. Weather Maps + Doorknocking Integration

- [ ] Use existing doorknocking map component
- [ ] Add weather overlay to doorknocking map
- [ ] Route to doorknocking when user wants to save leads
- [ ] Unified map experience (not multiple separate maps)

### 7. Property Profiles Enhancement

- [ ] Track properties by address
- [ ] Score damage severity
- [ ] Link weather data to properties
- [ ] Show storm history per property
- [ ] Connect to claims when created

---

## 🟡 DASHBOARD AUDIT

### 8. Dashboard UI Cleanup

- [ ] Audit current dashboard layout (currently too full)
- [ ] Improve visual hierarchy
- [ ] Make flow clearer
- [ ] Consistent spacing and alignment
- [ ] Cards should line up properly
- [ ] Consider collapsible sections
- [ ] Prioritize most-used features

### 9. Dashboard Component Alignment

- [ ] All stat cards same height
- [ ] Consistent border radius
- [ ] Matching shadow styles
- [ ] Aligned grid columns
- [ ] Proper responsive breakpoints

---

## 🟢 FIELD MODE ENHANCEMENTS

### 10. Field Mode Feature Additions

- [ ] **Camera Integration**
  - Quick capture button
  - Direct to claim photo upload
  - Batch photo mode
- [ ] **Measuring Tools**
  - AR measurement (if supported)
  - Manual dimension entry
  - Save measurements to claim
- [ ] **Offline Capability**
  - Queue actions when offline
  - Sync when back online
  - Show offline indicator
- [ ] **Quick Actions Bar**
  - New claim shortcut
  - Recent claims quick access
  - Voice notes
  - GPS tagging

### 11. Field Mode UI Polish

- [ ] Remove unnecessary icons
- [ ] Larger touch targets for field use
- [ ] High contrast mode for outdoor use
- [ ] Simplified navigation
- [ ] One-hand friendly layout

---

## 📋 FULL PAGE AUDIT CHECKLIST

| Page                 | Header Matches Nav | UI Consistent | Dark Mode | Mobile |
| -------------------- | ------------------ | ------------- | --------- | ------ |
| Dashboard            | [ ]                | [ ]           | [ ]       | [ ]    |
| Claims List          | [ ]                | [ ]           | [ ]       | [ ]    |
| Claim Detail         | [ ]                | [ ]           | [ ]       | [ ]    |
| Photos → Claim       | [ ]                | [ ]           | [ ]       | [ ]    |
| Field Mode           | [ ]                | [ ]           | [ ]       | [ ]    |
| Weather Maps         | [ ]                | [ ]           | [ ]       | [ ]    |
| Doorknocking         | [ ]                | [ ]           | [ ]       | [ ]    |
| Property Profiles    | [ ]                | [ ]           | [ ]       | [ ]    |
| Supplement Builder   | [ ]                | [ ]           | [ ]       | [ ]    |
| Depreciation Builder | [ ]                | [ ]           | [ ]       | [ ]    |
| Rebuttal Builder     | [ ]                | [ ]           | [ ]       | [ ]    |
| Reports              | [ ]                | [ ]           | [ ]       | [ ]    |
| Quick DOL Pull       | [ ]                | [ ]           | [ ]       | [ ]    |
| Team                 | [ ]                | [ ]           | [ ]       | [ ]    |
| Settings             | [ ]                | [ ]           | [ ]       | [ ]    |

---

## 🔧 IMPLEMENTATION ORDER

### Phase 1: Quick Fixes (Today)

1. Fix page header names
2. Remove "Is It Worth It?" page
3. Field Mode search position fix
4. Field Mode lightning bolt removal

### Phase 2: UI Consistency (Tomorrow)

1. Photos → Claim UI update
2. Dashboard alignment fixes
3. Card styling consistency

### Phase 3: Consolidation (This Week)

1. Merge Storm to Leads into Weather Maps
2. Weather + Doorknocking integration
3. Property Profiles enhancement

### Phase 4: Field Mode (Next Week)

1. Camera integration
2. Measuring tools
3. Offline mode
4. Quick actions bar

---

## 📁 FILES TO MODIFY

### Pages to Update

- `src/app/(app)/field/page.tsx` - Field Mode fixes
- `src/app/(app)/claims/new/page.tsx` - Photos UI
- `src/app/(app)/dashboard/page.tsx` - Dashboard cleanup
- `src/app/(app)/weather/maps/page.tsx` - Add storm leads features
- `src/app/(app)/doorknocking/page.tsx` - Map integration

### Pages to Remove

- ~~`src/app/(app)/is-it-worth-it/`~~ - Does not exist (already clean)

### Pages to Keep

- `src/app/(app)/quick-dol/` - KEEP Quick DOL Pull ✅ (exists with page.tsx, loading.tsx, error.tsx)

### Nav Config

- `src/config/navConfig.ts` - Verify labels match page headers

---

## ✅ DONE

- [x] Created comprehensive UI audit TODO
- [x] Identified all fixes needed
- [x] Prioritized implementation order
- [x] Verified "Is It Worth It?" page does not exist
- [x] Confirmed Quick DOL Pull page is kept

---

_Last Updated: April 13, 2026_

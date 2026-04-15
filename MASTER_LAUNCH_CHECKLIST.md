# SkaiScraper — Master Launch Checklist (DAU Readiness)

> Generated 2026-01-12 after section color unification (commit `3ead9f4d`)
> Status: **0 TypeScript errors**, **0 console.log in API routes**, section themes unified across 59 files

---

## ✅ COMPLETED

| #   | Item                                                                                                | Commit     |
| --- | --------------------------------------------------------------------------------------------------- | ---------- |
| C1  | Property profiles: 40+ fields, AI autofill, accept/reject UI                                        | `faaa403b` |
| C2  | Section color system: rewrite sectionThemes.ts (10 themes, ROUTE_THEME_MAP, SIDEBAR_SECTION_STYLES) | `3ead9f4d` |
| C3  | AppSidebar config-driven refactor (removed 40-line ternary chains)                                  | `3ead9f4d` |
| C4  | Fixed 40+ page section= props to match their sidebar section                                        | `3ead9f4d` |
| C5  | TypeScript strict mode: 0 errors                                                                    | `3ead9f4d` |
| C6  | Zero console.log in API routes (clean production output)                                            | —          |

---

## 🔴 BLOCKER — Must fix before DAU

### B1. RBAC: Unprotected Mutation Endpoints

**Severity: BLOCKER** · **Effort: 4–6 hours** · **Risk: Data breach, unauthorized writes**

**47+ API routes** with POST/PUT/PATCH/DELETE handlers have **no auth check** (`withOrgScope`, `requireAuth`, `auth()`). Any unauthenticated request can mutate data.

**Critical unprotected routes (prioritized):**
| Route | Risk |
|-------|------|
| `api/v1/property-profiles/[id]/route.ts` | Anyone can edit property data |
| `api/v1/property-profiles/[id]/autofill/route.ts` | Unmetered AI spend |
| `api/clients/create/route.ts` | Create clients without auth |
| `api/clients/connect/route.ts` | Link clients to orgs |
| `api/messages/send/route.ts` | Send messages as anyone |
| `api/messages/create/route.ts` | Create message threads |
| `api/work-orders/route.ts` | Create/edit work orders |
| `api/crews/route.ts` | Manage crews |
| `api/branding/save/route.ts` | Overwrite org branding |
| `api/branding/upload/route.ts` | Upload files without auth |
| `api/pipeline/move/route.ts` | Move pipeline items |
| `api/vendors/orders/route.ts` | Create vendor orders |
| `api/artifacts/route.ts` | Create/delete artifacts |
| `api/migrations/*/route.ts` (5 routes) | Trigger data migrations |
| `api/intel/*/route.ts` (6 routes) | AI-powered analysis (cost) |

**Fix pattern:**

```typescript
// Add to top of each handler:
const { userId, orgId } = await auth();
if (!userId || !orgId) return apiError(401, "UNAUTHORIZED", "Authentication required");
```

### B2. AI Autofill Safety Rails

**Severity: BLOCKER** · **Effort: 1 hour** · **Risk: Runaway AI costs, abuse**

`api/v1/property-profiles/[id]/autofill/route.ts` is missing:

- [ ] **Auth check** — currently callable without authentication
- [ ] **Rate limiting** — no `rateLimit("ai")` (5/min preset)
- [ ] **Token cost tracking** — no `tokensLedger` debit
- [ ] **RBAC** — should require at least `member` role
- [ ] **Input validation** — no Zod schema on request body

### B3. Production Build Verification

**Severity: BLOCKER** · **Effort: 30 min** · **Risk: Deploy failure**

- [ ] Verify Vercel build succeeds with latest changes (can't `next build` locally — 16GB OOM)
- [ ] Confirm `scripts/typecheck-guard.sh` passes in CI
- [ ] Check Vercel deployment logs for any edge function size issues

---

## 🟠 HIGH — Should fix before DAU

### H1. Property Profiles Cross-Linking

**Severity: HIGH** · **Effort: 2–3 hours** · **Risk: Feature feels disconnected**

Property profiles exist but are **not linked from any other page**:

- [ ] Claims detail page (`/claims/[id]`) — add "View Property Profile" link
- [ ] Leads detail page (`/leads/[id]`) — add "Property Profile" tab or link
- [ ] Jobs detail pages (`/jobs/retail/[id]`, `/jobs/[id]`) — link to property profile
- [ ] Dashboard — consider "Recent Property Profiles" card

### H2. PageHero Coverage Gap

**Severity: HIGH** · **Effort: 3–4 hours** · **Risk: Inconsistent UI**

**177 of 367 pages** (48%) are missing `<PageHero>` entirely. Key pages without headers:

- `clients/[clientId]/page.tsx` — detail page, no header
- `vendors/[slug]/page.tsx` — vendor detail, no header
- `vendors/new/page.tsx` — create form, no header
- `invoices/[id]/page.tsx` — invoice detail, no header
- `forms/builder/page.tsx` — form builder, no header
- `route-optimization/page.tsx` — route tool, no header
- `box-summary/page.tsx` — summary page, no header
- ~30 settings subpages — acceptable (settings has its own layout)
- ~20 `[id]` detail pages — should at minimum have entity-name header

**Note:** Pages without `PageHero` will still auto-detect the correct section via `getSectionTheme(pathname)` if `PageHero` is added. No need to specify `section=` prop.

### H3. Branding/Settings API Unification

**Severity: HIGH** · **Effort: 2–3 hours** · **Risk: Duplicate data, stale cache**

Branding is served from **two parallel API surfaces**:

- `api/settings/branding/route.ts` — settings panel endpoint
- `api/branding/get/route.ts` — standalone fetch
- `api/branding/save/route.ts` — standalone save (⚠️ unprotected)
- `api/branding/upload/route.ts` — file upload (⚠️ unprotected)
- `api/branding/pdf/route.ts` — PDF generation
- `api/branding/cover-page/route.ts` — cover page
- `api/branding/status/route.ts` — status check

**Fix:** Consolidate to single `api/settings/branding/*` namespace. Deprecate standalone `/api/branding/*` or redirect.

### H4. Empty State Polish for Key Pages

**Severity: HIGH** · **Effort: 2 hours** · **Risk: Bad first-run UX**

| Page              | Empty State?                                            | Status          |
| ----------------- | ------------------------------------------------------- | --------------- |
| Claims            | ✅ `<NoClaimsEmpty />` preset                           | Good            |
| Leads             | ✅ "No leads yet" message                               | Good            |
| Dashboard         | ❌ No empty state                                       | **Needs fix**   |
| Jobs              | ⚠️ `jobs/page.tsx` not found (may be under retail/jobs) | Check           |
| Clients           | ❌ Unknown                                              | **Needs check** |
| Property Profiles | ❌ Unknown                                              | **Needs check** |

---

## 🟡 MEDIUM — Improve before/during DAU

### M1. Search/Filter/Sort Consistency

**Severity: MEDIUM** · **Effort: 3–4 hours**

| Page              | Search  | Filter            | Sort    |
| ----------------- | ------- | ----------------- | ------- |
| Claims            | ✅      | ✅ (status, date) | Partial |
| Leads             | ✅      | ✅ (search param) | Unknown |
| Clients           | ✅      | Partial           | Unknown |
| Property Profiles | Unknown | Unknown           | Unknown |
| Work Orders       | Unknown | Unknown           | Unknown |

**Goal:** All major list pages should have: search bar, status filter dropdown, column sort headers.

### M2. Test Coverage

**Severity: MEDIUM** · **Effort: 4–6 hours**

Only **3 test files** exist in the entire codebase:

- `src/lib/compliance/__tests__/code-checker.test.ts`
- `src/lib/ai/__tests__/validateAndRetry.test.ts`
- `src/lib/registry/__smoke.test.ts`

**Zero tests** for:

- Property profiles API (PATCH, POST health score)
- AI autofill endpoint
- Any page component
- RBAC utilities
- Rate limiting

**Priority test files to create:**

1. `src/app/api/v1/property-profiles/[id]/__tests__/route.test.ts`
2. `src/lib/rbac/__tests__/rbac.test.ts`
3. `src/config/__tests__/sectionThemes.test.ts`
4. `src/lib/rateLimit/__tests__/rateLimit.test.ts`

### M3. Localhost Reference Cleanup

**Severity: MEDIUM** · **Effort: 1 hour**

42 `localhost` references in source (non-test). Most are correctly gated behind `NODE_ENV === "development"` or are fallback defaults. Verify:

- `src/lib/storage.ts:143` — R2 fallback
- `src/lib/api.ts:8` — API fallback
- `src/lib/paths.ts:143` — URL parsing (safe, just for path extraction)

### M4. Remaining `section="trades"` Type Alias

**Severity: MEDIUM** · **Effort: 30 min**

The `trades` theme is now a backward-compat alias for `jobs` (amber). Consider removing it entirely from the type union in a future cleanup since all pages now use `build` for the Build & Design section.

---

## 📊 Summary

| Priority   | Count        | Est. Effort      |
| ---------- | ------------ | ---------------- |
| 🔴 BLOCKER | 3 items      | ~6–8 hours       |
| 🟠 HIGH    | 4 items      | ~9–12 hours      |
| 🟡 MEDIUM  | 4 items      | ~9–12 hours      |
| **Total**  | **11 items** | **~24–32 hours** |

### Recommended Execution Order

1. **B1** RBAC unprotected routes (critical security) → focus on property-profiles, clients, messages, branding first
2. **B2** AI autofill safety rails (1 file, quick win)
3. **B3** Verify production build on Vercel
4. **H1** Property profiles cross-linking (feature completeness)
5. **H4** Empty state polish (first-run UX)
6. **H2** PageHero coverage for detail pages
7. **H3** Branding API consolidation
8. **M1** Search/filter consistency
9. **M2** Test coverage for new features
10. **M3** Localhost cleanup
11. **M4** Remove trades type alias

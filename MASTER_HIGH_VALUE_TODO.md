# 🎯 MASTER HIGH-VALUE TODO

> **Philosophy:** Ship quality, not quantity. Fix what blocks demos, breaks trust, or loses money.

---

## 🔴 TIER 1: IMMEDIATE (Today)

### 1.1 ✅ Verify Weather PDF Fix

**Status:** NEEDS VERIFICATION  
**Impact:** Demo-critical, revenue-affecting

```bash
# Test checklist:
□ Generate fresh weather report for any claim
□ Confirm PDF uploads successfully (check Supabase storage)
□ Confirm GeneratedArtifact record created in DB
□ Confirm pdfUrl opens correctly
□ Confirm PDF appears in Documents tab (weather category)
□ Confirm PDF appears in Reports History
□ Confirm older reports still accessible
```

**Files involved:**

- `src/lib/reports/saveAiPdfToStorage.ts` — Fixed to use admin client
- `src/lib/pdf/weather-pdf.ts` — jsPDF renderer
- `src/app/api/weather/report/route.ts` — Calls both

---

### 1.2 Add lint:ship to Pre-Push

**Status:** TODO  
**Impact:** Quality gate without blocking commits

Current state:

- pre-commit: `pnpm typecheck` ✅
- pre-push: `pnpm typecheck` (duplicate, weak)

Target state:

- pre-commit: `pnpm typecheck`
- pre-push: `pnpm typecheck && pnpm lint:ship`

**File:** `.husky/pre-push`

---

### 1.3 Service-Role Storage Audit

**Status:** TODO  
**Impact:** Security, data integrity

Audit all uses of `getSupabaseAdmin()` for:

- [ ] Bucket/path permissions constrained
- [ ] File path construction is tenant-safe (includes orgId)
- [ ] No user input can escalate path access
- [ ] Metadata includes org/claim linkage

**Files to audit:**

```
src/lib/reports/saveAiPdfToStorage.ts
src/app/api/claims/files/upload/route.ts
src/app/api/upload/branding/route.ts
src/app/api/upload/avatar/route.ts
src/app/api/upload/cover/route.ts
src/app/api/upload/portfolio/route.ts
src/app/api/branding/upload/route.ts
```

---

## 🟠 TIER 2: THIS WEEK

### 2.1 Clean `src/lib/weather` Types

**Status:** TODO  
**Impact:** Demo reliability, fewer runtime surprises

Current debt: ~400 type warnings in weather modules

**Strategy:**

1. Create `src/types/weather.ts` with proper interfaces
2. Type the main exports: `getStormEvidence`, `buildWeatherPacket`, `dolRecommendation`
3. Replace `any` with proper types in API boundaries

**Key files:**

- `src/lib/weather/getStormEvidence.ts` — 80+ unsafe member accesses
- `src/lib/weather/buildWeatherPacket.ts` — 70+ type issues
- `src/lib/weather/dolRecommendation.ts` — 20+ issues

---

### 2.2 Centralize `process.env` Access

**Status:** TODO  
**Impact:** Runtime safety, easier debugging

Current: 770+ direct `process.env` accesses scattered everywhere

**Strategy:**

1. Create `src/lib/config.ts` with Zod validation
2. Export typed config object
3. Gradually migrate (start with weather, then AI, then billing)

**Template:**

```typescript
// src/lib/config.ts
import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Optional with defaults
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Feature flags
  ENABLE_AI_FEATURES: z.coerce.boolean().default(true),
});

export const config = envSchema.parse(process.env);
```

---

### 2.3 Fix Empty Catch Blocks

**Status:** TODO  
**Impact:** Silent failures → visible errors

Found 10+ empty `catch {}` blocks that swallow errors silently.

**Files:**

- `src/app/portal/profile/page.tsx` — lines 680, 698
- `src/app/(app)/commissions/CommissionPlansPanel.tsx` — lines 151, 162, 170

**Fix pattern:**

```typescript
// BAD
} catch {}

// GOOD
} catch (error) {
  logger.warn("[Context] Non-critical error:", error);
}
```

---

## 🟡 TIER 3: THIS SPRINT

### 3.1 Add CI Lint Gate

**Status:** TODO  
**Impact:** Prevent debt from growing

Add to GitHub Actions:

```yaml
- name: Lint Critical Paths
  run: pnpm lint:ship
```

---

### 3.2 Type AI Response Boundaries

**Status:** TODO  
**Impact:** Fewer "undefined is not a function" errors

Current: AI endpoints return untyped JSON, callers assume structure

**Strategy:**

1. Create `src/types/ai-responses.ts`
2. Add Zod schemas for each AI endpoint response
3. Validate at response boundary

**Priority endpoints:**

- `/api/ai/damage/analyze`
- `/api/ai/weather/run`
- `/api/weather/report`
- `/api/ai/rebuttal`

---

### 3.3 Standardize Error Responses

**Status:** TODO  
**Impact:** Better debugging, consistent UX

Current: Mix of `{ error: string }`, `{ message: string }`, raw strings

**Target:** All API routes use `apiError()` helper:

```typescript
import { apiError } from "@/lib/apiError";

// Instead of: return NextResponse.json({ error: "..." }, { status: 400 })
return apiError(400, "VALIDATION_FAILED", "Invalid claim ID");
```

---

## 🟢 TIER 4: BACKLOG (High Value, Lower Urgency)

### 4.1 Weather Module Barrel Export Cleanup

The `src/lib/weather/index.ts` has messy export ordering.
Run `pnpm lint:fix` specifically on weather after type cleanup.

### 4.2 Add Integration Tests for Weather Flow

```
□ Test: Generate weather report → PDF saved → artifact linked → appears in UI
□ Test: Weather report with missing GPS → fallback geocoding works
□ Test: Weather report with no storm data → graceful "no events" response
```

### 4.3 Dashboard Performance Audit

Multiple dashboard components fetch data serially.
Identify candidates for parallel fetch or React Suspense.

### 4.4 Dead Code Removal

Run `pnpm knip` to identify unused exports and dependencies.

---

## 📊 METRICS TO TRACK

| Metric                  | Current | Target |
| ----------------------- | ------- | ------ |
| Lint errors (ship tier) | ~300    | 0      |
| Lint errors (weather)   | ~400    | <50    |
| Lint errors (full)      | 23K+    | <10K   |
| Empty catch blocks      | 10+     | 0      |
| Direct process.env      | 770+    | <100   |
| Type coverage           | ~70%    | >85%   |

---

## 🚀 QUICK WINS (15 min each)

1. **Add lint:ship to pre-push** — 5 min
2. **Fix empty catches in commissions panel** — 10 min
3. **Add logger to portal profile catches** — 10 min
4. **Create config.ts skeleton** — 15 min

---

## 📅 SUGGESTED DAILY FLOW

**Morning:**

1. Pick ONE Tier 1 item if any remain
2. Otherwise, pick ONE Tier 2 item

**Before lunch:**

- Commit + push + verify typecheck passes

**Afternoon:**

- One quick win OR continue Tier 2 item

**End of day:**

- Update this doc with progress
- Note any blockers

---

## ✅ COMPLETED

- [x] Replace Puppeteer PDF with jsPDF (serverless-compatible)
- [x] Fix saveAiPdfToStorage to use admin client
- [x] Create lint tiers (ship/weather/integrations/full)
- [x] Switch pre-commit to typecheck only
- [x] Auto-fix 991 files (import sorting, unused vars)

---

_Last updated: March 17, 2026_

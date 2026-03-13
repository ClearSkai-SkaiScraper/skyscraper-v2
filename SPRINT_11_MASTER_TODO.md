# 🎯 SPRINT 11 — MASTER TODO

**Generated:** March 13, 2026  
**Status:** Active  
**Theme:** AI Photo Analysis Accuracy + Demo Stabilization  
**Demo Date:** March 14, 2026 — BIGGEST MEETING EVER

---

## 📋 SPRINT 11 COMPLETED ITEMS

### ✅ Branding Save Fix

- [x] **Branding "Internal Server Error"** — Fixed data normalization (empty strings → null)
- [x] **Added detailed error logging** — Prisma error codes (P2002, P2025) now return specific messages
- [x] **Added confirmation logging** — `savedBranding.id` logged on successful upsert
- **File:** `src/app/api/branding/save/route.ts`

### ✅ HEIC Photo Conversion

- [x] **HEIC photos now ALWAYS convert to JPEG** — Regardless of file size (browsers can't display HEIC)
- [x] **Uses heic2any library** — Reliable client-side conversion with Canvas fallback
- **File:** `src/lib/imageCompression.ts`

### ✅ AI Bounding Box Filtering (Quick Fix)

- [x] **Grid hallucination detection** — Detects when AI returns rows/columns of identical boxes
- [x] **Low confidence filtering** — Removes detections with < 30% confidence
- [x] **Large box filtering** — Removes boxes > 60% of image (whole-image captures)
- [x] **Deduplication** — Increased tolerance to 8% to catch near-duplicate boxes
- **File:** `src/app/api/ai/photo-annotate/route.ts`

### ✅ Playwright Smoke Tests

- [x] **Created 5 demo smoke tests** — Branding, Pipeline, Photos, Reports, Map
- [x] **Full page sweep test** — Tests all critical routes don't 500
- **File:** `tests/e2e/demo-smoke.spec.ts`
- **Run:** `pnpm exec playwright test tests/e2e/demo-smoke.spec.ts --project=smoke`

### ✅ Demo Seed Script Enhanced

- [x] **Branding auto-setup** — Seeds demo branding if not exists
- [x] **--auto flag** — Use env vars for quick seeding
- [x] **Better output** — Summary of seeded data
- **File:** `scripts/seed-demo-cli.ts`
- **Run:** `node scripts/seed-demo-cli.ts --orgId <id> --userId <id>`

---

## 🔴 P0 — CRITICAL: AI BOUNDING BOX ACCURACY

### The Problem

GPT-4V (and GPT-4o) are **language models**, not object detection models. When we ask them to output bounding box coordinates, they give **approximate semantic estimates**, not pixel-accurate locations. The current implementation filters hallucinations but boxes are still often wrong.

### Solution Options (Ranked by ROI)

#### Option A: Use Specialized Damage Detection Model (RECOMMENDED)

**Effort:** 2-3 days | **Accuracy:** 95%+ | **Cost:** $0.01/image

- [ ] **Integrate Roboflow** — Train custom YOLOv8 model on roof damage dataset
  - Roboflow has pre-trained roof damage models available
  - Can fine-tune on our specific damage types (hail, wind, water)
  - Returns precise bounding boxes with confidence scores
  - API: `https://detect.roboflow.com/your-model/1?api_key=xxx`

- [ ] **Two-stage pipeline:**
  1. **Stage 1:** Roboflow/YOLO → Returns accurate bounding boxes
  2. **Stage 2:** GPT-4o → Classifies each box (damage type, severity, IRC codes)

**Files to modify:**

- `src/app/api/ai/photo-annotate/route.ts` — Add Roboflow integration
- `src/lib/ai/roboflow.ts` — New service wrapper (create)
- `.env` — Add `ROBOFLOW_API_KEY`

#### Option B: Use Google Gemini Pro Vision

**Effort:** 1 day | **Accuracy:** 70-80% | **Cost:** ~$0.001/image

- [ ] **Switch to Gemini 1.5 Pro** — Better spatial reasoning than GPT-4V
  - Native bounding box output in structured JSON
  - Grounding features for object localization
  - Cheaper than GPT-4o

**Files to modify:**

- `src/lib/ai/gemini.ts` — New service (create)
- `src/app/api/ai/photo-annotate/route.ts` — Add Gemini option

#### Option C: Disable Boxes, Text-Only Analysis (QUICK WIN FOR DEMO)

**Effort:** 2 hours | **Accuracy:** N/A | **Cost:** Same

- [ ] **Hide bounding boxes from UI** — Show damage descriptions only
- [ ] **Add "AI Beta" badge** — Set expectations that boxes are estimates
- [ ] **Toggle for boxes** — Let users enable/disable box overlay

**Files to modify:**

- `src/app/(app)/claims/[claimId]/photos/page.tsx` — Hide damageBoxes rendering
- `src/components/photos/PhotoDetailModal.tsx` — Add toggle

#### Option D: Anthropic Claude Vision (Alternative)

**Effort:** 1 day | **Accuracy:** 75-85% | **Cost:** ~$0.003/image

- [ ] **Use Claude 3.5 Sonnet with vision** — Strong spatial reasoning
- [ ] **Structured outputs** — Claude can output JSON with coordinates

---

## 🟠 P1 — HIGH PRIORITY (Post-Demo)

### AI Infrastructure Improvements

- [ ] **Create AI model abstraction layer** — `src/lib/ai/models/` folder with:
  - `openai.ts` — GPT-4o, GPT-4o-mini
  - `gemini.ts` — Gemini Pro Vision
  - `roboflow.ts` — Custom YOLO models
  - `anthropic.ts` — Claude Vision
  - `index.ts` — Unified interface

- [ ] **Add model selection in UI** — Let users choose accuracy vs. speed vs. cost
- [ ] **Implement A/B testing** — Track which model produces best user satisfaction
- [ ] **Cost tracking** — Log AI costs per org for billing insights

### Branding System Polish

- [ ] **PDF export uses real branding** — Wire `useReportBranding()` to actual DB
- [ ] **Add address fields to branding form** — Full business address support
- [ ] **Cover photo upload** — Add `coverPhotoUrl` column to schema

### Auth Standardization (Carried from Sprint 10)

- [ ] Convert remaining 25 routes from `auth()` to `safeOrgContext`/`withOrgScope`
- See: `SPRINT_10_MASTER_TODO.md` for full list

---

## 🟡 P2 — MEDIUM PRIORITY

### Photo Analysis Enhancements

- [ ] **Batch analysis optimization** — Process multiple photos in parallel
- [ ] **Progress indicator** — Show per-photo progress during bulk analysis
- [ ] **Retry failed analyses** — Automatic retry with exponential backoff
- [ ] **Cache analysis results** — Don't re-analyze same image twice

### Testing & Quality

- [ ] **Add AI analysis integration tests** — Test bounding box validation logic
- [ ] **Visual regression tests** — Screenshot comparison for photo overlays
- [ ] **Load testing** — Ensure photo analysis scales to 100+ photos

### UX Improvements

- [ ] **Drag-to-adjust boxes** — Let users manually correct AI boxes
- [ ] **Confidence display** — Show confidence % on each box
- [ ] **Damage type legend** — Color-coded by severity

---

## 🟢 P3 — LOW PRIORITY (Nice to Have)

### AI Model Training

- [ ] **Collect training data** — Export user-corrected boxes for model improvement
- [ ] **Fine-tune custom model** — Use collected data to train SkaiScraper-specific detector
- [ ] **Feedback loop** — Users mark boxes as "correct" or "incorrect"

### Performance

- [ ] **Image pre-processing** — Resize large images server-side before AI analysis
- [ ] **Lazy loading** — Only load damage boxes when user clicks photo
- [ ] **CDN for converted images** — Cache HEIC→JPEG conversions

---

## 📊 DECISION MATRIX: Bounding Box Solutions

| Solution          | Accuracy | Effort   | Cost/Image | Demo Ready?  |
| ----------------- | -------- | -------- | ---------- | ------------ |
| **Roboflow/YOLO** | 95%+     | 2-3 days | $0.01      | ❌ Post-demo |
| **Gemini Vision** | 70-80%   | 1 day    | $0.001     | ⚠️ Maybe     |
| **Disable Boxes** | N/A      | 2 hours  | $0         | ✅ Yes       |
| **Claude Vision** | 75-85%   | 1 day    | $0.003     | ⚠️ Maybe     |

### RECOMMENDED PATH

1. **For Demo Tomorrow:** Option C — Disable boxes OR add "Beta" badge
2. **Next Week:** Option A — Integrate Roboflow for production accuracy
3. **Future:** Collect user feedback to train custom model

---

## 🚀 DEMO CHECKLIST (March 14)

### Before Demo

```bash
# 1. Run smoke tests
pnpm exec playwright test tests/e2e/demo-smoke.spec.ts --project=smoke

# 2. Seed demo data (if needed)
node scripts/seed-demo-cli.ts --orgId <YOUR_ORG_ID> --userId <YOUR_USER_ID>

# 3. Verify branding saves
# Go to /settings/branding → Save → Check no errors

# 4. Test photo upload with HEIC
# Upload a .heic file → Should convert to JPEG automatically

# 5. Check photo analysis
# Upload photo → Analyze → Boxes should not be in grid pattern
```

### Demo Flow

1. **Dashboard** — Show KPIs, recent claims
2. **Pipeline** — Drag claims between stages
3. **Map View** — Show geo-located claims
4. **Photo Upload** — Upload HEIC photos (conversion works!)
5. **AI Analysis** — Show damage detection (with caveats about boxes being AI estimates)
6. **Reports Hub** — Generate damage assessment report
7. **Branding** — Show company branding on reports

---

## 📁 FILES CHANGED THIS SPRINT

| File                                     | Change                                      |
| ---------------------------------------- | ------------------------------------------- |
| `src/app/api/branding/save/route.ts`     | Improved error handling, data normalization |
| `src/lib/imageCompression.ts`            | HEIC always converts to JPEG                |
| `src/app/api/ai/photo-annotate/route.ts` | Bounding box hallucination filtering        |
| `tests/e2e/demo-smoke.spec.ts`           | NEW: 5 smoke tests for demo                 |
| `scripts/seed-demo-cli.ts`               | Enhanced with branding, --auto flag         |

---

## 🎯 SUCCESS METRICS

- [ ] Branding saves without error 100% of the time
- [ ] HEIC photos display correctly in browser
- [ ] No grid-pattern bounding boxes in photo analysis
- [ ] All 5 smoke tests pass
- [ ] Demo completes without crashes

---

_Last Updated: March 13, 2026_
_Sprint Owner: @copilot_

# 🔥 INSPECTION REPORT ENGINE — MASTER SPRINT TODO

> **Goal:** Make SkaiScraper's AI damage report compete with (and surpass) manual CompanyCam/DryTop inspection packets.  
> **Status:** Foundation built (v2 rewrite done). This sprint finishes the system.  
> **Rule:** Push ALL changes at the end of this sprint, not incrementally.

---

## PHASE 1 — PAGE GEOMETRY & PRINT POLISH (P0)

### 1.1 Lock Page Margins & Spacing

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Formalize margin constants: `MARGIN_TOP`, `MARGIN_BOTTOM`, `MARGIN_LEFT`, `MARGIN_RIGHT` (currently single `MARGIN = 56`)
- [ ] Add `HEADER_H` and `FOOTER_H` reserved zones so content never bleeds into header/footer
- [ ] Define `SAFE_CONTENT_Y_MIN` (above footer) and `SAFE_CONTENT_Y_MAX` (below header) for all page types

### 1.2 Image Aspect Ratio Rules

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Add aspect ratio guard: if image is extremely tall (portrait phone shot), cap at `MAX_PHOTO_H` AND center-crop or letterbox instead of squishing
- [ ] If image is extremely wide (panorama), scale to `CONTENT_W` and cap height proportionally
- [ ] Add minimum photo display size (don't render thumbnails smaller than 200x150)

### 1.3 Max Findings Per Page

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Set `MAX_FINDINGS_PER_PAGE = 4` — if a photo has more than 4 findings, overflow to continuation page
- [ ] Track remaining Y space before each finding and page-break proactively (currently checks `y < 100` which is too late)
- [ ] Increase page-break threshold to `y < 160` to prevent cramped bottom-of-page findings

### 1.4 Widow/Orphan Protection

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Before rendering a caption, pre-measure its wrapped height — if it won't fit on current page, move the ENTIRE finding (number + severity + code + caption) to next page
- [ ] Never render a section header at the bottom of a page with no content below it — add "lookahead" check before `drawSectionHeader()`
- [ ] Never separate a photo from its findings table — if photo lands within 180px of page bottom, push to next page

### 1.5 Fixed Header/Footer Consistency

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Add page number + company name footer to EVERY page (currently `drawFooter` is called but verify cover page gets it too)
- [ ] Add thin accent bar at top of every page (currently done per-page but ensure consistency)
- [ ] Add report title and claim number to header area of evidence pages (e.g. "Damage Assessment Report — CLM-2024-0847")

### 1.6 Page-Break Rules (Photo ↔ Findings Grouping)

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Enforce: a photo image and its findings table MUST start on the same page
- [ ] If photo + at least 1 finding won't fit, start a new page for that photo
- [ ] Add `estimatePhotoSectionHeight(photo, clusters)` helper that pre-calculates total needed height before rendering

### 1.7 Print-Safe Layout Mode

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Add `printSafe: boolean` option to `RequestSchema` — when true, adds extra padding, avoids edge-bleed colors, uses darker grays instead of light opacity fills
- [ ] Ensure all text is minimum 8pt for print legibility
- [ ] Ensure all colored elements have sufficient contrast ratio for grayscale printing

### 1.8 2-Column Evidence Template (Optional)

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Add `layout: "single" | "double"` option to `RequestSchema`
- [ ] When `layout = "double"`, render 2 photos side-by-side per row (each 240px wide) with findings below each — good for supplemental/supporting evidence photos
- [ ] Keep `layout = "single"` as default for primary evidence photos

### 1.9 QA Render Test Script

**File:** `scripts/qa-render-test-reports.ts` (NEW)

- [ ] Script that generates 20+ test PDFs with varying photo counts (1, 3, 5, 10, 15, 20), damage types, severity mixes, and annotation densities
- [ ] For each PDF: open with pdf-lib, check every page for text/image that exceeds margins
- [ ] Output a pass/fail summary table
- [ ] Add as `pnpm test:report-qa` script in `package.json`

---

## PHASE 2 — AI ANNOTATION QUALITY (P1)

### 2.1 Claim-Worthiness Scoring v2

**File:** `src/lib/inspection/evidence-grouping.ts`

- [ ] Current scoring: severity 35%, confidence 20%, IRC 15%, memberCount 15%, damageType 15%
- [ ] Add **component-based weighting**: roof primary (1.0x), roof collateral (0.8x), siding (0.9x), interior (0.7x), HVAC (0.85x), gutter (0.6x)
- [ ] Add **photo-level context**: if photo is labeled "overview" or "wide angle", lower individual annotation worthiness since it's context, not zoomed evidence
- [ ] Add **functional vs cosmetic flag**: functional damage (affects water intrusion, structural integrity) gets 1.5x boost
- [ ] Export `claimWorthinessScore()` as standalone function for use in annotation editor UI

### 2.2 Annotation Shape Type Rules

**File:** `src/lib/inspection/annotation-rules.ts` (NEW)

- [ ] Define shape selection logic: `selectAnnotationShape(damageType, defectSize, component)` returns `"circle" | "rectangle" | "outline"`
- [ ] Rules:
  - Circle = point impacts (hail strikes, nail pops, punctures, granule loss spots)
  - Rectangle = linear defects (cracks, flashing gaps, lifted edges, seam failures)
  - Outline = field conditions (large area granule loss, widespread staining, ponding, moss coverage)
- [ ] Integrate into `PhotoAnnotator` component and `photo-annotate` API route
- [ ] Add `shapeType` field to annotation data model

### 2.3 Annotation Suppression Rules

**File:** `src/lib/inspection/annotation-rules.ts` (NEW — same file as 2.2)

- [ ] Define `shouldSuppressAnnotation(annotation, allAnnotations)` function
- [ ] Suppress if:
  - Confidence < 0.25 (too uncertain)
  - Duplicate of higher-confidence sibling (IoU > 0.5 with a better-scored annotation)
  - Non-damage label (e.g., "roof", "sky", "tree", "shadow", "person")
  - Score below claim-worthiness threshold after grouping
- [ ] Add `suppressionReason` field to filtered-out annotations for debugging
- [ ] Apply suppression BEFORE PDF rendering AND in the annotation editor UI

### 2.4 Annotation Type Rendering in PDF

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Update annotation rendering to draw circles for `shapeType = "circle"` instead of rectangles
- [ ] Draw dashed outlines for `shapeType = "outline"` (field condition markers)
- [ ] Keep solid rectangles for `shapeType = "rectangle"` (current default)
- [ ] Use `page.drawEllipse()` for circles, `page.drawRectangle({ dashArray })` for outlines

### 2.5 Evidence Photo Ordering by Claim Value

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

- [ ] Sort photos in the report by total claim-worthiness score (highest first), not upload order
- [ ] Add option `photoOrder: "claim-value" | "upload-order" | "severity"` to `RequestSchema`
- [ ] Default to `"claim-value"` so the strongest evidence leads the report

---

## PHASE 3 — CAPTION POLICY ENGINE (P1)

### 3.1 Caption Template System

**File:** `src/lib/inspection/caption-generator.ts` (ENHANCE)

- [ ] Restructure templates into 5 sections per caption:
  1. **Observation** — what was physically observed
  2. **Technical explanation** — why it matters structurally/functionally
  3. **Code/spec reference** — which IRC/IBC code or manufacturer spec applies
  4. **Claim implication** — why this supports the claim
  5. **Repairability concern** — why spot repair is inadequate (when applicable)
- [ ] Add templates for all 12+ damage categories with 3-5 variations each
- [ ] Add `captionStyle: "full" | "concise" | "code-only"` option

### 3.2 Component-Specific Caption Templates

**File:** `src/lib/inspection/caption-generator.ts` (ENHANCE)

- [ ] Add templates by **component** (not just damage type):
  - Ridge cap, hip cap, valley, flashing, drip edge, starter strip
  - Field shingles, tile, metal panel, membrane
  - Siding (vinyl, fiber cement, stucco, wood)
  - Gutter, downspout, fascia, soffit
  - Window, door, skylight
  - HVAC unit, refrigerant line, condenser pad
  - Chimney, vent pipe, plumbing boot
- [ ] Template selection: `generateCaption(cluster, { component, damageType, eventType })`

### 3.3 Claim Implication Templates

**File:** `src/lib/inspection/caption-templates/claim-implications.ts` (NEW)

- [ ] Library of claim-specific language patterns:
  - "This condition compromises the weather-tight integrity of the roofing system..."
  - "Spot repair of this damage is not feasible as the surrounding material has been compromised..."
  - "Per [CODE], this condition requires full replacement of the affected course/section..."
  - "The observed damage is consistent with [EVENT TYPE] impact and is not attributable to normal wear..."
  - "Manufacturer warranty is voided when [CONDITION] is present..."
- [ ] Tag each template with applicable `damageType[]` and `component[]` arrays
- [ ] Add `confidenceLevel: "strong" | "moderate" | "supporting"` to control assertion strength

### 3.4 Repairability Concern Templates

**File:** `src/lib/inspection/caption-templates/repairability.ts` (NEW)

- [ ] Templates explaining why spot repair is inadequate:
  - "Color match degradation prevents seamless repair..."
  - "Adjacent material is beyond serviceable life per manufacturer specs..."
  - "Removal of damaged units will compromise surrounding fastening pattern..."
  - "Industry standard (HAAG) classifies this as functional damage requiring system replacement..."
  - "Stepped repair creates differential weathering that accelerates future failure..."
- [ ] Only included when `claimWorthinessScore > 0.6` and `severity >= "moderate"`

### 3.5 GPT-Assisted Caption Enhancement

**File:** `src/lib/inspection/caption-generator.ts` (ENHANCE)

- [ ] Add `enhanceCaptionWithAI(templateCaption, photoContext, claimContext)` function
- [ ] Uses GPT-4o-mini to refine template-generated captions with claim-specific context
- [ ] System prompt: "You are a HAAG-certified roof inspector writing damage findings. Enhance this caption with specific observations while maintaining the professional structure..."
- [ ] Rate limit: only call for `severity >= "moderate"` findings to control API costs
- [ ] Fallback: if AI enhancement fails, use template caption as-is

---

## PHASE 4 — IRC/IBC CODE MATCHING ENGINE (P1)

### 4.1 Component-Aware Code Matching

**File:** `src/lib/constants/irc-codes.ts` (ENHANCE)

- [ ] Add `component` field to `IRC_CODE_MAP` entries: `{ category: string, component: string[], codeKey: string }`
- [ ] Match codes by `(damageType + component)` pair instead of just `damageType`
- [ ] Example: "cracked_tile" on "ridge" → `IRC R905.3.7` (ridge), but "cracked_tile" on "field" → `IRC R905.3.1` (tile installation)

### 4.2 Code Match by Claim Purpose

**File:** `src/lib/constants/irc-codes.ts` (ENHANCE)

- [ ] Add `claimPurpose` field to IRC_CODES: `"storm_causation" | "code_compliance" | "repairability" | "replacement_support"`
- [ ] Allow report builder to select multiple applicable codes per finding, one for each purpose
- [ ] Example finding might cite:
  - R905.2.7 (compliance — shingle installation requirements)
  - R905.2.8.1 (replacement support — wind resistance classification)
  - IBC 1504.1 (storm causation — wind uplift performance)

### 4.3 Code Confidence Threshold

**File:** `src/lib/inspection/evidence-grouping.ts` (ENHANCE)

- [ ] Add `codeConfidence: number` to `EvidenceCluster` interface
- [ ] Calculate based on: exact match (1.0), category match (0.7), fuzzy/default (0.3)
- [ ] If `codeConfidence < 0.5`, do NOT render the code in the PDF — show "Code reference pending professional review" instead
- [ ] Log low-confidence matches for future code database improvement

### 4.4 Interior vs Exterior Code Differentiation

**File:** `src/lib/constants/irc-codes.ts` (ENHANCE)

- [ ] Add `location: "interior" | "exterior" | "both"` to IRC_CODES
- [ ] Interior water damage should cite plumbing/moisture codes, not roof covering codes
- [ ] Add interior-specific codes:
  - IRC R702.7 — Interior moisture barrier
  - IRC P2801 — Plumbing fixtures
  - IRC R303 — Ventilation (mold/moisture)

### 4.5 Arizona-Specific Code Overlay

**File:** `src/lib/constants/irc-codes-az.ts` (NEW)

- [ ] Arizona amendments to IRC (AZ R905 series)
- [ ] Maricopa County specific requirements
- [ ] ROC (Registrar of Contractors) license references
- [ ] Heat/UV degradation codes specific to desert climate
- [ ] Allow org-level code overlay selection (future: per-state)

---

## PHASE 5 — INSPECTOR PROFILE SYSTEM (P0)

### 5.1 Extend Users Model with Inspector Fields

**File:** `prisma/schema.prisma` + migration

- [ ] Add fields to `users` model:
  - `title` (String?, e.g. "Senior Property Inspector")
  - `phone` (String?, direct line)
  - `bio` (String?, short professional bio)
  - `license_number` (String?, state contractor license)
  - `license_state` (String?, e.g. "AZ")
  - `certifications` (String[]?, e.g. ["HAAG Certified", "Xactimate Level 3"])
- [ ] Create migration: `db/migrations/YYYYMMDD_add_inspector_profile_fields.sql`
- [ ] Run `npx prisma generate` after schema update

### 5.2 Inspector Profile Settings Page

**File:** `src/app/(app)/settings/profile/page.tsx` (ENHANCE or NEW)

- [ ] Add "Inspector Profile" section to user settings
- [ ] Fields: title, phone, bio, license number, license state, certifications (tag input)
- [ ] Headshot upload (already exists as `headshot_url` on users model)
- [ ] Preview card showing how their info will appear on reports
- [ ] Save via `PATCH /api/users/me/profile`

### 5.3 Inspector API Endpoint

**File:** `src/app/api/users/me/profile/route.ts` (NEW or ENHANCE)

- [ ] `GET` — return current user's full inspector profile
- [ ] `PATCH` — update inspector profile fields (title, phone, bio, license, certifications)
- [ ] Validate with Zod schema
- [ ] Org-scoped (users can only edit their own profile)

### 5.4 Inspector Dropdown on Claims

**File:** `src/app/(app)/claims/[claimId]/overview/page.tsx` + components

- [ ] Add "Inspector" dropdown/selector to claim overview section
- [ ] Options: all active team members in the org (from `users` table where `orgId` matches)
- [ ] Default: current logged-in user (auto-assigned on claim creation)
- [ ] Store as `inspectorId` on claims model (new field) OR use existing `assignedTo` field
- [ ] When generating report, pull inspector profile from selected user, not just current user

### 5.5 Inspector Data in Report Builder

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts` (ENHANCE)

- [ ] Accept optional `inspectorId` in `RequestSchema` — if provided, use that user's profile instead of current user
- [ ] Pull inspector's: name, title, phone, email, headshot_url, license_number, certifications
- [ ] Render on cover page: full name, title, certifications list
- [ ] Render on certification page: name, title, license number, signature line
- [ ] Render in footer: inspector name alongside company name

### 5.6 Team Members API for Inspector Picker

**File:** `src/app/api/org/team-members/route.ts` (ENHANCE)

- [ ] Add query param `?role=inspector` or `?forReports=true` to filter to report-eligible team members
- [ ] Return: id, name, title, headshot_url, license_number, certifications
- [ ] Used by the inspector dropdown component

---

## PHASE 6 — PRE-RENDER REVIEW SCREEN (P0)

### 6.1 Report Preview Data Endpoint

**File:** `src/app/api/claims/[claimId]/damage-report/preview/route.ts` (NEW)

- [ ] `POST` — returns the SAME data the PDF builder would use, but as JSON instead of PDF
- [ ] Response shape:
  ```json
  {
    "claim": { ... },
    "branding": { ... },
    "inspector": { ... },
    "photos": [
      {
        "id": "...",
        "filename": "...",
        "publicUrl": "...",
        "severity": "severe",
        "clusters": [
          {
            "label": "Hail Impact — Shingle",
            "severity": "severe",
            "confidence": 0.92,
            "caption": "...",
            "ircCode": { "code": "IRC R905.2.7", "title": "..." },
            "bbox": { ... },
            "color": { "hex": "#DC2626", "label": "Hail Damage" },
            "memberCount": 3,
            "included": true
          }
        ]
      }
    ],
    "uniqueCodes": [...],
    "severityBreakdown": { "severe": 4, "moderate": 3, "minor": 1 }
  }
  ```
- [ ] This is the "source of truth" for the review UI — edits modify this JSON before final render

### 6.2 Report Review Page/Modal

**File:** `src/app/(app)/claims/[claimId]/report/review/page.tsx` (NEW) OR modal component

- [ ] Full-screen review interface that opens when user clicks "Generate Report"
- [ ] Layout: left panel = photo with annotations, right panel = findings editor
- [ ] Sticky header with "Generate Final Report" and "Cancel" buttons
- [ ] Photo navigation: prev/next arrows, thumbnail strip at bottom
- [ ] Real-time preview of how findings will appear in the PDF

### 6.3 Editable Findings in Review

**File:** `src/components/reports/FindingEditor.tsx` (NEW)

- [ ] Per-finding edit card with:
  - Caption text area (pre-filled from `generateCaption()`, fully editable)
  - Severity dropdown (Critical / Severe / Moderate / Minor)
  - IRC code selector (dropdown with search, pre-selected from auto-match)
  - "Include in report" toggle (default ON)
  - "Primary Evidence" / "Supporting" / "Exclude" radio buttons
  - Drag handle for reordering
- [ ] Changes are stored in component state until "Generate Final Report" is clicked
- [ ] Validation: at least 1 finding must be marked "Primary Evidence"

### 6.4 Editable Annotations in Review

**File:** `src/components/reports/AnnotationOverlayEditor.tsx` (NEW)

- [ ] Shows photo with current annotation boxes/circles overlaid
- [ ] Click an annotation to select it → highlights in findings panel
- [ ] Click + drag to move an annotation box
- [ ] Delete button (X) on hover to remove an annotation
- [ ] Add button to manually draw a new annotation box
- [ ] Annotation changes sync with findings panel in real-time

### 6.5 Report Options Panel

**File:** `src/components/reports/ReportOptionsPanel.tsx` (NEW)

- [ ] Report configuration before final render:
  - Layout: Single column / Double column
  - Photo order: Claim value / Upload order / Severity
  - Include cover page: yes/no
  - Include building codes section: yes/no
  - Include disclaimer: yes/no
  - Inspector selector dropdown
  - Print-safe mode toggle
  - Caption style: Full / Concise / Code-only
- [ ] Persisted per-org as default preferences

### 6.6 Final Report Generation from Review

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts` (ENHANCE)

- [ ] Accept `reviewedData` in request body — pre-edited clusters, captions, codes, inclusion flags, photo order
- [ ] If `reviewedData` is present, skip auto-grouping/captioning and use the human-reviewed data directly
- [ ] If `reviewedData` is absent, fall back to current auto-generation behavior
- [ ] This is what makes the review screen optional — you can still one-click generate without reviewing

---

## PHASE 7 — EDITABLE ANNOTATIONS IN PHOTO VIEW TAB (P0)

### 7.1 Inline Annotation Editing After Analysis

**File:** `src/components/photos/PhotoDetailModal.tsx` (ENHANCE)

- [ ] In the "View" tab (not just "Annotate" tab), show AI-generated annotations as an overlay
- [ ] Each annotation box is clickable → opens inline edit popover with:
  - Caption text input
  - Damage type dropdown
  - Severity selector
  - IRC code dropdown
  - Delete button
- [ ] "Save Changes" button persists edits back to `file_assets.metadata.annotations`
- [ ] Visual indicator showing which annotations have been human-edited vs AI-generated

### 7.2 Annotation Save API

**File:** `src/app/api/claims/[claimId]/photos/[photoId]/annotations/route.ts` (NEW)

- [ ] `PUT` — replace all annotations for a photo
- [ ] `PATCH` — update a single annotation by index or ID
- [ ] Validates annotation schema with Zod
- [ ] Updates `file_assets.metadata.annotations` in Prisma
- [ ] Adds `editedBy: userId` and `editedAt: timestamp` to each modified annotation
- [ ] Recalculates `ai_severity` based on updated annotations

### 7.3 Annotation Edit History

**File:** `src/app/api/claims/[claimId]/photos/[photoId]/annotations/route.ts` (ENHANCE)

- [ ] Track annotation edit history: `{ original: {...}, edited: {...}, editedBy, editedAt }`
- [ ] Store in `file_assets.metadata.annotationHistory[]`
- [ ] This becomes training data for improving AI annotations over time

### 7.4 Bulk Annotation Actions

**File:** `src/components/photos/PhotoDetailModal.tsx` (ENHANCE)

- [ ] "Accept All AI Annotations" button — marks all as human-reviewed
- [ ] "Clear All Annotations" button — removes all with confirmation
- [ ] "Re-analyze" button — re-runs AI annotation and replaces current annotations
- [ ] "Export Annotations" — downloads annotation data as JSON (for training/backup)

---

## PHASE 8 — TRAINING DATA & FEEDBACK LOOP (P2)

### 8.1 Caption Feedback Tracking

**File:** `src/lib/inspection/caption-feedback.ts` (NEW)

- [ ] Track when a user:
  - Accepts an AI caption as-is → `{ action: "accepted", captionId, templateId }`
  - Edits an AI caption → `{ action: "edited", captionId, original, edited, templateId }`
  - Deletes an AI caption → `{ action: "deleted", captionId, reason? }`
- [ ] Store in a `caption_feedback` table (new Prisma model)
- [ ] Aggregate: which templates get accepted most? which get edited most?

### 8.2 Annotation Quality Feedback

**File:** `src/lib/inspection/annotation-feedback.ts` (NEW)

- [ ] Track when a user:
  - Keeps an AI annotation → `{ action: "kept" }`
  - Moves an annotation → `{ action: "moved", delta }`
  - Resizes an annotation → `{ action: "resized", delta }`
  - Deletes an annotation → `{ action: "deleted", reason? }`
  - Adds a manual annotation where AI missed → `{ action: "added_manual" }`
- [ ] Store in `annotation_feedback` table
- [ ] Use for precision/recall metrics on AI detection models

### 8.3 Gold Standard Dataset Builder

**File:** `scripts/build-gold-standard-dataset.ts` (NEW)

- [ ] Script that exports human-reviewed annotation sets as training data
- [ ] Format: COCO JSON or YOLO format
- [ ] Filters: only include annotations that were human-accepted or human-edited
- [ ] Pairs: original photo URL + final annotation set + caption + code
- [ ] Output: `datasets/gold-standard-YYYY-MM-DD.json`

### 8.4 Caption Template Performance Dashboard

**File:** `src/app/(app)/settings/ai/caption-analytics/page.tsx` (NEW)

- [ ] Show which caption templates are used most
- [ ] Show acceptance rate per template
- [ ] Show most common edits (what do users change?)
- [ ] Suggest new templates based on common user edits

---

## CROSS-CUTTING CONCERNS

### 9.1 Coordinate System Normalization Standard

**File:** `src/lib/inspection/evidence-grouping.ts` (DOCUMENT)

- [ ] Document the 3 coordinate systems (percentage 0-100, pixel 0-800, normalized 0-1) in a JSDoc comment at the top of the file
- [ ] Add coordinate type detection to `PhotoAnnotator` component so it always saves in normalized 0-1 format
- [ ] Add migration script to normalize all existing `file_assets.metadata.annotations` to 0-1 format

### 9.2 Annotation Data Model Standardization

**File:** `src/types/annotations.ts` (NEW)

- [ ] Define canonical `Annotation` interface used everywhere:
  ```typescript
  interface Annotation {
    id: string;
    bbox: { x: number; y: number; w: number; h: number }; // normalized 0-1
    shapeType: "circle" | "rectangle" | "outline";
    label: string;
    damageType: string;
    severity: "critical" | "severe" | "moderate" | "minor" | "informational";
    confidence: number; // 0-1
    ircCodeKey: string | null;
    caption: string | null;
    source: "ai_roboflow" | "ai_gpt4" | "human" | "edited";
    editedBy?: string;
    editedAt?: string;
    suppressed?: boolean;
    suppressionReason?: string;
  }
  ```
- [ ] Update `PhotoAnnotator`, `DamageBoxOverlay`, `evidence-grouping`, and `photo-annotate` API to use this interface
- [ ] Add Zod schema for runtime validation

### 9.3 Report Generation Metrics

**File:** `src/lib/reports/report-metrics.ts` (NEW)

- [ ] Track per-report generation:
  - Time to generate (ms)
  - Photo count, finding count, page count
  - Photos that failed to load
  - HEIC photos detected
  - Annotations suppressed
  - Code confidence scores
- [ ] Store in report history metadata
- [ ] Surface in admin/settings dashboard

### 9.4 Error Recovery in Report Builder

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts` (ENHANCE)

- [ ] Wrap each photo's rendering in try/catch — if one photo fails, skip it and continue
- [ ] Add "partial generation" flag if any photos were skipped
- [ ] Show skipped photo count in response: `{ skippedPhotos: 2, reason: "HEIC format" }`
- [ ] Add retry mechanism at the API level: if generation fails, client can retry with `{ retryFailedPhotos: true }`

---

## PRIORITY MATRIX

| #   | Item                                   | Priority | Effort | Impact   |
| --- | -------------------------------------- | -------- | ------ | -------- |
| 5.1 | Inspector profile fields (schema)      | **P0**   | S      | High     |
| 5.2 | Inspector settings page                | **P0**   | M      | High     |
| 5.4 | Inspector dropdown on claims           | **P0**   | M      | High     |
| 5.5 | Inspector data in report               | **P0**   | S      | High     |
| 6.1 | Report preview data endpoint           | **P0**   | M      | Critical |
| 6.2 | Report review page/modal               | **P0**   | L      | Critical |
| 6.3 | Editable findings in review            | **P0**   | L      | Critical |
| 6.6 | Final render from reviewed data        | **P0**   | M      | Critical |
| 7.1 | Inline annotation editing in View tab  | **P0**   | M      | High     |
| 7.2 | Annotation save API                    | **P0**   | S      | High     |
| 1.4 | Widow/orphan protection                | **P0**   | M      | High     |
| 1.6 | Photo ↔ findings page-break rules      | **P0**   | M      | High     |
| 1.1 | Lock margins/spacing                   | **P0**   | S      | Medium   |
| 1.3 | Max findings per page                  | **P0**   | S      | Medium   |
| 1.5 | Header/footer consistency              | **P0**   | S      | Medium   |
| 2.1 | Claim-worthiness v2                    | **P1**   | M      | High     |
| 2.2 | Annotation shape rules                 | **P1**   | M      | High     |
| 2.3 | Annotation suppression                 | **P1**   | M      | High     |
| 3.1 | 5-section caption templates            | **P1**   | L      | High     |
| 3.2 | Component-specific captions            | **P1**   | L      | High     |
| 3.3 | Claim implication templates            | **P1**   | M      | High     |
| 4.1 | Component-aware code matching          | **P1**   | M      | High     |
| 4.3 | Code confidence threshold              | **P1**   | S      | Medium   |
| 4.4 | Interior/exterior code differentiation | **P1**   | M      | Medium   |
| 1.2 | Image aspect ratio rules               | **P1**   | S      | Medium   |
| 1.7 | Print-safe layout mode                 | **P1**   | S      | Medium   |
| 2.4 | Annotation type rendering in PDF       | **P1**   | M      | Medium   |
| 2.5 | Photo ordering by claim value          | **P1**   | S      | Medium   |
| 3.4 | Repairability concern templates        | **P1**   | M      | Medium   |
| 3.5 | GPT-assisted caption enhancement       | **P1**   | M      | Medium   |
| 4.2 | Code match by claim purpose            | **P1**   | M      | Medium   |
| 5.3 | Inspector API endpoint                 | **P1**   | S      | Medium   |
| 5.6 | Team members API for picker            | **P1**   | S      | Medium   |
| 6.4 | Annotation overlay editor in review    | **P1**   | L      | High     |
| 6.5 | Report options panel                   | **P1**   | M      | Medium   |
| 7.3 | Annotation edit history                | **P1**   | M      | Medium   |
| 7.4 | Bulk annotation actions                | **P1**   | S      | Medium   |
| 9.1 | Coordinate normalization standard      | **P1**   | M      | Medium   |
| 9.2 | Annotation data model standard         | **P1**   | M      | Medium   |
| 9.4 | Error recovery in report builder       | **P1**   | S      | Medium   |
| 1.8 | 2-column evidence template             | **P2**   | L      | Low      |
| 1.9 | QA render test script                  | **P2**   | L      | Medium   |
| 4.5 | Arizona-specific code overlay          | **P2**   | M      | Low      |
| 8.1 | Caption feedback tracking              | **P2**   | M      | Medium   |
| 8.2 | Annotation quality feedback            | **P2**   | M      | Medium   |
| 8.3 | Gold standard dataset builder          | **P2**   | L      | High     |
| 8.4 | Caption template analytics dashboard   | **P2**   | L      | Low      |
| 9.3 | Report generation metrics              | **P2**   | M      | Low      |

**Effort:** S = < 2 hours | M = 2-6 hours | L = 6+ hours

---

## SPRINT EXECUTION ORDER

### Sprint Day 1-2: Inspector System + Page Geometry

1. ✏️ 5.1 — Schema migration for inspector fields
2. ✏️ 5.2 — Inspector profile settings page
3. ✏️ 5.3 — Inspector API endpoint
4. ✏️ 5.4 — Inspector dropdown on claims
5. ✏️ 5.5 — Inspector data in report builder
6. ✏️ 1.1 — Lock margins
7. ✏️ 1.3 — Max findings per page
8. ✏️ 1.4 — Widow/orphan protection
9. ✏️ 1.5 — Header/footer consistency
10. ✏️ 1.6 — Photo ↔ findings grouping

### Sprint Day 3-4: Annotation Quality + Code Engine

11. ✏️ 9.2 — Annotation data model standard
12. ✏️ 2.1 — Claim-worthiness scoring v2
13. ✏️ 2.2 — Annotation shape rules
14. ✏️ 2.3 — Annotation suppression rules
15. ✏️ 2.4 — Shape rendering in PDF
16. ✏️ 4.1 — Component-aware code matching
17. ✏️ 4.3 — Code confidence threshold
18. ✏️ 4.4 — Interior/exterior differentiation

### Sprint Day 5-6: Caption Engine + Editable Annotations

19. ✏️ 3.1 — 5-section caption templates
20. ✏️ 3.2 — Component-specific captions
21. ✏️ 3.3 — Claim implication templates
22. ✏️ 3.4 — Repairability templates
23. ✏️ 7.1 — Inline annotation editing in View tab
24. ✏️ 7.2 — Annotation save API
25. ✏️ 7.4 — Bulk annotation actions

### Sprint Day 7-8: Review Screen

26. ✏️ 6.1 — Report preview data endpoint
27. ✏️ 6.2 — Report review page/modal
28. ✏️ 6.3 — Editable findings in review
29. ✏️ 6.5 — Report options panel
30. ✏️ 6.6 — Final render from reviewed data

### Sprint Day 9-10: Polish + Ship

31. ✏️ 6.4 — Annotation overlay editor in review
32. ✏️ 2.5 — Photo ordering by claim value
33. ✏️ 1.2 — Image aspect ratio rules
34. ✏️ 1.7 — Print-safe layout mode
35. ✏️ 9.4 — Error recovery in report builder
36. ✏️ 9.1 — Coordinate normalization
37. ✏️ 7.3 — Annotation edit history
38. 🧪 Generate test PDFs across 20 scenarios
39. 🧪 Compare side-by-side with CompanyCam gold standard
40. 📦 Commit + push all changes

---

## FILES CREATED/MODIFIED SUMMARY

### New Files (14)

| File                                                                 | Purpose                                     |
| -------------------------------------------------------------------- | ------------------------------------------- |
| `src/lib/inspection/annotation-rules.ts`                             | Shape selection + suppression rules         |
| `src/lib/inspection/caption-templates/claim-implications.ts`         | Claim language templates                    |
| `src/lib/inspection/caption-templates/repairability.ts`              | Repairability concern templates             |
| `src/lib/constants/irc-codes-az.ts`                                  | Arizona-specific code overlay               |
| `src/types/annotations.ts`                                           | Canonical annotation interface + Zod schema |
| `src/app/api/claims/[claimId]/damage-report/preview/route.ts`        | Preview data endpoint                       |
| `src/app/api/claims/[claimId]/photos/[photoId]/annotations/route.ts` | Annotation CRUD API                         |
| `src/components/reports/FindingEditor.tsx`                           | Per-finding edit card                       |
| `src/components/reports/AnnotationOverlayEditor.tsx`                 | Visual annotation editor                    |
| `src/components/reports/ReportOptionsPanel.tsx`                      | Report config panel                         |
| `src/lib/inspection/caption-feedback.ts`                             | Feedback tracking                           |
| `src/lib/inspection/annotation-feedback.ts`                          | Annotation quality feedback                 |
| `src/lib/reports/report-metrics.ts`                                  | Generation metrics                          |
| `scripts/qa-render-test-reports.ts`                                  | QA test script                              |

### Enhanced Files (12)

| File                                                  | Enhancement                                              |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `prisma/schema.prisma`                                | Inspector profile fields on users                        |
| `src/app/api/claims/[claimId]/damage-report/route.ts` | Page geometry, inspector data, reviewed data support     |
| `src/lib/inspection/evidence-grouping.ts`             | Claim-worthiness v2, code confidence, coordinate docs    |
| `src/lib/inspection/caption-generator.ts`             | 5-section templates, component templates, AI enhancement |
| `src/lib/constants/irc-codes.ts`                      | Component-aware matching, claim purpose, confidence      |
| `src/components/photos/PhotoDetailModal.tsx`          | Inline annotation editing in View tab                    |
| `src/components/photos/PhotoAnnotator.tsx`            | Shape type support, coordinate normalization             |
| `src/components/photos/DamageBoxOverlay.tsx`          | Shape type rendering                                     |
| `src/app/(app)/claims/[claimId]/overview/page.tsx`    | Inspector dropdown                                       |
| `src/app/(app)/settings/profile/page.tsx`             | Inspector profile section                                |
| `src/app/api/users/me/profile/route.ts`               | Inspector profile CRUD                                   |
| `src/app/api/org/team-members/route.ts`               | Inspector picker query                                   |

### New DB Migration (1)

| File                                                      | Purpose                                             |
| --------------------------------------------------------- | --------------------------------------------------- |
| `db/migrations/YYYYMMDD_add_inspector_profile_fields.sql` | title, phone, bio, license, certifications on users |

---

_Total items: **50** across 8 phases + cross-cutting concerns_  
_Estimated sprint: 8-10 focused days_  
_Ship date: End of sprint — single push with all changes_

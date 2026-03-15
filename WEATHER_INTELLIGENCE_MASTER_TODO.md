# 🌩️ WEATHER INTELLIGENCE MASTER TODO

> **Last Updated:** Session completed - All core wiring done, NOT pushed yet

## 🎯 Session Summary

| Area                               | Status  | Details                                           |
| ---------------------------------- | ------- | ------------------------------------------------- |
| Damage Report → storm_evidence     | ✅ DONE | DOL confidence, photo correlation, evidence grade |
| Supplement AI → storm_evidence     | ✅ DONE | Full context in AI prompts                        |
| Simulation Engine → storm_evidence | ✅ DONE | correlationScore, DOL confidence scoring          |
| Claims Folder → storm_evidence     | ✅ DONE | 4 new data fetchers, AI generators                |
| Contractor Packet Overhaul         | ✅ DONE | 3 new retail sections with UI                     |

## Vision Statement

Turn weather from "feature set" into an **intelligence layer** that powers every output in SkaiScraper:

- Damage reports know the storm context
- Supplements cite verified weather data
- Simulations weigh storm evidence
- Contractor packets pull relevant data
- Claims folders auto-populate weather sections

---

# ✅ COMPLETED: Weather Intelligence Connections

## 1. Damage Report Builder → Weather Intelligence ✅ DONE

**File:** `src/app/api/claims/[claimId]/damage-report/route.ts`

### Completed

- ✅ Imports `getStormEvidence` from `@/lib/weather`
- ✅ Uses `getStormEvidence(claimId)` instead of weather_reports
- ✅ Includes storm evidence score + evidence grade badge
- ✅ Includes photo correlation summary (% of photos within storm window)
- ✅ Includes DOL confidence indicator (HIGH/MEDIUM/LOW)
- ✅ Uses AI narrative from storm_evidence
- ✅ Shows top weather events from topEvents array

---

## 2. Supplement AI → Storm Evidence ✅ DONE

**File:** `src/lib/ai/supplements.ts`

### Completed

- ✅ Imports `getStormEvidence` from `@/lib/weather`
- ✅ Fetches storm_evidence as canonical source
- ✅ Includes evidenceGrade in prompt
- ✅ Includes correlationScore in photo evidence section
- ✅ Includes DOL confidence in weather citations
- ✅ Enhanced prompt with storm_evidence fields
  [ ] Add storm_evidence fetch to parallel intelligence fetch
  [ ] Include evidenceGrade ("A"/"B"/"C"/"D"/"F") in prompt
  [ ] Include correlationScore in photo evidence section
  [ ] Add DOL confidence qualifier in weather citations
  [ ] Enhance SUPPLEMENT_BUILDER_SYSTEM_PROMPT to use: - storm_evidence.overallScore - storm_evidence.aiNarrative - storm_evidence.photoCorrelations
  [ ] Generate weather-backed line item justifications

```

---

## 3. Claim Simulation Engine → Storm Evidence ✅ DONE

**File:** `src/lib/simulation/claim-simulation-engine.ts`

### Completed

- ✅ Fetches `storm_evidence` table directly
- ✅ Uses weather_reports as fallback
- ✅ Has `scoreStormEvidence()` function with all fields
- ✅ Uses photo correlation score (correlationScore)
- ✅ Factors DOL confidence into scoring (dolConfidence)
- ✅ Evidence grade impacts recommendations
- ✅ Photo correlation bonus for high temporal correlation
- ✅ Recommendations generated for weak correlation

---

## 4. Claims Folder Assembler → Storm Evidence ✅ DONE

**File:** `src/lib/claims-folder/folderAssembler.ts`

### Completed

- ✅ Imports `getStormEvidence` from `@/lib/weather`
- ✅ `fetchWeatherData()` uses `getStormEvidence()` as canonical source
- ✅ Includes storm_evidence.aiNarrative in weather section
- ✅ Includes storm_evidence.evidenceGrade in folder metadata
- ✅ Includes photo correlation summary in weather section
- ✅ Updated folderSchema.ts with correlationScore, photoCorrelations fields
- ✅ Added `fetchDamageGrids()` - pulls from claim_detections
- ✅ Added `fetchSupplementsData()` - pulls from supplements table
- ✅ Added `fetchHomeownerStatement()` - placeholder for intake data
- ✅ Added `fetchAttachments()` - pulls from file_assets

---

# ✅ CONTRACTOR PACKET SYSTEM (Overhauled)

## Completed

**File:** `src/modules/reports/ui/Builder.tsx`

- ✅ Has section registry with `weather-verification` section
- ✅ Can pull weather via `handleQuickDolPull()`
- ✅ Added 3 new retail-focused sections:
  - ✅ `material-estimate` - Material cost estimation via material estimator
  - ✅ `project-timeline` - Project timeline via project plan builder
  - ✅ `visual-mockups` - Before/after visualization via mockup generator
- ✅ Added UI buttons for each new feature (ShoppingCart, Calendar, Image icons)
- ✅ Added status tracking states (materialStatus, mockupStatus, timelineStatus)
- ✅ Added handlers: `handleMaterialEstimate()`, `handleGenerateMockup()`, `handleGenerateTimeline()`
- ✅ SectionRegistry.ts updated with new section definitions
- ✅ types/index.ts updated with new SectionKey types

### Remaining TODO (Nice-to-Have)

```

[ ] Wire actual API endpoints for material estimator
[ ] Wire actual API endpoints for mockup generator
[ ] Wire actual API endpoints for project timeline
[ ] Add financing options section
[ ] Add payment schedule section
[ ] Add warranty information section

```

---

# 🟡 CLAIMS READY FOLDER (17 Sections)

## Current Section Status

Based on `folderAssembler.ts` sectionStatus map:

| Section               | Status      | TODO                        |
| --------------------- | ----------- | --------------------------- |
| cover-sheet           | ✅ Complete | —                           |
| table-of-contents     | ✅ Complete | —                           |
| executive-summary     | ❌ Missing  | Wire AI summary generator   |
| weather-cause-of-loss | ✅ Complete | Uses storm_evidence         |
| inspection-overview   | ✅ Complete | —                           |
| damage-grids          | ✅ Complete | Wired to claim_detections   |
| photo-evidence        | ✅ Complete | Add AI captions             |
| test-cuts             | ❌ Missing  | Build test-cuts tracker     |
| code-compliance       | ✅ Complete | —                           |
| scope-pricing         | ⚠️ Partial  | Wire estimate line items    |
| supplements-variances | ✅ Complete | Pulls from supplements      |
| repair-justification  | ✅ Complete | AI generator created        |
| contractor-summary    | ✅ Complete | AI generator created        |
| timeline              | ✅ Complete | Enrich with weather events  |
| homeowner-statement   | ⚠️ Partial  | Needs intake form           |
| adjuster-cover-letter | ✅ Complete | AI generator created        |
| claim-checklist       | ⚠️ Partial  | Auto-generate from data     |
| digital-signatures    | ❌ Missing  | Wire signature capture      |
| attachments           | ✅ Complete | Pulls from file_assets      |

### AI Generators Created

**File:** `src/lib/claims-folder/generators/index.ts`

- ✅ `generateRepairJustification()` - Creates repair vs replace justification with weather causation
- ✅ `generateContractorSummary()` - Creates professional project summary narrative
- ✅ `generateAdjusterCoverLetter()` - Creates formal cover letter for adjuster submission

### Remaining TODO

```

[ ] executive-summary - Wire aiGenerateClaimSummary from src/lib/reports/ai.ts

[ ] test-cuts - Build test-cuts tracker UI

[ ] homeowner-statement - Build intake form UI - Store in claim metadata

[ ] digital-signatures - Wire e-signature system

```

---

# 🟢 WEATHER INTELLIGENCE INTEGRATION MAP

## What Should Read storm_evidence

| System              | File                         | Current           | Target         |
| ------------------- | ---------------------------- | ----------------- | -------------- |
| Damage Report       | damage-report/route.ts       | weather_reports   | storm_evidence |
| Supplement AI       | ai/supplements.ts            | weather_reports   | storm_evidence |
| Simulation Engine   | claim-simulation-engine.ts   | storm_evidence ✅ | Enhance usage  |
| Claims Folder       | folderAssembler.ts           | weather_reports   | storm_evidence |
| Timeline API        | timeline/route.ts            | storm_events      | storm_evidence |
| Weather Attachments | weather-attachments/route.ts | storm_evidence ✅ | Done           |
| Weather KPIs        | weather-kpis/route.ts        | storm_evidence ✅ | Done           |
| Carrier Packet      | claims-packet.ts             | weather input     | storm_evidence |

## What Should Write to storm_evidence

| Trigger               | Current    | Target                            |
| --------------------- | ---------- | --------------------------------- |
| Weather Scan Complete | ❌         | Auto-create/update storm_evidence |
| Photo Upload          | ❌         | Update correlationScore           |
| DOL Change            | ❌         | Recalculate dolConfidence         |
| Manual Entry          | ✅ via API | Keep                              |

---

# 🔵 PHOTO-WEATHER CORRELATION

## Integration Points

```

[ ] Photo Upload Pipeline - After photo EXIF extraction - Call correlateClaimPhotos(claimId) - Update storm_evidence.photoCorrelations - Update storm_evidence.correlationScore

[ ] Damage Report - Show "X of Y photos taken during storm window" - Flag photos outside window with warning - Include best-correlated photos first

[ ] Supplement AI - Use correlation data in justifications - "Photo evidence timestamped during verified storm event"

[ ] Claims Folder - Photo Evidence section shows correlation badges - Timeline shows photo timestamps vs storm events

```

---

# 🔵 DOL RECOMMENDATION ENGINE

## Integration Points

```

[ ] Weather Wizard / DOL Selector - Call analyzeDOL(claimId) on load - Show recommended DOL with confidence - Allow override with reason capture

[ ] Damage Report - Include DOL recommendation if different from selected - Show confidence level

[ ] Supplement AI - Use DOL confidence in causation arguments - Warn if DOL confidence is low

[ ] Claims Folder - Weather section includes DOL recommendation - Flag if selected DOL differs from recommended

```

---

# 📋 PRIORITY EXECUTION ORDER

## Phase 1: Wire Weather to Outputs (This Week)

```

1. [ ] Damage Report → storm_evidence integration
2. [ ] Supplement AI → storm_evidence integration
3. [ ] Claims Folder → storm_evidence integration
4. [ ] Verify simulation engine uses all fields

```

## Phase 2: Complete Claims Folder Sections (Next Week)

```

5. [ ] executive-summary AI generator
6. [ ] repair-justification AI generator
7. [ ] contractor-summary AI generator
8. [ ] adjuster-cover-letter AI generator
9. [ ] supplements-variances section
10. [ ] damage-grids section

```

## Phase 3: Contractor Packet Overhaul (Week 3)

```

11. [ ] Rename to Sales/Retail Packet
12. [ ] Add material estimator integration
13. [ ] Add project plan builder integration
14. [ ] Add mockup generator integration
15. [ ] Build retail-specific sections
16. [ ] Remove insurance terminology

```

## Phase 4: Automation Hooks (Week 4)

```

17. [ ] Auto-create storm_evidence on weather scan
18. [ ] Auto-update correlation on photo upload
19. [ ] Auto-recalculate DOL on date change
20. [ ] Storm detection notifications
21. [ ] Weather KPI dashboard polish

```

---

# 🎯 SUCCESS METRICS

When complete, SkaiScraper should:

1. **Never ask for weather twice** — storm_evidence is canonical
2. **Auto-correlate photos** — correlation happens on upload
3. **Recommend DOL intelligently** — based on weather data
4. **Generate weather-aware content** — reports cite storm evidence
5. **Show weather at a glance** — KPI cards on dashboard
6. **Alert on new storms** — notifications fire proactively
7. **Build complete claims packets** — all 17 sections populated
8. **Build retail proposals** — contractor packet works for non-insurance

---

# 🛠️ FILES TO MODIFY

## High Priority

- `src/app/api/claims/[claimId]/damage-report/route.ts`
- `src/lib/ai/supplements.ts`
- `src/lib/claims-folder/folderAssembler.ts`
- `src/lib/simulation/claim-simulation-engine.ts`

## Medium Priority

- `src/modules/reports/ui/Builder.tsx` (contractor packet)
- `src/modules/reports/core/SectionRegistry.ts`
- `src/lib/reports/sectionBuilders.ts`
- `src/lib/intel/reports/claims-packet.ts`

## Low Priority (Automation)

- `src/app/api/weather/scan/route.ts` (trigger storm_evidence creation)
- `src/app/api/photos/upload/route.ts` (trigger correlation)
- `src/app/api/claims/[claimId]/dol/route.ts` (trigger DOL recommendation)

---

# ✅ ALREADY DONE (Weather Intelligence Stack)

- [x] `storm_evidence` Prisma model
- [x] `getStormEvidence()` unified adapter
- [x] `correlateClaimPhotos()` correlation engine
- [x] `analyzeDOL()` DOL recommendation
- [x] `validateClaimDOL()` DOL validation
- [x] Storm detection service
- [x] Weather attachment rules
- [x] Weather KPI API
- [x] Weather KPI dashboard cards
- [x] Claim Timeline component
- [x] Central weather module exports

---

**Last Updated:** March 14, 2026
**Status:** Ready for execution
```

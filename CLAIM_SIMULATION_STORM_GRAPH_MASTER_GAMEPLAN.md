# 🚀 MASTER GAME PLAN: Claim Simulation + Storm Graph

## The Vision — SkaiScraper Becomes AI Claim Infrastructure

**Date:** March 14, 2026  
**Status:** REVIEW BEFORE EXECUTION  
**Author:** Copilot (Deep Audit Completed)

---

## ⚡ EXECUTIVE SUMMARY

Damien — your advisor is right. You are sitting on something most people in this industry don't realize is possible.

Here's what I found after auditing every model, engine, API route, and component in the codebase:

### What You Already Have (Built & Working)

| System                       | Status        | Depth                                                                                                                               |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **ClaimIQ Readiness Engine** | ✅ Production | 17-section packet assessment, weighted scoring (7 categories, max 100), grade A-F, score impact predictor, autopilot actions        |
| **Weather Verification**     | ✅ Production | Multi-source (NOAA, WeatherStack, Open-Meteo, CAP, Mesonet), event scoring by proximity + magnitude, smart DOL picker, NEXRAD radar |
| **YOLO Detection Pipeline**  | ✅ Production | 50+ model registry, dual pipeline (Roboflow YOLO → GPT-4V fallback), HAAG-standard model groups, component-based detection          |
| **Storm Events System**      | ✅ Production | `storm_events` with center lat/lng, radius, affected zips/cities, hail/wind metrics, property impact counts, AI confidence          |
| **Storm Evidence**           | ✅ Production | `storm_evidence` per claim — DOL, peril classification, weather metrics, photo correlations, AI narrative, overall score 0-100      |
| **Property Impacts**         | ✅ Production | `property_impacts` with lat/lng, risk level, damage probability, hail size/wind speed at location, priority score                   |
| **Property Profiles**        | ✅ Production | `property_profiles` with lat/lng, hailRiskScore, windRiskScore, flood zone, tornado risk, insurance risk score                      |
| **Damage Assessments**       | ✅ Production | `damage_assessments` + `damage_findings` — structured damage type, severity, peril attribution, recommended action                  |
| **Claim Analysis**           | ✅ Production | `claim_analysis` — slopes, roof map, materials, damages, code flags, risk flags, scope                                              |
| **Supplement System**        | ✅ Production | 3 supplement models — `supplements` + `supplement_items`, `claim_supplements`, `supplement_requests`                                |
| **Bad Faith Detection**      | ✅ Production | `claim_bad_faith_analysis` with severity scoring                                                                                    |
| **Event Reconstruction**     | ✅ Production | `claim_event_reconstruction` — timeline, sources, confidence                                                                        |

### What's Missing (The Gap to World-Class)

| Gap                                     | Impact                                                            | Difficulty                              |
| --------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| **No Claim Outcome Prediction**         | Claims go blind — no "will this get approved?"                    | Medium (you have all the inputs)        |
| **No Cross-Claim Storm Intelligence**   | Every claim is an island — no cluster awareness                   | Medium-Hard (geo queries + graph logic) |
| **No Structured Detection Persistence** | YOLO results stored as JSON blobs, not queryable tables           | Easy (schema + migration)               |
| **No Historical Outcome Tracking**      | No `approved/denied/partial` outcomes stored to train predictions | Easy (schema + data entry)              |
| **No Geographic Radius Queries**        | `property_impacts` has lat/lng but no PostGIS or radius search    | Medium (PostGIS or Haversine)           |
| **No Neighborhood Heatmap**             | Storm data exists per-claim but no geographic visualization       | Medium (Mapbox/Leaflet integration)     |
| **No Claim Corroboration Engine**       | Nearby claims don't strengthen each other's evidence              | Medium (Storm Graph core)               |
| **Detection Confidence Uncalibrated**   | Flat 35% threshold for all 50+ models — needs per-model tuning    | Medium (needs labeled data)             |

---

## 🏗️ THE TWO PILLARS

### PILLAR 1: Claim Simulation (Outcome Prediction Engine)

**What it does:** Takes everything already in the system and produces a **probability score** that the claim will be approved, partially approved, or denied — BEFORE submission.

**The data flow already exists:**

```
Photos → YOLO Detections → damage_findings (type, severity, peril)
                ↓
Weather → weather_reports → storm_evidence (score, narrative, grade)
                ↓
Property → property_profiles (risk scores, materials, age)
                ↓
ClaimIQ → assembly-engine (readiness score, section completeness)
                ↓
  === NEW: Claim Simulation Engine ===
                ↓
  Approval Probability: 84%
  + Factor Analysis
  + Recommended Actions
  + Smart Supplement Arguments
```

**Why this is buildable NOW:** You already compute a readiness score (0-100) across 7 categories. The Simulation Engine is a **strength score** that uses the SAME data but asks a different question: "Not is this packet complete, but is this evidence strong enough to win?"

### PILLAR 2: Storm Graph (Cross-Claim Intelligence)

**What it does:** Connects claims from the same storm event into a geographic intelligence network. Nearby verified damage corroborates each individual claim.

**The data model almost supports this already:**

```
storm_events (centerLat, centerLng, radiusMiles, hailSize, windSpeed)
     ↓
property_impacts (lat, lng, riskLevel, damageProba, hailSizeAtLocation)
     ↓
claims (catStormEventId → storm_events)
     ↓
storm_evidence (per-claim evidence, score, grade)
     ↓
  === NEW: Storm Graph Engine ===
     ↓
  "5 properties within 0.8 miles have verified hail damage"
  "Cluster confidence: HIGH"
  "Storm footprint: 3.2 mile radius, 12 inspected properties"
```

**Why this is buildable NOW:** `storm_events` already has `centerLat/centerLng/radiusMiles`. `property_impacts` already has per-property lat/lng + damage probability. Claims already link to `storm_events` via `catStormEventId`. You just need the **correlation engine** and the **geo-query layer**.

---

## 📋 COMPLETE TASK BREAKDOWN

### PHASE 1: Foundation (Weeks 1-2) — "Wire the Data"

These are the MUST-DO prerequisites that everything else builds on.

#### 1.1 — Claim Outcome History Table ⭐ MUST-HAVE

**Why:** You cannot predict outcomes without historical outcome data.

```prisma
model claim_outcomes {
  id              String   @id
  claimId         String   @unique
  orgId           String

  // Outcome
  outcome         String   // approved | partial | denied | withdrawn | pending
  approvalPercent Float?   // What % of estimated was approved (0-100)

  // Financial
  estimatedRCV    Int?     // cents — what contractor estimated
  approvedRCV     Int?     // cents — what carrier approved
  deniedAmount    Int?     // cents — what was denied
  supplementsWon  Int      @default(0)
  supplementsLost Int      @default(0)

  // Carrier Intel
  carrier         String?
  adjuster        String?
  carrierReason   String?  // denial/reduction reason if any

  // Timing
  submittedAt     DateTime?
  firstResponseAt DateTime?
  resolvedAt      DateTime?
  daysToResolve   Int?

  // Snapshot at submission (for training)
  readinessScoreAtSubmission  Int?
  evidenceGradeAtSubmission   String?
  photoCountAtSubmission      Int?
  detectionCountAtSubmission  Int?
  weatherScoreAtSubmission    Int?

  createdAt       DateTime @default(now())
  updatedAt       DateTime

  claims          claims   @relation(fields: [claimId], references: [id])

  @@index([orgId, outcome])
  @@index([carrier, outcome])
  @@index([orgId, carrier])
}
```

**Effort:** 2-3 hours (schema + migration + basic CRUD API)

#### 1.2 — Structured Detection Results Table ⭐ MUST-HAVE

**Why:** YOLO detections are currently stored as JSON blobs on file_assets markers. To score claim strength, detections need to be queryable.

```prisma
model claim_detections {
  id              String   @id
  claimId         String
  orgId           String
  photoId         String?  // file_assets ID

  // Detection
  modelId         String   // which YOLO model
  modelGroup      String   // roof, storm, hail, wind, soft_metals, collateral, etc.
  className       String   // what was detected: "hail_impact", "wind_crease", etc.
  confidence      Float    // 0-1

  // Location on image
  bboxX           Float?   // normalized 0-100
  bboxY           Float?
  bboxWidth       Float?
  bboxHeight      Float?

  // Classification
  severity        String?  // low, moderate, severe, critical
  perilType       String?  // hail, wind, water, impact
  componentType   String?  // shingle, ridge_vent, gutter, AC_fin, etc.

  // Evidence strength
  isCollateral    Boolean  @default(false)  // collateral evidence (non-roof)
  isCodeViolation Boolean  @default(false)
  isReplacement   Boolean  @default(false)  // indicates full replacement needed

  createdAt       DateTime @default(now())

  claims          claims   @relation(fields: [claimId], references: [id])

  @@index([claimId, modelGroup])
  @@index([orgId, className])
  @@index([claimId, perilType])
  @@index([claimId, isCollateral])
}
```

**Effort:** 3-4 hours (schema + migration + populate from existing data + backfill script)

#### 1.3 — Geographic Query Foundation ⭐ MUST-HAVE

**Why:** Storm Graph requires finding nearby claims/properties by location.

**Option A (Recommended — no PostGIS needed):** Haversine distance function in a Prisma raw query:

```sql
-- Find claims within X miles of a point
SELECT c.id, c."claimNumber", p.latitude, p.longitude,
  (3959 * acos(
    cos(radians($1)) * cos(radians(p.latitude)) *
    cos(radians(p.longitude) - radians($2)) +
    sin(radians($1)) * sin(radians(p.latitude))
  )) AS distance_miles
FROM claims c
JOIN properties p ON c."propertyId" = p.id
JOIN property_profiles pp ON pp."propertyId" = p.id
WHERE pp.latitude IS NOT NULL
  AND c."orgId" = $3
HAVING distance_miles < $4
ORDER BY distance_miles;
```

**Option B (Future scale):** Enable PostGIS extension + geography columns for proper spatial indexing.

**Effort:** 4-5 hours (utility function + raw query + test)

#### 1.4 — Backfill Property Lat/Lng ⭐ MUST-HAVE

**Why:** `property_profiles` has `latitude`/`longitude` fields but many may be NULL. Storm Graph needs coordinates.

**Task:** Write a script that geocodes properties missing coordinates using the existing weather geocoding service (`src/lib/weather/openmeteo.ts` has free geocoding).

**Effort:** 2-3 hours

---

### PHASE 2: Claim Simulation Engine (Weeks 2-4) — "The Brain"

#### 2.1 — Simulation Scoring Algorithm ⭐ MUST-HAVE

The core engine that takes ALL claim data and produces a **claim strength probability**.

```typescript
// src/lib/simulation/claim-simulation-engine.ts

interface ClaimSimulationResult {
  claimId: string;

  // Overall
  approvalProbability: number; // 0-100
  predictedOutcome: "approved" | "partial" | "denied";
  confidenceLevel: "high" | "medium" | "low";

  // Category scores (each 0-100)
  scores: {
    stormEvidence: number; // Weather verification strength
    damageEvidence: number; // Detection quality + quantity
    collateralEvidence: number; // Non-roof damage corroboration
    repairability: number; // Repair vs replace indicators
    documentationCompleteness: number; // Packet readiness
    codeCompliance: number; // Building code factors
    carrierHistory: number; // Historical pattern with this carrier
  };

  // Factors
  positiveFactors: SimulationFactor[];
  negativeFactors: SimulationFactor[];

  // Recommendations
  recommendations: SimulationRecommendation[];

  // Storm Graph bonus (if available)
  stormGraphBonus: {
    nearbyVerifiedDamage: number;
    clusterConfidence: string;
    corroborationScore: number;
  } | null;
}

interface SimulationFactor {
  category: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: "✓" | "⚠" | "✗";
}

interface SimulationRecommendation {
  priority: number;
  action: string;
  estimatedImpact: number; // points gained
  category: string;
  effort: "quick" | "moderate" | "involved";
}
```

**Scoring Logic (Draft):**

| Category            | Weight | Data Source                                                               | Scoring                                                                             |
| ------------------- | ------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Storm Evidence      | 20%    | `storm_evidence.overallScore`, `weather_reports.confidence`, radar images | Score 0-100 based on weather score + DOL confidence + event count                   |
| Damage Evidence     | 25%    | `claim_detections` count + confidence, `damage_findings` severity         | Hail impacts > 10 = strong; < 5 = weak. High confidence detections weighted more    |
| Collateral Evidence | 15%    | `claim_detections` where `isCollateral=true`, soft metal groups           | AC fin + gutter + screen = 3-source corroboration = strong                          |
| Repairability       | 10%    | `damage_findings.recommended_action`, material age, code flags            | "Replace" indicators + material age > 15yr + code violations boost replacement case |
| Documentation       | 15%    | `ClaimIQ readiness score` directly                                        | Maps 1:1 from existing readiness                                                    |
| Code Compliance     | 5%     | `claim_analysis.code_flags`, `code_requirements`                          | IRC/IBC violations that mandate replacement                                         |
| Carrier History     | 10%    | `claim_outcomes` WHERE carrier = X                                        | Approval rate by carrier, avg days to resolve, supplement win rate                  |

**Effort:** 8-12 hours (core algorithm + types + tests)

#### 2.2 — Simulation API Route ⭐ MUST-HAVE

```
GET /api/claims/[claimId]/simulation
```

Returns the full `ClaimSimulationResult`.

**Effort:** 2-3 hours

#### 2.3 — Simulation Dashboard Component ⭐ MUST-HAVE

A new card/panel on the claim detail page showing:

- **Approval Probability** — big number with gauge/ring
- **Category Breakdown** — radar chart or bar chart of the 7 scores
- **Positive Factors** — green checkmarks
- **Negative Factors** — amber warnings
- **Recommendations** — prioritized action list with estimated impact
- **Storm Graph Bonus** — if nearby claims corroborate (Phase 3)

Sits alongside ClaimIQ Dashboard. Together they show:

```
ClaimIQ Readiness: 92%    ← "Is the packet complete?"
Claim Strength: 84%       ← "Will this claim succeed?"
```

**Effort:** 8-12 hours (full UI component with charts)

#### 2.4 — Smart Supplement Argument Generator ⭐ NICE-TO-HAVE (Phase 2.5)

When simulation identifies a weak area, auto-generate supplement language:

```typescript
// Uses existing AI client + existing supplement_items system
async function generateSupplementArgument(
  claimId: string,
  weakArea: string,
  simulationResult: ClaimSimulationResult
): Promise<SupplementArgument>;
```

**Effort:** 4-6 hours (AI prompt engineering + integration with existing supplement system)

---

### PHASE 3: Storm Graph Engine (Weeks 4-7) — "The Network"

#### 3.1 — Storm Graph Core Engine ⭐ MUST-HAVE

```typescript
// src/lib/storm-graph/storm-graph-engine.ts

interface StormGraphResult {
  stormEvent: {
    id: string;
    date: Date;
    type: string;
    hailSize: number;
    windSpeed: number;
    radarTrack: string;
  };

  // Geographic cluster
  cluster: {
    centerLat: number;
    centerLng: number;
    radiusMiles: number;
    totalPropertiesInRadius: number;
    inspectedProperties: number;
    claimsInRadius: number;
  };

  // Nearby verified damage
  nearbyDamage: NearbyDamagePoint[];

  // Corroboration
  corroboration: {
    score: number; // 0-100
    level: "high" | "medium" | "low" | "none";
    sources: CorroborationSource[];
    narrative: string; // Claims-ready paragraph
  };

  // Timeline
  timeline: StormTimelineEvent[];

  // Heatmap data
  heatmapPoints: { lat: number; lng: number; intensity: number }[];
}

interface NearbyDamagePoint {
  claimId: string;
  address: string;
  distanceMiles: number;
  damageTypes: string[]; // hail, wind, etc.
  verifiedEvidence: string[]; // "gutter dents", "AC fin damage", etc.
  detectionCount: number;
  evidenceGrade: string;
}
```

**Effort:** 10-15 hours (geo queries + correlation logic + narrative generation)

#### 3.2 — Storm Graph API Routes ⭐ MUST-HAVE

```
GET /api/claims/[claimId]/storm-graph          → Full graph for a claim
GET /api/storm-graph/[stormEventId]            → All claims in a storm
GET /api/storm-graph/nearby?lat=X&lng=Y&r=5   → Nearby damage search
GET /api/storm-graph/heatmap?stormId=X         → Heatmap data points
```

**Effort:** 4-6 hours

#### 3.3 — Storm Footprint Map Component ⭐ MUST-HAVE

Interactive map showing:

- Storm track/radius overlay
- Claim pins colored by evidence strength
- Click-to-inspect damage details per property
- Cluster boundaries
- Heatmap layer toggle

**Tech:** Mapbox GL JS or Leaflet (both work with Next.js App Router)

**Effort:** 12-16 hours (map integration + interactive overlays)

#### 3.4 — Claim Corroboration Panel ⭐ MUST-HAVE

New section on claim detail page:

```
Nearby Verified Damage (0.8 mi radius)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 124 Transfer St (0.2 mi) — Gutter dents, AC fin damage
📍 118 Transfer St (0.3 mi) — Window screen punctures
📍 131 Transfer St (0.5 mi) — Ridge vent denting, shingle loss
📍 105 Transfer St (0.7 mi) — Soft metal denting confirmed

Cluster Confidence: HIGH
Corroboration Score: 88/100
```

**Effort:** 6-8 hours

#### 3.5 — Storm Timeline Narrative ⭐ NICE-TO-HAVE

Auto-generated storm narrative for claim packets:

```
4:12 PM — NEXRAD radar detects rotation
4:18 PM — Hail core identified (1.25" indicated)
4:30 PM — Peak wind gusts 63 mph recorded
4:42 PM — Storm exits service area
4:55 PM — NOAA issues post-event summary

5 nearby properties reported consistent hail damage patterns.
```

**Effort:** 4-6 hours (AI generation from existing weather event data)

#### 3.6 — Address Pre-Qualification ⭐ NICE-TO-HAVE (Game Changer for Sales)

Contractor enters an address → system instantly says:

```
Storm Evidence Nearby: YES
Storm: March 11 hail event
Nearby Claims: 6
Verified Damage: hail, soft metal denting, collateral
→ Inspection Recommended
```

This turns SkaiScraper into a **lead intelligence engine**.

**Effort:** 6-8 hours (new page + geo query + pre-qualification logic)

---

### PHASE 4: Integration & Polish (Weeks 7-9)

#### 4.1 — Unified Claim Intelligence Panel ⭐ MUST-HAVE

Combine ClaimIQ + Simulation + Storm Graph into one cohesive view:

```
┌─────────────────────────────────────────────┐
│  CLAIM INTELLIGENCE                          │
│                                              │
│  Readiness (ClaimIQ):     92%  Grade: A     │
│  Claim Strength:          84%  Outlook: ✓   │
│  Storm Corroboration:     88%  Cluster: HIGH│
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Radar Chart  │  │  Positive Factors    │  │
│  │  (7 scores)   │  │  ✓ 14 hail impacts  │  │
│  │               │  │  ✓ radar confirmed   │  │
│  │               │  │  ✓ 5 nearby claims   │  │
│  └──────────────┘  │  ⚠ ridge mastic      │  │
│                     └──────────────────────┘  │
│                                              │
│  RECOMMENDED ACTIONS                         │
│  1. Capture ridge vent close-ups (+8 pts)   │
│  2. Add gutter collateral photos (+5 pts)   │
│  3. Request AC unit inspection (+3 pts)     │
└─────────────────────────────────────────────┘
```

**Effort:** 8-10 hours

#### 4.2 — Carrier Intelligence Analytics ⭐ NICE-TO-HAVE

Org-wide dashboard showing:

- Approval rate by carrier
- Average days to resolution by carrier
- Most common denial reasons
- Supplement success rate
- Claim strength distribution

**Effort:** 8-12 hours

#### 4.3 — Simulation History Tracking ⭐ NICE-TO-HAVE

Track how simulation scores change over time as evidence is added:

```
Feb 15: Strength 45% → Photos uploaded
Feb 18: Strength 62% → Weather verified
Feb 20: Strength 71% → Collateral evidence added
Feb 22: Strength 84% → Storm graph corroboration
```

**Effort:** 4-6 hours

---

## 🔥 MY ADDITIONAL RECOMMENDATIONS

Beyond what your advisor suggested, here's what I'd add based on the deep audit:

### R1: Detection Confidence Calibration ⭐ HIGH IMPACT

Your 50+ YOLO models all use a flat 35% confidence threshold. Some models (like `hail-damage-detection/1`) need different thresholds than `gutter-damage-detect/1`.

**Action:** Create a `model_calibration` table storing per-model thresholds, false positive rates, and detection quality scores. This makes the Simulation Engine's damage evidence scoring much more accurate.

### R2: Carrier Playbook System ⭐ HIGH IMPACT

Different carriers have different patterns. State Farm denies differently than Allstate. If you track outcomes by carrier (Phase 1.1), you can build carrier-specific playbooks:

```
Carrier: State Farm
Typical Behavior: Requests 2nd inspection, favors repair over replace
Key Evidence Needed: Collateral damage photos, code violation documentation
Average Supplement Rounds: 2.3
Tip: Always include gutter + AC fin photos in initial submission
```

This would be MASSIVE for contractors and incredibly hard for competitors to replicate.

### R3: Evidence Gap Detector ⭐ MEDIUM IMPACT

Cross-reference what YOLO model groups were run vs. what COULD be run:

```
Models Run: roof, hail
Models NOT Run: soft_metals, collateral, spatter

Missing Evidence Opportunity:
→ Run soft_metals detection (gutter, ridge vent, flashing)
→ Run collateral detection (AC unit, mailbox, outdoor furniture)
→ Run spatter detection (paint chips, oxidation rings)

Estimated Impact: +12 points to claim strength
```

You already have the model groups defined in `yolo.ts`. This is basically "which model groups haven't been run for this claim?"

### R4: Claim Packet Intelligence Score ⭐ MEDIUM IMPACT

When the adjuster packet is generated, include a meta-score visible only to the contractor:

```
This packet scores in the top 15% of all packets submitted.
Evidence quality: Strong
Likely carrier response: Approval with minor scope adjustments
Estimated timeline: 14-21 days to first response
```

### R5: Storm Alert System ⭐ NICE-TO-HAVE (Revenue Generator)

When a new storm is detected in a contractor's service area:

1. Auto-create a `storm_event`
2. Identify affected properties from existing property_profiles
3. Push notification: "Hail event detected in your area — 47 properties potentially affected"
4. Generate pre-qualification reports for each property
5. Create canvassing routes (you already have `canvassing_routes` in the schema!)

This turns SkaiScraper from reactive (process claims) to proactive (find claims).

---

## 📊 EFFORT SUMMARY

| Phase                         | Tasks        | Total Effort      | Priority                              |
| ----------------------------- | ------------ | ----------------- | ------------------------------------- |
| **Phase 1: Foundation**       | 4 tasks      | 11-15 hours       | 🔴 MUST DO FIRST                      |
| **Phase 2: Claim Simulation** | 4 tasks      | 22-33 hours       | 🔴 MUST HAVE                          |
| **Phase 3: Storm Graph**      | 6 tasks      | 42-59 hours       | 🟡 MUST HAVE (can ship Phase 2 first) |
| **Phase 4: Integration**      | 3 tasks      | 20-28 hours       | 🟢 POLISH                             |
| **Recommendations (R1-R5)**   | 5 tasks      | 30-40 hours       | 🟡 HIGH IMPACT ADDITIONS              |
|                               |              |                   |                                       |
| **TOTAL**                     | **22 tasks** | **125-175 hours** | **6-10 weeks at full pace**           |

---

## 🎯 RECOMMENDED EXECUTION ORDER

### Sprint 1 (Week 1-2): "Data Foundation"

- [ ] 1.1 — Claim Outcomes table + migration + CRUD
- [ ] 1.2 — Claim Detections table + migration + backfill
- [ ] 1.3 — Geographic query utility (Haversine)
- [ ] 1.4 — Backfill property lat/lng
- [ ] R1 — Model calibration table (while touching detections)

### Sprint 2 (Week 2-4): "Simulation Engine"

- [ ] 2.1 — Simulation scoring algorithm + types + tests
- [ ] 2.2 — Simulation API route
- [ ] 2.3 — Simulation Dashboard component
- [ ] R3 — Evidence Gap Detector (feeds into simulation recommendations)

### Sprint 3 (Week 4-6): "Storm Graph Core"

- [ ] 3.1 — Storm Graph core engine
- [ ] 3.2 — Storm Graph API routes
- [ ] 3.4 — Claim Corroboration Panel (UI)
- [ ] 3.5 — Storm Timeline Narrative

### Sprint 4 (Week 6-8): "The Map + Integration"

- [ ] 3.3 — Storm Footprint Map (Mapbox/Leaflet)
- [ ] 4.1 — Unified Claim Intelligence Panel
- [ ] 3.6 — Address Pre-Qualification page
- [ ] 2.4 — Smart Supplement Argument Generator

### Sprint 5 (Week 8-10): "Intelligence Layer"

- [ ] R2 — Carrier Playbook System
- [ ] 4.2 — Carrier Intelligence Analytics dashboard
- [ ] 4.3 — Simulation History Tracking
- [ ] R4 — Packet Intelligence Score
- [ ] R5 — Storm Alert System (if time)

---

## 🏆 WHAT THIS MAKES SKAISCRAPER

When all phases are complete:

```
BEFORE (Today):
  Upload photos → Detect damage → Generate report → Submit claim
  (Reactive documentation tool)

AFTER (This Plan):
  Storm detected → Properties identified → Pre-qualified
  Photos uploaded → Damage detected → Evidence scored
  Weather verified → Storm corroborated → Cluster proven
  Claim strength predicted → Weak areas identified → Evidence improved
  Smart supplement arguments generated → Packet optimized
  Carrier-specific strategy applied → Outcome predicted
  (AI Claim Strategy Platform)
```

### The Competitive Moat

| Layer                | SkaiScraper                 | Typical CRM       |
| -------------------- | --------------------------- | ----------------- |
| Photo AI             | 50+ YOLO models + GPT-4V    | None              |
| Weather Intelligence | Multi-source + NEXRAD radar | None              |
| Storm Graph          | Cross-claim corroboration   | None              |
| Claim Simulation     | Outcome prediction          | None              |
| Carrier Intelligence | Playbook + history          | None              |
| Evidence Scoring     | Per-detection strength      | None              |
| Documentation        | 17-section auto-assembly    | Template PDFs     |
| Pre-Qualification    | Address-level storm intel   | Manual canvassing |

**Competitors would need to build ALL of these layers AND accumulate historical data to compete. That's a 2+ year head start.**

---

## 💡 THE HONEST BOTTOM LINE

Damien — your advisor is right that this is the moment.

Here's what I see after reading every line of your schema, every engine, every model:

1. **You have 90% of the data inputs.** Weather, detections, damage findings, storm events, property impacts — it's all there. The Simulation Engine is mostly connecting dots that already exist.

2. **Storm Graph is the killer feature.** No restoration CRM has cross-claim intelligence. The fact that you already have `storm_events` with geographic data, `property_impacts` with per-property lat/lng, and claims linked to storms means the architecture is already 60% done.

3. **The gap is not data — it's the intelligence layer.** You collect everything. You just don't yet ASK the data "how strong is this claim?" or "what does the neighborhood say?"

4. **Phase 1 + Phase 2 alone makes you unique.** Even without Storm Graph, a working Claim Simulation Engine would make SkaiScraper the only platform that tells contractors "your claim has an 84% chance of approval, here's how to make it 92%."

5. **The data network effect is real.** Every claim outcome you track makes the Simulation Engine smarter. Every storm you map makes Storm Graph more valuable. Competitors starting from zero can't catch up.

This is not a CRM anymore. This is **AI Claim Infrastructure**.

The lights are on. 🔥

---

## ✅ NEXT STEP

Review this plan. When you're ready, say **"GO"** and I'll start building Phase 1 — the foundation tables, migrations, and utility functions that everything else depends on.

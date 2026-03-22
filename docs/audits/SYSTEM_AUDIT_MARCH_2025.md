# SkaiScraper — Comprehensive System Audit

## March 2025 — Visual Intelligence Readiness Assessment

---

## Executive Summary

SkaiScraper is a **massive** Next.js 14 SaaS platform with **351 pro dashboard pages**, **644 API routes**, **294 Prisma models**, and **26 portal pages**. The codebase has **zero TypeScript errors** and strong multi-tenant security through `safeOrgContext()`. However, the platform has significant bloat: **67 orphaned page groups** with no navigation, **12 groups of duplicate pages**, **10 broken nav links** (fixed in this audit), and **11+ orphaned Prisma models**. The AI infrastructure is **remarkably comprehensive** (46 AI endpoints, GPT-4o Vision, DALL-E 3, gpt-image-1, Roboflow YOLO with 25+ models) but the **embedding/vector layer is non-functional** — code exists but no storage models or pgvector extension.

### Key Numbers

| Metric                 | Count              |
| ---------------------- | ------------------ |
| Pro Dashboard Pages    | 351                |
| API Routes             | 644                |
| Portal Pages           | 26                 |
| Marketing Pages        | 14                 |
| Prisma Models          | 294                |
| Top-Level Route Groups | 117                |
| Nav Items (sidebar)    | 88                 |
| TypeScript Errors      | **0** ✅           |
| Broken Nav Links       | **10** (all fixed) |
| Orphaned Route Groups  | ~67                |
| Duplicate Page Groups  | 12                 |
| Orphaned Prisma Models | 11+                |
| AI Endpoints           | 46                 |
| YOLO Detection Models  | 25+                |

---

## 1. Architecture Health

### ✅ What's Working Well

- **Zero TypeScript errors** — clean compile
- **Tenant isolation** — `safeOrgContext()` used consistently across all critical pages
- **Auth patterns** — Three-tier auth system (HOF wrapper, requireAuth, direct Clerk) consistently applied
- **Dashboard counters** — Actually working correctly; all queries filter by orgId with smart fallback
- **Claims addresses** — Display correctly; `properties` relation is properly included
- **Map pins** — Bug has been fixed; no Mapbox Popup, center anchor, no CSS transforms
- **Financial pages** — No broken imports or placeholder content
- **Rate limiting** — Upstash Redis with proper presets

### ⚠️ Areas of Concern

- **117 route groups** for ~50 sidebar nav items = massive discovery gap
- **294 Prisma models** when docs say 243 — schema growing faster than documentation
- **12 groups of duplicate pages** (billing×3, connections×3, weather×5, reports×7+)
- **NOAA weather integration** returns placeholder data, not real API calls
- **No pagination** on contacts pages — datasets silently truncated at 100-200

### 🔴 Critical Issues Found & Fixed

1. **10 broken nav links** — pointing to non-existent pages (fixed)
2. **2 non-functional search bars** — Company Connections + Pipeline search inputs had no handlers (fixed)
3. **Mockup generator** at 1024×1024 resolution — too low for realistic output (upgraded to 1536×1024 / 1792×1024)

---

## 2. AI / Machine Learning Inventory

### 2A. Models in Use

| Model                      | Purpose                                                      | Status                     |
| -------------------------- | ------------------------------------------------------------ | -------------------------- |
| **gpt-4o**                 | Vision analysis, photo annotation, damage scoping, estimates | ✅ Active                  |
| **gpt-4o-mini**            | Default for all `callAI()`, pricing, quick analysis          | ✅ Active                  |
| **gpt-image-1**            | Mockup generation (primary — sees original photo)            | ✅ Active                  |
| **dall-e-3**               | Mockup generation (fallback — text-only)                     | ✅ Active                  |
| **text-embedding-3-large** | Embedding generation (3072 dims)                             | ⚠️ Code exists, no storage |
| **text-embedding-3-small** | Claim embedding (1536 dims)                                  | ⚠️ Code exists, no storage |
| **Roboflow YOLO**          | 25+ damage detection models (hail, wind, siding, HVAC, etc.) | ✅ Active                  |
| **Sora (sora-1.0)**        | Video generation                                             | ⚠️ Requires API key        |

### 2B. AI Endpoints (46 total)

**Core Analysis:** analyze-damage, analyze-photo, vision/analyze, vision/report, vision/pipeline, damage, damage/analyze, damage/export, damage-builder, photo-annotate

**Report Generation:** report-builder, enhanced-report-builder, claim-writer, claim-assistant

**Carrier Defense:** rebuttal, rebuttal/export-pdf, supplement/[claimId], supplement/export-pdf, supplement/generate-items

**Estimation:** estimate/[claimId], estimate-value, materials estimator

**Planning:** plan/generate, plan/export, dispatch/[claimId], orchestrate/[claimId], smart-actions, suggest-status, recommendations

**Specialized:** blueprint/analyze, geometry/detect-slopes, 3d, video, photos/organize, domain, retail-assistant, dashboard-assistant, job-scanner

**Infrastructure:** chat, run, status, usage, history, agents, weather/run

### 2C. Embedding/Vector Infrastructure — 🔴 NON-FUNCTIONAL

The embedding generation code exists in `src/lib/ai/embeddings.ts` with:

- `generateEmbedding()` using `text-embedding-3-large` (3072 dimensions)
- Chunking logic, batch embed, buffer serialization
- `claimSimilarity.ts` with `findSimilarClaims()` and `generateClaimEmbedding()`

**BUT:**

- ❌ No `pgvector` extension in Prisma schema
- ❌ No `claimsEmbedding` or `claimsMemoryChunk` model in Prisma
- ❌ All similarity functions return empty arrays or mock data
- ❌ `generateClaimEmbedding()` uses `callAI()` instead of the embeddings API (returns fake embedding)

**Gap:** This is the single biggest blocker for "Visual Intelligence" — without vector storage, there's no similarity search, no clustering, no pattern detection.

---

## 3. Photo / Media Assessment

### 3A. Photo Models & Metadata

| Model                 | AI Fields                                                                                               | Status               |
| --------------------- | ------------------------------------------------------------------------------------------------------- | -------------------- |
| `ClaimPhoto`          | ai_tags[], ai_damage[], ai_caption, ai_severity, ai_confidence, analyzed_at, photo_angle, camera_height | ✅ Excellent         |
| `completion_photos`   | ai_tags (Json), ai_analysis (Json), analyzed (bool), ai_metadata                                        | ✅ Good              |
| `damage_photo_links`  | ai_analysis (Json)                                                                                      | ✅ Good              |
| `supplement_photos`   | damage_type, detected_items (Json)                                                                      | ✅ Good              |
| `ClientPropertyPhoto` | folder, caption                                                                                         | ⚠️ Minimal AI fields |

### 3B. What's Missing for Visual Intelligence

| Capability                          | Status           | Gap                                    |
| ----------------------------------- | ---------------- | -------------------------------------- |
| Per-photo tags                      | ✅ Exists        | —                                      |
| AI damage classification            | ✅ Exists        | —                                      |
| Confidence scores                   | ✅ Exists        | —                                      |
| Photo annotations/bounding boxes    | ✅ GPT-4o + YOLO | —                                      |
| EXIF extraction (timestamp, camera) | ⚠️ Partial       | Only timestamp for weather correlation |
| Per-photo geolocation (lat/lng)     | ❌ Missing       | No lat/lng fields on photo models      |
| Photo thumbnails                    | ❌ Missing       | No thumbnail generation pipeline       |
| Photo embedding vectors             | ❌ Missing       | No CLIP or visual embeddings           |
| Photo clustering / deduplication    | ❌ Missing       | No similarity grouping                 |
| Visual similarity search            | ❌ Missing       | No vector infrastructure               |

### 3C. Storage Architecture

- **Primary:** Supabase Storage (claim-photos, avatars, branding-assets, uploads, exports, portfolios, portal-uploads)
- **Upload routes:** 8+ upload endpoints
- **Public URLs:** `supabase.storage.from(bucket).getPublicUrl()`
- **Signed URLs:** For temporary access
- ✅ Storage is solid and well-organized

---

## 4. Weather / Storm Intelligence

### 4A. Data Sources

| Source             | Status            | Notes                                         |
| ------------------ | ----------------- | --------------------------------------------- |
| WeatherStack       | ✅ Active         | Primary weather provider                      |
| Visual Crossing    | ✅ Active         | Primary DOL (Date of Loss) provider           |
| NOAA/NWS           | ⚠️ Placeholder    | Referenced in prompts, returns hardcoded data |
| Iowa State Mesonet | ⚠️ Referenced     | Unclear integration                           |
| HailTrace          | ❌ Not integrated | Just mentioned in AI prompts                  |

### 4B. Storm Models (Excellent Foundation)

| Model              | Key Fields                                                                                                    | Purpose                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `storm_events`     | eventType, severity, noaaEventId, centerLat/Lng, hailSize, windSpeed, tornadoRating, aiConfidence             | Storm event registry      |
| `storm_evidence`   | claimId (1:1), selectedDOL, primaryPeril, hailSize, windSpeed, nwsCitations, photoCorrelations, evidenceGrade | Per-claim storm evidence  |
| `storm_clusters`   | stormEventId, centerLat/Lng, totalProperties, corroborationScore, heatmapData                                 | Geographic clustering     |
| `property_impacts` | stormEventId, riskLevel, damageProba, priorityScore                                                           | Per-property risk scoring |
| `WeatherAnalysis`  | claimId, leadId, mode, primaryPeril, confidence, candidateDates, events                                       | AI weather analysis       |

### 4C. Claim → Storm Linkage: ✅ STRONG

- Claims link to storms via `storm_evidence.stormEventId`
- Weather reports linked via `WeatherAnalysis.claimId`
- Storm clusters link to events via `storm_clusters.stormEventId`
- Property impacts link via `property_impacts.stormEventId`

**Verdict:** Storm/weather data model is **excellent** and ready for intelligence features. The main gap is real NOAA integration (currently placeholder).

---

## 5. Navigation & Route Audit

### 5A. Broken Nav Links Found & Fixed

| Original Path                            | Fix                                                 | Issue                                           |
| ---------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| `/ai/hub`                                | → `/ai`                                             | AI landing page is at root `/ai`, not `/ai/hub` |
| `/rebuttal`                              | → removed (duplicate of `/ai/tools/rebuttal`)       | Page doesn't exist at `/rebuttal`               |
| `/routes`                                | → removed (consolidated into `/route-optimization`) | No page at `/routes`                            |
| `/supplement`                            | → `/supplements`                                    | Actual page uses plural                         |
| `/route-optimizer`                       | → `/route-optimization`                             | Actual page path                                |
| `/ai/bad-faith-detector` (context nav)   | → `/ai/bad-faith`                                   | Wrong suffix                                    |
| `/claims/rebuttal-builder` (context nav) | → `/ai/tools/rebuttal`                              | Moved to AI tools                               |
| `/trades-network/*` (context nav)        | → `/trades/*`                                       | Trades use `/trades/` path                      |

### 5B. Duplicate Page Groups

| Area        | Paths                                                                                   | Recommendation                                |
| ----------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| Billing     | `/billing/`, `/account/billing/`, `/settings/billing/`                                  | Consolidate to `/settings/billing`            |
| Connections | `/connections/`, `/company/connections/`, `/contacts/`                                  | Keep `/contacts/` as primary, redirect others |
| Weather     | `/weather/`, `/weather-report/`, `/maps/weather/`, `/storm-center/`, `/weather-chains/` | Consolidate under `/storm-center/`            |
| Reports     | 7+ locations                                                                            | Consolidate under `/reports/`                 |
| Vendors     | `/vendors/` + `/vendor-network/`                                                        | Merge into `/vendor-network/`                 |
| Finance     | `/finance/` + `/financial/`                                                             | Consolidate to `/finance/`                    |

### 5C. Orphaned Route Groups (No Nav Link)

67 top-level route groups exist with no sidebar navigation entry. These include admin tools, internal pages, and feature experiments. Many should either be added to nav or archived.

---

## 6. Dashboard & Financial Pages

### 6A. Dashboard

- **Status:** ✅ Working correctly
- **Auth:** Uses `safeOrgContext`
- **Data:** Server-fetched stats + client-side StatsCards, Leaderboard, ActivityFeed
- **orgId filtering:** ✅ Correct on all queries
- **Counters:** Total Leads, Active Claims, Messages, Retail Jobs — all computed via `/api/dashboard/stats`
- **Leaderboard:** Revenue, Claims Signed, Claims Approved, Doors Knocked, Close Rate, Commission

### 6B. Financial Pages

- `/finance/overview` — Uses Clerk auth (not `safeOrgContext`); functional but inconsistent pattern
- `/account/billing` — Uses Clerk `getAuth`; has RBAC guard; Stripe integration
- `/invoices` — Uses `safeOrgContext` ✅; proper role check; queries via jobs
- `/claims/[claimId]/financial` — Client component; relies on API-side auth

### 6C. Minor Issues

- `/finance/overview` uses `getAuth()` instead of `safeOrgContext` — inconsistent but functional
- `/account/billing` uses Clerk orgId directly — could cause issues if Clerk org ≠ DB org
- Claims page makes duplicate full-org query for stats aggregation (performance waste)

---

## 7. Contacts & Connections

### 7A. Two Contact Systems

1. **Company Connections** (`/company/connections/`) — Vendor/sub/contractor connections via TradesCompanyMember + client contacts
2. **Company Contacts** (`/contacts/`) — Rich CRM pulling from 5 data sources (contacts, client_networks, claims, portal clients, trades)

### 7B. Issues Fixed

- ✅ **Search bar** — Was non-functional on Connections page; now uses server-side URL param filtering
- **"Only FaceTime option"** — This is iOS intercepting `tel:` links, not a code bug. The contact cards correctly show Call, Text, and Email buttons.
- **"25 cards not viewable"** — Connections page limits to `take: 100` but only shows first 3 clients inline. The "View all in Contacts" link works correctly.

---

## 8. Mockup Generator

### 8A. Architecture

- **Primary:** `gpt-image-1` edit — sees the original photo, preserves architecture
- **Fallback:** GPT-4o Vision → DALL-E 3 — text-only, generates new building
- **Final fallback:** Returns original image with overlay

### 8B. Issues Fixed

| Issue                     | Before                                 | After                                                  |
| ------------------------- | -------------------------------------- | ------------------------------------------------------ |
| Resolution                | 1024×1024 (both paths)                 | **1536×1024** (gpt-image-1) / **1792×1024** (DALL-E 3) |
| GPT-4o description tokens | 700 (too short for complex properties) | **1200**                                               |

### 8C. Remaining Limitations

- DALL-E 3 fallback **cannot see the original photo** — will always generate a different building
- No mask/inpainting support — AI decides what to change (could over-modify)
- No multi-angle support (only one view at a time)

---

## 9. Security & Multi-Tenant Isolation

### ✅ Strong

- `safeOrgContext()` used across all critical pages and API routes
- `resolveOrg()` resolves from DB membership, not Clerk directly
- RBAC system with role hierarchy: admin(4) > manager(3) > member(2) > viewer(1)
- `requireRole()` and `requirePermission()` server-side checks
- `<RBACGuard>` client-side component
- Upstash Redis rate limiting with AI-specific preset (5/min)

### ⚠️ Watch Items

- 2 financial pages use Clerk auth directly instead of `safeOrgContext` — not a security risk but inconsistent
- Portal routes use separate auth flow — verify tenant isolation there too
- API routes under `/api/ai/` should all verify token consumption

---

## 10. Visual Intelligence Readiness Score

| Component                  | Ready? | Score    | Gap                                     |
| -------------------------- | ------ | -------- | --------------------------------------- |
| Photo storage & upload     | ✅     | 9/10     | Missing thumbnails                      |
| Photo AI analysis          | ✅     | 8/10     | Missing geo-tagging, CLIP embeddings    |
| Damage detection (YOLO)    | ✅     | 9/10     | 25+ models, excellent coverage          |
| Storm/weather models       | ✅     | 8/10     | Missing real NOAA integration           |
| Claim → Storm linking      | ✅     | 9/10     | Already modeled                         |
| Embedding generation code  | ⚠️     | 4/10     | Code exists but no storage              |
| Vector search / pgvector   | ❌     | 0/10     | No pgvector, no embedding models        |
| Photo clustering           | ❌     | 0/10     | No implementation                       |
| Similarity search          | ❌     | 1/10     | Stubbed to return empty                 |
| Anomaly detection          | ❌     | 0/10     | No implementation                       |
| Pattern recognition        | ❌     | 0/10     | No implementation                       |
| Visual graph/constellation | ❌     | 0/10     | No implementation                       |
| **OVERALL**                |        | **4/10** | Strong foundation, missing vector layer |

---

## 11. What Exists That Can Be Reused (Asset Inventory)

### Ready to Use

1. **GPT-4o Vision pipeline** (`src/lib/ai/vision.ts`) — damage classification, severity, confidence
2. **Roboflow YOLO engine** (`src/lib/ai/yolo.ts`) — 25+ specialized detection models, 1,627 lines
3. **Photo annotation** (`src/lib/ai/annotate.ts`) — bounding boxes, labels on photos
4. **Storm evidence model** — full storm ↔ claim linkage
5. **Property impacts model** — per-property risk scoring with damage probability
6. **Storm clusters** — geographic clustering with corroboration scores
7. **WeatherAnalysis** — AI-powered weather assessment per claim
8. **ClaimPhoto metadata** — ai_tags, ai_damage, ai_severity, ai_confidence fields
9. **Embedding generation code** (`src/lib/ai/embeddings.ts`) — needs storage model to activate
10. **GeneratedArtifact table** — universal storage for AI-generated content

### Needs Completion

1. **Embedding storage** — pgvector + Prisma model needed
2. **Claim similarity** (`src/lib/ai/claimSimilarity.ts`) — functions exist, return stubs
3. **NOAA integration** — placeholder returns, needs real API
4. **Photo geolocation** — needs lat/lng fields on photo models
5. **Thumbnail pipeline** — needs server-side image resizing

---

_Generated: March 2025_
_Audit Scope: Full platform — architecture, AI/ML, photos, weather, claims, dashboard, contacts, navigation, security_

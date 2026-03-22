# Visual Intelligence — MVP Roadmap & Master TODO

## SkaiScraper "Claim Constellation" / "Damage Map"

### Target: D.A.U. Ready — April 1, 2025

---

## The Vision

Transform SkaiScraper from a claims management tool into a **Visual Intelligence Platform** that finds patterns humans can't see:

- Photo similarity clustering → "These 47 claims have identical hail damage patterns"
- Claim fingerprinting → "This claim is 94% similar to 3 approved claims in Mesa, AZ"
- Missing line items → "Similar claims included gutter replacement — add supplement?"
- Anomaly detection → "This damage score is 3σ below average for this storm event"
- Storm-claim constellation → Interactive graph showing weather events ↔ claims ↔ photos ↔ estimates

---

## Phase 0: Foundation (Days 1-2) — CRITICAL PATH

### P0-1: Enable pgvector on Supabase

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] Enable `vector` extension in Supabase dashboard
- [ ] Add migration file `db/migrations/20250325_enable_pgvector.sql`

### P0-2: Create Embedding Storage Models

```prisma
model ClaimEmbedding {
  id          String   @id @default(cuid())
  claimId     String   @unique
  orgId       String
  embedding   Unsupported("vector(1536)")
  textHash    String   // Hash of source text to detect changes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  claim       claims   @relation(fields: [claimId], references: [id])
  @@index([orgId])
}

model PhotoEmbedding {
  id          String   @id @default(cuid())
  photoId     String   @unique
  orgId       String
  embedding   Unsupported("vector(512)")  // CLIP ViT-B/32
  claimId     String?
  damageType  String?
  confidence  Float?
  createdAt   DateTime @default(now())
  @@index([orgId])
  @@index([claimId])
}
```

- [ ] Add models to `prisma/schema.prisma`
- [ ] Create migration
- [ ] Run `prisma generate`

### P0-3: Fix Existing Embedding Code

- [ ] Fix `src/lib/ai/claimSimilarity.ts` — remove "DEPRECATED" markers, wire to new ClaimEmbedding model
- [ ] Fix `generateClaimEmbedding()` — use actual embeddings API instead of `callAI()`
- [ ] Fix `src/lib/ai/embeddings.ts` — wire to new storage models
- [ ] Create `src/lib/ai/photoEmbeddings.ts` — CLIP-based visual embeddings via OpenAI

### P0-4: Add Photo Geolocation Fields

```prisma
// Add to ClaimPhoto model:
latitude     Float?
longitude    Float?
exifData     Json?    // Full EXIF extraction
```

- [ ] Migration to add lat/lng/exif fields to ClaimPhoto
- [ ] Extract EXIF on upload (use `exif-reader` or `sharp` metadata)
- [ ] Backfill existing photos where possible

---

## Phase 1: Similarity Engine (Days 3-4)

### P1-1: Claim Similarity Search API

- [ ] `POST /api/ai/similarity/claims` — Find N most similar claims by embedding distance
- [ ] `POST /api/ai/similarity/photos` — Find visually similar photos
- [ ] Use pgvector `<=>` (cosine distance) operator for search
- [ ] Filter by orgId (tenant isolation) + optional storm event filter

### P1-2: Batch Embedding Pipeline

- [ ] `POST /api/ai/embeddings/generate` — Generate embeddings for a claim (text + photos)
- [ ] Background worker: Process unembedded claims on schedule
- [ ] Store embedding + textHash for change detection
- [ ] API route: `/api/ai/embeddings/status` — Show coverage (X of Y claims embedded)

### P1-3: Claim Similarity UI

- [ ] Add "Similar Claims" panel to claim detail page
- [ ] Show top 5 similar claims with similarity score, key differences
- [ ] "Claims like this were approved for $X on average" insight
- [ ] Link to the similar claims for quick comparison

---

## Phase 2: Pattern Detection (Days 5-6)

### P2-1: Damage Pattern Clustering

- [ ] `/api/ai/intelligence/clusters` — DBSCAN or k-means on photo embeddings
- [ ] Group photos by visual similarity → automatic damage type discovery
- [ ] Cluster metadata: average severity, common locations, typical claim value

### P2-2: Missing Line Item Suggestions

- [ ] Compare current claim's scope against similar approved claims
- [ ] Flag line items present in >70% of similar claims but missing from this one
- [ ] `/api/ai/intelligence/missing-items/[claimId]` endpoint
- [ ] Add "AI Suggestions" badge on claim scope editor

### P2-3: Anomaly Detection

- [ ] Statistical analysis: claim value vs. storm severity vs. property size
- [ ] Flag claims that deviate >2σ from expected patterns
- [ ] `/api/ai/intelligence/anomalies` endpoint
- [ ] Dashboard widget: "X claims flagged for review"

---

## Phase 3: Visual Intelligence UI (Days 7-8)

### P3-1: Claim Constellation View

- [ ] New page: `/intelligence/constellation`
- [ ] Interactive force-directed graph (D3.js or vis.js)
- [ ] Nodes: Claims (colored by status), Storm Events (colored by severity), Photos
- [ ] Edges: Claim↔Storm (evidence grade), Claim↔Claim (similarity), Photo↔Photo (visual similarity)
- [ ] Click node → detail panel with key metrics
- [ ] Filter by: date range, storm event, damage type, claim status

### P3-2: Damage Map Overlay

- [ ] Extend existing Map View with intelligence layer
- [ ] Heat map: damage density by location
- [ ] Storm path overlay (from storm_events centerLat/Lng + radius)
- [ ] Color-coded pins: green (approved) / yellow (pending) / red (denied)
- [ ] Toggle layers: claims, storms, damage clusters, property impacts

### P3-3: Training Explorer

- [ ] New page: `/intelligence/training`
- [ ] Side-by-side photo comparison: "Approved damage" vs. "Denied damage"
- [ ] Filter by damage type, carrier, storm event
- [ ] "What made this claim successful?" AI analysis
- [ ] Rep training mode: quiz-style damage identification

---

## Phase 4: Intelligence Dashboard (Days 9-10)

### P4-1: AI Insights Dashboard

- [ ] New page: `/intelligence/dashboard`
- [ ] Metrics: Embedding coverage, cluster count, anomaly count
- [ ] "This week's patterns" — auto-discovered insights
- [ ] "Most profitable claim type" by damage category
- [ ] "Carrier approval rates" by damage type + storm severity

### P4-2: Smart Notifications

- [ ] "New claim matches 5 recently approved claims — auto-scope?" notification
- [ ] "Storm event X has 12 properties in your territory — prioritize?" alert
- [ ] "Carrier Y denying 80% of claims with damage type Z — adjust approach?" warning

### P4-3: Reports & Export

- [ ] "Visual Intelligence Report" — PDF/email with pattern analysis
- [ ] Export constellation data as CSV/JSON for external analysis
- [ ] Portfolio analysis: "Your company's strengths and gaps"

---

## Existing Assets (Ready to Reuse)

| Asset                                          | Location                        | Readiness              |
| ---------------------------------------------- | ------------------------------- | ---------------------- |
| GPT-4o Vision pipeline                         | `src/lib/ai/vision.ts`          | ✅ Production          |
| YOLO damage detection (25+ models)             | `src/lib/ai/yolo.ts`            | ✅ Production          |
| Photo annotation engine                        | `src/lib/ai/annotate.ts`        | ✅ Production          |
| Embedding generation code                      | `src/lib/ai/embeddings.ts`      | ⚠️ Needs storage model |
| Claim similarity code                          | `src/lib/ai/claimSimilarity.ts` | ⚠️ Returns stubs       |
| Storm events model                             | `prisma/schema.prisma`          | ✅ Production          |
| Storm evidence (claim↔storm)                   | `prisma/schema.prisma`          | ✅ Production          |
| Storm clusters + heatmap                       | `prisma/schema.prisma`          | ✅ Production          |
| Property impacts (risk scoring)                | `prisma/schema.prisma`          | ✅ Production          |
| ClaimPhoto metadata (ai_tags, ai_damage, etc.) | `prisma/schema.prisma`          | ✅ Production          |
| GeneratedArtifact table                        | `prisma/schema.prisma`          | ✅ Production          |
| Map View (Mapbox GL)                           | `src/app/(app)/maps/map-view/`  | ✅ Production          |
| Storm Center page                              | `src/app/(app)/storm-center/`   | ✅ Production          |
| Weather analysis engine                        | `src/lib/weather/`              | ⚠️ NOAA is placeholder |

---

## Schema Changes Required

### New Models

1. `ClaimEmbedding` — vector(1536) per claim
2. `PhotoEmbedding` — vector(512) per photo (CLIP)
3. `DamageCluster` — auto-discovered damage patterns
4. `IntelligenceInsight` — cached AI-generated insights

### Model Modifications

1. `ClaimPhoto` — add `latitude`, `longitude`, `exifData` fields
2. `claims` — add `embeddingId` relation
3. `storm_events` — no changes needed (already excellent)

### Extensions

1. `pgvector` — `CREATE EXTENSION IF NOT EXISTS vector;`

---

## Risk Mitigation

| Risk                                    | Mitigation                                                                |
| --------------------------------------- | ------------------------------------------------------------------------- |
| pgvector not available on Supabase plan | Supabase supports pgvector on all paid plans; verify plan level           |
| Embedding cost ($)                      | Use `text-embedding-3-small` (1536d) at $0.02/1M tokens — ~$2/1000 claims |
| CLIP embeddings for photos              | Use OpenAI's embeddings API with image URLs, or self-host CLIP            |
| Performance at scale                    | pgvector IVFFLAT index for <100K vectors, HNSW for larger                 |
| Tenant isolation in vector search       | Always include `orgId` filter in similarity queries                       |

---

## Immediate TODO (Pre-April 1)

### 🔴 Critical (Must Do)

- [ ] Enable pgvector on Supabase
- [ ] Create ClaimEmbedding + PhotoEmbedding models
- [ ] Fix `claimSimilarity.ts` to use real embeddings
- [ ] Build `/api/ai/similarity/claims` endpoint
- [ ] Add "Similar Claims" panel to claim detail page

### 🟡 High Priority (Should Do)

- [ ] Batch embedding pipeline for existing claims
- [ ] Missing line item suggestions
- [ ] Damage Map overlay on Map View
- [ ] Intelligence dashboard with coverage metrics

### 🟢 Nice to Have (Can Wait)

- [ ] Constellation graph UI (D3.js force-directed)
- [ ] Training explorer
- [ ] Photo clustering / CLIP embeddings
- [ ] Smart notifications
- [ ] Full NOAA integration (replace placeholders)

---

## Bug Fixes Completed in This Audit

| Fix                       | File                                         | What Changed                                  |
| ------------------------- | -------------------------------------------- | --------------------------------------------- |
| 10 broken nav links       | `src/config/nav.ts`                          | Corrected paths to match actual pages         |
| Connections search bar    | `src/app/(app)/company/connections/page.tsx` | Added server-side URL param search            |
| Pipeline search bar       | `src/app/(app)/pipeline/page.tsx`            | Added server-side URL param search            |
| Mockup resolution         | `src/app/api/mockup/generate/route.ts`       | 1024→1536 (gpt-image-1), 1024→1792 (DALL-E 3) |
| Mockup description tokens | `src/app/api/mockup/generate/route.ts`       | 700→1200 tokens for GPT-4o Vision             |

---

## Platform Cleanup TODO (Post-April 1)

- [ ] Archive 67 orphaned route groups or add nav entries
- [ ] Consolidate 12 duplicate page groups
- [ ] Remove 11+ orphaned Prisma models
- [ ] Replace NOAA placeholder data with real API calls
- [ ] Add pagination to contacts pages
- [ ] Standardize all financial pages to use `safeOrgContext`
- [ ] Update documentation (294 models, not 243)

---

_Document generated: March 2025_
_Next review: April 1, 2025 (D.A.U. launch)_

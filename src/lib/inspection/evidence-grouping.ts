/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVIDENCE GROUPING & CLAIM-WORTHINESS ENGINE v2
 *
 * Solves two critical problems:
 * 1. DEDUPLICATION: When YOLO + GPT-4o detect the same hail dent 5 times,
 *    this groups overlapping boxes into a single finding cluster.
 * 2. RANKING: Scores each finding by claim relevance so only high-value
 *    evidence appears in the report (max 5 per photo).
 *
 * v2 Enhancements:
 *  - Component-based weight multipliers (roof=1.0x, gutter=0.6x, etc.)
 *  - Functional vs cosmetic damage classification (1.5x for functional)
 *  - Photo-level context (overview photos get lower annotation worthiness)
 *  - Shape type assignment per annotation
 *  - Exported standalone claimWorthinessScore() for UI use
 *
 * Used by: damage-report/route.ts, photo-annotate/route.ts, annotation editor UI
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type DamageColor,
  getDamageColor,
  type IRCCodeEntry,
  resolveIRCCode,
} from "@/lib/constants/irc-codes";
import {
  classifyDamageCategory,
  filterAnnotations,
  getComponentWeight,
  isOverviewAnnotation,
  selectAnnotationShape,
} from "@/lib/inspection/annotation-rules";
import type { AnnotationShapeType, DamageCategory } from "@/types/annotations";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RawAnnotation {
  id?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  damageType?: string;
  severity?: string;
  ircCode?: string;
  caption?: string;
  confidence?: number;
  isPercentage?: boolean;
}

export interface NormalizedAnnotation {
  /** Bounding box in 0-1 normalized coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Center point for distance calculations */
  cx: number;
  cy: number;
  damageType: string;
  severity: string;
  confidence: number;
  caption: string;
  ircCode: string | null;
  originalAnnotation: RawAnnotation;
}

export interface EvidenceCluster {
  /** Unique cluster ID */
  id: string;
  /** Primary damage type for this cluster */
  damageType: string;
  /** Merged bounding box (union of all members) */
  bbox: { x: number; y: number; w: number; h: number };
  /** Highest severity in the cluster */
  severity: string;
  /** Average confidence across cluster members */
  confidence: number;
  /** Best caption from the cluster (longest / most descriptive) */
  caption: string;
  /** Resolved IRC code entry */
  ircCode: IRCCodeEntry | null;
  ircCodeKey: string | null;
  /** Damage color for rendering */
  color: DamageColor;
  /** Claim-worthiness score (0-1) */
  score: number;
  /** Short label for PDF annotation (max 24 chars) */
  label: string;
  /** Number of raw detections merged into this cluster */
  memberCount: number;
  /** Shape type for PDF rendering (circle, rectangle, outline) */
  shapeType: AnnotationShapeType;
  /** Whether damage is functional or cosmetic */
  damageCategory: DamageCategory;
  /** Building component being annotated */
  component: string;
}

// ─── Coordinate Normalization ────────────────────────────────────────────────

/**
 * Normalize any coordinate system to 0-1 range.
 * Handles: percentage (0-100), pixel (0-800/600), or already normalized (0-1).
 */
export function normalizeAnnotation(ann: RawAnnotation): NormalizedAnnotation {
  let x: number, y: number, w: number, h: number;

  if (ann.isPercentage === true) {
    // Percentage space (0-100)
    x = (ann.x || 0) / 100;
    y = (ann.y || 0) / 100;
    w = (ann.width || 5) / 100;
    h = (ann.height || 5) / 100;
  } else if (
    (ann.x || 0) > 10 ||
    (ann.y || 0) > 10 ||
    (ann.width || 0) > 10 ||
    (ann.height || 0) > 10
  ) {
    // Pixel space — guess 800×600 standard
    const isLargePixel = (ann.x || 0) > 100 || (ann.y || 0) > 100;
    const refW = isLargePixel ? Math.max(ann.x || 0, 800) : 800;
    const refH = isLargePixel ? Math.max(ann.y || 0, 600) : 600;
    x = (ann.x || 0) / refW;
    y = (ann.y || 0) / refH;
    w = (ann.width || 50) / refW;
    h = (ann.height || 50) / refH;
  } else {
    // Already normalized (0-1)
    x = ann.x || 0;
    y = ann.y || 0;
    w = ann.width || 0.05;
    h = ann.height || 0.05;
  }

  // Clamp to valid range
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));
  w = Math.max(0.01, Math.min(1 - x, w));
  h = Math.max(0.01, Math.min(1 - y, h));

  return {
    x,
    y,
    w,
    h,
    cx: x + w / 2,
    cy: y + h / 2,
    damageType: ann.damageType || "unknown",
    severity: ann.severity || "Low",
    confidence: ann.confidence || 0.5,
    caption: ann.caption || "",
    ircCode: ann.ircCode || null,
    originalAnnotation: ann,
  };
}

// ─── Overlap & Distance ─────────────────────────────────────────────────────

/** IoU (Intersection over Union) for two boxes */
function iou(a: NormalizedAnnotation, b: NormalizedAnnotation): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (intersection === 0) return 0;

  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  return intersection / (areaA + areaB - intersection);
}

/** Euclidean distance between centers */
function centerDistance(a: NormalizedAnnotation, b: NormalizedAnnotation): number {
  return Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2);
}

/** Should two annotations be grouped? */
function shouldGroup(a: NormalizedAnnotation, b: NormalizedAnnotation): boolean {
  // Must be same damage category to merge
  const sameType =
    a.damageType === b.damageType ||
    getDamageColor(a.damageType).hex === getDamageColor(b.damageType).hex;
  if (!sameType) return false;

  // High IoU = overlapping boxes
  if (iou(a, b) > 0.3) return true;

  // Close centers + same damage type = cluster
  if (centerDistance(a, b) < 0.12) return true;

  return false;
}

// ─── Severity Scoring ────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  severe: 4,
  high: 3,
  moderate: 2,
  medium: 2,
  minor: 1,
  low: 1,
  informational: 0,
};

function severityScore(sev: string): number {
  return SEVERITY_RANK[sev.toLowerCase()] ?? 1;
}

function highestSeverity(a: string, b: string): string {
  return severityScore(a) >= severityScore(b) ? a : b;
}

// ─── Claim Worthiness Score v2 ────────────────────────────────────────────────

/**
 * Score how claim-relevant a finding cluster is (0-1).
 * Higher = more important for the insurance claim.
 *
 * v2 scoring breakdown:
 * - Severity (0-0.30)
 * - Confidence (0-0.15)
 * - IRC code reference (0 or 0.12)
 * - Multiple detections (0-0.10)
 * - Damage type priority (0-0.10)
 * - Component weight multiplier (0.5x-1.0x applied to subtotal)
 * - Functional damage boost (1.5x for functional, 1.3x for structural/safety)
 * - Overview photo penalty (0.6x when photo is overview/context shot)
 *
 * Exported for use in annotation editor UI.
 */
export function claimWorthinessScore(
  cluster: {
    severity: string;
    confidence: number;
    ircCode: IRCCodeEntry | null;
    damageType: string;
    memberCount: number;
    damageCategory?: DamageCategory;
  },
  options?: {
    isOverviewPhoto?: boolean;
  }
): number {
  let score = 0;

  // Severity weight (0-0.30)
  score += (severityScore(cluster.severity) / 4) * 0.3;

  // Confidence weight (0-0.15)
  score += Math.min(cluster.confidence, 1) * 0.15;

  // Has IRC code reference = more legitimate (0 or 0.12)
  if (cluster.ircCode) score += 0.12;

  // Multiple detections = stronger evidence (0-0.10)
  score += Math.min(cluster.memberCount / 5, 1) * 0.1;

  // High-value damage types get bonus (0-0.10)
  const dt = cluster.damageType.toLowerCase();
  if (dt.includes("structural") || dt.includes("water_intrusion") || dt.includes("fire")) {
    score += 0.1;
  } else if (dt.includes("hail") || dt.includes("wind") || dt.includes("roof")) {
    score += 0.08;
  } else if (dt.includes("gutter") || dt.includes("siding") || dt.includes("flashing")) {
    score += 0.05;
  }

  // Component weight multiplier (0.5x-1.0x)
  const componentMult = getComponentWeight(cluster.damageType);
  score *= componentMult;

  // Functional damage boost (1.5x for functional, 1.3x for structural/safety)
  const category = cluster.damageCategory || classifyDamageCategory(cluster.damageType);
  if (category === "functional") score *= 1.5;
  else if (category === "structural" || category === "safety") score *= 1.3;

  // Overview photo penalty
  if (options?.isOverviewPhoto) score *= 0.6;

  return Math.min(score, 1);
}

// ─── Main Grouping Function ─────────────────────────────────────────────────

/**
 * Group overlapping/similar annotations into evidence clusters.
 * Returns deduplicated, ranked findings ready for PDF rendering.
 *
 * v2: Applies annotation suppression, assigns shape types, classifies
 * functional vs cosmetic, and uses component-weighted scoring.
 *
 * @param annotations Raw annotations from file_assets.metadata.annotations
 * @param maxPerPhoto Maximum clusters to return per photo (default 5)
 * @param minScore Minimum claim-worthiness score threshold (default 0.15)
 * @param isOverviewPhoto Whether this is an overview/context photo (reduces scores)
 */
export function groupEvidence(
  annotations: RawAnnotation[],
  maxPerPhoto = 5,
  minScore = 0.15,
  isOverviewPhoto = false
): EvidenceCluster[] {
  if (!annotations || annotations.length === 0) return [];

  // Step 0: Apply annotation suppression filters
  const { kept } = filterAnnotations(annotations);
  if (kept.length === 0) return [];

  // Step 1: Normalize all annotations to 0-1 coords
  const normalized = kept.map(normalizeAnnotation);

  // Step 2: Union-Find clustering
  const parent = normalized.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]; // path compression
      i = parent[i];
    }
    return i;
  }
  function union(i: number, j: number) {
    parent[find(i)] = find(j);
  }

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      if (shouldGroup(normalized[i], normalized[j])) {
        union(i, j);
      }
    }
  }

  // Step 3: Build cluster groups
  const groups = new Map<number, NormalizedAnnotation[]>();
  for (let i = 0; i < normalized.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(normalized[i]);
  }

  // Step 4: Build EvidenceCluster from each group
  const clusters: EvidenceCluster[] = [];
  let clusterIdx = 0;

  for (const members of groups.values()) {
    clusterIdx++;

    // Merge bounding boxes (union)
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let bestSeverity = "Low";
    let totalConfidence = 0;
    let bestCaption = "";

    for (const m of members) {
      minX = Math.min(minX, m.x);
      minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + m.w);
      maxY = Math.max(maxY, m.y + m.h);
      bestSeverity = highestSeverity(bestSeverity, m.severity);
      totalConfidence += m.confidence;
      if (m.caption.length > bestCaption.length) bestCaption = m.caption;
    }

    const primaryDamageType = members[0].damageType;
    const avgConfidence = totalConfidence / members.length;

    // Resolve IRC code from the primary damage type or first available ircCode
    const existingIrcCode = members.find((m) => m.ircCode)?.ircCode;
    const ircEntry = existingIrcCode
      ? resolveIRCCode(existingIrcCode)
      : resolveIRCCode(primaryDamageType);
    const ircCodeKey = existingIrcCode || (ircEntry ? primaryDamageType : null);

    const color = getDamageColor(primaryDamageType);

    // Build short label (max 24 chars)
    const rawLabel = primaryDamageType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const label = rawLabel.length > 24 ? rawLabel.slice(0, 21) + "..." : rawLabel;

    // v2: Assign shape type, damage category, and component
    const bbox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    const shapeType = selectAnnotationShape(primaryDamageType, bbox);
    const damageCategory = classifyDamageCategory(primaryDamageType);
    const component = componentLabelFromDamageType(primaryDamageType);

    const cluster: EvidenceCluster = {
      id: `cluster-${clusterIdx}`,
      damageType: primaryDamageType,
      bbox,
      severity: bestSeverity,
      confidence: avgConfidence,
      caption: bestCaption,
      ircCode: ircEntry,
      ircCodeKey,
      color,
      score: 0, // calculated below
      label,
      memberCount: members.length,
      shapeType,
      damageCategory,
      component,
    };

    cluster.score = claimWorthinessScore(cluster, { isOverviewPhoto });
    clusters.push(cluster);
  }

  // Step 5: Filter by minimum score and sort by claim-worthiness (highest first)
  return clusters
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPerPhoto);
}

/**
 * Map damage type to a human-readable component label.
 */
function componentLabelFromDamageType(damageType: string): string {
  const dt = damageType.toLowerCase();
  if (dt.includes("shingle")) return "asphalt shingle";
  if (dt.includes("tile")) return "roof tile";
  if (dt.includes("metal_roof") || dt.includes("metal_dent") || dt.includes("metal_puncture"))
    return "metal roofing panel";
  if (dt.includes("membrane")) return "membrane roofing";
  if (dt.includes("shake")) return "wood shake";
  if (dt.includes("slate")) return "slate tile";
  if (dt.includes("flashing")) return "roof flashing";
  if (dt.includes("drip_edge")) return "drip edge";
  if (dt.includes("vent")) return "roof ventilation";
  if (dt.includes("gutter")) return "gutter section";
  if (dt.includes("downspout")) return "downspout";
  if (dt.includes("siding")) return "exterior siding";
  if (dt.includes("stucco")) return "stucco wall surface";
  if (dt.includes("garage")) return "garage door panel";
  if (dt.includes("screen")) return "window screen";
  if (dt.includes("window")) return "window assembly";
  if (dt.includes("hvac") || dt.includes("condenser")) return "HVAC condenser unit";
  if (dt.includes("mailbox")) return "mailbox (soft metal indicator)";
  if (dt.includes("electrical") || dt.includes("meter")) return "electrical/meter box";
  if (dt.includes("fence")) return "fence section";
  if (dt.includes("deck")) return "deck surface";
  if (dt.includes("awning")) return "awning assembly";
  if (dt.includes("chimney")) return "chimney";
  if (dt.includes("skylight")) return "skylight";
  if (dt.includes("ceiling")) return "ceiling surface";
  if (dt.includes("wall")) return "interior wall";
  if (dt.includes("floor")) return "flooring";
  return "building component";
}

/**
 * Group evidence across ALL photos in a claim.
 * Returns a map of photoId → EvidenceCluster[].
 * v2: Detects overview photos and applies penalty scoring.
 */
export function groupEvidenceForClaim(
  photos: Array<{
    id: string;
    metadata: { annotations?: RawAnnotation[] } | null;
  }>,
  maxPerPhoto = 5,
  minScore = 0.15
): Map<string, EvidenceCluster[]> {
  const result = new Map<string, EvidenceCluster[]>();

  for (const photo of photos) {
    const annotations = photo.metadata?.annotations || [];
    // Detect overview photos by checking if any annotation covers >40% of image
    const isOverview = annotations.some((a) => isOverviewAnnotation(a));
    const clusters = groupEvidence(annotations, maxPerPhoto, minScore, isOverview);
    result.set(photo.id, clusters);
  }

  return result;
}

/**
 * Get unique IRC codes across all photos' clusters.
 * Returns deduplicated code entries for the report summary page.
 */
export function collectUniqueCodes(
  clusterMap: Map<string, EvidenceCluster[]>
): Map<string, IRCCodeEntry> {
  const codes = new Map<string, IRCCodeEntry>();

  for (const clusters of clusterMap.values()) {
    for (const cluster of clusters) {
      if (cluster.ircCode && cluster.ircCodeKey && !codes.has(cluster.ircCodeKey)) {
        codes.set(cluster.ircCodeKey, cluster.ircCode);
      }
    }
  }

  return codes;
}

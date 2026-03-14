/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNOTATION DATA MODEL STANDARD
 *
 * Canonical types for all annotation data across SkaiScraper:
 *  - AI photo detection (photo-annotate/route.ts)
 *  - Manual annotations (PhotoAnnotator.tsx)
 *  - Evidence grouping (evidence-grouping.ts)
 *  - PDF report rendering (damage-report/route.ts)
 *  - Annotation editor UI (PhotoDetailModal.tsx)
 *
 * All coordinates use the NORMALIZED 0-1 system (top-left origin).
 * Legacy coordinate systems (%, px) are converted on ingestion.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─── Shape Types ─────────────────────────────────────────────────────────────

/**
 * Annotation shape type determines how the annotation is rendered.
 *
 * - circle: point impacts (hail strikes, nail pops, punctures, granule loss)
 * - rectangle: linear/area defects (cracks, lifted edges, seam failures)
 * - outline: field conditions (widespread staining, ponding, moss coverage)
 * - freehand: user-drawn irregular shapes (manual annotations)
 * - text: text-only annotations with no bounding shape
 */
export type AnnotationShapeType = "circle" | "rectangle" | "outline" | "freehand" | "text";

// ─── Severity Levels ─────────────────────────────────────────────────────────

export type SeverityLevel =
  | "critical"
  | "severe"
  | "high"
  | "moderate"
  | "medium"
  | "minor"
  | "low"
  | "informational";

export const SEVERITY_RANK: Record<SeverityLevel, number> = {
  critical: 4,
  severe: 4,
  high: 3,
  moderate: 2,
  medium: 2,
  minor: 1,
  low: 1,
  informational: 0,
};

// ─── Functional vs Cosmetic ──────────────────────────────────────────────────

export type DamageCategory = "functional" | "cosmetic" | "structural" | "safety";

// ─── Annotation Source ───────────────────────────────────────────────────────

export type AnnotationSource =
  | "yolo" // Roboflow YOLO detection
  | "gpt4o" // GPT-4o vision detection
  | "manual" // User-drawn annotation
  | "imported" // Imported from external tool
  | "merged"; // Created by evidence grouping merge

// ─── Core Annotation Interface ───────────────────────────────────────────────

/**
 * Normalized annotation — the canonical format stored in file_assets.metadata.
 *
 * All coordinates are in 0-1 normalized space (top-left origin).
 * x, y = top-left corner of bounding box
 * w, h = width and height
 */
export interface NormalizedAnnotation {
  /** Unique annotation ID (cuid2) */
  id: string;

  // ─── Geometry (0-1 normalized) ────────────────────────────────────────────
  /** Top-left X coordinate (0-1) */
  x: number;
  /** Top-left Y coordinate (0-1) */
  y: number;
  /** Width (0-1) */
  w: number;
  /** Height (0-1) */
  h: number;
  /** Center X (computed) */
  cx: number;
  /** Center Y (computed) */
  cy: number;

  // ─── Shape ────────────────────────────────────────────────────────────────
  /** How this annotation should be rendered */
  shapeType: AnnotationShapeType;

  // ─── Classification ───────────────────────────────────────────────────────
  /** AI detection label (e.g., "hail_impact", "wind_lifted", "gutter_dent") */
  damageType: string;
  /** Severity classification */
  severity: SeverityLevel | string;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Whether damage is functional or cosmetic */
  damageCategory?: DamageCategory;

  // ─── Content ──────────────────────────────────────────────────────────────
  /** Human-readable caption */
  caption: string;
  /** Short label for PDF callout (max 24 chars) */
  label?: string;
  /** IRC/IBC code key reference */
  ircCode: string | null;

  // ─── Metadata ─────────────────────────────────────────────────────────────
  /** Where this annotation came from */
  source?: AnnotationSource;
  /** Color hex for rendering */
  color?: string;
  /** Timestamp of creation */
  createdAt?: string;
  /** User who created/edited (for manual annotations) */
  createdBy?: string;
  /** If suppressed, reason why */
  suppressionReason?: string | null;
}

// ─── Raw Annotation (Legacy/Ingestion Format) ────────────────────────────────

/**
 * Raw annotation as stored in legacy data or received from AI detectors.
 * May use any coordinate system. Must be normalized before use.
 */
export interface RawAnnotation {
  id?: string;
  type?: string;
  shapeType?: AnnotationShapeType;
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
  source?: AnnotationSource;
  /** If true, x/y/w/h are in 0-100 percentage space */
  isPercentage?: boolean;
}

// ─── Evidence Cluster ────────────────────────────────────────────────────────

/**
 * A cluster of grouped annotations representing a single damage finding.
 * Created by the evidence grouping engine.
 */
export interface EvidenceCluster {
  /** Unique cluster ID */
  id: string;
  /** Primary damage type for this cluster */
  damageType: string;
  /** Merged bounding box (union of all members, 0-1 normalized) */
  bbox: { x: number; y: number; w: number; h: number };
  /** Highest severity in the cluster */
  severity: string;
  /** Average confidence across cluster members */
  confidence: number;
  /** Professional caption for this finding */
  caption: string;
  /** Resolved IRC code entry */
  ircCode: { code: string; title: string; text: string } | null;
  /** IRC code category key */
  ircCodeKey: string | null;
  /** Damage color for rendering */
  color: { r: number; g: number; b: number; hex: string; label: string };
  /** Claim-worthiness score (0-1) */
  score: number;
  /** Short label for PDF annotation (max 24 chars) */
  label: string;
  /** Number of raw detections merged into this cluster */
  memberCount: number;
  /** Annotation shape type for PDF rendering */
  shapeType?: AnnotationShapeType;
  /** Whether the damage is functional or cosmetic */
  damageCategory?: DamageCategory;
  /** Building component being annotated */
  component?: string;
}

// ─── Annotation Edit Event ───────────────────────────────────────────────────

/**
 * Tracks changes to annotations for the feedback loop.
 */
export interface AnnotationEdit {
  annotationId: string;
  photoId: string;
  claimId: string;
  editType: "create" | "update" | "delete" | "approve" | "reject";
  before?: Partial<NormalizedAnnotation>;
  after?: Partial<NormalizedAnnotation>;
  editedBy: string;
  editedAt: string;
  reason?: string;
}

// ─── Report Finding (for Review Screen) ──────────────────────────────────────

/**
 * A finding as it appears in the report review screen.
 * Extends EvidenceCluster with editability and inclusion control.
 */
export interface ReportFinding extends EvidenceCluster {
  /** Whether to include this finding in the final report */
  included: boolean;
  /** User-edited caption (overrides generated caption) */
  editedCaption?: string;
  /** User-edited severity (overrides AI severity) */
  editedSeverity?: string;
  /** Photo ID this finding belongs to */
  photoId: string;
  /** Photo filename for display */
  photoFilename: string;
  /** Photo URL for thumbnail */
  photoUrl: string;
}

// ─── Inspector Profile ───────────────────────────────────────────────────────

/**
 * Inspector profile data injected into reports.
 */
export interface InspectorProfile {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  bio?: string;
  licenseNumber?: string;
  licenseState?: string;
  certifications?: string[];
  headshotUrl?: string;
}

// ─── Report Options ──────────────────────────────────────────────────────────

/**
 * Full set of options for report generation.
 */
export interface ReportOptions {
  includePhotos: boolean;
  includeAnnotations: boolean;
  format: "pdf";
  /** Caption detail level */
  captionStyle: "full" | "concise" | "code-only";
  /** Photo ordering strategy */
  photoOrder: "claim-value" | "upload-order" | "severity";
  /** Page layout for evidence */
  layout: "single" | "double";
  /** Print-safe mode (higher contrast, no edge-bleed) */
  printSafe: boolean;
  /** Include repairability language */
  includeRepairability: boolean;
  /** Include building code references */
  includeBuildingCodes: boolean;
  /** Inspector profile to use */
  inspectorId?: string;
  /** Findings that have been reviewed/edited */
  reviewedFindings?: ReportFinding[];
}

// ─── Coordinate Helpers ──────────────────────────────────────────────────────

/**
 * Normalize any coordinate to 0-1 range.
 *
 * Handles three input formats:
 * 1. Percentage (0-100) when isPercentage=true
 * 2. Pixel values (>10) — normalized against reference dimensions
 * 3. Already normalized (0-1)
 */
export function normalizeCoordinate(
  value: number,
  reference: number,
  isPercentage: boolean
): number {
  if (isPercentage) return value / 100;
  if (value > 10) return value / reference;
  return value;
}

/**
 * Compute center point from bounding box.
 */
export function bboxCenter(box: { x: number; y: number; w: number; h: number }): {
  cx: number;
  cy: number;
} {
  return { cx: box.x + box.w / 2, cy: box.y + box.h / 2 };
}

/**
 * Compute IoU (Intersection over Union) for two bounding boxes.
 */
export function computeIoU(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): number {
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

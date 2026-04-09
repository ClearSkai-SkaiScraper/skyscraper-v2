/**
 * DamageBoxOverlay — Enhanced damage annotation rendering
 *
 * Renders YOLO/AI bounding boxes on top of photos with:
 * - Severity-coded colours (red/orange/yellow/blue)
 * - Confidence percentage badges with High/Medium/Low indicators
 * - Source-model badges: YOLO Verified, AI Inferred, Grouped Summary
 * - Compact mode for thumbnails, full mode for lightboxes
 * - Smart label hiding: small boxes (<12%) show only severity dot to reduce clutter
 * - Anti-overlap label placement: labels auto-arrange to avoid stacking
 * - Dismissable labels: click X to hide individual annotation labels
 * - "No detector-verified location" state when YOLO finds nothing
 *
 * Coordinate system: 0–1 normalised fractions  (or 0-100 percentages from Roboflow)
 */

"use client";

import { AlertTriangle, CheckCircle2, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DamageBox {
  /** X position (0–1 fraction or 0–100 percentage) */
  x: number;
  /** Y position (0–1 fraction or 0–100 percentage) */
  y: number;
  /** Width (0–1 fraction or 0–100 percentage) */
  w: number;
  /** Height (0–1 fraction or 0–100 percentage) */
  h: number;
  /** Human-readable damage label */
  label?: string;
  /** Confidence score 0–1 */
  score?: number;
  /** Severity level */
  severity?: "Critical" | "High" | "Medium" | "Low" | string;
  /** Which model produced this box: roboflow_yolo (verified), gpt4 (inferred), grouped (summary) */
  sourceModel?: "roboflow_yolo" | "gpt4" | "grouped" | string;
  /** Is this a grouped/summary annotation? */
  isGrouped?: boolean;
}

export interface DamageBoxOverlayProps {
  boxes: DamageBox[];
  /** "compact" hides labels (thumbnails), "full" shows everything (lightbox) */
  mode?: "compact" | "full";
  /** Whether coordinates are 0–100 (Roboflow) or 0–1 (normalised). Auto-detected if omitted. */
  coordScale?: "percent" | "fraction";
  /** Additional className on the wrapper */
  className?: string;
  /** Allow dismissing labels with X button */
  dismissable?: boolean;
  /** Show "no verified locations" warning when true and no YOLO boxes exist */
  showUnverifiedWarning?: boolean;
  /** Show all labels (true) or grouped labels only (false) */
  showAllLabels?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour maps
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string }> = {
  Critical: {
    border: "border-red-500",
    bg: "bg-red-500/15",
    badge: "bg-red-600 text-white",
  },
  High: {
    border: "border-orange-500",
    bg: "bg-orange-500/15",
    badge: "bg-orange-600 text-white",
  },
  Medium: {
    border: "border-amber-400",
    bg: "bg-amber-400/15",
    badge: "bg-amber-500 text-white",
  },
  Low: {
    border: "border-sky-400",
    bg: "bg-sky-400/15",
    badge: "bg-sky-500 text-white",
  },
};

const DEFAULT_STYLE = SEVERITY_STYLES.High; // fallback if no severity provided

// ─────────────────────────────────────────────────────────────────────────────
// Anti-overlap label placement
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_HEIGHT_PCT = 2.5; // approx height of a label pill in % of container
const LABEL_GAP_PCT = 0.5; // gap between stacked labels

interface LabelPlacement {
  /** Offset from default position in percentage units */
  offsetY: number;
  /** Which side to place the label: "top" (above box) or "bottom" (below box) */
  side: "top" | "bottom";
}

/**
 * Compute non-overlapping label placements for all boxes.
 * Uses a greedy sweep: sort by box top-Y, place each label,
 * and bump down/flip to bottom if it collides with a previously placed label.
 */
function computeLabelPlacements(
  boxes: Array<{ pctX: number; pctY: number; pctW: number; pctH: number; showLabel: boolean }>
): LabelPlacement[] {
  const placements: LabelPlacement[] = boxes.map(() => ({ offsetY: 0, side: "top" }));

  // Collect occupied label rects (in % space)
  const occupied: Array<{ left: number; right: number; top: number; bottom: number }> = [];

  // Process boxes sorted by Y position (top to bottom)
  const indices = boxes.map((_, i) => i);
  indices.sort((a, b) => boxes[a].pctY - boxes[b].pctY);

  for (const i of indices) {
    const box = boxes[i];
    if (!box.showLabel) continue;

    // Estimate label width as ~20% of container (labels are whitespace-nowrap, ~120px on 600px container)
    const labelW = Math.max(box.pctW, 15);
    const labelH = LABEL_HEIGHT_PCT;

    // Default: place above box
    let labelTop = box.pctY - labelH - LABEL_GAP_PCT;
    let labelLeft = box.pctX;
    let side: "top" | "bottom" = "top";

    // Check collisions with already-placed labels
    let attempts = 0;
    while (attempts < 6) {
      const candidate = {
        left: labelLeft,
        right: labelLeft + labelW,
        top: labelTop,
        bottom: labelTop + labelH,
      };

      const collision = occupied.some(
        (o) =>
          candidate.left < o.right &&
          candidate.right > o.left &&
          candidate.top < o.bottom &&
          candidate.bottom > o.top
      );

      if (!collision) break;

      attempts++;
      if (attempts <= 3) {
        // Try stacking further up
        labelTop -= labelH + LABEL_GAP_PCT;
      } else if (attempts === 4) {
        // Try below the box instead
        side = "bottom";
        labelTop = box.pctY + box.pctH + LABEL_GAP_PCT;
      } else {
        // Stack further below
        labelTop += labelH + LABEL_GAP_PCT;
      }
    }

    // Clamp to container bounds (0-100%)
    if (labelTop < 0) {
      side = "bottom";
      labelTop = box.pctY + box.pctH + LABEL_GAP_PCT;
    }
    if (labelTop + labelH > 100) {
      labelTop = 100 - labelH;
    }

    const offsetY =
      side === "top"
        ? labelTop - (box.pctY - labelH - LABEL_GAP_PCT)
        : labelTop - (box.pctY + box.pctH + LABEL_GAP_PCT);

    placements[i] = { offsetY, side };
    occupied.push({
      left: labelLeft,
      right: labelLeft + labelW,
      top: labelTop,
      bottom: labelTop + labelH,
    });
  }

  return placements;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DamageBoxOverlay({
  boxes,
  mode = "full",
  coordScale,
  className,
  dismissable = true,
  showUnverifiedWarning = true,
  showAllLabels = true,
}: DamageBoxOverlayProps) {
  // Track which labels have been dismissed
  const [hiddenLabels, setHiddenLabels] = useState<Set<number>>(new Set());

  const dismissLabel = (index: number) => {
    setHiddenLabels((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  if (!boxes || boxes.length === 0) return null;

  // Check if any boxes are YOLO-verified
  const hasYoloBoxes = boxes.some((b) => b.sourceModel === "roboflow_yolo");
  const hasGptBoxes = boxes.some((b) => b.sourceModel === "gpt4" || !b.sourceModel);

  // Determine detection source for summary
  const detectionSource =
    hasYoloBoxes && hasGptBoxes ? "Mixed" : hasYoloBoxes ? "YOLO Verified" : "AI Inferred";

  // Minimum box size (percentage) to show labels - prevents cluttering small boxes
  const MIN_SIZE_FOR_LABELS = 12; // 12% of image width/height

  // Pre-compute box positions for overlap detection
  const boxPositions = boxes.map((box) => {
    const scale =
      coordScale === "percent" ||
      (!coordScale && (box.x > 1 || box.y > 1 || box.w > 1 || box.h > 1))
        ? 0.01
        : 1;
    const pctX = box.x * scale * 100;
    const pctY = box.y * scale * 100;
    const pctW = box.w * scale * 100;
    const pctH = box.h * scale * 100;
    const isLargeEnough = pctW >= MIN_SIZE_FOR_LABELS || pctH >= MIN_SIZE_FOR_LABELS;
    return {
      pctX,
      pctY,
      pctW,
      pctH,
      showLabel: mode === "full" && isLargeEnough && !hiddenLabels.has(boxes.indexOf(box)),
    };
  });

  // Compute anti-overlap placements
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const placements = useMemo(
    () => computeLabelPlacements(boxPositions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(boxPositions)]
  );

  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      {boxes.map((box, i) => {
        const { pctX, pctY, pctW, pctH, showLabel } = boxPositions[i];
        const isLargeEnough = pctW >= MIN_SIZE_FOR_LABELS || pctH >= MIN_SIZE_FOR_LABELS;
        const isLabelHidden = hiddenLabels.has(i);

        const sev = normaliseSeverity(box.severity);
        const style = SEVERITY_STYLES[sev] || DEFAULT_STYLE;
        const isYolo = box.sourceModel === "roboflow_yolo";
        const isGrouped = box.isGrouped || box.sourceModel === "grouped";
        const placement = placements[i];

        // Confidence level indicator
        const confidenceLevel =
          box.score != null
            ? box.score >= 0.8
              ? "High"
              : box.score >= 0.5
                ? "Medium"
                : "Low"
            : null;

        // Low confidence GPT-only boxes get dashed border
        const isLowConfidenceGpt = !isYolo && box.score != null && box.score < 0.5;

        // Compute label position style
        const labelStyle: React.CSSProperties =
          placement.side === "bottom"
            ? { top: "100%", left: 0, marginTop: `${(placement.offsetY || 0) + 2}px` }
            : { bottom: "100%", left: 0, marginBottom: `${2 - (placement.offsetY || 0)}px` };

        // Determine if label should be shown:
        // - Always show if showAllLabels is true
        // - Otherwise only show for YOLO-verified or grouped boxes (reduce clutter)
        const shouldShowLabel = showAllLabels || isYolo || isGrouped;

        return (
          <div
            key={i}
            className={cn(
              "absolute border-2 transition-colors",
              style.border,
              style.bg,
              // Dashed border for low-confidence GPT-only detections
              isLowConfidenceGpt && "border-dashed opacity-70"
            )}
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              width: `${pctW}%`,
              height: `${pctH}%`,
            }}
          >
            {/* ── Full mode: label pill with source badge + confidence ─────────────────── */}
            {mode === "full" &&
              isLargeEnough &&
              !isLabelHidden &&
              shouldShowLabel &&
              (box.label || box.score != null) && (
                <span
                  className={cn(
                    "pointer-events-auto absolute z-10 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-sm",
                    style.badge
                  )}
                  style={labelStyle}
                >
                  {/* Source badge: YOLO verified (green check), AI inferred (sparkle), Grouped (multiple) */}
                  {isYolo ? (
                    <span title="YOLO Verified - Precise location detected">
                      <CheckCircle2
                        className="h-3 w-3 text-green-300"
                      />
                    </span>
                  ) : isGrouped ? (
                    <span
                      className="inline-block h-3 w-3 rounded border border-white/50 bg-purple-400 text-center text-[8px] leading-3"
                      title="Grouped Summary"
                    >
                      G
                    </span>
                  ) : (
                    <span title={isLowConfidenceGpt ? "AI Inferred - Low confidence" : "AI Inferred"}>
                      <Sparkles
                        className={cn(
                          "h-3 w-3",
                          isLowConfidenceGpt ? "text-yellow-300" : "text-blue-300"
                        )}
                      />
                    </span>
                  )}

                  {box.label && <span>{box.label}</span>}

                  {/* Confidence with level indicator */}
                  {box.score != null && (
                    <span
                      className={cn("opacity-80", confidenceLevel === "Low" && "text-yellow-200")}
                    >
                      {Math.round(box.score * 100)}%
                    </span>
                  )}

                  {/* Dismiss button */}
                  {dismissable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissLabel(i);
                      }}
                      className="ml-0.5 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
                      title="Hide this label"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              )}

            {/* ── Full mode: small box indicator (tiny dot for boxes too small for labels) ─────────────────── */}
            {mode === "full" && !isLargeEnough && (
              <span
                className={cn(
                  "absolute -right-1 -top-1 h-2 w-2 rounded-full border border-white shadow",
                  style.badge
                )}
                title={box.label || "Damage detected"}
              />
            )}

            {/* ── Compact mode: tiny corner dot showing severity colour ── */}
            {mode === "compact" && (
              <span
                className={cn(
                  "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white shadow",
                  style.badge
                )}
              />
            )}
          </div>
        );
      })}

      {/* ── Legend (full mode only, when there are ≥2 boxes) ────────── */}
      {mode === "full" && boxes.length >= 1 && (
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
          {/* No verified location warning */}
          {showUnverifiedWarning && !hasYoloBoxes && boxes.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/90 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
              <AlertTriangle className="h-3 w-3" />
              <span>Damage suspected — no verified location</span>
            </div>
          )}

          {/* Detection summary */}
          <div className="flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
            <span className="font-medium">
              {boxes.length} detection{boxes.length !== 1 ? "s" : ""}
            </span>

            {/* Detection source badge */}
            <span
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5",
                hasYoloBoxes ? "bg-green-600/80" : "bg-blue-600/80"
              )}
            >
              {hasYoloBoxes ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : (
                <Sparkles className="h-2.5 w-2.5" />
              )}
              {detectionSource}
            </span>

            {hiddenLabels.size > 0 && (
              <button
                className="pointer-events-auto underline opacity-80 hover:opacity-100"
                onClick={() => setHiddenLabels(new Set())}
                title="Show all hidden labels"
              >
                Show {hiddenLabels.size} hidden
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise various severity strings to our canonical set */
function normaliseSeverity(raw?: string): string {
  if (!raw) return "High";
  const lc = raw.toLowerCase();
  if (lc === "critical" || lc === "severe") return "Critical";
  if (lc === "high" || lc === "major") return "High";
  if (lc === "medium" || lc === "moderate") return "Medium";
  if (lc === "low" || lc === "minor" || lc === "none") return "Low";
  return "High";
}

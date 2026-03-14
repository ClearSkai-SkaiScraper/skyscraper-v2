/**
 * DamageBoxOverlay — Enhanced damage annotation rendering
 *
 * Renders YOLO/AI bounding boxes on top of photos with:
 * - Severity-coded colours (red/orange/yellow/blue)
 * - Confidence percentage badges
 * - Source-model indicator (YOLO ● vs GPT-4)
 * - Compact mode for thumbnails, full mode for lightboxes
 * - Smart label hiding: small boxes (<12%) show only severity dot to reduce clutter
 *
 * Coordinate system: 0–1 normalised fractions  (or 0-100 percentages from Roboflow)
 */

"use client";

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
  /** Which model produced this box */
  sourceModel?: "roboflow_yolo" | "gpt4" | string;
}

export interface DamageBoxOverlayProps {
  boxes: DamageBox[];
  /** "compact" hides labels (thumbnails), "full" shows everything (lightbox) */
  mode?: "compact" | "full";
  /** Whether coordinates are 0–100 (Roboflow) or 0–1 (normalised). Auto-detected if omitted. */
  coordScale?: "percent" | "fraction";
  /** Additional className on the wrapper */
  className?: string;
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
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DamageBoxOverlay({
  boxes,
  mode = "full",
  coordScale,
  className,
}: DamageBoxOverlayProps) {
  if (!boxes || boxes.length === 0) return null;

  // Minimum box size (percentage) to show labels - prevents cluttering small boxes
  const MIN_SIZE_FOR_LABELS = 12; // 12% of image width/height

  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      {boxes.map((box, i) => {
        // Auto-detect coordinate scale: if any value > 1, treat as 0-100
        const scale =
          coordScale === "percent" ||
          (!coordScale && (box.x > 1 || box.y > 1 || box.w > 1 || box.h > 1))
            ? 0.01
            : 1;

        const pctX = box.x * scale * 100;
        const pctY = box.y * scale * 100;
        const pctW = box.w * scale * 100;
        const pctH = box.h * scale * 100;

        // Determine if box is large enough to show labels
        const isLargeEnough = pctW >= MIN_SIZE_FOR_LABELS || pctH >= MIN_SIZE_FOR_LABELS;

        const sev = normaliseSeverity(box.severity);
        const style = SEVERITY_STYLES[sev] || DEFAULT_STYLE;
        const isYolo = box.sourceModel === "roboflow_yolo";

        return (
          <div
            key={i}
            className={cn("absolute border-2 transition-colors", style.border, style.bg)}
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              width: `${pctW}%`,
              height: `${pctH}%`,
            }}
          >
            {/* ── Full mode: label pill + confidence (only on large-enough boxes) ─────────────────── */}
            {mode === "full" && isLargeEnough && (box.label || box.score != null) && (
              <span
                className={cn(
                  "absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-sm",
                  style.badge
                )}
              >
                {/* YOLO dot indicator */}
                {isYolo && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-green-300"
                    title="YOLO detection"
                  />
                )}

                {box.label && <span>{box.label}</span>}

                {box.score != null && (
                  <span className="opacity-80">{Math.round(box.score * 100)}%</span>
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
      {mode === "full" && boxes.length >= 2 && (
        <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
          <span className="font-medium">{boxes.length} detections</span>
          {boxes.some((b) => b.sourceModel === "roboflow_yolo") && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              YOLO
            </span>
          )}
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

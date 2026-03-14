/**
 * Photo overlay component for damage detection boxes
 * Shows detected damage with labels and allows manual adjustment
 * - Anti-overlap label placement prevents labels from stacking
 * - Dismissable X buttons to hide individual labels
 */
import { X } from "lucide-react";
import { useMemo, useState } from "react";

export type DamageBox = {
  x: number; // 0-1 relative
  y: number;
  w: number;
  h: number;
  label: string;
  score?: number;
};

type PhotoOverlayProps = {
  url: string;
  boxes: DamageBox[];
  onBoxesChange?: (boxes: DamageBox[]) => void;
  showControls?: boolean;
};

// ─── Anti-overlap label placement ────────────────────────────────────────────

const LABEL_HEIGHT = 24; // px approx
const LABEL_GAP = 4; // px between stacked labels

interface LabelRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Compute non-overlapping label positions.
 * Returns an array of offsets (in px) from the default -24px position.
 */
function computeLabelOffsets(
  boxes: DamageBox[],
  containerWidth: number,
  containerHeight: number,
  hiddenSet: Set<number>
): Array<{ offsetPx: number; side: "top" | "bottom" }> {
  const results: Array<{ offsetPx: number; side: "top" | "bottom" }> = boxes.map(() => ({
    offsetPx: 0,
    side: "top" as const,
  }));
  const occupied: LabelRect[] = [];

  // Sort indices by Y position
  const indices = boxes.map((_, i) => i);
  indices.sort((a, b) => boxes[a].y - boxes[b].y);

  for (const i of indices) {
    if (hiddenSet.has(i)) continue;
    const box = boxes[i];
    const boxTopPx = box.y * containerHeight;
    const boxBottomPx = (box.y + box.h) * containerHeight;
    const boxLeftPx = box.x * containerWidth;
    // Estimate label width: ~120px or box width, whichever is larger
    const labelW = Math.max(box.w * containerWidth, 120);

    // Default: above box
    let labelTop = boxTopPx - LABEL_HEIGHT - LABEL_GAP;
    let side: "top" | "bottom" = "top";

    let attempts = 0;
    while (attempts < 6) {
      const candidate: LabelRect = {
        left: boxLeftPx,
        right: boxLeftPx + labelW,
        top: labelTop,
        bottom: labelTop + LABEL_HEIGHT,
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
        labelTop -= LABEL_HEIGHT + LABEL_GAP;
      } else if (attempts === 4) {
        side = "bottom";
        labelTop = boxBottomPx + LABEL_GAP;
      } else {
        labelTop += LABEL_HEIGHT + LABEL_GAP;
      }
    }

    // Clamp
    if (labelTop < 0) {
      side = "bottom";
      labelTop = boxBottomPx + LABEL_GAP;
    }

    const defaultTop =
      side === "top" ? boxTopPx - LABEL_HEIGHT - LABEL_GAP : boxBottomPx + LABEL_GAP;
    results[i] = { offsetPx: labelTop - defaultTop, side };
    occupied.push({
      left: boxLeftPx,
      right: boxLeftPx + labelW,
      top: labelTop,
      bottom: labelTop + LABEL_HEIGHT,
    });
  }

  return results;
}

export default function PhotoOverlay({
  url,
  boxes,
  onBoxesChange,
  showControls = true,
}: PhotoOverlayProps) {
  const [localBoxes, setLocalBoxes] = useState(boxes);
  const [hiddenLabels, setHiddenLabels] = useState<Set<number>>(new Set());
  // Use a reasonable default container size for placement calc (actual rendered size)
  const containerWidth = 800;
  const containerHeight = 600;

  const labelOffsets = useMemo(
    () => computeLabelOffsets(localBoxes, containerWidth, containerHeight, hiddenLabels),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localBoxes, hiddenLabels]
  );

  const removeBox = (index: number) => {
    const updated = localBoxes.filter((_, i) => i !== index);
    setLocalBoxes(updated);
    onBoxesChange?.(updated);
  };

  const hideLabel = (index: number) => {
    setHiddenLabels((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  return (
    <div className="relative inline-block">
      <img
        src={url}
        alt="Inspection photo with damage overlay"
        className="h-auto w-full rounded-lg"
        crossOrigin="anonymous"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/img/image-fallback.png";
        }}
      />

      {/* Damage boxes */}
      {localBoxes.map((box, i) => {
        const isLabelHidden = hiddenLabels.has(i);
        const placement = labelOffsets[i];

        const labelStyle: React.CSSProperties =
          placement.side === "bottom"
            ? { top: "100%", left: 0, marginTop: `${(placement.offsetPx || 0) + 4}px` }
            : { bottom: "100%", left: 0, marginBottom: `${4 - (placement.offsetPx || 0)}px` };

        return (
          <div
            key={i}
            className="pointer-events-none absolute rounded-lg border-2 border-red-500"
            // eslint-disable-next-line react/forbid-dom-props
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
          >
            {!isLabelHidden && (
              <div
                className="pointer-events-auto absolute z-10 flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-xs text-white"
                style={labelStyle}
              >
                {box.label.replace(/_/g, " ")}
                {box.score && <span className="opacity-75">({Math.round(box.score * 100)}%)</span>}
                {/* Hide label button (X) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    hideLabel(i);
                  }}
                  className="ml-0.5 rounded p-0.5 opacity-70 transition-opacity hover:bg-red-600 hover:opacity-100"
                  title="Hide this label"
                >
                  <X className="h-3 w-3" />
                </button>
                {/* Remove box entirely */}
                {showControls && onBoxesChange && (
                  <button
                    onClick={() => removeBox(i)}
                    className="ml-0.5 rounded p-0.5 hover:bg-red-600"
                    title="Remove damage box"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Show all button when labels are hidden */}
      {hiddenLabels.size > 0 && (
        <div className="absolute bottom-2 right-2 z-20">
          <button
            className="pointer-events-auto rounded bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm hover:bg-black/80"
            onClick={() => setHiddenLabels(new Set())}
          >
            Show {hiddenLabels.size} hidden label{hiddenLabels.size > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

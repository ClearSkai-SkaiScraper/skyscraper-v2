"use client";

import { Circle, Maximize2, Move, Square, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AnnotationBox {
  x: number; // 0-1 normalized
  y: number;
  w: number;
  h: number;
  label?: string;
  severity?: string;
  shapeType?: "circle" | "rectangle" | "outline";
  color?: { r: number; g: number; b: number };
  index: number;
}

interface AnnotationOverlayEditorProps {
  photoUrl: string;
  annotations: AnnotationBox[];
  selectedIndex?: number;
  onSelect: (index: number | null) => void;
  onMove: (index: number, x: number, y: number) => void;
  onResize: (index: number, w: number, h: number) => void;
  onDelete: (index: number) => void;
  onAdd: (box: Omit<AnnotationBox, "index">) => void;
  readOnly?: boolean;
}

type DrawMode = "select" | "rectangle" | "circle" | "outline";

export function AnnotationOverlayEditor({
  photoUrl,
  annotations,
  selectedIndex,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onAdd,
  readOnly = false,
}: AnnotationOverlayEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("select");
  const [zoom, setZoom] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null);
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );

  const getRelativeCoords = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly || drawMode === "select") return;
    const coords = getRelativeCoords(e);
    setDrawing({ startX: coords.x, startY: coords.y });
    setDrawRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const coords = getRelativeCoords(e);
    const x = Math.min(drawing.startX, coords.x);
    const y = Math.min(drawing.startY, coords.y);
    const w = Math.abs(coords.x - drawing.startX);
    const h = Math.abs(coords.y - drawing.startY);
    setDrawRect({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (drawing && drawRect && drawRect.w > 0.02 && drawRect.h > 0.02) {
      onAdd({
        ...drawRect,
        shapeType:
          drawMode === "circle" ? "circle" : drawMode === "outline" ? "outline" : "rectangle",
        label: "Manual annotation",
        severity: "moderate",
      });
    }
    setDrawing(null);
    setDrawRect(null);
  };

  const handleAnnotationClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (drawMode === "select") {
      onSelect(selectedIndex === idx ? null : idx);
    }
  };

  const handleBackgroundClick = () => {
    if (drawMode === "select") {
      onSelect(null);
    }
  };

  const renderAnnotation = (ann: AnnotationBox) => {
    const isSelected = ann.index === selectedIndex;
    const color = ann.color
      ? `rgb(${Math.round(ann.color.r * 255)}, ${Math.round(ann.color.g * 255)}, ${Math.round(ann.color.b * 255)})`
      : "#3b82f6";

    const style: React.CSSProperties = {
      position: "absolute",
      left: `${ann.x * 100}%`,
      top: `${ann.y * 100}%`,
      width: `${ann.w * 100}%`,
      height: `${ann.h * 100}%`,
      cursor: drawMode === "select" ? "pointer" : "crosshair",
      zIndex: isSelected ? 20 : 10,
    };

    const shapeType = ann.shapeType || "rectangle";

    return (
      <div
        key={ann.index}
        style={style}
        onClick={(e) => handleAnnotationClick(e, ann.index)}
        className="group"
      >
        {shapeType === "circle" ? (
          <div
            className={cn(
              "h-full w-full rounded-full border-2 transition-all",
              isSelected && "shadow-lg ring-2 ring-white"
            )}
            style={{
              borderColor: color,
              backgroundColor: `${color}15`,
            }}
          />
        ) : shapeType === "outline" ? (
          <div
            className={cn(
              "h-full w-full border-2 border-dashed transition-all",
              isSelected && "shadow-lg ring-2 ring-white"
            )}
            style={{
              borderColor: color,
            }}
          />
        ) : (
          <div
            className={cn(
              "h-full w-full border-2 transition-all",
              isSelected && "shadow-lg ring-2 ring-white"
            )}
            style={{
              borderColor: color,
              backgroundColor: `${color}15`,
            }}
          />
        )}

        {/* Index badge */}
        <div
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
          style={{ backgroundColor: color }}
        >
          {ann.index + 1}
        </div>

        {/* Label on hover */}
        {ann.label && (
          <div className="absolute -bottom-6 left-0 z-30 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            {ann.label}
          </div>
        )}

        {/* Resize handles when selected */}
        {isSelected && !readOnly && (
          <>
            <div className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-full border-2 border-blue-500 bg-white" />
            <div className="absolute -bottom-1 left-1/2 -ml-1 h-2 w-2 cursor-s-resize rounded-full border border-blue-500 bg-white" />
            <div className="absolute -right-1 top-1/2 -mt-1 h-2 w-2 cursor-e-resize rounded-full border border-blue-500 bg-white" />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          <Button
            variant={drawMode === "select" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDrawMode("select")}
            className="h-7 text-xs"
          >
            <Move className="mr-1 h-3 w-3" />
            Select
          </Button>
          <Button
            variant={drawMode === "rectangle" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDrawMode("rectangle")}
            className="h-7 text-xs"
          >
            <Square className="mr-1 h-3 w-3" />
            Rectangle
          </Button>
          <Button
            variant={drawMode === "circle" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDrawMode("circle")}
            className="h-7 text-xs"
          >
            <Circle className="mr-1 h-3 w-3" />
            Circle
          </Button>
          <Button
            variant={drawMode === "outline" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDrawMode("outline")}
            className="h-7 text-xs"
          >
            <Maximize2 className="mr-1 h-3 w-3" />
            Outline
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="h-7"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="w-10 text-center text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="h-7"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
          {selectedIndex != null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(selectedIndex)}
              className="h-7 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Canvas */}
      <div
        className="relative overflow-hidden rounded-lg border bg-muted/20"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
      >
        <div
          ref={containerRef}
          className="relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleBackgroundClick}
          style={{ cursor: drawMode !== "select" ? "crosshair" : "default" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Photo for annotation"
            className="block h-auto w-full"
            onLoad={() => setImgLoaded(true)}
            draggable={false}
          />

          {imgLoaded && annotations.map(renderAnnotation)}

          {/* Drawing preview */}
          {drawRect && (
            <div
              className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/10"
              style={{
                left: `${drawRect.x * 100}%`,
                top: `${drawRect.y * 100}%`,
                width: `${drawRect.w * 100}%`,
                height: `${drawRect.h * 100}%`,
                borderRadius: drawMode === "circle" ? "50%" : 0,
                borderStyle: drawMode === "outline" ? "dashed" : "solid",
              }}
            />
          )}
        </div>
      </div>

      {/* Annotation count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
        </span>
        {selectedIndex != null && (
          <Badge variant="outline" className="text-xs">
            Selected: #{selectedIndex + 1} — {annotations[selectedIndex]?.label || "Unknown"}
          </Badge>
        )}
      </div>
    </div>
  );
}

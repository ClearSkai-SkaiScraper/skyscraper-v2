"use client";

import {
  Circle,
  Copy,
  Hand,
  MousePointer,
  Move,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// IRC Building Codes for roofing damage
const IRC_CODES = {
  shingle_damage: {
    code: "IRC R905.2.7",
    title: "Asphalt Shingle Application",
    text: "Asphalt shingles shall be applied per manufacturer installation instructions and ASTM D3462.",
  },
  underlayment: {
    code: "IRC R905.1.1",
    title: "Underlayment Requirements",
    text: "Underlayment shall comply with ASTM D226, D4869, or D6757 for asphalt-saturated felt.",
  },
  flashing: {
    code: "IRC R905.2.8",
    title: "Flashing Requirements",
    text: "Flashings shall be installed at wall and roof intersections, changes in roof slope, and around roof openings.",
  },
  drip_edge: {
    code: "IRC R905.2.8.5",
    title: "Drip Edge",
    text: "A drip edge shall be provided at eaves and rakes of shingle roofs.",
  },
  ventilation: {
    code: "IRC R806.1",
    title: "Ventilation Required",
    text: "Enclosed attics and rafter spaces shall have cross ventilation with a minimum net free ventilating area of 1/150.",
  },
  ice_barrier: {
    code: "IRC R905.2.7.1",
    title: "Ice Barrier",
    text: "Ice barriers shall extend from the eave's edge to a point 24 inches inside the exterior wall line.",
  },
  nail_pattern: {
    code: "IRC R905.2.6",
    title: "Fastener Requirements",
    text: "Shingle fasteners shall be corrosion-resistant, minimum 12 gauge shank, 3/8 inch head diameter.",
  },
  hail_damage: {
    code: "IRC R903.2",
    title: "Roof Covering Materials",
    text: "Roof coverings shall be designed for weather protection and the specific application.",
  },
} as const;

type IRCCodeKey = keyof typeof IRC_CODES;

export interface Annotation {
  id: string;
  type: "circle" | "rectangle" | "freehand" | "text" | "ai_detection";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: { x: number; y: number }[];
  text?: string;
  color: string;
  damageType?: string;
  severity?: "Low" | "Medium" | "High" | "Critical";
  ircCode?: IRCCodeKey;
  caption?: string;
  confidence?: number;
  isPercentage?: boolean;
}

interface PhotoAnnotatorProps {
  imageUrl: string;
  photoId?: string;
  onSave?: (annotations: Annotation[]) => void;
  onAnalyze?: () => void;
  initialAnnotations?: Annotation[];
  readOnly?: boolean;
  isAnalyzing?: boolean;
}

const COLORS = [
  { value: "#ef4444", label: "Red (Critical)" },
  { value: "#f97316", label: "Orange (High)" },
  { value: "#eab308", label: "Yellow (Medium)" },
  { value: "#22c55e", label: "Green (Low)" },
  { value: "#3b82f6", label: "Blue (Info)" },
  { value: "#8b5cf6", label: "Purple (Note)" },
];

const DAMAGE_TYPES = [
  "Hail Impact",
  "Hail Spatter",
  "Wind Damage",
  "Missing Shingles",
  "Cracked/Broken",
  "Granule Loss",
  "Lifted/Curled",
  "Water Damage",
  "Flashing Damage",
  "Vent Damage",
  "Gutter Damage",
  "Soft Metal Dent",
  "AC Fin Damage",
  "Paint Damage",
  "Stucco Damage",
  "Screen Damage",
  "Trim Damage",
  "Structural",
  "Other",
];

// ─── Interaction mode types ───────────────────────────────────────────────────
type InteractionMode = "idle" | "drawing" | "moving" | "resizing" | "panning";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

const HANDLE_SIZE = 8;
const HANDLE_HALF = HANDLE_SIZE / 2;

export function PhotoAnnotator({
  imageUrl,
  photoId: _photoId,
  onSave,
  onAnalyze,
  initialAnnotations = [],
  readOnly = false,
  isAnalyzing = false,
}: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);

  useEffect(() => {
    if (initialAnnotations && initialAnnotations.length > 0) {
      setAnnotations(initialAnnotations);
    }
  }, [initialAnnotations]);

  const [selectedTool, setSelectedTool] = useState<
    "select" | "circle" | "rectangle" | "freehand" | "text" | "pan"
  >("select");
  const [selectedColor, setSelectedColor] = useState("#ef4444");
  const [selectedDamageType, setSelectedDamageType] = useState("Hail Impact");
  const [selectedIRCCode, setSelectedIRCCode] = useState<IRCCodeKey | "_none">("_none");
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // ─── New state for drag / resize / interaction ────────────────────────────
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("idle");
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOriginal, setDragOriginal] = useState<Annotation | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);

  // ─── Load image ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageUrl) {
      setImageError("No image URL provided");
      return;
    }
    setImageLoaded(false);
    setImageError(null);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      const maxWidth = 800;
      const maxHeight = 700;
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      setCanvasSize({ width: Math.round(width), height: Math.round(height) });
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error("[PhotoAnnotator] Failed to load image:", imageUrl);
      setImageError("Failed to load image. The image may be unavailable or blocked by CORS.");
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ─── Coordinate helpers ─────────────────────────────────────────────────────
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const toPixels = useCallback(
    (val: number, dimension: "x" | "y" | "width" | "height", isPercent?: boolean) => {
      if (!isPercent) return val;
      const canvasW = canvasSize.width / zoom;
      const canvasH = canvasSize.height / zoom;
      if (dimension === "x" || dimension === "width") return (val / 100) * canvasW;
      return (val / 100) * canvasH;
    },
    [canvasSize, zoom]
  );

  // ─── Annotation bounds (pixel space) ───────────────────────────────────────
  const getAnnotationBounds = useCallback(
    (ann: Annotation) => {
      const x = toPixels(ann.x, "x", ann.isPercentage);
      const y = toPixels(ann.y, "y", ann.isPercentage);
      const w = ann.width ? toPixels(ann.width, "width", ann.isPercentage) : 0;
      const h = ann.height ? toPixels(ann.height, "height", ann.isPercentage) : 0;
      const r = ann.radius ? toPixels(ann.radius, "width", ann.isPercentage) : 0;

      if (ann.type === "circle" && r) {
        return { x: x - r, y: y - r, width: r * 2, height: r * 2 };
      }
      if ((ann.type === "rectangle" || ann.type === "ai_detection") && w && h) {
        return { x, y, width: w, height: h };
      }
      if (ann.type === "freehand" && ann.points && ann.points.length > 0) {
        const xs = ann.points.map((p) => p.x);
        const ys = ann.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
      }
      return { x, y, width: w || 20, height: h || 20 };
    },
    [toPixels]
  );

  // ─── Resize handles ────────────────────────────────────────────────────────
  const getResizeHandles = useCallback(
    (ann: Annotation) => {
      const b = getAnnotationBounds(ann);
      return {
        nw: { x: b.x, y: b.y },
        n: { x: b.x + b.width / 2, y: b.y },
        ne: { x: b.x + b.width, y: b.y },
        e: { x: b.x + b.width, y: b.y + b.height / 2 },
        se: { x: b.x + b.width, y: b.y + b.height },
        s: { x: b.x + b.width / 2, y: b.y + b.height },
        sw: { x: b.x, y: b.y + b.height },
        w: { x: b.x, y: b.y + b.height / 2 },
      };
    },
    [getAnnotationBounds]
  );

  const hitTestHandle = useCallback(
    (ann: Annotation, coords: { x: number; y: number }): ResizeHandle => {
      if (ann.type === "freehand") return null;
      const handles = getResizeHandles(ann);
      const threshold = HANDLE_SIZE / zoom;
      for (const [key, pos] of Object.entries(handles)) {
        if (Math.abs(coords.x - pos.x) <= threshold && Math.abs(coords.y - pos.y) <= threshold) {
          return key as ResizeHandle;
        }
      }
      return null;
    },
    [getResizeHandles, zoom]
  );

  const hitTestAnnotation = useCallback(
    (coords: { x: number; y: number }): Annotation | null => {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        const b = getAnnotationBounds(ann);
        if (
          coords.x >= b.x &&
          coords.x <= b.x + b.width &&
          coords.y >= b.y &&
          coords.y <= b.y + b.height
        ) {
          return ann;
        }
      }
      return null;
    },
    [annotations, getAnnotationBounds]
  );

  // ─── Cursor ─────────────────────────────────────────────────────────────────
  const getCursorStyle = useCallback(() => {
    if (readOnly) return "default";
    if (interactionMode === "moving") return "grabbing";
    if (interactionMode === "resizing") {
      const map: Record<string, string> = {
        nw: "nw-resize",
        n: "n-resize",
        ne: "ne-resize",
        e: "e-resize",
        se: "se-resize",
        s: "s-resize",
        sw: "sw-resize",
        w: "w-resize",
      };
      return activeHandle ? map[activeHandle] || "default" : "default";
    }
    if (interactionMode === "panning") return "grabbing";
    if (selectedTool === "pan") return "grab";
    if (selectedTool === "select") {
      if (hoveredHandle) {
        const map: Record<string, string> = {
          nw: "nw-resize",
          n: "n-resize",
          ne: "ne-resize",
          e: "e-resize",
          se: "se-resize",
          s: "s-resize",
          sw: "sw-resize",
          w: "w-resize",
        };
        return map[hoveredHandle] || "default";
      }
      if (hoveredAnnotation) return "move";
      return "default";
    }
    return "crosshair";
  }, [readOnly, interactionMode, selectedTool, hoveredHandle, hoveredAnnotation, activeHandle]);

  // ─── Move annotation ───────────────────────────────────────────────────────
  const moveAnnotation = useCallback(
    (ann: Annotation, dx: number, dy: number): Annotation => {
      const updated = { ...ann };
      if (ann.isPercentage) {
        const canvasW = canvasSize.width / zoom;
        const canvasH = canvasSize.height / zoom;
        updated.x = ann.x + (dx / canvasW) * 100;
        updated.y = ann.y + (dy / canvasH) * 100;
      } else {
        updated.x = ann.x + dx;
        updated.y = ann.y + dy;
      }
      if (ann.type === "freehand" && ann.points) {
        updated.points = ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
      return updated;
    },
    [canvasSize, zoom]
  );

  // ─── Resize annotation ─────────────────────────────────────────────────────
  const resizeAnnotation = useCallback(
    (
      ann: Annotation,
      handle: ResizeHandle,
      dx: number,
      dy: number,
      original: Annotation
    ): Annotation => {
      if (!handle) return ann;
      const updated = { ...ann };

      const isPct = original.isPercentage;
      const canvasW = canvasSize.width / zoom;
      const canvasH = canvasSize.height / zoom;
      const dxU = isPct ? (dx / canvasW) * 100 : dx;
      const dyU = isPct ? (dy / canvasH) * 100 : dy;
      const minSize = isPct ? 2 : 5;

      const origW = original.width || 0;
      const origH = original.height || 0;
      const origR = original.radius || 0;

      if (original.type === "circle") {
        const avgDelta = (Math.abs(dxU) + Math.abs(dyU)) / 2;
        const sign = handle === "se" || handle === "e" || handle === "s" ? 1 : -1;
        updated.radius = Math.max(minSize, origR + sign * avgDelta);
      } else {
        switch (handle) {
          case "se":
            updated.width = Math.max(minSize, origW + dxU);
            updated.height = Math.max(minSize, origH + dyU);
            break;
          case "s":
            updated.height = Math.max(minSize, origH + dyU);
            break;
          case "e":
            updated.width = Math.max(minSize, origW + dxU);
            break;
          case "nw":
            updated.x = original.x + dxU;
            updated.y = original.y + dyU;
            updated.width = Math.max(minSize, origW - dxU);
            updated.height = Math.max(minSize, origH - dyU);
            break;
          case "n":
            updated.y = original.y + dyU;
            updated.height = Math.max(minSize, origH - dyU);
            break;
          case "ne":
            updated.y = original.y + dyU;
            updated.width = Math.max(minSize, origW + dxU);
            updated.height = Math.max(minSize, origH - dyU);
            break;
          case "sw":
            updated.x = original.x + dxU;
            updated.width = Math.max(minSize, origW - dxU);
            updated.height = Math.max(minSize, origH + dyU);
            break;
          case "w":
            updated.x = original.x + dxU;
            updated.width = Math.max(minSize, origW - dxU);
            break;
        }
      }
      return updated;
    },
    [canvasSize, zoom]
  );

  // ─── Draw canvas ───────────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, 0, 0, canvas.width / zoom, canvas.height / zoom);

    // Draw annotations
    annotations.forEach((ann) => {
      const isSelected = selectedAnnotation === ann.id;
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color + "33";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash([]);

      const x = toPixels(ann.x, "x", ann.isPercentage);
      const y = toPixels(ann.y, "y", ann.isPercentage);
      const w = ann.width ? toPixels(ann.width, "width", ann.isPercentage) : 0;
      const h = ann.height ? toPixels(ann.height, "height", ann.isPercentage) : 0;
      const r = ann.radius ? toPixels(ann.radius, "width", ann.isPercentage) : 0;

      if (ann.type === "circle" && (ann.radius || r)) {
        ctx.beginPath();
        ctx.arc(x, y, r || ann.radius!, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (ann.type === "rectangle" && (ann.width || w) && (ann.height || h)) {
        ctx.fillRect(x, y, w || ann.width!, h || ann.height!);
        ctx.strokeRect(x, y, w || ann.width!, h || ann.height!);
      } else if (ann.type === "freehand" && ann.points && ann.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ann.points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      } else if (ann.type === "ai_detection" && (ann.width || w) && (ann.height || h)) {
        ctx.setLineDash([5, 5]);
        ctx.fillRect(x, y, w || ann.width!, h || ann.height!);
        ctx.strokeRect(x, y, w || ann.width!, h || ann.height!);
        ctx.setLineDash([]);

        if (ann.confidence) {
          ctx.fillStyle = ann.color;
          ctx.fillRect(x, y - 20, 60, 18);
          ctx.fillStyle = "#fff";
          ctx.font = "12px Arial";
          ctx.fillText(`${Math.round(ann.confidence * 100)}%`, x + 4, y - 6);
        }
      }

      // Label for selected
      if (isSelected && (ann.damageType || ann.ircCode)) {
        const labelY = y + (h || ann.height || r || ann.radius || 0) + 20;
        ctx.fillStyle = "#000";
        ctx.font = "bold 12px Arial";
        if (ann.damageType) ctx.fillText(ann.damageType, x, labelY);
        if (ann.ircCode) {
          ctx.fillStyle = "#0066cc";
          ctx.fillText(IRC_CODES[ann.ircCode].code, x, labelY + 14);
        }
      }

      // Resize handles for selected
      if (isSelected && !readOnly && ann.type !== "freehand") {
        const handles = getResizeHandles(ann);
        ctx.setLineDash([]);
        Object.entries(handles).forEach(([key, pos]) => {
          ctx.fillStyle = hoveredHandle === key ? "#3b82f6" : "#ffffff";
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2;
          ctx.fillRect(pos.x - HANDLE_HALF, pos.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(pos.x - HANDLE_HALF, pos.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
        });
      }
    });

    // Drawing preview
    if (isDrawing && interactionMode === "drawing") {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      if (selectedTool === "freehand" && currentPath.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      } else if (selectedTool === "rectangle" && startPoint && currentPath.length > 0) {
        const last = currentPath[currentPath.length - 1];
        ctx.strokeRect(startPoint.x, startPoint.y, last.x - startPoint.x, last.y - startPoint.y);
      } else if (selectedTool === "circle" && startPoint && currentPath.length > 0) {
        const last = currentPath[currentPath.length - 1];
        const r = Math.sqrt((last.x - startPoint.x) ** 2 + (last.y - startPoint.y) ** 2);
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [
    annotations,
    selectedAnnotation,
    isDrawing,
    currentPath,
    selectedColor,
    zoom,
    pan,
    canvasSize,
    toPixels,
    getResizeHandles,
    hoveredHandle,
    readOnly,
    interactionMode,
    startPoint,
    selectedTool,
  ]);

  useEffect(() => {
    if (imageLoaded) drawCanvas();
  }, [imageLoaded, drawCanvas, canvasSize]);

  // ─── Mouse Down ─────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const coords = getCanvasCoords(e);

    if (selectedTool === "select") {
      // 1. Check resize handles on selected annotation
      if (selectedAnnotation) {
        const selAnn = annotations.find((a) => a.id === selectedAnnotation);
        if (selAnn) {
          const handle = hitTestHandle(selAnn, coords);
          if (handle) {
            setInteractionMode("resizing");
            setActiveHandle(handle);
            setDragStart(coords);
            setDragOriginal({ ...selAnn });
            setIsDrawing(true);
            return;
          }
        }
      }
      // 2. Check if clicking inside any annotation (drag/move)
      const clicked = hitTestAnnotation(coords);
      if (clicked) {
        setSelectedAnnotation(clicked.id);
        setInteractionMode("moving");
        setDragStart(coords);
        setDragOriginal({ ...clicked });
        setIsDrawing(true);
        return;
      }
      // 3. Empty space — deselect
      setSelectedAnnotation(null);
      setInteractionMode("idle");
    } else if (selectedTool === "pan") {
      setInteractionMode("panning");
      setIsDrawing(true);
      setStartPoint(coords);
    } else if (selectedTool === "freehand") {
      setInteractionMode("drawing");
      setIsDrawing(true);
      setCurrentPath([coords]);
    } else if (selectedTool === "circle" || selectedTool === "rectangle") {
      setInteractionMode("drawing");
      setIsDrawing(true);
      setStartPoint(coords);
      setCurrentPath([coords]);
    }
  };

  // ─── Mouse Move ─────────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    // Hover state (when not dragging)
    if (selectedTool === "select" && !isDrawing) {
      if (selectedAnnotation) {
        const selAnn = annotations.find((a) => a.id === selectedAnnotation);
        if (selAnn) {
          const handle = hitTestHandle(selAnn, coords);
          setHoveredHandle(handle);
          if (handle) {
            setHoveredAnnotation(null);
            return;
          }
        }
      }
      const hovered = hitTestAnnotation(coords);
      setHoveredAnnotation(hovered?.id || null);
      setHoveredHandle(null);
    }

    if (!isDrawing || readOnly) return;

    if (interactionMode === "moving" && dragStart && dragOriginal) {
      const dx = coords.x - dragStart.x;
      const dy = coords.y - dragStart.y;
      const moved = moveAnnotation(dragOriginal, dx, dy);
      setAnnotations((prev) => prev.map((a) => (a.id === dragOriginal.id ? moved : a)));
    } else if (interactionMode === "resizing" && dragStart && dragOriginal && activeHandle) {
      const dx = coords.x - dragStart.x;
      const dy = coords.y - dragStart.y;
      const resized = resizeAnnotation(dragOriginal, activeHandle, dx, dy, dragOriginal);
      setAnnotations((prev) =>
        prev.map((a) => (a.id === dragOriginal.id ? { ...resized, id: a.id } : a))
      );
    } else if (interactionMode === "panning") {
      setPan((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (interactionMode === "drawing") {
      if (selectedTool === "freehand") {
        setCurrentPath((prev) => [...prev, coords]);
      } else if (selectedTool === "circle" || selectedTool === "rectangle") {
        setCurrentPath([coords]);
      }
    }
  };

  // ─── Mouse Up ───────────────────────────────────────────────────────────────
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) {
      setIsDrawing(false);
      return;
    }
    const coords = getCanvasCoords(e);

    if (interactionMode === "drawing") {
      if (selectedTool === "freehand" && currentPath.length > 0) {
        setAnnotations((prev) => [
          ...prev,
          {
            id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: "freehand",
            x: currentPath[0].x,
            y: currentPath[0].y,
            points: currentPath,
            color: selectedColor,
            damageType: selectedDamageType,
            ircCode: selectedIRCCode === "_none" ? undefined : selectedIRCCode || undefined,
          },
        ]);
      } else if (selectedTool === "circle" && startPoint) {
        const r = Math.sqrt((coords.x - startPoint.x) ** 2 + (coords.y - startPoint.y) ** 2);
        if (r > 5) {
          setAnnotations((prev) => [
            ...prev,
            {
              id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: "circle",
              x: startPoint.x,
              y: startPoint.y,
              radius: r,
              color: selectedColor,
              damageType: selectedDamageType,
              ircCode: selectedIRCCode === "_none" ? undefined : selectedIRCCode || undefined,
            },
          ]);
        }
      } else if (selectedTool === "rectangle" && startPoint) {
        const width = coords.x - startPoint.x;
        const height = coords.y - startPoint.y;
        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
          setAnnotations((prev) => [
            ...prev,
            {
              id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: "rectangle",
              x: width > 0 ? startPoint.x : coords.x,
              y: height > 0 ? startPoint.y : coords.y,
              width: Math.abs(width),
              height: Math.abs(height),
              color: selectedColor,
              damageType: selectedDamageType,
              ircCode: selectedIRCCode === "_none" ? undefined : selectedIRCCode || undefined,
            },
          ]);
        }
      }
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setStartPoint(null);
    setInteractionMode("idle");
    setActiveHandle(null);
    setDragStart(null);
    setDragOriginal(null);
  };

  // ─── Duplicate ──────────────────────────────────────────────────────────────
  const handleDuplicate = () => {
    if (!selectedAnnotation) return;
    const source = annotations.find((a) => a.id === selectedAnnotation);
    if (!source) return;
    const offset = source.isPercentage ? 3 : 20;
    const duplicate: Annotation = {
      ...source,
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: source.x + offset,
      y: source.y + offset,
      points: source.points?.map((p) => ({ x: p.x + 20, y: p.y + 20 })),
      // Duplicates are BLANK — no inherited text/comments so user can type their own
      caption: undefined,
      damageType: undefined,
      severity: undefined,
      ircCode: undefined,
      confidence: undefined,
      type: source.type === "ai_detection" ? "rectangle" : source.type,
    };
    setAnnotations((prev) => [...prev, duplicate]);
    setSelectedAnnotation(duplicate.id);
  };

  const handleAIAnalyze = () => {
    if (onAnalyze) onAnalyze();
  };

  const handleDelete = () => {
    if (selectedAnnotation) {
      setAnnotations((prev) => prev.filter((a) => a.id !== selectedAnnotation));
      setSelectedAnnotation(null);
    }
  };

  const handleClearAll = () => {
    setAnnotations([]);
    setSelectedAnnotation(null);
  };

  const handleSave = () => {
    if (onSave) onSave(annotations);
  };

  const generateCaption = (): string => {
    if (annotations.length === 0) return "No damage documented.";
    const damageTypes = [...new Set(annotations.map((a) => a.damageType).filter(Boolean))];
    const codes = annotations
      .map((a) => (a.ircCode ? IRC_CODES[a.ircCode].code : null))
      .filter(Boolean);
    let caption = `Documented ${annotations.length} damage point${annotations.length > 1 ? "s" : ""}.`;
    if (damageTypes.length > 0) caption += ` Types: ${damageTypes.join(", ")}.`;
    if (codes.length > 0) caption += ` Applicable codes: ${[...new Set(codes)].join(", ")}.`;
    return caption;
  };

  const selectedAnn = annotations.find((a) => a.id === selectedAnnotation);

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-2 dark:bg-slate-900">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant={selectedTool === "select" ? "default" : "ghost"}
            size="icon"
            onClick={() => setSelectedTool("select")}
            title="Select / Move / Resize"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === "circle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setSelectedTool("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === "rectangle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setSelectedTool("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === "freehand" ? "default" : "ghost"}
            size="icon"
            onClick={() => setSelectedTool("freehand")}
            title="Freehand"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === "pan" ? "default" : "ghost"}
            size="icon"
            onClick={() => setSelectedTool("pan")}
            title="Pan"
          >
            <Hand className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.min(z * 1.2, 5))}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-sm">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.max(z / 1.2, 0.25))}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Color & Type Selection */}
        <div className="flex items-center gap-2 border-r pr-2">
          <Select value={selectedColor} onValueChange={setSelectedColor}>
            <SelectTrigger className="w-[140px]">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedColor }} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.value }} />
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDamageType} onValueChange={setSelectedDamageType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Damage Type" />
            </SelectTrigger>
            <SelectContent>
              {DAMAGE_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {dt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedIRCCode}
            onValueChange={(v) => setSelectedIRCCode(v as IRCCodeKey | "_none")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="IRC Code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No Code</SelectItem>
              {Object.entries(IRC_CODES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onAnalyze && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIAnalyze}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {isAnalyzing ? "Analyzing..." : "AI Detect"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDuplicate}
            disabled={!selectedAnnotation}
            title="Duplicate Selected (Ctrl+D)"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={!selectedAnnotation}
            title="Delete Selected"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
          {onSave && (
            <Button variant="default" size="sm" onClick={handleSave}>
              <Save className="mr-1 h-4 w-4" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Interaction hint */}
      {selectedAnnotation && selectedTool === "select" && !readOnly && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <Move className="h-3.5 w-3.5" />
          <span>
            Drag to move • Corner/edge handles to resize •{" "}
            <kbd className="rounded border px-1">Ctrl+D</kbd> to duplicate •{" "}
            <kbd className="rounded border px-1">Del</kbd> to delete
          </span>
        </div>
      )}

      {/* ─── Canvas Container ──────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border bg-slate-100 dark:bg-slate-800"
        style={{ minHeight: "400px", height: `${Math.max(canvasSize.height + 20, 400)}px` }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ cursor: getCursorStyle() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onKeyDown={(e) => {
            if (e.key === "Delete" || e.key === "Backspace") handleDelete();
            if ((e.ctrlKey || e.metaKey) && e.key === "d") {
              e.preventDefault();
              handleDuplicate();
            }
          }}
          tabIndex={0}
        />

        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80 dark:bg-slate-700/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              <div className="text-slate-500">Loading image...</div>
            </div>
          </div>
        )}

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100/80 dark:bg-red-900/30">
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                ⚠️ Image Load Error
              </div>
              <div className="max-w-md text-sm text-red-500 dark:text-red-300">{imageError}</div>
              <div className="mt-2 max-w-md break-all text-xs text-slate-500">
                URL: {imageUrl?.slice(0, 100)}...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Selected Annotation Details ───────────────────────────────────── */}
      {selectedAnn && (
        <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
          <h4 className="mb-2 font-semibold">Selected Annotation</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Type:</span>{" "}
              <input
                type="text"
                className="ml-1 w-36 rounded border border-slate-200 px-2 py-0.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                value={selectedAnn.damageType || ""}
                placeholder="Enter damage type"
                onChange={(e) => {
                  const val = e.target.value;
                  setAnnotations((prev) =>
                    prev.map((a) => (a.id === selectedAnn.id ? { ...a, damageType: val } : a))
                  );
                }}
              />
            </div>
            <div>
              <span className="text-slate-500">Severity:</span>{" "}
              <select
                className={cn(
                  "ml-1 rounded border border-slate-200 px-2 py-0.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-800",
                  selectedAnn.severity === "Critical" && "text-red-600",
                  selectedAnn.severity === "High" && "text-orange-600",
                  selectedAnn.severity === "Medium" && "text-yellow-600",
                  selectedAnn.severity === "Low" && "text-green-600"
                )}
                value={selectedAnn.severity || ""}
                onChange={(e) => {
                  const val = e.target.value as Annotation["severity"];
                  setAnnotations((prev) =>
                    prev.map((a) =>
                      a.id === selectedAnn.id ? { ...a, severity: val || undefined } : a
                    )
                  );
                }}
              >
                <option value="">Not specified</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Caption:</span>{" "}
              <input
                type="text"
                className="ml-1 w-full rounded border border-slate-200 px-2 py-0.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={selectedAnn.caption || ""}
                placeholder="Type your note here..."
                onChange={(e) => {
                  const val = e.target.value;
                  setAnnotations((prev) =>
                    prev.map((a) => (a.id === selectedAnn.id ? { ...a, caption: val } : a))
                  );
                }}
              />
            </div>
            {selectedAnn.ircCode && (
              <div className="col-span-2">
                <span className="text-slate-500">IRC Code:</span>{" "}
                <span className="font-medium text-blue-600">
                  {IRC_CODES[selectedAnn.ircCode].code}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {IRC_CODES[selectedAnn.ircCode].title} — {IRC_CODES[selectedAnn.ircCode].text}
                </p>
              </div>
            )}
            {selectedAnn.confidence && (
              <div>
                <span className="text-slate-500">AI Confidence:</span>{" "}
                <span className="font-medium">{Math.round(selectedAnn.confidence * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Caption Preview ───────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
        <h4 className="mb-2 flex items-center gap-2 font-semibold">
          <Type className="h-4 w-4" />
          Generated Caption
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">{generateCaption()}</p>
        <div className="mt-2 text-xs text-slate-400">
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""} on this photo
        </div>
      </div>
    </div>
  );
}

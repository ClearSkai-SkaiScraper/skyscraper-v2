"use client";

import {
  Circle,
  Hand,
  MousePointer,
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
  // If true, x/y/width/height are percentages (0-100) that need to be scaled to canvas size
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
  "Wind Damage",
  "Missing Shingles",
  "Cracked/Broken",
  "Granule Loss",
  "Lifted/Curled",
  "Water Damage",
  "Flashing Damage",
  "Vent Damage",
  "Gutter Damage",
  "Structural",
  "Other",
];

export function PhotoAnnotator({
  imageUrl,
  photoId,
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
  const [selectedTool, setSelectedTool] = useState<
    "select" | "circle" | "rectangle" | "freehand" | "text" | "pan"
  >("select");
  const [selectedColor, setSelectedColor] = useState("#ef4444");
  const [selectedDamageType, setSelectedDamageType] = useState("Hail Impact");
  const [selectedIRCCode, setSelectedIRCCode] = useState<IRCCodeKey | "">("");
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Load image and set canvas size to match aspect ratio
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      // Scale to fit within 800px max width while preserving aspect ratio
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
      drawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width / zoom, canvas.height / zoom);

    // Helper to convert percentage coords to pixels
    const toPixels = (
      val: number,
      dimension: "x" | "y" | "width" | "height",
      isPercent?: boolean
    ) => {
      if (!isPercent) return val;
      const canvasW = canvas.width / zoom;
      const canvasH = canvas.height / zoom;
      if (dimension === "x" || dimension === "width") return (val / 100) * canvasW;
      return (val / 100) * canvasH;
    };

    // Draw annotations
    annotations.forEach((ann) => {
      const isSelected = selectedAnnotation === ann.id;
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color + "33"; // 20% opacity fill
      ctx.lineWidth = isSelected ? 4 : 2;

      // Convert coordinates if they're percentages
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
        // AI detection boxes with dashed lines
        ctx.setLineDash([5, 5]);
        ctx.fillRect(x, y, w || ann.width!, h || ann.height!);
        ctx.strokeRect(x, y, w || ann.width!, h || ann.height!);
        ctx.setLineDash([]);

        // Draw confidence badge
        if (ann.confidence) {
          ctx.fillStyle = ann.color;
          ctx.fillRect(x, y - 20, 60, 18);
          ctx.fillStyle = "#fff";
          ctx.font = "12px Arial";
          ctx.fillText(`${Math.round(ann.confidence * 100)}%`, x + 4, y - 6);
        }
      }

      // Draw label for selected annotation
      if (isSelected && (ann.damageType || ann.ircCode)) {
        const labelY = y + (h || ann.height || r || ann.radius || 0) + 20;
        ctx.fillStyle = "#000";
        ctx.font = "bold 12px Arial";
        if (ann.damageType) {
          ctx.fillText(ann.damageType, x, labelY);
        }
        if (ann.ircCode) {
          ctx.fillStyle = "#0066cc";
          ctx.fillText(IRC_CODES[ann.ircCode].code, x, labelY + 14);
        }
      }
    });

    // Draw current drawing
    if (isDrawing && currentPath.length > 0) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    }

    ctx.restore();
  }, [annotations, selectedAnnotation, isDrawing, currentPath, selectedColor, zoom, pan]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, drawCanvas]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const coords = getCanvasCoords(e);

    if (selectedTool === "select") {
      // Check if clicking on an annotation
      const clicked = annotations.find((ann) => {
        if (ann.type === "circle" && ann.radius) {
          const dx = coords.x - ann.x;
          const dy = coords.y - ann.y;
          return Math.sqrt(dx * dx + dy * dy) <= ann.radius;
        }
        if ((ann.type === "rectangle" || ann.type === "ai_detection") && ann.width && ann.height) {
          return (
            coords.x >= ann.x &&
            coords.x <= ann.x + ann.width &&
            coords.y >= ann.y &&
            coords.y <= ann.y + ann.height
          );
        }
        return false;
      });
      setSelectedAnnotation(clicked?.id || null);
    } else if (selectedTool === "pan") {
      setIsDrawing(true);
      setStartPoint(coords);
    } else if (selectedTool === "freehand") {
      setIsDrawing(true);
      setCurrentPath([coords]);
    } else if (selectedTool === "circle" || selectedTool === "rectangle") {
      setIsDrawing(true);
      setStartPoint(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const coords = getCanvasCoords(e);

    if (selectedTool === "freehand") {
      setCurrentPath((prev) => [...prev, coords]);
    } else if (selectedTool === "pan" && startPoint) {
      const dx = e.movementX;
      const dy = e.movementY;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const coords = getCanvasCoords(e);

    if (selectedTool === "freehand" && currentPath.length > 0) {
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "freehand",
        x: currentPath[0].x,
        y: currentPath[0].y,
        points: currentPath,
        color: selectedColor,
        damageType: selectedDamageType,
        ircCode: selectedIRCCode || undefined,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
    } else if (selectedTool === "circle" && startPoint) {
      const dx = coords.x - startPoint.x;
      const dy = coords.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius > 5) {
        const newAnnotation: Annotation = {
          id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "circle",
          x: startPoint.x,
          y: startPoint.y,
          radius,
          color: selectedColor,
          damageType: selectedDamageType,
          ircCode: selectedIRCCode || undefined,
        };
        setAnnotations((prev) => [...prev, newAnnotation]);
      }
    } else if (selectedTool === "rectangle" && startPoint) {
      const width = coords.x - startPoint.x;
      const height = coords.y - startPoint.y;
      if (Math.abs(width) > 5 && Math.abs(height) > 5) {
        const newAnnotation: Annotation = {
          id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "rectangle",
          x: width > 0 ? startPoint.x : coords.x,
          y: height > 0 ? startPoint.y : coords.y,
          width: Math.abs(width),
          height: Math.abs(height),
          color: selectedColor,
          damageType: selectedDamageType,
          ircCode: selectedIRCCode || undefined,
        };
        setAnnotations((prev) => [...prev, newAnnotation]);
      }
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setStartPoint(null);
  };

  // AI Analysis - calls parent handler
  const handleAIAnalyze = () => {
    if (onAnalyze) {
      onAnalyze();
    }
  };

  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case "Critical":
        return "#ef4444";
      case "High":
        return "#f97316";
      case "Medium":
        return "#eab308";
      case "Low":
        return "#22c55e";
      default:
        return "#3b82f6";
    }
  };

  // Delete selected annotation
  const handleDelete = () => {
    if (selectedAnnotation) {
      setAnnotations((prev) => prev.filter((a) => a.id !== selectedAnnotation));
      setSelectedAnnotation(null);
    }
  };

  // Clear all annotations
  const handleClearAll = () => {
    setAnnotations([]);
    setSelectedAnnotation(null);
  };

  // Save annotations
  const handleSave = () => {
    if (onSave) {
      onSave(annotations);
    }
  };

  // Generate caption from annotations
  const generateCaption = (): string => {
    if (annotations.length === 0) return "No damage documented.";

    const damageTypes = [...new Set(annotations.map((a) => a.damageType).filter(Boolean))];
    const codes = annotations
      .map((a) => (a.ircCode ? IRC_CODES[a.ircCode].code : null))
      .filter(Boolean);

    let caption = `Documented ${annotations.length} damage point${annotations.length > 1 ? "s" : ""}.`;
    if (damageTypes.length > 0) {
      caption += ` Types: ${damageTypes.join(", ")}.`;
    }
    if (codes.length > 0) {
      caption += ` Applicable codes: ${[...new Set(codes)].join(", ")}.`;
    }

    return caption;
  };

  const selectedAnn = annotations.find((a) => a.id === selectedAnnotation);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-2 dark:bg-slate-900">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant={selectedTool === "select" ? "default" : "ghost"}
            size="icon"
            onClick={() => setSelectedTool("select")}
            title="Select"
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
            onValueChange={(v) => setSelectedIRCCode(v as IRCCodeKey)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="IRC Code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Code</SelectItem>
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

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border bg-slate-100 dark:bg-slate-800"
        style={{ height: `${canvasSize.height + 20}px` }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={cn(
            "cursor-crosshair",
            selectedTool === "select" && "cursor-default",
            selectedTool === "pan" && "cursor-grab",
            isDrawing && selectedTool === "pan" && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Loading overlay */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80 dark:bg-slate-700/80">
            <div className="text-slate-500">Loading image...</div>
          </div>
        )}
      </div>

      {/* Selected Annotation Details */}
      {selectedAnn && (
        <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
          <h4 className="mb-2 font-semibold">Selected Annotation</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Type:</span>{" "}
              <span className="font-medium">{selectedAnn.damageType || "Not specified"}</span>
            </div>
            <div>
              <span className="text-slate-500">Severity:</span>{" "}
              <span
                className={cn(
                  "font-medium",
                  selectedAnn.severity === "Critical" && "text-red-600",
                  selectedAnn.severity === "High" && "text-orange-600",
                  selectedAnn.severity === "Medium" && "text-yellow-600",
                  selectedAnn.severity === "Low" && "text-green-600"
                )}
              >
                {selectedAnn.severity || "Not specified"}
              </span>
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

      {/* Caption Preview */}
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

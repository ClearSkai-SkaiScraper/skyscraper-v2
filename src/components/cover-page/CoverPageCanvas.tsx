"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  Italic,
  Move,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CanvasElement {
  id: string;
  type: "text" | "image" | "logo" | "shape";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  rotation?: number;
  zIndex: number;
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  color?: string;
  // Image properties
  src?: string;
  objectFit?: "contain" | "cover";
  // Shape properties
  shapeType?: "rectangle" | "circle" | "line";
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export interface CoverPageCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  backgroundColor: string;
  backgroundImage?: string | null;
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
  // Branding assets for quick add
  brandingAssets?: {
    logoUrl?: string | null;
    teamPhotoUrl?: string | null;
    colorPrimary?: string;
    colorAccent?: string;
  };
}

// Available fonts
const FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Oswald", label: "Oswald" },
  { value: "Lato", label: "Lato" },
  { value: "Poppins", label: "Poppins" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function CoverPageCanvas({
  elements,
  onElementsChange,
  backgroundColor,
  backgroundImage,
  selectedId,
  onSelectElement,
  brandingAssets,
}: CoverPageCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedId);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DRAG & DROP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const getCanvasPosition = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string, handle?: string) => {
      e.stopPropagation();
      onSelectElement(elementId);

      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
      } else {
        setIsDragging(true);
      }

      const pos = getCanvasPosition(e.clientX, e.clientY);
      setDragStart(pos);
    },
    [getCanvasPosition, onSelectElement]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedId || (!isDragging && !isResizing)) return;

      const pos = getCanvasPosition(e.clientX, e.clientY);
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      const updated = elements.map((el) => {
        if (el.id !== selectedId) return el;

        if (isDragging) {
          return {
            ...el,
            x: Math.max(0, Math.min(100 - el.width, el.x + dx)),
            y: Math.max(0, Math.min(100 - el.height, el.y + dy)),
          };
        }

        if (isResizing && resizeHandle) {
          let newX = el.x;
          let newY = el.y;
          let newWidth = el.width;
          let newHeight = el.height;

          if (resizeHandle.includes("e")) newWidth = Math.max(5, el.width + dx);
          if (resizeHandle.includes("w")) {
            newWidth = Math.max(5, el.width - dx);
            newX = el.x + dx;
          }
          if (resizeHandle.includes("s")) newHeight = Math.max(5, el.height + dy);
          if (resizeHandle.includes("n")) {
            newHeight = Math.max(5, el.height - dy);
            newY = el.y + dy;
          }

          return { ...el, x: newX, y: newY, width: newWidth, height: newHeight };
        }

        return el;
      });

      onElementsChange(updated);
      setDragStart(pos);
    },
    [
      selectedId,
      isDragging,
      isResizing,
      resizeHandle,
      dragStart,
      elements,
      getCanvasPosition,
      onElementsChange,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ELEMENT CRUD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const addElement = useCallback(
    (type: CanvasElement["type"], props?: Partial<CanvasElement>) => {
      const newElement: CanvasElement = {
        id: `el-${Date.now()}`,
        type,
        x: 10,
        y: 10,
        width: type === "text" ? 40 : 20,
        height: type === "text" ? 10 : 20,
        zIndex: elements.length,
        // Default text properties
        ...(type === "text" && {
          text: "New Text",
          fontSize: 24,
          fontFamily: "Inter",
          fontWeight: "normal" as const,
          fontStyle: "normal" as const,
          textAlign: "center" as const,
          color: "#ffffff",
        }),
        // Default image properties
        ...(type === "image" && {
          src: "",
          objectFit: "contain" as const,
        }),
        ...(type === "logo" && {
          src: brandingAssets?.logoUrl || "",
          objectFit: "contain" as const,
        }),
        ...props,
      };

      onElementsChange([...elements, newElement]);
      onSelectElement(newElement.id);
    },
    [elements, onElementsChange, onSelectElement, brandingAssets]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      onElementsChange(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
    },
    [elements, onElementsChange]
  );

  const deleteElement = useCallback(
    (id: string) => {
      onElementsChange(elements.filter((el) => el.id !== id));
      if (selectedId === id) onSelectElement(null);
    },
    [elements, onElementsChange, selectedId, onSelectElement]
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div className="flex gap-6">
      {/* Canvas */}
      <div className="flex-1">
        <div
          ref={canvasRef}
          className="relative aspect-[8.5/11] w-full cursor-crosshair overflow-hidden rounded-lg border-2 border-slate-300 shadow-xl"
          style={{
            background: backgroundImage
              ? `url(${backgroundImage}) center/cover no-repeat`
              : backgroundColor,
          }}
          onClick={() => onSelectElement(null)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Render elements */}
          {elements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el) => (
              <CanvasElementRenderer
                key={el.id}
                element={el}
                isSelected={el.id === selectedId}
                onMouseDown={(e, handle) => handleMouseDown(e, el.id, handle)}
              />
            ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="w-72 space-y-4">
        {/* Add Elements */}
        <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
          <Label className="mb-3 block text-sm font-semibold">Add Element</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => addElement("text")}>
              <Type className="mr-2 h-4 w-4" />
              Text
            </Button>
            <Button variant="outline" size="sm" onClick={() => addElement("image")}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Image
            </Button>
            {brandingAssets?.logoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement("logo", { src: brandingAssets.logoUrl! })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Logo
              </Button>
            )}
            {brandingAssets?.teamPhotoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addElement("image", {
                    src: brandingAssets.teamPhotoUrl!,
                    width: 30,
                    height: 25,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Team Photo
              </Button>
            )}
          </div>
        </div>

        {/* Element Properties */}
        {selectedElement && (
          <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}{" "}
                Properties
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                onClick={() => deleteElement(selectedElement.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Text Properties */}
            {selectedElement.type === "text" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Text</Label>
                  <Input
                    value={selectedElement.text || ""}
                    onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Font</Label>
                  <Select
                    value={selectedElement.fontFamily}
                    onValueChange={(v) => updateElement(selectedElement.id, { fontFamily: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Font Size: {selectedElement.fontSize}px</Label>
                  <Slider
                    value={[selectedElement.fontSize || 24]}
                    onValueChange={([v]) => updateElement(selectedElement.id, { fontSize: v })}
                    min={10}
                    max={120}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={selectedElement.fontWeight === "bold" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      updateElement(selectedElement.id, {
                        fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold",
                      })
                    }
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedElement.fontStyle === "italic" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      updateElement(selectedElement.id, {
                        fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic",
                      })
                    }
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedElement.textAlign === "left" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateElement(selectedElement.id, { textAlign: "left" })}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedElement.textAlign === "center" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateElement(selectedElement.id, { textAlign: "center" })}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedElement.textAlign === "right" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateElement(selectedElement.id, { textAlign: "right" })}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.color || "#ffffff"}
                      onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded border-0"
                    />
                    <Input
                      value={selectedElement.color || "#ffffff"}
                      onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Image/Logo Properties */}
            {(selectedElement.type === "image" || selectedElement.type === "logo") && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Image URL</Label>
                  <Input
                    value={selectedElement.src || ""}
                    onChange={(e) => updateElement(selectedElement.id, { src: e.target.value })}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Fit</Label>
                  <Select
                    value={selectedElement.objectFit}
                    onValueChange={(v: "contain" | "cover") =>
                      updateElement(selectedElement.id, { objectFit: v })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contain">Contain</SelectItem>
                      <SelectItem value="cover">Cover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Position & Size */}
            <div className="mt-4 border-t pt-4">
              <Label className="text-xs text-slate-500">Position & Size</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">X:</span> {selectedElement.x.toFixed(1)}%
                </div>
                <div>
                  <span className="text-slate-400">Y:</span> {selectedElement.y.toFixed(1)}%
                </div>
                <div>
                  <span className="text-slate-400">W:</span> {selectedElement.width.toFixed(1)}%
                </div>
                <div>
                  <span className="text-slate-400">H:</span> {selectedElement.height.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Branding Colors */}
        {brandingAssets && (brandingAssets.colorPrimary || brandingAssets.colorAccent) && (
          <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
            <Label className="mb-3 block text-sm font-semibold">Brand Colors</Label>
            <div className="flex gap-2">
              {brandingAssets.colorPrimary && (
                <button
                  className="h-8 w-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: brandingAssets.colorPrimary }}
                  title="Primary Color"
                  onClick={() => {
                    if (selectedElement?.type === "text") {
                      updateElement(selectedElement.id, { color: brandingAssets.colorPrimary });
                    }
                  }}
                />
              )}
              {brandingAssets.colorAccent && (
                <button
                  className="h-8 w-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: brandingAssets.colorAccent }}
                  title="Accent Color"
                  onClick={() => {
                    if (selectedElement?.type === "text") {
                      updateElement(selectedElement.id, { color: brandingAssets.colorAccent });
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ELEMENT RENDERER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CanvasElementRenderer({
  element,
  isSelected,
  onMouseDown,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, handle?: string) => void;
}) {
  const baseStyles: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    zIndex: element.zIndex,
    cursor: "move",
  };

  const renderContent = () => {
    switch (element.type) {
      case "text":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent:
                element.textAlign === "left"
                  ? "flex-start"
                  : element.textAlign === "right"
                    ? "flex-end"
                    : "center",
              fontFamily: element.fontFamily,
              fontSize: `${element.fontSize}px`,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              color: element.color,
              textAlign: element.textAlign,
              wordBreak: "break-word",
              overflow: "hidden",
            }}
          >
            {element.text}
          </div>
        );

      case "image":
      case "logo":
        return element.src ? (
          <img
            src={element.src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: element.objectFit || "contain",
            }}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded bg-slate-200/50 text-slate-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={baseStyles}
      className={cn("group select-none", isSelected && "ring-2 ring-blue-500 ring-offset-1")}
      onMouseDown={(e) => onMouseDown(e)}
    >
      {renderContent()}

      {/* Resize handles */}
      {isSelected && (
        <>
          {["nw", "ne", "sw", "se", "n", "s", "e", "w"].map((handle) => (
            <div
              key={handle}
              className={cn(
                "absolute h-3 w-3 rounded-full bg-blue-500 shadow",
                handle === "nw" && "-left-1.5 -top-1.5 cursor-nw-resize",
                handle === "ne" && "-right-1.5 -top-1.5 cursor-ne-resize",
                handle === "sw" && "-bottom-1.5 -left-1.5 cursor-sw-resize",
                handle === "se" && "-bottom-1.5 -right-1.5 cursor-se-resize",
                handle === "n" && "-top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize",
                handle === "s" && "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize",
                handle === "e" && "-right-1.5 top-1/2 -translate-y-1/2 cursor-e-resize",
                handle === "w" && "-left-1.5 top-1/2 -translate-y-1/2 cursor-w-resize"
              )}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, handle);
              }}
            />
          ))}
        </>
      )}

      {/* Move indicator on hover */}
      {!isSelected && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-black/50 p-2">
            <Move className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export default CoverPageCanvas;

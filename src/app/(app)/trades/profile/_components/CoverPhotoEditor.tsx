/**
 * Cover Photo Editor Component
 * Allows users to zoom, pan, and crop their cover photo
 */

"use client";

import { Check, Loader2, Move, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { logger } from "@/lib/logger";

interface CoverPhotoEditorProps {
  imageUrl: string;
  onSave: (croppedImageUrl: string) => Promise<void>;
  onCancel: () => void;
}

export default function CoverPhotoEditor({ imageUrl, onSave, onCancel }: CoverPhotoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle mouse/touch drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragStart({ x: clientX - position.x, y: clientY - position.y });
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Save cropped image
  const handleSave = async () => {
    if (!containerRef.current || !imageRef.current) return;

    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      const container = containerRef.current.getBoundingClientRect();

      // Set canvas to container size (the visible area)
      canvas.width = container.width;
      canvas.height = container.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      const img = imageRef.current;

      // Calculate the source rectangle based on current transform
      const scaledWidth = img.naturalWidth * scale;
      const scaledHeight = img.naturalHeight * scale;

      // Draw the image with the current transform
      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth,
        img.naturalHeight,
        position.x,
        position.y,
        scaledWidth,
        scaledHeight
      );

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          0.9
        );
      });

      // Upload the cropped image
      const formData = new FormData();
      formData.append("file", blob, "cover.jpg");

      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      await onSave(url);
      toast.success("Cover photo saved!");
    } catch (error) {
      logger.error("Save error:", error);
      toast.error("Failed to save cover photo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">Edit Cover Photo</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="p-4">
          <div
            ref={containerRef}
            className="relative h-64 cursor-move overflow-hidden rounded-lg bg-slate-100 md:h-80"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Cover"
              crossOrigin="anonymous"
              className="absolute select-none"
              {...{
                style: {
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: "top left",
                  maxWidth: "none",
                },
              }}
              onLoad={() => setImageLoaded(true)}
              draggable={false}
            />

            {/* Overlay grid for alignment */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>

            {/* Drag hint */}
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              <Move className="mr-1 inline-block h-3 w-3" />
              Drag to reposition
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="mt-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScale((s) => Math.min(3, s + 0.1))}
              disabled={scale >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="w-16 text-center text-sm text-slate-500">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

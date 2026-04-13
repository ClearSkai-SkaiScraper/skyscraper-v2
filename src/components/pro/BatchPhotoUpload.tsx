"use client";

import { CheckCircle, Loader2, Upload, X, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  category: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
}

const CATEGORIES = [
  { value: "roof", label: "Roof", icon: "🏠" },
  { value: "siding", label: "Siding", icon: "🧱" },
  { value: "gutters", label: "Gutters", icon: "💧" },
  { value: "windows", label: "Windows", icon: "🪟" },
  { value: "interior", label: "Interior", icon: "🛋️" },
  { value: "exterior", label: "Exterior", icon: "🏡" },
  { value: "damage", label: "Damage", icon: "⚠️" },
  { value: "other", label: "Other", icon: "📷" },
];

interface BatchPhotoUploadProps {
  claimId: string;
  onComplete?: (uploadedCount: number) => void;
  className?: string;
}

export function BatchPhotoUpload({ claimId, onComplete, className }: BatchPhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState("roof");
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newPhotos: PhotoFile[] = Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          category: defaultCategory,
          status: "pending" as const,
          progress: 0,
        }));

      setPhotos((prev) => [...prev, ...newPhotos]);
      toast.success(`Added ${newPhotos.length} photos`);
    },
    [defaultCategory]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updatePhotoCategory = useCallback((id: string, category: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, category } : p)));
  }, []);

  const uploadAllPhotos = async () => {
    setIsUploading(true);
    let successCount = 0;

    for (const photo of photos) {
      if (photo.status === "success") continue;

      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, status: "uploading", progress: 0 } : p))
      );

      try {
        const formData = new FormData();
        formData.append("file", photo.file);
        formData.append("claimId", claimId);
        formData.append("category", photo.category);

        const res = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, status: "success", progress: 100 } : p))
        );
        successCount++;
      } catch {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, status: "error", progress: 0 } : p))
        );
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} photos successfully`);
      onComplete?.(successCount);
    }
  };

  const pendingCount = photos.filter((p) => p.status === "pending" || p.status === "error").length;
  const successCount = photos.filter((p) => p.status === "success").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition-all",
          isDragging
            ? "border-[#117CFF] bg-[#117CFF]/5"
            : "border-muted-foreground/20 hover:border-muted-foreground/40"
        )}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <Upload
          className={cn(
            "mx-auto mb-4 h-12 w-12",
            isDragging ? "text-[#117CFF]" : "text-muted-foreground"
          )}
        />
        <p className="mb-1 text-lg font-semibold">
          {isDragging ? "Drop photos here" : "Drag & drop photos"}
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse • Supports JPG, PNG, HEIC
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Upload up to 100 photos at once</p>
      </div>

      {/* Default Category Selector */}
      {photos.length === 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium">Default Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setDefaultCategory(cat.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  defaultCategory === cat.value
                    ? "bg-[#117CFF] text-white"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {photos.length} photos • {successCount} uploaded • {pendingCount} pending
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPhotos([])}
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              Clear All
            </Button>
          </div>

          <div className="grid max-h-96 grid-cols-4 gap-2 overflow-y-auto p-1 md:grid-cols-6 lg:grid-cols-8">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg"
              >
                <img src={photo.preview} alt="" className="h-full w-full object-cover" />

                {/* Status Overlay */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    photo.status === "uploading" && "bg-black/50",
                    photo.status === "success" && "bg-green-500/30",
                    photo.status === "error" && "bg-red-500/30"
                  )}
                >
                  {photo.status === "uploading" && (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  )}
                  {photo.status === "success" && <CheckCircle className="h-6 w-6 text-green-500" />}
                  {photo.status === "error" && <XCircle className="h-6 w-6 text-red-500" />}
                </div>

                {/* Remove Button */}
                {photo.status !== "uploading" && (
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}

                {/* Category Tag */}
                <select
                  value={photo.category}
                  onChange={(e) => updatePhotoCategory(photo.id, e.target.value)}
                  disabled={photo.status === "uploading" || photo.status === "success"}
                  className="absolute bottom-0 left-0 right-0 border-0 bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <Button
            onClick={uploadAllPhotos}
            disabled={isUploading || pendingCount === 0}
            className="w-full bg-[#117CFF] hover:bg-[#0066DD]"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingCount} Photos
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

"use client";

import { Camera, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

interface PhotoUploaderProps {
  onPhotosChange: (urls: string[]) => void;
  maxPhotos?: number;
  initialPhotos?: string[];
}

export default function PhotoUploader({
  onPhotosChange,
  maxPhotos = 10,
  initialPhotos = [],
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Validate count
      if (photos.length + fileArray.length > maxPhotos) {
        toast.error(`Maximum ${maxPhotos} photos allowed`);
        return;
      }

      // Validate types and sizes
      const validFiles = fileArray.filter((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          return false;
        }
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 25MB)`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setUploading(true);

      try {
        const formData = new FormData();
        validFiles.forEach((file) => formData.append("files", file));

        const res = await fetch("/api/upload/portfolio", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const { urls } = await res.json();
        const newPhotos = [...photos, ...urls];
        setPhotos(newPhotos);
        onPhotosChange(newPhotos);
        toast.success(`${urls.length} photo(s) uploaded successfully`);
      } catch (error: any) {
        logger.error("Upload error:", error);
        toast.error(error.message || "Failed to upload photos");
      } finally {
        setUploading(false);
      }
    },
    [photos, maxPhotos, onPhotosChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  const removePhoto = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
      onPhotosChange(newPhotos);
    },
    [photos, onPhotosChange]
  );

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-muted-foreground/30 hover:border-muted-foreground/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="photo-upload"
          accept="image/*"
          multiple
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          disabled={uploading || photos.length >= maxPhotos}
          aria-label="Upload photos"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Camera className="h-10 w-10 text-muted-foreground/60" />
            <div>
              <p className="font-medium text-foreground">Drop photos here or click to upload</p>
              <p className="text-xs text-muted-foreground">
                {photos.length}/{maxPhotos} photos • Max 25MB each • JPG, PNG, WEBP
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((url, index) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={url}
                alt={`Uploaded photo ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

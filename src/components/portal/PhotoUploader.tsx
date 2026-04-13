"use client";

/**
 * PhotoUploader — Enhanced portal photo uploader with progress bars (C6 Enhancement)
 *
 * Features:
 * - Individual progress bars per file
 * - Thumbnail previews while uploading
 * - Drag-and-drop support
 * - Error handling per file
 */

import { Camera, CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
  url?: string;
}

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
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("files", file);

    const res = await fetch("/api/upload/portfolio", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Upload failed");
    }

    const { urls } = await res.json();
    return urls?.[0] || null;
  };

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Validate count
      if (photos.length + uploadingFiles.length + fileArray.length > maxPhotos) {
        toast.error(`Maximum ${maxPhotos} photos allowed`);
        return;
      }

      // Validate types and sizes, create preview objects
      const validFiles: UploadingFile[] = [];
      for (const file of fileArray) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 25MB)`);
          continue;
        }
        validFiles.push({
          id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          status: "uploading",
        });
      }

      if (validFiles.length === 0) return;

      // Add to uploading state immediately (shows thumbnails with progress)
      setUploadingFiles((prev) => [...prev, ...validFiles]);

      // Upload each file individually with progress simulation
      const uploadPromises = validFiles.map(async (uploadFile) => {
        try {
          // Simulate progress (real XHR progress would require XMLHttpRequest)
          const progressIntervals = [10, 30, 50, 70, 90];
          for (const progress of progressIntervals) {
            await new Promise((r) => setTimeout(r, 100 + Math.random() * 150));
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f))
            );
          }

          const url = await uploadSingleFile(uploadFile.file);

          if (url) {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress: 100, status: "success", url } : f
              )
            );
            return url;
          }
          throw new Error("No URL returned");
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Upload failed";
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error", error: errorMessage } : f
            )
          );
          logger.error("Upload error:", error);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successUrls = results.filter((url): url is string => url !== null);

      if (successUrls.length > 0) {
        const newPhotos = [...photos, ...successUrls];
        setPhotos(newPhotos);
        onPhotosChange(newPhotos);
        toast.success(`${successUrls.length} photo(s) uploaded successfully`);
      }

      // Clear successful uploads from progress view after delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.status !== "success"));
      }, 1500);
    },
    [photos, uploadingFiles.length, maxPhotos, onPhotosChange]
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
        void handleUpload(e.dataTransfer.files);
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

  const removeUploadingFile = useCallback((id: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const isUploading = uploadingFiles.some((f) => f.status === "uploading");

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed p-6 text-center transition-all",
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-muted-foreground/30 hover:border-muted-foreground/50"
        )}
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
          disabled={isUploading || photos.length >= maxPhotos}
          aria-label="Upload photos"
        />

        <div className="flex flex-col items-center gap-2">
          <Camera className="h-10 w-10 text-muted-foreground/60" />
          <div>
            <p className="font-medium text-foreground">Drop photos here or click to upload</p>
            <p className="text-xs text-muted-foreground">
              {photos.length}/{maxPhotos} photos • Max 25MB each • JPG, PNG, WEBP
            </p>
          </div>
        </div>
      </div>

      {/* Uploading Files with Progress (C6 Enhancement) */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Uploading...</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className="relative overflow-hidden rounded-lg border border-border bg-card"
              >
                {/* Thumbnail Preview */}
                <div className="relative aspect-square">
                  <Image
                    src={file.preview}
                    alt="Uploading"
                    fill
                    className={cn(
                      "object-cover transition-opacity",
                      file.status === "uploading" && "opacity-70"
                    )}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />

                  {/* Status Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {file.status === "uploading" && (
                      <div className="rounded-full bg-black/50 p-2">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                    {file.status === "success" && (
                      <div className="rounded-full bg-emerald-500/90 p-2">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    )}
                    {file.status === "error" && (
                      <button
                        type="button"
                        onClick={() => removeUploadingFile(file.id)}
                        className="rounded-full bg-red-500/90 p-2"
                        title={file.error}
                      >
                        <XCircle className="h-5 w-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {file.status === "uploading" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* File Name */}
                <div className="p-1.5">
                  <p className="truncate text-[10px] text-muted-foreground">{file.file.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Uploaded Photos</p>
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
        </div>
      )}
    </div>
  );
}

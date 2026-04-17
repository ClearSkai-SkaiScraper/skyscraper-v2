"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface BrandingUploadProps {
  type: "logo" | "team" | "cover";
  currentUrl?: string | null;
  onUploadComplete: (url: string) => void;
}

/**
 * BrandingUpload - Uses Supabase Storage via /api/branding/upload
 * Replaced UploadThing with direct Supabase for reliability
 */
export function BrandingUpload({ type, currentUrl, onUploadComplete }: BrandingUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload an image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("File too large. Maximum size is 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/branding/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.url) {
        onUploadComplete(data.url);
        setError(null);
      } else {
        throw new Error("No URL returned from upload");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[BrandingUpload] Error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const label = type === "logo" ? "Company Logo" : type === "cover" ? "Cover Photo" : "Team Photo";
  const emoji = type === "logo" ? "📷" : type === "cover" ? "🖼️" : "👥";

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
        {label}
      </label>
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        {currentUrl ? (
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={label}
            className={`mx-auto mb-2 h-20 object-contain ${type === "team" ? "rounded" : ""}`}
          />
        ) : (
          <div className="mb-2 text-4xl">{emoji}</div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id={`${type}-upload`}
          disabled={uploading}
          aria-label={`Upload ${label}`}
        />

        <label
          htmlFor={`${type}-upload`}
          className={`cursor-pointer text-blue-600 hover:text-blue-700 ${
            uploading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </span>
          ) : currentUrl ? (
            `Change ${label}`
          ) : (
            `Upload ${label}`
          )}
        </label>

        {error && <p className="mt-2 text-xs text-red-600">Upload failed: {error}</p>}

        <p className="mt-2 text-xs text-slate-500">Max 4MB • JPG, PNG, WebP, GIF</p>
      </div>
    </div>
  );
}

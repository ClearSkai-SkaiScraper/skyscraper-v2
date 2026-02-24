"use client";

// ============================================================================
// PHOTO MANAGER - Phase 3
// ============================================================================
// Grid/list view with upload, delete, tag, and drag-to-group

import { Grid, List, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface Photo {
  id: string;
  url: string;
  caption?: string;
  category?: string;
  locationTag?: string;
  takenAt?: string;
}

const CATEGORIES = [
  "softMetals",
  "field",
  "collateral",
  "interior",
  "testCuts",
  "roof",
  "exterior",
  "other",
];

const CATEGORY_LABELS: Record<string, string> = {
  softMetals: "Soft Metals",
  field: "Field Inspection",
  collateral: "Collateral Damage",
  interior: "Interior",
  testCuts: "Test Cuts",
  roof: "Roof",
  exterior: "Exterior",
  other: "Other",
};

interface PhotoManagerProps {
  reportId: string;
}

export default function PhotoManager({ reportId }: PhotoManagerProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("photos", file);
      });
      formData.append("reportId", reportId);

      const res = await fetch(`/api/reports/${reportId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { photos: newPhotos } = await res.json();
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (error) {
      console.error("[Photo Upload]", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoIds: string[]) => {
    if (!confirm(`Delete ${photoIds.length} photo(s)?`)) return;

    try {
      await fetch(`/api/reports/${reportId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds }),
      });

      setPhotos((prev) => prev.filter((p) => !photoIds.includes(p.id)));
      setSelectedPhotos([]);
    } catch (error) {
      console.error("[Photo Delete]", error);
    }
  };

  const handleCategoryChange = async (photoId: string, category: string) => {
    try {
      await fetch(`/api/reports/${reportId}/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });

      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, category } : p)));
    } catch (error) {
      console.error("[Photo Update]", error);
    }
  };

  const toggleSelection = (photoId: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Photo Manager</h2>
          <p className="mt-1 text-sm text-gray-600">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
            {selectedPhotos.length > 0 && (
              <span className="ml-2 font-medium text-blue-600">
                ({selectedPhotos.length} selected)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded bg-gray-100 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded p-2 ${
                viewMode === "grid" ? "bg-white text-gray-900 shadow" : "text-gray-600"
              }`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded p-2 ${
                viewMode === "list" ? "bg-white text-gray-900 shadow" : "text-gray-600"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Upload */}
          <label className="flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />
          </label>

          {/* Delete Selected */}
          {selectedPhotos.length > 0 && (
            <button
              onClick={() => handleDelete(selectedPhotos)}
              className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete ({selectedPhotos.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {uploading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!uploading && photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="mb-3 h-12 w-12 text-gray-400" />
            <p className="font-medium text-gray-600">No photos yet</p>
            <p className="mt-1 text-sm text-gray-500">Upload photos to get started</p>
          </div>
        )}

        {!uploading && photos.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative cursor-pointer overflow-hidden rounded-lg border-2 bg-white transition-all ${
                  selectedPhotos.includes(photo.id)
                    ? "border-blue-600 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => toggleSelection(photo.id)}
              >
                <div className="relative aspect-square">
                  <Image
                    src={photo.url}
                    alt={photo.caption || "Photo"}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-2">
                  <select
                    value={photo.category || ""}
                    onChange={(e) => {
                      e.stopPropagation();
                      void handleCategoryChange(photo.id, e.target.value);
                    }}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">No category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {!uploading && photos.length > 0 && viewMode === "list" && (
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {photos.map((photo) => (
              <div key={photo.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedPhotos.includes(photo.id)}
                  onChange={() => toggleSelection(photo.id)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600"
                />

                <div className="relative h-16 w-16 flex-shrink-0">
                  <Image
                    src={photo.url}
                    alt={photo.caption || "Photo"}
                    fill
                    className="rounded object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {photo.caption || "Untitled"}
                  </p>
                  {photo.locationTag && (
                    <p className="text-xs text-gray-500">{photo.locationTag}</p>
                  )}
                </div>

                <select
                  value={photo.category || ""}
                  onChange={(e) => handleCategoryChange(photo.id, e.target.value)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="">No category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleDelete([photo.id])}
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

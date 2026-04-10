// src/app/(app)/claims/[claimId]/_components/CoverPhotoPicker.tsx
"use client";

import { Check, Image as ImageIcon, Upload, X } from "lucide-react";
import { useState } from "react";

import { ClaimPhotoUpload } from "@/components/uploads";
import { logger } from "@/lib/logger";

interface Photo {
  id: string;
  title: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface CoverPhotoPickerProps {
  claimId: string;
  currentCoverUrl?: string | null;
  onClose: () => void;
  onSet: (photoUrl: string, photoId?: string) => void;
}

export function CoverPhotoPicker({
  claimId,
  currentCoverUrl,
  onClose,
  onSet,
}: CoverPhotoPickerProps) {
  const [activeTab, setActiveTab] = useState<"existing" | "upload">("existing");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(currentCoverUrl || null);

  // Fetch existing photos when modal opens
  useState(() => {
    if (activeTab === "existing") {
      void fetchPhotos();
    }
  });

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/photos`);
      const data = await res.json();
      if (data.photos) {
        setPhotos(data.photos);
      }
    } catch (error) {
      logger.error("Failed to fetch photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCover = async () => {
    if (!selectedPhotoUrl) return;

    const selectedPhoto = photos.find((p) => p.publicUrl === selectedPhotoUrl);

    try {
      const res = await fetch(`/api/claims/${claimId}/cover-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverPhotoUrl: selectedPhotoUrl,
          coverPhotoId: selectedPhoto?.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to set cover photo");

      onSet(selectedPhotoUrl, selectedPhoto?.id);
      onClose();
    } catch (error) {
      logger.error("Failed to set cover photo:", error);
      alert("Failed to set cover photo. Please try again.");
    }
  };

  const handleUploadComplete = async (urls: string[]) => {
    if (urls.length > 0) {
      // Set the first uploaded photo as cover immediately
      await fetchPhotos(); // Refresh list
      onSet(urls[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Set Cover Photo</h2>
          <button
            onClick={onClose}
            aria-label="Close photo picker"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab("existing");
              void fetchPhotos();
            }}
            aria-label="Choose from existing photos"
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "existing"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="mr-2 inline-block h-4 w-4" />
            Choose Existing
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            aria-label="Upload new photo"
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="mr-2 inline-block h-4 w-4" />
            Upload New
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {activeTab === "existing" ? (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                    <p className="text-sm text-slate-600">Loading photos...</p>
                  </div>
                </div>
              ) : photos.length === 0 ? (
                <div className="py-16 text-center">
                  <ImageIcon className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                  <p className="mb-2 text-slate-700">No photos yet</p>
                  <p className="text-sm text-slate-500">Upload photos first, then set as cover</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoUrl(photo.publicUrl)}
                      aria-label={`Select ${photo.title} as cover photo`}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        selectedPhotoUrl === photo.publicUrl
                          ? "border-blue-600 ring-2 ring-blue-200"
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    >
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.publicUrl}
                        alt={photo.title}
                        className="h-full w-full object-cover"
                      />
                      {selectedPhotoUrl === photo.publicUrl && (
                        <div className="absolute right-2 top-2 rounded-full bg-blue-600 p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="truncate text-xs text-white">{photo.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="mb-4 text-sm text-slate-600">
                Upload a new photo and set it as the cover image immediately.
              </p>
              <ClaimPhotoUpload claimId={claimId} onUploadComplete={handleUploadComplete} />
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === "existing" && photos.length > 0 && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSetCover}
              disabled={!selectedPhotoUrl}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set as Cover Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

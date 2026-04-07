/**
 * EvidenceGrid Component
 * Display evidence assets in a grid with thumbnails and metadata
 */

"use client";

import { Edit3, FileText, Film, Image, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export interface EvidenceAsset {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  title?: string | null;
  description?: string | null;
  tags: string[];
  uploadedAt: Date | string;
}

interface EvidenceGridProps {
  assets: EvidenceAsset[];
  claimId: string;
  onAssetUpdated?: () => void;
}

export function EvidenceGrid({ assets, claimId, onAssetUpdated }: EvidenceGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<EvidenceAsset | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingChanges, setSavingChanges] = useState(false);

  // Fetch thumbnail signed URL on mount
  const getThumbnail = async (assetId: string) => {
    if (thumbnailUrls[assetId]) return;

    try {
      const response = await fetch(`/api/evidence/${assetId}/signed-url`);
      const data = await response.json();
      setThumbnailUrls((prev) => ({ ...prev, [assetId]: data.signedUrl }));
    } catch (error) {
      logger.error("Failed to fetch thumbnail:", error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="h-5 w-5" />;
    }
    if (mimeType.startsWith("video/")) {
      return <Film className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  if (assets.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed py-12 text-center">
        <Image className="mx-auto mb-2 h-12 w-12 text-gray-400" />
        <p className="text-sm text-gray-600">No evidence uploaded yet</p>
        <p className="text-xs text-gray-500">Upload photos to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {assets.map((asset) => {
        // Fetch thumbnail if not already loaded
        if (!thumbnailUrls[asset.id] && asset.mimeType.startsWith("image/")) {
          void getThumbnail(asset.id);
        }

        return (
          <div
            key={asset.id}
            className="group relative overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
          >
            {/* Thumbnail */}
            <div className="flex aspect-square items-center justify-center bg-gray-100">
              {thumbnailUrls[asset.id] ? (
                <img
                  src={thumbnailUrls[asset.id]}
                  alt={asset.title || asset.originalName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-gray-400">{getFileIcon(asset.mimeType)}</div>
              )}
            </div>

            {/* Overlay Actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black bg-opacity-0 opacity-0 transition-opacity group-hover:bg-opacity-40 group-hover:opacity-100">
              <Button size="sm" variant="secondary" onClick={() => setSelectedAsset(asset)}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deletingId === asset.id}
                onClick={async () => {
                  if (confirm("Delete this evidence? This action cannot be undone.")) {
                    try {
                      setDeletingId(asset.id);
                      const response = await fetch(`/api/evidence/${asset.id}`, {
                        method: "DELETE",
                      });

                      if (!response.ok) {
                        throw new Error("Failed to delete evidence");
                      }

                      // Refresh the list
                      onAssetUpdated?.();
                    } catch (error) {
                      logger.error("Delete failed:", error);
                      alert("Failed to delete evidence. Please try again.");
                    } finally {
                      setDeletingId(null);
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Metadata */}
            <div className="border-t p-2">
              <p className="truncate text-xs font-medium">{asset.title || asset.originalName}</p>
              <p className="text-xs text-gray-500">
                {new Date(asset.uploadedAt).toLocaleDateString()}
              </p>
              {asset.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {asset.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                  {asset.tags.length > 2 && (
                    <span className="text-xs text-gray-500">+{asset.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Edit Modal (simplified) */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
            data-evidence-form
          >
            <h3 className="mb-4 text-lg font-semibold">Edit Evidence</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  name="title"
                  type="text"
                  defaultValue={selectedAsset.title || ""}
                  className="mt-1 w-full rounded border px-3 py-2"
                  aria-label="Title"
                  title="Title"
                  placeholder="Title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  defaultValue={selectedAsset.description || ""}
                  className="mt-1 w-full rounded border px-3 py-2"
                  rows={3}
                  aria-label="Description"
                  title="Description"
                  placeholder="Description"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tags</label>
                <input
                  name="tags"
                  type="text"
                  defaultValue={selectedAsset.tags.join(", ")}
                  placeholder="Comma-separated tags"
                  className="mt-1 w-full rounded border px-3 py-2"
                  aria-label="Tags"
                  title="Tags"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedAsset(null)}
                disabled={savingChanges}
              >
                Cancel
              </Button>
              <Button
                disabled={savingChanges}
                onClick={async () => {
                  try {
                    setSavingChanges(true);

                    // Get form values
                    const form = document.querySelector("[data-evidence-form]") as HTMLElement;
                    const title =
                      (form?.querySelector('[name="title"]') as HTMLInputElement)?.value || "";
                    const description =
                      (form?.querySelector('[name="description"]') as HTMLTextAreaElement)?.value ||
                      "";
                    const tagsInput =
                      (form?.querySelector('[name="tags"]') as HTMLInputElement)?.value || "";
                    const tags = tagsInput
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);

                    const response = await fetch(`/api/evidence/${selectedAsset.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title, description, tags }),
                    });

                    if (!response.ok) {
                      throw new Error("Failed to save changes");
                    }

                    // Refresh the list and close modal
                    onAssetUpdated?.();
                    setSelectedAsset(null);
                  } catch (error) {
                    logger.error("Save failed:", error);
                    alert("Failed to save changes. Please try again.");
                  } finally {
                    setSavingChanges(false);
                  }
                }}
              >
                {savingChanges ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

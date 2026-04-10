"use client";

import { Image as ImageIcon, Upload, X } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { ClaimPacketData } from "@/lib/claims/templates";

interface Step7Props {
  data: ClaimPacketData;
  updateData: (updates: Partial<ClaimPacketData>) => void;
  validationErrors?: string[];
}

/**
 * Step 7: Photos
 *
 * All fields are OPTIONAL
 *
 * Note: This is a UI stub for Phase 1A.
 * Actual photo upload functionality will be implemented in Phase 2.
 * For now, this step shows the upload interface without backend integration.
 */
export function Step7_Photos({ data, updateData }: Step7Props) {
  // Stub: Mock photo list (in Phase 2, this will come from server)
  const mockPhotos = data.photos || [];

  // Stub: Add photo placeholder
  const handleAddPhoto = () => {
    // Phase 2: Trigger file upload dialog
    alert("Photo upload will be enabled in Phase 2. For now, this is a visual placeholder.");
  };

  // Stub: Remove photo
  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = mockPhotos.filter((_, i) => i !== index);
    updateData({ photos: updatedPhotos });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Project Photos</h2>
        <p className="mt-2 text-sm text-gray-600">
          Upload photos of the property, damage, or completed work. Photos help homeowners visualize
          the project scope.
        </p>
      </div>

      {/* Upload Area (Stub) */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Upload Photos</h3>

        {/* Drag & Drop Zone */}
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-12 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50"
          onClick={handleAddPhoto}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-full bg-blue-100 p-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, HEIC up to 10MB each</p>
            </div>
            <Button type="button" variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Browse Files
            </Button>
          </div>
        </div>

        {/* Phase 2 Notice */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-yellow-700">
                <strong>Phase 2 Feature:</strong> Photo upload functionality is coming in Phase 2.
                For now, this wizard will allow you to proceed without photos. The final packet will
                include a placeholder for photo sections.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery (Stub - Shows Mock or Real Photos) */}
      {mockPhotos.length > 0 && (
        <div className="space-y-6">
          <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">
            Uploaded Photos ({mockPhotos.length})
          </h3>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {mockPhotos.map((photo, index) => (
              <div key={index} className="group relative">
                {/* Photo Thumbnail */}
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {/* Photo Caption */}
                <div className="mt-2 truncate text-xs text-gray-600">
                  {photo.caption || `Photo ${index + 1}`}
                </div>

                {/* Remove Button (Appears on Hover) */}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> High-quality photos significantly improve packet presentation.
              Include before/during/after shots, damage close-ups, and completed work. Label photos
              clearly for easy reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

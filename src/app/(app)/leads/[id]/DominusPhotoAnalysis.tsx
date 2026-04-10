"use client";

import { AlertCircle,Image } from "lucide-react";
import { useState } from "react";

import { DominusVisionModal } from "./DominusVisionModal";

interface ImageAnalysis {
  damageTypes: string[];
  severity: string;
  flags: string[];
  notes: string;
  confidence: number;
  imageUrl: string;
}

interface DominusPhotoAnalysisProps {
  leadId: string;
  images: ImageAnalysis[];
}

export function DominusPhotoAnalysis({ leadId, images }: DominusPhotoAnalysisProps) {
  const [selectedImage, setSelectedImage] = useState<ImageAnalysis | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Image className="mx-auto mb-4 h-12 w-12 text-gray-600 dark:text-gray-400" />
        <h3 className="mb-2 font-semibold text-gray-900">No Photo Analysis</h3>
        <p className="text-sm text-gray-600">
          No images have been analyzed for this lead yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(image)}
            className="group relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200 transition-all hover:border-purple-500"
          >
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.imageUrl}
              alt={`Analysis ${idx + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {image.damageTypes && image.damageTypes.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="flex items-center gap-1 text-xs text-white">
                  <AlertCircle className="h-3 w-3" />
                  <span>{image.damageTypes.length} damage type{image.damageTypes.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
            <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
              {image.confidence}%
            </div>
          </button>
        ))}
      </div>

      {selectedImage && (
        <DominusVisionModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          leadId={leadId}
        />
      )}
    </div>
  );
}

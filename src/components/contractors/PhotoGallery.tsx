"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

import { X } from "lucide-react";
import { useState } from "react";

interface PhotoGalleryProps {
  portfolioUrls: string[];
  editable?: boolean;
  onRemove?: (url: string) => void;
}

export function PhotoGallery({ portfolioUrls, editable = false, onRemove }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (portfolioUrls.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
        <p className="text-gray-500">No portfolio photos yet</p>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % portfolioUrls.length);
    }
  };

  const prevPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + portfolioUrls.length) % portfolioUrls.length);
    }
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {portfolioUrls.map((url, index) => (
          <div
            key={index}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
            onClick={() => openLightbox(index)}
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Portfolio ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {editable && onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(url);
                }}
                className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-700 group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            className="absolute right-4 top-4 rounded-full bg-white p-2 text-gray-900 hover:bg-gray-200"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous button */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 text-gray-900 hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              prevPhoto();
            }}
          >
            ←
          </button>

          // eslint-disable-next-line react/jsx-no-comment-textnodes
          {/* Image */}
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={portfolioUrls[lightboxIndex]}
              alt={`Portfolio ${lightboxIndex + 1}`}
              className="max-h-[90vh] max-w-full rounded-lg"
            />
            <p className="mt-4 text-center text-white">
              {lightboxIndex + 1} / {portfolioUrls.length}
            </p>
          </div>

          {/* Next button */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 text-gray-900 hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              nextPhoto();
            }}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}

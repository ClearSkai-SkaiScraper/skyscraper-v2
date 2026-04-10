/**
 * Annotated Photo Gallery Component
 *
 * Displays AI-annotated photos with damage markers.
 * Features: zoom, before/after, captions, full analysis.
 */

"use client";

import { ChevronLeft, ChevronRight, Download,X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

import type { AnnotatedPhoto } from "@/lib/ai/photo-annotator";

interface AnnotatedPhotoGalleryProps {
  photos: AnnotatedPhoto[];
  onExport?: () => void;
}

export function AnnotatedPhotoGallery({ photos, onExport }: AnnotatedPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<AnnotatedPhoto | null>(null);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handlePhotoClick = (photo: AnnotatedPhoto) => {
    setSelectedPhoto(photo);
    setZoom(1);
  };

  const handleClose = () => {
    setSelectedPhoto(null);
    setZoom(1);
  };

  const handleNext = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.photoId === selectedPhoto.photoId);
    const nextIndex = (currentIndex + 1) % photos.length;
    setSelectedPhoto(photos[nextIndex]);
    setZoom(1);
  };

  const handlePrevious = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.photoId === selectedPhoto.photoId);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIndex]);
    setZoom(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "catastrophic":
        return "bg-red-900 text-white";
      case "severe":
        return "bg-red-600 text-white";
      case "moderate":
        return "bg-yellow-500 text-white";
      case "minor":
        return "bg-green-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "immediate":
        return "text-red-600 bg-red-50 border-red-200";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">AI-Annotated Photo Analysis</h3>
          <p className="text-sm text-slate-600">
            {photos.length} photos analyzed •{" "}
            {photos.reduce((sum, p) => sum + p.annotations.length, 0)} damage points identified
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {viewMode === "grid" ? "List View" : "Grid View"}
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Photo Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, idx) => (
            <button
              key={photo.photoId}
              onClick={() => handlePhotoClick(photo)}
              className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white transition-all hover:shadow-lg"
            >
              {/* Photo */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={photo.photoUrl}
                  alt={photo.caption}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Severity Badge */}
                <div className="absolute left-2 top-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${getSeverityColor(
                      photo.overallSeverity
                    )}`}
                  >
                    {photo.overallSeverity.toUpperCase()}
                  </span>
                </div>

                {/* Damage Count */}
                <div className="absolute right-2 top-2">
                  <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-slate-900">
                    {photo.annotations.length} points
                  </span>
                </div>

                {/* Caption Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{photo.caption}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Photo {idx + 1}</span>
                  <span className="font-semibold text-red-600">
                    {photo.metadata.criticalDamage} critical
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {photos.map((photo, idx) => (
            <button
              key={photo.photoId}
              onClick={() => handlePhotoClick(photo)}
              className="flex w-full gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="relative h-24 w-36 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                <img
                  src={photo.photoUrl}
                  alt={photo.caption}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-1 top-1">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-bold ${getSeverityColor(
                      photo.overallSeverity
                    )}`}
                  >
                    {photo.overallSeverity.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">Photo {idx + 1}</h4>
                    <p className="mt-1 text-sm text-slate-600">{photo.caption}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {photo.annotations.length} damage points
                  </span>
                </div>

                {/* Top Annotations */}
                <div className="mt-2 space-y-1">
                  {photo.annotations.slice(0, 2).map((ann) => (
                    <div key={ann.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <span
                        className={`rounded px-1.5 py-0.5 font-semibold ${getUrgencyColor(
                          ann.urgency
                        )}`}
                      >
                        {ann.urgency.toUpperCase()}
                      </span>
                      <span className="line-clamp-1">{ann.description}</span>
                    </div>
                  ))}
                  {photo.annotations.length > 2 && (
                    <div className="text-xs text-slate-500">
                      +{photo.annotations.length - 2} more annotations
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          {/* Controls */}
          <div className="absolute left-4 top-4 z-10 flex gap-2">
            <button
              onClick={() => setZoom(Math.min(zoom + 0.25, 3))}
              className="rounded-lg bg-white/90 p-2 text-slate-900 hover:bg-white"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom - 0.25, 1))}
              className="rounded-lg bg-white/90 p-2 text-slate-900 hover:bg-white"
              disabled={zoom <= 1}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 p-2 text-slate-900 hover:bg-white"
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Navigation */}
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/90 p-2 text-slate-900 hover:bg-white"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/90 p-2 text-slate-900 hover:bg-white"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Photo */}
          <div className="relative max-h-[80vh] max-w-[80vw] overflow-auto">
            <img
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.caption}
              className="rounded-lg"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            />
          </div>

          {/* Annotations Panel */}
          <div className="absolute bottom-4 left-4 right-4 max-h-48 overflow-auto rounded-lg bg-white p-4">
            <h4 className="mb-2 font-bold text-slate-900">{selectedPhoto.caption}</h4>
            <div className="space-y-2">
              {selectedPhoto.annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-bold ${getUrgencyColor(
                      ann.urgency
                    )}`}
                  >
                    {ann.urgency.toUpperCase()}
                  </span>
                  <div className="flex-1 text-sm text-slate-700">
                    <span className="font-semibold">{ann.type.toUpperCase()} - </span>
                    {ann.description}
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-bold ${getSeverityColor(
                      ann.severity
                    )}`}
                  >
                    {ann.severity.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

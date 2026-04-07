/**
 * Enhanced Photos Tab Component
 * Full-featured photo gallery with lightbox, categories, and upload
 */

"use client";

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Grid,
  Maximize2,
  Plus,
  Share2,
  X,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Photo {
  id: string;
  url: string;
  title?: string;
  description?: string;
  category?: string;
  createdAt: string;
  likes?: number;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  imageUrls: string[];
  beforeImage?: string;
  afterImage?: string;
  createdAt: string;
}

interface EnhancedPhotosTabProps {
  userId?: string;
  isOwnProfile: boolean;
  photos: Photo[];
  portfolio?: PortfolioItem[];
}

export default function EnhancedPhotosTab({
  userId = "",
  isOwnProfile,
  photos,
  portfolio = [],
}: EnhancedPhotosTabProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");
  const [albumView, setAlbumView] = useState<"all" | "albums">("all");

  // Combine all photos from portfolio items (safely handle empty/undefined portfolio)
  const safePortfolio = portfolio || [];

  // Define default albums/folders
  const albums = {
    "Profile Photos": (photos || []).filter(
      (p) => p.category === "Profile Photo" || p.category === "profile"
    ),
    "Cover Photos": (photos || []).filter(
      (p) => p.category === "Cover Photo" || p.category === "cover"
    ),
    "Job Photos": safePortfolio.flatMap((p) =>
      p.imageUrls.map((url, i) => ({
        id: `${p.id}-${i}`,
        url,
        title: p.title,
        description: p.description,
        category: p.category || "Job Photos",
        createdAt: p.createdAt,
      }))
    ),
    "Before & After": [
      ...safePortfolio
        .filter((p) => p.beforeImage)
        .map((p) => ({
          id: `${p.id}-before`,
          url: p.beforeImage!,
          title: `${p.title} (Before)`,
          category: "Before & After",
          createdAt: p.createdAt,
        })),
      ...safePortfolio
        .filter((p) => p.afterImage)
        .map((p) => ({
          id: `${p.id}-after`,
          url: p.afterImage!,
          title: `${p.title} (After)`,
          category: "Before & After",
          createdAt: p.createdAt,
        })),
    ],
  };

  const allPhotos: Photo[] = [
    ...(photos || []),
    ...safePortfolio.flatMap((p) =>
      p.imageUrls.map((url, i) => ({
        id: `${p.id}-${i}`,
        url,
        title: p.title,
        description: p.description,
        category: p.category,
        createdAt: p.createdAt,
      }))
    ),
    ...safePortfolio
      .filter((p) => p.beforeImage)
      .map((p) => ({
        id: `${p.id}-before`,
        url: p.beforeImage!,
        title: `${p.title} (Before)`,
        category: "Before & After",
        createdAt: p.createdAt,
      })),
    ...safePortfolio
      .filter((p) => p.afterImage)
      .map((p) => ({
        id: `${p.id}-after`,
        url: p.afterImage!,
        title: `${p.title} (After)`,
        category: "Before & After",
        createdAt: p.createdAt,
      })),
  ];

  // Get unique categories
  const categories = ["all", ...new Set(allPhotos.map((p) => p.category).filter(Boolean))];

  // Filter photos
  const filteredPhotos =
    filter === "all" ? allPhotos : allPhotos.filter((p) => p.category === filter);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  };

  const nextPhoto = () => {
    setCurrentIndex((i) => (i + 1) % filteredPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((i) => (i - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, filteredPhotos.length]);

  const handleShare = (photo: Photo) => {
    const url = `${window.location.origin}/trades/profiles/${userId}/photos/${photo.id}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${photo.title || "photo"}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error("Failed to download image");
    }
  };

  if (allPhotos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Camera className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No photos yet</h3>
          <p className="mb-4 text-slate-600">
            {isOwnProfile
              ? "Upload photos of your best work to showcase your expertise!"
              : "This professional hasn't uploaded any photos yet."}
          </p>
          {isOwnProfile && (
            <Link href="/trades/portfolio/upload">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Camera className="mr-2 h-4 w-4" />
                Upload Photos
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Album/Folder Tabs - Facebook Style */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setAlbumView("all")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            albumView === "all" ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Photos
        </button>
        <button
          onClick={() => setAlbumView("albums")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            albumView === "albums"
              ? "bg-blue-100 text-blue-700"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Albums
        </button>
      </div>

      {/* Albums View - Facebook Style Grid */}
      {albumView === "albums" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(albums).map(([albumName, albumPhotos]) => (
            <button
              key={albumName}
              onClick={() => {
                setFilter(albumName === "Job Photos" ? "all" : albumName);
                setAlbumView("all");
              }}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg"
            >
              {/* Album Cover */}
              <div className="aspect-square overflow-hidden bg-slate-100">
                {albumPhotos.length > 0 ? (
                  <img
                    src={albumPhotos[0].url}
                    alt={albumName}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Camera className="h-12 w-12 text-slate-300" />
                  </div>
                )}
              </div>
              {/* Album Info */}
              <div className="p-3">
                <h4 className="font-semibold text-slate-900">{albumName}</h4>
                <p className="text-sm text-slate-500">{albumPhotos.length} photos</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Regular Photos View */}
      {albumView === "all" && (
        <>
          {/* Header Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{allPhotos.length} photos</span>

              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    {filter === "all" ? "All Categories" : filter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map((cat) => (
                    <DropdownMenuItem
                      key={cat || "all"}
                      onClick={() => setFilter(cat || "all")}
                      className={filter === cat ? "bg-slate-100" : ""}
                    >
                      {cat === "all" ? "All Categories" : cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "masonry" ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("masonry")}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>

              {isOwnProfile && (
                <Link href="/trades/portfolio/upload">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Photos
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Photo Grid */}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                : "columns-2 gap-3 sm:columns-3 lg:columns-4"
            }
          >
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className={`group relative cursor-pointer overflow-hidden rounded-lg bg-slate-100 ${
                  viewMode === "masonry" ? "mb-3 break-inside-avoid" : "aspect-square"
                }`}
                onClick={() => openLightbox(index)}
              >
                <img
                  src={photo.url}
                  alt={photo.title || "Photo"}
                  className={`w-full object-cover transition duration-300 group-hover:scale-105 ${
                    viewMode === "grid" ? "h-full" : ""
                  }`}
                  loading="lazy"
                />

                {/* Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
                  <div className="flex justify-end p-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(photo);
                      }}
                      className="rounded-full bg-white/20 p-1.5 backdrop-blur hover:bg-white/40"
                      aria-label="Share photo"
                    >
                      <Share2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <div className="p-3">
                    {photo.title && (
                      <p className="truncate font-medium text-white">{photo.title}</p>
                    )}
                    {photo.category && (
                      <Badge className="mt-1 bg-white/20 text-white">{photo.category}</Badge>
                    )}
                  </div>
                </div>

                {/* Zoom Icon */}
                <div className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 opacity-0 transition group-hover:opacity-100">
                  <ZoomIn className="h-4 w-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Navigation */}
          <button
            onClick={prevPhoto}
            className="absolute left-4 z-50 rounded-full bg-white/10 p-3 hover:bg-white/20"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-4 z-50 rounded-full bg-white/10 p-3 hover:bg-white/20"
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>

          {/* Image */}
          <div className="max-h-[85vh] max-w-[85vw]">
            <img
              src={filteredPhotos[currentIndex]?.url}
              alt={filteredPhotos[currentIndex]?.title || "Photo"}
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
          </div>

          {/* Info Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <div className="mx-auto flex max-w-4xl items-center justify-between">
              <div>
                {filteredPhotos[currentIndex]?.title && (
                  <h3 className="text-lg font-semibold text-white">
                    {filteredPhotos[currentIndex].title}
                  </h3>
                )}
                {filteredPhotos[currentIndex]?.description && (
                  <p className="mt-1 text-sm text-white/70">
                    {filteredPhotos[currentIndex].description}
                  </p>
                )}
                <p className="mt-1 text-xs text-white/50">
                  {currentIndex + 1} of {filteredPhotos.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={() => handleShare(filteredPhotos[currentIndex])}
                >
                  <Share2 className="mr-1 h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onClick={() => handleDownload(filteredPhotos[currentIndex])}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/40 p-2">
            {filteredPhotos.slice(0, 10).map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setCurrentIndex(i)}
                className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded transition ${
                  i === currentIndex ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"
                }`}
                aria-label={`View photo ${i + 1}`}
              >
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

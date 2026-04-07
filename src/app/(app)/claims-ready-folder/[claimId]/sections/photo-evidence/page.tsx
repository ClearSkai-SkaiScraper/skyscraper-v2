// src/app/(app)/claims-ready-folder/[claimId]/sections/photo-evidence/page.tsx
"use client";

import { Camera, ChevronLeft, ChevronRight, Eye, Sparkles, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DamageBoxOverlay } from "@/components/photos/DamageBoxOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  elevation?: string;
  aiCaption?: {
    materialType: string;
    damageType: string;
    functionalImpact: string;
    applicableCode?: string;
  };
  damageBoxes?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    severity?: "minor" | "moderate" | "severe";
  }>;
}

export default function PhotoEvidencePage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchPhotos = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/photo-evidence?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setPhotos(json.data?.photos || json.photos || []);
      }
    } catch (err) {
      logger.error("Failed to fetch photos:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchPhotos();
  }, [fetchPhotos]);

  const openLightbox = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    const newIndex = (lightboxIndex + 1) % photos.length;
    setLightboxIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const prevPhoto = () => {
    const newIndex = (lightboxIndex - 1 + photos.length) % photos.length;
    setLightboxIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-sky-600" />
            <h1 className="text-2xl font-bold">Annotated Photo Set</h1>
          </div>
          <p className="text-slate-500">AI-labeled photos with damage markers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Section 7 of 17</Badge>
          <Badge variant="secondary">{photos.length} Photos</Badge>
          <Link href={`/damage-builder?claimId=${claimId}`}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Damage Builder
            </Button>
          </Link>
          <Link href={`/claims/${claimId}/photos`}>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload Photos
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-sky-600">{photos.length}</div>
            <div className="text-sm text-slate-500">Total Photos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">
              {photos.filter((p) => p.aiCaption).length}
            </div>
            <div className="text-sm text-slate-500">AI Analyzed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-amber-600">
              {photos.filter((p) => p.damageBoxes && p.damageBoxes.length > 0).length}
            </div>
            <div className="text-sm text-slate-500">With Markers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">
              {new Set(photos.map((p) => p.elevation).filter(Boolean)).size}
            </div>
            <div className="text-sm text-slate-500">Elevations</div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <Card
              key={photo.id}
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
              onClick={() => openLightbox(photo, index)}
            >
              <div className="relative aspect-square">
                <Image
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                {photo.aiCaption && (
                  <div className="absolute right-2 top-2">
                    <Badge className="bg-purple-500">
                      <Sparkles className="mr-1 h-3 w-3" />
                      AI
                    </Badge>
                  </div>
                )}
                {photo.elevation && (
                  <div className="absolute left-2 top-2">
                    <Badge variant="secondary">{photo.elevation}</Badge>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>
              {photo.caption && (
                <CardContent className="p-3">
                  <p className="truncate text-sm text-slate-600">{photo.caption}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Camera className="mb-4 h-16 w-16 text-slate-300" />
            <h3 className="mb-2 text-lg font-medium">No Photos Yet</h3>
            <p className="mb-4 max-w-md text-slate-500">
              Upload photos to document damage. AI will automatically analyze and annotate them.
            </p>
            <Link href={`/claims/${claimId}/photos`}>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Photos
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Photo {lightboxIndex + 1} of {photos.length}
              </span>
              <div className="flex items-center gap-2">
                {selectedPhoto?.elevation && (
                  <Badge variant="secondary">{selectedPhoto.elevation}</Badge>
                )}
                {selectedPhoto?.aiCaption && (
                  <Badge className="bg-purple-500">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Analyzed
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            {/* Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Image */}
            {selectedPhoto && (
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Photo"}
                  fill
                  className="object-contain"
                />
                {/* Damage Boxes Overlay */}
                {selectedPhoto.damageBoxes && selectedPhoto.damageBoxes.length > 0 && (
                  <DamageBoxOverlay boxes={selectedPhoto.damageBoxes} mode="full" />
                )}
              </div>
            )}
          </div>

          {/* AI Caption */}
          {selectedPhoto?.aiCaption && (
            <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div>
                  <strong>Material:</strong> {selectedPhoto.aiCaption.materialType}
                </div>
                <div>
                  <strong>Damage Type:</strong> {selectedPhoto.aiCaption.damageType}
                </div>
                <div>
                  <strong>Impact:</strong> {selectedPhoto.aiCaption.functionalImpact}
                </div>
                {selectedPhoto.aiCaption.applicableCode && (
                  <div>
                    <strong>Code:</strong> {selectedPhoto.aiCaption.applicableCode}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedPhoto?.caption && (
            <p className="text-sm text-slate-600">{selectedPhoto.caption}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

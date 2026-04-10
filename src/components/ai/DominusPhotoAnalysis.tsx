/**
 * SkaiPDF Photo Analysis Component
 * 
 * Displays vision AI findings with thumbnail grid, lightbox modal,
 * damage types, severity indicators, and safety flags.
 * 
 * Phase 25.5 - SkaiPDF UI Components
 */

"use client";

import { AlertTriangle, Camera, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImageAnalysis {
  url: string;
  analysis: string;
  damageType: string[];
  severity: "none" | "minor" | "moderate" | "severe";
  confidence: number;
}

interface DominusPhotoAnalysisProps {
  images: ImageAnalysis[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photos?: any[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DominusPhotoAnalysis({ images, photos }: DominusPhotoAnalysisProps) {
  const [selectedImage, setSelectedImage] = useState<ImageAnalysis | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "severe":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "moderate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "minor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "none":
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "none") {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Vision Analysis Results</CardTitle>
              <CardDescription>
                AI-detected damage from {images.length} photo{images.length > 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {images.map((image, idx) => (
              <div
                key={idx}
                className="group relative cursor-pointer overflow-hidden rounded-lg border transition-all hover:border-purple-500 hover:shadow-lg"
                onClick={() => setSelectedImage(image)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
                  <Image
                    src={image.url}
                    alt={`Analysis ${idx + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>

                {/* Overlay with severity badge */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-2 left-2 right-2">
                  <Badge className={getSeverityColor(image.severity)}>
                    {getSeverityIcon(image.severity)}
                    <span className="ml-1 capitalize">{image.severity}</span>
                  </Badge>
                </div>

                {/* Damage count indicator */}
                {image.damageType.length > 0 && (
                  <div className="absolute right-2 top-2">
                    <Badge variant="destructive" className="shadow-md">
                      {image.damageType.length}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Photo Analysis Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Image */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                <Image
                  src={selectedImage.url}
                  alt="Analyzed photo"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>

              {/* Analysis Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Severity</h4>
                  <Badge className={getSeverityColor(selectedImage.severity)}>
                    {getSeverityIcon(selectedImage.severity)}
                    <span className="ml-1 capitalize">{selectedImage.severity}</span>
                  </Badge>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">AI Confidence</h4>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${selectedImage.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(selectedImage.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Damage Types */}
              {selectedImage.damageType.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Detected Damage Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedImage.damageType.map((type, idx) => (
                      <Badge key={idx} variant="outline" className="capitalize">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Notes */}
              <div>
                <h4 className="mb-2 text-sm font-semibold">Analysis Notes</h4>
                <p className="text-sm text-muted-foreground">{selectedImage.analysis}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

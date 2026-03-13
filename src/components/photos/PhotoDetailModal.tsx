"use client";

import { Download, Edit3, Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import {
  Annotation,
  IRC_CODES,
  IRCCodeKey,
  PhotoAnnotator,
} from "@/components/annotations/PhotoAnnotator";
import { DamageBoxOverlay } from "@/components/photos/DamageBoxOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface AICaption {
  materialType?: string;
  damageType?: string;
  functionalImpact?: string;
  applicableCode?: string;
  dolTieIn?: string;
  summary?: string;
}

interface DamageBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

interface Photo {
  id: string;
  filename: string;
  publicUrl: string;
  sizeBytes?: number;
  mimeType?: string;
  createdAt?: string;
  note?: string;
  aiCaption?: AICaption;
  damageBoxes?: DamageBox[];
  severity?: "none" | "minor" | "moderate" | "severe";
  confidence?: number;
  analyzed?: boolean;
  annotations?: Annotation[];
  slopeData?: {
    estimatedPitch?: string;
    confidence?: number;
    roofPlanes?: number;
    complexity?: string;
  };
}

interface PhotoDetailModalProps {
  photo: Photo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoUpdate?: (photoId: string, updates: Partial<Photo>) => void;
  onAnalyze?: (photoId: string) => Promise<void>;
  analyzing?: string | null;
}

export function PhotoDetailModal({
  photo,
  open,
  onOpenChange,
  onPhotoUpdate,
  onAnalyze,
  analyzing,
}: PhotoDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"view" | "annotate" | "details">("view");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [savingAnnotations, setSavingAnnotations] = useState(false);

  // Call AI annotation API
  const handleAIAnnotate = useCallback(
    async (imageUrl: string) => {
      if (!photo) return { annotations: [] };
      setAiAnalyzing(true);

      try {
        const res = await fetch("/api/ai/photo-annotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            photoId: photo.id,
            includeSlopes: true,
            roofType: "asphalt_shingle",
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "AI analysis failed");
        }

        const data = await res.json();

        // Convert API response to annotations format
        const annotations: Annotation[] = data.annotations.map(
          (ann: {
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            damageType: string;
            severity: "Low" | "Medium" | "High" | "Critical";
            ircCode?: string;
            caption?: string;
            confidence?: number;
          }) => ({
            id: ann.id,
            type: "ai_detection" as const,
            // Convert percentage to pixel coordinates (assuming 800x600 canvas)
            x: (ann.x / 100) * 800,
            y: (ann.y / 100) * 600,
            width: (ann.width / 100) * 800,
            height: (ann.height / 100) * 600,
            color: getSeverityColor(ann.severity),
            damageType: ann.damageType,
            severity: ann.severity,
            ircCode: ann.ircCode as IRCCodeKey,
            caption: ann.caption,
            confidence: ann.confidence,
          })
        );

        // Update photo with slope data if present
        if (data.slopeData && onPhotoUpdate) {
          onPhotoUpdate(photo.id, { slopeData: data.slopeData });
        }

        return { annotations, slopeData: data.slopeData };
      } catch (error) {
        logger.error("AI annotation failed:", error);
        return { annotations: [] };
      } finally {
        setAiAnalyzing(false);
      }
    },
    [photo, onPhotoUpdate]
  );

  // Save annotations to photo
  const handleSaveAnnotations = useCallback(
    async (annotations: Annotation[]) => {
      if (!photo || !onPhotoUpdate) return;
      setSavingAnnotations(true);

      try {
        // Save annotations via API
        const res = await fetch(`/api/claims/photos/${photo.id}/annotations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annotations }),
        });

        if (res.ok) {
          // Build damageBoxes from annotations for display overlay
          // Annotations are stored in pixel space (0-800, 0-600)
          // DamageBoxes need to be 0-1 fractions for CSS positioning
          const damageBoxes = annotations.map((ann) => {
            // Handle circles (x,y is center, has radius)
            if (ann.type === "circle" && ann.radius) {
              const r = ann.radius;
              return {
                x: (ann.x - r) / 800,
                y: (ann.y - r) / 600,
                w: (r * 2) / 800,
                h: (r * 2) / 600,
                label: ann.caption || ann.damageType || "Damage",
              };
            }
            // Handle rectangles/ai_detection (x,y is top-left, has width/height)
            return {
              x: ann.x / 800,
              y: ann.y / 600,
              w: (ann.width || 50) / 800,
              h: (ann.height || 50) / 600,
              label: ann.caption || ann.damageType || "Damage",
            };
          });

          onPhotoUpdate(photo.id, {
            annotations,
            damageBoxes,
            analyzed: true,
          });
        }
      } catch (error) {
        logger.error("Failed to save annotations:", error);
      } finally {
        setSavingAnnotations(false);
      }
    },
    [photo, onPhotoUpdate]
  );

  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case "Critical":
        return "#ef4444";
      case "High":
        return "#f97316";
      case "Medium":
        return "#eab308";
      case "Low":
        return "#22c55e";
      default:
        return "#3b82f6";
    }
  };

  const getSeverityBadgeClass = (severity?: string) => {
    switch (severity) {
      case "severe":
      case "Critical":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "moderate":
      case "High":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "minor":
      case "Medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {photo.filename}
            {photo.analyzed && (
              <Badge className={getSeverityBadgeClass(photo.severity)}>
                <Sparkles className="mr-1 h-3 w-3" />
                {photo.severity || "Analyzed"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {photo.analyzed
              ? photo.aiCaption?.summary || "AI analysis complete - click Annotate to add markups"
              : "Photo not yet analyzed - run AI analysis or manually annotate damage"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="annotate">
              <Edit3 className="mr-1 h-4 w-4" />
              Annotate
            </TabsTrigger>
            <TabsTrigger value="details">Details & Codes</TabsTrigger>
          </TabsList>

          {/* View Tab - Basic photo view */}
          <TabsContent value="view" className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <img
                src={photo.publicUrl}
                alt={photo.filename}
                className="h-auto max-h-[60vh] w-full object-contain"
              />

              {/* Overlay existing damage boxes */}
              {photo.damageBoxes && photo.damageBoxes.length > 0 && (
                <DamageBoxOverlay boxes={photo.damageBoxes} mode="full" />
              )}
            </div>

            {/* Quick AI analysis from view tab */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {photo.confidence && `AI Confidence: ${Math.round(photo.confidence * 100)}%`}
              </div>
              <div className="flex gap-2">
                {/* Show Reanalyze for already analyzed photos, Quick Analysis for new photos */}
                {onAnalyze && (
                  <Button
                    onClick={() => onAnalyze(photo.id)}
                    disabled={analyzing === photo.id}
                    variant={photo.analyzed ? "outline" : "default"}
                  >
                    {analyzing === photo.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : photo.analyzed ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Reanalyze
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Analysis
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Annotate Tab - Full annotation tools */}
          <TabsContent value="annotate" className="space-y-4">
            <PhotoAnnotator
              imageUrl={photo.publicUrl}
              photoId={photo.id}
              initialAnnotations={photo.annotations || []}
              onSave={handleSaveAnnotations}
              onAnalyze={() => {
                handleAIAnnotate(photo.publicUrl);
              }}
              isAnalyzing={aiAnalyzing}
            />

            {savingAnnotations && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving annotations...
              </div>
            )}
          </TabsContent>

          {/* Details Tab - IRC codes and analysis details */}
          <TabsContent value="details" className="space-y-4">
            {/* AI Caption Details */}
            {photo.aiCaption && (
              <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Analysis Results
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Material Type
                    </p>
                    <p className="text-sm font-medium">{photo.aiCaption.materialType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Damage Type
                    </p>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {photo.aiCaption.damageType || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Functional Impact
                    </p>
                    <p className="text-sm">{photo.aiCaption.functionalImpact || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Date of Loss Correlation
                    </p>
                    <p className="text-sm">{photo.aiCaption.dolTieIn || "—"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Slope Data */}
            {photo.slopeData && (
              <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
                <h4 className="mb-3 font-semibold">Roof Slope Analysis</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Estimated Pitch</p>
                    <p className="text-lg font-bold text-blue-600">
                      {photo.slopeData.estimatedPitch || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Confidence</p>
                    <p className="text-sm">
                      {photo.slopeData.confidence
                        ? `${Math.round(photo.slopeData.confidence * 100)}%`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Roof Planes</p>
                    <p className="text-sm">{photo.slopeData.roofPlanes || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Complexity</p>
                    <p className="text-sm capitalize">{photo.slopeData.complexity || "—"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Applicable IRC Codes */}
            <div className="rounded-lg border bg-white p-4 dark:bg-slate-900">
              <h4 className="mb-3 font-semibold">Applicable IRC Building Codes</h4>
              {photo.aiCaption?.applicableCode ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="font-medium text-blue-700 dark:text-blue-400">
                      {photo.aiCaption.applicableCode}
                    </p>
                    {/* Try to match to full IRC code details */}
                    {Object.entries(IRC_CODES).map(([key, code]) => {
                      if (photo.aiCaption?.applicableCode?.includes(code.code)) {
                        return (
                          <div key={key} className="mt-2">
                            <p className="text-sm font-medium">{code.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {code.text}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : photo.annotations && photo.annotations.length > 0 ? (
                <div className="space-y-2">
                  {[
                    ...new Set(
                      photo.annotations
                        .map((a) => a.ircCode)
                        .filter((code): code is IRCCodeKey => !!code)
                    ),
                  ].map((codeKey) => {
                    const code = IRC_CODES[codeKey];
                    return (
                      <div
                        key={codeKey}
                        className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
                      >
                        <p className="font-medium text-blue-700 dark:text-blue-400">{code.code}</p>
                        <p className="text-sm font-medium">{code.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{code.text}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Run AI analysis or add annotations to identify applicable building codes.
                </p>
              )}
            </div>

            {/* Common IRC Codes Reference */}
            <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
              <h4 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                IRC Code Reference
              </h4>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(IRC_CODES).map(([key, code]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {code.code}
                    </span>
                    <span className="ml-2 text-slate-600 dark:text-slate-400">{code.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

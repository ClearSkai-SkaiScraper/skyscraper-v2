// src/app/(app)/claims/[claimId]/photos/page.tsx
"use client";

import {
  AlertCircle,
  Camera,
  Check,
  CheckSquare,
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Square,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PhotoAnnotator, type Annotation } from "@/components/annotations/PhotoAnnotator";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import PhotoOverlay, { type DamageBox } from "@/components/photos/PhotoOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClaimPhotoUploadWithAnalysis } from "@/components/uploads/ClaimPhotoUploadWithAnalysis";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import SectionCard from "../_components/SectionCard";

interface AICaption {
  materialType?: string;
  damageType?: string;
  functionalImpact?: string;
  applicableCode?: string;
  dolTieIn?: string;
  summary?: string;
}

interface Photo {
  id: string;
  filename: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  note?: string;
  // AI Analysis fields
  aiCaption?: AICaption;
  category?: string;
  annotations?: Annotation[];
  damageBoxes?: DamageBox[];
  severity?: "none" | "minor" | "moderate" | "severe";
  confidence?: number;
  analyzed?: boolean;
}

export default function PhotosPage() {
  const params = useParams();
  const claimIdParam = params?.claimId;
  const claimId = Array.isArray(claimIdParam) ? claimIdParam[0] : claimIdParam;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "analysis">("grid");
  const [modalTab, setModalTab] = useState<"view" | "annotate" | "details">("view");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label?: string } | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!claimId) return;
    try {
      // Cache-busting parameter to prevent stale responses
      const res = await fetch(`/api/claims/${claimId}/photos?t=${Date.now()}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
        logger.error("Failed to fetch photos:", res.status, errBody);
        toast.error(
          `Failed to load photos: ${errBody?.error || errBody?.message || `HTTP ${res.status}`}`
        );
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.photos)) {
        setPhotos(data.photos);
      } else {
        logger.error("Unexpected photos response shape", data);
        toast.error("Unexpected response format when loading photos");
      }
    } catch (error) {
      logger.error("Failed to fetch photos:", error);
      toast.error("Network error loading photos. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  if (!claimId) return null;

  // ── Computed damage summary values ──
  const analyzedCount = photos.filter((p) => p.analyzed).length;
  const unanalyzedCount = photos.filter((p) => !p.analyzed).length;
  const severeCount = photos.filter((p) => p.severity === "severe").length;
  const annotationCount = photos.reduce((sum, p) => sum + (p.annotations?.length || 0), 0);

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "severe":
      case "critical":
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "moderate":
      case "medium":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "minor":
      case "low":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const handleUploadComplete = async () => {
    toast.success("Upload complete! Loading photos...");
    // Short delay to ensure DB writes are committed before fetching
    await new Promise((r) => setTimeout(r, 800));
    await fetchPhotos();
    // If photos still empty after first fetch, retry once more
    // (handles DB replication lag)
    setTimeout(async () => {
      const res = await fetch(`/api/claims/${claimId}/photos?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          setPhotos(data.photos);
        }
      }
    }, 2000);
  };

  const handleAnalysisComplete = async () => {
    // Re-fetch to pick up all analysis results saved to DB
    await new Promise((r) => setTimeout(r, 800));
    await fetchPhotos();
  };

  const handleDelete = (photoId: string) => {
    setDeleteTarget({ id: photoId });
  };

  const confirmDeletePhoto = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/files/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
        toast.success("Photo deleted");
      } else {
        const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(
          `Failed to delete photo: ${errBody?.error || errBody?.message || `HTTP ${res.status}`}`
        );
      }
    } catch (error) {
      logger.error("Delete error:", error);
      toast.error("Failed to delete photo. Please try again.");
    }
  };

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    let deleted = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/claims/${claimId}/files/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          deleted++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Update local state - remove all successfully deleted
    if (deleted > 0) {
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id) || failed > 0));
      // Re-fetch to get accurate state if some failed
      if (failed > 0) {
        await fetchPhotos();
      }
    }

    setSelectedIds(new Set());
    setBatchDeleting(false);
    setSelectMode(false);

    if (failed === 0) {
      toast.success(`Deleted ${deleted} photo${deleted > 1 ? "s" : ""}`);
    } else {
      toast.error(`Deleted ${deleted}, failed to delete ${failed} photo${failed > 1 ? "s" : ""}`);
    }
  };

  const handleAnalyze = async (photoId: string) => {
    setAnalyzing(photoId);

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) {
      setAnalyzing(null);
      return;
    }

    try {
      // Auto-detect component type from filename/category
      const filename = photo.filename?.toLowerCase() || "";
      const category = photo.category?.toLowerCase() || "";

      let componentType = "roof"; // default
      let claimType = "general"; // default - let AI determine

      // Smart detection based on filename or category
      if (
        filename.includes("window") ||
        filename.includes("glass") ||
        filename.includes("trim") ||
        filename.includes("casing") ||
        filename.includes("frame") ||
        category.includes("window")
      ) {
        componentType = "window";
      } else if (
        filename.includes("screen") ||
        filename.includes("mesh") ||
        category.includes("screen")
      ) {
        componentType = "screen";
      } else if (
        filename.includes("siding") ||
        filename.includes("fascia") ||
        filename.includes("soffit") ||
        filename.includes("j-channel") ||
        filename.includes("corner") ||
        category.includes("siding")
      ) {
        componentType = "siding";
      } else if (
        filename.includes("gutter") ||
        filename.includes("downspout") ||
        category.includes("gutter")
      ) {
        componentType = "gutter";
      } else if (
        filename.includes("hvac") ||
        filename.includes("ac") ||
        filename.includes("condenser") ||
        category.includes("hvac")
      ) {
        componentType = "hvac";
      } else if (
        filename.includes("garage") ||
        filename.includes("door") ||
        category.includes("garage")
      ) {
        componentType = "siding"; // garage doors analyzed under siding prompt
      } else if (
        filename.includes("stucco") ||
        filename.includes("eifs") ||
        category.includes("stucco")
      ) {
        componentType = "siding"; // stucco analyzed under siding prompt
      } else if (filename.includes("paint") || filename.includes("chip")) {
        componentType = "siding"; // paint chipping is typically on siding
      } else if (
        filename.includes("roof") ||
        filename.includes("shingle") ||
        category.includes("roof")
      ) {
        componentType = "roof";
      } else {
        // Default to "general" so AI auto-detects the component
        // This is better than assuming roof for everything
        componentType = "general";
      }

      // Use the new AI annotation endpoint with smart detection
      const res = await fetch("/api/ai/photo-annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: photo.publicUrl,
          photoId: photo.id,
          includeSlopes: componentType === "roof",
          roofType: "asphalt_shingle",
          componentType: componentType,
          claimType: claimType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        logger.error("AI analysis error:", data.error);
        toast.error(data.error || "AI analysis failed");
        setAnalyzing(null);
        return;
      }

      // Save annotations - convert from AI percentages (0-100) to pixel space (800×600)
      // The GET endpoint divides by 800/600 to normalize back to 0-1 fractions for display
      if (data.annotations && data.annotations.length > 0) {
        const annotations = data.annotations.map(
          (
            ann: Annotation & {
              x: number;
              y: number;
              width: number;
              height: number;
            }
          ) => ({
            id: ann.id,
            type: "ai_detection",
            // Convert percentage (0-100) to pixel coords in 800×600 space
            // This matches the format ClaimPhotoUploadWithAnalysis uses
            x: (ann.x / 100) * 800,
            y: (ann.y / 100) * 600,
            width: (ann.width / 100) * 800,
            height: (ann.height / 100) * 600,
            color: getSeverityColorHex(ann.severity),
            damageType: ann.damageType,
            severity: ann.severity,
            ircCode: ann.ircCode,
            caption: ann.caption,
            confidence: ann.confidence,
          })
        );

        await fetch(`/api/claims/photos/${photo.id}/annotations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annotations }),
        });
      }

      // Determine severity from annotations
      const severity = determineSeverityFromAnnotations(data.annotations);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? {
                ...p,
                analyzed: true,
                severity,
                confidence: data.confidence,
                aiCaption: {
                  summary: data.overallCaption,
                  damageType: data.annotations?.[0]?.damageType,
                  applicableCode: data.annotations?.[0]?.ircCode,
                },
                annotations: data.annotations,
                damageBoxes: data.annotations?.map(
                  (ann: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                    caption: string;
                  }) => ({
                    // AI returns percentages (0-100), convert to 0-1 fractions for CSS positioning
                    x: ann.x / 100,
                    y: ann.y / 100,
                    w: ann.width / 100,
                    h: ann.height / 100,
                    label: ann.caption,
                  })
                ),
              }
            : p
        )
      );

      toast.success("AI analysis complete");
    } catch (error) {
      logger.error("Analyze error:", error);
      toast.error("Failed to run AI analysis. Please try again.");
    }

    setAnalyzing(null);
  };

  const handleBulkAnalyze = async () => {
    const unanalyzed = photos.filter((p) => !p.analyzed);
    if (unanalyzed.length === 0) {
      toast.info("All photos have already been analyzed");
      return;
    }

    setBulkAnalyzing(true);
    setBulkProgress(0);

    let completed = 0;
    for (const photo of unanalyzed) {
      await handleAnalyze(photo.id);
      completed++;
      setBulkProgress(Math.round((completed / unanalyzed.length) * 100));
    }

    setBulkAnalyzing(false);
    setBulkProgress(0);
    toast.success(`Analyzed ${unanalyzed.length} photos`);
    await fetchPhotos();
  };

  const handleGenerateReport = async () => {
    const analyzedPhotos = photos.filter((p) => p.analyzed);
    if (analyzedPhotos.length === 0) {
      toast.error("No analyzed photos to include in report. Run AI analysis first.");
      return;
    }

    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/damage-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includePhotos: true,
          includeAnnotations: true,
          format: "pdf",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate report");
      }

      const data = await res.json();

      // Download PDF using a temp link to avoid popup blocker
      if (data.pdfUrl) {
        const link = document.createElement("a");
        link.href = data.pdfUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Damage report generated! Saved to Documents tab & Report History.");
      } else {
        toast.error("Report generated but download URL was not returned");
      }
    } catch (error) {
      logger.error("Report generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate damage report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSaveAnnotations = useCallback(
    async (photoId: string, annotations: Annotation[]) => {
      try {
        await fetch(`/api/claims/photos/${photoId}/annotations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annotations }),
        });

        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, annotations, analyzed: true } : p))
        );

        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto({ ...selectedPhoto, annotations, analyzed: true });
        }

        toast.success("Annotations saved");
      } catch (error) {
        logger.error("Save annotations error:", error);
        toast.error("Failed to save annotations");
      }
    },
    [selectedPhoto]
  );

  const handleSaveNote = useCallback(
    async (photoId: string, note: string) => {
      if (!claimId) return;
      setSavingNote(true);
      try {
        const res = await fetch(`/api/claims/photos/${photoId}/annotations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            annotations: selectedPhoto?.annotations || [],
            note,
          }),
        });

        if (!res.ok) throw new Error("Failed to save note");

        // Update local state
        setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, note } : p)));

        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto({ ...selectedPhoto, note });
        }

        toast.success("Note saved");
      } catch (error) {
        logger.error("Save note error:", error);
        toast.error("Failed to save note");
      } finally {
        setSavingNote(false);
      }
    },
    [claimId, selectedPhoto]
  );

  const getSeverityColorHex = (severity?: string): string => {
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

  const determineSeverityFromAnnotations = (
    annotations?: Annotation[]
  ): "none" | "minor" | "moderate" | "severe" => {
    if (!annotations || annotations.length === 0) return "none";
    const severities = annotations.map((a) => a.severity).filter(Boolean);
    if (severities.includes("Critical") || severities.includes("High")) return "severe";
    if (severities.includes("Medium")) return "moderate";
    if (severities.includes("Low")) return "minor";
    return "none";
  };

  return (
    <SectionCard title="Photos & AI Analysis">
      {/* Action Bar */}
      {photos.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          {/* Stats */}
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-500" />
            <span className="font-medium">{photos.length} Photos</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span>{analyzedCount} Analyzed</span>
          </div>
          {annotationCount > 0 && (
            <div className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-green-500" />
              <span>{annotationCount} Annotations</span>
            </div>
          )}
          {severeCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-600 dark:text-red-400">{severeCount} Severe</span>
            </div>
          )}

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Select Mode Toggle */}
            <Button
              variant={selectMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelectedIds(new Set());
              }}
            >
              {selectMode ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Select
                </>
              )}
            </Button>

            {/* Batch actions (visible when in select mode) */}
            {selectMode && (
              <>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedIds.size === photos.length ? (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Select All
                    </>
                  )}
                </Button>

                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBatchDelete}
                    disabled={batchDeleting}
                  >
                    {batchDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedIds.size})
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            {/* Bulk Analyze */}
            {unanalyzedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkAnalyze}
                disabled={bulkAnalyzing}
              >
                {bulkAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {bulkProgress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze All ({unanalyzedCount})
                  </>
                )}
              </Button>
            )}

            {/* Generate Damage Report */}
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateReport}
              disabled={generatingReport || analyzedCount === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Damage Report
                </>
              )}
            </Button>

            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "analysis")}>
              <TabsList className="h-8">
                <TabsTrigger value="grid" className="text-xs">
                  Grid View
                </TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs">
                  Analysis View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Bulk Analysis Progress */}
      {bulkAnalyzing && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Running AI analysis on all photos...
            </span>
            <span className="font-medium">{bulkProgress}%</span>
          </div>
          <Progress value={bulkProgress} className="h-2" />
        </div>
      )}

      {/* ═══ AI Damage Summary Panel ═══ */}
      {analyzedCount > 0 && !bulkAnalyzing && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-purple-900 dark:text-purple-100">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Damage Summary
          </h3>

          {/* Severity Breakdown */}
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-white/80 p-3 dark:bg-slate-900/60">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{analyzedCount}</p>
              <p className="text-xs text-slate-500">Photos Analyzed</p>
            </div>
            <div className="rounded-lg bg-white/80 p-3 dark:bg-slate-900/60">
              <p className="text-2xl font-bold text-red-600">
                {photos.filter((p) => p.severity === "severe").length}
              </p>
              <p className="text-xs text-slate-500">Severe Damage</p>
            </div>
            <div className="rounded-lg bg-white/80 p-3 dark:bg-slate-900/60">
              <p className="text-2xl font-bold text-orange-600">
                {photos.filter((p) => p.severity === "moderate").length}
              </p>
              <p className="text-xs text-slate-500">Moderate Damage</p>
            </div>
            <div className="rounded-lg bg-white/80 p-3 dark:bg-slate-900/60">
              <p className="text-2xl font-bold text-green-600">{annotationCount}</p>
              <p className="text-xs text-slate-500">Total Findings</p>
            </div>
          </div>

          {/* Damage Types Found */}
          {(() => {
            const damageTypes = new Map<string, { count: number; severity: string }>();
            const ircCodes = new Set<string>();
            photos.forEach((p) => {
              if (!p.annotations) return;
              (p.annotations as Annotation[]).forEach((ann) => {
                if (ann.damageType) {
                  const existing = damageTypes.get(ann.damageType);
                  damageTypes.set(ann.damageType, {
                    count: (existing?.count || 0) + 1,
                    severity: ann.severity || existing?.severity || "Low",
                  });
                }
                if (ann.ircCode) ircCodes.add(ann.ircCode);
              });
            });

            if (damageTypes.size === 0) return null;

            return (
              <div className="space-y-3">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Damage Types Detected
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[...damageTypes.entries()].map(([type, info]) => (
                      <Badge
                        key={type}
                        className={
                          info.severity === "Critical" || info.severity === "High"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : info.severity === "Medium"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }
                      >
                        {type.replace(/_/g, " ")} ({info.count})
                      </Badge>
                    ))}
                  </div>
                </div>

                {ircCodes.size > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Applicable IRC Codes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[...ircCodes].map((code) => (
                        <Badge key={code} variant="outline" className="text-xs">
                          {code.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-photo summary captions */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Photo-by-Photo Findings
                  </h4>
                  <div className="space-y-2">
                    {photos
                      .filter((p) => p.analyzed && p.aiCaption?.summary)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-start gap-2 rounded-lg bg-white/60 p-2 text-sm dark:bg-slate-800/60"
                        >
                          <img
                            src={p.publicUrl}
                            alt={p.filename}
                            className="h-10 w-10 flex-shrink-0 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                                {p.filename}
                              </span>
                              {p.severity && p.severity !== "none" && (
                                <Badge className={`text-[10px] ${getSeverityColor(p.severity)}`}>
                                  {p.severity}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {p.aiCaption?.summary}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Upload Component */}
      <div className="mb-8">
        <ClaimPhotoUploadWithAnalysis
          claimId={claimId}
          onUploadComplete={handleUploadComplete}
          onAnalysisComplete={handleAnalysisComplete}
          autoAnalyze={false}
        />
      </div>

      {/* Photos Display */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : photos.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <ImageIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-700 dark:text-slate-300">
            No photos yet. Upload your first photo above.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchPhotos();
            }}
            className="mt-4"
          >
            <Camera className="mr-2 h-4 w-4" />
            Refresh Photos
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all hover:shadow-lg ${
                selectedIds.has(photo.id)
                  ? "border-blue-500 ring-2 ring-blue-500 dark:border-blue-400 dark:ring-blue-400"
                  : "border-slate-200 dark:border-slate-700"
              }`}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(photo.id);
                } else {
                  setSelectedPhoto(photo);
                  setPhotoNote(photo.note || "");
                }
              }}
            >
              {/* Selection Checkbox */}
              {selectMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(photo.id);
                  }}
                  className="absolute left-2 top-2 z-50 flex h-6 w-6 items-center justify-center rounded border-2 border-white bg-white/80 shadow-sm transition-colors dark:border-slate-300 dark:bg-slate-800/80"
                  aria-label={selectedIds.has(photo.id) ? "Deselect photo" : "Select photo"}
                >
                  {selectedIds.has(photo.id) ? (
                    <Check className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              )}
              {/* Photo with overlay if analyzed */}
              {photo.analyzed && photo.damageBoxes && photo.damageBoxes.length > 0 ? (
                <div className="relative h-full w-full">
                  <img
                    src={photo.publicUrl}
                    alt={photo.filename}
                    className="h-full w-full object-cover"
                  />
                  {/* Damage boxes overlay - inline styles required for dynamic positioning */}
                  {photo.damageBoxes.map((box, i) => (
                    <div
                      key={i}
                      className="absolute border-2 border-red-500 bg-red-500/10"
                      // eslint-disable-next-line react/forbid-dom-props
                      style={{
                        left: `${box.x * 100}%`,
                        top: `${box.y * 100}%`,
                        width: `${box.w * 100}%`,
                        height: `${box.h * 100}%`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <img
                  src={photo.publicUrl}
                  alt={photo.filename}
                  className="h-full w-full object-cover"
                />
              )}

              {/* Delete button — z-50 ensures it's above the analyze overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(photo.id);
                }}
                className="absolute right-2 top-2 z-50 rounded-full bg-red-500/80 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                aria-label="Delete photo"
                title="Delete photo"
              >
                <X className="h-4 w-4" />
              </button>

              {/* AI Badge */}
              {photo.analyzed && photo.severity && (
                <div className={selectMode ? "absolute left-10 top-2" : "absolute left-2 top-2"}>
                  <Badge className={getSeverityColor(photo.severity)}>
                    <Sparkles className="mr-1 h-3 w-3" />
                    {photo.severity}
                  </Badge>
                </div>
              )}

              {/* Bottom info bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="truncate text-xs text-white">{photo.filename}</p>
                {photo.aiCaption?.damageType && (
                  <p className="truncate text-xs text-blue-300">{photo.aiCaption.damageType}</p>
                )}
              </div>

              {/* Analyze / Reanalyze button for all photos on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="sm"
                  variant={photo.analyzed ? "outline" : "default"}
                  className={
                    photo.analyzed ? "border-white/60 bg-white/20 text-white hover:bg-white/30" : ""
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnalyze(photo.id);
                  }}
                  disabled={analyzing === photo.id}
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
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Analysis View - Detailed cards */
        <div className="space-y-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              {/* Thumbnail with overlay */}
              <div
                className="relative h-32 w-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg"
                onClick={() => {
                  setSelectedPhoto(photo);
                  setPhotoNote(photo.note || "");
                }}
              >
                {photo.analyzed && photo.damageBoxes ? (
                  <PhotoOverlay
                    url={photo.publicUrl}
                    boxes={photo.damageBoxes}
                    showControls={false}
                  />
                ) : (
                  <img
                    src={photo.publicUrl}
                    alt={photo.filename}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">{photo.filename}</h3>
                    {photo.analyzed && (
                      <div className="mt-1 flex items-center gap-2">
                        <Badge className={getSeverityColor(photo.severity)}>{photo.severity}</Badge>
                        {photo.confidence && (
                          <span className="text-xs text-slate-500">
                            {Math.round(photo.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAnalyze(photo.id)}
                    disabled={analyzing === photo.id}
                  >
                    {analyzing === photo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : photo.analyzed ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Reanalyze
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>

                {/* AI Caption */}
                {photo.aiCaption && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        Material:
                      </span>{" "}
                      <span className="text-slate-900 dark:text-white">
                        {photo.aiCaption.materialType}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        Damage:
                      </span>{" "}
                      <span className="text-red-600 dark:text-red-400">
                        {photo.aiCaption.damageType}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        Impact:
                      </span>{" "}
                      <span className="text-slate-900 dark:text-white">
                        {photo.aiCaption.functionalImpact}
                      </span>
                    </p>
                    {photo.aiCaption.applicableCode && (
                      <p>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          Code:
                        </span>{" "}
                        <span className="text-blue-600 dark:text-blue-400">
                          {photo.aiCaption.applicableCode}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {!photo.analyzed && (
                  <p className="mt-2 text-sm text-slate-500">
                    Click &quot;Analyze&quot; to run AI damage detection on this photo.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Detail Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPhoto?.filename}
              {selectedPhoto?.analyzed && (
                <Badge className={getSeverityColor(selectedPhoto.severity)}>
                  <Check className="mr-1 h-3 w-3" />
                  {selectedPhoto.severity}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedPhoto?.analyzed
                ? `AI Analysis: ${selectedPhoto.aiCaption?.summary || "Analysis complete"}`
                : "Photo not yet analyzed - run AI analysis or add manual annotations"}
            </DialogDescription>
          </DialogHeader>

          {selectedPhoto && (
            <div className="space-y-4">
              {/* Tabs for View / Annotate / Details */}
              <Tabs
                value={modalTab}
                onValueChange={(v) => setModalTab(v as "view" | "annotate" | "details")}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="view">
                    <ZoomIn className="mr-2 h-4 w-4" />
                    View
                  </TabsTrigger>
                  <TabsTrigger value="annotate">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Annotate
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Details
                  </TabsTrigger>
                </TabsList>

                {/* View Tab */}
                <TabsContent value="view" className="mt-4">
                  <div className="relative overflow-hidden rounded-lg">
                    {selectedPhoto.analyzed && selectedPhoto.damageBoxes ? (
                      <PhotoOverlay
                        url={selectedPhoto.publicUrl}
                        boxes={selectedPhoto.damageBoxes}
                        showControls={true}
                        onBoxesChange={(newBoxes) => {
                          setPhotos((prev) =>
                            prev.map((p) =>
                              p.id === selectedPhoto.id ? { ...p, damageBoxes: newBoxes } : p
                            )
                          );
                          setSelectedPhoto({ ...selectedPhoto, damageBoxes: newBoxes });
                        }}
                      />
                    ) : (
                      <img
                        src={selectedPhoto.publicUrl}
                        alt={selectedPhoto.filename}
                        className="h-auto w-full rounded-lg"
                      />
                    )}
                  </div>
                </TabsContent>

                {/* Annotate Tab */}
                <TabsContent value="annotate" className="mt-4" forceMount>
                  <div className={cn(modalTab !== "annotate" && "hidden")}>
                    <PhotoAnnotator
                      imageUrl={selectedPhoto.publicUrl}
                      initialAnnotations={selectedPhoto.annotations || []}
                      onSave={(annotations) => handleSaveAnnotations(selectedPhoto.id, annotations)}
                      onAnalyze={() => handleAnalyze(selectedPhoto.id)}
                      isAnalyzing={analyzing === selectedPhoto.id}
                    />
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="mt-4 space-y-4">
                  {/* Pro User Note Section */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Edit3 className="h-4 w-4 text-slate-500" />
                      Your Notes
                    </h4>
                    <Textarea
                      placeholder="Add your notes about this photo..."
                      value={photoNote}
                      onChange={(e) => setPhotoNote(e.target.value)}
                      className="mb-2 min-h-[80px] resize-none"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveNote(selectedPhoto.id, photoNote)}
                      disabled={savingNote}
                    >
                      {savingNote ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-3 w-3" />
                          Save Note
                        </>
                      )}
                    </Button>
                  </div>

                  {selectedPhoto.aiCaption ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                      <h4 className="mb-3 flex items-center gap-2 font-medium">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        AI Analysis Results
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Material Type</p>
                          {selectedPhoto.aiCaption.materialType ? (
                            <p className="text-sm">{selectedPhoto.aiCaption.materialType}</p>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              → Update material type on{" "}
                              <Link
                                href={`/claims/${claimId}/overview`}
                                className="underline hover:text-amber-700"
                              >
                                Claim Overview
                              </Link>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Damage Type</p>
                          {selectedPhoto.aiCaption.damageType ? (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {selectedPhoto.aiCaption.damageType}
                            </p>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              → Set loss type on{" "}
                              <Link
                                href={`/claims/${claimId}/overview`}
                                className="underline hover:text-amber-700"
                              >
                                Claim Overview
                              </Link>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Functional Impact</p>
                          {selectedPhoto.aiCaption.functionalImpact ? (
                            <p className="text-sm">{selectedPhoto.aiCaption.functionalImpact}</p>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              → Add functional damage details on{" "}
                              <Link
                                href={`/claims/${claimId}/overview`}
                                className="underline hover:text-amber-700"
                              >
                                Claim Overview
                              </Link>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Applicable IRC Code</p>
                          {selectedPhoto.aiCaption.applicableCode ? (
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              {selectedPhoto.aiCaption.applicableCode}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">No code reference detected</p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs font-medium text-slate-500">
                            Date of Loss Correlation
                          </p>
                          {selectedPhoto.aiCaption.dolTieIn ? (
                            <p className="text-sm">{selectedPhoto.aiCaption.dolTieIn}</p>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              → Run Quick DOL Verification on{" "}
                              <Link
                                href={`/claims/${claimId}/overview`}
                                className="underline hover:text-amber-700"
                              >
                                Claim Overview
                              </Link>{" "}
                              to correlate damage with weather events
                            </p>
                          )}
                        </div>
                        {selectedPhoto.aiCaption.summary && (
                          <div className="md:col-span-2">
                            <p className="text-xs font-medium text-slate-500">Summary</p>
                            <p className="text-sm">{selectedPhoto.aiCaption.summary}</p>
                          </div>
                        )}
                      </div>

                      {/* Annotations List */}
                      {selectedPhoto.annotations && selectedPhoto.annotations.length > 0 && (
                        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-600">
                          <h5 className="mb-2 text-sm font-medium">
                            Detected Damage ({selectedPhoto.annotations.length})
                          </h5>
                          <div className="space-y-2">
                            {selectedPhoto.annotations.map((ann, i) => (
                              <div
                                key={ann.id || i}
                                className="flex items-center gap-3 rounded-lg bg-white p-2 text-sm dark:bg-slate-900"
                              >
                                <div
                                  className="h-3 w-3 rounded-full"
                                  // eslint-disable-next-line react/forbid-dom-props
                                  style={{ backgroundColor: ann.color }}
                                />
                                <span className="font-medium">{ann.damageType || "Damage"}</span>
                                {ann.ircCode && (
                                  <Badge variant="outline" className="text-xs">
                                    {ann.ircCode}
                                  </Badge>
                                )}
                                {ann.severity && (
                                  <Badge className={getSeverityColor(ann.severity.toLowerCase())}>
                                    {ann.severity}
                                  </Badge>
                                )}
                                {ann.confidence && (
                                  <span className="text-xs text-slate-500">
                                    {Math.round(ann.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 dark:border-slate-600 dark:bg-slate-800/50">
                      <Sparkles className="mb-3 h-10 w-10 text-slate-400" />
                      <p className="mb-2 text-slate-600 dark:text-slate-300">
                        No AI analysis available yet
                      </p>
                      <Button
                        onClick={() => handleAnalyze(selectedPhoto.id)}
                        disabled={analyzing === selectedPhoto.id}
                      >
                        {analyzing === selectedPhoto.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Run AI Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Footer Actions */}
              <div className="flex justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedPhoto.publicUrl, "_blank")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAnalyze(selectedPhoto.id)}
                    disabled={analyzing === selectedPhoto.id}
                    variant={selectedPhoto.analyzed ? "outline" : "default"}
                  >
                    {analyzing === selectedPhoto.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : selectedPhoto.analyzed ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Reanalyze
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Run AI Analysis
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Photo"
        description="This photo will be permanently removed."
        showArchive={false}
        onConfirmDelete={confirmDeletePhoto}
      />
    </SectionCard>
  );
}

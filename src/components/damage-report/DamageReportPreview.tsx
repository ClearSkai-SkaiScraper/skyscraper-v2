"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

import { AlertCircle, Edit3, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

// ── Types ──────────────────────────────────────────────────────────────────

interface PhotoFinding {
  label: string;
  severity: string;
  confidence: number;
  ircCode?: string;
  caption?: string;
  evidenceTier?: "primary" | "supporting" | "reference";
}

interface PreviewPhoto {
  id: string;
  filename: string;
  publicUrl: string;
  severity?: string;
  aiCaption?: string;
  findings: PhotoFinding[];
  included: boolean;
}

interface ReportPreviewData {
  claimNumber: string;
  propertyAddress: string;
  inspectionDate: string;
  photos: PreviewPhoto[];
}

interface DamageReportPreviewProps {
  claimId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Analyzed photos from the parent page */
  photos: Array<{
    id: string;
    filename: string;
    publicUrl: string;
    severity?: string;
    confidence?: number;
    analyzed?: boolean;
    aiCaption?: {
      summary?: string;
      damageType?: string;
      materialType?: string;
      applicableCode?: string;
      dolTieIn?: string;
    };
    annotations?: Array<{
      caption?: string;
      damageType?: string;
      severity?: string;
      confidence?: number;
    }>;
  }>;
  /** Called with overrides so the parent can pass them to the generation API */
  onGenerate: (overrides?: {
    excludedPhotoIds: string[];
    captionOverrides: Record<string, Record<string, string>>;
    severityOverrides: Record<string, Record<string, string>>;
    evidenceTiers: Record<string, Record<string, string>>;
  }) => void;
}

export function DamageReportPreview({
  claimId,
  open,
  onOpenChange,
  photos: rawPhotos,
  onGenerate,
}: DamageReportPreviewProps) {
  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Build preview data from photos
  const buildPreview = useCallback(() => {
    const analyzed = rawPhotos.filter((p) => p.analyzed);

    const photos: PreviewPhoto[] = analyzed.map((p) => {
      const findings: PhotoFinding[] = (p.annotations || []).map((a) => ({
        label: a.damageType || "Unknown Damage",
        severity: a.severity || "moderate",
        confidence: a.confidence || 0.5,
        ircCode: undefined,
        caption: a.caption || "",
        evidenceTier: (a.confidence || 0.5) >= 0.7 ? ("primary" as const) : ("supporting" as const),
      }));

      // If no annotation findings, use AI caption as a finding
      if (findings.length === 0 && p.aiCaption?.summary) {
        findings.push({
          label: p.aiCaption.damageType || "AI Detected Damage",
          severity: p.severity || "moderate",
          confidence: p.confidence || 0.5,
          ircCode: p.aiCaption.applicableCode,
          caption: p.aiCaption.summary,
          evidenceTier:
            (p.confidence || 0.5) >= 0.7 ? ("primary" as const) : ("supporting" as const),
        });
      }

      return {
        id: p.id,
        filename: p.filename,
        publicUrl: p.publicUrl,
        severity: p.severity,
        aiCaption: p.aiCaption?.summary,
        findings,
        included: true,
      };
    });

    setPreviewData({
      claimNumber: claimId,
      propertyAddress: "",
      inspectionDate: new Date().toLocaleDateString(),
      photos,
    });
  }, [rawPhotos, claimId]);

  useEffect(() => {
    if (open) buildPreview();
  }, [open, buildPreview]);

  const togglePhotoIncluded = (photoId: string) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      photos: previewData.photos.map((p) =>
        p.id === photoId ? { ...p, included: !p.included } : p
      ),
    });
  };

  const updateFindingCaption = (photoId: string, findingIdx: number, caption: string) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      photos: previewData.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              findings: p.findings.map((f, i) => (i === findingIdx ? { ...f, caption } : f)),
            }
          : p
      ),
    });
  };

  const updateFindingSeverity = (photoId: string, findingIdx: number, severity: string) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      photos: previewData.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              findings: p.findings.map((f, i) => (i === findingIdx ? { ...f, severity } : f)),
            }
          : p
      ),
    });
  };

  const updateFindingTier = (
    photoId: string,
    findingIdx: number,
    evidenceTier: PhotoFinding["evidenceTier"]
  ) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      photos: previewData.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              findings: p.findings.map((f, i) => (i === findingIdx ? { ...f, evidenceTier } : f)),
            }
          : p
      ),
    });
  };

  const handleGenerateFromPreview = async () => {
    setGenerating(true);
    try {
      // Build overrides from user edits
      const excludedPhotoIds = previewData!.photos.filter((p) => !p.included).map((p) => p.id);

      const captionOverrides: Record<string, Record<string, string>> = {};
      const severityOverrides: Record<string, Record<string, string>> = {};

      for (const photo of previewData!.photos) {
        if (!photo.included) continue;
        const originalPhoto = rawPhotos.find((rp) => rp.id === photo.id);
        const originalAnnotations = originalPhoto?.annotations || [];

        for (let fIdx = 0; fIdx < photo.findings.length; fIdx++) {
          const finding = photo.findings[fIdx];
          const originalAnno = originalAnnotations[fIdx];

          // Check if caption was edited
          if (finding.caption && finding.caption !== (originalAnno?.caption || "")) {
            if (!captionOverrides[photo.id]) captionOverrides[photo.id] = {};
            captionOverrides[photo.id][String(fIdx)] = finding.caption;
          }

          // Check if severity was changed
          if (
            finding.severity &&
            finding.severity !== (originalAnno?.severity || originalPhoto?.severity || "moderate")
          ) {
            if (!severityOverrides[photo.id]) severityOverrides[photo.id] = {};
            severityOverrides[photo.id][String(fIdx)] = finding.severity;
          }
        }
      }

      const overrides = {
        excludedPhotoIds,
        captionOverrides,
        severityOverrides,
        evidenceTiers: {} as Record<string, Record<string, string>>,
      };

      // Build evidence tier overrides
      for (const photo of previewData!.photos) {
        if (!photo.included) continue;
        for (let fIdx = 0; fIdx < photo.findings.length; fIdx++) {
          const finding = photo.findings[fIdx];
          if (finding.evidenceTier) {
            if (!overrides.evidenceTiers[photo.id]) overrides.evidenceTiers[photo.id] = {};
            overrides.evidenceTiers[photo.id][String(fIdx)] = finding.evidenceTier;
          }
        }
      }

      onGenerate(overrides);
      toast.success("Generating damage report with your edits…");
      onOpenChange(false);
    } catch (err) {
      logger.error("Preview generate error:", err);
      toast.error("Failed to start report generation");
    } finally {
      setGenerating(false);
    }
  };

  if (!previewData) return null;

  const includedCount = previewData.photos.filter((p) => p.included).length;
  const totalFindings = previewData.photos
    .filter((p) => p.included)
    .reduce((sum, p) => sum + p.findings.length, 0);

  const severityCounts = {
    severe: previewData.photos.filter((p) => p.included && p.severity === "severe").length,
    moderate: previewData.photos.filter((p) => p.included && p.severity === "moderate").length,
    minor: previewData.photos.filter((p) => p.included && p.severity === "minor").length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">Damage Report Preview</DialogTitle>
              <DialogDescription>
                Review and edit findings before generating the PDF report
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                {editMode ? "Editing" : "Edit"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-4 p-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{includedCount}</div>
                <div className="text-xs text-muted-foreground">Photos</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{totalFindings}</div>
                <div className="text-xs text-muted-foreground">Findings</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{severityCounts.severe}</div>
                <div className="text-xs text-muted-foreground">Severe</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{severityCounts.moderate}</div>
                <div className="text-xs text-muted-foreground">Moderate</div>
              </Card>
            </div>

            {/* Photo Evidence Sections */}
            {previewData.photos.map((photo, photoIdx) => (
              <Card
                key={photo.id}
                className={`overflow-hidden transition-opacity ${!photo.included ? "opacity-40" : ""}`}
              >
                {/* Photo Header */}
                <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Photo {photoIdx + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{photo.filename}</span>
                    {photo.severity && (
                      <Badge
                        variant={
                          photo.severity === "severe"
                            ? "destructive"
                            : photo.severity === "moderate"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {photo.severity}
                      </Badge>
                    )}
                  </div>
                  {editMode && (
                    <Button
                      variant={photo.included ? "outline" : "destructive"}
                      size="sm"
                      onClick={() => togglePhotoIncluded(photo.id)}
                    >
                      {photo.included ? "Exclude" : "Include"}
                    </Button>
                  )}
                </div>

                <div className="p-4">
                  {/* Photo thumbnail + findings side by side */}
                  <div className="flex gap-4">
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    {/* Thumbnail */}
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    <div className="w-48 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.publicUrl}
                        alt={photo.filename}
                        className="h-32 w-full rounded-md border object-cover"
                      />
                    </div>

                    {/* Findings */}
                    <div className="flex-1 space-y-3">
                      {photo.findings.length > 0 ? (
                        photo.findings.map((finding, fIdx) => (
                          <div key={fIdx} className="rounded-lg border bg-background p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">
                                  Finding #{fIdx + 1}: {finding.label}
                                </span>
                                {editMode ? (
                                  <select
                                    className="rounded border bg-background px-2 py-0.5 text-xs"
                                    value={finding.severity}
                                    onChange={(e) =>
                                      updateFindingSeverity(photo.id, fIdx, e.target.value)
                                    }
                                  >
                                    <option value="severe">Severe</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="minor">Minor</option>
                                  </select>
                                ) : (
                                  <Badge
                                    variant={
                                      finding.severity === "severe" ? "destructive" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {finding.severity}
                                  </Badge>
                                )}
                                {editMode ? (
                                  <select
                                    className="rounded border bg-background px-2 py-0.5 text-xs"
                                    value={finding.evidenceTier || "primary"}
                                    onChange={(e) =>
                                      updateFindingTier(
                                        photo.id,
                                        fIdx,
                                        e.target.value as PhotoFinding["evidenceTier"]
                                      )
                                    }
                                  >
                                    <option value="primary">Primary</option>
                                    <option value="supporting">Supporting</option>
                                    <option value="reference">Reference</option>
                                  </select>
                                ) : finding.evidenceTier ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      finding.evidenceTier === "primary"
                                        ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                                        : finding.evidenceTier === "supporting"
                                          ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"
                                          : "border-slate-300 text-slate-500"
                                    }`}
                                  >
                                    {finding.evidenceTier}
                                  </Badge>
                                ) : null}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(finding.confidence * 100)}% confidence
                              </span>
                            </div>

                            {finding.ircCode && (
                              <p className="mb-1 text-xs font-medium text-blue-600">
                                {finding.ircCode}
                              </p>
                            )}

                            {editMode ? (
                              <Textarea
                                value={finding.caption}
                                onChange={(e) =>
                                  updateFindingCaption(photo.id, fIdx, e.target.value)
                                }
                                className="mt-1 text-sm"
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {finding.caption || "No caption"}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          No specific findings — AI caption will be used
                        </div>
                      )}

                      {photo.aiCaption && photo.findings.length === 0 && (
                        <p className="text-sm italic text-muted-foreground">
                          &ldquo;{photo.aiCaption}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-3">
          <div className="text-sm text-muted-foreground">
            {includedCount} photos · {totalFindings} findings
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateFromPreview}
              disabled={generating || includedCount === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate PDF Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { CheckCircle, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { logger } from "@/lib/logger";

interface ClaimPhotoUploadWithAnalysisProps {
  claimId: string;
  onUploadComplete?: (urls: string[]) => void;
  onAnalysisComplete?: (results: AnalysisResult[]) => void;
  autoAnalyze?: boolean;
}

interface AnalysisResult {
  photoId: string;
  url: string;
  annotations: unknown[];
  caption: string;
  severity: string;
  success: boolean;
}

/**
 * ClaimPhotoUploadWithAnalysis - Upload + Auto AI Analysis
 *
 * Uploads photos to Supabase and optionally triggers AI damage detection
 * with IRC code mapping and automatic captioning.
 */
export function ClaimPhotoUploadWithAnalysis({
  claimId,
  onUploadComplete,
  onAnalysisComplete,
  autoAnalyze: defaultAutoAnalyze = true,
}: ClaimPhotoUploadWithAnalysisProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; url: string }[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(defaultAutoAnalyze);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setError(null);
    setUploadedPhotos([]);
    setAnalysisResults([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 20,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const uploaded: { id: string; url: string; filename: string }[] = [];
    let completed = 0;

    try {
      // Upload all files
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "claimPhotos");
        formData.append("claimId", claimId);

        const res = await fetch("/api/upload/supabase", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();
        uploaded.push({
          id: data.id || `photo-${Date.now()}-${completed}`,
          url: data.url,
          filename: file.name,
        });

        completed++;
        setProgress(Math.round((completed / files.length) * 100));
      }

      setUploadedPhotos(uploaded);
      onUploadComplete?.(uploaded.map((p) => p.url));

      // Auto-analyze if enabled
      if (autoAnalyze && uploaded.length > 0) {
        await analyzePhotos(uploaded);
      }

      // Clear files after successful upload
      setTimeout(() => {
        setFiles([]);
        setProgress(0);
      }, 2000);
    } catch (err: unknown) {
      logger.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const analyzePhotos = async (photos: { id: string; url: string; filename: string }[]) => {
    setAnalyzing(true);
    setAnalysisProgress(0);

    const results: AnalysisResult[] = [];
    let completed = 0;

    for (const photo of photos) {
      try {
        // Call AI photo annotation API
        const res = await fetch("/api/ai/photo-annotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: photo.url,
            photoId: photo.id,
            includeSlopes: true,
            roofType: "asphalt_shingle",
          }),
        });

        if (!res.ok) {
          results.push({
            photoId: photo.id,
            url: photo.url,
            annotations: [],
            caption: "Analysis failed",
            severity: "none",
            success: false,
          });
        } else {
          const data = await res.json();

          // Save annotations to the photo
          if (data.annotations && data.annotations.length > 0) {
            await fetch(`/api/claims/photos/${photo.id}/annotations`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                annotations: data.annotations.map((ann: unknown) => {
                  const a = ann as {
                    id: string;
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                    damageType: string;
                    severity: string;
                    ircCode?: string;
                    caption: string;
                    confidence: number;
                  };
                  return {
                    id: a.id,
                    type: "ai_detection",
                    x: (a.x / 100) * 800,
                    y: (a.y / 100) * 600,
                    width: (a.width / 100) * 800,
                    height: (a.height / 100) * 600,
                    color: getSeverityColor(a.severity),
                    damageType: a.damageType,
                    severity: a.severity,
                    ircCode: a.ircCode,
                    caption: a.caption,
                    confidence: a.confidence,
                  };
                }),
              }),
            });
          }

          results.push({
            photoId: photo.id,
            url: photo.url,
            annotations: data.annotations || [],
            caption: data.overallCaption || "Analysis complete",
            severity: determineSeverity(data.annotations),
            success: true,
          });
        }
      } catch (err) {
        logger.error("Analysis error for photo:", photo.id, err);
        results.push({
          photoId: photo.id,
          url: photo.url,
          annotations: [],
          caption: "Analysis failed",
          severity: "none",
          success: false,
        });
      }

      completed++;
      setAnalysisProgress(Math.round((completed / photos.length) * 100));
    }

    setAnalysisResults(results);
    onAnalysisComplete?.(results);
    setAnalyzing(false);
  };

  const getSeverityColor = (severity: string): string => {
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

  const determineSeverity = (annotations: unknown[]): string => {
    if (!annotations || annotations.length === 0) return "none";
    const severities = annotations
      .map((a) => (a as { severity?: string }).severity)
      .filter(Boolean);
    if (severities.includes("Critical")) return "severe";
    if (severities.includes("High")) return "severe";
    if (severities.includes("Medium")) return "moderate";
    if (severities.includes("Low")) return "minor";
    return "none";
  };

  const successCount = analysisResults.filter((r) => r.success).length;
  const damageCount = analysisResults.filter((r) => r.severity !== "none").length;

  return (
    <Card className="p-6">
      {/* Auto-analyze toggle */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <div>
            <Label
              htmlFor="auto-analyze"
              className="font-medium text-purple-900 dark:text-purple-100"
            >
              AI Auto-Analysis
            </Label>
            <p className="text-xs text-purple-600 dark:text-purple-300">
              Automatically detect damage, add IRC codes, and generate captions
            </p>
          </div>
        </div>
        <Switch id="auto-analyze" checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 hover:border-gray-400 dark:border-gray-600"
        } ${uploading || analyzing ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">Drop photos here...</p>
        ) : (
          <>
            <p className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-200">
              Drag and drop photos here, or click to select
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Supports: JPG, PNG, HEIC, WebP (max 10MB each, 20 files max)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Selected files */}
      {files.length > 0 && !uploading && !analyzing && (
        <div className="mt-6 space-y-2">
          <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">
            Selected Photos ({files.length})
          </h3>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Uploading photos...</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Analysis progress */}
      {analyzing && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Running AI damage analysis...
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(analysisProgress)}%
            </span>
          </div>
          <Progress value={analysisProgress} className="h-2 bg-purple-100 dark:bg-purple-900">
            <div
              className="h-full bg-purple-600 transition-all"
              style={{ width: `${analysisProgress}%` }}
            />
          </Progress>
        </div>
      )}

      {/* Success message */}
      {uploadedPhotos.length > 0 && !uploading && !analyzing && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Successfully uploaded {uploadedPhotos.length} photo(s)
              </p>
              {analysisResults.length > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {successCount} analyzed • {damageCount} with damage detected
                </p>
              )}
            </div>
          </div>

          {/* Analysis summary */}
          {analysisResults.length > 0 && (
            <div className="rounded-lg border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Analysis Summary
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {successCount}
                  </p>
                  <p className="text-xs text-slate-500">Analyzed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{damageCount}</p>
                  <p className="text-xs text-slate-500">With Damage</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {analysisResults.length - damageCount}
                  </p>
                  <p className="text-xs text-slate-500">No Damage</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && !uploading && !analyzing && uploadedPhotos.length === 0 && (
        <div className="mt-6">
          <Button onClick={handleUpload} className="w-full" size="lg">
            <Upload className="mr-2 h-4 w-4" />
            Upload {files.length} Photo{files.length > 1 ? "s" : ""}
            {autoAnalyze && (
              <span className="ml-2 rounded bg-purple-500/20 px-2 py-0.5 text-xs">
                + AI Analysis
              </span>
            )}
          </Button>
        </div>
      )}

      {(uploading || analyzing) && (
        <div className="mt-6">
          <Button disabled className="w-full" size="lg">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploading ? "Uploading..." : "Analyzing..."}
          </Button>
        </div>
      )}
    </Card>
  );
}

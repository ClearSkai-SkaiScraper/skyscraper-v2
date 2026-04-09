"use client";

import { useCallback, useState } from "react";

import { logger } from "@/lib/logger";

interface UploadedPhoto {
  id?: string;
  url: string;
  filename?: string;
}

interface SlopeData {
  estimatedPitch?: string;
  confidence?: number;
  roofPlanes?: number;
  complexity?: "simple" | "moderate" | "complex";
}

interface Annotation {
  id: string;
  type: "ai_detection";
  x: number;
  y: number;
  width: number;
  height: number;
  damageType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  ircCode?: string;
  caption: string;
  confidence: number;
}

interface AnalysisResult {
  photoId?: string;
  photoUrl: string;
  annotations: Annotation[];
  slopeData?: SlopeData;
  overallCaption: string;
  error?: string;
}

interface UsePhotoAutoAnalysisOptions {
  autoAnalyzeOnUpload?: boolean;
  detectSlopes?: boolean;
  roofType?: "asphalt_shingle" | "metal" | "tile" | "flat" | "slate" | "wood_shake" | "unknown";
  onAnalysisComplete?: (results: AnalysisResult[]) => void;
}

/**
 * Hook for auto-analyzing uploaded photos with AI damage detection and slope detection
 */
export function usePhotoAutoAnalysis(options: UsePhotoAutoAnalysisOptions = {}) {
  const {
    autoAnalyzeOnUpload = false,
    detectSlopes = true,
    roofType = "asphalt_shingle",
    onAnalysisComplete,
  } = options;

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze a single photo
   */
  const analyzePhoto = useCallback(
    async (photo: UploadedPhoto): Promise<AnalysisResult> => {
      try {
        const res = await fetch("/api/ai/photo-annotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: photo.url,
            photoId: photo.id,
            includeSlopes: detectSlopes,
            roofType,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          return {
            photoId: photo.id,
            photoUrl: photo.url,
            annotations: [],
            overallCaption: "Analysis failed",
            error: errorData.error || "Analysis failed",
          };
        }

        const data = await res.json();

        return {
          photoId: photo.id || data.photoId,
          photoUrl: photo.url,
          annotations: data.annotations || [],
          slopeData: data.slopeData,
          overallCaption: data.overallCaption || "Analysis complete",
        };
      } catch (err) {
        logger.error("[usePhotoAutoAnalysis] Analysis failed:", err);
        return {
          photoId: photo.id,
          photoUrl: photo.url,
          annotations: [],
          overallCaption: "Analysis failed",
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [detectSlopes, roofType]
  );

  /**
   * Analyze multiple photos sequentially
   */
  const analyzePhotos = useCallback(
    async (photos: UploadedPhoto[]): Promise<AnalysisResult[]> => {
      if (photos.length === 0) return [];

      setAnalyzing(true);
      setProgress(0);
      setError(null);

      const analysisResults: AnalysisResult[] = [];

      try {
        for (let i = 0; i < photos.length; i++) {
          const result = await analyzePhoto(photos[i]);
          analysisResults.push(result);
          setProgress(Math.round(((i + 1) / photos.length) * 100));
        }

        setResults(analysisResults);
        onAnalysisComplete?.(analysisResults);

        return analysisResults;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Analysis failed";
        setError(errorMessage);
        logger.error("[usePhotoAutoAnalysis] Batch analysis failed:", err);
        return analysisResults;
      } finally {
        setAnalyzing(false);
      }
    },
    [analyzePhoto, onAnalysisComplete]
  );

  /**
   * Handler for when uploads complete - triggers auto-analysis if enabled
   */
  const handleUploadsComplete = useCallback(
    async (uploadedUrls: string[]): Promise<AnalysisResult[] | null> => {
      if (!autoAnalyzeOnUpload || uploadedUrls.length === 0) {
        return null;
      }

      const photos: UploadedPhoto[] = uploadedUrls.map((url, index) => ({
        url,
        id: `upload-${Date.now()}-${index}`,
      }));

      return analyzePhotos(photos);
    },
    [autoAnalyzeOnUpload, analyzePhotos]
  );

  /**
   * Detect slopes only (without full damage analysis)
   */
  const detectSlopesOnly = useCallback(
    async (photo: UploadedPhoto): Promise<SlopeData | null> => {
      try {
        const res = await fetch("/api/ai/geometry/detect-slopes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: photo.url,
            roofType,
          }),
        });

        if (!res.ok) {
          return null;
        }

        const data = await res.json();
        return data.slopeAnalysis || null;
      } catch (err) {
        logger.error("[usePhotoAutoAnalysis] Slope detection failed:", err);
        return null;
      }
    },
    [roofType]
  );

  return {
    analyzing,
    progress,
    results,
    error,
    analyzePhoto,
    analyzePhotos,
    handleUploadsComplete,
    detectSlopesOnly,
  };
}

"use client";

import { AlertTriangle, Camera, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface PhotoAnalysis {
  photoUrl: string;
  caption: string;
  codeNotes: string[];
  damageType: string;
  severity: "low" | "medium" | "high";
}

export function PhotoAnnotator() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<PhotoAnalysis[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newFiles]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => prev.filter((_, i) => i !== index));
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    const analysisResults: PhotoAnalysis[] = [];

    try {
      // Analyze each photo with OpenAI Vision
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        try {
          const formData = new FormData();
          formData.append("image", photo);
          formData.append("context", "Property damage assessment photo");

          const response = await fetch("/api/ai/analyze-photo", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Analysis failed");
          }

          const result = await response.json();
          analysisResults.push(result.analysis);

          toast.success(`Photo ${i + 1}/${photos.length} analyzed`);
        } catch (error) {
          logger.error(`Failed to analyze photo ${i + 1}:`, error);

          // Add fallback result for failed analysis
          analysisResults.push({
            photoUrl: URL.createObjectURL(photo),
            caption: "Failed to analyze this photo. Please try again or upload a different image.",
            codeNotes: [],
            damageType: "Analysis Error",
            severity: "low",
          });

          toast.error(`Photo ${i + 1} analysis failed`);
        }
      }

      setResults(analysisResults);
      toast.success(`Analysis complete! ${analysisResults.length} photos processed.`);
    } catch (error) {
      logger.error("Analysis error:", error);
      toast.error("Failed to complete analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Camera className="h-5 w-5 text-blue-600" />
          Upload Damage Photos
        </h3>

        <div className="space-y-4">
          {/* Upload Zone */}
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20">
            <Upload className="mb-3 h-10 w-10 text-slate-400" />
            <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PNG, JPG, HEIC up to 10MB each
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Photo Thumbnails */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {photos.map((photo, index) => (
                <div key={index} className="group relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Upload ${index + 1}`}
                    className="h-24 w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    title={`Remove photo ${index + 1}`}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Analyze Button */}
          {photos.length > 0 && (
            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {analyzing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analyzing {photos.length} Photo{photos.length > 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Run AI Damage Analysis ({photos.length})
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Analysis Results
          </h3>

          {results.map((result, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Photo */}
                <div className="md:col-span-1">
                  <img
                    src={result.photoUrl}
                    alt={`Analysis ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Analysis Content */}
                <div className="space-y-4 p-6 md:col-span-2">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
                        Photo #{index + 1}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {result.damageType}
                        </Badge>
                        <Badge className={`text-xs ${getSeverityColor(result.severity)}`}>
                          {result.severity.toUpperCase()} Severity
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* AI Damage Summary */}
                  <div>
                    <h5 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      AI Damage Summary
                    </h5>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {result.caption}
                    </p>
                  </div>

                  {/* Code & Compliance */}
                  <div>
                    <h5 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Code & Compliance Notes
                    </h5>
                    <ul className="space-y-1.5">
                      {result.codeNotes.map((note, noteIndex) => (
                        <li
                          key={noteIndex}
                          className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Camera className="h-8 w-8 text-slate-400" />
          </div>
          <h4 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">
            No Photos Uploaded
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload damage photos to get AI-powered analysis with damage captions and code compliance
            notes.
          </p>
        </Card>
      )}
    </div>
  );
}

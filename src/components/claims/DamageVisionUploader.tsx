// ...existing code...
"use client";

import { AlertCircle, Camera, CheckCircle, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface DamageAnalysis {
  damageType: string;
  confidence: number;
  severity: string;
  affectedArea: string;
  recommendations: string[];
  detectedFeatures: Array<{
    type: string;
    count?: number;
    coverage?: string;
    confidence: number;
  }>;
}

interface DamageVisionUploaderProps {
  claimId?: string;
  onAnalysisComplete?: (analysis: DamageAnalysis) => void;
}

export default function DamageVisionUploader({
  claimId,
  onAnalysisComplete,
}: DamageVisionUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<DamageAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      void handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError("Image must be smaller than 10MB");
      return;
    }

    setError(null);
    setAnalysis(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload and analyze
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (claimId) {
        formData.append("claimId", claimId);
      }

      const response = await fetch("/api/ai/analyze-damage", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze image");
      }

      const data = await response.json();
      setAnalysis(data.analysis);

      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setAnalysis(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!preview && (
        <div
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            dragActive
              ? "border-[#117CFF] bg-[#117CFF]/10 shadow-lg ring-2 ring-[#117CFF]/20"
              : "border-[color:var(--border)] bg-gradient-to-br from-slate-50/50 to-slate-100/50 backdrop-blur-xl hover:border-[#117CFF]/50 dark:from-slate-900/30 dark:to-slate-800/30"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            id="damage-image-upload"
          />

          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-[color:var(--primary)]" />
              <p className="text-lg font-semibold text-[color:var(--text)]">Analyzing Damage...</p>
              <p className="text-sm text-[color:var(--muted)]">
                AI is examining the image for damage patterns
              </p>
            </div>
          ) : (
            <>
              <Camera className="mx-auto mb-4 h-16 w-16 text-[color:var(--muted)]" />
              <h3 className="mb-2 text-xl font-bold text-[color:var(--text)]">
                Upload Damage Photo
              </h3>
              <p className="mx-auto mb-6 max-w-md text-[color:var(--muted)]">
                Drag and drop an image here, or click to select a file. Our AI will analyze the
                damage and provide detailed insights.
              </p>
              <label
                htmlFor="damage-image-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
              >
                <Upload className="h-5 w-5" />
                Choose Image
              </label>
              <p className="mt-4 text-xs text-[color:var(--muted)]">
                Supports JPG, PNG, HEIC • Max 25MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Preview & Analysis Results */}
      {preview && analysis && (
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl">
            <button
              onClick={handleReset}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
              title="Remove and upload new image"
            >
              <X className="h-5 w-5" />
            </button>
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Damage preview"
              className="h-auto max-h-96 w-full object-contain"
            />
          </div>

          {/* Analysis Results */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-[color:var(--text)]">AI Analysis Complete</h3>
            </div>

            {/* Primary Results */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-[var(--surface-2)] p-4">
                <p className="mb-1 text-sm text-[color:var(--muted)]">Damage Type</p>
                <p className="text-lg font-bold text-[color:var(--text)]">{analysis.damageType}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-4">
                <p className="mb-1 text-sm text-[color:var(--muted)]">AI Confidence</p>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    {/* eslint-disable-next-line react/forbid-dom-props */}
                    <div
                      className="h-full bg-gradient-success transition-all duration-500"
                      style={{ width: `${analysis.confidence}%` }}
                    />
                  </div>
                  <p className="text-lg font-bold text-[color:var(--text)]">
                    {analysis.confidence}%
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-4">
                <p className="mb-1 text-sm text-[color:var(--muted)]">Severity</p>
                <p className="text-lg font-bold text-[color:var(--text)]">{analysis.severity}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-4">
                <p className="mb-1 text-sm text-[color:var(--muted)]">Affected Area</p>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  {analysis.affectedArea}
                </p>
              </div>
            </div>

            {/* Detected Features */}
            {analysis.detectedFeatures.length > 0 && (
              <div className="mb-6">
                <h4 className="mb-3 font-semibold text-[color:var(--text)]">Detected Features</h4>
                <div className="space-y-2">
                  {analysis.detectedFeatures.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] p-3"
                    >
                      <div>
                        <p className="font-medium capitalize text-[color:var(--text)]">
                          {feature.type.replace(/_/g, " ")}
                        </p>
                        {feature.count && (
                          <p className="text-sm text-[color:var(--muted)]">
                            Count: {feature.count}
                          </p>
                        )}
                        {feature.coverage && (
                          <p className="text-sm text-[color:var(--muted)]">
                            Coverage: {feature.coverage}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-[color:var(--primary)]">
                        {feature.confidence}% confidence
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <h4 className="mb-3 font-semibold text-[color:var(--text)]">AI Recommendations</h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
                    >
                      <span className="mt-0.5 font-bold text-blue-600 dark:text-blue-400">
                        {idx + 1}.
                      </span>
                      <p className="text-sm text-[color:var(--text)]">{rec}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleReset}
              className="mt-6 w-full rounded-xl border-2 border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 font-semibold text-[color:var(--text)] transition hover:bg-[var(--surface-3)]"
            >
              Analyze Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

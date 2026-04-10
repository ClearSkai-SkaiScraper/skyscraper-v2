"use client";

import { AlertTriangle, Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DamageRegion, VisionAnalysis } from "@/lib/ai/vision";
import { logger } from "@/lib/logger";
import { createLegend, downloadHeatmap, generateHeatmap } from "@/lib/vision/heatmap";

interface VisionAnalyzerPanelProps {
  claimId?: string;
  onAnalysisComplete?: (analysis: VisionAnalysis) => void;
}

export function VisionAnalyzerPanel({ claimId, onAnalysisComplete }: VisionAnalyzerPanelProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDamage, setSelectedDamage] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<
    "none" | "minor" | "moderate" | "severe" | null
  >(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setAnalysis(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUrl) {
      setError("Please upload an image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In production, upload file to your storage first
      // For now, using the local object URL (won't work server-side)
      const response = await fetch("/api/ai/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl, // Replace with uploaded URL in production
          claimId,
          focusAreas: ["roof", "siding", "windows", "foundation"],
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      onAnalysisComplete?.(data.analysis);

      // Generate heatmap after image loads
      setTimeout(() => {
        if (imageRef.current && data.analysis.damages.length > 0) {
          generateHeatmapOverlay(data.analysis.damages);
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const generateHeatmapOverlay = (damages: DamageRegion[]) => {
    if (!imageRef.current) return;

    try {
      const canvas = generateHeatmap(
        imageRef.current as any,
        damages as any,
        {
          colorScheme: "severity",
          opacity: 0.5,
          showLabels: true,
          showConfidence: true,
        } as any
      );

      // Replace canvas content
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasRef.current!.width = canvas!.width;
          canvasRef.current!.height = canvas!.height;
          ctx.drawImage(canvas!, 0, 0);
        }
      }
    } catch (err) {
      logger.error("Heatmap generation failed:", err);
    }
  };

  const handleExportHeatmap = () => {
    if (canvasRef.current && imageFile) {
      downloadHeatmap(canvasRef.current, `${imageFile.name.split(".")[0]}_heatmap.png`);
    }
  };

  const filteredDamages =
    analysis?.damages.filter((d) => !filterSeverity || d.severity === filterSeverity) || [];

  const severityCounts = {
    none: analysis?.damages.filter((d) => d.severity === "none").length || 0,
    minor: analysis?.damages.filter((d) => d.severity === "minor").length || 0,
    moderate: analysis?.damages.filter((d) => d.severity === "moderate").length || 0,
    severe: analysis?.damages.filter((d) => d.severity === "severe").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">AI Vision Analysis</h2>

        <div className="space-y-4">
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-500 dark:border-gray-700"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 10MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Upload property damage image"
          />

          {imageUrl && (
            <Button onClick={handleAnalyze} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Property Damage"
              )}
            </Button>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Analysis Error</p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Image Display with Heatmap */}
      {imageUrl && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Image Analysis</h3>
            {analysis && (
              <Button onClick={handleExportHeatmap} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Heatmap
              </Button>
            )}
          </div>

          <div className="relative">
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Property"
              className={`h-auto w-full rounded-lg ${analysis ? "hidden" : ""}`}
            />
            {analysis && (
              <canvas
                ref={canvasRef}
                className="h-auto w-full rounded-lg border border-gray-200 dark:border-gray-700"
              />
            )}
          </div>

          {analysis && (
            <div
              className="mt-4"
              dangerouslySetInnerHTML={{
                __html: createLegend()?.outerHTML || "",
              }}
            />
          )}
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Summary Card */}
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Analysis Summary</h3>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall Condition</p>
                <p className="text-2xl font-bold capitalize">{analysis.overallCondition}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Damages</p>
                <p className="text-2xl font-bold">{analysis.damages.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Cost</p>
                <p className="text-2xl font-bold">
                  ${analysis.estimatedRepairCost.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Urgent Issues</p>
                <p className="text-2xl font-bold text-red-600">{analysis.urgentIssues.length}</p>
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-sm text-gray-700 dark:text-gray-300">{analysis.summary}</p>
            </div>

            {analysis.urgentIssues.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-200">
                  Urgent Issues:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  {analysis.urgentIssues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-red-700 dark:text-red-300">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Damage List */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Detected Damages ({filteredDamages.length})</h3>

              <div className="flex gap-2">
                <Button
                  variant={filterSeverity === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSeverity(null)}
                >
                  All ({analysis.damages.length})
                </Button>
                {(["none", "minor", "moderate", "severe"] as const).map((severity) => (
                  <Button
                    key={severity}
                    variant={filterSeverity === severity ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterSeverity(severity)}
                    className={
                      severity === "severe"
                        ? "border-red-500 text-red-600"
                        : severity === "moderate"
                          ? "border-orange-500 text-orange-600"
                          : severity === "minor"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-green-500 text-green-600"
                    }
                  >
                    {severity} ({severityCounts[severity]})
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredDamages.map((damage) => (
                <div
                  key={damage.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedDamage === damage.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                  onClick={() => setSelectedDamage(damage.id)}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{damage.type}</span>
                      <Badge
                        variant={
                          damage.severity === "severe"
                            ? "destructive"
                            : damage.severity === "moderate"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {damage.severity}
                      </Badge>
                      <Badge variant="outline">{damage.repairPriority}</Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {Math.round(damage.confidence * 100)}% confident
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{damage.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

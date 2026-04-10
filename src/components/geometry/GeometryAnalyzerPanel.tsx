"use client";

import { AlertCircle, Download, Loader2, TrendingUp, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SlopeAnalysis, SlopeScorecard } from "@/lib/ai/geometry";
import type { DamageRegion } from "@/lib/ai/vision";

interface GeometryAnalyzerPanelProps {
  claimId?: string;
  existingDamages?: DamageRegion[];
  onAnalysisComplete?: (analysis: SlopeAnalysis, scorecards: SlopeScorecard[]) => void;
}

export function GeometryAnalyzerPanel({
  claimId,
  existingDamages,
  onAnalysisComplete,
}: GeometryAnalyzerPanelProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<SlopeAnalysis | null>(null);
  const [scorecards, setScorecards] = useState<SlopeScorecard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlane, setSelectedPlane] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setAnalysis(null);
      setScorecards([]);
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
      const response = await fetch("/api/ai/geometry/detect-slopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl, // Replace with uploaded URL in production
          claimId,
          damages: existingDamages,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setAnalysis(data.slopeAnalysis);
      setScorecards(data.scorecards || []);
      onAnalysisComplete?.(data.slopeAnalysis, data.scorecards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getSlopeColor = (category: string) => {
    switch (category) {
      case "flat":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "steep":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "very_steep":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8)
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400";
    if (priority >= 5)
      return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400";
    if (priority >= 3)
      return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400";
    return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400";
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Roof Geometry Analysis</h2>

        <div className="space-y-4">
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-500 dark:border-gray-700"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-2 h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload roof image for slope detection
            </p>
            <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 10MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            title="Upload roof image"
            aria-label="Upload roof image for slope detection"
          />

          {imageUrl && (
            <Button onClick={handleAnalyze} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Geometry...
                </>
              ) : (
                "Detect Roof Slopes"
              )}
            </Button>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Analysis Error</p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Image Display */}
      {imageUrl && (
        <Card className="p-6">
          // eslint-disable-next-line @next/next/no-img-element
          <h3 className="mb-4 text-lg font-semibold">Uploaded Image</h3>
          <img
            src={imageUrl}
            alt="Roof"
            className="h-auto w-full rounded-lg border border-gray-200 dark:border-gray-700"
          />
        </Card>
      )}

      {/* Analysis Summary */}
      {analysis && (
        <>
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Slope Analysis Summary</h3>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Planes</p>
                <p className="text-2xl font-bold">{analysis.planes.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Area</p>
                <p className="text-2xl font-bold">{analysis.totalArea.toLocaleString()} sq ft</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Slope</p>
                <p className="text-2xl font-bold">{analysis.averageSlope}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Complexity</p>
                <Badge
                  variant={
                    analysis.complexityRating === "very_complex" ||
                    analysis.complexityRating === "complex"
                      ? "destructive"
                      : analysis.complexityRating === "moderate"
                        ? "default"
                        : "secondary"
                  }
                >
                  {analysis.complexityRating}
                </Badge>
              </div>
            </div>

            {analysis.safetyNotes.length > 0 && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  Safety Considerations:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  {analysis.safetyNotes.map((note, idx) => (
                    <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Roof Planes */}
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Roof Planes ({analysis.planes.length})</h3>

            <div className="space-y-4">
              {analysis.planes.map((plane) => {
                const scorecard = scorecards.find((s) => s.planeId === plane.id);

                return (
                  <div
                    key={plane.id}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      selectedPlane === plane.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                    }`}
                    onClick={() => setSelectedPlane(plane.id)}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold">{plane.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {plane.orientation}
                        </p>
                      </div>
                      <Badge className={getSlopeColor(plane.slopeCategory)}>
                        {plane.slopeCategory.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Slope</p>
                        <p className="text-sm font-medium">
                          {plane.slope} ({plane.slopeAngle}°)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Area</p>
                        <p className="text-sm font-medium">
                          {plane.area_sqft.toLocaleString()} sq ft
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Condition</p>
                        <p className="text-sm font-medium capitalize">{plane.condition}</p>
                      </div>
                    </div>

                    {plane.damages.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-xs text-gray-500">Damages on this plane:</p>
                        <div className="flex flex-wrap gap-1">
                          {plane.damages.map((damageId) => (
                            <Badge key={damageId} variant="outline" className="text-xs">
                              {damageId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {plane.accessDifficulty && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Access:{" "}
                        <span className="font-medium capitalize">{plane.accessDifficulty}</span>
                      </div>
                    )}

                    {/* Scorecard Details */}
                    {scorecard && (
                      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold">Repair Scorecard</span>
                          <Badge className={getPriorityColor(scorecard.repairPriority)}>
                            Priority: {scorecard.repairPriority}/10
                          </Badge>
                        </div>

                        <div className="mb-3 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Damage Coverage</p>
                            <p className="text-lg font-bold text-red-600">
                              {scorecard.damagePercentage.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Severity Score</p>
                            <p className="text-lg font-bold">{scorecard.severityScore}/100</p>
                          </div>
                        </div>

                        <div className="mb-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                          <p className="mb-2 flex items-center gap-1 text-xs font-semibold">
                            <TrendingUp className="h-3 w-3" />
                            Material Estimates:
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Shingles:</span>
                              <span className="font-medium">
                                {scorecard.estimatedMaterials.shingles_sqft.toLocaleString()} sq ft
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Underlayment:</span>
                              <span className="font-medium">
                                {scorecard.estimatedMaterials.underlayment_sqft.toLocaleString()} sq
                                ft
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Flashing:</span>
                              <span className="font-medium">
                                {scorecard.estimatedMaterials.flashing_lf.toLocaleString()} lin ft
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-300 pt-1 dark:border-gray-600">
                              <span className="font-semibold">Labor Multiplier:</span>
                              <span className="font-bold">
                                {scorecard.laborMultiplier.toFixed(1)}x
                              </span>
                            </div>
                          </div>
                        </div>

                        {scorecard.notes.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold">Notes:</p>
                            <ul className="list-inside list-disc space-y-0.5">
                              {scorecard.notes.map((note, idx) => (
                                <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                  {note}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Export Options */}
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Export Options</h3>
            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Slope Report (PDF)
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Material List (CSV)
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Save Scorecards (JSON)
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Camera, CheckCircle2, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

const COMPONENT_TYPES = [
  "Roof",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Appliance",
  "Exterior",
  "Interior",
  "Foundation",
  "Windows",
  "Doors",
  "Gutters",
  "Driveway",
  "Lawn",
];

export default function NewInspectionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewInspectionContent />
    </Suspense>
  );
}

function NewInspectionContent() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get("propertyId");

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [componentType, setComponentType] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotos((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!componentType) {
      toast.error("Please select a component type");
      return;
    }

    if (photos.length === 0) {
      toast.error("Please add at least one photo to analyze");
      return;
    }

    setAnalyzing(true);
    setResults(null);

    try {
      // Convert photos to base64
      const photoPromises = photos.map((photo) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(photo);
        });
      });

      const base64Photos = await Promise.all(photoPromises);

      // Call AI analysis API
      const response = await fetch("/api/v1/inspections/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyProfileId: propertyId,
          componentType,
          photoUrls: base64Photos,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze photos");
      }

      setResults(data);

      toast.success(
        `Analysis complete — ${data.aggregatedDetections?.length || 0} detections found`
      );
    } catch (error) {
      logger.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze photos");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!results) return;

    setLoading(true);
    try {
      // Save inspection record
      const response = await fetch("/api/v1/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyProfileId: propertyId,
          componentType,
          detectionsJson: results.aggregatedDetections,
          aiConfidence: results.aiMetadata?.confidence,
          estimatedRepairCost: results.estimatedRepairCost,
          recommendations: results.recommendations,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save inspection");
      }

      toast.success("Inspection saved successfully");

      if (propertyId) {
        router.push(`/property-profiles/${propertyId}`);
      } else {
        router.push("/inspections");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save inspection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link href={propertyId ? `/property-profiles/${propertyId}` : "/inspections"}>
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">AI-Powered Inspection</h1>
        <p className="mt-1 text-muted-foreground">
          Upload photos for instant AI analysis and damage detection
        </p>
      </div>

      <div className="space-y-6">
        {/* Component Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Component Type</CardTitle>
            <CardDescription>Select what you&apos;re inspecting</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={componentType} onValueChange={setComponentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select component type" />
              </SelectTrigger>
              <SelectContent>
                {COMPONENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Photo Capture */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>Take photos or upload from your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
                aria-label="Capture photo with camera"
              />
              <Button
                onClick={() => cameraInputRef.current?.click()}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
                aria-label="Upload photos from device"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Photos
              </Button>
            </div>

            {/* Photo Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {previews.map((preview, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-40 w-full rounded-lg border object-cover"
                    />
                    <Button
                      onClick={() => removePhoto(index)}
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analyze Button */}
        {photos.length > 0 && !results && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !componentType}
            size="lg"
            className="w-full gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                Analyze {photos.length} Photo{photos.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        )}

        {/* Results */}
        {results && (
          <>
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Analysis Complete
                </CardTitle>
                <CardDescription>Confidence: {results.aiMetadata?.confidence}%</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Detections */}
                {results.aggregatedDetections && results.aggregatedDetections.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold">Detections:</h4>
                    <div className="space-y-2">
                      {results.aggregatedDetections.map((detection: any, i: number) => (
                        <div
                          key={i}
                          className={`rounded-lg p-3 ${
                            detection.severity === "CRITICAL"
                              ? "border border-destructive bg-destructive/10"
                              : detection.severity === "HIGH"
                                ? "border border-orange-300 bg-orange-100 dark:bg-orange-900/20"
                                : "bg-muted"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{detection.type}</div>
                              <div className="text-sm text-muted-foreground">
                                {detection.description}
                              </div>
                            </div>
                            <div className="text-sm font-semibold">{detection.severity}</div>
                          </div>
                          {detection.confidence && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Confidence: {detection.confidence}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Repair Cost */}
                {results.estimatedRepairCost && (
                  <div className="rounded-lg bg-muted p-4">
                    <div className="mb-1 text-sm text-muted-foreground">Estimated Repair Cost</div>
                    <div className="text-2xl font-bold">
                      ${results.estimatedRepairCost.minCost.toLocaleString()} - $
                      {results.estimatedRepairCost.maxCost.toLocaleString()}
                    </div>
                    {results.estimatedRepairCost.timeframe && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        Timeframe: {results.estimatedRepairCost.timeframe}
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendations */}
                {results.recommendations && results.recommendations.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold">Recommendations:</h4>
                    <ul className="space-y-1">
                      {results.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-sm">
                          • {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setResults(null);
                  setPhotos([]);
                  setPreviews([]);
                }}
                variant="outline"
                className="flex-1"
              >
                Analyze More Photos
              </Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1 gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Inspection
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

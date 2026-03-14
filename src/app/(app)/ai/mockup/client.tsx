"use client";

import { Download, Info, Upload, Wand2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

const PROJECT_TYPES = [
  "Roofing",
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Exterior Paint",
  "Flooring",
  "Solar Installation",
  "HVAC",
  "General Contractor",
  "Landscaping",
] as const;

// Suggested descriptions for each project type to help users
const PROJECT_SUGGESTIONS: Record<string, string> = {
  Roofing:
    "Replace aging asphalt shingles with new architectural shingles in charcoal gray. Add ridge vents and clean gutters.",
  "Kitchen Remodel":
    "Modernize with white shaker cabinets, quartz countertops, stainless steel appliances, and subway tile backsplash.",
  "Bathroom Remodel":
    "Update with walk-in shower, modern vanity with vessel sink, LED mirror, and ceramic tile flooring.",
  "Exterior Paint":
    "Fresh coat of modern gray exterior with white trim and black accents on shutters and door.",
  Flooring: "Install luxury vinyl plank flooring in natural oak finish throughout the space.",
  "Solar Installation":
    "Add rooftop solar panel array covering south-facing roof section with sleek black panels.",
  HVAC: "Install new high-efficiency split system with modern wall-mounted units and updated ductwork.",
  "General Contractor":
    "Complete renovation with updated finishes, fresh paint, new fixtures, and improved layout.",
  Landscaping:
    "Transform with drought-tolerant plants, decorative gravel, new sod lawn, and stone pathway.",
};

export default function MockupClient() {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<string>("");
  const [projectDescription, setProjectDescription] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);

  const handleBeforeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setBeforeFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setBeforeImage(event.target?.result as string);
      setAfterImage(null); // Clear after image when new before is uploaded
    };
    reader.readAsDataURL(file);
  };

  // Auto-fill suggestion when project type changes
  const handleProjectTypeChange = (value: string) => {
    setProjectType(value);
    // Only auto-fill if description is empty or was a previous suggestion
    if (!projectDescription || Object.values(PROJECT_SUGGESTIONS).includes(projectDescription)) {
      setProjectDescription(PROJECT_SUGGESTIONS[value] || "");
    }
  };

  const handleGenerate = async () => {
    if (!beforeFile || !projectType) {
      toast.error("Please upload a before image and select a project type");
      return;
    }

    setIsGenerating(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("beforeImage", beforeFile);
      formData.append("projectType", projectType);
      formData.append("projectDescription", projectDescription);

      // Call generation API
      const response = await fetch("/api/mockup/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Generation failed");
      }

      const result = await response.json();
      setAfterImage(result.afterImageUrl);
      toast.success("Project mockup generated!");
    } catch (error) {
      logger.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate mockup");
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = beforeImage && projectType && !isGenerating;

  return (
    <div className="space-y-6">
      {/* Project Type Selector */}
      <div className="space-y-2">
        <Label htmlFor="project-type">Project Type</Label>
        <Select value={projectType} onValueChange={handleProjectTypeChange}>
          <SelectTrigger
            id="project-type"
            className="w-full border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
          >
            <SelectValue placeholder="Select project type..." />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Description / AI Summary Box */}
      <div className="space-y-2">
        <Label htmlFor="project-description" className="flex items-center gap-2">
          <span>Project Description</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            AI Prompt
          </span>
        </Label>
        <div className="relative">
          <Textarea
            id="project-description"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Describe what the finished project should look like. Be specific about materials, colors, and style preferences..."
            className="min-h-[120px] resize-none border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
            rows={4}
          />
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/50">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Help the AI create accurate visualizations</p>
            <p className="mt-1 text-blue-600 dark:text-blue-400">
              Include details like: materials (shingles, tile, vinyl), colors (charcoal gray, white,
              natural oak), style (modern, traditional, farmhouse), and any specific features you
              want shown.
            </p>
          </div>
        </div>
      </div>

      {/* Before/After Panels */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 shadow-sm backdrop-blur-xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* BEFORE Panel */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Before</Label>
            <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20">
              {beforeImage ? (
                <Image
                  src={beforeImage}
                  alt="Before"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 p-6 hover:bg-muted/30">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Upload Before Image</p>
                    <p className="text-xs text-muted-foreground">Click to browse or drag & drop</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBeforeUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {beforeImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBeforeImage(null);
                  setBeforeFile(null);
                  setAfterImage(null);
                }}
                className="w-full"
              >
                Clear
              </Button>
            )}
          </div>

          {/* AFTER Panel */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">After (Generated)</Label>
            <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20">
              {afterImage ? (
                <Image
                  src={afterImage}
                  alt="After"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
                  <Wand2 className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Generated Result</p>
                    <p className="text-xs text-muted-foreground">
                      {beforeImage
                        ? "Click 'Generate After Mockup' to create"
                        : "Upload a before image first"}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {afterImage && (
              <a
                href={afterImage}
                download={`mockup-${projectType.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Download Image
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full" size="lg">
        {isGenerating ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate After Mockup
          </>
        )}
      </Button>

      {!beforeImage && (
        <p className="text-center text-sm text-muted-foreground">
          Upload a before image and select a project type to get started
        </p>
      )}
    </div>
  );
}

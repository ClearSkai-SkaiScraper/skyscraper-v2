/**
 * Analyze Photos Button
 *
 * Triggers AI damage assessment and 3D reconstruction on claim photos.
 */

"use client";

import { AlertCircle,Camera, Loader2 } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface AnalyzePhotosButtonProps {
  claimId: string;
  onComplete?: (result: any) => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function AnalyzePhotosButton({
  claimId,
  onComplete,
  variant = "primary",
  size = "md",
}: AnalyzePhotosButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/${claimId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "damage" }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      onComplete?.(data.result);
    } catch (err: any) {
      logger.error("[AnalyzePhotos] Error:", err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-slate-600 hover:bg-slate-700 text-white",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className={`flex items-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} `}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Analyze Photos
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}

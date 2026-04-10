/**
 * Generate Summary Button
 *
 * Triggers AI-powered summary generation for the claim.
 */

"use client";

import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface GenerateSummaryButtonProps {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete?: (result: any) => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function GenerateSummaryButton({
  claimId,
  onComplete,
  variant = "primary",
  size = "md",
}: GenerateSummaryButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/${claimId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "triage" }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Summary generation failed");
      }

      onComplete?.(data.result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[GenerateSummary] Error:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
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
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`flex items-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} `}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Generate Summary
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

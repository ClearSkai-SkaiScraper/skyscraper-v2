/**
 * Optimize Workflow Button
 *
 * Triggers multi-agent policy optimization for claim workflow.
 */

"use client";

import { AlertCircle,Loader2, Zap } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface OptimizeWorkflowButtonProps {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete?: (result: any) => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function OptimizeWorkflowButton({
  claimId,
  onComplete,
  variant = "primary",
  size = "md",
}: OptimizeWorkflowButtonProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/${claimId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "policy" }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Workflow optimization failed");
      }

      onComplete?.(data.result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[OptimizeWorkflow] Error:", err);
      setError(err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantClasses = {
    primary: "bg-orange-600 hover:bg-orange-700 text-white",
    secondary: "bg-slate-600 hover:bg-slate-700 text-white",
    outline: "border-2 border-orange-600 text-orange-600 hover:bg-orange-50",
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleOptimize}
        disabled={isOptimizing}
        className={`flex items-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} `}
      >
        {isOptimizing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Optimizing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Optimize Workflow
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

/**
 * Run 3D Scan Button
 *
 * Triggers 3D reconstruction and object detection from claim photos.
 */

"use client";

import { AlertCircle,Box, Loader2 } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface Run3DScanButtonProps {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete?: (result: any) => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Run3DScanButton({
  claimId,
  onComplete,
  variant = "primary",
  size = "md",
}: Run3DScanButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/3d`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconstruct",
          payload: { claimId },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "3D scan failed");
      }

      onComplete?.(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[Run3DScan] Error:", err);
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantClasses = {
    primary: "bg-purple-600 hover:bg-purple-700 text-white",
    secondary: "bg-slate-600 hover:bg-slate-700 text-white",
    outline: "border-2 border-purple-600 text-purple-600 hover:bg-purple-50",
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleScan}
        disabled={isScanning}
        className={`flex items-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} `}
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <Box className="h-4 w-4" />
            Run 3D Scan
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

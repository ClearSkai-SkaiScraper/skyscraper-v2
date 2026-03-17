// components/automation/DominusGodModeButton.tsx
/**
 * 🔥 GOD MODE BUTTON
 * Runs FULL automation pipeline
 */

"use client";

import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface DominusGodModeButtonProps {
  claimId: string;
  onComplete?: () => void;
}

export function DominusGodModeButton({ claimId, onComplete }: DominusGodModeButtonProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAutomation = async () => {
    setIsRunning(true);
    toast.loading("🔥 SkaiPDF is analyzing the claim...", { id: "skai" });

    try {
      const res = await fetch("/api/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      if (!res.ok) throw new Error("Automation failed");

      const data = await res.json();

      toast.success(
        `🔥 SkaiPDF complete! ${data.triggersDetected} triggers, ${data.actionsExecuted} actions`,
        { id: "skai" }
      );

      onComplete?.();
    } catch (error) {
      logger.error("[SKAI] Error:", error);
      toast.error("Automation failed", { id: "skai" });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      size="lg"
      disabled={isRunning}
      onClick={handleRunAutomation}
      className="bg-gradient-error font-bold text-white shadow-lg hover:opacity-95"
    >
      {isRunning ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Running SkaiPDF...
        </>
      ) : (
        <>
          <Zap className="mr-2 h-5 w-5" />
          🔥 RUN FULL SKAI
        </>
      )}
    </Button>
  );
}

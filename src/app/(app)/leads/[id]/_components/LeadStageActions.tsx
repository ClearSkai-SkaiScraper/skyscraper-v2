// src/app/(app)/leads/[id]/_components/LeadStageActions.tsx
"use client";

import { ArrowRight, CheckCircle2, Clock, Trophy, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface LeadStageActionsProps {
  leadId: string;
  currentStage: string;
}

const LEAD_STAGES = [
  { key: "new", label: "New", icon: Clock, color: "bg-blue-500" },
  { key: "qualified", label: "Qualified", icon: CheckCircle2, color: "bg-emerald-500" },
  { key: "proposal", label: "Proposal", icon: ArrowRight, color: "bg-amber-500" },
  { key: "negotiation", label: "Negotiation", icon: ArrowRight, color: "bg-orange-500" },
  { key: "won", label: "Won", icon: Trophy, color: "bg-green-600" },
  { key: "lost", label: "Lost", icon: XCircle, color: "bg-red-500" },
];

export function LeadStageActions({ leadId, currentStage }: LeadStageActionsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [stage, setStage] = useState(currentStage || "new");

  const currentIndex = LEAD_STAGES.findIndex((s) => s.key === stage);
  const isTerminal = stage === "won" || stage === "lost" || stage === "converted";

  async function updateStage(newStage: string) {
    if (updating || newStage === stage) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      setStage(newStage);
      router.refresh();
    } catch (error) {
      logger.error("[LeadStageActions] Error:", error);
    } finally {
      setUpdating(false);
    }
  }

  // Next stage in pipeline (excluding won/lost)
  const nextStage =
    !isTerminal && currentIndex >= 0 && currentIndex < 3 ? LEAD_STAGES[currentIndex + 1] : null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-emerald-600" />
            Stage Pipeline
          </span>
          <Badge
            className={`${LEAD_STAGES.find((s) => s.key === stage)?.color || "bg-slate-500"} text-white`}
          >
            {(stage || "new").replace("_", " ").toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {/* Stage progress dots */}
        <div className="flex items-center justify-between gap-1">
          {LEAD_STAGES.slice(0, 4).map((s, i) => {
            const isPast = i < currentIndex;
            const isCurrent = s.key === stage;
            return (
              <button
                key={s.key}
                onClick={() => updateStage(s.key)}
                disabled={updating}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg p-2 text-center transition-all ${
                  isCurrent
                    ? "bg-emerald-50 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30"
                    : isPast
                      ? "opacity-60 hover:opacity-80"
                      : "opacity-40 hover:opacity-60"
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full ${
                    isCurrent
                      ? s.color
                      : isPast
                        ? "bg-emerald-400"
                        : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {nextStage && (
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => updateStage(nextStage.key)}
              disabled={updating}
            >
              <ArrowRight className="mr-1 h-3 w-3" />
              {nextStage.label}
            </Button>
          )}
          {!isTerminal && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                onClick={() => updateStage("won")}
                disabled={updating}
              >
                <Trophy className="mr-1 h-3 w-3" />
                Won
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                onClick={() => updateStage("lost")}
                disabled={updating}
              >
                <XCircle className="mr-1 h-3 w-3" />
                Lost
              </Button>
            </>
          )}
        </div>

        {isTerminal && (
          <p className="text-center text-xs text-muted-foreground">
            This lead is marked as <strong>{stage}</strong>. Reopen by selecting a stage above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

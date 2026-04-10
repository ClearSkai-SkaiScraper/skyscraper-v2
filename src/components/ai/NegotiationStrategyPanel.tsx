"use client";

import { CheckCircle2, Clock, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface NegotiationStep {
  step: string;
  completed?: boolean;
}

interface NegotiationSuggestion {
  summary: string;
  steps: string[];
  expectedImpact: string;
  tactics: string[];
  riskLevel: "low" | "medium" | "high";
  avgResponseDays?: number;
  historicalSuccessRate?: number;
}

interface NegotiationStrategyPanelProps {
  claimId: string;
  carrier?: string;
  onStrategyApply?: (tactics: string[]) => void;
}

export function NegotiationStrategyPanel({
  claimId,
  carrier,
  onStrategyApply,
}: NegotiationStrategyPanelProps) {
  const [suggestions, setSuggestions] = useState<NegotiationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedTactics, setAppliedTactics] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchStrategy() {
      try {
        setLoading(true);
        const response = await fetch(`/api/ai/orchestrate/${claimId}?type=negotiate`);

        if (!response.ok) {
          throw new Error("Failed to fetch negotiation strategy");
        }

        const data = await response.json();
        setSuggestions(data.negotiationSuggestions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        logger.error("Failed to fetch negotiation strategy:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchStrategy();
  }, [claimId]);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400";
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  const handleApplyStrategy = (tactics: string[]) => {
    setAppliedTactics(new Set([...appliedTactics, ...tactics]));
    onStrategyApply?.(tactics);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Negotiation Strategy
          </CardTitle>
          <CardDescription>
            {error || "No carrier-specific strategies available yet"}
          </CardDescription>
        </CardHeader>
        {carrier && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Carrier: <span className="font-medium">{carrier}</span>
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                Carrier-Specific Strategy
                {carrier && (
                  <Badge variant="outline" className="ml-2">
                    {carrier}
                  </Badge>
                )}
              </CardTitle>
              <Badge className={getRiskColor(suggestion.riskLevel)}>
                {suggestion.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>
            <CardDescription className="mt-2 text-sm">{suggestion.summary}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Expected Impact */}
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Expected Impact</p>
                <p className="text-sm text-muted-foreground">{suggestion.expectedImpact}</p>
              </div>
            </div>

            {/* Historical Data */}
            {(suggestion.historicalSuccessRate !== undefined || suggestion.avgResponseDays) && (
              <div className="grid grid-cols-2 gap-3">
                {suggestion.historicalSuccessRate !== undefined && (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="text-lg font-bold text-green-600">
                        {Math.round(suggestion.historicalSuccessRate * 100)}%
                      </p>
                    </div>
                  </div>
                )}
                {suggestion.avgResponseDays && (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Avg Response</p>
                      <p className="flex items-center gap-1 text-lg font-bold">
                        <Clock className="h-4 w-4" />
                        {suggestion.avgResponseDays}d
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tactics */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4" />
                Recommended Tactics
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestion.tactics.map((tactic, tacticIndex) => (
                  <Badge
                    key={tacticIndex}
                    variant={appliedTactics.has(tactic) ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {appliedTactics.has(tactic) && "✓ "}
                    {tactic}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">Action Steps</h4>
              <ol className="space-y-2">
                {suggestion.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {stepIndex + 1}
                    </span>
                    <span className="flex-1 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Action Button */}
            <Button
              className="w-full"
              onClick={() => handleApplyStrategy(suggestion.tactics)}
              disabled={suggestion.tactics.every((t) => appliedTactics.has(t))}
            >
              {suggestion.tactics.every((t) => appliedTactics.has(t))
                ? "Strategy Applied"
                : "Apply This Strategy"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

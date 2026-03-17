"use client";

import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface ClaimIntelligence {
  approvalLikelihood: number;
  supplementSuccessProbability: number;
  riskScore: number;
  recommendedStrategy: string;
  keyFactors: string[];
}

interface ClaimIntelligenceDashboardProps {
  claimId: string;
}

export function ClaimIntelligenceDashboard({ claimId }: ClaimIntelligenceDashboardProps) {
  const [intelligence, setIntelligence] = useState<ClaimIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIntelligence() {
      try {
        setLoading(true);
        const response = await fetch(`/api/ai/orchestrate/${claimId}?type=full_intelligence`);

        if (!response.ok) {
          throw new Error("Failed to fetch claim intelligence");
        }

        const data = await response.json();
        setIntelligence(data.intelligence);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        logger.error("Failed to fetch claim intelligence:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchIntelligence();
  }, [claimId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-4 w-20" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-4 w-20" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-4 w-20" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !intelligence) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Intelligence Unavailable</CardTitle>
          <CardDescription>{error || "Unable to load claim intelligence"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-600 dark:text-green-400";
    if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.7) return "bg-green-100 dark:bg-green-950";
    if (score >= 0.4) return "bg-yellow-100 dark:bg-yellow-950";
    return "bg-red-100 dark:bg-red-950";
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.7) return "bg-green-500";
    if (score >= 0.4) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Approval Likelihood */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Approval Likelihood</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`${getScoreBgColor(intelligence.approvalLikelihood)} mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full`}
            >
              <span
                className={`text-2xl font-bold ${getScoreColor(intelligence.approvalLikelihood)}`}
              >
                {Math.round(intelligence.approvalLikelihood * 100)}%
              </span>
            </div>
            <Progress
              value={intelligence.approvalLikelihood * 100}
              className="h-2"
              indicatorClassName={getProgressColor(intelligence.approvalLikelihood)}
            />
          </CardContent>
        </Card>

        {/* Supplement Success Probability */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Supplement Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`${getScoreBgColor(intelligence.supplementSuccessProbability)} mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full`}
            >
              <span
                className={`text-2xl font-bold ${getScoreColor(intelligence.supplementSuccessProbability)}`}
              >
                {Math.round(intelligence.supplementSuccessProbability * 100)}%
              </span>
            </div>
            <Progress
              value={intelligence.supplementSuccessProbability * 100}
              className="h-2"
              indicatorClassName={getProgressColor(intelligence.supplementSuccessProbability)}
            />
          </CardContent>
        </Card>

        {/* Risk Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`${getScoreBgColor(1 - intelligence.riskScore)} mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full`}
            >
              <span className={`text-2xl font-bold ${getScoreColor(1 - intelligence.riskScore)}`}>
                {Math.round(intelligence.riskScore * 100)}%
              </span>
            </div>
            <Progress
              value={intelligence.riskScore * 100}
              className="h-2"
              indicatorClassName={getProgressColor(1 - intelligence.riskScore)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Key Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Factors Affecting Prediction
          </CardTitle>
          <CardDescription>These factors are influencing the AI's assessment</CardDescription>
        </CardHeader>
        <CardContent>
          {intelligence.keyFactors.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No key factors identified yet
            </p>
          ) : (
            <ul className="space-y-3">
              {intelligence.keyFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 flex-shrink-0">
                    {factor.toLowerCase().includes("similar") ||
                    factor.toLowerCase().includes("success") ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : factor.toLowerCase().includes("risk") ||
                      factor.toLowerCase().includes("missing") ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="flex-1">{factor}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recommended Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 px-3 py-1.5">
              <span className="text-sm font-medium capitalize">
                {intelligence.recommendedStrategy.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

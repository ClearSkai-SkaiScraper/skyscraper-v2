"use client";

import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface NextAction {
  id: string;
  label: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  actionType: string;
  estimatedTime?: string;
  confidenceScore?: number;
}

interface AIIntelligence {
  approvalLikelihood: number;
  riskScore: number;
  nextActions: NextAction[];
  keyFactors: string[];
}

interface NextBestActionPanelProps {
  claimId: string;
  onActionClick?: (actionType: string) => void;
}

export function NextBestActionPanel({ claimId, onActionClick }: NextBestActionPanelProps) {
  const [intelligence, setIntelligence] = useState<AIIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIntelligence() {
      try {
        setLoading(true);
        const response = await fetch(`/api/ai/orchestrate/${claimId}?type=next_actions`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            throw new Error("Please sign in to view AI recommendations");
          }
          throw new Error(errorData.error || "Failed to fetch AI intelligence");
        }

        const data = await response.json();
        setIntelligence(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        logger.error("Failed to fetch AI intelligence:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchIntelligence();
  }, [claimId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !intelligence) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            AI Intelligence Unavailable
          </CardTitle>
          <CardDescription>{error || "Unable to load recommendations"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "critical":
        return {
          icon: AlertCircle,
          color: "destructive",
          bgColor: "bg-red-50 dark:bg-red-950",
          borderColor: "border-red-200 dark:border-red-800",
        };
      case "high":
        return {
          icon: Zap,
          color: "orange",
          bgColor: "bg-orange-50 dark:bg-orange-950",
          borderColor: "border-orange-200 dark:border-orange-800",
        };
      case "medium":
        return {
          icon: Clock,
          color: "blue",
          bgColor: "bg-blue-50 dark:bg-blue-950",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      default:
        return {
          icon: CheckCircle2,
          color: "secondary",
          bgColor: "bg-gray-50 dark:bg-gray-950",
          borderColor: "border-gray-200 dark:border-gray-800",
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Next Best Actions
        </CardTitle>
        <CardDescription>AI-recommended steps to move this claim forward</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {intelligence.nextActions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No immediate actions required</p>
          </div>
        ) : (
          intelligence.nextActions.map((action) => {
            const config = getPriorityConfig(action.priority);
            const Icon = config.icon;

            return (
              <Card
                key={action.id}
                className={`${config.bgColor} ${config.borderColor} border-2 transition-all hover:shadow-md`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`text- mt-0.5 h-5 w-5 flex-shrink-0${config.color}-600`} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        // eslint-disable-next-line react/jsx-no-comment-textnodes
                        <h4 className="text-sm font-semibold">{action.label}</h4>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        <Badge variant={config.color as any} className="text-xs">
                          {action.priority.toUpperCase()}
                        </Badge>
                        {action.confidenceScore && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(action.confidenceScore * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">{action.description}</p>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          onClick={() => onActionClick?.(action.actionType)}
                          className="text-xs"
                        >
                          Take Action
                        </Button>
                        {action.estimatedTime && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {action.estimatedTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Intelligence Summary */}
        {intelligence.nextActions.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approval Likelihood:</span>
              <span className="font-semibold">
                {Math.round(intelligence.approvalLikelihood * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Risk Score:</span>
              <span className="font-semibold">{Math.round(intelligence.riskScore * 100)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

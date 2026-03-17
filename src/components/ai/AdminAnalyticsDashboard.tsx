"use client";

import {
  Activity,
  Award,
  BarChart3,
  Brain,
  CheckCircle,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface AgentPerformance {
  agentId: string;
  agentName: string;
  actionsCount: number;
  successRate: number;
  avgConfidence: number;
  improvementTrend: number;
}

interface RuleEffectiveness {
  ruleId: string;
  ruleName: string;
  triggeredCount: number;
  successfulOutcomes: number;
  effectivenessScore: number;
}

interface LearningMetrics {
  totalActions: number;
  totalOutcomes: number;
  overallSuccessRate: number;
  weekOverWeekGrowth: number;
  topPerformingAgent: string;
  mostEffectiveRule: string;
}

interface AdminAnalyticsDashboardProps {
  orgId: string;
  timeRange?: "7d" | "30d" | "90d" | "all";
}

export function AdminAnalyticsDashboard({
  orgId,
  timeRange = "30d",
}: AdminAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [ruleEffectiveness, setRuleEffectiveness] = useState<RuleEffectiveness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [orgId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/analytics?orgId=${orgId}&timeRange=${timeRange}`);

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setMetrics(data.metrics);
      setAgentPerformance(data.agentPerformance || []);
      setRuleEffectiveness(data.ruleEffectiveness || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      logger.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-2 h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Analytics Unavailable</CardTitle>
          <CardDescription>{error || "Unable to load analytics data"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalActions.toLocaleString()}</div>
            {metrics.weekOverWeekGrowth !== undefined && (
              <p className="text-xs text-muted-foreground">
                {metrics.weekOverWeekGrowth > 0 ? "+" : ""}
                {metrics.weekOverWeekGrowth.toFixed(1)}% from last period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracked Outcomes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOutcomes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((metrics.totalOutcomes / metrics.totalActions) * 100)}% tracking rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(metrics.overallSuccessRate * 100)}%
            </div>
            <Progress value={metrics.overallSuccessRate * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Moat</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {metrics.totalActions >= 10000
                ? "Elite"
                : metrics.totalActions >= 1000
                  ? "Strong"
                  : metrics.totalActions >= 100
                    ? "Growing"
                    : "Building"}
            </div>
            <p className="text-xs text-muted-foreground">Proprietary dataset</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="rules">Rule Effectiveness</TabsTrigger>
          <TabsTrigger value="insights">Learning Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Agent Performance Leaderboard
              </CardTitle>
              <CardDescription>
                Compare AI agent success rates and improvement trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {agentPerformance.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Brain className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <p>No agent performance data yet</p>
                    <p className="text-sm">Data will appear after AI actions are logged</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agentPerformance.map((agent, index) => (
                      <Card key={agent.agentId}>
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                                #{index + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold">{agent.agentName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {agent.actionsCount} actions
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {agent.improvementTrend > 0 ? (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                                  ↑ {agent.improvementTrend.toFixed(1)}%
                                </Badge>
                              ) : agent.improvementTrend < 0 ? (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                                  ↓ {Math.abs(agent.improvementTrend).toFixed(1)}%
                                </Badge>
                              ) : (
                                <Badge variant="outline">Stable</Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Success Rate</span>
                                <span className="font-semibold">
                                  {Math.round(agent.successRate * 100)}%
                                </span>
                              </div>
                              <Progress value={agent.successRate * 100} className="h-2" />
                            </div>

                            <div>
                              <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Avg Confidence</span>
                                <span className="font-semibold">
                                  {Math.round(agent.avgConfidence * 100)}%
                                </span>
                              </div>
                              <Progress value={agent.avgConfidence * 100} className="h-2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Rule Effectiveness
              </CardTitle>
              <CardDescription>Which business rules are driving the best outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {ruleEffectiveness.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Zap className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <p>No rule effectiveness data yet</p>
                    <p className="text-sm">Data will appear after rules trigger outcomes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ruleEffectiveness.map((rule, index) => (
                      <Card key={rule.ruleId}>
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold">{rule.ruleName}</h4>
                              <p className="text-xs text-muted-foreground">
                                Triggered {rule.triggeredCount} times • {rule.successfulOutcomes}{" "}
                                successful
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">
                                {Math.round(rule.effectivenessScore * 100)}%
                              </div>
                              <p className="text-xs text-muted-foreground">effectiveness</p>
                            </div>
                          </div>
                          <Progress value={rule.effectivenessScore * 100} className="h-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performing Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="font-semibold">{metrics.topPerformingAgent || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">Highest success rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Effective Rule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">{metrics.mostEffectiveRule || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">Drives best outcomes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Overall AI intelligence system status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Action Logging</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {metrics.totalOutcomes > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">Outcome Tracking</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    metrics.totalOutcomes > 0
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }
                >
                  {metrics.totalOutcomes > 0 ? "Active" : "Waiting"}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {metrics.totalActions >= 100 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">Learning Loop</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    metrics.totalActions >= 100
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }
                >
                  {metrics.totalActions >= 100 ? "Training" : "Collecting"}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {metrics.totalActions >= 1000 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-blue-500" />
                  )}
                  <span className="font-medium">Data Moat</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    metrics.totalActions >= 1000
                      ? "bg-green-50 text-green-700"
                      : "bg-blue-50 text-blue-700"
                  }
                >
                  {metrics.totalActions >= 1000 ? "Established" : "Building"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { Clock, DollarSign, Lightbulb, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import ProgressBar from "@/components/ProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
// Deprecated: Skai Assistant removed (11/22/2025). Use AskSkaiWidget (global) instead.
// import { openSkaiAssistant } from "@/components/SKaiAssistant";

interface PipelineSummary {
  totalLeads: number;
  activeLeads: number;
  stagesProgress: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  recentUpdates: {
    id: string;
    leadId: string;
    fromStage: string;
    toStage: string;
    updatedAt: Date;
    updatedBy: string;
  }[];
  nextActions: {
    leadId: string;
    customerName: string;
    currentStage: string;
    suggestedAction: string;
    priority: "high" | "medium" | "low";
    daysInStage: number;
  }[];
}

export default function PipelinesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchPipelineSummary();
    }
  }, [isLoaded, isSignedIn]);

  const fetchPipelineSummary = async () => {
    try {
      const response = await fetch("/api/pipelines/summary");
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      logger.error("Error fetching pipeline summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const handleNextAction = (action: PipelineSummary["nextActions"][0]) => {
    // Navigate to lead detail with suggested action context
    router.push(
      `/crm/pipelines?leadId=${action.leadId}&action=${encodeURIComponent(action.suggestedAction)}`
    );
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <PageHero
          section="jobs"
          title="Pipelines"
          subtitle="Track your sales pipeline progress and next actions"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="mb-2 h-4 rounded bg-muted"></div>
                <div className="h-6 rounded bg-muted"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="rounded-xl border border-yellow-300/40 bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>Assistant Disabled:</strong> Pipeline AI assistant has been disabled while we
          finalize the new SkaiPDF suite.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <PageHero
        section="jobs"
        title="Pipelines"
        subtitle="Track your sales pipeline progress and next actions"
        icon={<TrendingUp className="h-6 w-6" />}
        actions={<Button onClick={fetchPipelineSummary}>Refresh Data</Button>}
      />
      <div className="rounded-xl border border-yellow-300/40 bg-yellow-50 p-4 text-sm text-yellow-800">
        <strong>Assistant Disabled:</strong> Pipeline AI assistant has been disabled while we
        finalize the new SkaiPDF suite.
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{summary?.totalLeads || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold">{summary?.activeLeads || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {summary?.totalLeads
                    ? Math.round(
                        ((summary.totalLeads - summary.activeLeads) / summary.totalLeads) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Actions</p>
                <p className="text-2xl font-bold">{summary?.nextActions.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Stages Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary?.stagesProgress.map((stage) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{stage.stage}</span>
                  <span>
                    {stage.count} leads ({stage.percentage}%)
                  </span>
                </div>
                <ProgressBar percentage={stage.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Next Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Next Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary?.nextActions.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                All caught up! No urgent actions required.
              </p>
            ) : (
              summary?.nextActions.map((action) => (
                <div
                  key={action.leadId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{action.customerName}</span>
                      <Badge variant={getPriorityColor(action.priority)} className="text-xs">
                        {action.priority}
                      </Badge>
                    </div>
                    <p className="mb-1 text-sm text-muted-foreground">{action.suggestedAction}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.currentStage} • {action.daysInStage} days
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNextAction(action)}
                    className="ml-3"
                  >
                    Take Action
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Pipeline Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recentUpdates.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No recent pipeline updates</p>
          ) : (
            <div className="space-y-3">
              {summary?.recentUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      Lead moved from {update.fromStage} → {update.toStage}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By {update.updatedBy} • {new Date(update.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Lead
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { Clock, DollarSign, Lightbulb, MessageSquare, Plus, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import ProgressBar from "@/components/ProgressBar";
import { MetricValue, SectionTitle } from "@/components/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Deprecated: Skai Assistant removed (11/22/2025). Use AskSkaiWidget (global) instead.
// import { openSkaiAssistant } from "@/components/SKaiAssistant";
import { logger } from "@/lib/logger";

interface TeamPost {
  id: string;
  authorId: string;
  message: string;
  createdAt: string;
  pinned: boolean;
}

interface PipelineSummary {
  totalLeads: number;
  activeLeads: number;
  stagesProgress: {
    stage: string;
    count: number;
    percentage: number;
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

export default function CRMPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [teamPosts, setTeamPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostMessage, setNewPostMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void Promise.all([fetchPipelineSummary(), fetchTeamPosts(), fetchBranding()]).finally(() =>
      setLoading(false)
    );
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
    }
  };
  const fetchBranding = async () => {
    try {
      const res = await fetch("/api/me/branding");
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
      }
    } catch (e) {
      logger.warn("[CRM] branding fetch failed", e);
    }
  };

  const fetchTeamPosts = async () => {
    try {
      const response = await fetch("/api/team/posts");
      if (response.ok) {
        const data = await response.json();
        setTeamPosts(data);
      }
    } catch (error) {
      logger.error("Error fetching team posts:", error);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostMessage.trim()) return;

    try {
      const response = await fetch("/api/team/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newPostMessage }),
      });

      if (response.ok) {
        setNewPostMessage("");
        void fetchTeamPosts();
      }
    } catch (error) {
      logger.error("Error creating post:", error);
    }
  };

  const handleNextAction = (action: PipelineSummary["nextActions"][0]) => {
    // Navigate to the lead detail and advance stage
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

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <PageHero
          section="leads"
          title="CRM Dashboard"
          subtitle="Overview of your sales pipeline and team activity"
          icon={<Users className="h-6 w-6" />}
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
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <PageHero
        section="leads"
        title="CRM Dashboard"
        subtitle="Overview of your sales pipeline and team activity"
        icon={<Users className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <Button variant="default" asChild>
              <a href="/crm/pipelines">View Full Pipeline</a>
            </Button>
          </div>
        }
      />
      {branding && (
        <div className="flex items-center gap-6 rounded-2xl border bg-card p-6">
          {branding.logoUrl && (
            <img
              src={branding.logoUrl}
              alt={branding.companyName || "Company Logo"}
              className="h-16 w-16 rounded-xl border object-cover"
            />
          )}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Organization Branding</p>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">
                {branding.companyName || "Company Name Pending"}
              </span>
              <span
                className="inline-block h-5 w-5 rounded-full border shadow-sm"
                style={{ backgroundColor: branding.primary || "#e2e8f0" }}
                title={`Primary: ${branding.primary || "not set"}`}
              />
              <span
                className="inline-block h-5 w-5 rounded-full border shadow-sm"
                style={{ backgroundColor: branding.accent || "#e2e8f0" }}
                title={`Accent: ${branding.accent || "not set"}`}
              />
            </div>
            {!branding.complete && (
              <p className="text-xs text-muted-foreground">
                Branding incomplete – add logo & colors for full white‑label experience.
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <MetricValue>{summary?.totalLeads || 0}</MetricValue>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                <MetricValue>{summary?.activeLeads || 0}</MetricValue>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <MetricValue>
                  {summary?.totalLeads
                    ? Math.round(
                        ((summary.totalLeads - summary.activeLeads) / summary.totalLeads) * 100
                      )
                    : 0}
                  %
                </MetricValue>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Actions</p>
                <MetricValue>{summary?.nextActions.length || 0}</MetricValue>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline Overview</TabsTrigger>
          <TabsTrigger value="actions">Next Actions</TabsTrigger>
          <TabsTrigger value="team">Team Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <Card className="rounded-2xl">
            <div className="p-6">
              <SectionTitle>Pipeline Stages</SectionTitle>
              <div className="space-y-4">
                {summary?.stagesProgress.map((stage) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{stage.stage}</span>
                      <span>
                        {stage.count} leads ({stage.percentage}%)
                      </span>
                    </div>
                    <ProgressBar percentage={stage.percentage} className="h-3" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card className="rounded-2xl">
            <div className="p-6">
              <SectionTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Next Actions Required
              </SectionTitle>
              <div className="space-y-3">
                {summary?.nextActions.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    🎉 All caught up! No urgent actions required.
                  </p>
                ) : (
                  summary?.nextActions.map((action) => (
                    <div
                      key={action.leadId}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-medium">{action.customerName}</span>
                          <Badge variant={getPriorityColor(action.priority)} className="text-xs">
                            {action.priority}
                          </Badge>
                        </div>
                        <p className="mb-1 text-sm text-muted-foreground">
                          {action.suggestedAction}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stage: {action.currentStage} • {action.daysInStage} days in stage
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleNextAction(action)} className="ml-3">
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Take Action
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card className="rounded-2xl">
            <div className="p-6">
              <SectionTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Team Feed
              </SectionTitle>
              <div className="space-y-4">
                {/* New Post Input */}
                <div className="flex gap-2">
                  <textarea
                    value={newPostMessage}
                    onChange={(e) => setNewPostMessage(e.target.value)}
                    placeholder="Share an update with your team..."
                    className="flex-1 resize-none rounded-lg border p-3"
                    rows={2}
                  />
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPostMessage.trim()}
                    className="self-end"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Team Posts */}
                {teamPosts.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No team updates yet. Be the first to share something!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamPosts.map((post) => (
                      <div key={post.id} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <span className="text-sm font-medium">
                            {post.authorId === user?.id
                              ? user?.fullName || "You"
                              : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (post as any).authorName || "Team Member"}
                          </span>
                          <div className="flex items-center gap-2">
                            {post.pinned && (
                              <Badge variant="secondary" className="text-xs">
                                Pinned
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{post.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

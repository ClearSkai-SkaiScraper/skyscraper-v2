"use client";

import { useUser } from "@clerk/nextjs";
import { Check, ChevronRight, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/lib/logger";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  order: number;
}

interface OnboardingProgress {
  hasBranding: boolean;
  hasClient: boolean;
  hasClaim: boolean;
  hasPhotos: boolean;
  hasAiArtifact: boolean;
  hasPdfExport: boolean;
  hasVendorReference: boolean;
  hasTradesMember: boolean;
}

export default function GettingStartedPage() {
  const { user } = useUser();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const [isDeletingSample, setIsDeletingSample] = useState(false);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch("/api/onboarding/progress");
        if (res.ok) {
          const data = await res.json();
          setProgress(data);

          // Check if all steps completed
          const allComplete = Object.values(data).every((val) => val === true);
          if (allComplete && !showCelebration) {
            setShowCelebration(true);
          }
        }
      } catch (error) {
        logger.error("[ONBOARDING] Failed to fetch progress:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchProgress();
    // Refresh every 5 seconds to detect changes
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [showCelebration]);

  async function handleCreateSample() {
    setIsCreatingSample(true);
    try {
      const res = await fetch("/api/onboarding/create-sample", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create sample data");
        return;
      }

      toast.success(data.message || "Sample data created successfully!");
      // Refresh progress
      const progressRes = await fetch("/api/onboarding/progress");
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData);
      }
    } catch (error) {
      toast.error("Failed to create sample data");
      logger.error("[CREATE_SAMPLE]", error);
    } finally {
      setIsCreatingSample(false);
    }
  }

  async function handleDeleteSample() {
    if (!confirm("Are you sure you want to delete all sample data? This cannot be undone.")) {
      return;
    }

    setIsDeletingSample(true);
    try {
      const res = await fetch("/api/onboarding/create-sample", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete sample data");
        return;
      }

      toast.success(data.message || "Sample data deleted successfully");
      // Refresh progress
      const progressRes = await fetch("/api/onboarding/progress");
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData);
      }
    } catch (error) {
      toast.error("Failed to delete sample data");
      logger.error("[DELETE_SAMPLE]", error);
    } finally {
      setIsDeletingSample(false);
    }
  }

  const checklist: ChecklistItem[] = [
    {
      id: "branding",
      title: "Complete Organization Branding",
      description: "Add your logo, colors, contact info, and license number",
      href: "/settings/organization",
      completed: progress?.hasBranding || false,
      order: 1,
    },
    {
      id: "client",
      title: "Create Your First Client",
      description: "Add a client to start managing their properties and claims",
      href: "/clients?action=create",
      completed: progress?.hasClient || false,
      order: 2,
    },
    {
      id: "claim",
      title: "Create Your First Claim",
      description: "Set up a claim to track damage assessment and reports",
      href: "/claims?action=create",
      completed: progress?.hasClaim || false,
      order: 3,
    },
    {
      id: "photos",
      title: "Upload Photos & Documents",
      description: "Upload at least 3 photos and 1 document to a claim",
      href: "/claims",
      completed: progress?.hasPhotos || false,
      order: 4,
    },
    {
      id: "ai",
      title: "Run an AI Tool",
      description: "Try AI Damage Builder, Supplement, or Rebuttal and save an artifact",
      href: "/ai/damage-builder",
      completed: progress?.hasAiArtifact || false,
      order: 5,
    },
    {
      id: "pdf",
      title: "Export a Branded PDF",
      description: "Generate a professional PDF report with your branding",
      href: "/claims",
      completed: progress?.hasPdfExport || false,
      order: 6,
    },
    {
      id: "vendor",
      title: "Browse Vendor Resources",
      description: "Explore vendor catalogs and download product specifications",
      href: "/vendors",
      completed: progress?.hasVendorReference || false,
      order: 7,
    },
    {
      id: "trades",
      title: "Invite a Trades Member",
      description: "Add a subcontractor or create your company trades profile",
      href: "/network",
      completed: progress?.hasTradesMember || false,
      order: 8,
    },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = (completedCount / totalCount) * 100;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (showCelebration) {
    return (
      <div className="container max-w-4xl py-12">
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <Check className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">🎉 Congratulations!</CardTitle>
            <CardDescription className="text-base">
              You&apos;ve completed the onboarding checklist! You&apos;re ready to use SkaiScraper to its full
              potential.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white p-4 dark:bg-slate-800">
              <h3 className="mb-2 font-semibold">What&apos;s Next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Start processing real claims with AI-powered tools</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Invite team members to collaborate on claims</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>
                    Explore advanced features like batch proposals and weather verification
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>Check out our template marketplace for pre-built report templates</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/claims">
                  View Claims
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCelebration(false)}
              className="w-full text-xs text-muted-foreground"
            >
              View Checklist Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          Welcome to SkaiScraper{user?.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="text-lg text-muted-foreground">
          Get started with our platform by completing these essential steps.
        </p>
      </div>

      <div className="mb-8 space-y-4">
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
          <CardHeader>
            <CardTitle className="text-lg">Try with Sample Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Not ready to add real data? Create a sample claim to explore all features instantly.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleCreateSample}
                disabled={isCreatingSample}
                size="sm"
                variant="outline"
                className="w-full"
              >
                {isCreatingSample ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Sample Claim
                  </>
                )}
              </Button>
              <Button
                onClick={handleDeleteSample}
                disabled={isDeletingSample}
                size="sm"
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
              >
                {isDeletingSample ? (
                  <>
                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete Sample Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you have questions or run into any issues, we&apos;re here to help!
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" size="sm">
                <Link href="/support">
                  Contact Support
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href="mailto:support@skaiscrape.com">
                  Email Us
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Progress</CardTitle>
            <Badge variant={progressPercent === 100 ? "default" : "secondary"}>
              {completedCount} / {totalCount} Complete
            </Badge>
          </div>
          <CardDescription>
            Complete all steps to unlock the full potential of SkaiScraper
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            {Math.round(progressPercent)}% complete
          </p>
        </CardContent>
      </Card>

      {/* Getting Started Checklist */}
      <div className="space-y-4">
        {checklist.map((item) => (
          <Card
            key={item.id}
            className={
              item.completed
                ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                : "hover:border-blue-200 hover:bg-blue-50/30 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
            }
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    item.completed ? "bg-green-500" : "bg-muted"
                  }`}
                >
                  {item.completed ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {item.order}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="mt-1">{item.description}</CardDescription>
                </div>
                <Button asChild variant={item.completed ? "outline" : "default"} size="sm">
                  <Link href={item.href}>
                    {item.completed ? "View" : "Start"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

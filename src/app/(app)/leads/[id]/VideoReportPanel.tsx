"use client";

/**
 * 🔥 PHASE 27: SKAI VIDEO AI (v1.5)
 *
 * VideoReportPanel - Generate cinematic damage report videos
 */

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Download,
  FileText,
  Film,
  Link,
  Loader2,
  Play,
  Share2,
  Video,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface VideoReportPanelProps {
  leadId: string;
}

interface VideoJob {
  jobId: string;
  reportId: string;
  stage: string;
  stageMessage: string;
  progress: number;
  status: string;
  error?: string;
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  title?: string;
  description?: string;
  tokensUsed?: number;
  script?: Record<string, unknown>;
}

export function VideoReportPanel({ leadId }: VideoReportPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [videoAccessMessage, setVideoAccessMessage] = useState<string | null>(null);

  const loadVideoAccess = useCallback(async () => {
    try {
      const response = await fetch("/api/video-access");
      if (response.ok) {
        const data: { message?: string } = await response.json();
        setVideoAccessMessage(data.message ?? null);
      }
    } catch (err) {
      logger.error("Error loading video access:", err);
    }
  }, []);

  const loadExistingReport = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-reports?leadId=${leadId}`);
      if (response.ok) {
        const data: {
          report?: {
            id: string;
            status: string;
            videoUrl?: string;
            title?: string;
            isPublic?: boolean;
            publicId?: string;
          };
        } = await response.json();
        if (data.report) {
          setJob({
            jobId: data.report.id,
            reportId: data.report.id,
            stage: data.report.status,
            stageMessage: "Report ready",
            progress: 100,
            status: data.report.status,
            videoUrl: data.report.videoUrl,
            title: data.report.title,
          });
          setIsPublic(data.report.isPublic || false);
          if (data.report.publicId && data.report.isPublic) {
            setShareUrl(`${window.location.origin}/watch/${data.report.publicId}`);
          }
        }
      }
    } catch (err) {
      logger.error("Error loading existing report:", err);
    }
  }, [leadId]);

  // Load existing video report on mount
  useEffect(() => {
    void loadExistingReport();
    void loadVideoAccess();
  }, [leadId, loadExistingReport, loadVideoAccess]);

  const generateVideo = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/ai/skai/video/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          tone: "professional",
          audience: "homeowner",
          maxDuration: 60,
        }),
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json().catch(() => ({}));

        if (response.status === 402) {
          toast.error("Update your plan to generate video reports.");
          setError("You're out of AI tokens. Update your plan to continue.");
          return;
        }

        if (response.status === 401) {
          toast.error("Please sign in again.");
          setError("Please sign in to generate video reports.");
          return;
        }

        throw new Error(data.error || "We couldn't create the video job. Please try again.");
      }

      const data: {
        jobId: string;
        reportId: string;
        status: string;
        script?: { title?: string };
        estimatedTokens?: number;
      } = await response.json();

      setJob({
        jobId: data.jobId,
        reportId: data.reportId,
        stage: "QUEUED",
        stageMessage: "Queued for processing",
        progress: 10,
        status: data.status,
        title: data.script?.title,
        tokensUsed: data.estimatedTokens,
      });

      // Start polling for status
      void pollJobStatus(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/ai/skai/video/job/${jobId}`);
          const data: VideoJob = await response.json();

          if (response.ok) {
            setJob(data);

            // Stop polling when completed or failed
            if (data.status === "COMPLETED" || data.status === "FAILED") {
              clearInterval(interval);
            }
          }
        } catch (err) {
          logger.error("Error polling job status:", err);
        }
      })();
    }, 3000); // Poll every 3 seconds
  };

  const runScriptGeneration = async () => {
    if (!job?.reportId) return;

    try {
      setIsRunning(true);
      const response = await fetch(`/api/ai/skai/video/job/${job.reportId}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json();
        toast.error(data.error || "Failed to generate script");
        setIsRunning(false);
        return;
      }

      toast.success("Video script and storyboard created successfully!");

      // Reload report to get script/storyboard data
      await loadExistingReport();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsRunning(false);
    }
  };

  const generateShareLink = async () => {
    if (!job?.reportId) return;

    try {
      setIsSharing(true);
      const response = await fetch(`/api/video-reports/${job.reportId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareTitle: job.title || "Damage Video Report",
          expiresInDays: 30,
        }),
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json();
        toast.error(data.error || "Failed to generate share link");
        setIsSharing(false);
        return;
      }

      const data: { shareUrl: string } = await response.json();
      setShareUrl(data.shareUrl);
      setIsPublic(true);

      toast.success("Anyone with this link can view the video report.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch (__err) {
      toast.error("Could not copy to clipboard");
    }
  };

  const revokeShareLink = async () => {
    if (!job?.reportId) return;

    try {
      setIsSharing(true);
      const response = await fetch(`/api/video-reports/${job.reportId}/revoke`, {
        method: "POST",
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json();
        toast.error(data.error || "Failed to revoke link");
        setIsSharing(false);
        return;
      }

      setShareUrl(null);
      setIsPublic(false);

      toast.success("Share link has been disabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSharing(false);
    }
  };

  const downloadVideo = () => {
    if (job?.videoUrl) {
      window.open(job.videoUrl, "_blank");
    }
  };

  const getStageIcon = (stage: string) => {
    if (stage === "COMPLETED") return CheckCircle;
    if (stage === "FAILED") return AlertCircle;
    return Clock;
  };

  const getStageColor = (stage: string) => {
    if (stage === "COMPLETED") return "text-green-600";
    if (stage === "FAILED") return "text-red-600";
    return "text-blue-600";
  };

  return (
    <Card className="mt-6 rounded-xl border bg-white shadow-md transition-all duration-300 hover:-translate-y-[2px] hover:shadow-xl dark:bg-neutral-900">
      <CardHeader className="px-6 pb-4 pt-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Film className="h-5 w-5 text-purple-600" />
              SkaiPDF Video
              <Badge variant="outline" className="ml-2 text-xs">
                v1.5 BETA
              </Badge>
              {videoAccessMessage && videoAccessMessage.includes("Real AI video") && (
                <Badge className="ml-2 bg-gradient-to-r from-green-600 to-emerald-600 text-xs">
                  REAL VIDEO (BETA)
                </Badge>
              )}
            </CardTitle>
            {videoAccessMessage && !videoAccessMessage.includes("Real AI video") && (
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-600">
                {videoAccessMessage}
              </p>
            )}
          </div>
          {!job && (
            <Button
              onClick={generateVideo}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-md transition-all hover:-translate-y-[1px] hover:scale-[1.02] hover:from-purple-700 hover:to-blue-700 hover:shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Job...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Generate Video Report
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!job && !error && (
          <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-8 text-center transition-all hover:shadow-md dark:border-purple-800 dark:from-purple-900/20 dark:to-blue-900/20">
            <Video className="mx-auto mb-4 h-16 w-16 text-purple-600" />
            <h3 className="mb-2 text-lg font-semibold text-purple-900 dark:text-purple-100">
              Create Cinematic Damage Report
            </h3>
            <p className="mx-auto mb-4 max-w-md text-sm text-purple-700 dark:text-purple-300">
              Turn your inspection photos and AI insights into a professional narrated video report.
              Perfect for clients, adjusters, and homeowners.
            </p>
            <ul className="mx-auto max-w-sm space-y-2 text-left text-sm text-purple-900 dark:text-purple-100">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                AI-generated script and narration
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Cinematic camera movements
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Damage highlights and annotations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Export-ready MP4 file
              </li>
            </ul>
            <p className="mt-4 text-xs text-purple-600 dark:text-purple-400">
              Cost: ~30-60 tokens • Duration: ~60 seconds
            </p>
          </div>
        )}

        {job && (
          <div className="space-y-4">
            {/* Job Header */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {job.title || "Video Report"}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                  {job.tokensUsed} tokens used
                </p>
              </div>
              <Badge variant="outline" className={getStageColor(job.status)}>
                {job.status}
              </Badge>
            </div>

            {/* Progress Bar with Neutral Messaging (Mission 4E) */}
            {job.status === "PROCESSING" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="flex items-start gap-2">
                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {job.stageMessage}
                      </p>
                      <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                        Generating video typically takes 2-3 minutes. Please keep this page open.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {job.progress}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-200 shadow-inner dark:bg-gray-700">
                  <div
                    className="h-full animate-pulse bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 transition-all duration-500"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 🎬 PHASE 27.3: Enhanced Processing Stages with Visual Indicators */}
            {job.status === "PROCESSING" && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { stage: "SCRIPT_GENERATION", label: "Script", progress: 20 },
                  { stage: "STORYBOARD_GENERATION", label: "Storyboard", progress: 40 },
                  { stage: "SCENE_RENDERING", label: "Rendering", progress: 60 },
                  { stage: "AUDIO_GENERATION", label: "Audio", progress: 70 },
                  { stage: "VIDEO_COMPILATION", label: "Compiling", progress: 80 },
                  { stage: "COMPLETED", label: "Complete", progress: 100 },
                ].map((item) => {
                  const isActive = job.stage === item.stage;
                  const isComplete = job.progress >= item.progress;
                  const StageIcon = getStageIcon(
                    isComplete ? "COMPLETED" : isActive ? "PROCESSING" : item.stage
                  );

                  return (
                    <div
                      key={item.stage}
                      className={`rounded-lg border-2 p-3 transition-all duration-300 ${
                        isActive
                          ? "scale-[1.02] border-purple-600 bg-purple-50 shadow-sm dark:bg-purple-900/20"
                          : isComplete
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <StageIcon
                          className={`h-4 w-4 transition-colors ${
                            isActive
                              ? "animate-pulse text-purple-600"
                              : isComplete
                                ? "text-green-600"
                                : "text-gray-600 dark:text-gray-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-purple-900 dark:text-purple-100"
                              : isComplete
                                ? "text-green-900 dark:text-green-100"
                                : "text-gray-600 dark:text-gray-400 dark:text-gray-600"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Script Generation (when job created but not yet processed) */}
            {job.status === "QUEUED" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="mb-3 text-sm text-blue-900 dark:text-blue-100">
                    Job created! Click below to generate the AI script and storyboard.
                  </p>
                  <Button
                    onClick={runScriptGeneration}
                    disabled={isRunning}
                    className="w-full bg-gradient-to-r from-sky-600 to-blue-600"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Script...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Generate Script & Storyboard
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Video Player (when complete) */}
            {job.status === "COMPLETED" && job.videoUrl && (
              <div className="space-y-4">
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  <video controls className="h-full w-full" poster={job.thumbnailUrl}>
                    <source src={job.videoUrl} type="video/mp4" />
                    Your browser does not support video playback.
                  </video>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={downloadVideo}
                    className="flex-1 transition-all hover:-translate-y-[1px] hover:scale-[1.02]"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>

                  {!isPublic ? (
                    <Button
                      onClick={generateShareLink}
                      disabled={isSharing}
                      variant="outline"
                      className="flex-1 transition-all hover:-translate-y-[1px] hover:scale-[1.02]"
                    >
                      {isSharing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Link className="mr-2 h-4 w-4" />
                      )}
                      Generate Share Link
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={copyShareLink}
                        variant="outline"
                        className="flex-1 transition-all hover:-translate-y-[1px] hover:scale-[1.02]"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button
                        onClick={revokeShareLink}
                        disabled={isSharing}
                        variant="outline"
                        className="flex-1 transition-all hover:-translate-y-[1px] hover:scale-[1.02]"
                      >
                        {isSharing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Revoke
                      </Button>
                    </>
                  )}
                </div>

                {shareUrl && isPublic && (
                  <div className="space-y-3">
                    {/* Video Watch Link */}
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
                        <Video className="h-3 w-3" />
                        Video Watch Link (YouTube-style):
                      </p>
                      <code className="mb-2 block break-all rounded bg-white px-2 py-1 text-xs text-green-900 dark:bg-gray-900 dark:text-green-100">
                        {shareUrl}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(shareUrl, "_blank")}
                        className="h-7 text-xs"
                      >
                        <Share2 className="mr-1 h-3 w-3" />
                        Open Watch Page
                      </Button>
                    </div>

                    {/* Adjuster Packet Link */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                        <FileText className="h-3 w-3" />
                        Adjuster Packet Link (Full Report):
                      </p>
                      <code className="mb-2 block break-all rounded bg-white px-2 py-1 text-xs text-blue-900 dark:bg-gray-900 dark:text-blue-100">
                        {shareUrl.replace("/watch/", "/packet/")}
                      </code>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            window.open(shareUrl.replace("/watch/", "/packet/"), "_blank")
                          }
                          className="h-7 text-xs"
                        >
                          <Share2 className="mr-1 h-3 w-3" />
                          Open Packet
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                shareUrl.replace("/watch/", "/packet/")
                              );
                              toast.success("Adjuster packet link copied to clipboard!");
                            } catch (_err) {
                              toast.error("Could not copy to clipboard");
                            }
                          }}
                          className="h-7 text-xs"
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copy Packet Link
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {job.duration && (
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                    Duration: {Math.floor(job.duration)}s
                  </p>
                )}
              </div>
            )}

            {/* Error State with Retry (Mission 4E) */}
            {job.status === "FAILED" && job.error && (
              <div className="space-y-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      Video Generation Encountered an Issue
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                      {job.error.includes("TIMEOUT")
                        ? "The video generation took longer than expected. This can happen during peak usage. Please try again."
                        : job.error.includes("API_LIMIT")
                          ? "We're experiencing high demand right now. Please wait a moment and try again."
                          : job.error.includes("INVALID_PHOTOS")
                            ? "There's an issue with the photos for this lead. Please check that photos are uploaded and try again."
                            : "We encountered an issue generating your video. Our system will automatically retry, or you can try again manually."}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-amber-600 hover:underline dark:text-amber-400">
                        Technical details
                      </summary>
                      <code className="mt-1 block rounded bg-white px-2 py-1 text-xs text-amber-900 dark:bg-gray-900 dark:text-amber-100">
                        {job.error}
                      </code>
                    </details>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={generateVideo}
                    className="bg-amber-600 text-white hover:bg-amber-700"
                    size="sm"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Our system has automatic retry protection to handle temporary issues.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { AlertCircle, FileVideo, Loader2, Play, Sparkles, Upload, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";

interface VideoItem {
  id: string;
  file: File;
  preview?: string;
  name: string;
  size: number;
}

interface Claim {
  id: string;
  claimNumber?: string;
  propertyAddress?: string;
  dateOfLoss?: string;
}

export default function VideoReportsClient() {
  const _router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [type, setType] = useState<"CLAIM_VIDEO" | "RETAIL_VIDEO">("CLAIM_VIDEO");
  const [analyzing, setAnalyzing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch claims on mount
  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch("/api/claims");
        if (res.ok) {
          const data = await res.json();
          setClaims(data.claims || data || []);
        }
      } catch (err) {
        logger.error("Failed to load claims:", err);
      } finally {
        setLoadingClaims(false);
      }
    }
    void fetchClaims();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      videos.forEach((v) => {
        if (v.preview) URL.revokeObjectURL(v.preview);
      });
    };
  }, [videos]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newVideos: VideoItem[] = files.map((file) => ({
      id: Math.random().toString(36),
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    }));
    setVideos((prev) => [...prev, ...newVideos]);
    setError(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("video/"));
    if (files.length === 0) {
      setError("Please drop video files only");
      return;
    }
    const newVideos: VideoItem[] = files.map((file) => ({
      id: Math.random().toString(36),
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    }));
    setVideos((prev) => [...prev, ...newVideos]);
    setError(null);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function removeVideo(id: string) {
    setVideos((prev) => {
      const video = prev.find((v) => v.id === id);
      if (video?.preview) URL.revokeObjectURL(video.preview);
      return prev.filter((v) => v.id !== id);
    });
  }

  async function handleAnalyze() {
    if (videos.length === 0) {
      setError("Please upload at least one video file");
      return;
    }

    if (!selectedClaimId && type === "CLAIM_VIDEO") {
      setError("Please select a claim for claim video reports");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setVideoUrl(null);

    try {
      const formData = new FormData();
      videos.forEach((v) => formData.append("videos", v.file));
      formData.append("type", type);
      if (selectedClaimId) formData.append("claimId", selectedClaimId);

      const res = await fetch("/api/video/create", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        // Handle aiFail response structure: { ok: false, error: { message, code, details } }
        let errorMessage = "Video analysis failed. Please try again.";
        if (typeof json.error === "object" && json.error?.message) {
          errorMessage = json.error.message;
        } else if (typeof json.error === "string") {
          errorMessage = json.error;
        }
        setError(errorMessage);
        setAnalyzing(false);
        return;
      }

      const json = await res.json();
      setVideoUrl(json.url || json.videoUrl);

      // Log telemetry
      await fetch("/api/telemetry/video-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          type,
          tokensUsed: json.tokensUsed,
        }),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Video Upload Queue */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card px-6 py-5 shadow-lg">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
              <Upload className="h-5 w-5 text-muted-foreground" />
              Video Queue ({videos.length})
            </h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload video files"
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-slate-50/50 to-slate-100/50 p-8 text-center transition-all duration-200 hover:border-[#117CFF]/50 hover:bg-[#117CFF]/5 dark:from-slate-900/30 dark:to-slate-800/30"
            >
              <Video className="mx-auto mb-3 h-12 w-12 text-slate-700 dark:text-slate-300" />
              <p className="text-sm font-medium text-text-primary">Drag & drop video files</p>
              <p className="mt-1 text-xs text-text-muted">or click to browse</p>
              <p className="mt-2 text-xs text-text-muted">MP4, MOV, AVI • Max 500MB per file</p>
            </div>

            {/* Video List */}
            {videos.length > 0 && (
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="group relative rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] p-3 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <FileVideo className="h-8 w-8 flex-shrink-0 text-purple-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{video.name}</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {formatFileSize(video.size)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVideo(video.id);
                        }}
                        className="rounded-full p-1.5 opacity-0 transition-colors hover:bg-red-100 group-hover:opacity-100 dark:hover:bg-red-950"
                        aria-label="Remove video"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setVideos([])}
              disabled={videos.length === 0}
              className="mt-3 w-full rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Middle Column: Configuration */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              Configuration
            </h2>

            {/* Video Type Selection */}
            <div className="mb-4 space-y-2">
              <label className="text-xs font-medium text-[color:var(--text)]">Report Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setType("CLAIM_VIDEO")}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    type === "CLAIM_VIDEO"
                      ? "border-[#117CFF] bg-[#117CFF]/10 text-[#117CFF] shadow-lg ring-2 ring-[#117CFF]/20"
                      : "border-[color:var(--border)] bg-[var(--surface-2)] text-[color:var(--text)] hover:border-[#117CFF]/50 hover:bg-[var(--surface-1)]"
                  }`}
                >
                  📋 Insurance Claim
                </button>
                <button
                  onClick={() => setType("RETAIL_VIDEO")}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    type === "RETAIL_VIDEO"
                      ? "border-[#FFC838] bg-[#FFC838]/10 text-[#FFC838] shadow-lg ring-2 ring-[#FFC838]/20"
                      : "border-[color:var(--border)] bg-[var(--surface-2)] text-[color:var(--text)] hover:border-[#FFC838]/50 hover:bg-[var(--surface-1)]"
                  }`}
                >
                  💎 Retail Proposal
                </button>
              </div>
            </div>

            {/* Claim Selection (for CLAIM_VIDEO type) */}
            {type === "CLAIM_VIDEO" && (
              <div className="space-y-2">
                <label
                  htmlFor="claim-select"
                  className="text-xs font-medium text-[color:var(--text)]"
                >
                  Select Claim
                </label>
                {loadingClaims ? (
                  <div className="py-2 text-xs text-slate-700 dark:text-slate-300">
                    Loading claims...
                  </div>
                ) : claims.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      No claims found. Create a claim first to generate insurance video reports.
                    </p>
                  </div>
                ) : (
                  <select
                    id="claim-select"
                    aria-label="Select a claim"
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    value={selectedClaimId}
                    onChange={(e) => setSelectedClaimId(e.target.value)}
                  >
                    <option value="">-- Select a claim --</option>
                    {claims.map((claim) => (
                      <option key={claim.id} value={claim.id}>
                        {claim.claimNumber || claim.id} - {claim.propertyAddress || "No address"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={
                videos.length === 0 || analyzing || (type === "CLAIM_VIDEO" && !selectedClaimId)
              }
              className="mt-4 w-full rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Video...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate Video Report
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Play className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              Generated Report
            </h2>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">Error</p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {videoUrl ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ✅ Video report generated successfully!
                  </p>
                </div>
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg border border-[color:var(--border)] shadow-sm"
                >
                  Your browser does not support video playback.
                </video>
                <a
                  href={videoUrl}
                  download
                  className="block w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-2 text-center text-sm font-medium text-text-primary hover:bg-[var(--surface-2)]"
                >
                  Download Video
                </a>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-[color:var(--border)] bg-[var(--surface-2)] p-8 text-center">
                <Video className="mx-auto mb-3 h-12 w-12 text-slate-700 dark:text-slate-300" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Upload videos and click &ldquo;Generate Video Report&rdquo; to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal is rendered at top-level with `open` prop */}
    </>
  );
}

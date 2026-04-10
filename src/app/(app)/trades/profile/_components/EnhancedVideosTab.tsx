/* eslint-disable react/jsx-no-comment-textnodes */
/**
 * Enhanced Videos Tab Component
 * Video gallery with player, categories, and upload
 */

"use client";

import { Pause, Play, Plus, Video, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface VideoItem {
  id: string;
  url: string;
  thumbnail?: string;
  title: string;
  description?: string;
  category?: string;
  duration?: number;
  views?: number;
  createdAt: string;
}

interface EnhancedVideosTabProps {
  userId: string;
  isOwnProfile: boolean;
  videos: VideoItem[];
}

export default function EnhancedVideosTab({
  userId,
  isOwnProfile,
  videos,
}: EnhancedVideosTabProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setProgress((current / total) * 100);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    const time = (value[0] / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(value[0]);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const closePlayer = () => {
    setSelectedVideo(null);
    setIsPlaying(false);
    setProgress(0);
    document.body.style.overflow = "";
  };

  const openVideo = (video: VideoItem) => {
    setSelectedVideo(video);
    document.body.style.overflow = "hidden";
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedVideo) return;
      if (e.key === "Escape") closePlayer();
      if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      }
      if (e.key === "m") setIsMuted(!isMuted);
    };

    window.addEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVideo, isPlaying, isMuted]);

  if (videos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Video className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No videos yet</h3>
          <p className="mb-4 text-slate-600">
            {isOwnProfile
              ? "Upload videos of your work process or completed projects!"
              : "This professional hasn't uploaded any videos yet."}
          </p>
          {isOwnProfile && (
            <Link href="/trades/portfolio/upload">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Video className="mr-2 h-4 w-4" />
                Upload Videos
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">{videos.length} videos</span>
        {isOwnProfile && (
          <Link href="/trades/portfolio/upload">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-1 h-4 w-4" />
              Add Video
            </Button>
          </Link>
        )}
      </div>

      {/* Video Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => openVideo(video)}
            className="group cursor-pointer overflow-hidden rounded-lg border bg-slate-100 transition hover:shadow-lg"
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-slate-900">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <video
                  src={video.url}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
              )}

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                <div className="rounded-full bg-white/90 p-4">
                  <Play className="h-8 w-8 fill-current text-slate-900" />
                </div>
              </div>

              {/* Duration Badge */}
              {video.duration && (
                <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                  {formatDuration(video.duration)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <h4 className="line-clamp-1 font-medium text-slate-900">{video.title}</h4>
              {video.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{video.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                {video.views !== undefined && <span>{video.views.toLocaleString()} views</span>}
                {video.category && (
                  <Badge variant="secondary" className="text-xs">
                    {video.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          {/* Close Button */}
          <button
            onClick={closePlayer}
            className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 hover:bg-white/20"
            aria-label="Close video player"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Video Container */}
          <div className="relative w-full max-w-5xl">
            <video
              ref={videoRef}
              src={selectedVideo.url}
              className="w-full rounded-lg"
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={handlePlayPause}
            />

            {/* Custom Controls */}
            <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="mb-3"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    className="rounded-full bg-white/20 p-2 hover:bg-white/30"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 fill-current text-white" />
                    )}
                  </button>

                  {/* Mute Toggle */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="rounded-full p-2 hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5 text-white" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-white" />
                    )}
                  </button>

                  {/* Time */}
                  <span className="text-sm text-white">
                    {formatDuration((progress / 100) * duration)} / {formatDuration(duration)}
                  </span>
                </div>

                {/* Video Info */}
                <div className="text-right">
                  <h4 className="text-sm font-medium text-white">{selectedVideo.title}</h4>
                  {selectedVideo.category && (
                    <Badge className="mt-1 bg-white/20 text-white">{selectedVideo.category}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Big Play Button (when paused) */}
            {!isPlaying && (
              <div
                onClick={handlePlayPause}
                className="absolute inset-0 flex cursor-pointer items-center justify-center"
              >
                <div className="rounded-full bg-white/90 p-6 shadow-lg transition hover:scale-110">
                  <Play className="h-12 w-12 fill-current text-slate-900" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

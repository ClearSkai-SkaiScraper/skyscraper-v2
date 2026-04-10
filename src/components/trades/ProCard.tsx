/**
 * ProCard Component
 * Displays contractor profile card in search results
 */

"use client";

import { Check, Heart, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import GlassPanel from "./GlassPanel";
import { RatingStars } from "./RatingStars";

interface ProCardProps {
  id: string;
  companyName?: string | null;
  tradeType: string;
  baseZip?: string | null;
  avgRating?: number | null;
  yearsExperience?: number | null;
  distance?: number | null;
  shortBio?: string | null;
  totalReviews?: number | null;
  profilePath?: string; // Override default profile path
  isSaved?: boolean; // Whether this pro is saved to "My Pros"
  isConnected?: boolean; // Whether already connected
  onSaveToggle?: (id: string, saved: boolean) => void; // Callback for save toggle
  onConnect?: (id: string) => void; // Callback for connect
  showConnectButton?: boolean; // Whether to show connect button
}

export default function ProCard({
  id,
  companyName,
  tradeType,
  baseZip,
  avgRating,
  yearsExperience,
  distance,
  shortBio,
  totalReviews,
  profilePath,
  isSaved = false,
  isConnected = false,
  onSaveToggle,
  onConnect,
  showConnectButton = false,
}: ProCardProps) {
  const defaultProfilePath = `/portal/profiles/${id}`;
  const href = profilePath || defaultProfilePath;
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(isConnected);
  const [connecting, setConnecting] = useState(false);

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setSaving(true);
    try {
      const res = await fetch("/api/portal/save-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: id, action: saved ? "unsave" : "save" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSaved(!saved);
      onSaveToggle?.(id, !saved);
      toast.success(saved ? "Removed from My Pros" : "Added to My Pros! 🎉");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to save pro");
    } finally {
      setSaving(false);
    }
  }

  async function handleConnect(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (connected) return;

    setConnecting(true);
    try {
      const res = await fetch("/api/portal/connect-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to connect");
      }

      setConnected(true);
      onConnect?.(id);
      toast.success("Connection request sent! 🎉");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <GlassPanel className="p-4 transition-transform hover:-translate-y-0.5 md:p-5">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-white">
              {companyName || "Unnamed Contractor"}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-300/70">{tradeType}</div>
          </div>
          <div className="flex items-center gap-2">
            {distance != null && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-200/80">
                <span className="text-zinc-400">📍</span>~{distance.toFixed(1)} mi
              </div>
            )}
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`group flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                saved
                  ? "border-pink-500/50 bg-pink-500/20 text-pink-400"
                  : "border-white/20 bg-white/5 text-zinc-400 hover:border-pink-400/50 hover:bg-pink-500/10 hover:text-pink-400"
              }`}
              title={saved ? "Remove from My Pros" : "Save to My Pros"}
            >
              <Heart
                className={`h-4 w-4 transition-transform ${saving ? "animate-pulse" : ""} ${saved ? "fill-current" : "group-hover:scale-110"}`}
              />
            </button>
          </div>
        </div>

        {/* Bio */}
        {shortBio && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-zinc-200/80">{shortBio}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <RatingStars rating={avgRating} totalReviews={totalReviews} showCount />
            <div className="text-[11px] text-zinc-300/70">
              {yearsExperience ? `${yearsExperience}+ yrs experience` : baseZip || "Arizona"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showConnectButton && (
              <button
                onClick={handleConnect}
                disabled={connecting || connected}
                className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-[11px] font-medium transition-all ${
                  connected
                    ? "border-green-500/50 bg-green-500/20 text-green-400"
                    : "border-blue-400/50 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                }`}
                title={connected ? "Connected" : "Send connection request"}
              >
                {connecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : connected ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <UserPlus className="h-3 w-3" />
                )}
                {connected ? "Connected" : "Connect"}
              </button>
            )}
            <Link
              href={href}
              className="rounded-2xl border border-white/30 bg-white/5 px-3 py-1.5 text-[11px] text-zinc-50 transition-colors hover:bg-white/10"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

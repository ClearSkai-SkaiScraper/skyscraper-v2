/**
 * PresenceBadge — shows online/offline/away status dot + label
 *
 * Usage:
 *   <PresenceBadge userId="user_xxx" />           — auto-fetches presence
 *   <PresenceBadge presence="online" />            — static mode
 *   <PresenceBadge userId="user_xxx" showLabel />  — with text label
 *   <PresenceBadge userId="user_xxx" size="lg" />  — larger dot
 */

"use client";

import { useEffect, useState } from "react";

interface PresenceData {
  presence: "online" | "recently" | "away" | "offline" | "unknown";
  label: string;
  color: string;
  customStatus?: string | null;
  statusEmoji?: string | null;
}

interface PresenceBadgeProps {
  userId?: string;
  /** Static mode — skip API fetch */
  presence?: "online" | "recently" | "away" | "offline" | "unknown";
  /** Show text label next to dot */
  showLabel?: boolean;
  /** Show custom status text */
  showStatus?: boolean;
  /** Dot size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

const DOT_COLORS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  gray: "bg-gray-400",
};

const DOT_RING_COLORS: Record<string, string> = {
  green: "ring-green-500/30",
  yellow: "ring-yellow-400/30",
  gray: "ring-gray-400/20",
};

const DOT_SIZES: Record<string, string> = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export default function PresenceBadge({
  userId,
  presence: staticPresence,
  showLabel = false,
  showStatus = false,
  size = "md",
  className = "",
}: PresenceBadgeProps) {
  const [data, setData] = useState<PresenceData | null>(
    staticPresence
      ? {
          presence: staticPresence,
          label: staticPresence,
          color: staticPresence === "online" ? "green" : "gray",
          customStatus: null,
          statusEmoji: null,
        }
      : null
  );

  useEffect(() => {
    if (staticPresence || !userId) return;

    let cancelled = false;

    async function fetchPresence() {
      try {
        const res = await fetch(`/api/presence/${userId}`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData({
            presence: json.presence,
            label: json.label,
            color: json.color,
            customStatus: json.customStatus,
            statusEmoji: json.statusEmoji,
          });
        }
      } catch {
        // Silently fail — just don't show presence
      }
    }

    void fetchPresence();

    // Re-check every 60 seconds
    const interval = setInterval(fetchPresence, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, staticPresence]);

  if (!data) return null;

  const dotColor = DOT_COLORS[data.color] || DOT_COLORS.gray;
  const ringColor = DOT_RING_COLORS[data.color] || DOT_RING_COLORS.gray;
  const dotSize = DOT_SIZES[size] || DOT_SIZES.md;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Presence dot */}
      <span className="relative flex">
        <span
          className={`${dotSize} rounded-full ${dotColor} ring-2 ${ringColor}`}
          title={data.label}
        />
        {data.presence === "online" && (
          <span
            className={`absolute inline-flex ${dotSize} animate-ping rounded-full ${dotColor} opacity-50`}
          />
        )}
      </span>

      {/* Labels */}
      {(showLabel || showStatus) && (
        <div className="flex flex-col">
          {showLabel && <span className="text-xs leading-tight text-slate-500">{data.label}</span>}
          {showStatus && data.customStatus && (
            <span className="text-xs leading-tight text-slate-600">
              {data.statusEmoji && <span className="mr-0.5">{data.statusEmoji}</span>}
              {data.customStatus}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

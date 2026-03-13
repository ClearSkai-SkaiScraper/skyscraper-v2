/**
 * VendorLogo — Shared component with error handling for vendor logos
 * 3-tier fallback: DB logoUrl → domain favicon → gradient initials
 */

"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";

interface Props {
  logo: string | null;
  name: string;
  website?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: { container: "h-10 w-10", icon: "h-5 w-5", text: "text-sm" },
  md: { container: "h-16 w-16", icon: "h-8 w-8", text: "text-xl" },
  lg: { container: "h-20 w-20", icon: "h-10 w-10", text: "text-2xl" },
  xl: { container: "h-32 w-32", icon: "h-14 w-14", text: "text-4xl" },
};

const GRADIENT_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
  "from-red-500 to-rose-600",
  "from-green-500 to-emerald-600",
];

/** Extract domain from a URL or logo URL for favicon fallback */
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function VendorLogo({ logo, name, website, size = "md", className = "" }: Props) {
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const sizeClasses = SIZES[size];

  // Generate initials for fallback
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Deterministic color based on vendor name
  const colorIndex = name.charCodeAt(0) % GRADIENT_COLORS.length;
  const gradientClass = GRADIENT_COLORS[colorIndex];

  // Determine favicon URL for fallback
  const domain = extractDomain(website) || extractDomain(logo);
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

  // Skip known-dead logo sources
  const isDeadLogo = logo && (logo.includes("clearbit.com") || logo.includes("logo.clearbit"));
  const effectiveLogo = isDeadLogo ? null : logo;

  // Tier 1: Try the actual logo URL
  if (effectiveLogo && !imgError) {
    return (
      <div
        className={`relative flex ${sizeClasses.container} flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white ${className}`}
      >
        <img
          src={effectiveLogo}
          alt={name}
          className="h-full w-full object-contain p-1.5"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Tier 2: Try Google Favicons
  if (faviconUrl && !faviconError) {
    return (
      <div
        className={`relative flex ${sizeClasses.container} flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white ${className}`}
      >
        <img
          src={faviconUrl}
          alt={name}
          className="h-full w-full object-contain p-2"
          onError={() => setFaviconError(true)}
        />
      </div>
    );
  }

  // Tier 3: Gradient initials
  return (
    <div
      className={`flex ${sizeClasses.container} flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientClass} font-bold text-white shadow-sm ${sizeClasses.text} ${className}`}
    >
      {initials || <Building2 className={sizeClasses.icon} />}
    </div>
  );
}

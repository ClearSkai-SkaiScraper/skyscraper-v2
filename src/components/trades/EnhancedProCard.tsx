/**
 * EnhancedProCard Component
 * Rich Facebook-style contractor card for Find a Pro feed
 * Shows: verification badges, license info, reviews, featured work, website preview
 */

"use client";

import {
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  ShieldCheck,
  Star,
  UserPlus,
  Verified,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface EnhancedProCardProps {
  id: string;
  companyId?: string | null;
  // Basic info
  name: string;
  companyName?: string | null;
  tradeType: string;
  title?: string | null; // Job title (e.g. "Lead Technician")
  avatar?: string | null;
  coverPhoto?: string | null;
  tagline?: string | null;
  bio?: string | null;

  // Location
  city?: string | null;
  state?: string | null;
  distance?: number | null;

  // Ratings & Reviews
  rating?: number | null;
  reviewCount?: number | null;
  recentReview?: {
    text: string;
    rating: number;
    author: string;
  } | null;

  // Experience & Credentials
  yearsExperience?: number | null;
  foundedYear?: number | null;
  teamSize?: string | null;

  // Verification badges
  isVerified?: boolean;
  isLicensed?: boolean;
  isBonded?: boolean;
  isInsured?: boolean;
  rocNumber?: string | null;

  // Contact
  phone?: string | null;
  website?: string | null;

  // Featured work
  portfolioImages?: string[];
  featuredProject?: {
    title: string;
    image: string;
  } | null;

  // Availability
  emergencyAvailable?: boolean;
  freeEstimates?: boolean;
  responseTime?: string | null; // "< 1 hour", "< 24 hours"

  // Engagement
  engagementScore?: number;

  // State
  isSaved?: boolean;
  isConnected?: boolean;
  isPending?: boolean;
  onSaveToggle?: (id: string, saved: boolean) => void;
  onConnect?: (id: string) => void;
}

export default function EnhancedProCard({
  id,
  companyId,
  name,
  companyName,
  tradeType,
  title,
  avatar,
  coverPhoto,
  tagline,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bio,
  city,
  state,
  distance,
  rating,
  reviewCount,
  recentReview,
  yearsExperience,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  foundedYear,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  teamSize,
  isVerified = false,
  isLicensed = false,
  isBonded = false,
  isInsured = false,
  rocNumber,
  phone,
  website,
  portfolioImages = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  featuredProject,
  emergencyAvailable = false,
  freeEstimates = true,
  responseTime,
  isSaved = false,
  isConnected = false,
  isPending = false,
  onSaveToggle,
  onConnect,
}: EnhancedProCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showWebsitePreview, setShowWebsitePreview] = useState(false);

  const initials =
    companyName
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    name?.slice(0, 2).toUpperCase() ||
    "PR";

  const location = [city, state].filter(Boolean).join(", ");

  // Share pro profile to friends & family
  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/trades/profiles/${id}/public`;
    const shareText = `Check out ${companyName || name} on SkaiScraper! ${tradeType ? `Great ${tradeType} professional.` : ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recommend ${companyName || name}`,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully! 🎉");
      } catch {
        // User cancelled - try clipboard
        await copyShareLink(shareUrl);
      }
    } else {
      await copyShareLink(shareUrl);
    }
  }

  async function copyShareLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied! Send to friends & family 🎉");
    } catch {
      toast.error("Failed to copy link");
    }
  }

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
      if (!res.ok) throw new Error("Failed to save");
      setSaved(!saved);
      onSaveToggle?.(id, !saved);
      toast.success(saved ? "Removed from saved" : "Saved to My Pros! 💜");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleConnect(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isConnected || isPending) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/portal/connect-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: id }),
      });
      if (!res.ok) throw new Error("Failed to connect");
      onConnect?.(id);
      toast.success("Connection request sent! 🎉");
    } catch {
      toast.error("Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  // Track engagement when card is viewed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function trackView() {
    try {
      await fetch("/api/trades/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: id, action: "view" }),
      });
    } catch {
      // Silent fail for tracking
    }
  }

  return (
    <TooltipProvider>
      <Card className="group overflow-hidden border-slate-200 bg-white transition-all hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {/* Cover Photo / Header */}
        <div className="relative h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600">
          {coverPhoto && <Image src={coverPhoto} alt="" fill className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Quick badges on cover */}
          <div className="absolute right-3 top-3 flex gap-1.5">
            {isVerified && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge className="bg-blue-500/90 text-white">
                    <BadgeCheck className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Identity & credentials verified</TooltipContent>
              </Tooltip>
            )}
            {emergencyAvailable && (
              <Badge className="bg-red-500/90 text-white">
                <Clock className="mr-1 h-3 w-3" />
                24/7
              </Badge>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
              saved ? "bg-pink-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            )}
          </button>

          {/* Share button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleShare}
                className="absolute left-14 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Share to friends & family</TooltipContent>
          </Tooltip>
        </div>

        <CardContent className="relative -mt-8 space-y-4 p-4">
          {/* Avatar + Name + Company + Title */}
          <div className="flex items-end gap-3">
            <Avatar className="h-16 w-16 shadow-xl">
              <AvatarImage src={avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-1">
              {/* Company Name First */}
              {companyName && (
                <Link
                  href={
                    companyId ? `/trades/companies/${companyId}` : `/trades/profiles/${id}/public`
                  }
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Building2 className="h-3 w-3" />
                  {companyName}
                </Link>
              )}
              {/* Person Name */}
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{name}</h3>
                {isVerified && <Verified className="h-4 w-4 text-blue-500" />}
              </div>
              {/* Title + Trade Type */}
              <p className="text-sm text-slate-500">
                {title ? `${title} • ${tradeType}` : tradeType}
              </p>
            </div>
          </div>

          {/* Tagline */}
          {tagline && (
            <p className="text-sm italic text-slate-600 dark:text-slate-400">
              &ldquo;{tagline}&rdquo;
            </p>
          )}

          {/* Trust Badges Row */}
          <div className="flex flex-wrap gap-2">
            {isLicensed && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <Award className="mr-1 h-3 w-3" />
                    Licensed
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {rocNumber ? `ROC# ${rocNumber}` : "State licensed contractor"}
                </TooltipContent>
              </Tooltip>
            )}
            {isBonded && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    Bonded
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Bonded for your protection</TooltipContent>
              </Tooltip>
            )}
            {isInsured && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Insured
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Fully insured contractor</TooltipContent>
              </Tooltip>
            )}
            {freeEstimates && (
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Free Estimates
              </Badge>
            )}
          </div>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(rating || 0)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {rating?.toFixed(1) || "New"}
            </span>
            <span className="text-sm text-slate-500">({reviewCount || 0} reviews)</span>
          </div>

          {/* Recent Review Quote */}
          {recentReview && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                &ldquo;{recentReview.text}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-400">— {recentReview.author}</p>
            </div>
          )}

          {/* Quick Info Row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
                {distance && ` • ${distance.toFixed(1)} mi`}
              </span>
            )}
            {yearsExperience && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {yearsExperience}+ years
              </span>
            )}
            {responseTime && (
              <span className="flex items-center gap-1 text-green-600">
                <Clock className="h-3.5 w-3.5" />
                Responds {responseTime}
              </span>
            )}
          </div>

          {/* Featured Work Gallery */}
          {portfolioImages.length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <ImageIcon className="h-3.5 w-3.5" />
                Featured Work
              </h4>
              <div className="flex gap-2">
                {portfolioImages.slice(0, 3).map((img, i) => (
                  <div
                    key={i}
                    className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-100"
                  >
                    <Image src={img} alt={`Work sample ${i + 1}`} fill className="object-cover" />
                  </div>
                ))}
                {portfolioImages.length > 3 && (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-500">
                    +{portfolioImages.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Website Preview */}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <ExternalLink className="h-5 w-5 text-slate-500" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {website.replace(/^https?:\/\//, "").split("/")[0]}
                </p>
                <p className="text-xs text-slate-500">View website</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {isConnected ? (
              <Button variant="outline" className="flex-1" disabled>
                <Check className="mr-2 h-4 w-4" />
                Connected
              </Button>
            ) : isPending ? (
              <Button variant="outline" className="flex-1" disabled>
                <Clock className="mr-2 h-4 w-4" />
                Pending
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Connect
              </Button>
            )}
            <Link href={`/portal/profiles/${id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                View Profile
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Contact Quick Actions */}
          {phone && (
            <div className="flex justify-center gap-4 border-t pt-3 dark:border-slate-700">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
              <Link
                href={`/portal/messages?proId=${id}`}
                className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Link>
              <Link
                href={`/portal/jobs/new?proId=${id}`}
                className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600"
              >
                <Calendar className="h-4 w-4" />
                Request Quote
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

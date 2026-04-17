"use client";

import { Check, Copy, Gift, Share2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  pendingRewards: number;
  earnedRewards: number;
  referralLink: string;
}

interface ReferralProgramProps {
  stats: ReferralStats;
  className?: string;
}

export function ReferralProgram({ stats, className }: ReferralProgramProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on SkaiScraper",
          text: "Get $50 off your first month when you sign up with my referral link!",
          url: stats.referralLink,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      void handleCopy();
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Hero Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#117CFF] via-[#0066DD] to-[#004AAD] p-6 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Refer a Neighbor</h3>
            <p className="text-sm text-white/80">Earn $50 for every referral</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-white/90">
          Know another homeowner dealing with storm damage? Share your referral link and you&apos;ll
          both get $50 off when they file a claim!
        </p>

        {/* Referral Link */}
        <div className="mb-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
          <p className="mb-2 text-xs text-white/60">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stats.referralLink}
              readOnly
              className="flex-1 truncate bg-transparent font-mono text-sm outline-none"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopy}
              className="shrink-0 border-0 bg-white/20 text-white hover:bg-white/30"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-white text-[#117CFF] hover:bg-white/90"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-[#117CFF]" />
          <p className="text-2xl font-bold">{stats.totalReferrals}</p>
          <p className="text-xs text-muted-foreground">Referrals</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Gift className="mx-auto mb-2 h-5 w-5 text-amber-500" />
          <p className="text-2xl font-bold">${stats.pendingRewards}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Check className="mx-auto mb-2 h-5 w-5 text-green-500" />
          <p className="text-2xl font-bold">${stats.earnedRewards}</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="rounded-xl border bg-card p-6">
        <h4 className="mb-4 font-semibold">How It Works</h4>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#117CFF]/10 text-xs font-bold text-[#117CFF]">
              1
            </div>
            <div>
              <p className="text-sm font-medium">Share your link</p>
              <p className="text-xs text-muted-foreground">
                Send your unique referral link to neighbors, friends, or family
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#117CFF]/10 text-xs font-bold text-[#117CFF]">
              2
            </div>
            <div>
              <p className="text-sm font-medium">They file a claim</p>
              <p className="text-xs text-muted-foreground">
                When they sign up and submit their first claim, you both qualify
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#117CFF]/10 text-xs font-bold text-[#117CFF]">
              3
            </div>
            <div>
              <p className="text-sm font-medium">You both get $50</p>
              <p className="text-xs text-muted-foreground">
                Credits applied automatically — no forms or waiting
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code Display */}
      <div className="rounded-xl bg-muted/50 p-4 text-center">
        <p className="mb-1 text-xs text-muted-foreground">Your Referral Code</p>
        <p className="font-mono text-2xl font-bold tracking-wider">{stats.referralCode}</p>
      </div>
    </div>
  );
}

// Default props for demo/empty state
export function ReferralProgramEmpty({ className }: { className?: string }) {
  const defaultStats: ReferralStats = {
    referralCode: "NEIGHBOR50",
    totalReferrals: 0,
    pendingRewards: 0,
    earnedRewards: 0,
    referralLink: "https://portal.skaiscrape.com/r/NEIGHBOR50",
  };

  return <ReferralProgram stats={defaultStats} className={className} />;
}

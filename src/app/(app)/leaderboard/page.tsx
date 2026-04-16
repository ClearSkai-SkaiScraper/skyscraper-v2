import { Trophy } from "lucide-react";
import type { Metadata } from "next";

import { CompanyLeaderboard } from "@/components/dashboard/CompanyLeaderboard";
import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getOrgContext } from "@/lib/org/getOrgContext";
import { GoalProgressBar } from "./_components/GoalProgressBar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Leaderboard & Goal Tracking | SkaiScraper",
  description:
    "Team performance leaderboard with goal tracking — revenue, claims, door knocking, and rep rankings.",
};

/**
 * /leaderboard — Leaderboard & Goal Tracking
 * DB-backed goal progress + full leaderboard component with filtering.
 * Goals are org-scoped (Prisma org_goals model), door knocks are real canvass_pins.
 */
export default async function LeaderboardAnalyticsPage() {
  const ctx = await getOrgContext();
  if (!ctx.orgId) return <NoOrgMembershipBanner title="Leaderboard & Goal Tracking" />;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="settings"
        title="Leaderboard & Goal Tracking"
        subtitle="Track team revenue, signed claims, door knocking activity, and hit your goals"
        icon={<Trophy className="h-5 w-5" />}
      />

      {/* Full Leaderboard Component with all tabs, filtering, and analytics */}
      <CompanyLeaderboard />

      {/* Goal Progress Bars — DB-backed (org_goals) with inline editing + presets */}
      <div className="mt-6">
        <GoalProgressBar />
      </div>
    </PageContainer>
  );
}

import { Trophy } from "lucide-react";
import type { Metadata } from "next";

import { CompanyLeaderboard } from "@/components/dashboard/CompanyLeaderboard";
import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getOrgContext } from "@/lib/org/getOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Team Analytics & Leaderboard | SkaiScraper",
  description: "Team performance analytics — revenue, claims, close rates, and rep rankings.",
};

/**
 * /leaderboard — Full-page Team Analytics & Leaderboard
 * Shows team KPIs + full leaderboard component with filtering.
 */
export default async function LeaderboardAnalyticsPage() {
  const ctx = await getOrgContext();
  if (!ctx.orgId) return <NoOrgMembershipBanner title="Team Leaderboard" />;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="command"
        title="Team Analytics & Leaderboard"
        subtitle="Track revenue, signed claims, and rep performance across your entire team"
        icon={<Trophy className="h-5 w-5" />}
      />

      {/* Full Leaderboard Component with all tabs, filtering, and analytics */}
      <CompanyLeaderboard />
    </PageContainer>
  );
}

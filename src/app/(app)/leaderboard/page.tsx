import { redirect } from "next/navigation";

import { CompanyLeaderboard } from "@/components/dashboard/CompanyLeaderboard";
import { getOrgContext } from "@/lib/org/getOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Leaderboard | SkaiScrape",
  description: "Team performance rankings — revenue, claims signed, and lead sources.",
};

/**
 * /leaderboard — Full-page leaderboard view
 * Wraps the existing CompanyLeaderboard component in a dedicated page.
 */
export default async function LeaderboardPage() {
  const ctx = await getOrgContext();
  if (!ctx.orgId) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Leaderboard</h1>
          <p className="mt-1 text-muted-foreground">
            Track revenue, signed claims, and rep performance across your entire team.
          </p>
        </div>
      </div>

      {/* Leaderboard Component */}
      <CompanyLeaderboard />
    </div>
  );
}

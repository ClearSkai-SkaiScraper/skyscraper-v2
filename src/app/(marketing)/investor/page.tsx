import { auth } from "@clerk/nextjs/server";
import { BarChart3, Clock, DollarSign, TrendingUp, Users, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Investor Traction Dashboard
 * SECURITY: Requires authentication to view real metrics
 */

/* InvestorPage merged into InvestorDashboard below (single default export) */

async function getMetrics() {
  try {
    const [totalClaims, totalOrgs, totalReports, totalActivities] = await Promise.all([
      prisma.claims.count(),
      prisma.org.count(),
      prisma.claim_builders.count(),
      prisma.claim_activities.count(),
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentClaims = await prisma.claims.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Get AI usage
    const aiReportsLast30 = await prisma.claim_builders.count({
      where: { updatedAt: { gte: thirtyDaysAgo } },
    });

    return {
      totalClaims,
      totalOrgs,
      totalReports,
      totalActivities,
      recentClaims,
      aiReportsLast30,
      conversionRate: totalOrgs > 0 ? ((totalClaims / totalOrgs) * 100).toFixed(1) : "0",
      avgClaimsPerOrg: totalOrgs > 0 ? (totalClaims / totalOrgs).toFixed(1) : "0",
    };
  } catch (error) {
    logger.error("Investor metrics error:", error);
    return {
      totalClaims: 0,
      totalOrgs: 0,
      totalReports: 0,
      totalActivities: 0,
      recentClaims: 0,
      aiReportsLast30: 0,
      conversionRate: "0",
      avgClaimsPerOrg: "0",
    };
  }
}

async function MetricsDisplay() {
  const metrics = await getMetrics();

  const cards = [
    {
      title: "Total Claims",
      value: metrics.totalClaims,
      icon: BarChart3,
      description: "Lifetime claims processed",
      color: "from-blue-600 to-cyan-500",
    },
    {
      title: "Active Contractors",
      value: metrics.totalOrgs,
      icon: Users,
      description: "Organizations on platform",
      color: "from-purple-600 to-pink-500",
    },
    {
      title: "AI Reports Generated",
      value: metrics.totalReports,
      icon: Zap,
      description: "Total AI-powered reports",
      color: "from-orange-600 to-yellow-500",
    },
    {
      title: "Recent Claims (30d)",
      value: metrics.recentClaims,
      icon: TrendingUp,
      description: "Claims in last 30 days",
      color: "from-green-600 to-emerald-500",
    },
    {
      title: "AI Reports (30d)",
      value: metrics.aiReportsLast30,
      icon: Zap,
      description: "AI generation last 30 days",
      color: "from-indigo-600 to-blue-500",
    },
    {
      title: "Avg Claims/Contractor",
      value: metrics.avgClaimsPerOrg,
      icon: DollarSign,
      description: "Platform engagement rate",
      color: "from-pink-600 to-rose-500",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl transition-all hover:bg-white/[0.08]"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className={`rounded-xl bg-gradient-to-br p-3 ${card.color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/60">{card.title}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
            </div>
            <p className="text-sm text-white/50">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
}

export default async function InvestorDashboard() {
  // SECURITY: Require auth to view production metrics
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="mx-auto max-w-7xl space-y-12 px-8 py-16">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300">
            <Clock className="h-4 w-4" />
            Live Metrics
          </div>
          <h1 className="text-5xl font-bold text-white">SkaiScraper Traction Dashboard</h1>
          <p className="mx-auto max-w-2xl text-xl text-white/70">
            Real-time platform metrics for investors. Data updates every page load.
          </p>
        </div>

        {/* Metrics Grid */}
        <Suspense
          fallback={
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          }
        >
          <MetricsDisplay />
        </Suspense>

        {/* Growth Indicators */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <h2 className="mb-6 text-2xl font-bold text-white">Key Performance Indicators</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="mb-2 text-sm text-white/60">Platform Status</p>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
                <p className="text-lg font-semibold text-white">Operational</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/60">Target Market</p>
              <p className="text-lg font-semibold text-white">$50.2B TAM</p>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/60">Growth Stage</p>
              <p className="text-lg font-semibold text-white">Seed → Series A</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-white/50">
          <p>Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-2">Phase Ω — Production Ready</p>
        </div>
      </div>
    </div>
  );
}

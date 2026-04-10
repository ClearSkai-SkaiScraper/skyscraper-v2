import { LayoutDashboard, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AIJobScanner } from "@/components/ai/AIJobScanner";
import { AsyncBoundary } from "@/components/AsyncBoundary";
// UpgradeCTA removed — replaced with CompanyBrandingPreview
import { CompanyLeaderboard } from "@/components/dashboard/CompanyLeaderboard";
import { WeatherSummaryCard } from "@/components/dashboard/WeatherSummaryCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getUserIdentity } from "@/lib/identity";
import { logger } from "@/lib/logger";
import { getOrgLocation } from "@/lib/org/getOrgLocation";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { getDashboardWeather } from "@/lib/weather/weatherstack";

import CompanyBrandingPreview from "./_components/CompanyBrandingPreview";
import NetworkActivity from "./_components/NetworkActivity";
import StatsCards from "./_components/StatsCards";
import WeatherKPICards from "./_components/WeatherKPICards";
import WorkOpportunityNotifications from "./_components/WorkOpportunityNotifications";
// DashboardAssistantDock temporarily disabled
// const DashboardAssistantDock = nextDynamic(() => import("./_components/DashboardAssistantDock"), {
//   ssr: false,
// });

export const metadata: Metadata = {
  title: "Dashboard | SkaiScraper",
  description: "Your SkaiScraper command center — claims, projects, and team management.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  try {
    // SINGLE SOURCE OF TRUTH: Use safeOrgContext() for ALL auth checks
    // This replaces the broken safe(() => currentUser()) pattern
    const orgCtx = await safeOrgContext();

    // Check authentication status
    if (orgCtx.status === "unauthenticated") {
      return (
        <div className="container mx-auto px-6 py-12">
          <div className="mx-auto max-w-2xl rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow">
            <h1 className="mb-2 text-2xl font-bold">Sign In Required</h1>
            <p className="mb-4 text-sm text-[color:var(--muted)]">
              Please sign in to view your dashboard.
            </p>
            <Link
              href="/sign-in?redirect_url=/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-2 transition-colors hover:bg-[var(--surface-1)]"
            >
              <Lock className="h-4 w-4" /> Sign In →
            </Link>
          </div>
        </div>
      );
    }

    // Org context resolved successfully
    const orgId = orgCtx.orgId;
    const userId = orgCtx.userId;

    // =========================================================================
    // 🔐 IDENTITY-BASED ROUTING: Middleware handles this, but safety fallback
    // NOTE: Middleware reads userType from Clerk publicMetadata or x-user-type cookie
    // and redirects clients to /portal BEFORE this page loads. This is a fallback.
    // =========================================================================
    if (userId) {
      const identity = await getUserIdentity(userId);
      if (identity?.userType === "client") {
        logger.warn(
          "[DASHBOARD] Client user reached Pro dashboard - middleware should have caught this"
        );
        redirect("/portal");
      }
      // Unknown users (not yet registered) can stay - they'll see pro dashboard
      // and can use onboarding if needed
    }

    // If org resolution failed but user is authenticated, continue with
    // degraded dashboard instead of blocking the entire page.
    // Show a special banner if they have a pending invite (reason: "pending-invitation")
    if (!orgId) {
      logger.warn(
        "[DASHBOARD] Org resolution returned no orgId — rendering degraded dashboard:",
        orgCtx.status
      );

      // Special handling for users with pending invitations
      if (orgCtx.reason === "pending-invitation") {
        return (
          <PageContainer>
            <PageHero
              section="command"
              title="Welcome to SkaiScraper!"
              subtitle="You have a pending team invitation"
              icon={<LayoutDashboard className="h-6 w-6" />}
            />
            <div className="mx-auto mt-8 max-w-lg">
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/80 p-8 text-center shadow-sm dark:border-indigo-800 dark:bg-indigo-950/30">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                  <LayoutDashboard className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-indigo-900 dark:text-indigo-100">
                  Check Your Email!
                </h2>
                <p className="mb-4 text-indigo-800 dark:text-indigo-200">
                  Someone invited you to their team on SkaiScraper. Look for the invitation email
                  and click <strong>&quot;Accept Invitation&quot;</strong> to join.
                </p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Once you accept, you&apos;ll have full access to the team&apos;s dashboard,
                  claims, and tools.
                </p>
              </div>
            </div>
          </PageContainer>
        );
      }
    }

    // ⚠️ DEMO SEEDING REMOVED FROM RENDER PATH
    // Demo data is now seeded via:
    // - pnpm run seed:minimal-demo
    // - /api/dev/seed-demo endpoint
    // - ensureOrgForUser() on first login

    // SAFE: Weather data (non-critical) — location from org settings
    let location = {
      city: "",
      state: "",
      lat: 0,
      lng: 0,
      postalCode: "",
      source: "default",
    };
    try {
      if (orgId) location = await getOrgLocation(orgId);
    } catch (e) {
      logger.warn("[DASHBOARD] Location fetch failed (non-critical):", e);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let weather: any = null;
    try {
      const locationString = `${location.city}, ${location.state}`;

      weather = await getDashboardWeather(locationString);
    } catch (e) {
      logger.warn("[DASHBOARD] Weather fetch failed (non-critical):", e);
    }

    return (
      <PageContainer maxWidth="7xl">
        <PageHero
          section="command"
          title="Workspace Dashboard"
          subtitle="Quick view of your open claims, AI actions, and pipeline"
          icon={<LayoutDashboard className="h-5 w-5" />}
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/claims/new">New Claim</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/leads/new">New Lead</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/jobs/retail/new">New Job</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/tasks">Task Manager</Link>
              </Button>
            </div>
            {/* BuildStamp hidden for production - shows "build: no-sha" which confuses users */}
          </div>
        </PageHero>

        <div className="space-y-6">
          {/* Company Leaderboard — sales performance rankings (top priority) */}
          <CompanyLeaderboard />

          {/* KPI Cards — key metrics */}
          <AsyncBoundary
            fallback={
              <div className="animate-pulse rounded-2xl border border-slate-200/20 bg-white/60 p-8 backdrop-blur-xl dark:bg-slate-900/50">
                <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
              </div>
            }
          >
            <StatsCards />
          </AsyncBoundary>

          {/* Work Opportunities & Network Activity Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Network Activity */}
            <AsyncBoundary
              fallback={
                <div className="animate-pulse rounded-3xl border border-slate-200/20 bg-white/60 p-8 backdrop-blur-xl dark:bg-slate-900/50">
                  <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                </div>
              }
            >
              <NetworkActivity />
            </AsyncBoundary>

            {/* Work Opportunities Notifications */}
            <AsyncBoundary
              fallback={
                <div className="animate-pulse rounded-3xl border border-purple-200/20 bg-white/60 p-8 backdrop-blur-xl dark:bg-slate-900/50">
                  <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                </div>
              }
            >
              <WorkOpportunityNotifications />
            </AsyncBoundary>
          </div>

          {/* Live Weather Summary */}
          <div className="rounded-2xl border border-slate-200/20 bg-white/60 p-8 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:bg-slate-900/50">
            <WeatherSummaryCard weather={weather} />
          </div>

          {/* Weather Intelligence KPIs */}
          <AsyncBoundary
            fallback={
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
                ))}
              </div>
            }
          >
            <WeatherKPICards />
          </AsyncBoundary>

          {/* AI Recommendations — background intelligence */}
          <AIJobScanner />

          {/* Company Branding Quick Viewer */}
          <CompanyBrandingPreview />
        </div>
      </PageContainer>
    );
  } catch (error) {
    // CRITICAL: Re-throw NEXT_REDIRECT — Next.js uses thrown errors for navigation
    if (
      error?.digest?.startsWith?.("NEXT_REDIRECT") ||
      error?.digest?.startsWith?.("NEXT_NOT_FOUND")
    )
      throw error;
    logger.error("[DASHBOARD_FATAL]", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
        <div className="max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h1 className="text-2xl font-semibold">Dashboard is warming up</h1>
          <p className="text-sm text-slate-400">
            We hit an unexpected error while rendering the dashboard. Please refresh. If this
            persists, contact support.
          </p>
          <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-300">
            <div className="font-semibold">Error:</div>
            <div className="mt-1 break-all text-slate-200">{error?.message || "Unknown"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/dashboard">Retry</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/claims">Go to Claims</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

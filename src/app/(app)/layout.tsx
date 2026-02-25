import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import React, { Suspense } from "react";

// BetaModeBanner removed — plan info now in profile menu
import { BrandingBanner } from "@/components/dashboard/BrandingBanner";
import DebugStrip from "@/components/DebugStrip";
import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
import EmojiScrubber from "@/components/EmojiScrubber";
import { FeatureHelp } from "@/components/FeatureHelp";
import { CRMFooter } from "@/components/nav/CRMFooter";
import CRMTopbar from "@/components/nav/CRMTopbar";
import {
  RemoteViewBanner,
  RemoteViewBodyAttribute,
} from "@/components/remote-view/RemoteViewBanner";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { TaskButton } from "@/components/tasks/TaskButton";
import { TaskSlideOver } from "@/components/tasks/TaskSlideOver";
import { ToastProvider } from "@/components/ToastProvider";
import { PostHogPageview } from "@/lib/analytics.tsx";
import { getActiveOrgSafe } from "@/lib/auth/getActiveOrgSafe";
import { isBuildPhase } from "@/lib/buildPhase";
import { getPendingLegalForUser } from "@/lib/legal/getPendingLegal";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Replaced legacy UnifiedNavigation with new AppSidebar for consistent two-tone design
import { AppSidebar } from "./_components/AppSidebar";
import { AppProviders } from "./AppProviders";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-slate-100" />
        <p className="text-sm uppercase tracking-wide text-slate-400">Loading your workspace…</p>
      </div>
    </div>
  );
}

function FatalErrorScreen({ error }: { error?: any }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="max-w-md space-y-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-red-400">⚠️ Workspace Error</h1>
        <p className="text-sm text-slate-400">
          We couldn&apos;t load your workspace. This usually means your organization context needs
          to be repaired.
        </p>
        <div className="space-y-2 rounded-lg bg-slate-900 p-4 text-left font-mono text-xs">
          <div>
            <strong>Error:</strong> {error?.message || "Unknown error"}
          </div>
          <div>
            <strong>Time:</strong> {new Date().toISOString()}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <a href="/sign-out" className="block text-blue-400 underline hover:text-blue-300">
            Sign out and try again
          </a>
          <p className="text-xs text-slate-500">
            If this persists, contact support with the error details above.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  type PendingLegal = Awaited<ReturnType<typeof getPendingLegalForUser>>;

  let pendingLegal: PendingLegal = [];

  try {
    // =========================================================================
    // SINGLE SOURCE OF TRUTH: getActiveOrgSafe
    // - Finds existing org via user_organizations membership
    // - NEVER redirects (layout should never redirect - causes loops)
    // - Auto-creates org ONLY for authenticated users who don't have one yet
    // =========================================================================
    const orgResult = await getActiveOrgSafe({ allowAutoCreate: true });

    let orgId = "temp";
    let userId: string | null = null;

    if (orgResult.ok) {
      orgId = orgResult.org.id;
      userId = orgResult.userId;
    } else {
      // Not authenticated or error - that's fine, render with temp org
      // Individual pages will show sign-in prompts as needed
    }

    // Get current user for legal checks (only if we have a valid org)
    const user = orgResult.ok ? await currentUser() : null;

    // Check org branding completion
    let brandingCompleted = false;
    let onboardingCompleted = false;
    if (!isBuildPhase() && orgId !== "temp") {
      try {
        const branding = await prisma.org_branding.findFirst({
          where: { orgId },
          select: { companyName: true, email: true, colorPrimary: true },
        });
        brandingCompleted = !!(branding?.companyName && branding?.email && branding?.colorPrimary);
        onboardingCompleted = true; // Org exists = onboarding complete
      } catch (orgError) {
        logger.error("[LAYOUT_ORG_ERROR]", orgError?.message);
      }
    }

    // 🔥 LEGAL GATE: Check if user needs to accept any required legal documents
    try {
      if (user) {
        pendingLegal = await getPendingLegalForUser({
          userId: user.id,
          audience: "contractor", // Change to "homeowner" or dynamic based on user role
        });
      } else {
      }
    } catch (legalError) {
      logger.error("[LAYOUT] Failed to check legal compliance:", legalError);
      // Don't block - just log the error
    }

    return (
      <AppProviders orgId={orgId} pendingLegal={pendingLegal}>
        <ToastProvider />
        <CRMTopbar />
        {/* BetaModeBanner removed — Manage Plan now in profile menu */}
        <div className="flex min-h-[calc(100vh-4rem)] bg-background text-foreground">
          <Suspense fallback={<FullscreenLoader />}>
            <PostHogPageview />
            <DebugStrip />
            <EmojiScrubber />

            {/* Left Sidebar */}
            <AppSidebar />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col">
              <main id="main-content" className="flex-1 space-y-6 px-6 py-6 md:px-8 md:py-8">
                <BrandingBanner
                  brandingCompleted={brandingCompleted}
                  onboardingCompleted={onboardingCompleted}
                />
                {/* Demo Mode Banner */}
                {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
                  <div className="mb-6">
                    <DemoModeBanner variant="full" />
                  </div>
                )}
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              <CRMFooter />
            </div>
          </Suspense>
          <FeatureHelp />
          <RemoteViewBanner />
          <RemoteViewBodyAttribute />
          <TaskButton variant="floating" label="New Task" />
          <TaskSlideOver />
        </div>
      </AppProviders>
    );
  } catch (layoutError) {
    // Redirect passthrough
    if (layoutError?.message === "NEXT_REDIRECT" || layoutError?.stack?.includes("NEXT_REDIRECT")) {
      throw layoutError;
    }
    logger.error("🚨🚨🚨 CRITICAL: LAYOUT CRASHED 🚨🚨🚨", {
      message: layoutError?.message,
      name: layoutError?.name,
      code: layoutError?.code,
      stack: layoutError?.stack,
      timestamp: new Date().toISOString(),
    });

    // Return visible error screen instead of white screen
    return <FatalErrorScreen error={layoutError} />;
  }
}

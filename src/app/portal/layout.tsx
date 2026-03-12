import { auth, currentUser } from "@clerk/nextjs/server";
import { Home, Sparkles } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LegalGate } from "@/components/legal/LegalGate";
import NotificationBell from "@/components/notifications/UnifiedNotificationBell";
import { ClientPortalNav } from "@/components/portal/ClientPortalNav";
import ClientPortalUserMenu from "@/components/portal/ClientPortalUserMenu";
import { PortalErrorBoundary } from "@/components/portal/PortalErrorBoundary";
import ThemeToggle from "@/components/portal/ThemeToggle";
import { getBrandingForOrg } from "@/lib/branding/fetchBranding";
import { getPendingLegalForUser } from "@/lib/legal/getPendingLegal";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Portal Layout - Full-featured client portal shell
 *
 * This layout provides:
 * - Branded header with logo and navigation
 * - Legal gate for compliance checks
 * - Notification bell
 * - User menu
 * - Branded footer
 *
 * NOTE: Middleware handles cross-surface routing.
 * This layout assumes the user IS a client.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let userId: string | null = null;
  let user: any = null;
  let branding: any = null;
  let pendingLegal: any[] = [];

  try {
    const authResult = await auth();
    userId = authResult.userId;

    // Redirect unauthenticated users to client sign-in
    if (!userId) {
      redirect("/client/sign-in");
    }

    user = await currentUser();
    const role = user?.publicMetadata?.role as string | undefined;

    // If a pro user somehow hits this, send them back to dashboard
    // NOTE: Middleware should have already handled this - this is a safety fallback
    if (userId && role && role !== "client") {
      logger.warn("[Portal Layout] Pro user reached portal - middleware should have caught this");
      redirect("/dashboard");
    }

    // Fetch contractor branding for white-label experience
    // Resolve orgId from the client's linked contractor (ClientProConnection → tradesCompany)
    let orgId: string | undefined;
    if (userId) {
      try {
        const client = await prisma.client.findFirst({
          where: { userId },
          select: { id: true },
        });
        if (client) {
          const connection = await prisma.clientProConnection.findFirst({
            where: { clientId: client.id, status: "connected" },
            orderBy: { connectedAt: "desc" },
            select: { tradesCompany: { select: { orgId: true } } },
          });
          orgId = connection?.tradesCompany?.orgId ?? undefined;
        }
      } catch (orgError) {
        logger.error("[Portal Layout] Failed to resolve orgId from connection:", orgError);
      }
    }

    try {
      branding = orgId ? await getBrandingForOrg(orgId) : null;
    } catch (brandError) {
      logger.error("[Portal Layout] Branding fetch failed:", brandError);
      // Continue without branding
    }

    // 🔥 LEGAL GATE: Check if client needs to accept any required legal documents
    if (userId && user) {
      try {
        pendingLegal = await getPendingLegalForUser({
          userId: user.id,
          audience: "homeowner", // Clients only see client-relevant docs
        });
        logger.debug("[Portal Layout] Pending legal documents:", pendingLegal.length);
      } catch (legalError) {
        logger.error("[Portal Layout] Failed to check legal compliance:", legalError);
        // Don't block - just log the error
      }
    }
  } catch (authError) {
    // Re-throw Next.js redirect errors - they're not real errors!
    if (isRedirectError(authError)) {
      throw authError;
    }
    logger.error("[Portal Layout] Auth error:", authError);
    // Continue with null values - page will handle auth state
  }

  const companyName = branding?.companyName || "SkaiScraper";
  const logoUrl = branding?.logoUrl;

  return (
    <LegalGate initialPending={pendingLegal}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Modern Gradient Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl shadow-slate-900/10">
          <nav aria-label="Portal navigation" className="mx-auto max-w-[1400px] px-4 py-3">
            <div className="flex h-10 items-center justify-between gap-4">
              {/* Left: Logo flush-left + brand name */}
              <Link
                href="/portal"
                className="flex shrink-0 items-center gap-2.5 whitespace-nowrap transition-transform hover:scale-[1.02]"
              >
                {logoUrl ? (
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 p-1.5">
                    <Image
                      src={logoUrl}
                      alt={companyName}
                      width={120}
                      height={40}
                      className="h-8 w-auto object-contain brightness-0 invert"
                    />
                  </div>
                ) : (
                  <Image
                    src="/brand/client_portal_logo.jpg"
                    alt="SkaiScraper"
                    width={160}
                    height={48}
                    className="h-10 w-auto object-contain"
                    priority
                  />
                )}
                <span className="hidden text-lg font-bold tracking-tight text-white sm:inline">
                  {companyName}
                </span>
              </Link>

              {/* Center: Navigation */}
              <div className="hidden flex-1 justify-center md:flex">
                <ClientPortalNav />
              </div>
              {/* Right: Actions */}
              <div className="flex shrink-0 items-center gap-3">
                <ThemeToggle />
                {userId && <NotificationBell variant="client" autoMarkRead />}
                {userId ? (
                  <ClientPortalUserMenu />
                ) : (
                  <Link
                    href="/client/sign-in"
                    className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40"
                  >
                    <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </nav>
          {/* Mobile Portal Navigation */}
          <div className="border-b border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2 md:hidden">
            <ClientPortalNav />
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="mx-auto max-w-[1200px] px-6 py-8">
          <PortalErrorBoundary>{children}</PortalErrorBoundary>
        </main>

        {/* Modern Branded Footer */}
        <footer className="border-t border-slate-200/50 bg-gradient-to-b from-white to-slate-50 py-12 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="flex flex-col items-center gap-6">
              {/* Logo */}
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={companyName}
                    width={100}
                    height={32}
                    className="h-6 w-auto object-contain opacity-80"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Home className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {companyName}
                </span>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                {branding?.phone && (
                  <a
                    href={`tel:${branding.phone}`}
                    className="flex items-center gap-2 transition-colors hover:text-blue-600"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      📞
                    </span>
                    {branding.phone}
                  </a>
                )}
                {branding?.email && (
                  <a
                    href={`mailto:${branding.email}`}
                    className="flex items-center gap-2 transition-colors hover:text-blue-600"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      ✉️
                    </span>
                    {branding.email}
                  </a>
                )}
                {branding?.website && (
                  <a
                    href={branding.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition-colors hover:text-blue-600"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      🌐
                    </span>
                    Website
                  </a>
                )}
              </div>

              {/* Copyright */}
              <div className="mt-4 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  © {new Date().getFullYear()} {companyName}. All rights reserved.
                </p>
                <p className="mt-1 text-xs text-slate-400/70 dark:text-slate-600">
                  Powered by <span className="font-semibold text-blue-500">SkaiScraper</span>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </LegalGate>
  );
}

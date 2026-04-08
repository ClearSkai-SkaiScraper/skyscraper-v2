/**
 * 🏠 CLIENT PORTAL DASHBOARD
 *
 * The main dashboard for homeowner (client) accounts.
 * Shows onboarding wizard overlay for new users.
 *
 * NOTE: This page uses the standalone /portal layout which has
 * a client-only navigation (no Pro sidebar).
 *
 * ROUTING: Middleware handles cross-surface redirects.
 * If a Pro user lands here, middleware will redirect to /dashboard.
 * This page should NEVER redirect to Pro routes.
 */

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import {
  Briefcase,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Search,
  Shield,
  Star,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ClientPortalWrapper } from "@/components/onboarding/ClientPortalWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserIdentity } from "@/lib/identity";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { calculateClientStrength } from "@/lib/profile-strength";

export const metadata: Metadata = {
  title: "Client Portal | SkaiScrape",
  description: "Manage your home projects and find trusted contractors",
};

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const user = await currentUser();

  if (!user?.id) {
    redirect("/client/sign-in?redirect_url=/portal");
  }

  // NOTE: Cross-surface routing is handled EXCLUSIVELY by middleware.
  // Middleware reads x-user-type cookie (set by /after-sign-in) and routes accordingly.
  // DO NOT add redirect checks here - they cause infinite loops.
  // If middleware let the user through to /portal, they ARE a client.
  
  // The x-user-type cookie is the AUTHORITATIVE source of user type.
  // It's set during sign-in based on which portal (pro vs client) the user used.
  // If user signed in via /client/sign-in, they're a client, period.

  let identity = await getUserIdentity(user.id);
  let needsOnboarding = false;

  // Check Clerk metadata for user type hints (before auto-creating as client)
  const clerkUserType = user.publicMetadata?.userType as string | undefined;

  // If no identity exists, auto-create client registry entry.
  // The user already landed on /portal, so they ARE a client.
  // The legacy /onboarding/select-type split page is no longer used —
  // pros join via /trades/join invite links instead.
  if (!identity) {
    // Check if there's a user_registry entry already (might be in progress)
    const existingRegistry = await prisma.user_registry.findUnique({
      where: { clerkUserId: user.id },
      select: { userType: true },
    });

    // NOTE: Even if existingRegistry.userType is "pro", we don't redirect.
    // Middleware already validated the user type via x-user-type cookie.
    // If they're here, trust the cookie.

    // Auto-create client entry for any user who reaches /portal
    if (!existingRegistry) {
      const email = user.emailAddresses?.[0]?.emailAddress || "";
      const displayName =
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || email.split("@")[0];

      try {
        await prisma.user_registry.create({
          data: {
            clerkUserId: user.id,
            userType: "client",
            displayName,
            primaryEmail: email,
            onboardingComplete: false,
          },
        });
        identity = await getUserIdentity(user.id);
        needsOnboarding = true;

        // Sync userType to Clerk publicMetadata for middleware routing
        try {
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(user.id, {
            publicMetadata: {
              userType: "client",
              onboardingComplete: false,
            },
          });
        } catch (syncError) {
          logger.error("[PORTAL] Failed to sync to Clerk:", syncError);
          // Non-fatal - cookie fallback will work
        }
      } catch (e) {
        // May already exist, try to fetch again
        identity = await getUserIdentity(user.id);
      }
    } else {
      identity = await getUserIdentity(user.id);
    }
  }

  // Check if onboarding is complete
  if (identity && !identity.onboardingComplete) {
    needsOnboarding = true;
  }

  let client:
    | Awaited<ReturnType<typeof prisma.client.findUnique>>
    | Awaited<ReturnType<typeof prisma.clients.findUnique>>
    | null = null;
  let projectCount = 0;
  let recentProjects: any[] = [];
  let messageCount = 0;
  let bidCount = 0;
  let claimsCount = 0;
  let activeClaims: any[] = [];
  let localContractors: any[] = [];

  // Prefer userId lookup on unified Client model
  try {
    client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    // Fallback to legacy clients table if not found
    if (!client && identity?.clientProfileId) {
      client = await prisma.clients.findUnique({
        where: { id: identity.clientProfileId },
      });
    }
  } catch (clientError) {
    logger.error("[PORTAL] Error fetching client:", clientError);
    // Continue without client - page will show empty state
  }

  try {
    const userEmail = user.emailAddresses?.[0]?.emailAddress;
    if (userEmail) {
      // Build OR conditions for all access paths
      const orConditions: any[] = [{ homeownerEmail: userEmail }];

      // Also check clientId using the Client record (not just identity.clientProfileId)
      if (client && "id" in client) {
        orConditions.push({ clientId: (client as { id: string }).id });
      }
      if (identity?.clientProfileId) {
        orConditions.push({ clientId: identity.clientProfileId });
      }

      activeClaims = await prisma.claims.findMany({
        where: {
          OR: orConditions,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          claimNumber: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          properties: {
            select: {
              street: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
        },
      });
      claimsCount = activeClaims.length;
    }
  } catch (e) {
    logger.error("[PORTAL] Error fetching claims:", e);
  }

  // ── Real counts for portal stats ──────────────────────────────────
  try {
    if (client && "id" in client) {
      const clientId = (client as { id: string }).id;
      const [workRequests, threads, connections] = await Promise.all([
        prisma.clientWorkRequest.count({ where: { clientId } }).catch(() => 0),
        prisma.messageThread
          .count({
            where: { participants: { has: user.id } },
          })
          .catch(() => 0),
        prisma.clientProConnection
          .count({
            where: { clientId, status: "pending" },
          })
          .catch(() => 0),
      ]);
      projectCount = workRequests;
      messageCount = threads;
      bidCount = connections;

      // Fetch recent work requests for the "My Projects" card
      if (workRequests > 0) {
        recentProjects = await prisma.clientWorkRequest
          .findMany({
            where: { clientId },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              propertyAddress: true,
              createdAt: true,
            },
          })
          .catch(() => []);
      }
    }
  } catch (e) {
    logger.error("[PORTAL] Error fetching portal stats:", e);
  }

  // Fetch real local contractors from the DB
  try {
    const clientCity = client && "city" in client ? (client as { city: string | null }).city : null;
    const clientState =
      client && "state" in client ? (client as { state: string | null }).state : null;

    // Try to find contractors near the client, fall back to any active contractors
    const whereClause: any = { isActive: true };
    if (clientState) whereClause.state = clientState;

    localContractors = await prisma.tradesCompany.findMany({
      where: whereClause,
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        rating: true,
        reviewCount: true,
        specialties: true,
        logo: true,
        isVerified: true,
      },
    });

    // If no state-filtered results, fetch any active contractors
    if (localContractors.length === 0 && clientState) {
      localContractors = await prisma.tradesCompany.findMany({
        where: { isActive: true },
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          rating: true,
          reviewCount: true,
          specialties: true,
          logo: true,
          isVerified: true,
        },
      });
    }
  } catch (e) {
    logger.error("[PORTAL] Error fetching local contractors:", e);
  }

  const displayName = identity?.displayName || client?.firstName || "Homeowner";

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Calculate profile completion using the single source of truth
  // Fall back to Clerk data for fields the user hasn't saved to the DB yet
  const clientData = client as any;
  const { percent: profileCompletion, missing: profileMissing } = calculateClientStrength({
    firstName: clientData?.firstName || user.firstName,
    lastName: clientData?.lastName || user.lastName,
    phone: clientData?.phone,
    address: clientData?.address,
    city: clientData?.city,
    state: clientData?.state,
    zip: clientData?.postal,
    bio: clientData?.bio,
    avatarUrl: clientData?.avatarUrl || user.imageUrl,
    propertyPhotoUrl: clientData?.propertyPhotoUrl,
  });

  // Count total connections
  let connectionCount = 0;
  try {
    if (client && "id" in client) {
      connectionCount = await prisma.clientProConnection
        .count({
          where: {
            clientId: (client as { id: string }).id,
            status: { in: ["connected", "accepted"] },
          },
        })
        .catch(() => 0);
    }
  } catch (e) {
    // non-fatal
  }

  return (
    <ClientPortalWrapper needsOnboarding={needsOnboarding}>
      <div className="min-h-screen">
        {/* ── Hero Welcome Banner ── */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl md:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10">
            <p className="mb-1 text-emerald-100">{greeting},</p>
            <h1 className="text-3xl font-bold md:text-4xl">{displayName} 👋</h1>
            <p className="mt-2 max-w-xl text-emerald-100/90">
              Your home management command center — track projects, connect with pros, and stay on
              top of everything.
            </p>
          </div>
          <div className="relative z-10 mt-6 flex flex-wrap gap-3">
            <Link
              href="/portal/projects/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              Post a Project
            </Link>
            <Link
              href="/portal/find-a-pro"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <Search className="h-4 w-4" />
              Find a Pro
            </Link>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/portal/my-jobs" className="group">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-lg dark:from-emerald-950/40 dark:to-emerald-900/20">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 translate-y-[-6px] rounded-full bg-emerald-200/50 dark:bg-emerald-800/30" />
              <CardContent className="relative flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {projectCount}
                  </p>
                  <p className="text-sm font-medium text-emerald-600/70 dark:text-emerald-500/70">
                    Active Projects
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/contractors" className="group">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-lg dark:from-blue-950/40 dark:to-blue-900/20">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 translate-y-[-6px] rounded-full bg-blue-200/50 dark:bg-blue-800/30" />
              <CardContent className="relative flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                    {connectionCount}
                  </p>
                  <p className="text-sm font-medium text-blue-600/70 dark:text-blue-500/70">
                    Connected Pros
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/messages" className="group">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-lg dark:from-purple-950/40 dark:to-purple-900/20">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 translate-y-[-6px] rounded-full bg-purple-200/50 dark:bg-purple-800/30" />
              <CardContent className="relative flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                    {messageCount}
                  </p>
                  <p className="text-sm font-medium text-purple-600/70 dark:text-purple-500/70">
                    Messages
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/claims" className="group">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-lg dark:from-amber-950/40 dark:to-amber-900/20">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 translate-y-[-6px] rounded-full bg-amber-200/50 dark:bg-amber-800/30" />
              <CardContent className="relative flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                    {claimsCount}
                  </p>
                  <p className="text-sm font-medium text-amber-600/70 dark:text-amber-500/70">
                    Active Claims
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ── Profile Completion + Quick Actions Row ── */}
        <div className="mb-8 grid gap-6 lg:grid-cols-5">
          {/* Profile Completion */}
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-white shadow-md dark:from-slate-900 dark:to-slate-800 lg:col-span-2">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                  Profile Strength
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    profileCompletion >= 80
                      ? "bg-emerald-100 text-emerald-700"
                      : profileCompletion >= 50
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {profileCompletion}%
                </span>
              </div>
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all ${
                    profileCompletion >= 80
                      ? "bg-gradient-to-r from-emerald-500 to-green-500"
                      : profileCompletion >= 50
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                        : "bg-gradient-to-r from-red-500 to-orange-500"
                  }`}
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <p className="mb-4 text-sm text-slate-500">
                {profileCompletion >= 80
                  ? "Your profile looks great! 🎉"
                  : profileMissing.length > 0
                    ? `Add: ${profileMissing.slice(0, 3).join(", ")}${profileMissing.length > 3 ? " +" + (profileMissing.length - 3) + " more" : ""}`
                    : "Complete your profile to attract more pros."}
              </p>
              <Link
                href="/portal/profile"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Star className="h-4 w-4" />
                {profileCompletion >= 80 ? "View Profile" : "Complete Profile"}
              </Link>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
            <Link href="/portal/projects/new" className="group">
              <Card className="h-full border-0 bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-500/20 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                  <div className="mb-3 rounded-2xl bg-white/20 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
                    <Plus className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold">Post a Project</h3>
                  <p className="mt-1 text-xs text-emerald-100">Get bids from pros</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/portal/contractors" className="group">
              <Card className="h-full border-0 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                  <div className="mb-3 rounded-2xl bg-white/20 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
                    <Search className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold">Find Contractors</h3>
                  <p className="mt-1 text-xs text-blue-100">Browse verified pros</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/portal/messages" className="group">
              <Card className="h-full border-0 bg-gradient-to-br from-purple-500 to-violet-600 shadow-md shadow-purple-500/20 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                  <div className="mb-3 rounded-2xl bg-white/20 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold">Messages</h3>
                  <p className="mt-1 text-xs text-purple-100">
                    {messageCount > 0 ? `${messageCount} conversations` : "Stay connected"}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/portal/claims" className="group">
              <Card className="h-full border-0 bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                  <div className="mb-3 rounded-2xl bg-white/20 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
                    <Shield className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold">Track Claims</h3>
                  <p className="mt-1 text-xs text-amber-100">View claim progress</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* My Claims */}
          <Card className="border-0 shadow-md lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-amber-50/50 to-transparent pb-4 dark:from-amber-950/20">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-1.5 dark:bg-amber-900/50">
                    <Shield className="h-4 w-4 text-amber-600" />
                  </div>
                  My Claims
                </CardTitle>
                <CardDescription>Track your insurance claims progress</CardDescription>
              </div>
              <Link
                href="/portal/claims"
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50"
              >
                View All →
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {activeClaims.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Shield className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">
                    No active claims
                  </h3>
                  <p className="text-sm text-slate-500">
                    Claims will appear here when a contractor links you to a project
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeClaims.map((claim) => (
                    <Link
                      key={claim.id}
                      href={`/portal/claims/${claim.id}`}
                      className="group flex items-center justify-between rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-sm dark:hover:bg-amber-950/20"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                            claim.status === "completed"
                              ? "bg-gradient-to-br from-green-100 to-emerald-100 text-green-600"
                              : claim.status === "in_progress"
                                ? "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600"
                                : "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600"
                          }`}
                        >
                          {claim.status === "completed" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : claim.status === "in_progress" ? (
                            <Clock className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {claim.claimNumber || `Claim #${claim.id.slice(0, 8)}`}
                          </p>
                          <p className="text-sm text-slate-500">
                            {claim.properties?.street
                              ? `${claim.properties.street}, ${claim.properties.city || ""}`
                              : "Address pending"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          claim.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : claim.status === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {claim.status?.replace(/_/g, " ") || "Pending"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Projects */}
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-emerald-50/50 to-transparent pb-4 dark:from-emerald-950/20">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 p-1.5 dark:bg-emerald-900/50">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                  </div>
                  My Projects
                </CardTitle>
                <CardDescription>Active project requests</CardDescription>
              </div>
              <Link
                href="/portal/my-jobs"
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50"
              >
                View All →
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {projectCount === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Briefcase className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    No projects yet
                  </h3>
                  <p className="mb-4 text-xs text-slate-500">Post a project to receive bids</p>
                  <Link
                    href="/portal/projects/new"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition-all hover:shadow-lg"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Post Project
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((proj: any) => (
                    <Link
                      key={proj.id}
                      href="/portal/my-jobs"
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <Briefcase className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {proj.title || proj.category || "Work Request"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {proj.propertyAddress || "No address"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          proj.status === "accepted"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : proj.status === "declined"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {proj.status || "pending"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Local Contractors ── */}
        <Card className="mt-6 border-0 shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="rounded-lg bg-green-100 p-1.5 dark:bg-green-900/50">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  Local Contractors
                </CardTitle>
                <CardDescription>Highly rated pros in your area</CardDescription>
              </div>
              <Link
                href="/portal/contractors"
                className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50"
              >
                Browse All →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {localContractors.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {localContractors.map((contractor) => (
                  <Link
                    key={contractor.id}
                    href={`/portal/profiles/${contractor.slug || contractor.id}`}
                    className="group"
                  >
                    <div className="rounded-xl border p-4 transition-all group-hover:-translate-y-1 group-hover:border-green-200 group-hover:shadow-md">
                      <div className="mb-3 flex items-center gap-3">
                        {contractor.logo ? (
                          <Image
                            src={contractor.logo}
                            alt={contractor.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-sm">
                            {contractor.name?.[0] || "C"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {contractor.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium text-amber-600">
                              {contractor.rating ? Number(contractor.rating).toFixed(1) : "New"}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({contractor.reviewCount || 0})
                            </span>
                          </div>
                        </div>
                        {contractor.isVerified && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-blue-500" />
                        )}
                      </div>
                      {contractor.specialties?.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {contractor.specialties.slice(0, 2).map((s: string) => (
                            <span
                              key={s}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {contractor.city && (
                        <p className="text-xs text-slate-500">
                          📍 {contractor.city}, {contractor.state}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-700 dark:text-slate-300">
                  No contractors yet
                </h3>
                <p className="text-sm text-slate-500">
                  Contractors will appear here as they join your area
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientPortalWrapper>
  );
}

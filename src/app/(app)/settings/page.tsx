// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import {
  Archive,
  ArrowRight,
  Calendar,
  Database,
  FileText,
  Mail,
  Settings as SettingsIcon,
  Shield,
  Upload,
  User,
  Users,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { DemoModeToggle } from "@/components/settings/DemoModeToggle";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { panelGhost, textMuted } from "@/lib/theme";
import { isDemoWorkspaceReady } from "@/lib/workspace/demoWorkspaceReady";

import { SettingsForm } from "./_components/SettingsForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Settings | SkaiScraper",
  description: "Configure your workspace, profile, and notification preferences.",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MembershipMissing() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow">
        <h1 className="mb-3 text-2xl font-bold">Initialize Organization Settings</h1>
        <p className="mb-6 text-sm text-slate-700 dark:text-slate-300">
          No organization membership detected. Complete onboarding to access settings and
          configuration options.
        </p>
        <div className="flex gap-3">
          <Link
            href="/onboarding/start"
            className="rounded bg-[var(--primary)] px-5 py-2 font-medium text-white"
          >
            🚀 Start Onboarding
          </Link>
          <Link href="/dashboard" className="rounded border border-[color:var(--border)] px-5 py-2">
            ← Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
function ErrorCard({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-12">
      <div className="rounded-xl border border-red-500/40 bg-red-50 p-8 shadow dark:bg-red-950">
        <h1 className="mb-3 text-2xl font-bold text-red-700 dark:text-red-200">
          ⚠️ Settings Unavailable
        </h1>
        <p className="mb-6 text-sm text-red-600 dark:text-red-300">{message}</p>
        <div className="flex gap-3">
          <Link href="/dashboard" className="rounded border border-[color:var(--border)] px-5 py-2">
            ← Dashboard
          </Link>
          <Link
            href="/onboarding/start"
            className="rounded bg-[var(--primary)] px-5 py-2 font-medium text-white"
          >
            Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function Settings() {
  const orgCtx = await safeOrgContext();
  const organizationId = orgCtx.orgId || null;
  const userId = orgCtx.userId;
  const userRole = orgCtx.role; // "owner" | "admin" | "member"
  const isAdmin = userRole === "owner" || userRole === "admin" || userRole === "ADMIN";

  // Demo mode: allow access if org exists
  const demoReady = isDemoWorkspaceReady({ hasOrganization: !!organizationId });

  // RBAC Gate: Only admins/owners can access settings
  if (!isAdmin) {
    return (
      <PageContainer maxWidth="5xl">
        <PageHero
          section="settings"
          title="Settings"
          subtitle="Organization configuration"
          icon={<SettingsIcon className="h-5 w-5" />}
        />
        <div className="mx-auto max-w-xl rounded-xl border border-amber-500/40 bg-amber-50 p-8 shadow dark:bg-amber-950">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-amber-700 dark:text-amber-200">
            <Shield className="h-5 w-5" /> Admin Access Required
          </h2>
          <p className="text-sm text-amber-600 dark:text-amber-300">
            Settings can only be managed by organization admins and owners. Contact your admin if
            you need changes.
          </p>
          <div className="mt-4">
            <Link href="/dashboard">
              <button className="rounded border border-[color:var(--border)] px-5 py-2 text-sm">
                ← Dashboard
              </button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (orgCtx.status === "unauthenticated") {
    // Don't redirect to /sign-in — middleware already protects this route.
    // If safeOrgContext returns "unauthenticated" despite middleware passing,
    // it's a transient auth issue. Show an error card instead of redirect-looping.
    return (
      <ErrorCard message="Authentication context unavailable. Please refresh the page or sign out and back in." />
    );
  }
  // In demo mode, bypass org context errors
  if (orgCtx.status === "error" && !demoReady) {
    return <ErrorCard message="Organization context unavailable." />;
  }

  // Fetch demo mode status if we have an org
  let orgDemo: { demoMode: boolean | null; demoSeededAt: Date | null } | null = null;
  if (organizationId) {
    try {
      orgDemo = await prisma.org.findUnique({
        where: { id: organizationId },
        select: { demoMode: true, demoSeededAt: true },
      });
    } catch (error) {
      logger.error("[SettingsPage] Failed to fetch org demo status:", error);
    }
  }

  // Fetch Clerk user info for the account card
  const clerkUser = await currentUser();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "—";
  const userPhone = clerkUser?.phoneNumbers?.[0]?.phoneNumber ?? null;
  const userAvatar = clerkUser?.imageUrl ?? null;

  // Fetch org name for the settings form
  let orgName = "";
  if (organizationId) {
    try {
      const orgData = await prisma.org.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });
      orgName = orgData?.name ?? "";
    } catch (error) {
      logger.error("[SettingsPage] Failed to fetch org name:", error);
    }
  }
  const userFullName =
    `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || "User";
  const userCreated = clerkUser?.createdAt
    ? new Date(clerkUser.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="settings"
        title="Settings"
        subtitle="Configure account, organization, and system preferences"
        icon={<SettingsIcon className="h-5 w-5" />}
      />

      <div className="grid gap-6">
        {/* ─── Clerk Account Info ─── */}
        <PageSectionCard title="Your Account">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userFullName}
                  className="h-20 w-20 rounded-2xl border-2 border-slate-200 object-cover shadow-md dark:border-slate-700"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-md">
                  {userFullName[0]?.toUpperCase() ?? "U"}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--text)]">{userFullName}</h3>
                {clerkUser?.username && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    @{clerkUser.username}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span className="text-[color:var(--text)]">{userEmail}</span>
                </div>
                {userPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="text-[color:var(--text)]">{userPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Member since {userCreated}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Clerk ID:{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
                      {userId?.slice(0, 12)}…
                    </code>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </PageSectionCard>

        <PageSectionCard title="Account Settings">
          <div className="space-y-4">
            <SettingsForm
              initialDisplayName={userFullName}
              initialOrgName={orgName}
              initialTimezone={
                Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Phoenix"
              }
              initialNotifications={{
                emailNotifications: true,
                leadAlerts: true,
                weeklySummary: false,
              }}
            />
          </div>
        </PageSectionCard>

        {/* Demo Mode Section - Always visible if org exists */}
        {organizationId && (
          <PageSectionCard title="Demo Data">
            <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">
              Toggle demo mode to populate your workspace with sample data (John Smith, Jane Smith,
              Bob Smith) for testing and exploration.
            </p>
            <DemoModeToggle
              orgId={organizationId}
              demoMode={orgDemo?.demoMode ?? true}
              demoSeededAt={orgDemo?.demoSeededAt?.toISOString() ?? null}
            />
          </PageSectionCard>
        )}

        {/* Notifications - Handled by SettingsForm above */}

        {/* Organization Settings - Handled by SettingsForm above */}

        <PageSectionCard title="Quick Links">
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/teams"
              className={`group flex items-center justify-between rounded-lg ${panelGhost} p-4 transition-all hover:bg-[var(--surface-1)] hover:shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-[color:var(--text)]">Team & Company Seats</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Manage seats, billing & invitations
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/settings/company-documents"
              className={`group flex items-center justify-between rounded-lg ${panelGhost} p-4 transition-all hover:bg-[var(--surface-1)] hover:shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="font-medium text-[color:var(--text)]">Company Documents</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Upload W9, insurance & licenses
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/trades/profile"
              className={`group flex items-center justify-between rounded-lg ${panelGhost} p-4 transition-all hover:bg-[var(--surface-1)] hover:shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <Wrench className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-medium text-[color:var(--text)]">Trades Profile</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Set up your contractor profile
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/archive"
              className={`group flex items-center justify-between rounded-lg ${panelGhost} p-4 transition-all hover:bg-[var(--surface-1)] hover:shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                  <Archive className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <div className="font-medium text-[color:var(--text)]">Archive & Cold Storage</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Restore archived claims, leads & projects
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </PageSectionCard>

        {/* ─── Admin Only: Data Migration ─── */}
        {isAdmin && (
          <PageSectionCard title="🔒 Admin — Data Migration">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Migrate your existing data from AccuLynx, JobNimbus, or other CRM platforms. This
                wizard will guide you through importing contacts, claims, and project data.
              </p>
              <div
                className={`flex items-center justify-between rounded-lg ${panelGhost} p-4 transition-all hover:bg-[var(--surface-1)]`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                    <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-medium text-[color:var(--text)]">CRM Migration Wizard</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Import from AccuLynx, JobNimbus & more
                    </div>
                  </div>
                </div>
                <Link
                  href="/settings/migrations"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  <Upload className="h-4 w-4" />
                  Start Migration
                </Link>
              </div>
            </div>
          </PageSectionCard>
        )}

        {/* ─── Admin Only: Archive Add-on ─── */}
        {isAdmin && (
          <PageSectionCard title="🔒 Admin — Archive & Cold Storage Add-on">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enable long-term archival access for your entire organization. When active, all
                company seats can archive and retrieve cold storage data.
              </p>
              <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 dark:border-violet-800 dark:from-violet-950/40 dark:to-indigo-950/40">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Archive className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      <h4 className="font-semibold text-[color:var(--text)]">
                        Cold Storage Access
                      </h4>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      $5 / member / month — Enables all company seats to archive and restore data
                      older than 30 days
                    </p>
                  </div>
                  <Link
                    href="/archive"
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
                  >
                    <Archive className="h-4 w-4" />
                    Manage Archive
                  </Link>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                💡 Once enabled, billing appears on your Team & Company Seats page alongside seat
                pricing. Configure the Stripe add-on product in your Stripe Dashboard.
              </p>
            </div>
          </PageSectionCard>
        )}

        <PageSectionCard title="Data & Privacy">
          <div className="space-y-4">
            <div
              className={`flex items-center justify-between rounded-lg ${panelGhost} p-4 transition-colors hover:bg-[var(--surface-1)]`}
            >
              <div>
                <div className="font-medium text-[color:var(--text)]">Export My Data</div>
                <div className={`text-sm ${textMuted}`}>
                  Download a copy of your claims and reports
                </div>
              </div>
              <button
                disabled
                title="Coming soon"
                className="cursor-not-allowed rounded-lg border-2 border-[color:var(--border)] px-4 py-2 font-medium text-[color:var(--text)] opacity-50"
              >
                Request Export
              </button>
            </div>
            <div
              className={`flex items-center justify-between rounded-lg ${panelGhost} p-4 transition-colors hover:bg-[var(--surface-1)]`}
            >
              <div>
                <div className="font-medium text-red-600 dark:text-red-400">Delete Account</div>
                <div className={`text-sm ${textMuted}`}>
                  Permanently delete your account and all data
                </div>
              </div>
              <button
                disabled
                title="Contact support to delete your account"
                className="cursor-not-allowed rounded-lg border-2 border-red-300 px-4 py-2 font-medium text-red-600 opacity-50 dark:border-red-700 dark:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}

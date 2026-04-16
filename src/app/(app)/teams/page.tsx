import { Shield, Users2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { AuthRequiredState } from "@/components/shared/AuthRequiredState";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import CompanySeatsClient from "./CompanySeatsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Company Seats | SkaiScraper",
  description: "Manage your team members and seat-based subscription.",
};

export default async function CompanySeatsPage() {
  const orgCtx = await safeOrgContext();

  // Check authentication status
  if (orgCtx.status === "unauthenticated") {
    return (
      <PageContainer>
        <PageHero
          section="settings"
          title="Company Seats"
          subtitle="Manage your team seats and invitations"
          icon={<Users2 className="h-5 w-5" />}
        />
        <AuthRequiredState
          redirectUrl="/teams"
          message="Please sign in to manage your company seats."
        />
      </PageContainer>
    );
  }

  // RBAC Gate: Only admins/owners can manage team seats
  const userRole = (orgCtx.role || "").toString().toLowerCase();
  const isAdmin = userRole === "owner" || userRole === "admin";
  if (!isAdmin) {
    return (
      <PageContainer maxWidth="5xl">
        <PageHero
          section="settings"
          title="Company Seats"
          subtitle="Manage your team seats and invitations"
          icon={<Users2 className="h-5 w-5" />}
        />
        <div className="mx-auto max-w-xl rounded-xl border border-amber-500/40 bg-amber-50 p-8 shadow dark:bg-amber-950">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-amber-700 dark:text-amber-200">
            <Shield className="h-5 w-5" /> Admin Access Required
          </h2>
          <p className="text-sm text-amber-600 dark:text-amber-300">
            Team management is restricted to organization admins and owners.
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

  const orgId = orgCtx.orgId;
  const userId = orgCtx.userId;

  /* ── Fetch team members from DB ─────────────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let members: any[] = [];

  if (orgId && userId) {
    try {
      // TENANT ISOLATION: try {userId,orgId} first, then fall back to userId-only
      // (legacy tradesCompanyMember rows may have orgId=null for the original owner).
      let membership = await prisma.tradesCompanyMember.findFirst({
        where: { userId, orgId },
        select: { companyId: true },
      });

      if (!membership?.companyId) {
        membership = await prisma.tradesCompanyMember.findFirst({
          where: { userId },
          select: { companyId: true },
        });

        // Backfill orgId on the legacy row so future queries are properly scoped.
        if (membership?.companyId) {
          await prisma.tradesCompanyMember
            .updateMany({
              where: { userId, orgId: null },
              data: { orgId },
            })
            .catch((e) => logger.warn("[teams] Backfill orgId failed (non-fatal):", e));
        }
      }

      if (membership?.companyId) {
        const companyMembers = await prisma.tradesCompanyMember.findMany({
          where: {
            companyId: membership.companyId,
            OR: [{ isActive: true }, { status: "pending" }],
          },
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            title: true,
            isAdmin: true,
            isActive: true,
            status: true,
            createdAt: true,
            profilePhoto: true,
            avatar: true,
            onboardingStep: true,
            isManager: true,
            managerId: true,
          },
          orderBy: { createdAt: "asc" },
        });

        // Build a map of id -> name for manager lookup
        const memberNameMap = new Map(
          companyMembers.map((m) => [
            m.id,
            [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Unknown",
          ])
        );

        members = companyMembers.map((m) => {
          const hasProfile = m.isActive && m.status === "active" && m.onboardingStep !== "profile";
          const profileUrl =
            hasProfile && !m.userId.startsWith("pending_") ? `/trades/profile/${m.userId}` : null;

          return {
            id: m.id,
            name: [m.firstName, m.lastName].filter(Boolean).join(" ") || null,
            email: m.email || "",
            role: m.isAdmin ? "Admin" : m.title || "Member",
            status: m.status || "active",
            createdAt: m.createdAt,
            avatarUrl: m.avatar || m.profilePhoto || null,
            profileUrl,
            isManager: m.isManager || false,
            managerId: m.managerId || null,
            managerName: m.managerId ? memberNameMap.get(m.managerId) || null : null,
          };
        });
      }
    } catch (err) {
      logger.error("[teams] Failed to fetch members:", err);
    }
  }

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="settings"
        title="Company Seats"
        subtitle="Manage team members and seat-based subscription — $80/seat/mo"
        icon={<Users2 className="h-6 w-6" />}
      />

      <CompanySeatsClient members={members} orgId={orgId || ""} />
    </PageContainer>
  );
}

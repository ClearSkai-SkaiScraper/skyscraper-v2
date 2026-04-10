import { Users2 } from "lucide-react";
import type { Metadata } from "next";

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

  const orgId = orgCtx.orgId;
  const userId = orgCtx.userId;

  /* ── Fetch team members from DB ─────────────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let members: any[] = [];

  if (orgId && userId) {
    try {
      // TENANT ISOLATION: Filter by BOTH userId AND orgId
      const membership = userId
        ? await prisma.tradesCompanyMember.findFirst({
            where: { userId, orgId },
            select: { companyId: true },
          })
        : null;

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

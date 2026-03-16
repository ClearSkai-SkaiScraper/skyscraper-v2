import { GitBranch } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { OrgChartFullView } from "./_components/OrgChartFullView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Company Hierarchy | SkaiScraper",
  description: "Visual org chart — drag-and-drop team management",
};

export default async function HierarchyPage() {
  const orgCtx = await safeOrgContext();

  if (orgCtx.status === "unauthenticated" || !orgCtx.userId) {
    const { redirect } = await import("next/navigation");
    redirect("/sign-in?redirect_url=/teams/hierarchy");
  }

  // TENANT ISOLATION: Require actual org membership, not just authentication
  if (orgCtx.status !== "ok" || !orgCtx.orgId) {
    return (
      <PageContainer maxWidth="full">
        <PageHero
          section="settings"
          title="Company Hierarchy"
          subtitle="Join an organization to view the org chart"
          icon={<GitBranch className="h-6 w-6" />}
        />
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-amber-800 dark:text-amber-200">
            You need to be a member of an organization to view the company hierarchy.
          </p>
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Accept a team invitation or create a new organization to get started.
          </p>
        </div>
      </PageContainer>
    );
  }

  const userId = orgCtx.userId as string;
  const orgId = orgCtx.orgId;

  /* ── Fetch company members ───────────────────────────────────── */
  let members: any[] = [];
  let companyName = "Your Company";

  try {
    // TENANT ISOLATION: Filter by BOTH userId AND orgId to prevent cross-org data leaks
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId: userId, orgId: orgId },
      select: { companyId: true },
    });

    if (membership?.companyId) {
      const company = await prisma.tradesCompany.findUnique({
        where: { id: membership.companyId },
        select: { name: true },
      });
      if (company?.name) companyName = company.name;

      const companyMembers = await prisma.tradesCompanyMember.findMany({
        where: {
          companyId: membership.companyId,
          OR: [{ isActive: true }, { status: "active" }],
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
          jobTitle: true,
          role: true,
          isAdmin: true,
          isOwner: true,
          isManager: true,
          managerId: true,
          avatar: true,
          profilePhoto: true,
          phone: true,
          status: true,
        },
        orderBy: [
          { isOwner: "desc" },
          { isAdmin: "desc" },
          { isManager: "desc" },
          { firstName: "asc" },
        ],
      });

      members = companyMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Unknown",
        email: m.email || "",
        title: m.jobTitle || m.title || m.role || "Team Member",
        isAdmin: m.isAdmin || false,
        isOwner: m.isOwner || false,
        isManager: m.isManager || false,
        managerId: m.managerId || null,
        avatarUrl: m.profilePhoto || m.avatar || null,
        phone: m.phone || null,
        status: m.status || "active",
      }));
    }
  } catch (err) {
    logger.error("[hierarchy] Failed to fetch members:", err);
  }

  return (
    <PageContainer maxWidth="full">
      <PageHero
        section="settings"
        title="Company Hierarchy"
        subtitle={`${companyName} — Organizational Structure`}
        icon={<GitBranch className="h-6 w-6" />}
      />
      <div className="mt-6">
        <OrgChartFullView initialMembers={members} companyName={companyName} />
      </div>
    </PageContainer>
  );
}

import { Lock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { logger } from "@/lib/logger";
import TradesNetworkDashboard from "./_components/TradesNetworkDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Trades Network | SkaiScraper",
  description:
    "Your trades network hub — connect with contractors, post jobs, and grow your business.",
};

export default async function TradesNetworkPage() {
  try {
    const orgCtx = await safeOrgContext();

    if (orgCtx.status === "unauthenticated") {
      return (
        <PageContainer>
          <PageHero
            title="Trades Network Hub"
            subtitle="Sign in to connect with contractors"
            icon={<Users className="h-5 w-5" />}
            section="trades"
          />
          <PageSectionCard>
            <div className="py-8 text-center">
              <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <h2 className="mb-2 text-xl font-bold">Sign In Required</h2>
              <p className="mb-4 text-sm text-slate-500">
                Please sign in to access the Trades Network Hub.
              </p>
              <Link
                href="/sign-in?redirect_url=/trades"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Sign In →
              </Link>
            </div>
          </PageSectionCard>
        </PageContainer>
      );
    }

    const orgId = orgCtx.orgId;
    const userId = orgCtx.userId;

    if (!orgId || !userId) {
      redirect("/sign-in");
    }

    // Fetch current user trades profile
    const userMembership = await prisma.tradesCompanyMember
      .findUnique({
        where: { userId },
        include: { company: true },
      })
      .catch(() => null);

    // Stats — include vendors for accurate total
    const [totalMembers, verifiedCompanies, totalVendors] = await Promise.all([
      prisma.tradesCompanyMember.count().catch(() => 0),
      prisma.tradesCompany.count({ where: { isVerified: true } }).catch(() => 0),
      prisma.vendor.count({ where: { isActive: true } }).catch(() => 0),
    ]);

    const totalProfiles = totalMembers + totalVendors;

    const userProfile = userMembership
      ? {
          id: userMembership.id,
          companyId: userMembership.company?.id || null,
          companyName:
            userMembership.company?.name ||
            `${userMembership.firstName || ""} ${userMembership.lastName || ""}`.trim() ||
            "My Profile",
          avatarUrl: userMembership.avatar || userMembership.profilePhoto || null,
          coverPhotoUrl: userMembership.coverPhoto || userMembership.company?.coverimage || null,
        }
      : null;

    return (
      <TradesNetworkDashboard
        userProfile={userProfile}
        stats={{ totalProfiles, verifiedCompanies }}
      />
    );
  } catch (error) {
    logger.error("Trades Network Hub Error:", error);
    return (
      <PageContainer>
        <PageHero
          title="Trades Network Hub"
          subtitle="Connect with contractors in your area"
          icon={<Users className="h-5 w-5" />}
          section="trades"
        />
        <PageSectionCard>
          <div className="py-8 text-center">
            <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
            <p className="mb-4 text-sm text-slate-500">
              We encountered an issue loading the Trades Network. Please try refreshing.
            </p>
            <Link
              href="/trades"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Refresh Page
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }
}

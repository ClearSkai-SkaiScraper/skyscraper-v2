// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { FileStack } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getActiveOrgSafe } from "@/lib/auth/getActiveOrgSafe";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { AIClaimsBuilderWizard } from "@/components/claims/AIClaimsBuilderWizard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";

export const metadata: Metadata = {
  title: "Insurance Claims PDF Wizard | SkaiScraper",
  description:
    "Generate professional insurance claim documentation with AI-powered damage assessment, scope generation, and carrier-ready PDFs.",
};

export default async function AIClaimsBuilderPage({
  searchParams,
}: {
  searchParams: { claimId?: string };
}) {
  const user = await currentUser();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userId = user?.id || null;

  // Use robust org resolver (auto-bootstrap if missing)
  const orgResult = await getActiveOrgSafe({ allowAutoCreate: true });
  const orgId = orgResult.ok ? orgResult.org.id : null;

  // If org is still missing, allow demo claim fallback
  if (!orgId) {
    return (
      <PageContainer>
        <PageHero
          section="reports"
          title="AI Claims Builder"
          subtitle="Generate complete claim scopes, line items, and PDFs"
          icon={<FileStack className="h-5 w-5" />}
        />
        <PageSectionCard>
          <div className="flex min-h-[300px] items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div className="mb-6 inline-flex rounded-full bg-blue-100 p-4">
                <FileStack className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Demo Mode</h3>
              <p className="mb-6 text-sm text-gray-600">
                No organization found. You can use a demo claim to try the builder.
              </p>
              <form action="/api/_demo/seed" method="POST">
                <Button type="submit" variant="outline" className="w-full">
                  Use Demo Claim
                </Button>
              </form>
              <Button asChild variant="outline">
                <a href="/dashboard">Return to Dashboard</a>
              </Button>
            </div>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  // Load real claims for this org (must use real UUIDs)
  let claims = [] as Array<{
    id: string;
    claimNumber: string | null;
    title: string | null;
    dateOfLoss: Date | null;
    properties: {
      street: string | null;
      city: string | null;
      state: string | null;
      contacts: { firstName: string; lastName: string } | null;
    } | null;
  }>;

  try {
    claims = await prisma.claims.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        claimNumber: true,
        title: true,
        dateOfLoss: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            contacts: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    // Failed to load claims — continue with empty list
    claims = [];
  }

  const wizardClaims = claims.map((c) => {
    const contact = c.properties?.contacts;
    const clientName = contact
      ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
      : c.title || "";
    const propertyAddress = c.properties
      ? [c.properties.street, c.properties.city, c.properties.state].filter(Boolean).join(", ")
      : "";

    return {
      id: c.id,
      claimNumber: c.claimNumber,
      title: c.title,
      propertyAddress,
      clientName,
      dateOfLoss: c.dateOfLoss?.toISOString() || null,
    };
  });

  const selectedClaimId = searchParams.claimId || wizardClaims[0]?.id;
  const claim =
    wizardClaims.find((c) => c.id === selectedClaimId || c.claimNumber === selectedClaimId) ||
    wizardClaims[0];

  if (!claim) {
    return (
      <PageContainer>
        <PageHero
          section="reports"
          title="Insurance Claims PDF Wizard"
          subtitle="AI-powered insurance claim documentation"
          icon={<FileStack className="h-5 w-5" />}
        />
        <PageSectionCard>
          <div className="flex min-h-[240px] items-center justify-center p-8">
            <div className="max-w-md text-center">
              <h3 className="mb-2 text-xl font-bold text-gray-900">No claims found</h3>
              <p className="mb-6 text-sm text-gray-600">
                Create a claim first, then return here to generate AI reports.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <a href="/claims/new">Create Claim</a>
              </Button>
            </div>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Insurance Claims PDF Wizard"
        subtitle="AI-powered insurance claim documentation with damage assessment, scope generation, and carrier-ready PDFs"
        icon={<FileStack className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <Link href="/reports/history">
            <Button variant="outline" size="sm">
              View History
            </Button>
          </Link>
          <Link href="/reports/templates?type=insurance">
            <Button variant="outline" size="sm">
              <FileStack className="mr-1 h-4 w-4" />
              Claim Templates
            </Button>
          </Link>
        </div>
      </PageHero>

      <PageSectionCard>
        <AIClaimsBuilderWizard claims={wizardClaims} initialClaim={claim} />
      </PageSectionCard>
    </PageContainer>
  );
}

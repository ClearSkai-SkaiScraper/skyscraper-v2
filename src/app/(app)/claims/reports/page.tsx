// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { Download, ExternalLink, FileText, Sparkles } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Claims Reports | SkaiScraper",
  description: "Generate and download claims reports",
};

async function getClaimsWithMaterials(orgId: string) {
  try {
    const claims = await prisma.claims.findMany({
      where: { orgId },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        status: true,
        createdAt: true,
        propertyId: true,
        _count: {
          select: {
            reports: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch properties for each claim
    const propertyIds = claims.map((c) => c.propertyId).filter(Boolean) as string[];
    const properties =
      propertyIds.length > 0
        ? await prisma.properties.findMany({
            where: { id: { in: propertyIds } },
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
            },
          })
        : [];

    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    return claims.map((claim) => ({
      ...claim,
      lifecycleStage: claim.status,
      insured_name: claim.title?.split("—")[0]?.trim() || null,
      property: claim.propertyId
        ? (() => {
            const p = propertyMap.get(claim.propertyId);
            if (!p) return null;
            return { address: [p.street, p.city, p.state].filter(Boolean).join(", ") };
          })()
        : null,
      materialCount: claim._count.reports,
    }));
  } catch (err) {
    logger.warn("[ClaimsReports] Claims query error", err);
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function GenerateReportButton({ claimId }: { claimId: string }) {
  "use client";

  return (
    <form action={`/api/reports/claims/${claimId}/pdf`} method="POST" target="_blank">
      <Button type="submit" size="sm" variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Generate PDF
      </Button>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/await-thenable
export default async function ClaimsReportsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const orgId = await getTenant();

  if (!orgId) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">No Organization Access</h1>
        <p className="mb-6 text-muted-foreground">
          You need to be linked to an organization to view reports.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const claims = await getClaimsWithMaterials(orgId);

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <PageHero
        title="Claims Reports"
        subtitle="Generate PDF reports for claims with materials"
        icon={<FileText className="h-5 w-5" />}
      >
        <Link href="/claims">
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            View All Claims
          </Button>
        </Link>
      </PageHero>

      {/* Reports List */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Claim #
                </th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Insured
                </th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Property
                </th>
                <th className="p-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Materials
                </th>
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Stage
                </th>
                <th className="p-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No claims found. Create a claim and add materials to generate reports.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4">
                      <Link
                        href={`/claims/${claim.id}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {claim.claimNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-sm">{claim.insured_name || "—"}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {claim.property?.address || "—"}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                        <FileText className="h-3 w-3" />
                        {claim.materialCount}
                      </span>
                    </td>
                    <td className="p-4">
                      {claim.lifecycleStage && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                          {claim.lifecycleStage}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/reports/templates/pdf-builder?claimId=${claim.id}`}>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={claim.materialCount === 0}
                            title={
                              claim.materialCount === 0
                                ? "Add materials to generate report"
                                : "Generate report with AI template selection"
                            }
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Smart Report
                          </Button>
                        </Link>
                        <form
                          action={`/api/reports/claims/${claim.id}/pdf`}
                          method="POST"
                          className="inline"
                        >
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            disabled={claim.materialCount === 0}
                            title={
                              claim.materialCount === 0
                                ? "Add materials to generate report"
                                : "Quick PDF (default template)"
                            }
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Quick PDF
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-blue-50 p-6 dark:bg-blue-950">
        <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">📄 How Reports Work</h3>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Reports include all materials added to the claim</li>
          <li>• Each material shows specifications, warranty, and color details</li>
          <li>• Data sheet links are included when available</li>
          <li>• PDFs are automatically uploaded to secure storage</li>
          <li>• Generated reports can be downloaded or emailed to adjusters</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * DEPRECIATION BUILDER - Full Final Payout & Claims Invoice System
 * This is THE multi-tab workspace for final payouts, depreciation recovery,
 * homeowner acceptance, and contractor statements.
 */

import { Calculator, FileText, Info } from "lucide-react";
import { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { DepreciationBuilderClient } from "./_components/DepreciationBuilderClient";

export const metadata: Metadata = {
  title: "Depreciation Builder | SkaiScraper",
  description:
    "Final payout system for depreciation recovery, invoices, and homeowner acceptance forms",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { claimId?: string };
}

export default async function DepreciationBuilderPage({ searchParams }: PageProps) {
  const claimId = searchParams.claimId;

  const ctx = await safeOrgContext();
  if (!ctx.ok || !ctx.orgId) {
    return (
      <PageContainer maxWidth="7xl">
        <PageHero
          title="Depreciation Builder"
          subtitle="Final payout system for depreciation recovery, invoices, and homeowner acceptance forms"
          icon={<Calculator className="h-5 w-5" />}
          section="ai"
        />
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-12 text-center backdrop-blur-xl">
          <p className="text-slate-500 dark:text-slate-400">
            Unable to load workspace. Please try again or contact support.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Fetch all claims for selection
  const claims = await prisma.claims.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      claimNumber: true,
      title: true,
      insured_name: true,
      status: true,
      properties: {
        select: {
          street: true,
          city: true,
          state: true,
        },
      },
    },
    take: 100,
  });

  // If a claim is selected, fetch full claim data
  let selectedClaim: {
    id: string;
    claimNumber: string;
    title: string;
    status: string;
    carrier: string | null;
    policyNumber: string | null;
    dateOfLoss: string | null;
    dateOfInspection: string | null;
    insured_name: string | null;
    homeownerEmail: string | null;
    adjusterName: string | null;
    adjusterEmail: string | null;
    adjusterPhone: string | null;
    damageType: string;
    propertyAddress: string | null;
    propertyCity: string | null;
    propertyState: string | null;
    propertyZip: string | null;
    estimatedValue: number | null;
    rcvTotal: number | null;
    acvTotal: number | null;
    depreciationTotal: number | null;
    deductible: number | null;
    acvPaid: number | null;
    coverageA: number | null;
    coverageB: number | null;
    coverageC: number | null;
    supplements: Array<{
      id: string;
      title: string;
      amount: number | null;
      status: string;
      reason: string | null;
      createdAt: string | null;
    }>;
    photos: Array<{
      id: string;
      url: string | null;
      category: string | null;
      caption: string | null;
      createdAt: string | null;
    }>;
    documents: Array<{
      id: string;
      name: string | null;
      url: string | null;
      type: string | null;
      createdAt: string | null;
    }>;
  } | null = null;
  if (claimId) {
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: ctx.orgId,
      },
      include: {
        properties: true,
        projects: true,
        inspections: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        supplements: {
          orderBy: { created_at: "desc" },
        },
        depreciation_items: true,
      },
    });

    if (claim) {
      selectedClaim = {
        id: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title,
        status: claim.status,
        carrier: claim.carrier,
        policyNumber: claim.policy_number,
        dateOfLoss: claim.dateOfLoss?.toISOString() || null,
        dateOfInspection: claim.inspections[0]?.scheduledAt?.toISOString() || null,
        insured_name: claim.insured_name,
        homeownerEmail: claim.homeowner_email,
        adjusterName: claim.adjusterName,
        adjusterEmail: claim.adjusterEmail,
        adjusterPhone: claim.adjusterPhone,
        damageType: claim.damageType,
        propertyAddress: claim.properties?.street || null,
        propertyCity: claim.properties?.city || null,
        propertyState: claim.properties?.state || null,
        propertyZip: claim.properties?.zipCode || null,
        estimatedValue: claim.estimatedValue,
        rcvTotal: claim.estimatedValue || null,
        acvTotal: claim.approvedValue || null,
        depreciationTotal:
          claim.depreciation_items.reduce((sum, item) => sum + (item.rcv - item.acv), 0) || null,
        deductible: claim.deductible,
        acvPaid: claim.approvedValue ? claim.approvedValue - (claim.deductible || 0) : null,
        coverageA: claim.estimatedValue || null,
        coverageB: null,
        coverageC: null,
        supplements:
          claim.supplements?.map((s) => ({
            id: s.id,
            title: s.notes || `Supplement ${s.id.slice(0, 8)}`,
            amount: s.total || null,
            status: s.status,
            reason: s.notes || null,
            createdAt: s.created_at?.toISOString() || null,
          })) || [],
        photos: [] as Array<{
          id: string;
          url: string | null;
          category: string | null;
          caption: string | null;
          createdAt: string | null;
        }>,
        documents: [] as Array<{
          id: string;
          name: string | null;
          url: string | null;
          type: string | null;
          createdAt: string | null;
        }>,
      };
    }
  }

  // Format claims for the selector
  const claimsForSelector = claims.map((c) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    title: c.title,
    lossAddress: c.properties
      ? `${c.properties.street || ""}${c.properties.city ? `, ${c.properties.city}` : ""}${c.properties.state ? `, ${c.properties.state}` : ""}`
      : null,
    insured_name: c.insured_name,
    status: c.status,
  }));

  // No claim selected - show selector
  if (!selectedClaim) {
    return (
      <PageContainer maxWidth="7xl">
        <PageHero
          section="claims"
          title="Depreciation Builder"
          subtitle="Final payout system for depreciation recovery, invoices, and homeowner acceptance"
          icon={<Calculator className="h-6 w-6" />}
        />

        <div className="space-y-6">
          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-blue-600" />
                Select a Claim to Begin
              </CardTitle>
              <CardDescription>
                The Depreciation Builder is your complete final payout workspace. Select a claim
                below to access:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Depreciation Recovery Tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Final Invoice Generation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Homeowner Acceptance Forms
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Contractor Statements
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Line-Item Coverage Breakdown
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Photo Documentation Requirements
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Supplement Tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Carrier Submission Workflow
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Claims Grid */}
          {claimsForSelector.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Claims Found</h3>
                <p className="text-sm text-muted-foreground">
                  Create a claim first, then come back to build your final payout package.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {claimsForSelector.map((claim) => (
                <a
                  key={claim.id}
                  href={`/ai/tools/depreciation?claimId=${claim.id}`}
                  className="block"
                >
                  <Card className="h-full cursor-pointer transition-all hover:border-primary hover:shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{claim.claimNumber}</CardTitle>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            claim.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : claim.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : claim.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                      <CardDescription className="line-clamp-1">
                        {claim.title || claim.insured_name || "Untitled Claim"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {claim.lossAddress || "No address on file"}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  // Claim selected - show full Final Payout workspace
  return (
    <DepreciationBuilderClient
      claim={selectedClaim}
      claims={claimsForSelector}
      orgId={ctx.orgId}
      userId={ctx.userId}
    />
  );
}

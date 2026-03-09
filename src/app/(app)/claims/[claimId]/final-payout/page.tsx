import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { FinalPayoutClient } from "./_components/FinalPayoutClient";

export const dynamic = "force-dynamic";

interface FinalPayoutPageProps {
  params: Promise<{ claimId: string }>;
}

export default async function FinalPayoutPage({ params }: FinalPayoutPageProps) {
  const { claimId } = await params;

  const ctx = await safeOrgContext();
  if (!ctx.ok) {
    redirect("/sign-in");
  }

  // Fetch claim with all related data for the payout system
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

  if (!claim) {
    redirect("/claims");
  }

  // Transform claim data for the client
  const claimData = {
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
    // Property info
    propertyAddress: claim.properties?.street || null,
    propertyCity: claim.properties?.city || null,
    propertyState: claim.properties?.state || null,
    propertyZip: claim.properties?.zipCode || null,
    // Financial data
    estimatedValue: claim.estimatedValue,
    rcvTotal: claim.estimatedValue || null, // RCV is typically in estimatedValue
    acvTotal: claim.approvedValue || null, // ACV is typically approved value minus depreciation
    depreciationTotal:
      claim.depreciation_items.reduce((sum, item) => sum + (item.rcv - item.acv), 0) || null,
    deductible: claim.deductible,
    acvPaid: claim.approvedValue ? claim.approvedValue - (claim.deductible || 0) : null,
    // Coverage breakdown (not stored separately - use estimatedValue)
    coverageA: claim.estimatedValue || null,
    coverageB: null,
    coverageC: null,
    // Supplements
    supplements:
      claim.supplements?.map((s) => ({
        id: s.id,
        title: s.notes || `Supplement ${s.id.slice(0, 8)}`,
        amount: s.total || null,
        status: s.status,
        reason: s.notes || null,
        createdAt: s.created_at?.toISOString() || null,
      })) || [],
    // Photos - fetched separately via API (linked to projects, not claims directly)
    photos: [] as Array<{
      id: string;
      url: string | null;
      category: string | null;
      caption: string | null;
      createdAt: string | null;
    }>,
    // Documents - fetched separately via API (linked to projects, not claims directly)
    documents: [] as Array<{
      id: string;
      name: string | null;
      url: string | null;
      type: string | null;
      createdAt: string | null;
    }>,
  };

  return <FinalPayoutClient claim={claimData} orgId={ctx.orgId} userId={ctx.userId} />;
}

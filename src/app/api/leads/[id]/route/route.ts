export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * POST /api/leads/[id]/route
 * Route a lead to a specific job category (claim, out_of_pocket, financed, repair)
 */
export const POST = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  const { id: leadId } = routeParams?.params ?? {};
  const body = await req.json();
  const { jobCategory } = body;
  logger.info("[LEADS_ROUTE]", { leadId, jobCategory, orgId });

  if (!jobCategory) {
    return NextResponse.json({ error: "jobCategory is required" }, { status: 400 });
  }

  const validCategories = ["claim", "out_of_pocket", "financed", "repair"];
  if (!validCategories.includes(jobCategory)) {
    return NextResponse.json(
      { error: `Invalid jobCategory. Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  // Fetch the lead
  const lead = await prisma.leads.findFirst({
    where: { id: leadId, orgId },
    include: {
      contacts: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // If routing to claim, create a claim record
  if (jobCategory === "claim") {
    // Check if claim already exists for this lead
    let claim = await prisma.claims.findFirst({
      where: { orgId, title: { contains: lead.title } },
    });

    if (!claim) {
      // Create new claim from lead data
      claim = await prisma.claims.create({
        data: {
          id: `claim-from-lead-${leadId}`,
          orgId,
          title: lead.title,
          description: lead.description,
          status: "new",
          carrier: "TBD",
          claimNumber: `CLM-${Date.now().toString(36).toUpperCase()}`,
          estimatedValue: lead.value || 0,
          propertyId: undefined, // Would need to create property from contact address
          dateOfLoss: new Date().toISOString().split("T")[0],
        } as any,
      });
    }

    // Update lead to reference the claim
    await prisma.leads.update({
      where: { id: leadId },
      data: {
        jobCategory: "claim",
        claimId: claim.id,
        stage: "qualified",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Lead converted to claim",
      claimId: claim.id,
      leadId,
    });
  }

  // For non-claim categories, just update the lead's jobCategory
  await prisma.leads.update({
    where: { id: leadId },
    data: {
      jobCategory,
      stage: "qualified", // Move from 'new' to 'qualified' when routed
    },
  });

  return NextResponse.json({
    success: true,
    message: `Lead routed to ${jobCategory}`,
    leadId,
    jobCategory,
  });
});

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateFullReport } from "@/lib/ai/reportGenerator";
import { ReportGenerationContext } from "@/lib/ai/reportPrompts";
import { withAuth } from "@/lib/auth/withAuth";
import { createGeneratedDocument, updateDocumentStatus } from "@/lib/documents/manager";
import prisma from "@/lib/prisma";

const CreateProposalSchema = z.object({
  projectName: z.string().min(1).max(500),
  propertyAddress: z.string().min(1).max(1000),
  claimId: z.string().nullish(),
  lossType: z.string().max(200).nullish(),
  templateId: z.string().min(1),
  notes: z.string().max(5000).nullish(),
});

export const POST = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    const body = await request.json();
    const parsed = CreateProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { projectName, propertyAddress, claimId, lossType, templateId, notes } = parsed.data;

    // Fetch template with sections
    const template = await prisma.reportTemplate
      .findFirst({
        where: {
          id: templateId,
          orgId: orgId,
        },
      })
      .catch(() => null);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Parse sections from template
    const templateSections = template.sections || [];

    // Fetch org info for branding
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true, brandLogoUrl: true },
    });

    // Fetch claim data if claimId provided
    let claimData: any = null;
    if (claimId) {
      claimData = await prisma.claims.findFirst({
        where: { id: claimId, orgId },
        include: {
          estimates: {
            include: {
              estimate_line_items: true,
            },
          },
        },
      });
    }

    // Create proposal record
    const proposal = await prisma.$executeRaw`INSERT INTO proposals (
        organization_id, project_name, property_address, claim_id, 
        loss_type, template_id, notes, status, created_by
      ) VALUES (${orgId}, ${projectName}, ${propertyAddress}, ${claimId || null}, ${lossType || "General"}, ${templateId}, ${notes || null}, ${"generating"}, ${userId})
      RETURNING id`;

    const proposalRow: any =
      await prisma.$queryRaw`SELECT id FROM proposals WHERE project_name = ${projectName} AND organization_id = ${orgId} ORDER BY created_at DESC LIMIT 1`;

    const proposalId = proposalRow[0]?.id;

    if (!proposalId) {
      throw new Error("Failed to create proposal");
    }

    // Create canonical document record
    const generatedDocumentId = await createGeneratedDocument({
      organizationId: orgId,
      type: "PROPOSAL",
      documentName: projectName,
      description: `Proposal for ${propertyAddress}`,
      createdBy: userId,
      proposalId,
      claimId: claimId || undefined,
      templateId,
      sections: templateSections,
      fileFormat: "pdf",
    });

    // Link generated document back to proposal
    await prisma.$executeRaw`UPDATE proposals SET generated_document_id = ${generatedDocumentId} WHERE id = ${proposalId}`;

    // Start async generation (don't await)
    generateProposalAsync(proposalId, generatedDocumentId, template, {
      claimId: claimId || proposalId,
      propertyAddress,
      dateOfLoss: claimData?.dateOfLoss || new Date(),
      lossType: lossType || "General",
      carrier: claimData?.carrier ?? undefined,
      insured_name: claimData?.insured_name ?? undefined,
      damageAreas: claimData?.damageAreas,
      photos: [],
      lineItems:
        claimData?.estimates?.flatMap(
          (e: any) =>
            e.estimate_line_items?.map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              total: item.total,
            })) || []
        ) || [],
      orgName: org?.name || "Organization",
      orgLogo: org?.brandLogoUrl ?? undefined,
    }).catch((error) => {
      logger.error("[Proposals] Async generation error:", error);
    });

    return NextResponse.json({
      proposalId,
      status: "generating",
      message: "Proposal generation started",
    });
  } catch (error) {
    logger.error("[Proposals] Failed to create proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
});

/**
 * Async function to generate proposal content
 */
async function generateProposalAsync(
  proposalId: string,
  generatedDocumentId: string,
  template: any,
  context: ReportGenerationContext
) {
  try {
    logger.debug(`[Proposals] Starting generation for: ${proposalId}`);

    // Update canonical document status
    await updateDocumentStatus(generatedDocumentId, "generating");

    // Generate report content
    const report = await generateFullReport(template, context, proposalId);

    // Update proposal with generated content
    await prisma.$executeRaw`UPDATE proposals SET 
        status = ${"ready"}, 
        generated_content = ${JSON.stringify(report)}, 
        tokens_used = ${report.totalTokensUsed}, 
        updated_at = NOW() 
      WHERE id = ${proposalId}`;

    // Update canonical document
    await updateDocumentStatus(generatedDocumentId, "ready", {
      generatedContent: report,
      tokensUsed: report.totalTokensUsed,
      estimatedCostCents: Math.ceil(report.totalTokensUsed * 0.001),
    });

    logger.debug(`[Proposals] ✓ Generation complete: ${proposalId}`);
  } catch (error) {
    logger.error(`[Proposals] Generation failed for ${proposalId}:`, error);

    // Update proposal with error
    await prisma.$executeRaw`UPDATE proposals SET 
        status = ${"failed"}, 
        error_message = ${error.message}, 
        updated_at = NOW() 
      WHERE id = ${proposalId}`;

    // Update canonical document with error
    await updateDocumentStatus(generatedDocumentId, "error", {
      errorMessage: error.message,
    });
  }
}

export const GET = withAuth(async (_request: NextRequest, { orgId }) => {
  try {
    // Fetch proposals for organization
    const proposals = await prisma.$queryRaw<any[]>`SELECT 
        id, project_name, property_address, loss_type, 
        status, created_at, updated_at, tokens_used
      FROM proposals 
      WHERE organization_id = ${orgId} 
      ORDER BY created_at DESC 
      LIMIT 50`;

    return NextResponse.json(proposals);
  } catch (error) {
    logger.error("[Proposals] Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
});

/**
 * Rebuttal Document Generation API
 *
 * POST /api/claims/[claimId]/generate-rebuttal
 * Generates carrier-aware rebuttal letter as GeneratedDocument
 */

import { logger } from "@/lib/logger";
import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

import { generateRebuttal } from "@/lib/ai/generateRebuttal";
import { withAuth } from "@/lib/auth/withAuth";
import { db } from "@/lib/db";
import { createGeneratedDocument, updateDocumentStatus } from "@/lib/documents/manager";
import { RebuttalPDFDocument } from "@/lib/pdf/rebuttalRenderer";
import { getOrgBranding } from "@/lib/pdf/utils";

export const POST = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      const body = await req.json();
      const {
        denialReason,
        rebuttalName,
        templateId,
        evidenceReferences,
      }: {
        denialReason: string;
        rebuttalName?: string;
        templateId?: string;
        evidenceReferences?: {
          photos?: string[];
          weatherData?: string;
          measurements?: string[];
          codes?: string[];
        };
      } = body;

      if (!denialReason) {
        return NextResponse.json({ error: "denialReason is required" }, { status: 400 });
      }

      // Fetch claim data (orgId is DB-backed UUID from withAuth)
      const claim = await db.query(
        `SELECT 
          c.id,
          c.organization_id,
          c.property_address,
          c.loss_date,
          c.loss_type,
          c.policy_number,
          c.insured_name,
          c.carrier_name,
          c.adjuster_name
        FROM claims c
        WHERE c.id = $1 AND c.organization_id = $2`,
        [claimId, orgId]
      );

      if (claim.rows.length === 0) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      const claimData = claim.rows[0];

      if (!claimData.carrier_name) {
        return NextResponse.json({ error: "Claim must have a carrier assigned" }, { status: 400 });
      }

      // Create canonical document record
      const documentName = rebuttalName || `Rebuttal - ${claimData.property_address}`;
      const generatedDocumentId = await createGeneratedDocument({
        organizationId: orgId,
        type: "REBUTTAL",
        documentName,
        createdBy: userId,
        claimId,
        templateId,
        sections: [
          "OPENING",
          "DENIAL_ACKNOWLEDGMENT",
          "POLICY_COVERAGE_ANALYSIS",
          "COUNTER_ARGUMENTS",
          "EVIDENCE_PRESENTATION",
          "INDUSTRY_STANDARDS",
          "DAMAGE_CAUSATION",
          "REQUESTED_ACTION",
          "CLOSING",
        ],
        fileFormat: "pdf",
      });

      // Generate async (background processing)
      generateRebuttalAsync({
        generatedDocumentId,
        claimId,
        denialReason,
        claimData,
        evidenceReferences,
        orgId,
        userId,
        documentName,
      }).catch((err) => {
        logger.error("Rebuttal generation failed:", err);
      });

      return NextResponse.json({
        success: true,
        generatedDocumentId,
        status: "queued",
        carrier: claimData.carrier_name,
      });
    } catch (error) {
      logger.error("Rebuttal generation error:", error);
      return NextResponse.json({ error: "Failed to generate rebuttal" }, { status: 500 });
    }
  }
);

/**
 * Async rebuttal generation worker
 */
async function generateRebuttalAsync(params: {
  generatedDocumentId: string;
  claimId: string;
  denialReason: string;
  claimData: any;
  evidenceReferences?: any;
  orgId: string;
  userId: string;
  documentName: string;
}) {
  const {
    generatedDocumentId,
    claimId,
    denialReason,
    claimData,
    evidenceReferences,
    orgId,
    userId,
    documentName,
  } = params;

  try {
    // Update status to generating
    await updateDocumentStatus(generatedDocumentId, "generating");

    // Fetch estimate amount if available
    const estimateQuery = await db.query(
      `SELECT total_rcv FROM claim_estimates 
       WHERE claim_id = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [claimId]
    );
    const estimateAmount = estimateQuery.rows[0]?.total_rcv;

    // STEP 1: Generate AI rebuttal sections
    const result = await generateRebuttal({
      claimId,
      denialReason,
      carrier: claimData.carrier_name,
      claimData: {
        propertyAddress: claimData.property_address,
        lossDate: claimData.loss_date?.toISOString().split("T")[0] || "",
        lossType: claimData.loss_type || "",
        policyNumber: claimData.policy_number,
        insured_name: claimData.insured_name,
        adjusterName: claimData.adjuster_name,
        estimateAmount,
      },
      evidenceReferences,
    });

    // STEP 2: Generate PDF
    const branding = await getOrgBranding(db, orgId);

    // Fetch org contact info
    const orgQuery = await db.query(
      `SELECT name, contact_email, contact_phone FROM organizations WHERE id = $1`,
      [orgId]
    );
    const orgInfo = orgQuery.rows[0];

    const pdfData = {
      rebuttalName: documentName,
      propertyAddress: claimData.property_address,
      lossDate: claimData.loss_date?.toISOString().split("T")[0] || "",
      lossType: claimData.loss_type || "",
      policyNumber: claimData.policy_number,
      carrier: claimData.carrier_name,
      adjusterName: claimData.adjuster_name,
      generatedAt: new Date(),
      sections: result.sections,
      attachments: evidenceReferences
        ? [
            ...(evidenceReferences.photos || []).map((p: string) => `Photo: ${p}`),
            ...(evidenceReferences.measurements || []).map((m: string) => `Measurement: ${m}`),
            ...(evidenceReferences.codes || []).map((c: string) => `Building Code: ${c}`),
          ]
        : undefined,
      orgName: branding.orgName,
      brandLogoUrl: branding.brandLogoUrl,
      orgContactInfo: {
        email: orgInfo?.contact_email,
        phone: orgInfo?.contact_phone,
      },
    };

    const stream = await renderToStream(<RebuttalPDFDocument data={pdfData as any} />);

    // TODO: Upload PDF to storage and get fileUrl
    // For now, we'll mark as ready without file_url
    const fileUrl = undefined; // Replace with actual upload

    // STEP 3: Update document status to ready
    await updateDocumentStatus(generatedDocumentId, "ready", {
      fileUrl,
      generatedContent: {
        sections: result.sections,
        denialReason,
        carrier: claimData.carrier_name,
        evidenceReferences,
      },
      tokensUsed: result.tokensUsed,
      estimatedCostCents: result.estimatedCostCents,
    });

    logger.debug(`Rebuttal ${generatedDocumentId} generated successfully`);
  } catch (error) {
    logger.error("Rebuttal async generation error:", error);

    // Update document status to error
    await updateDocumentStatus(generatedDocumentId, "error", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

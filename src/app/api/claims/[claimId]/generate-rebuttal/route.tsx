/**
 * Rebuttal Document Generation API
 *
 * POST /api/claims/[claimId]/generate-rebuttal
 * Generates carrier-aware rebuttal letter as GeneratedDocument
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateRebuttal } from "@/lib/ai/generateRebuttal";
import { withAuth } from "@/lib/auth/withAuth";
import { db } from "@/lib/db";
import { createGeneratedDocument, updateDocumentStatus } from "@/lib/documents/manager";
import { logger } from "@/lib/logger";
import { RebuttalPDFDocument } from "@/lib/pdf/rebuttalRenderer";
import { getOrgBranding } from "@/lib/pdf/utils";

const GenerateRebuttalSchema = z.object({
  denialReason: z.string().min(1, "denialReason is required"),
  rebuttalName: z.string().optional(),
  templateId: z.string().optional(),
  evidenceReferences: z
    .object({
      photos: z.array(z.string()).optional(),
      weatherData: z.string().optional(),
      measurements: z.array(z.string()).optional(),
      codes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const POST = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      const raw = await req.json();
      const parsed = GenerateRebuttalSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { denialReason, rebuttalName, templateId, evidenceReferences } = parsed.data;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claimData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await renderToStream(<RebuttalPDFDocument data={pdfData as any} />);

    // STEP 2b: Upload PDF to Supabase storage
    let fileUrl: string | undefined;
    let fileSizeBytes: number | undefined;
    try {
      const { createClient } = await import("@supabase/supabase-js");
      // eslint-disable-next-line no-restricted-syntax
      const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      // eslint-disable-next-line no-restricted-syntax
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sbUrl && sbKey) {
        const supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
        const bucket = "generated-documents";

        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some((b: { name: string }) => b.name === bucket)) {
          await supabase.storage.createBucket(bucket, { public: true });
        }

        // Collect stream into buffer
        const chunks: Buffer[] = [];
        for await (const chunk of stream as AsyncIterable<Buffer>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const pdfBuffer = Buffer.concat(chunks);
        fileSizeBytes = pdfBuffer.length;

        const filePath = `${orgId}/${claimId}/rebuttal-${generatedDocumentId}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from(bucket).getPublicUrl(filePath);
          fileUrl = publicUrl;
        } else {
          logger.warn("[REBUTTAL] PDF upload failed, document saved without file", {
            error: uploadError.message,
          });
        }
      } else {
        logger.warn("[REBUTTAL] Supabase not configured, PDF not persisted");
      }
    } catch (uploadErr) {
      logger.warn("[REBUTTAL] PDF upload error (non-fatal)", uploadErr);
    }

    // STEP 3: Update document status to ready
    await updateDocumentStatus(generatedDocumentId, "ready", {
      fileUrl,
      fileSizeBytes,
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

/**
 * Supplement Document Generation API
 *
 * POST /api/claims/[claimId]/generate-supplement
 * Generates supplement document with delta analysis as GeneratedDocument
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateSupplement } from "@/lib/ai/generateSupplement";
import { withAuth } from "@/lib/auth/withAuth";
import { db } from "@/lib/db";
import { computeDelta, computeTotalDelta, ScopeLineItem } from "@/lib/delta/computeDelta";
import { createGeneratedDocument, updateDocumentStatus } from "@/lib/documents/manager";
import { logger } from "@/lib/logger";
import { SupplementPDFDocument } from "@/lib/pdf/supplementRenderer";
import { getOrgBranding } from "@/lib/pdf/utils";

const GenerateSupplementSchema = z.object({
  adjusterScope: z.array(z.record(z.unknown())).min(1, "adjusterScope is required"),
  contractorScope: z.array(z.record(z.unknown())).min(1, "contractorScope is required"),
  supplementName: z.string().optional(),
  templateId: z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { claimId } = await routeParams!.params;
    const raw = await req.json();
    const parsed = GenerateSupplementSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { adjusterScope, contractorScope, supplementName, templateId } = parsed.data as {
      adjusterScope: ScopeLineItem[];
      contractorScope: ScopeLineItem[];
      supplementName?: string;
      templateId?: string;
    };

    // Fetch claim data
    const claim = await db.query(
      `SELECT 
        c.id,
        c.organization_id,
        c.property_address,
        c.loss_date,
        c.loss_type,
        c.policy_number,
        c.insured_name,
        c.carrier_name
      FROM claims c
      WHERE c.id = $1 AND c.organization_id = $2`,
      [claimId, orgId]
    );

    if (claim.rows.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claimData = claim.rows[0];

    // STEP 1: Compute delta (deterministic, no AI)
    const variances = computeDelta(adjusterScope, contractorScope);
    const totalDelta = computeTotalDelta(variances);

    // STEP 2: Create canonical document record
    const documentName = supplementName || `Supplement - ${claimData.property_address}`;
    const generatedDocumentId = await createGeneratedDocument({
      organizationId: orgId,
      type: "SUPPLEMENT",
      documentName,
      createdBy: userId,
      claimId,
      templateId,
      sections: [
        "EXECUTIVE_SUMMARY",
        "VARIANCE_ANALYSIS",
        "MISSING_ITEMS_JUSTIFICATION",
        "PRICING_JUSTIFICATION",
        "CODE_COMPLIANCE",
        "CONCLUSION",
      ],
      fileFormat: "pdf",
    });

    // STEP 3: Generate async (background processing)
    generateSupplementAsync({
      generatedDocumentId,
      claimId,
      variances,
      totalDelta,
      claimData,
      orgId,
      userId,
      documentName,
    }).catch((err) => {
      logger.error("Supplement generation failed:", err);
    });

    return NextResponse.json({
      success: true,
      generatedDocumentId,
      status: "queued",
      varianceCount: variances.length,
      totalDelta,
    });
  } catch (error) {
    logger.error("Supplement generation error:", error);
    return NextResponse.json({ error: "Failed to generate supplement" }, { status: 500 });
  }
});

/**
 * Async supplement generation worker
 */
async function generateSupplementAsync(params: {
  generatedDocumentId: string;
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variances: any[];
  totalDelta: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claimData: any;
  orgId: string;
  userId: string;
  documentName: string;
}) {
  const {
    generatedDocumentId,
    claimId,
    variances,
    totalDelta,
    claimData,
    orgId,
    userId: _userId,
    documentName,
  } = params;

  try {
    // Update status to generating
    await updateDocumentStatus(generatedDocumentId, "generating");

    // STEP 1: Generate AI narrative sections
    const result = await generateSupplement({
      claimId,
      variances,
      claimData: {
        propertyAddress: claimData.property_address,
        lossDate: claimData.loss_date?.toISOString().split("T")[0] || "",
        lossType: claimData.loss_type || "",
        policyNumber: claimData.policy_number,
        insured_name: claimData.insured_name,
        carrier: claimData.carrier_name,
      },
    });

    // STEP 2: Generate PDF
    const branding = await getOrgBranding(db, orgId);

    const pdfData = {
      supplementName: documentName,
      propertyAddress: claimData.property_address,
      lossDate: claimData.loss_date?.toISOString().split("T")[0] || "",
      lossType: claimData.loss_type || "",
      generatedAt: new Date(),
      variances,
      sections: result.sections,
      totalDelta,
      orgName: branding.orgName,
      brandLogoUrl: branding.brandLogoUrl,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await renderToStream(<SupplementPDFDocument data={pdfData as any} />);

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

        const filePath = `${orgId}/${claimId}/supplement-${generatedDocumentId}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from(bucket).getPublicUrl(filePath);
          fileUrl = publicUrl;
        } else {
          logger.warn("[SUPPLEMENT] PDF upload failed, document saved without file", {
            error: uploadError.message,
          });
        }
      } else {
        logger.warn("[SUPPLEMENT] Supabase not configured, PDF not persisted");
      }
    } catch (uploadErr) {
      logger.warn("[SUPPLEMENT] PDF upload error (non-fatal)", uploadErr);
    }

    // STEP 3: Update document status to ready
    await updateDocumentStatus(generatedDocumentId, "ready", {
      fileUrl,
      fileSizeBytes,
      generatedContent: {
        variances,
        sections: result.sections,
        stats: {
          varianceCount: variances.length,
          totalDelta,
        },
      },
      tokensUsed: result.tokensUsed,
      estimatedCostCents: result.estimatedCostCents,
    });

    logger.debug(`Supplement ${generatedDocumentId} generated successfully`);
  } catch (error) {
    logger.error("Supplement async generation error:", error);

    // Update document status to error
    await updateDocumentStatus(generatedDocumentId, "error", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

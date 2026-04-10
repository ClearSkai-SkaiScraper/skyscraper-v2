/**
 * Generated Document Download Route
 *
 * GET /api/generated-documents/[id]/download
 * Downloads PDFs for all document types: PROPOSAL, PACKET, SUPPLEMENT, REBUTTAL, CLAIM_MASTER
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ContractorPacketPDFDocument } from "@/lib/pdf/contractorPacketRenderer";
import { ProposalPDFDocument } from "@/lib/pdf/proposalRenderer";
import { RebuttalPDFDocument } from "@/lib/pdf/rebuttalRenderer";
import { SupplementPDFDocument } from "@/lib/pdf/supplementRenderer";
import { getOrgBranding, sanitizeFilename } from "@/lib/pdf/utils";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { id } = await routeParams!.params;

    // Fetch document
    const result = await db.query(
      `SELECT 
        id,
        organization_id,
        type,
        document_name,
        status,
        generated_content,
        file_url
      FROM generated_documents
      WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const document = result.rows[0];

    // Check if document is ready
    if (document.status !== "ready" && document.status !== "signed") {
      return NextResponse.json(
        { error: `Document is not ready (status: ${document.status})` },
        { status: 400 }
      );
    }

    // If file_url exists, redirect to it (future: when we have cloud storage)
    if (document.file_url) {
      return NextResponse.redirect(document.file_url);
    }

    // Otherwise, generate PDF on the fly based on type
    const branding = await getOrgBranding(db, orgId);
    const generatedContent = document.generated_content;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stream: any;
    let filename: string;

    switch (document.type) {
      case "PROPOSAL":
        stream = await renderToStream(
          <ProposalPDFDocument
            data={{
              projectName: generatedContent.projectName || document.document_name,
              propertyAddress: generatedContent.propertyAddress || "",
              lossType: generatedContent.lossType || "",
              generatedAt: new Date().toISOString(),
              sections: generatedContent.sections || [],
              totalTokensUsed: generatedContent.totalTokensUsed || 0,
              orgName: branding.orgName,
              brandLogoUrl: branding.brandLogoUrl,
            }}
          />
        );
        filename = `${sanitizeFilename(document.document_name)}_Proposal.pdf`;
        break;

      case "PACKET":
        stream = await renderToStream(
          <ContractorPacketPDFDocument
            data={{
              packetName: document.document_name,
              sections: generatedContent.sections || [],
              exportFormat: "pdf",
              generatedAt: new Date().toISOString(),
              sectionContents: generatedContent.sectionContents || {},
              orgName: branding.orgName,
              brandLogoUrl: branding.brandLogoUrl,
            }}
          />
        );
        filename = `${sanitizeFilename(document.document_name)}_Packet.pdf`;
        break;

      case "SUPPLEMENT":
        stream = await renderToStream(
          <SupplementPDFDocument
            data={{
              supplementName: document.document_name,
              propertyAddress: generatedContent.propertyAddress || "",
              lossDate: generatedContent.lossDate || "",
              lossType: generatedContent.lossType || "",
              generatedAt: new Date(),
              variances: generatedContent.variances || [],
              sections: generatedContent.sections || [],
              totalDelta: generatedContent.stats?.totalDelta || 0,
              orgName: branding.orgName || "",
              brandLogoUrl: branding.brandLogoUrl,
            }}
          />
        );
        filename = `${sanitizeFilename(document.document_name)}_Supplement.pdf`;
        break;

      case "REBUTTAL":
        stream = await renderToStream(
          <RebuttalPDFDocument
            data={{
              rebuttalName: document.document_name,
              propertyAddress: generatedContent.propertyAddress || "",
              lossDate: generatedContent.lossDate || "",
              lossType: generatedContent.lossType || "",
              policyNumber: generatedContent.policyNumber,
              carrier: generatedContent.carrier || "Insurance Carrier",
              adjusterName: generatedContent.adjusterName,
              generatedAt: new Date(),
              sections: generatedContent.sections || [],
              attachments: generatedContent.evidenceReferences
                ? [
                    ...(generatedContent.evidenceReferences.photos || []).map(
                      (p: string) => `Photo: ${p}`
                    ),
                    ...(generatedContent.evidenceReferences.measurements || []).map(
                      (m: string) => `Measurement: ${m}`
                    ),
                    ...(generatedContent.evidenceReferences.codes || []).map(
                      (c: string) => `Building Code: ${c}`
                    ),
                  ]
                : undefined,
              orgName: branding.orgName || "",
              brandLogoUrl: branding.brandLogoUrl,
            }}
          />
        );
        filename = `${sanitizeFilename(document.document_name)}_Rebuttal.pdf`;
        break;

      default:
        return NextResponse.json(
          { error: `Document type ${document.type} not supported for download` },
          { status: 400 }
        );
    }

    // Return PDF stream
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Document download error:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
});

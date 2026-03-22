export const dynamic = "force-dynamic";

/**
 * Claims Folder Export API
 * POST /api/claims-folder/export
 * Exports a claims folder to PDF, ZIP, or Xactimate ESX format
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { assembleClaimFolder } from "@/lib/claims-folder/folderAssembler";
import type { ClaimFolder, FolderSection } from "@/lib/claims-folder/folderSchema";
import { FOLDER_SECTIONS } from "@/lib/claims-folder/folderSchema";
import { generatePDFDocument, renderPDFBytes } from "@/lib/claims-folder/pdfBundler";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const ExportRequestSchema = z.object({
  claimId: z.string().min(1),
  format: z.enum(["pdf", "zip", "esx", "docx"]),
  sections: z.array(z.enum(FOLDER_SECTIONS as unknown as [string, ...string[]])).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { orgId, userId } = auth;

  // B-27: Rate limit claims folder exports
  const rl = await checkRateLimit(userId, "API");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();

    // Validate request
    const parsed = ExportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { claimId, format, sections } = parsed.data;

    // Verify claim belongs to this org
    await getOrgClaimOrThrow(orgId, claimId);

    // Assemble the folder data
    const result = await assembleClaimFolder({ claimId });

    if (!result.success || !result.folder) {
      return NextResponse.json(
        { success: false, error: "Failed to assemble claim folder", details: result.errors },
        { status: 400 }
      );
    }

    const folder: ClaimFolder = result.folder;

    // Determine which sections to include
    const includeSections: FolderSection[] = sections
      ? (sections as FolderSection[])
      : (FOLDER_SECTIONS as unknown as FolderSection[]);

    switch (format) {
      case "pdf": {
        // Generate PDF document
        const pdfDoc = generatePDFDocument(folder, includeSections);
        const pdfBytes = await renderPDFBytes(pdfDoc);

        return new NextResponse(new Uint8Array(pdfBytes), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="claim-${claimId}-package.pdf"`,
            "Content-Length": String(pdfBytes.length),
          },
        });
      }

      case "zip": {
        // Export as structured JSON bundle (ZIP requires additional server dependencies)
        const bundleContent = JSON.stringify(
          {
            claim: claimId,
            folder,
            sections: includeSections,
            generatedAt: new Date().toISOString(),
          },
          null,
          2
        );
        const bundleBytes = new TextEncoder().encode(bundleContent);

        return new NextResponse(bundleBytes, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="claim-${claimId}-bundle.json"`,
            "Content-Length": String(bundleBytes.length),
          },
        });
      }

      case "esx": {
        // Xactimate ESX format - XML-based
        const esxContent = generateXactimateESX(folder);
        const esxBytes = new TextEncoder().encode(esxContent);

        return new NextResponse(esxBytes, {
          status: 200,
          headers: {
            "Content-Type": "application/xml",
            "Content-Disposition": `attachment; filename="claim-${claimId}.esx"`,
            "Content-Length": String(esxBytes.length),
          },
        });
      }

      case "docx":
        return NextResponse.json(
          { success: false, error: "DOCX export coming soon" },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { success: false, error: "Unsupported export format" },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }
    logger.error("Error in claims folder export:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// Generate Xactimate-compatible ESX format
function generateXactimateESX(folder: ClaimFolder): string {
  const cover = folder.coverSheet;
  const scope = folder.scopePricing;

  return `<?xml version="1.0" encoding="UTF-8"?>
<ESX version="1.0">
  <Header>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <ExportSource>SkaiScraper Claims Documentation System</ExportSource>
  </Header>
  <Claim>
    <ClaimNumber>${cover?.claimNumber || ""}</ClaimNumber>
    <PolicyNumber>${cover?.policyNumber || ""}</PolicyNumber>
    <DateOfLoss>${cover?.dateOfLoss || ""}</DateOfLoss>
    <Insured>
      <Name>${cover?.insured_name || cover?.policyholderName || ""}</Name>
      <Address>${cover?.propertyAddress || ""}</Address>
    </Insured>
    <Carrier>
      <Name>${cover?.carrier || ""}</Name>
    </Carrier>
  </Claim>
  <Estimate>
    <TotalRCV>${scope?.grandTotal || 0}</TotalRCV>
    <TotalACV>${scope?.subtotal || 0}</TotalACV>
    <Depreciation>${scope?.overheadAndProfit?.amount || 0}</Depreciation>
    <Deductible>${scope?.permitFees || 0}</Deductible>
    <LineItems>
${
  scope?.lineItems
    ?.map(
      (item) => `      <Item>
        <Description>${item.description}</Description>
        <Quantity>${item.quantity}</Quantity>
        <Unit>${item.unit}</Unit>
        <UnitPrice>${item.unitPrice || 0}</UnitPrice>
        <Total>${item.total || 0}</Total>
      </Item>`
    )
    .join("\n") || ""
}
    </LineItems>
  </Estimate>
  <Documentation>
    <Photos>${folder.photos?.length || 0}</Photos>
    <WeatherVerified>${folder.sectionStatus?.weatherCauseOfLoss === "complete"}</WeatherVerified>
    <CodeCompliance>${folder.sectionStatus?.codeCompliance === "complete"}</CodeCompliance>
  </Documentation>
</ESX>`;
}

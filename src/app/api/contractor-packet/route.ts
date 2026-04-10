export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";

// POST /api/contractor-packet - Create new contractor packet generation job
export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const {
      sections = [],
      format = "pdf",
      claimId,
      jobId,
      notes,
      packetName = "Contractor Packet",
    } = body;

    // Validate required fields
    if (!sections || sections.length === 0) {
      return NextResponse.json({ error: "At least one section is required" }, { status: 400 });
    }

    // Create contractor packet record
    const insertRes = await db.query(
      `
      INSERT INTO contractor_packets (
        organization_id,
        packet_name,
        sections,
        export_format,
        claim_id,
        job_id,
        notes,
        status,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING id
      `,
      [
        orgId,
        packetName,
        sections,
        format,
        claimId || null,
        jobId || null,
        notes || null,
        "generating",
        userId,
      ]
    );

    const packetId = insertRes.rows[0]?.id;
    if (!packetId) {
      return NextResponse.json({ error: "Failed to create packet" }, { status: 500 });
    }

    // Start async generation (non-blocking)
    generateContractorPacketAsync(packetId, orgId, sections, format, claimId, jobId).catch(
      (err) => {
        logger.error("[Contractor Packet] Async generation failed:", err);
      }
    );

    return NextResponse.json({
      packetId,
      status: "generating",
      message: "Contractor packet generation started",
    });
  } catch (error) {
    logger.error("[Contractor Packet] Error creating packet:", error);
    return NextResponse.json({ error: "Failed to create contractor packet" }, { status: 500 });
  }
});

// GET /api/contractor-packet - List recent contractor packets
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const packetsRes = await db.query(
      `
      SELECT 
        id,
        packet_name,
        sections,
        export_format,
        claim_id,
        job_id,
        status,
        file_url,
        tokens_used,
        created_at,
        updated_at
      FROM contractor_packets
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [orgId]
    );

    return NextResponse.json({ packets: packetsRes.rows });
  } catch (error) {
    logger.error("[Contractor Packet] Error listing packets:", error);
    return NextResponse.json({ error: "Failed to list contractor packets" }, { status: 500 });
  }
});

// ============================================================================
// ASYNC GENERATION WORKER
// ============================================================================

async function generateContractorPacketAsync(
  packetId: string,
  orgId: string,
  sections: string[],
  format: string,
  claimId?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  jobId?: string
) {
  logger.debug(`[Contractor Packet] Starting generation for ${packetId}`);

  try {
    // Pull real data from claim if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let claimData: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let claimPhotos: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let claimDocuments: any[] = [];

    if (claimId) {
      // Fetch claim details
      const claimRes = await db.query(
        `SELECT * FROM claims WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [claimId, orgId]
      );
      claimData = claimRes.rows?.[0] || null;

      // Fetch claim photos
      const photosRes = await db.query(
        `SELECT id, filename, category, note, "publicUrl", "storageKey" 
         FROM file_assets 
         WHERE "claimId" = $1 AND "orgId" = $2 
         ORDER BY "createdAt" DESC 
         LIMIT 50`,
        [claimId, orgId]
      );
      claimPhotos = photosRes.rows || [];

      // Fetch claim documents
      const docsRes = await db.query(
        `SELECT id, "fileName", "fileType", "publicUrl" 
         FROM claim_documents 
         WHERE "claimId" = $1 AND "orgId" = $2 
         ORDER BY "createdAt" DESC 
         LIMIT 20`,
        [claimId, orgId]
      );
      claimDocuments = docsRes.rows || [];
    }

    // Fetch org branding
    const brandRes = await db.query(
      `SELECT company_name, brand_color, phone, email, website, license_number, logo_url, headshot_url
       FROM organization_branding WHERE organization_id = $1 LIMIT 1`,
      [orgId]
    );
    const branding = brandRes.rows?.[0] || {};

    // Fetch AI-generated sections if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aiSections: Record<string, any> = {};
    if (claimId) {
      try {
        const aiRes = await db.query(
          `SELECT section_key, content FROM ai_sections 
           WHERE claim_id = $1 AND organization_id = $2`,
          [claimId, orgId]
        );
        for (const row of aiRes.rows || []) {
          aiSections[row.section_key] = row.content;
        }
      } catch {
        // AI sections table may not exist yet — non-blocking
      }
    }

    // Build section content from real data or intelligent placeholders
    const sectionContents = sections.map((sectionKey) => {
      // Check for AI-generated content first
      if (aiSections[sectionKey]) {
        return { sectionKey, content: aiSections[sectionKey] };
      }

      // Build content from claim data
      switch (sectionKey) {
        case "cover":
          return {
            sectionKey,
            content: claimData
              ? `Property: ${claimData.property_address || "N/A"}\nClaim #: ${claimData.claim_number || "N/A"}\nDate of Loss: ${claimData.date_of_loss || "N/A"}\nPrepared by: ${branding.company_name || "Your Company"}`
              : "No claim selected — attach a claim to populate cover page data.",
          };

        case "executive-summary":
          return {
            sectionKey,
            content: claimData
              ? `This contractor packet documents the property damage at ${claimData.property_address || "the subject property"}. The loss occurred on ${claimData.date_of_loss || "N/A"} and has been classified as ${claimData.loss_type || "property damage"}. This packet includes ${sections.length} sections of supporting documentation for carrier review.`
              : "Run the AI Executive Summary engine to auto-generate this section from claim data.",
          };

        case "weather-verification":
          return {
            sectionKey,
            content: claimData?.date_of_loss
              ? `Weather verification for ${claimData.date_of_loss} at ${claimData.property_address || "subject property"}. Run the AI Weather engine to pull NOAA data automatically.`
              : "Run the AI Weather Verification engine to pull NOAA storm data for the date of loss.",
          };

        case "photo-evidence":
          return {
            sectionKey,
            content:
              claimPhotos.length > 0
                ? `${claimPhotos.length} photos documented.\n\n${claimPhotos.map((p, i) => `${i + 1}. ${p.filename} — ${p.category || "general"}${p.note ? ` (${p.note})` : ""}`).join("\n")}`
                : "No photos uploaded yet. Upload photos in the Claim Workspace to include them.",
          };

        case "scope-matrix":
          return {
            sectionKey,
            content:
              "Line items will be populated from the claim scope. Use the Supplement Builder to add detailed line items with Xactimate codes.",
          };

        case "code-compliance":
          return {
            sectionKey,
            content:
              "Run the AI Code Compliance engine to auto-generate IRC and manufacturer requirement citations.",
          };

        case "supplements":
          return {
            sectionKey,
            content:
              "Supplement items will be populated from the Supplement Builder. Create supplements to identify items missing from the carrier's scope.",
          };

        case "signature-page":
          return {
            sectionKey,
            content: `Prepared by: ${branding.company_name || "Your Company"}\nLicense #: ${branding.license_number || "N/A"}\nPhone: ${branding.phone || "N/A"}\nEmail: ${branding.email || "N/A"}`,
          };

        case "attachments-index":
          return {
            sectionKey,
            content:
              claimDocuments.length > 0
                ? `${claimDocuments.length} attachments:\n\n${claimDocuments.map((d, i) => `${i + 1}. ${d.fileName} (${d.fileType || "document"})`).join("\n")}`
                : "No attachments yet. Upload documents in the Claim Workspace.",
          };

        default:
          return {
            sectionKey,
            content: `Section "${sectionKey}" — run the AI engine or add content in the Claim Workspace to populate this section.`,
          };
      }
    });

    const generatedContent = {
      sections: sectionContents,
      generatedAt: new Date().toISOString(),
      format,
      claimId: claimId || null,
      photoCount: claimPhotos.length,
      documentCount: claimDocuments.length,
    };

    // Update status to ready
    await db.query(
      `
      UPDATE contractor_packets
      SET 
        status = $1,
        generated_content = $2,
        updated_at = NOW()
      WHERE id = $3 AND organization_id = $4
      `,
      ["ready", JSON.stringify(generatedContent), packetId, orgId]
    );

    // ── Save to report_history so it appears on Reports History page ──
    await saveReportHistory({
      orgId,
      userId: "system",
      type: "contractor_packet",
      title: `Contractor Packet — ${new Date().toLocaleDateString("en-US")}`,
      sourceId: claimId || packetId,
      fileUrl: null,
      metadata: {
        packetId,
        claimId: claimId || null,
      },
    });

    // ── Save to claim_documents so it appears on the claim's Documents tab ──
    if (claimId) {
      try {
        await db.query(
          `INSERT INTO claim_documents (
            id, "claimId", "orgId", "fileName", "fileType",
            "publicUrl", "visibleToClient", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, 'PDF',
            $4, false, NOW(), NOW()
          )
          ON CONFLICT DO NOTHING`,
          [
            claimId,
            orgId,
            `Contractor Packet — ${new Date().toLocaleDateString("en-US")}`,
            `/api/contractor-packet/${packetId}/download`,
          ]
        );
      } catch (cdErr) {
        // claim_documents table may not exist yet — non-blocking
        logger.warn("[Contractor Packet] Could not save to claim_documents:", cdErr);
      }
    }

    logger.debug(`[Contractor Packet] ✓ Generation complete for ${packetId}`);
  } catch (error) {
    logger.error(`[Contractor Packet] Generation failed for ${packetId}:`, error);

    // Update status to failed
    await db.query(
      `
      UPDATE contractor_packets
      SET 
        status = $1,
        error_message = $2,
        updated_at = NOW()
      WHERE id = $3 AND organization_id = $4
      `,
      [
        "failed",
        error instanceof Error ? error.message : "Unknown error during generation",
        packetId,
        orgId,
      ]
    );
  }
}

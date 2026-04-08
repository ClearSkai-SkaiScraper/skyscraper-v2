export const dynamic = "force-dynamic";
export const revalidate = 0;

import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ContractorPacketPDFDocument } from "@/lib/pdf/contractorPacketRenderer";
import { getOrgBranding, sanitizeFilename } from "@/lib/pdf/utils";

export const GET = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { id: packetId } = await routeParams.params;

    // Fetch packet
    const result = await db.query(
      `
      SELECT 
        id,
        organization_id,
        packet_name,
        sections,
        export_format,
        status,
        generated_content,
        file_url
      FROM contractor_packets
      WHERE id = $1 AND organization_id = $2
      LIMIT 1
      `,
      [packetId, orgId]
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: "Contractor packet not found" }, { status: 404 });
    }

    const packet = result.rows[0];

    if (packet.status !== "ready") {
      return NextResponse.json(
        { error: "Contractor packet is not ready for download", status: packet.status },
        { status: 400 }
      );
    }

    if (!packet.generated_content) {
      return NextResponse.json({ error: "No content available" }, { status: 400 });
    }

    // Parse generated content
    const generatedPacket = JSON.parse(packet.generated_content);

    // Fetch org branding
    const branding = await getOrgBranding(db, orgId);

    // Only generate PDF for PDF format, otherwise return text
    if (packet.export_format === "pdf") {
      const pdfData = {
        packetName: packet.packet_name,
        sections: packet.sections,
        exportFormat: packet.export_format,
        generatedAt: generatedPacket.generatedAt,
        sectionContents: generatedPacket.sections || [],
        orgName: branding.orgName,
        brandLogoUrl: branding.brandLogoUrl,
      };

      const stream = await renderToStream(<ContractorPacketPDFDocument data={pdfData} />);
      const filename = `${sanitizeFilename(packet.packet_name)}.pdf`;

      return new NextResponse(stream as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // For DOCX and ZIP, return text file for now (TODO: implement proper converters)
    let textContent = `
====================================
${packet.packet_name.toUpperCase()}
====================================

Generated: ${new Date().toLocaleDateString()}
Format: ${packet.export_format.toUpperCase()}

Sections Included:
${packet.sections.map((s: string) => `- ${s}`).join("\n")}

`;

    for (const section of generatedPacket.sections || []) {
      textContent += `\n\n--- ${section.sectionKey.toUpperCase().replace(/-/g, " ")} ---\n\n`;
      if (section.content) {
        textContent +=
          typeof section.content === "string"
            ? section.content
            : JSON.stringify(section.content, null, 2);
      }
    }

    const filename = `${sanitizeFilename(packet.packet_name)}.txt`;
    return new NextResponse(textContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("[Contractor Packet] Error downloading packet:", error);
    return NextResponse.json({ error: "Failed to download contractor packet" }, { status: 500 });
  }
});

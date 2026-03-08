export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getResolvedOrgId } from "@/lib/auth/getResolvedOrgId";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getResolvedOrgId();

    const packetId = params.id;

    // Fetch packet with all details
    const result = await db.query(
      `
      SELECT 
        id,
        organization_id,
        packet_name,
        sections,
        export_format,
        claim_id,
        job_id,
        notes,
        status,
        generated_content,
        file_url,
        error_message,
        tokens_used,
        created_by,
        created_at,
        updated_at
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

    return NextResponse.json({
      id: packet.id,
      packetName: packet.packet_name,
      sections: packet.sections,
      exportFormat: packet.export_format,
      claimId: packet.claim_id,
      jobId: packet.job_id,
      notes: packet.notes,
      status: packet.status,
      generatedContent: packet.generated_content,
      fileUrl: packet.file_url,
      errorMessage: packet.error_message,
      tokensUsed: packet.tokens_used,
      createdAt: packet.created_at,
      updatedAt: packet.updated_at,
    });
  } catch (error) {
    logger.error("[Contractor Packet] Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractor packet status" },
      { status: 500 }
    );
  }
}

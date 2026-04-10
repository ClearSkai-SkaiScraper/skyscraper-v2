export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/portal/documents/[claimId]
 *
 * Returns shared documents for a claim in the client portal.
 * Only returns documents that have been explicitly shared via document_links.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const { claimId } = await params;

    // Verify client access through property → contact email
    const accessCheck = await prisma.$queryRaw<{ id: string; orgId: string }[]>`
      SELECT cl.id, cl."orgId" FROM claims cl
      JOIN properties p ON p.id = cl."propertyId"
      JOIN contacts c ON c.id = p."contactId"
      WHERE cl.id = ${claimId}
        AND LOWER(c.email) = LOWER(${email})
      LIMIT 1
    `;

    if (!accessCheck.length) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claimOrgId = accessCheck[0].orgId;

    // Fetch shared documents via document_links table
    let documents: any[] = [];
    try {
      documents = await prisma.$queryRaw`
        SELECT
          dl.id,
          dl.title,
          dl.url,
          dl."fileType" as "fileType",
          dl."sharedAt" as "sharedAt",
          dl."expiresAt" as "expiresAt"
        FROM document_links dl
        WHERE dl."claimId" = ${claimId}
          AND dl."orgId" = ${claimOrgId}
          AND dl."isActive" = true
          AND (dl."expiresAt" IS NULL OR dl."expiresAt" > NOW())
        ORDER BY dl."sharedAt" DESC
      `;
    } catch {
      // document_links table may not exist yet — fall back to raw SQL on documents
      try {
        documents = await prisma.$queryRaw`
          SELECT d.id, d.title, d.url, d.type as "fileType", d."createdAt" as "sharedAt"
          FROM documents d
          JOIN projects proj ON proj.id = d."projectId"
          WHERE proj."claimId" = ${claimId}
            AND proj."orgId" = ${claimOrgId}
            AND d."isPublic" = true
          ORDER BY d."createdAt" DESC
        `;
      } catch {
        documents = [];
      }
    }

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error("[PORTAL_DOCUMENTS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

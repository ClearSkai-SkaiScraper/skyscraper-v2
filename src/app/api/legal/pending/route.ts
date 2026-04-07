import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { LEGAL_DOCUMENTS } from "@/lib/legal/config";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // Get all required documents
    const allDocs = LEGAL_DOCUMENTS.filter((doc) => doc.required);

    // Get user's acceptances (orgId not in schema, filter by userId only)
    const acceptances = await prisma.legal_acceptances.findMany({
      where: {
        userId,
      },
      select: {
        documentId: true,
        version: true,
      },
    });

    // Create a set of accepted doc keys
    const acceptedKeys = new Set(acceptances.map((a) => `${a.documentId}:${a.version}`));

    // Find pending documents (not yet accepted or outdated version)
    const pending = allDocs.filter((doc) => !acceptedKeys.has(`${doc.id}:${doc.latestVersion}`));

    logger.debug(`[Legal Pending] User: ${userId} Org: ${orgId} Pending: ${pending.length}`);

    return NextResponse.json({
      pending: pending.map((doc) => ({
        id: doc.id,
        title: doc.title,
        latestVersion: doc.latestVersion,
      })),
    });
  } catch (error: unknown) {
    logger.error("[Legal Pending] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

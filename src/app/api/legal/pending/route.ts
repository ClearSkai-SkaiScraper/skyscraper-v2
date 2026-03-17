import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { LEGAL_DOCUMENTS } from "@/lib/legal/config";
import { logger } from "@/lib/logger";
import { ensureOrgForUser } from "@/lib/org/ensureOrgForUser";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org context
    const { orgId } = await ensureOrgForUser();

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
  } catch (error) {
    logger.error("[Legal Pending] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

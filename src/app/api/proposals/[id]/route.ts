export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PHASE 3 SPRINT 3: GET /api/proposals/[id]
 * Fetches a proposal draft with metadata and files
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Authenticate user
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Fetch proposal draft with files
    const draft = await prisma.proposal_drafts.findUnique({
      where: { id },
      include: {
        proposal_files: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Verify org ownership
    if (draft.org_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(draft);
  } catch (error) {
    logger.error("[API] /api/proposals/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch proposal",
        details: "Internal error",
      },
      { status: 500 }
    );
  }
}

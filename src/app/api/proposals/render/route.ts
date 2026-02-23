export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PHASE 3 SPRINT 3: POST /api/proposals/render
 * Renders a proposal draft to PDF and uploads to storage
 */

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { renderProposalPdf } from "@/lib/proposals/render";
import type { ProposalRenderRequest, ProposalRenderResponse } from "@/lib/proposals/types";

export async function POST(request: Request) {
  try {
    // Dynamic import to avoid build-time Clerk initialization
    const { auth } = await import("@clerk/nextjs/server");

    // Authenticate user
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: ProposalRenderRequest = await request.json();
    const { draftId, template, options } = body;

    if (!draftId || !template) {
      return NextResponse.json(
        { error: "Missing required fields: draftId, template" },
        { status: 400 }
      );
    }

    // Fetch proposal draft to verify ownership
    const draft = await prisma.proposal_drafts.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Verify org ownership
    if (draft.org_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Render PDF
    const result = await renderProposalPdf({
      draftId,
      template,
      options,
    });

    // Track analytics: proposal.render.succeeded
    logger.info("[Analytics] proposal.render.succeeded", {
      userId,
      orgId,
      proposalId: result.proposalId,
      fileId: result.fileId,
      packetType: draft.packet_type,
      fileSize: result.fileSize,
      pages: result.pages,
    });

    const response: ProposalRenderResponse = {
      proposalId: result.proposalId,
      fileId: result.fileId,
      pdfUrl: result.pdfUrl,
      pages: result.pages,
      fileSize: result.fileSize,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[API] /api/proposals/render error:", error);
    return NextResponse.json(
      {
        error: "Failed to render proposal",
        details: "Internal error",
      },
      { status: 500 }
    );
  }
}

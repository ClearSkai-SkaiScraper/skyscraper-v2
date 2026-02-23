/**
 * ============================================================================
 * CLAIM NOTES API
 * ============================================================================
 *
 * GET  /api/claims/[claimId]/notes  — List notes for a claim
 * POST /api/claims/[claimId]/notes  — Add a note to a claim
 *
 * Notes are stored as claim_timeline_events with type "internal_note"
 * or "note" (client-visible).
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/notes
 * List all notes for a claim
 */
export const GET = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      const events = await prisma.claim_timeline_events.findMany({
        where: {
          claim_id: claimId,
          type: { in: ["internal_note", "note"] },
        },
        orderBy: { occurred_at: "desc" },
        include: {
          users: {
            select: { name: true, email: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        notes: events.map((e) => ({
          id: e.id,
          content: e.description || "",
          isClientVisible: e.visible_to_client,
          createdAt: e.occurred_at,
          authorName: e.users ? e.users.name || e.users.email : "System",
        })),
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Notes GET] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch notes" },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/claims/[claimId]/notes
 * Add a new note
 */
export const POST = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      const body = await req.json();
      const { content, isClientVisible } = body;

      if (!content?.trim()) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
      }

      const note = await prisma.claim_timeline_events.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          org_id: orgId,
          actor_id: userId,
          actor_type: "user",
          type: isClientVisible ? "note" : "internal_note",
          description: content,
          visible_to_client: isClientVisible || false,
          occurred_at: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: true,
          note: {
            id: note.id,
            content: note.description,
            isClientVisible: note.visible_to_client,
            createdAt: note.occurred_at,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Notes POST] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to add note" },
        { status: 500 }
      );
    }
  }
);

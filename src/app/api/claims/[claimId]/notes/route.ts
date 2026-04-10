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

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const noteSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(10000, "Content too long"),
  isClientVisible: z.boolean().optional().default(false),
});

/**
 * GET /api/claims/[claimId]/notes
 * List all notes for a claim
 */
export const GET = withAuth(
  async (
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
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

      const raw = await req.json();
      const parsed = noteSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const { content, isClientVisible } = parsed.data;

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
      return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
    }
  }
);

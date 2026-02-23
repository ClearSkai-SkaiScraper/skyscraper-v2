/**
 * ============================================================================
 * DELETE /api/claims/[claimId]/notes/[noteId]
 * ============================================================================
 *
 * Deletes a single note (claim_timeline_events record).
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const DELETE = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string; noteId: string }> }
  ) => {
    try {
      const { claimId, noteId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      // Verify note belongs to this claim
      const note = await prisma.claim_timeline_events.findFirst({
        where: {
          id: noteId,
          claim_id: claimId,
          type: { in: ["internal_note", "note"] },
        },
      });

      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      await prisma.claim_timeline_events.delete({
        where: { id: noteId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Notes DELETE] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete note" },
        { status: 500 }
      );
    }
  }
);

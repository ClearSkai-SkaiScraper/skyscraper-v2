/**
 * ============================================================================
 * CLAIM TIMELINE API
 * ============================================================================
 *
 * GET    /api/claims/[claimId]/timeline  — List timeline events
 * POST   /api/claims/[claimId]/timeline  — Add a timeline event
 * DELETE /api/claims/[claimId]/timeline  — Remove a timeline event
 *
 * Uses the claim_timeline_events Prisma model.
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
 * GET /api/claims/[claimId]/timeline
 * List all timeline events for a claim
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
        where: { claim_id: claimId },
        orderBy: { occurred_at: "desc" },
        include: {
          users: {
            select: { name: true, email: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        events: events.map((e) => ({
          id: e.id,
          title: e.type,
          description: e.description,
          eventType: e.type,
          createdAt: e.occurred_at,
          createdBy: e.users ? e.users.name || e.users.email : "System",
          visibleToClient: e.visible_to_client,
        })),
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Timeline GET] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch timeline" },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/claims/[claimId]/timeline
 * Add a new timeline event
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
      const { title, description, eventType } = body;

      if (!title?.trim()) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }

      const event = await prisma.claim_timeline_events.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          org_id: orgId,
          actor_id: userId,
          actor_type: "user",
          type: eventType || "other",
          description: `${title}: ${description || ""}`.trim(),
          visible_to_client: false,
          occurred_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        event: {
          id: event.id,
          title: event.type,
          description: event.description,
          eventType: event.type,
          createdAt: event.occurred_at,
          createdBy: "You",
        },
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Timeline POST] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to add event" },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/claims/[claimId]/timeline
 * Remove a timeline event. Body: { eventId }
 */
export const DELETE = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      const body = await req.json();
      const { eventId } = body;

      if (!eventId) {
        return NextResponse.json({ error: "eventId is required" }, { status: 400 });
      }

      // Verify event belongs to this claim
      const event = await prisma.claim_timeline_events.findFirst({
        where: { id: eventId, claim_id: claimId },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      await prisma.claim_timeline_events.delete({
        where: { id: eventId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Timeline DELETE] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete event" },
        { status: 500 }
      );
    }
  }
);

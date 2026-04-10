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

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { timelineCreateSchema, timelineDeleteSchema } from "@/lib/validation/claim-schemas";
import { isValidationError, validateBody } from "@/lib/validation/middleware";

/**
 * GET /api/claims/[claimId]/timeline
 * List all timeline events for a claim, enriched with weather data
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const claim = await getOrgClaimOrThrow(orgId, claimId);

      // Fetch claim with related data for enriched timeline
      const claimData = await prisma.claims.findFirst({
        where: { id: claimId, orgId },
        include: {
          storm_events: true,
          weather_reports: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          inspections: {
            orderBy: { scheduledAt: "desc" },
          },
          reports: {
            orderBy: { createdAt: "desc" },
          },
          supplements: {
            orderBy: { created_at: "desc" },
          },
          claim_payments: {
            orderBy: { paid_at: "desc" },
          },
        },
      });

      const events = await prisma.claim_timeline_events.findMany({
        where: { claim_id: claimId },
        orderBy: { occurred_at: "desc" },
        include: {
          users: {
            select: { name: true, email: true },
          },
        },
      });

      // Build enriched timeline
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrichedEvents: any[] = [];

      // Add storm event if linked (single relation via catStormEventId)
      if (claimData?.storm_events) {
        const storm = claimData.storm_events;
        enrichedEvents.push({
          id: `storm-${storm.id}`,
          type: "storm_event",
          title: `${storm.eventType || "Storm"} Event Detected`,
          description: storm.impactSummary || "Storm detected in area",
          occurredAt: storm.stormStartTime || storm.createdAt,
          metadata: {
            weatherData: {
              peril: storm.eventType,
              hailSize: storm.hailSizeMax ? Number(storm.hailSizeMax) : null,
              windSpeed: storm.windSpeedMax ? Number(storm.windSpeedMax) : null,
              confidence: storm.aiConfidence ? Number(storm.aiConfidence) : null,
            },
          },
          status: "completed",
        });
      }

      // Add weather verification
      if (claimData?.weather_reports?.[0]) {
        const wr = claimData.weather_reports[0];
        enrichedEvents.push({
          id: `weather-${wr.id}`,
          type: "weather_verified",
          title: "Weather Verification Complete",
          description: `Primary peril: ${wr.primaryPeril || "Unknown"}`,
          occurredAt: wr.createdAt,
          metadata: {
            weatherData: {
              peril: wr.primaryPeril,
              confidence: wr.confidence,
            },
          },
          status: "completed",
        });
      }

      // Add claim creation
      if (claimData) {
        enrichedEvents.push({
          id: `claim-created-${claimData.id}`,
          type: "claim_created",
          title: "Claim Created",
          description: `Claim ${claimData.claimNumber} opened`,
          occurredAt: claimData.createdAt,
          status: "completed",
        });
      }

      // Add inspections
      for (const insp of claimData?.inspections || []) {
        enrichedEvents.push({
          id: `inspection-${insp.id}`,
          type: "inspection",
          title: "Inspection Completed",
          description: insp.notes || "Property inspection",
          occurredAt: insp.completedAt || insp.scheduledAt,
          status: "completed",
        });
      }

      // Add reports
      for (const rep of claimData?.reports || []) {
        enrichedEvents.push({
          id: `report-${rep.id}`,
          type: "report_generated",
          title: `${rep.title || "Report"} Generated`,
          occurredAt: rep.createdAt,
          status: "completed",
        });
      }

      // Add supplements
      for (const sup of claimData?.supplements || []) {
        enrichedEvents.push({
          id: `supplement-${sup.id}`,
          type: "supplement_submitted",
          title: "Supplement Submitted",
          description: sup.notes || "Additional scope",
          occurredAt: sup.created_at,
          metadata: { amount: sup.total },
          status: sup.status === "approved" ? "completed" : "in_progress",
        });
      }

      // Add payments
      for (const pay of claimData?.claim_payments || []) {
        enrichedEvents.push({
          id: `payment-${pay.id}`,
          type: "payment_received",
          title: "Payment Received",
          description: `$${((pay.amount_cents || 0) / 100).toLocaleString()}`,
          occurredAt: pay.paid_at,
          metadata: { amount: pay.amount_cents },
          status: "completed",
        });
      }

      // Add custom timeline events
      for (const e of events) {
        enrichedEvents.push({
          id: e.id,
          type: e.type,
          title: e.type.replace(/_/g, " "),
          description: e.description,
          occurredAt: e.occurred_at,
          createdBy: e.users ? e.users.name || e.users.email : "System",
          visibleToClient: e.visible_to_client,
          metadata: e.metadata,
          status: "completed",
        });
      }

      // Sort by date ascending
      enrichedEvents.sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
      );

      return NextResponse.json({
        success: true,
        claimNumber: claimData?.claimNumber,
        events: enrichedEvents,
        total: enrichedEvents.length,
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Timeline GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
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

      const body = await validateBody(req, timelineCreateSchema);
      if (isValidationError(body)) return body;
      const { title, description, eventType } = body;

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
      return NextResponse.json({ error: "Failed to add event" }, { status: 500 });
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      const body = await validateBody(req, timelineDeleteSchema);
      if (isValidationError(body)) return body;
      const { eventId } = body;

      // Verify event belongs to this claim and org
      const event = await prisma.claim_timeline_events.findFirst({
        where: { id: eventId, claim_id: claimId, org_id: orgId },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      await prisma.claim_timeline_events.deleteMany({
        where: { id: eventId, claim_id: claimId, org_id: orgId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Timeline DELETE] Error:", error);
      return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
    }
  }
);

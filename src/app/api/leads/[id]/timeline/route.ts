/**
 * GET /api/leads/[leadId]/timeline
 * Returns timeline events for a lead
 *
 * Uses Clerk-based withAuth (same pattern as the notes route) so that
 * browser requests authenticated via session cookies succeed.
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    const url = new URL(request.url);
    // URL shape: /api/leads/[id]/timeline  →  segments[-2] = id
    const leadId = url.pathname.split("/").slice(-2)[0];

    // Verify lead belongs to org
    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch timeline events
    const rows = await prisma.leadPipelineEvent.findMany({
      where: { leadId, orgId },
      orderBy: { createdAt: "asc" },
    });

    // Map to the shape the front-end TimelineEntry expects:
    //   { id, type, message, createdAt, metadata }
    const events = rows.map((e) => ({
      id: e.id,
      type: e.eventType,
      message:
        e.eventType === "note"
          ? (e.metadata as Record<string, unknown>)?.content || e.stageName
          : e.stageName,
      createdAt: e.createdAt.toISOString(),
      metadata: e.metadata,
    }));

    return NextResponse.json({ events, count: events.length });
  } catch (err) {
    logger.error("[Timeline API Error]:", err);
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }
});

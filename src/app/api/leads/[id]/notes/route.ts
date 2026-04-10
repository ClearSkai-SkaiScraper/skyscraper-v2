/**
 * ============================================================================
 * LEAD NOTES API
 * ============================================================================
 *
 * GET  /api/leads/[id]/notes  — List notes for a lead
 * POST /api/leads/[id]/notes  — Add a note to a lead
 *
 * Notes are stored as LeadPipelineEvent records with eventType = "note".
 * This keeps notes queryable via the existing timeline infrastructure.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    const url = new URL(request.url);
    const leadId = url.pathname.split("/").slice(-2)[0]; // /api/leads/[id]/notes

    // Verify lead belongs to org
    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch notes (stored as pipeline events with eventType "note")
    const noteEvents = await prisma.leadPipelineEvent.findMany({
      where: {
        leadId,
        orgId,
        eventType: "note",
      },
      orderBy: { createdAt: "desc" },
    });

    const notes = noteEvents.map((e) => ({
      id: e.id,
      content: (e.metadata as Record<string, unknown>)?.content || e.stageName || "",
      authorId: (e.metadata as Record<string, unknown>)?.authorId || null,
      authorName: (e.metadata as Record<string, unknown>)?.authorName || "Team Member",
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ notes });
  } catch (error) {
    logger.error("[Lead Notes GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    const url = new URL(request.url);
    const leadId = url.pathname.split("/").slice(-2)[0];
    const body = await request.json();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    }

    // Verify lead belongs to org
    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Look up user name for attribution
    let authorName = "Team Member";
    try {
      const user = await prisma.users.findFirst({
        where: { clerkUserId: userId },
        select: { name: true },
      });
      if (user?.name) authorName = user.name;
    } catch {
      // Non-critical — keep default
    }

    const noteEvent = await prisma.leadPipelineEvent.create({
      data: {
        id: crypto.randomUUID(),
        leadId,
        orgId,
        stageName: content.slice(0, 100), // Summary for timeline display
        eventType: "note",
        metadata: {
          content,
          authorId: userId,
          authorName,
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      note: {
        id: noteEvent.id,
        content,
        authorId: userId,
        authorName,
        createdAt: noteEvent.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[Lead Notes POST] Error:", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
});

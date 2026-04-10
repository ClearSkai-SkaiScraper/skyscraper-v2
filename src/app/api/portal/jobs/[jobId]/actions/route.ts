/**
 * Portal Jobs Actions - Unified action handler for job operations
 *
 * POST /api/portal/jobs/[jobId]/actions
 * Actions: update_status, add_timeline_event, add_note
 *
 * Uses claim_activities for timeline events and notes (no jobTimelineEvent / jobNote tables).
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_status"),
    status: z.string(),
  }),
  z.object({
    action: z.literal("add_timeline_event"),
    title: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_note"),
    content: z.string(),
  }),
]);

type ActionInput = z.infer<typeof ActionSchema>;

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;
    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Verify user has access to this job
    const client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const job = await prisma.clientWorkRequest.findFirst({
      where: {
        id: jobId,
        clientId: client.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    switch (input.action) {
      case "update_status":
        // ClientWorkRequest has no claimId — pass null for claim activity logging
        return handleUpdateStatus(jobId, userId, null, input);

      case "add_timeline_event":
        return handleAddTimelineEvent(jobId, userId, null, input);

      case "add_note":
        return handleAddNote(jobId, userId, null, input);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Portal Jobs Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleUpdateStatus(
  jobId: string,
  userId: string,
  claimId: string | null,
  input: Extract<ActionInput, { action: "update_status" }>
) {
  const updated = await prisma.clientWorkRequest.update({
    where: { id: jobId },
    data: { status: input.status },
  });

  // Log as claim activity if claim is linked
  if (claimId) {
    await prisma.claim_activities.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        user_id: userId,
        type: "STATUS_CHANGE",
        message: `Job status updated to ${input.status}`,
        metadata: { jobId },
      },
    });
  }

  return NextResponse.json({ success: true, job: updated });
}

async function handleAddTimelineEvent(
  jobId: string,
  userId: string,
  claimId: string | null,
  input: Extract<ActionInput, { action: "add_timeline_event" }>
) {
  // Store as claim_activities (no jobTimelineEvent table)
  const activity = claimId
    ? await prisma.claim_activities.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          user_id: userId,
          type: "NOTE",
          message: input.description ? `${input.title}: ${input.description}` : input.title,
          metadata: { jobId, eventSource: "job_timeline" },
        },
      })
    : { id: crypto.randomUUID(), message: input.title };

  return NextResponse.json({ success: true, event: activity });
}

async function handleAddNote(
  jobId: string,
  userId: string,
  claimId: string | null,
  input: Extract<ActionInput, { action: "add_note" }>
) {
  // Store as claim_activities (no jobNote table)
  const activity = claimId
    ? await prisma.claim_activities.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          user_id: userId,
          type: "NOTE",
          message: input.content,
          metadata: { jobId, eventSource: "job_note" },
        },
      })
    : { id: crypto.randomUUID(), message: input.content };

  return NextResponse.json({ success: true, note: activity });
}

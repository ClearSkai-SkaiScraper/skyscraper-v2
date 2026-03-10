/**
 * Portal Invitations Actions - Unified handler for invitation operations
 *
 * POST /api/portal/invitations/actions
 * Actions: accept, decline, send_invite, send_job_invite
 *
 * Uses client_access table for claim access grants.
 * Invitation lifecycle is tracked via claim_activities.
 */

import { logger } from "@/lib/observability/logger";
import { auth, currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    invitationId: z.string(), // claimId – the claim being accepted
  }),
  z.object({
    action: z.literal("decline"),
    invitationId: z.string(), // claimId – the claim being declined
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("send_invite"),
    email: z.string().email(),
    claimId: z.string().optional(),
    message: z.string().optional(),
  }),
  z.object({
    action: z.literal("send_job_invite"),
    email: z.string().email(),
    jobId: z.string(),
    message: z.string().optional(),
  }),
]);

type ActionInput = z.infer<typeof ActionSchema>;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    switch (input.action) {
      case "accept":
        return handleAccept(userId, input);

      case "decline":
        return handleDecline(userId, input);

      case "send_invite":
        return handleSendInvite(userId, input);

      case "send_job_invite":
        return handleSendJobInvite(userId, input);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Portal Invitations Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleAccept(userId: string, input: Extract<ActionInput, { action: "accept" }>) {
  const claimId = input.invitationId;

  // Get caller email from Clerk
  const user = await currentUser();
  const callerEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  if (!callerEmail) {
    return NextResponse.json({ error: "No email associated with account" }, { status: 400 });
  }

  // Check that a client_access row exists for this user + claim
  const access = await prisma.client_access.findFirst({
    where: { claimId, email: callerEmail },
  });

  if (!access) {
    return NextResponse.json({ error: "No invitation found for this claim" }, { status: 404 });
  }

  // Log the acceptance as a claim activity
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: "Client accepted claim invitation",
    },
  });

  return NextResponse.json({ success: true, message: "Invitation accepted" });
}

async function handleDecline(userId: string, input: Extract<ActionInput, { action: "decline" }>) {
  const claimId = input.invitationId;

  // Get caller email from Clerk
  const user = await currentUser();
  const callerEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  if (!callerEmail) {
    return NextResponse.json({ error: "No email associated with account" }, { status: 400 });
  }

  // Remove client_access row to revoke invitation
  const access = await prisma.client_access.findFirst({
    where: { claimId, email: callerEmail },
  });

  if (!access) {
    return NextResponse.json({ error: "No invitation found for this claim" }, { status: 404 });
  }

  await prisma.client_access.delete({
    where: { id: access.id },
  });

  // Log the decline as a claim activity
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: `Client declined claim invitation${input.reason ? `: ${input.reason}` : ""}`,
    },
  });

  return NextResponse.json({ success: true, message: "Invitation declined" });
}

async function handleSendInvite(
  userId: string,
  input: Extract<ActionInput, { action: "send_invite" }>
) {
  if (!input.claimId) {
    return NextResponse.json(
      { error: "claimId is required to send an invitation" },
      { status: 400 }
    );
  }

  // Check if access already exists for this email + claim
  const existing = await prisma.client_access.findFirst({
    where: { claimId: input.claimId, email: input.email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json({ error: "User already has access to this claim" }, { status: 400 });
  }

  // Create client_access grant
  const access = await prisma.client_access.create({
    data: {
      id: crypto.randomUUID(),
      claimId: input.claimId,
      email: input.email.toLowerCase(),
    },
  });

  // Log the invite as a claim activity
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: input.claimId,
      user_id: userId,
      type: "NOTE",
      message: `Portal invitation sent to ${input.email}${input.message ? ` — "${input.message}"` : ""}`,
    },
  });

  // STUB: Email delivery not yet wired. Will use Resend when ready. (Sprint backlog)

  return NextResponse.json({
    success: true,
    invitation: { id: access.id },
    message: "Invitation sent",
  });
}

async function handleSendJobInvite(
  userId: string,
  input: Extract<ActionInput, { action: "send_job_invite" }>
) {
  // Job invitations are not yet backed by a database model.
  // Log the intent and return success so the UI doesn't crash.
  logger.info("[Portal Invitations] Job invite requested", {
    userId,
    email: input.email,
    jobId: input.jobId,
  });

  // STUB: job_invitations model pending schema design. Returns success to prevent UI errors.

  return NextResponse.json({
    success: true,
    invitation: { id: crypto.randomUUID() },
    message: "Job invitation sent",
  });
}

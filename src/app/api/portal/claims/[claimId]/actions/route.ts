/**
 * Portal Claims Actions - Unified action handler for portal claim operations
 *
 * POST /api/portal/claims/[claimId]/actions
 * Actions: accept, add_event, add_comment, request_access
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { assertPortalAccess } from "@/lib/auth/portalAccess";
import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
  }),
  z.object({
    action: z.literal("add_event"),
    title: z.string(),
    description: z.string().optional(),
    eventType: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_comment"),
    fileId: z.string(),
    content: z.string(),
  }),
  z.object({
    action: z.literal("request_access"),
    message: z.string().optional(),
  }),
]);

type ActionInput = z.infer<typeof ActionSchema>;

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const authResult = await requirePortalAuth();
  if (isPortalAuthError(authResult)) return authResult;
  const { userId } = authResult;

  // Rate limit portal requests
  const rl = await checkRateLimit(userId, "API");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const { claimId } = await params;
    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Verify portal access for most actions
    if (input.action !== "request_access") {
      await assertPortalAccess({ userId, claimId });
    }

    switch (input.action) {
      case "accept":
        return handleAccept(claimId, userId);

      case "add_event":
        return handleAddEvent(claimId, userId, input);

      case "add_comment":
        return handleAddComment(claimId, userId, input);

      case "request_access":
        return handleRequestAccess(claimId, userId, input);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Portal Claims Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleAccept(claimId: string, userId: string) {
  // Find the client by userId to get their email
  const client = await prisma.client.findFirst({
    where: { userId },
    select: { id: true, email: true },
  });

  if (!client?.email) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Verify client_access row exists for this claim + email
  const access = await prisma.client_access.findFirst({
    where: { claimId, email: client.email },
  });

  if (!access) {
    return NextResponse.json({ error: "No access grant found for this claim" }, { status: 404 });
  }

  // Log the acceptance as a claim activity
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: "Client accepted portal access",
    },
  });

  return NextResponse.json({ success: true, message: "Claim access accepted" });
}

async function handleAddEvent(
  claimId: string,
  userId: string,
  input: Extract<ActionInput, { action: "add_event" }>
) {
  // Map the eventType to a valid ClaimActivityType, default to NOTE
  const typeMap: Record<string, string> = {
    note: "NOTE",
    status_change: "STATUS_CHANGE",
    file_upload: "FILE_UPLOAD",
    message: "MESSAGE",
    payment: "PAYMENT",
    supplement: "SUPPLEMENT",
  };

  const activityType = typeMap[input.eventType || "note"] || "NOTE";

  const event = await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: activityType as any,
      message: input.description ? `${input.title}: ${input.description}` : input.title,
      metadata: { title: input.title, eventType: input.eventType },
    },
  });

  return NextResponse.json({ success: true, event });
}

async function handleAddComment(
  claimId: string,
  userId: string,
  input: Extract<ActionInput, { action: "add_comment" }>
) {
  // Verify the file belongs to this claim (prevent cross-claim file comments)
  const file = await prisma.file_assets.findFirst({
    where: {
      id: input.fileId,
      claimId,
    },
  });

  if (!file) {
    return NextResponse.json(
      { error: "File not found or does not belong to this claim" },
      { status: 404 }
    );
  }

  const comment = await prisma.claimFileComment.create({
    data: {
      fileId: input.fileId,
      claimId,
      authorId: userId,
      authorType: "client",
      body: input.content,
    },
  });

  return NextResponse.json({ success: true, comment });
}

async function handleRequestAccess(
  claimId: string,
  userId: string,
  input: Extract<ActionInput, { action: "request_access" }>
) {
  // Get client email
  const client = await prisma.client.findFirst({
    where: { userId },
    select: { email: true },
  });

  if (!client?.email) {
    return NextResponse.json({ error: "Client email not found" }, { status: 404 });
  }

  // Check if access already exists for this email + claim
  const existing = await prisma.client_access.findFirst({
    where: { claimId, email: client.email },
  });

  if (existing) {
    return NextResponse.json({ error: "Access already requested or granted" }, { status: 400 });
  }

  // Create access grant row
  await prisma.client_access.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      email: client.email,
    },
  });

  // Log the request as an activity
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: `Client requested portal access${input.message ? `: ${input.message}` : ""}`,
    },
  });

  return NextResponse.json({ success: true, message: "Access requested" });
}

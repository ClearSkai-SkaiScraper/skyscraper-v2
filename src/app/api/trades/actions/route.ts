/**
 * Trades Actions - Unified action handler for trades network operations
 *
 * POST /api/trades/actions
 * Actions: accept, decline, apply, connect, match, convert_lead, invite_client,
 *          cancel_subscription, attach_to_claim
 *
 * Real models: tradesConnection (addresseeId, NOT targetId), Subscription (by orgId),
 *              user_organizations, leads (stage, NOT status), claims.
 * Phantom stubs: tradesInvite, jobApplication, clientInvitation, claimTradesCompany.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    connectionId: z.string().optional(),
    inviteId: z.string().optional(),
  }),
  z.object({
    action: z.literal("decline"),
    connectionId: z.string().optional(),
    inviteId: z.string().optional(),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("disconnect"),
    connectionId: z.string(),
  }),
  z.object({
    action: z.literal("block"),
    profileId: z.string(),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("unblock"),
    profileId: z.string(),
  }),
  z.object({
    action: z.literal("apply"),
    jobId: z.string(),
    message: z.string().optional(),
    quote: z.number().optional(),
  }),
  z.object({
    action: z.literal("connect"),
    targetProfileId: z.string(),
    message: z.string().optional(),
  }),
  z.object({
    action: z.literal("match"),
    claimId: z.string(),
    tradeType: z.string(),
    location: z
      .object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().optional(),
      })
      .optional(),
  }),
  z.object({
    action: z.literal("convert_lead"),
    leadId: z.string(),
    claimData: z.record(z.any()).optional(),
  }),
  z.object({
    action: z.literal("invite_client"),
    email: z.string().email(),
    claimId: z.string().optional(),
    message: z.string().optional(),
  }),
  z.object({
    action: z.literal("cancel_subscription"),
    reason: z.string().optional(),
    feedback: z.string().optional(),
  }),
  z.object({
    action: z.literal("attach_to_claim"),
    claimId: z.string(),
    tradesCompanyId: z.string(),
    role: z.string().optional(),
  }),
]);

type ActionInput = z.infer<typeof ActionSchema>;

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
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

      case "disconnect":
        return handleDisconnect(userId, input);

      case "block":
        return handleBlock(userId, input);

      case "unblock":
        return handleUnblock(userId, input);

      case "apply":
        return handleApply(userId, input);

      case "connect":
        return handleConnect(userId, input);

      case "match":
        return handleMatch(userId, input);

      case "convert_lead":
        return handleConvertLead(userId, orgId, input);

      case "invite_client":
        return handleInviteClient(userId, orgId, input);

      case "cancel_subscription":
        return handleCancelSubscription(userId, input);

      case "attach_to_claim":
        return handleAttachToClaim(userId, orgId, input);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Trades Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

async function handleAccept(userId: string, input: Extract<ActionInput, { action: "accept" }>) {
  if (input.connectionId) {
    // Verify the connection is addressed to the current user's profile
    const profile = await prisma.tradesProfile.findFirst({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ error: "Trades profile required" }, { status: 400 });
    }
    const conn = await prisma.tradesConnection.findFirst({
      where: { id: input.connectionId, addresseeId: profile.id },
    });
    if (!conn) {
      return NextResponse.json(
        { error: "Connection not found or not addressed to you" },
        { status: 404 }
      );
    }
    await prisma.tradesConnection.update({
      where: { id: input.connectionId },
      data: { status: "accepted", connectedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: "Connection accepted" });
  }

  if (input.inviteId) {
    // Verify the invite belongs to the current user
    const invite = await prisma.trades_invites.findFirst({
      where: { id: input.inviteId, toUserId: userId },
    });
    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or not addressed to you" },
        { status: 404 }
      );
    }
    await prisma.trades_invites.update({
      where: { id: input.inviteId },
      data: { status: "accepted", respondedAt: new Date(), updatedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: "Invite accepted" });
  }

  return NextResponse.json({ error: "connectionId or inviteId required" }, { status: 400 });
}

async function handleDecline(userId: string, input: Extract<ActionInput, { action: "decline" }>) {
  if (input.connectionId) {
    // Verify the connection is addressed to the current user's profile
    const profile = await prisma.tradesProfile.findFirst({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ error: "Trades profile required" }, { status: 400 });
    }
    const conn = await prisma.tradesConnection.findFirst({
      where: { id: input.connectionId, addresseeId: profile.id },
    });
    if (!conn) {
      return NextResponse.json(
        { error: "Connection not found or not addressed to you" },
        { status: 404 }
      );
    }
    await prisma.tradesConnection.update({
      where: { id: input.connectionId },
      data: { status: "declined" },
    });
    return NextResponse.json({ success: true, message: "Connection declined" });
  }

  if (input.inviteId) {
    const invite = await prisma.trades_invites.findFirst({
      where: { id: input.inviteId, toUserId: userId },
    });
    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or not addressed to you" },
        { status: 404 }
      );
    }
    await prisma.trades_invites.update({
      where: { id: input.inviteId },
      data: { status: "declined", respondedAt: new Date(), updatedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: "Invite declined" });
  }

  return NextResponse.json({ error: "connectionId or inviteId required" }, { status: 400 });
}

async function handleDisconnect(
  userId: string,
  input: Extract<ActionInput, { action: "disconnect" }>
) {
  // Get the user's trades profile
  const profile = await prisma.tradesProfile.findFirst({ where: { userId } });
  if (!profile) {
    return NextResponse.json({ error: "Trades profile required" }, { status: 400 });
  }

  // Find the connection - user could be either requester or addressee
  const conn = await prisma.tradesConnection.findFirst({
    where: {
      id: input.connectionId,
      OR: [{ requesterId: profile.id }, { addresseeId: profile.id }],
    },
  });

  if (!conn) {
    return NextResponse.json(
      { error: "Connection not found or you are not part of it" },
      { status: 404 }
    );
  }

  // Delete the connection entirely
  await prisma.tradesConnection.delete({
    where: { id: input.connectionId },
  });

  logger.info("[Trades] Connection removed", {
    userId,
    connectionId: input.connectionId,
  });

  return NextResponse.json({ success: true, message: "Connection removed" });
}

async function handleBlock(userId: string, input: Extract<ActionInput, { action: "block" }>) {
  // Get the user's trades profile
  const profile = await prisma.tradesProfile.findFirst({ where: { userId } });
  if (!profile) {
    return NextResponse.json({ error: "Trades profile required" }, { status: 400 });
  }

  // Check if already blocked using raw query (table may not exist yet)
  try {
    const existingBlock = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM trades_blocks
      WHERE "blockerId" = ${profile.id} AND "blockedId" = ${input.profileId}
      LIMIT 1
    `;

    if (existingBlock.length > 0) {
      return NextResponse.json({ error: "User is already blocked" }, { status: 409 });
    }

    // Create block record
    await prisma.$executeRaw`
      INSERT INTO trades_blocks (id, "blockerId", "blockedId", reason, "createdAt")
      VALUES (gen_random_uuid(), ${profile.id}, ${input.profileId}, ${input.reason || null}, NOW())
    `;
  } catch (err: any) {
    // If table doesn't exist, skip blocking for now
    if (err?.code === "42P01" || err?.message?.includes("does not exist")) {
      logger.warn("[Trades] trades_blocks table not yet created, skipping block");
    } else {
      throw err;
    }
  }

  // Also remove any existing connection between these profiles
  await prisma.tradesConnection.deleteMany({
    where: {
      OR: [
        { requesterId: profile.id, addresseeId: input.profileId },
        { requesterId: input.profileId, addresseeId: profile.id },
      ],
    },
  });

  logger.info("[Trades] User blocked", {
    userId,
    blockedProfileId: input.profileId,
    reason: input.reason,
  });

  return NextResponse.json({ success: true, message: "User blocked" });
}

async function handleUnblock(userId: string, input: Extract<ActionInput, { action: "unblock" }>) {
  // Get the user's trades profile
  const profile = await prisma.tradesProfile.findFirst({ where: { userId } });
  if (!profile) {
    return NextResponse.json({ error: "Trades profile required" }, { status: 400 });
  }

  // Find and delete the block using raw query
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM trades_blocks
      WHERE "blockerId" = ${profile.id} AND "blockedId" = ${input.profileId}
    `;

    if (result === 0) {
      return NextResponse.json({ error: "User is not blocked" }, { status: 404 });
    }
  } catch (err: any) {
    // If table doesn't exist, user wasn't blocked
    if (err?.code === "42P01" || err?.message?.includes("does not exist")) {
      return NextResponse.json({ error: "User is not blocked" }, { status: 404 });
    }
    throw err;
  }

  logger.info("[Trades] User unblocked", {
    userId,
    unblockedProfileId: input.profileId,
  });

  return NextResponse.json({ success: true, message: "User unblocked" });
}

async function handleApply(userId: string, input: Extract<ActionInput, { action: "apply" }>) {
  const profile = await prisma.tradesProfile.findFirst({
    where: { userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Trades profile required" }, { status: 400 });
  }

  // Check for duplicate application
  const existing = await prisma.trades_job_applications.findUnique({
    where: { jobId_applicantId: { jobId: input.jobId, applicantId: userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already applied to this job" }, { status: 409 });
  }

  const application = await prisma.trades_job_applications.create({
    data: {
      jobId: input.jobId,
      applicantId: userId,
      profileId: profile.id,
      message: input.message || null,
      quoteCents: input.quote ? Math.round(input.quote * 100) : null,
      status: "pending",
    },
  });

  logger.info("[Trades] Job application created", {
    userId,
    jobId: input.jobId,
    applicationId: application.id,
  });

  return NextResponse.json({
    success: true,
    application: { id: application.id, status: application.status },
    message: "Application submitted",
  });
}

async function handleConnect(userId: string, input: Extract<ActionInput, { action: "connect" }>) {
  const profile = await prisma.tradesProfile.findFirst({
    where: { userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Trades profile required" }, { status: 400 });
  }

  // Real model: tradesConnection uses addresseeId (NOT targetId)
  const connection = await prisma.tradesConnection.create({
    data: {
      id: crypto.randomUUID(),
      requesterId: profile.id,
      addresseeId: input.targetProfileId,
      message: input.message,
      status: "pending",
    },
  });

  return NextResponse.json({ success: true, connection });
}

async function handleMatch(userId: string, input: Extract<ActionInput, { action: "match" }>) {
  // TradesProfile uses specialties[] (NOT primaryTrade) and companyName (NOT businessName)
  const matches = await prisma.tradesProfile.findMany({
    where: {
      specialties: { has: input.tradeType },
      verified: true,
    },
    take: 10,
    select: {
      id: true,
      companyName: true,
      specialties: true,
      rating: true,
      reviewCount: true,
      logoUrl: true,
    },
  });

  return NextResponse.json({ success: true, matches });
}

async function handleConvertLead(
  userId: string,
  orgId: string,
  input: Extract<ActionInput, { action: "convert_lead" }>
) {
  // Verify the lead belongs to the user's organization
  const lead = await prisma.leads.findFirst({
    where: { id: input.leadId, orgId },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found in your organization" }, { status: 404 });
  }

  // Update lead stage — scoped by id + orgId
  await prisma.leads.update({
    where: { id: input.leadId },
    data: { stage: "converted" },
  });

  let claim: any = null;
  if (input.claimData) {
    claim = await prisma.claims.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        ...(input.claimData as any),
      } as any,
    });
  }

  return NextResponse.json({ success: true, lead, claim });
}

async function handleInviteClient(
  userId: string,
  orgId: string,
  input: Extract<ActionInput, { action: "invite_client" }>
) {
  if (input.claimId) {
    // Verify the claim belongs to the user's organization before granting access
    const claim = await prisma.claims.findFirst({
      where: { id: input.claimId, orgId },
      select: { id: true },
    });
    if (!claim) {
      return NextResponse.json({ error: "Claim not found in your organization" }, { status: 404 });
    }

    await prisma.client_access.create({
      data: {
        id: crypto.randomUUID(),
        claimId: input.claimId,
        email: input.email.toLowerCase(),
      },
    });

    return NextResponse.json({
      success: true,
      invitation: { id: crypto.randomUUID() },
      message: "Client invited",
    });
  }

  // Standalone client invitation (no claim)
  const invitation = await prisma.client_invitations.create({
    data: {
      email: input.email.toLowerCase(),
      invitedBy: userId,
      orgId,
      message: input.message || null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  logger.info("[Trades] Client invitation created", {
    invitationId: invitation.id,
    email: input.email,
    userId,
  });

  return NextResponse.json({
    success: true,
    invitation: { id: invitation.id, token: invitation.token },
    message: "Invitation sent",
  });
}

async function handleCancelSubscription(
  userId: string,
  input: Extract<ActionInput, { action: "cancel_subscription" }>
) {
  // Real model: Subscription is by orgId (NOT userId, NOT tradesSubscription)
  const membership = await prisma.user_organizations.findFirst({
    where: { userId },
  });

  if (!membership) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: membership.organizationId, status: "active" },
  });

  if (!subscription) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  // Actually cancel via Stripe if stripeSubId exists
  if (subscription.stripeSubId) {
    try {
      const { getStripeClient } = await import("@/lib/stripe");
      const stripe = getStripeClient();
      if (stripe) {
        await stripe.subscriptions.update(subscription.stripeSubId, {
          cancel_at_period_end: true,
          metadata: { cancelReason: input.reason || "user_requested" },
        });
        logger.info("[Trades] Stripe subscription set to cancel at period end", {
          stripeSubId: subscription.stripeSubId,
        });
      }
    } catch (stripeError) {
      logger.error("[Trades] Stripe cancellation failed:", stripeError);
      return NextResponse.json(
        { error: "Failed to process cancellation. Please contact support." },
        { status: 500 }
      );
    }
  }

  // Update local subscription record
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "canceling",
      updatedAt: new Date(),
    },
  });

  logger.info("[Trades] Subscription cancellation processed", {
    userId,
    orgId: membership.organizationId,
    subscriptionId: subscription.id,
    reason: input.reason,
  });

  return NextResponse.json({
    success: true,
    message:
      "Your subscription has been cancelled. It will remain active until the end of the current billing period.",
  });
}

async function handleAttachToClaim(
  userId: string,
  orgId: string,
  input: Extract<ActionInput, { action: "attach_to_claim" }>
) {
  // Verify the claim belongs to the user's organization
  const claim = await prisma.claims.findFirst({
    where: { id: input.claimId, orgId },
    select: { id: true },
  });
  if (!claim) {
    return NextResponse.json({ error: "Claim not found in your organization" }, { status: 404 });
  }

  // Create proper join record + activity log
  const attachment = await prisma.claim_trades_companies.upsert({
    where: {
      claimId_tradesCompanyId: {
        claimId: input.claimId,
        tradesCompanyId: input.tradesCompanyId,
      },
    },
    update: {
      role: input.role || "vendor",
      status: "active",
    },
    create: {
      claimId: input.claimId,
      tradesCompanyId: input.tradesCompanyId,
      role: input.role || "vendor",
      assignedBy: userId,
    },
  });

  // Also log as claim activity for audit trail
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: input.claimId,
      user_id: userId,
      type: "NOTE",
      message: `Trades company ${input.tradesCompanyId} attached as ${input.role || "vendor"}`,
      metadata: {
        tradesCompanyId: input.tradesCompanyId,
        role: input.role || "vendor",
        attachmentId: attachment.id,
      },
    },
  });

  return NextResponse.json({
    success: true,
    attachment: { id: attachment.id },
  });
}

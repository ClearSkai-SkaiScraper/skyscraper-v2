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

// Prisma name collision: TradesConnection (uppercase) vs tradesConnection (lowercase).
// TypeScript resolves to uppercase model types. Runtime dispatches correctly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tradesConn = prisma.tradesConnection as any;

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

export const POST = withAuth(async (req: NextRequest, { userId }) => {
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

      case "apply":
        return handleApply(userId, input);

      case "connect":
        return handleConnect(userId, input);

      case "match":
        return handleMatch(userId, input);

      case "convert_lead":
        return handleConvertLead(userId, input);

      case "invite_client":
        return handleInviteClient(userId, input);

      case "cancel_subscription":
        return handleCancelSubscription(userId, input);

      case "attach_to_claim":
        return handleAttachToClaim(userId, input);

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
    await tradesConn.update({
      where: { id: input.connectionId },
      data: { status: "accepted", connectedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: "Connection accepted" });
  }

  if (input.inviteId) {
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
    await tradesConn.update({
      where: { id: input.connectionId },
      data: { status: "declined" },
    });
    return NextResponse.json({ success: true, message: "Connection declined" });
  }

  if (input.inviteId) {
    await prisma.trades_invites.update({
      where: { id: input.inviteId },
      data: { status: "declined", respondedAt: new Date(), updatedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: "Invite declined" });
  }

  return NextResponse.json({ error: "connectionId or inviteId required" }, { status: 400 });
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
  const connection = await tradesConn.create({
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
  input: Extract<ActionInput, { action: "convert_lead" }>
) {
  // Real model: user_organizations (NOT orgUser)
  const membership = await prisma.user_organizations.findFirst({
    where: { userId },
  });

  if (!membership) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  // Real model: leads uses "stage" (NOT "status")
  const lead = await prisma.leads.update({
    where: { id: input.leadId },
    data: { stage: "converted" },
  });

  let claim: any = null;
  if (input.claimData) {
    // claims.create requires many fields (propertyId, claimNumber, title, etc.)
    // claimData is expected to provide them — cast to bypass compile-time check
    claim = await prisma.claims.create({
      data: {
        id: crypto.randomUUID(),
        orgId: membership.organizationId,
        ...(input.claimData as any),
      } as any,
    });
  }

  return NextResponse.json({ success: true, lead, claim });
}

async function handleInviteClient(
  userId: string,
  input: Extract<ActionInput, { action: "invite_client" }>
) {
  // No clientInvitation table — use client_access if claimId provided
  if (input.claimId) {
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
  const membership = await prisma.user_organizations.findFirst({
    where: { userId },
  });

  const invitation = await prisma.client_invitations.create({
    data: {
      email: input.email.toLowerCase(),
      invitedBy: userId,
      orgId: membership?.organizationId || null,
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
  input: Extract<ActionInput, { action: "attach_to_claim" }>
) {
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

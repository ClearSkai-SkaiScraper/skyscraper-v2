export const dynamic = "force-dynamic";
/**
 * Trades Network Webhook Endpoint
 * Receives events from trades microservice to sync with Core CRM
 */

import crypto from "crypto";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { generateContactSlug } from "@/lib/generateContactSlug";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * Timing-safe comparison of webhook secret to prevent timing attacks
 */
function verifyWebhookSecret(received: string, expected: string): boolean {
  try {
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Webhook event types
type TradesWebhookEvent =
  | "connection.requested"
  | "connection.accepted"
  | "connection.declined"
  | "profile.created"
  | "profile.updated"
  | "review.created";

interface WebhookPayload {
  event: TradesWebhookEvent;
  data: {
    connectionId?: string;
    proClerkId?: string;
    clientClerkId?: string;
    profileId?: string;
    reviewId?: string;
    serviceType?: string;
    urgency?: string;
    notes?: string;
  };
  timestamp: string;
}

export async function POST(req: NextRequest) {
  // Rate limit per source IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rl = await checkRateLimit(`trades:${ip}`, "WEBHOOK");
  if (!rl.success) {
    logger.warn("[TRADES_WEBHOOK] Rate limit exceeded", { ip });
    return NextResponse.json({ error: "Rate limit exceeded", reset: rl.reset }, { status: 429 });
  }

  try {
    // Verify webhook signature (timing-safe comparison)
    const headersList = headers();
    const webhookSecret = headersList.get("x-webhook-secret");
    // eslint-disable-next-line no-restricted-syntax
    const expectedSecret = process.env.TRADES_WEBHOOK_SECRET;

    if (!webhookSecret || !expectedSecret || !verifyWebhookSecret(webhookSecret, expectedSecret)) {
      logger.warn("[TRADES_WEBHOOK] Unauthorized — invalid or missing secret", {
        hasSecret: !!webhookSecret,
        hasExpected: !!expectedSecret,
        ip,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload: WebhookPayload = await req.json();
    logger.info("[TRADES_WEBHOOK] Event received", {
      event: payload.event,
      timestamp: payload.timestamp,
    });

    // Handle different event types
    switch (payload.event) {
      case "connection.requested":
        await handleConnectionRequested(payload.data);
        break;

      case "connection.accepted":
        await handleConnectionAccepted(payload.data);
        break;

      case "profile.created":
        await handleProfileCreated(payload.data);
        break;

      case "review.created":
        await handleReviewCreated(payload.data);
        break;

      default:
        logger.debug(`Unhandled webhook event: ${payload.event}`);
    }

    return NextResponse.json({ success: true, event: payload.event });
  } catch (error) {
    logger.error("Trades webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

/**
 * Handle new connection request - create lead in CRM
 */
async function handleConnectionRequested(data: WebhookPayload["data"]) {
  const { clientClerkId, proClerkId, serviceType, urgency, notes } = data;

  try {
    // Find user by clerkUserId to get orgId for lead creation
    const user = await prisma.users.findFirst({
      where: { clerkUserId: clientClerkId },
      include: { Org: true },
    });

    if (!user) {
      logger.debug("User not found for trade connection request");
      return;
    }

    // Find or create a contact for the user
    let contact = await prisma.contacts.findFirst({
      where: { orgId: user.orgId, email: user.email },
    });

    if (!contact) {
      contact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          orgId: user.orgId,
          firstName: user.name?.split(" ")[0] || "Unknown",
          lastName: user.name?.split(" ").slice(1).join(" ") || "",
          slug: generateContactSlug(
            user.name?.split(" ")[0] || "Unknown",
            user.name?.split(" ").slice(1).join(" ") || ""
          ),
          email: user.email,
          source: "trades_network",
          updatedAt: new Date(),
        },
      });
    }

    // Create a lead for the pro contractor
    await prisma.leads.create({
      data: {
        id: crypto.randomUUID(),
        source: "trades_network",
        stage: "new",
        temperature: urgency === "emergency" ? "hot" : urgency === "urgent" ? "warm" : "cold",
        contactId: contact.id,
        orgId: user.orgId,
        title: serviceType || "Trade Network Connection",
        description: notes || `Trade network connection request from ${user.name || user.email}`,
        urgency: urgency,
        updatedAt: new Date(),
      },
    });

    // Note: ProjectNotification requires orgId + claimId, so we log instead for trades
    logger.info(
      `[Trades Webhook] Connection request from ${user.email} to pro ${proClerkId} for ${serviceType || "a project"}`
    );
  } catch (error) {
    logger.error("Failed to create lead from trade connection:", error);
    throw error;
  }
}

/**
 * Handle accepted connection - update lead status
 */
async function handleConnectionAccepted(data: WebhookPayload["data"]) {
  const { connectionId, proClerkId, clientClerkId } = data;

  try {
    // Find and update the lead by searching description for connectionId
    // Note: Prisma JSON queries on 'metadata' may need adjustment based on actual schema
    const leads = await prisma.leads.findMany({
      where: {
        source: "trades_network",
        description: { contains: connectionId || "" },
      },
    });

    const lead = leads[0];
    if (lead) {
      await prisma.leads.update({
        where: { id: lead.id },
        data: {
          stage: "contacted",
          updatedAt: new Date(),
        },
      });
    }

    // Note: ProjectNotification requires orgId + claimId, so we log instead for trades
    logger.info(
      `[Trades Webhook] Connection accepted: pro ${proClerkId} accepted client ${clientClerkId} for connection ${connectionId}`
    );
  } catch (error) {
    logger.error("Failed to update lead from trade acceptance:", error);
    throw error;
  }
}

/**
 * Handle new profile creation - track in analytics
 */
async function handleProfileCreated(data: WebhookPayload["data"]) {
  // Could track in analytics, update user metadata, etc.
  logger.debug("New trade profile created:", data.profileId);
}

/**
 * Handle new review - could update contractor reputation in CRM
 */
async function handleReviewCreated(data: WebhookPayload["data"]) {
  logger.debug("New trade review created:", data.reviewId);
}

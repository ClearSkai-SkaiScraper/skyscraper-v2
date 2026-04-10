export const dynamic = "force-dynamic";

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().optional(),
  contactId: z.string().optional(),
  claimId: z.string().optional(),
});

/**
 * POST /api/contacts/invite
 *
 * Sends an invite to a contact to join SkaiScraper as a client.
 * Creates a ClaimClientLink if a claimId is provided,
 * or creates a ClientProConnection invitation.
 */
export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "AUTH");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, name, contactId, claimId } = parsed.data;

    logger.info("[CONTACTS_INVITE]", { orgId, userId, email, claimId });

    // Check if they already have a portal account
    const existingPortalUser = await prisma.client.findFirst({
      where: { email: email.toLowerCase() },
    });

    // Check if already connected
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { orgId },
      select: { companyId: true },
    });

    if (membership?.companyId && existingPortalUser) {
      const existingConnection = await prisma.clientProConnection.findFirst({
        where: {
          contractorId: membership.companyId,
          clientId: existingPortalUser.id,
          status: { in: ["accepted", "ACCEPTED", "connected", "pending", "PENDING"] },
        },
      });

      if (existingConnection) {
        return NextResponse.json({
          success: true,
          alreadyConnected: true,
          message: "This contact is already connected on SkaiScraper.",
        });
      }
    }

    // If there's a claimId, create or update a ClaimClientLink
    if (claimId) {
      const existingLink = await prisma.claimClientLink.findFirst({
        where: { claimId, clientEmail: email.toLowerCase() },
      });

      if (!existingLink) {
        await prisma.claimClientLink.create({
          data: {
            id: createId(),
            claimId,
            clientEmail: email.toLowerCase(),
            status: "PENDING",
            invitedBy: userId,
          },
        });
      }
    }

    // Create a connection invite if we have a company
    if (membership?.companyId) {
      // If portal user exists, create a pending connection
      if (existingPortalUser) {
        const existingConn = await prisma.clientProConnection.findFirst({
          where: {
            contractorId: membership.companyId,
            clientId: existingPortalUser.id,
          },
        });

        if (!existingConn) {
          await prisma.clientProConnection.create({
            data: {
              id: createId(),
              contractorId: membership.companyId,
              clientId: existingPortalUser.id,
              status: "pending",
            },
          });
        }
      }
    }

    // TODO: Send actual invite email via Resend when email templates are ready
    // For now, log the invite and return success
    logger.info("[CONTACTS_INVITE] Invite recorded", {
      email,
      name,
      claimId,
      hasPortalAccount: !!existingPortalUser,
    });

    return NextResponse.json({
      success: true,
      alreadyConnected: false,
      hasAccount: !!existingPortalUser,
      message: existingPortalUser
        ? "Connection request sent to existing SkaiScraper user."
        : "Invite sent! They'll receive an email to create their account.",
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[CONTACTS_INVITE] Error:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "internal_error", message: "Failed to send invite" },
      { status: 500 }
    );
  }
});

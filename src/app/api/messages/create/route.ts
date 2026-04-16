export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const createMessageSchema = z.discriminatedUnion("isInternal", [
  // Standard contact/client message
  z.object({
    isInternal: z.literal(false).optional().default(false),
    contactId: z.string().min(1),
    claimId: z.string().nullish(),
    subject: z.string().optional(),
    body: z.string().min(1),
    orgId: z.string().optional(), // client may send — we ignore it
  }),
  // Internal team message
  z.object({
    isInternal: z.literal(true),
    recipientUserId: z.string().min(1),
    recipientName: z.string().optional(),
    recipientEmail: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().min(1),
  }),
]);

/**
 * POST /api/messages/create
 *
 * Creates a new message thread and first message
 * Links to contact and optionally to a claim
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
    // Ensure isInternal is explicitly set for discriminated union parsing
    if (body.isInternal === undefined) body.isInternal = false;
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // ── Internal team message path ────────────────────────────────────
    if (data.isInternal === true) {
      const { recipientUserId, recipientName, subject, body: messageBody } = data;

      // Verify the recipient is in the same org
      // Check both user_organizations.userId AND users.clerkUserId since IDs may vary
      let resolvedRecipientId = recipientUserId;
      let recipient = await prisma.user_organizations.findFirst({
        where: { userId: recipientUserId, organizationId: orgId },
      });

      // Fallback: recipientUserId may be a Clerk ID stored in users.clerkUserId
      if (!recipient) {
        try {
          const userByClerk = await prisma.users.findFirst({
            where: { clerkUserId: recipientUserId },
            select: { id: true },
          });
          if (userByClerk) {
            recipient = await prisma.user_organizations.findFirst({
              where: { userId: userByClerk.id, organizationId: orgId },
            });
            if (recipient) resolvedRecipientId = userByClerk.id;
          }
        } catch {
          // users table lookup is supplementary
        }
      }

      // Fallback: check if recipientUserId is an internal DB user ID mapped to a clerkUserId in user_organizations
      if (!recipient) {
        try {
          const userById = await prisma.users.findFirst({
            where: { id: recipientUserId },
            select: { clerkUserId: true },
          });
          if (userById?.clerkUserId) {
            recipient = await prisma.user_organizations.findFirst({
              where: { userId: userById.clerkUserId, organizationId: orgId },
            });
            if (recipient) resolvedRecipientId = userById.clerkUserId;
          }
        } catch {
          // supplementary lookup
        }
      }

      // Fallback: Check Clerk directly for org membership (handles cases where user_organizations table is out of sync)
      if (!recipient) {
        try {
          // eslint-disable-next-line @typescript-eslint/await-thenable
          const clerk = await clerkClient();
          // recipientUserId could be a Clerk user ID — verify they belong to this org
          const memberships = await clerk.organizations.getOrganizationMembershipList({
            organizationId: orgId,
            limit: 100,
          });
          const match = memberships.data?.find((m) => m.publicUserData?.userId === recipientUserId);
          if (match) {
            // They ARE in this org via Clerk but missing from user_organizations table
            resolvedRecipientId = recipientUserId;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recipient = { userId: recipientUserId } as any;
            // Auto-heal: create user_organizations row so future lookups work
            try {
              await prisma.user_organizations.create({
                data: {
                  id: crypto.randomUUID(),
                  userId: recipientUserId,
                  organizationId: orgId,
                  role: (match.role as string) || "member",
                },
              });
            } catch {
              // row may already exist — ignore
            }
          }
        } catch (clerkErr) {
          logger.warn("[MESSAGES] Clerk org membership check failed:", clerkErr);
        }
      }

      if (!recipient) {
        return NextResponse.json(
          { error: "Team member not found in your organization" },
          { status: 404 }
        );
      }

      const thread = await prisma.messageThread.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          claimId: null,
          clientId: null,
          participants: [userId, resolvedRecipientId],
          subject: subject || `Team Message to ${recipientName || "teammate"}`,
          isPortalThread: false,
        },
      });

      const message = await prisma.message.create({
        data: {
          id: crypto.randomUUID(),
          threadId: thread.id,
          senderUserId: userId,
          senderType: "pro",
          body: messageBody,
          read: false,
          fromPortal: false,
        },
      });

      return NextResponse.json({
        success: true,
        thread: { id: thread.id, subject: thread.subject, createdAt: thread.createdAt },
        message: { id: message.id, body: message.body, createdAt: message.createdAt },
      });
    }

    // ── Standard contact/client message path ─────────────────────────
    const { contactId, subject, body: messageBody } = data;
    const claimId = data.claimId || null;

    // Verify contact belongs to org — check contacts table first, then Client table
    let contact = await prisma.contacts.findFirst({
      where: {
        id: contactId,
        orgId: orgId,
      },
    });

    // Fallback: contactId might be a Client.id (from ClientProConnection)
    let isClientRecord = false;
    if (!contact) {
      // Also resolve the user's tradesCompany for ClientProConnection checks
      let tradesCompanyId: string | null = null;
      try {
        const membership = await prisma.tradesCompanyMember.findFirst({
          where: { userId },
          select: { companyId: true },
        });
        tradesCompanyId = membership?.companyId || null;
      } catch {
        // Not a trades member — that's fine
      }

      const clientRecord = await prisma.client.findFirst({
        where: {
          id: contactId,
          OR: [
            { orgId: orgId },
            // Client was created under the trades company
            ...(tradesCompanyId ? [{ orgId: tradesCompanyId }] : []),
            {
              ClientProConnection: {
                some: {
                  // Scope to the current company if possible
                  ...(tradesCompanyId ? { contractorId: tradesCompanyId } : {}),
                  status: { in: ["accepted", "connected", "pending"] },
                },
              },
            },
          ],
        },
      });
      if (clientRecord) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isClientRecord = true;
        // Create a virtual contact object so downstream logic works
        contact = {
          id: clientRecord.id,
          orgId: orgId,
          firstName: clientRecord.name?.split(" ")[0] || clientRecord.name || "Client",
          lastName: clientRecord.name?.split(" ").slice(1).join(" ") || "",
          email: clientRecord.email,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
    }

    if (!contact) {
      logger.warn("[MESSAGES_CREATE] Contact not found", { contactId, orgId, userId });
      return NextResponse.json(
        { error: "Contact not found or does not belong to your organization" },
        { status: 404 }
      );
    }

    // If claimId provided, verify it belongs to org
    if (claimId) {
      const claim = await prisma.claims.findFirst({
        where: {
          id: claimId,
          orgId: orgId,
        },
      });

      if (!claim) {
        return NextResponse.json(
          { error: "Claim not found or does not belong to your organization" },
          { status: 404 }
        );
      }
    }

    // Create message thread
    const thread = await prisma.messageThread.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        claimId: claimId || null,
        clientId: contactId,
        participants: [userId, contactId],
        subject: subject || "New Message",
        isPortalThread: false,
      },
    });

    // Create first message
    const message = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: thread.id,
        senderUserId: userId,
        senderType: "pro",
        body: messageBody,
        read: false,
        fromPortal: false,
      },
    });

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        subject: thread.subject,
        createdAt: thread.createdAt,
      },
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const errMsg = error?.message || error?.toString?.() || "Unknown error";
    logger.error("[API] /api/messages/create error:", { error: errMsg, stack: error?.stack });
    return NextResponse.json({ error: `Failed to create message: ${errMsg}` }, { status: 500 });
  }
});

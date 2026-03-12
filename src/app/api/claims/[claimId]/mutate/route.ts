/**
 * ============================================================================
 * UNIFIED CLAIM MUTATIONS HANDLER
 * ============================================================================
 *
 * POST /api/claims/[claimId]/mutate
 *
 * Consolidates ALL state mutation operations for claims into a single endpoint.
 *
 * SUPPORTED ACTIONS:
 *   - update: Update claim fields
 *   - update_status: Update lifecycle status
 *   - toggle_visibility: Toggle client visibility on assets
 *   - invite: Invite client to claim portal
 *   - attach_contact: Attach a contact to claim
 *   - add_note: Add a note to claim
 *   - add_timeline_event: Add timeline event
 *
 * REPLACES:
 *   - /api/claims/[claimId]/update
 *   - /api/claims/[claimId]/status
 *   - /api/claims/[claimId]/toggle-visibility
 *   - /api/claims/[claimId]/invite
 *   - /api/claims/[claimId]/invite-client
 *   - /api/claims/[claimId]/attach-contact
 *   - /api/claims/[claimId]/permissions (GET remains separate)
 *
 * ============================================================================
 */

import { logger } from "@/lib/logger";
import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { canInviteClients } from "@/lib/auth/permissions";
import { withAuth } from "@/lib/auth/withAuth";
import { sendEmail, TEMPLATES } from "@/lib/email/resend";
import { sendTemplatedNotification } from "@/lib/notifications/templates";
import prisma from "@/lib/prisma";
import { verifyProClaimAccess } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const lifecycleStages = [
  "FILED",
  "ADJUSTER_REVIEW",
  "APPROVED",
  "DENIED",
  "APPEAL",
  "BUILD",
  "COMPLETED",
  "DEPRECIATION",
] as const;

const actionSchema = z.discriminatedUnion("action", [
  // Update claim fields
  z.object({
    action: z.literal("update"),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    damageType: z.string().optional(),
    insured_name: z.string().optional(),
    homeowner_email: z.string().email().optional(),
    carrier: z.string().optional(),
    policy_number: z.string().optional(),
    dateOfLoss: z.string().optional(),
    dateOfInspection: z.string().optional(),
    propertyAddress: z.string().optional(),
    adjusterName: z.string().optional(),
    adjusterPhone: z.string().optional(),
    adjusterEmail: z.string().email().optional(),
  }),

  // Update lifecycle status
  z.object({
    action: z.literal("update_status"),
    lifecycleStage: z.enum(lifecycleStages),
    notes: z.string().optional(),
  }),

  // Toggle visibility on assets/timeline
  z.object({
    action: z.literal("toggle_visibility"),
    type: z.enum(["photo", "timeline"]),
    itemIds: z.array(z.string()),
    visible: z.boolean(),
  }),

  // Invite client (general)
  z.object({
    action: z.literal("invite"),
    email: z.string().email(),
    contactId: z.string().optional(),
    role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
  }),

  // Invite client (pro workflow)
  z.object({
    action: z.literal("invite_client"),
    clientEmail: z.string().email(),
    clientName: z.string().optional(),
  }),

  // Attach contact
  z.object({
    action: z.literal("attach_contact"),
    contactId: z.string(),
    role: z.string().optional(),
  }),

  // Add note
  z.object({
    action: z.literal("add_note"),
    content: z.string().min(1),
    type: z.enum(["internal", "client_visible"]).default("internal"),
  }),

  // Add timeline event
  z.object({
    action: z.literal("add_timeline_event"),
    title: z.string(),
    description: z.string().optional(),
    eventType: z.string().default("note"),
    visibleToClient: z.boolean().default(false),
  }),
]);

type ActionPayload = z.infer<typeof actionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      const claim = await getOrgClaimOrThrow(orgId, claimId);

      // Parse and validate body
      const body = await req.json();
      const parsed = actionSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const payload = parsed.data;

      // Route to action handler
      switch (payload.action) {
        case "update":
          return handleUpdate(claimId, orgId, payload);

        case "update_status":
          return handleUpdateStatus(claimId, orgId, payload);

        case "toggle_visibility":
          return handleToggleVisibility(claimId, payload);

        case "invite":
          return handleInvite(claimId, orgId, userId, payload);

        case "invite_client":
          return handleInviteClient(claimId, userId, payload);

        case "attach_contact":
          return handleAttachContact(claimId, orgId, payload);

        case "add_note":
          return handleAddNote(claimId, orgId, userId, payload);

        case "add_timeline_event":
          return handleAddTimelineEvent(claimId, orgId, userId, payload);

        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Claim Mutate] Error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ACTION HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleUpdate(
  claimId: string,
  orgId: string,
  payload: Extract<ActionPayload, { action: "update" }>
) {
  const { action, ...fields } = payload;

  // Build update object with only provided fields
  const updateData: Record<string, any> = {};

  if (fields.title !== undefined) updateData.title = fields.title;
  if (fields.description !== undefined) updateData.description = fields.description;
  if (fields.status !== undefined) updateData.status = fields.status;
  if (fields.damageType !== undefined) updateData.damageType = fields.damageType;
  if (fields.insured_name !== undefined) updateData.insured_name = fields.insured_name;
  if (fields.homeowner_email !== undefined) updateData.homeowner_email = fields.homeowner_email;
  if (fields.carrier !== undefined) updateData.carrier = fields.carrier;
  if (fields.policy_number !== undefined) updateData.policy_number = fields.policy_number;
  if (fields.dateOfLoss !== undefined) {
    updateData.dateOfLoss = fields.dateOfLoss ? new Date(fields.dateOfLoss) : null;
  }
  if (fields.dateOfInspection !== undefined) {
    updateData.dateOfInspection = fields.dateOfInspection
      ? new Date(fields.dateOfInspection)
      : null;
  }
  if (fields.adjusterName !== undefined) updateData.adjusterName = fields.adjusterName;
  if (fields.adjusterPhone !== undefined) updateData.adjusterPhone = fields.adjusterPhone;
  if (fields.adjusterEmail !== undefined) updateData.adjusterEmail = fields.adjusterEmail;

  const updatedClaim = await prisma.claims.update({
    where: { id: claimId },
    data: updateData,
  });

  // Update property address if provided
  if (fields.propertyAddress !== undefined && updatedClaim.propertyId) {
    await prisma.properties.update({
      where: { id: updatedClaim.propertyId },
      data: { street: fields.propertyAddress },
    });
  }

  // Send webhook
  try {
    const { WebhookService } = await import("@/lib/webhook-service");
    await WebhookService.sendClaimUpdated(claimId, updateData, orgId);
  } catch {}

  return NextResponse.json({
    success: true,
    message: "Claim updated successfully",
    data: updatedClaim,
  });
}

async function handleUpdateStatus(
  claimId: string,
  orgId: string,
  payload: Extract<ActionPayload, { action: "update_status" }>
) {
  const statusMap: Record<string, string> = {
    FILED: "new",
    ADJUSTER_REVIEW: "in_progress",
    APPROVED: "approved",
    DENIED: "denied",
    APPEAL: "appeal",
    BUILD: "in_progress",
    COMPLETED: "completed",
    DEPRECIATION: "completed",
  };

  const newStatus = statusMap[payload.lifecycleStage] || "new";

  const updated = await prisma.claims.update({
    where: { id: claimId },
    data: { status: newStatus },
  });

  // Send webhook
  try {
    const { WebhookService } = await import("@/lib/webhook-service");
    await WebhookService.sendClaimUpdated(claimId, { status: newStatus }, orgId);
  } catch {}

  // Send CLAIM_STATUS_CHANGE notification to org members
  try {
    const orgMembers = await prisma.users.findMany({
      where: { orgId },
      select: { clerkUserId: true },
    });
    for (const member of orgMembers) {
      if (member.clerkUserId) {
        await sendTemplatedNotification("CLAIM_STATUS_CHANGE", member.clerkUserId, {
          claimNumber: updated.claimNumber || claimId,
          newStatus: payload.lifecycleStage,
          claimId,
        }).catch(() => {});
      }
    }
  } catch (notifErr) {
    logger.error("[CLAIM_STATUS_CHANGE] Notification error:", notifErr);
  }

  return NextResponse.json({
    success: true,
    message: `Status updated to ${payload.lifecycleStage}`,
    claim: updated,
  });
}

async function handleToggleVisibility(
  claimId: string,
  payload: Extract<ActionPayload, { action: "toggle_visibility" }>
) {
  let updated = 0;

  if (payload.type === "photo") {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { projectId: true },
    });

    if (claim?.projectId) {
      const result = await prisma.documents.updateMany({
        where: {
          id: { in: payload.itemIds },
          projectId: claim.projectId,
        },
        data: { isPublic: payload.visible },
      });
      updated = result.count;
    }
  } else if (payload.type === "timeline") {
    const result = await prisma.claim_timeline_events.updateMany({
      where: {
        id: { in: payload.itemIds },
        claim_id: claimId,
      },
      data: { visible_to_client: payload.visible },
    });
    updated = result.count;
  }

  return NextResponse.json({
    success: true,
    updated,
    type: payload.type,
    visible: payload.visible,
  });
}

async function handleInvite(
  claimId: string,
  orgId: string,
  userId: string,
  payload: Extract<ActionPayload, { action: "invite" }>
) {
  // Check permission
  const hasPermission = await canInviteClients({ userId, claimId });
  if (!hasPermission) {
    return NextResponse.json(
      { error: "You don't have permission to invite clients" },
      { status: 403 }
    );
  }

  // Create access record
  const id = crypto.randomUUID();
  const access = await prisma.client_access.create({
    data: {
      id,
      claimId,
      email: payload.email,
    },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/portal/invite/${id}`;

  return NextResponse.json({
    success: true,
    access,
    inviteUrl,
    message: `Invitation sent to ${payload.email}`,
  });
}

async function handleInviteClient(
  claimId: string,
  userId: string,
  payload: Extract<ActionPayload, { action: "invite_client" }>
) {
  // Verify Pro has access
  const hasAccess = await verifyProClaimAccess(userId, claimId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if invite exists
  const existing = await prisma.claimClientLink.findUnique({
    where: {
      claimId_clientEmail: {
        claimId,
        clientEmail: payload.clientEmail,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Client already invited to this claim" }, { status: 409 });
  }

  // Create invite
  const link = await prisma.claimClientLink.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      clientEmail: payload.clientEmail,
      clientName: payload.clientName,
      clientUserId: "",
      status: "PENDING",
      invitedBy: userId,
    },
  });

  // Get org branding
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { orgId: true },
  });

  let companyName = "SkaiScraper";
  if (claim?.orgId) {
    const branding = await prisma.org_branding.findFirst({
      where: { orgId: claim.orgId },
      select: { companyName: true },
    });
    if (branding?.companyName) companyName = branding.companyName;
  }

  // Send email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com";
  const magicLink = `${appUrl}/client/accept-invite?token=${link.id}`;

  await sendEmail({
    to: payload.clientEmail,
    subject: TEMPLATES.CLIENT_INVITE.subject,
    html: TEMPLATES.CLIENT_INVITE.getHtml({
      companyName,
      clientName: payload.clientName || "there",
      magicLink,
    }),
  }).catch(logger.error);

  return NextResponse.json({
    success: true,
    link,
    message: `Invitation sent to ${payload.clientEmail}`,
  });
}

async function handleAttachContact(
  claimId: string,
  orgId: string,
  payload: Extract<ActionPayload, { action: "attach_contact" }>
) {
  // Verify contact exists and belongs to org
  const contact = await prisma.contacts.findFirst({
    where: { id: payload.contactId, orgId },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Update claim with clientId (the contact's Client record)
  // First check if there's a Client record for this contact
  let clientId: string | null = null;
  if (contact.email) {
    const client = await prisma.client.findFirst({
      where: { email: contact.email },
      select: { id: true },
    });
    clientId = client?.id || null;
  }

  await prisma.claims.update({
    where: { id: claimId },
    data: { clientId: clientId || payload.contactId },
  });

  // Create client_access record so the client can view this claim in the portal
  if (contact.email) {
    await prisma.client_access.upsert({
      where: {
        claimId_email: { claimId, email: contact.email },
      },
      create: {
        id: crypto.randomUUID(),
        claimId,
        email: contact.email,
      },
      update: {},
    });
  }

  return NextResponse.json({
    success: true,
    message: "Contact attached to claim",
    contact: {
      id: contact.id,
      name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email,
      email: contact.email,
    },
  });
}

async function handleAddNote(
  claimId: string,
  orgId: string,
  userId: string,
  payload: Extract<ActionPayload, { action: "add_note" }>
) {
  const note = await prisma.claim_timeline_events.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      org_id: orgId,
      actor_id: userId,
      actor_type: "user",
      type: payload.type === "internal" ? "internal_note" : "note",
      description: payload.content,
      visible_to_client: payload.type !== "internal",
      occurred_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    note: {
      id: note.id,
      content: note.description,
      isInternal: !note.visible_to_client,
      createdAt: note.occurred_at,
    },
  });
}

async function handleAddTimelineEvent(
  claimId: string,
  orgId: string,
  userId: string,
  payload: Extract<ActionPayload, { action: "add_timeline_event" }>
) {
  const event = await prisma.claim_timeline_events.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      org_id: orgId,
      actor_id: userId,
      actor_type: "user",
      type: payload.eventType || "custom",
      description: `${payload.title || ""}: ${payload.description || ""}`.trim(),
      visible_to_client: payload.visibleToClient,
      occurred_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    event: {
      id: event.id,
      title: event.type,
      description: event.description,
      eventType: event.type,
      visibleToClient: event.visible_to_client,
      createdAt: event.occurred_at,
    },
  });
}

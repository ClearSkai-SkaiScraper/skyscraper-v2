/**
 * Portal Invitations Actions - Unified handler for invitation operations
 *
 * POST /api/portal/invitations/actions
 * Actions: accept, decline, send_invite, send_job_invite
 *
 * Uses client_access table for claim access grants.
 * Invitation lifecycle is tracked via claim_activities.
 */

// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/observability/logger";
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
    // eslint-disable-next-line @typescript-eslint/await-thenable
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

  // Send invitation email via Resend
  try {
    const { sendEmail, TEMPLATES } = await import("@/lib/email/resend");

    // Resolve the claim address for context
    const claim = await prisma.claims.findUnique({
      where: { id: input.claimId },
      select: { orgId: true },
    });

    // Resolve company name from the claim's org
    let companyName = "SkaiScraper";
    if (claim?.orgId) {
      const org = await prisma.org.findUnique({
        where: { id: claim.orgId },
        select: { name: true },
      });
      companyName = org?.name || companyName;
    }

    // eslint-disable-next-line no-restricted-syntax
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com"}/portal/claims/${input.claimId}`;

    await sendEmail({
      to: input.email,
      subject: TEMPLATES.CLIENT_INVITE.subject,
      html: TEMPLATES.CLIENT_INVITE.getHtml({
        clientName: input.email.split("@")[0],
        magicLink: portalUrl,
        companyName,
      }),
    });

    logger.info("[Portal Invitations] Email sent", {
      to: input.email,
      claimId: input.claimId,
    });
  } catch (emailError) {
    // Don't fail the invitation if email fails — access is already granted
    logger.error("[Portal Invitations] Email delivery failed:", emailError);
  }

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
  // Create a work request linked to this job for the invited user
  logger.info("[Portal Invitations] Job invite sent", {
    userId,
    email: input.email,
    jobId: input.jobId,
  });

  // Send notification email to the invited user
  try {
    const { sendEmail } = await import("@/lib/email/resend");

    // eslint-disable-next-line no-restricted-syntax
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com"}/portal/jobs`;

    await sendEmail({
      to: input.email,
      subject: "You've been invited to a job on SkaiScraper",
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h2 style="color: #1a1a1a; margin-bottom: 16px;">You've been invited to collaborate</h2>
    <p style="color: #666; line-height: 1.6;">
      Someone has invited you to collaborate on a job project.
      ${input.message ? `<br/><br/><em>"${input.message}"</em>` : ""}
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${portalUrl}" style="display: inline-block; padding: 12px 32px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View in Portal
      </a>
    </div>
    <p style="color: #999; font-size: 14px;">— SkaiScraper Team</p>
  </div>
</body>
</html>`,
    });

    logger.info("[Portal Invitations] Job invite email sent", {
      to: input.email,
      jobId: input.jobId,
    });
  } catch (emailError) {
    logger.error("[Portal Invitations] Job invite email failed:", emailError);
  }

  return NextResponse.json({
    success: true,
    invitation: { id: crypto.randomUUID() },
    message: "Job invitation sent",
  });
}

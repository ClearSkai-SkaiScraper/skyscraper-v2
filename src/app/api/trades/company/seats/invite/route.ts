export const dynamic = "force-dynamic";

/**
 * /api/trades/company/seats/invite
 *
 * POST — Send a seat invitation (create pending member + email)
 * DELETE — Revoke a pending invitation
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { checkSeatAvailability } from "@/lib/billing/seat-enforcement";
import { getResend } from "@/lib/email/resend";
import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/* ────────────────────────────────────────────────────────────── */
/*  POST — Send invite                                           */
/* ────────────────────────────────────────────────────────────── */

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const { email, firstName, lastName, role, title } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the user's company (must be admin/owner)
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId, status: "active" },
      include: { company: true },
    });

    if (!membership || !membership.company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const isOwner = membership.isOwner === true;
    if (!membership.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const companyId = membership.company.id;
    const companyName = membership.company.name;

    // Enforce seat limits before allowing invite
    if (membership.company.orgId) {
      const seatCheck = await checkSeatAvailability(membership.company.orgId);
      if (!seatCheck.allowed) {
        return NextResponse.json(
          {
            error: `Seat limit reached (${seatCheck.seatsUsed}/${seatCheck.seatsPurchased}). Upgrade your plan to add more seats.`,
          },
          { status: 403 }
        );
      }
    }

    // Check if already a member
    const existing = await prisma.tradesCompanyMember.findFirst({
      where: {
        companyId,
        OR: [{ email }, { email: email.toLowerCase() }],
      },
    });

    if (existing && existing.status === "active") {
      return NextResponse.json({ error: "This person is already a team member" }, { status: 409 });
    }

    // Create invite token
    const token = randomUUID();
    const inviteLink = `${APP_URL}/trades/join?token=${token}`;

    if (
      existing &&
      (existing.status === "pending" ||
        existing.status === "removed" ||
        existing.status === "inactive")
    ) {
      // Re-invite: update existing record back to pending with new token
      const pendingUserId = `pending_${token.replace(/-/g, "").slice(0, 20)}`;
      await prisma.tradesCompanyMember.update({
        where: { id: existing.id },
        data: {
          status: "pending",
          pendingCompanyToken: token,
          userId: existing.status !== "pending" ? pendingUserId : existing.userId,
          companyId,
          companyName,
          orgId: orgId || existing.orgId,
          firstName: firstName || existing.firstName,
          lastName: lastName || existing.lastName,
          jobTitle: title || existing.jobTitle,
          isAdmin: false,
          canEditCompany: false,
        },
      });
      logger.info("[Seats] Re-invited previously removed member", {
        companyId,
        email,
        previousStatus: existing.status,
      });
    } else if (!existing) {
      // Create new pending member
      // userId is required — use a placeholder that gets replaced on accept
      const pendingUserId = `pending_${token.replace(/-/g, "").slice(0, 20)}`;
      await prisma.tradesCompanyMember.create({
        data: {
          userId: pendingUserId,
          companyId,
          companyName,
          orgId: orgId || null,
          email: email.toLowerCase(),
          firstName: firstName || null,
          lastName: lastName || null,
          jobTitle: title || null,
          role: role || "member",
          status: "pending",
          pendingCompanyToken: token,
          isAdmin: false,
          canEditCompany: false,
        },
      });
    }

    // Attempt to send invite email (non-blocking)
    let emailSent = true;
    let emailError: string | null = null;

    try {
      const resend = getResend();
      if (resend) {
        await resend.emails.send({
          // eslint-disable-next-line no-restricted-syntax
          from: process.env.RESEND_FROM_EMAIL || "noreply@skaiscrape.com",
          to: email.toLowerCase(),
          subject: `You're invited to join ${companyName} on Skai`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:0; background:#f4f4f5;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#117CFF 0%,#00C2FF 100%); padding:32px; border-radius:16px 16px 0 0; text-align:center;">
      <h1 style="color:white; margin:0; font-size:28px; font-weight:700;">You're Invited!</h1>
    </div>
    <div style="background:white; padding:32px; border-radius:0 0 16px 16px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <p style="color:#374151; font-size:16px; line-height:1.6;">
        Hi${firstName ? ` ${firstName}` : ""},
      </p>
      <p style="color:#374151; font-size:16px; line-height:1.6;">
        <strong>${companyName}</strong> has invited you to join their team on Skai — the storm restoration platform.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${inviteLink}" style="display:inline-block; background:linear-gradient(135deg,#117CFF 0%,#00C2FF 100%); color:white; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:600; font-size:16px;">
          Accept Invitation
        </a>
      </div>
      <p style="color:#6b7280; font-size:14px;">This invite link is unique to you. If you didn't expect this, you can safely ignore it.</p>
    </div>
    <p style="color:#9ca3af; font-size:12px; text-align:center; margin:24px 0 0;">
      Powered by <a href="https://skaiscrape.com" style="color:#117CFF; text-decoration:none;">Skai</a>
    </p>
  </div>
</body>
</html>`,
        });
      }
      logger.info("[Seats] Invite email sent", {
        companyId,
        email,
        token: token.slice(0, 8) + "...",
        inviteLink,
      });
    } catch (emailErr: unknown) {
      emailSent = false;
      emailError = emailErr instanceof Error ? emailErr.message : "Email delivery failed";
      logger.warn("[Seats] Email delivery failed:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteLink,
      emailSent,
      emailError,
    });
  } catch (error: unknown) {
    logger.error("[Seats] Invite POST error:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
});

/* ────────────────────────────────────────────────────────────── */
/*  DELETE — Revoke invite                                       */
/* ────────────────────────────────────────────────────────────── */

export const DELETE = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
    }

    // Find the user's company
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId, status: "active" },
      include: { company: true },
    });

    if (!membership || !membership.company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const isOwner = membership.isOwner === true;
    if (!membership.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Delete the pending member
    const invite = await prisma.tradesCompanyMember.findFirst({
      where: {
        id: inviteId,
        companyId: membership.company.id,
        status: "pending",
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    await prisma.tradesCompanyMember.delete({ where: { id: inviteId } });

    logger.info("[Seats] Invite revoked", {
      companyId: membership.company.id,
      inviteId,
      email: invite.email,
    });

    return NextResponse.json({ success: true, message: "Invite revoked" });
  } catch (error: unknown) {
    logger.error("[Seats] Invite DELETE error:", error);
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }
});

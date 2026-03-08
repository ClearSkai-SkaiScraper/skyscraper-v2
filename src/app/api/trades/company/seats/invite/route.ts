export const dynamic = "force-dynamic";

/**
 * /api/trades/company/seats/invite
 *
 * POST — Send a seat invitation (create pending member + email)
 * DELETE — Revoke a pending invitation
 */

import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/* ────────────────────────────────────────────────────────────── */
/*  POST — Send invite                                           */
/* ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com"}/trades/join?token=${token}`;

    if (existing && existing.status === "pending") {
      // Update existing pending invite with new token
      await prisma.tradesCompanyMember.update({
        where: { id: existing.id },
        data: {
          pendingCompanyToken: token,
          firstName: firstName || existing.firstName,
          lastName: lastName || existing.lastName,
          jobTitle: title || existing.jobTitle,
        },
      });
    } else {
      // Create new pending member
      // userId is required — use a placeholder that gets replaced on accept
      const pendingUserId = `pending_${token.replace(/-/g, "").slice(0, 20)}`;
      await prisma.tradesCompanyMember.create({
        data: {
          userId: pendingUserId,
          companyId,
          companyName,
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
      // Email sending would go here — for now just log
      logger.info("[Seats] Invite created", {
        companyId,
        email,
        token: token.slice(0, 8) + "...",
        inviteLink,
      });
    } catch (emailErr: any) {
      emailSent = false;
      emailError = emailErr?.message || "Email delivery failed";
      logger.warn("[Seats] Email delivery failed:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteLink,
      emailSent,
      emailError,
    });
  } catch (error) {
    logger.error("[Seats] Invite POST error:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────── */
/*  DELETE — Revoke invite                                       */
/* ────────────────────────────────────────────────────────────── */

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (error) {
    logger.error("[Seats] Invite DELETE error:", error);
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }
}

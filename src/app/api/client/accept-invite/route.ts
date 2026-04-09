export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * POST /api/client/accept-invite
 *
 * Client accepts a claim invite using a magic-link token (ClaimClientLink.id).
 * - Validates token exists & is still PENDING
 * - Links the authenticated Clerk user to the ClaimClientLink
 * - Creates client_access row so client can view the claim in /client/claim/[claimId]
 * - Returns the claimId so the page can redirect
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId, email: userEmail } = authResult;

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
    }

    // Look up the invite
    const link = await prisma.claimClientLink.findUnique({
      where: { id: token },
      include: {
        claims: {
          select: { id: true, claimNumber: true, title: true, orgId: true },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Invite not found or has expired" }, { status: 404 });
    }

    if (link.status === "CONNECTED") {
      // Already accepted — just redirect
      return NextResponse.json({
        ok: true,
        alreadyAccepted: true,
        claimId: link.claimId,
        message: "You've already accepted this invite.",
      });
    }

    if (link.status !== "PENDING") {
      return NextResponse.json(
        { error: `This invite is no longer valid (status: ${link.status})` },
        { status: 410 }
      );
    }

    const email = userEmail || link.clientEmail;

    // Update the ClaimClientLink → CONNECTED
    await prisma.claimClientLink.update({
      where: { id: token },
      data: {
        status: "CONNECTED",
        clientUserId: userId,
        acceptedAt: new Date(),
      },
    });

    // Ensure client_access row exists so /client/claim/[claimId] works
    await prisma.client_access.upsert({
      where: {
        claimId_email: {
          claimId: link.claimId,
          email,
        },
      },
      create: {
        id: crypto.randomUUID(),
        claimId: link.claimId,
        email,
      },
      update: {}, // no-op if exists
    });

    // Log timeline event (non-critical)
    try {
      await prisma.claim_timeline_events.create({
        data: {
          id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          claim_id: link.claimId,
          org_id: link.claims.orgId,
          type: "client_invite_accepted",
          description: `${link.clientName || email} accepted the claim invite.`,
          visible_to_client: true,
        },
      });
    } catch {
      // Non-critical — don't block acceptance
    }

    return NextResponse.json({
      ok: true,
      claimId: link.claimId,
      claimNumber: link.claims.claimNumber,
      message: "Invite accepted! Redirecting to your claim…",
    });
  } catch {
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}

/**
 * GET /api/client/accept-invite?token=xxx
 *
 * Pre-flight: returns invite details without accepting.
 * Used by the page to show who sent the invite before the user clicks Accept.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const link = await prisma.claimClientLink.findUnique({
      where: { id: token },
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        status: true,
        invitedAt: true,
        claimId: true,
        claims: {
          select: {
            claimNumber: true,
            title: true,
            orgId: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Get company name for branding
    let companyName = "SkaiScraper";
    if (link.claims.orgId) {
      const branding = await prisma.org_branding.findFirst({
        where: { orgId: link.claims.orgId },
        select: { companyName: true },
      });
      if (branding?.companyName) companyName = branding.companyName;
    }

    return NextResponse.json({
      token: link.id,
      clientName: link.clientName,
      clientEmail: link.clientEmail,
      status: link.status,
      invitedAt: link.invitedAt,
      claimNumber: link.claims.claimNumber,
      claimTitle: link.claims.title,
      companyName,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load invite" }, { status: 500 });
  }
}

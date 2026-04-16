export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { FROM_EMAIL, getResend, REPLY_TO_EMAIL, TEMPLATES } from "@/lib/email/resend";
import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ClientInviteSchema } from "@/lib/validation/schemas";

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Validate request body with Zod
    const { clientId, email } = ClientInviteSchema.parse(body);

    // Verify the Org exists and get internal ID
    const Org = await prisma.org.findFirst({
      where: { id: orgId },
      select: { id: true },
    });

    if (!Org) {
      return new NextResponse("Organization not found", { status: 404 });
    }

    // Ensure client exists and belongs to this Org
    const client = await prisma.client.findFirst({
      where: { id: clientId, orgId: Org.id },
    });

    if (!client) {
      return new NextResponse("Client not found or access denied", { status: 404 });
    }

    // Create or get Clerk user for this email
    let clerkUser;
    const existingUsersResponse = await clerkClient.users.getUserList({
      emailAddress: [email],
    });
    const existingUsers = existingUsersResponse.data || [];

    if (existingUsers.length > 0) {
      clerkUser = existingUsers[0];
    } else {
      // Create new Clerk user
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        publicMetadata: { role: "client" },
      });
    }

    // Ensure publicMetadata.role = "client"
    if (clerkUser.publicMetadata?.role !== "client") {
      await clerkClient.users.updateUser(clerkUser.id, {
        publicMetadata: { ...(clerkUser.publicMetadata || {}), role: "client" },
      });
    }

    // Update the client record to link with Clerk user
    await prisma.client.update({
      where: { id: client.id },
      data: {
        userId: clerkUser.id,
        email: email,
      },
    });

    // Get org branding for email customization
    const orgBranding = await prisma.org_branding.findFirst({
      where: { orgId: Org.id },
      select: { companyName: true },
    });

    // Send magic-link email with Resend (uses Clerk magic link flow)
    const magicLink = `${APP_URL}/client/sign-in?email=${encodeURIComponent(email)}`;

    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: email,
        subject: TEMPLATES.CLIENT_INVITE.subject,
        html: TEMPLATES.CLIENT_INVITE.getHtml({
          clientName: client.name || client.firstName || email.split("@")[0],
          magicLink: magicLink,
          companyName: orgBranding?.companyName || "SkaiScraper",
        }),
      });
    } catch (emailError) {
      logger.error("Error sending client invite email:", emailError);
      // Don't fail the whole request if email fails - log and continue
    }

    return NextResponse.json({
      ok: true,
      message: "Client invited to portal successfully",
      clerkUserId: clerkUser.id,
      // Don't return token in production - it's sent via email
    });
  } catch (error) {
    logger.error("Error inviting client to portal:", error);
    return new NextResponse(error?.message || "Internal server error", {
      status: 500,
    });
  }
});

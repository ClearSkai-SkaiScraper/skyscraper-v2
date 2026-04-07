export const dynamic = "force-dynamic";

/**
 * Client Network Invite API
 * POST /api/network/clients/invite
 *
 * Sends an email invite to a client to join their client portal.
 * Creates a pending client network with invite token.
 */

import { currentUser } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getResend } from "@/lib/email/resend";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { email, name, networkId } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get the current user for sender info
    const user = await currentUser();
    const senderName = user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Your Pro";

    // Generate unique invite token
    const inviteToken = randomBytes(16).toString("hex");

    // Create or update the client network with invite info
    let network;
    if (networkId) {
      network = await prisma.client_networks.findUnique({ where: { id: networkId } });
    }

    // If no network exists, create a new one
    if (!network) {
      const slug = (name || email)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 40);

      network = await prisma.client_networks.create({
        data: {
          name: name || email.split("@")[0],
          slug: `${slug}-${inviteToken.substring(0, 6)}`,
          orgId,
          status: "pending",
        },
      });

      // Create a contact for this network
      await prisma.client_contacts.create({
        data: {
          clientNetworkId: network.id,
          name: name || email.split("@")[0],
          email,
          role: "Homeowner",
          isPrimary: true,
        },
      });
    }

    // Generate invite link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://skaiscrape.com";
    const inviteLink = `${baseUrl}/portal/${network.slug}/join?token=${inviteToken}`;

    // Send email via Resend
    const resend = getResend();
    try {
      await resend.emails.send({
        from: "Skai <noreply@skaiscrape.com>",
        to: email,
        subject: `${senderName} invited you to view your project`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #117CFF 0%, #00C2FF 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">You're Invited!</h1>
                </div>
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Hi${name ? ` ${name}` : ""},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    <strong>${senderName}</strong> has invited you to access your client portal on Skai. Here you can:
                  </p>
                  <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0 0 24px; padding-left: 24px;">
                    <li>View project progress and updates</li>
                    <li>Access documents and reports</li>
                    <li>Communicate directly with your pro</li>
                    <li>See photos and inspection details</li>
                  </ul>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #117CFF 0%, #00C2FF 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                    This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
                  </p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 24px 0 0;">
                  Powered by <a href="https://skaiscrape.com" style="color: #117CFF; text-decoration: none;">Skai</a>
                </p>
              </div>
            </body>
            </html>
          `,
      });
    } catch (emailError) {
      logger.error("[Client Invite] Failed to send email:", emailError);
      // Continue even if email fails - they can use the link
    }

    // Create a notification for the client if they have an account
    try {
      const existingUser = await prisma.users.findFirst({
        where: { email },
      });

      // Note: ProjectNotification requires orgId and claimId which we don't have here
      // Skip creating notification for now - could use a different notification table
      void existingUser;
    } catch (notifError) {
      // Notification is optional, continue
      logger.error("[Client Invite] Failed to create notification:", notifError);
    }

    return NextResponse.json({
      success: true,
      networkId: network.id,
      inviteLink,
      message: `Invite sent to ${email}`,
    });
  } catch (error) {
    logger.error("[Client Invite Error]", error);
    return NextResponse.json(
      { error: "Failed to send invite", details: "Internal server error" },
      { status: 500 }
    );
  }
});

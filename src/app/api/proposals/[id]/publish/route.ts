export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PHASE 3 SPRINT 3: POST /api/proposals/[id]/publish
 * Publishes a proposal (marks as published, optionally sends email)
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { FROM_EMAIL, getResend, REPLY_TO_EMAIL, TEMPLATES } from "@/lib/email/resend";
import prisma from "@/lib/prisma";
import type { ProposalPublishResponse } from "@/lib/proposals/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { ProposalPublishSchema } from "@/lib/validation/schemas";

export const POST = withAuth(
  async (req: NextRequest, { userId, orgId }, params: { params: { id: string } }) => {
    try {
      const rl = await checkRateLimit(userId, "API");
      if (!rl.success) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", message: "Too many requests" },
          { status: 429 }
        );
      }

      const { id } = params.params;
      const bodyData = await req.json();

      // Validate request body with Zod
      const body = ProposalPublishSchema.parse(bodyData);

      // Fetch proposal draft
      const draft = await prisma.proposal_drafts.findUnique({
        where: { id },
      });

      if (!draft) {
        return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
      }

      // Verify org ownership
      if (draft.org_id !== orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Verify proposal has been rendered
      const hasFiles = await prisma.proposal_files.findFirst({
        where: { proposal_id: id, kind: "pdf" },
      });

      if (!hasFiles) {
        return NextResponse.json(
          { error: "Proposal must be rendered before publishing" },
          { status: 400 }
        );
      }

      // Update status to published
      await prisma.proposal_drafts.update({
        where: { id },
        data: { status: "published" },
      });

      // Send email if recipients provided
      let emailsSentCount = 0;
      if (body.emailRecipients && body.emailRecipients.length > 0) {
        try {
          const resend = getResend();
          const proposalLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com"}/proposals/${id}`;

          // Get org branding for email customization
          const orgBranding = await prisma.org_branding.findFirst({
            where: { orgId },
            select: { companyName: true },
          });

          // Send emails to all recipients
          const emailPromises = body.emailRecipients.map(async (recipientEmail) => {
            try {
              await resend.emails.send({
                from: FROM_EMAIL,
                replyTo: REPLY_TO_EMAIL,
                to: recipientEmail,
                subject: TEMPLATES.PROPOSAL_PUBLISHED.subject,
                html: TEMPLATES.PROPOSAL_PUBLISHED.getHtml({
                  recipientName: recipientEmail.split("@")[0],
                  proposalLink: proposalLink,
                  message: body.message,
                  companyName: orgBranding?.companyName || "SkaiScraper",
                }),
              });
              emailsSentCount++;
            } catch (err) {
              logger.error(`Failed to send proposal email to ${recipientEmail}:`, err);
            }
          });

          await Promise.allSettled(emailPromises);
        } catch (emailError) {
          logger.error("Error sending proposal emails:", emailError);
          // Don't fail the whole request if email fails
        }
      }

      // Track analytics: proposal.published
      logger.info("[Analytics] proposal.published", {
        userId,
        orgId,
        proposalId: id,
        packetType: draft.packet_type,
        emailSent: emailsSentCount > 0,
      });

      const response: ProposalPublishResponse = {
        success: true,
        publishedAt: new Date(),
        emailsSent: emailsSentCount,
      };

      return NextResponse.json(response);
    } catch (error) {
      logger.error("[API] /api/proposals/[id]/publish error:", error);
      return NextResponse.json(
        {
          error: "Failed to publish proposal",
          details: "Internal error",
        },
        { status: 500 }
      );
    }
  }
);

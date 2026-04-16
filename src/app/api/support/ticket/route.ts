export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * POST /api/support/ticket - Submit a support ticket
 */
export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = await req.json();
    const { subject, message, priority, email, name } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    // Log the support ticket (in production this would create a ticket in your support system)
    logger.info("[SUPPORT_TICKET]", {
      userId,
      orgId,
      subject,
      priority: priority || "normal",
      email,
      name,
      messagePreview: message.slice(0, 200),
    });

    // In production, you would:
    // 1. Create a ticket in your support system (Zendesk, Intercom, etc.)
    // 2. Send a confirmation email to the user
    // 3. Notify your support team

    // For now, we'll send an email via the existing email system
    try {
      // Try to send notification email to support team
      // eslint-disable-next-line no-restricted-syntax
      const supportEmail = process.env.SUPPORT_EMAIL || "damien.willingham@outlook.com";

      // This is a placeholder - in production, use your email service
      await fetch(`${APP_URL}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: supportEmail,
          subject: `[Support Ticket] ${priority?.toUpperCase() || "NORMAL"}: ${subject}`,
          text: `
Support Ticket from SkaiScraper

From: ${name || "Unknown"} (${email || "No email provided"})
User ID: ${userId}
Org ID: ${orgId || "None"}
Priority: ${priority || "normal"}

Subject: ${subject}

Message:
${message}

---
This ticket was submitted via the Help & Support page.
          `.trim(),
        }),
      }).catch(() => {
        // Silent fail - ticket is still logged
      });
    } catch {
      // Silent fail - ticket is still logged
    }

    return NextResponse.json({
      success: true,
      message: "Support ticket submitted successfully",
      ticketId: `SKAI-${Date.now().toString(36).toUpperCase()}`,
    });
  } catch (error) {
    logger.error("[SUPPORT_TICKET] Error:", error);
    return NextResponse.json({ error: "Failed to submit support ticket" }, { status: 500 });
  }
});

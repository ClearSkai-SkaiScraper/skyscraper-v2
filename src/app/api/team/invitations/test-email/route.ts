export const dynamic = "force-dynamic";

/**
 * Invite Diagnostics API — Tests team invitation email delivery
 *
 * GET /api/team/invitations/test-email?email=buddy@example.com
 *
 * Protected: Admin only. Sends a test invite-style email to verify
 * Resend is working for team invitations.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAdmin } from "@/lib/auth/withAuth";
import { FROM_EMAIL, getResend } from "@/lib/email/resend";
import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAdmin(async (req: NextRequest, { userId, orgId }) => {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }

  const diagnostics: Record<string, unknown> = {
    FROM_EMAIL,
    APP_URL,
    RESEND_API_KEY_SET: !!process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "(not set, using default)",
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    const resend = getResend();
    diagnostics.resend_client_initialized = !!resend;

    if (!resend) {
      return NextResponse.json({
        success: false,
        error: "Resend client not initialized",
        diagnostics,
      });
    }

    // Send a test email using the exact same pattern as invite emails
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "[TEST] SkaiScraper Team Invitation Email Test",
      html: `<h1>Invite Email Test</h1>
        <p>This is a diagnostic test of the team invitation email system.</p>
        <p><strong>From:</strong> ${FROM_EMAIL}</p>
        <p><strong>To:</strong> ${email}</p>
        <p><strong>APP_URL:</strong> ${APP_URL}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><a href="${APP_URL}/invite/test-token-123">Test Invite Link</a></p>`,
      text: `Invite email test. From: ${FROM_EMAIL}. To: ${email}. Timestamp: ${new Date().toISOString()}`,
    });

    if (error) {
      diagnostics.resend_error = error;
      logger.error("[INVITE_TEST] Resend API error:", error);
      return NextResponse.json({ success: false, error: error.message, diagnostics });
    }

    diagnostics.message_id = data?.id;
    logger.info(`[INVITE_TEST] ✅ Test email sent to ${email}, id: ${data?.id}`);

    return NextResponse.json({ success: true, messageId: data?.id, diagnostics });
  } catch (err: any) {
    diagnostics.exception = err.message;
    logger.error("[INVITE_TEST] Exception:", err);
    return NextResponse.json({ success: false, error: err.message, diagnostics }, { status: 500 });
  }
});

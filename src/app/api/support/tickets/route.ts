/* eslint-disable no-restricted-syntax */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { pool } from "@/server/db";

/**
 * POST /api/support/tickets
 * Create a new support ticket (bug report, feature request, or general support)
 */
export async function POST(req: Request) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { orgId, userId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 400 });
  }

  // Rate limit to prevent spam
  const rl = await checkRateLimit(userId, "AI");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { type, title, description, buildSHA, currentPage, userAgent } = body;

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, description" },
        { status: 400 }
      );
    }

    // Insert support ticket
    const result = await pool.query(
      `
      INSERT INTO support_tickets (
        org_id, user_id, type, title, description,
        build_sha, current_page, user_agent,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
      `,
      [
        orgId,
        userId,
        type,
        title,
        description,
        buildSHA || null,
        currentPage || null,
        userAgent || null,
        JSON.stringify({}),
      ]
    );

    const ticket = result.rows[0];

    logger.info(`[SUPPORT_TICKET] Created ticket ${ticket.id} for org ${orgId}:`, {
      type,
      title,
    });

    // Send confirmation email to user
    try {
      const { sendEmail } = await import("@/lib/email/resend");

      // Get user email
      const userResult = await pool.query(
        "SELECT email FROM users WHERE clerk_user_id = $1 LIMIT 1",
        [userId]
      );

      const userEmail = userResult.rows[0]?.email;

      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: `Support Ticket #${ticket.id} Received`,
          html: `
            <h1>Support Ticket Received</h1>
            <p>Thank you for contacting support. We've received your ${type} request:</p>
            <p><strong>Ticket ID:</strong> #${ticket.id}</p>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p>Our team will review your request and respond within 24-48 hours during weekdays.</p>
            // eslint-disable-next-line no-restricted-syntax
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/support">View Support Tickets</a></p>
          `,
        }).catch((err) => logger.error("Failed to send ticket confirmation email:", err));
      }
    } catch (error) {
      logger.error("Failed to send support ticket email:", error);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      createdAt: ticket.created_at,
    });
  } catch (error) {
    logger.error("[SUPPORT_TICKET] Error:", error);
    return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 });
  }
}

/**
 * GET /api/support/tickets
 * Get support tickets for current org
 */
export async function GET() {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, type, title, description, status, priority,
             build_sha, current_page, created_at, updated_at, resolved_at
      FROM support_tickets
      WHERE org_id = $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [orgId]
    );

    return NextResponse.json({ tickets: result.rows });
  } catch (error) {
    logger.error("[SUPPORT_TICKETS_GET] Error:", error);
    return NextResponse.json({ tickets: [] });
  }
}

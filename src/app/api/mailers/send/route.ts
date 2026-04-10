/**
 * Send Mailers API
 * POST /api/mailers/send
 * Order print+mail fulfillment for batch job addresses
 *
 * STUB: Mailer batch/job models are not yet in Prisma schema.
 * This endpoint returns a "not implemented" response until the
 * BatchJob, MailerBatch, and MailerJob models are added.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { LOB_ENABLED } from "@/lib/lob/client";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface SendMailersRequest {
  batchJobId: string;
  selection: "all" | "high_confidence" | "custom";
  addressIds?: string[];
  template?: "postcard" | "letter";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "AUTH");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    if (!LOB_ENABLED) {
      return NextResponse.json({ error: "Mailer fulfillment not configured" }, { status: 503 });
    }

    // Parse request body for validation
    const body: SendMailersRequest = await req.json();
    const { batchJobId, selection, addressIds: _addressIds, template = "postcard" } = body;

    // STUB: BatchJob, MailerBatch, and MailerJob models not yet in Prisma schema
    // Return a placeholder response indicating feature is not yet available
    logger.info(
      `[Mailers] Stub: Would send ${template} mailers for batch ${batchJobId} with selection: ${selection}`
    );

    return NextResponse.json(
      {
        success: false,
        error: "Mailer functionality not yet implemented. BatchJob/MailerBatch models pending.",
        stub: true,
        request: {
          batchJobId,
          selection,
          template,
        },
      },
      { status: 501 }
    );
  } catch (error) {
    const message = "Failed to send mailers";
    logger.error("[Mailers] Send error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
});

export const dynamic = "force-dynamic";

// src/app/api/estimates/[id]/send-packet/route.ts
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getDelegate } from "@/lib/db/modelAliases";
import { sendPacketEmail } from "@/lib/email/sendPacketEmail";
import type { SendPacketRequestBody } from "@/lib/email/types";
import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id: estimateId } = await routeParams!.params;
  try {
    const body: SendPacketRequestBody = await req.json();
    const { to, cc, subject, message, recipientType } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, message" },
        { status: 400 }
      );
    }

    // Load estimates with claim
    const estimates = await prisma.estimates.findFirst({
      where: {
        id: estimateId,
        orgId,
      },
      include: {
        claims: true,
      },
    });

    if (!estimates || !estimates.claims) {
      return NextResponse.json({ error: "Estimate or claim not found" }, { status: 404 });
    }

    // Determine packet URL
    const packetUrl = `${APP_URL}/exports/estimates/${estimateId}/adjuster`;

    // Send email
    const emailResult = await sendPacketEmail({
      to,
      cc,
      subject,
      message,
      packetUrl,
    });

    if (!emailResult || "skipped" in emailResult) {
      return NextResponse.json({ error: "Email sending failed or was skipped" }, { status: 500 });
    }

    // Update claim fields
    const updateData: any = {
      lastContactedAt: new Date(),
    };

    if (recipientType === "adjuster" && to) {
      updateData.adjusterEmail = to;
      updateData.adjusterPacketSentAt = new Date();
    } else if (recipientType === "homeowner" && to) {
      updateData.homeownerEmail = to;
      updateData.homeownerSummarySentAt = new Date();
    }

    await prisma.claims.update({
      where: { id: estimates.claims.id },
      data: updateData,
    });

    // Create timeline event
    await getDelegate("claimTimelineEvent").create({
      data: {
        claim_id: estimates.claims.id,
        orgId,
        actorId: userId,
        actorType: "user",
        type: "email_sent",
        description: `Estimate packet sent to ${recipientType}\nSubject: ${subject}\nTo: ${to}${cc ? `\nCC: ${cc}` : ""}\n\n${message.substring(0, 200)}${message.length > 200 ? "..." : ""}`,
        metadata: {
          kind: "estimate_packet",
          recipientType,
          to,
          cc,
          subject,
          estimateId,
          packetUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      emailResult,
    });
  } catch (err) {
    logger.error("Error sending estimates email:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
});

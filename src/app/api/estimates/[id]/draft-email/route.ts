export const dynamic = "force-dynamic";

// src/app/api/estimates/[id]/draft-email/route.ts
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { draftPacketEmail } from "@/lib/email/draftPacketEmail";
import type { PacketRecipientType } from "@/lib/email/types";
import { buildEstimatePacketPayload } from "@/lib/export/payloads";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id: estimateId } = await routeParams.params;
  try {
    const body = await req.json();
    const recipientType: PacketRecipientType = body.recipientType || "adjuster";

    // Build payload (includes claim data)
    const payload = await buildEstimatePacketPayload(estimateId, orgId ?? null);

    if (!payload.estimates || !payload.claim) {
      return NextResponse.json({ error: "Estimate or claim not found" }, { status: 404 });
    }

    const packetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com"}/exports/estimates/${estimateId}/adjuster`;

    // Draft email using AI
    const draft = await draftPacketEmail({
      recipientType,
      claim: payload.claim,
      payload,
      packetType: "estimate",
      packetUrl,
    });

    return NextResponse.json({
      success: true,
      ...draft,
    });
  } catch (err) {
    logger.error("Error drafting estimates email:", err);
    return NextResponse.json({ error: "Failed to draft email" }, { status: 500 });
  }
});

export const dynamic = "force-dynamic";

// src/app/api/estimates/[id]/draft-email/route.ts
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { draftPacketEmail } from "@/lib/email/draftPacketEmail";
import type { PacketRecipientType } from "@/lib/email/types";
import { buildEstimatePacketPayload } from "@/lib/export/payloads";

type RouteParams = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const estimateId = params.id;
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
}

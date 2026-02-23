import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { runEstimateBuilder } from "@/lib/ai/estimates";

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.mode) {
      return NextResponse.json(
        { error: "mode is required (insurance|retail|hybrid)" },
        { status: 400 }
      );
    }

    const estimate = await runEstimateBuilder({
      userId,
      orgId: orgId ?? null,
      claimId: body.claimId ?? null,
      mode: body.mode,
      lossType: body.lossType ?? null,
      dol: body.dol ?? null,
      damageAssessmentId: body.damageAssessmentId ?? null,
      scopeId: body.scopeId ?? null,
      supplementIds: body.supplementIds ?? [],
      carrierEstimateText: body.carrierEstimateText ?? null,
    });

    return NextResponse.json({ estimate }, { status: 200 });
  } catch (error) {
    logger.error("Estimate build error:", error);
    return NextResponse.json(
      { error: "Failed to build estimate" },
      { status: 500 }
    );
  }
}

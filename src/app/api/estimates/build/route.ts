export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { runEstimateBuilder } from "@/lib/ai/estimates";
import { withOrgScope } from "@/lib/auth/tenant";

export const POST = withOrgScope(async (req: Request, { userId, orgId }) => {
  try {
    const body = await req.json();
    
    if (!body.mode) {
      return NextResponse.json(
        { error: "mode is required (insurance|retail|hybrid)" },
        { status: 400 }
      );
    }

    const estimate = await runEstimateBuilder({
      userId,
      orgId,       // DB-verified — never null
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
});

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { executeSupplementPacket } from "@/lib/intel/automation/executors/supplement";
import { logger } from "@/lib/logger";

export const POST = withOrgScope(async (req, { userId: _userId, orgId }) => {
  try {
    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const result = await executeSupplementPacket(claimId, orgId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[Supplement Packet Error]", error);
    return NextResponse.json({ error: "Failed to generate supplement packet" }, { status: 500 });
  }
});

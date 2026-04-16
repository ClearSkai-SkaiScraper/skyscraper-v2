export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { runSkaiAutomations } from "@/lib/intel/automation/engine";
import { logger } from "@/lib/logger";

export const POST = withOrgScope(async (req, { userId, orgId }) => {
  try {
    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const result = await runSkaiAutomations(claimId, orgId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[Automation Run Error]", error);
    return NextResponse.json({ error: "Failed to run automation" }, { status: 500 });
  }
});

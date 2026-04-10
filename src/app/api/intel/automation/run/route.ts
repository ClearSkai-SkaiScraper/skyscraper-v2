export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { runSkaiAutomations } from "@/lib/intel/automation/engine";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (user.publicMetadata?.orgId as string) || user.id;
    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const result = await runSkaiAutomations(claimId, orgId);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[Automation Run Error]", error);
    return NextResponse.json(
      { error: "Failed to run automation" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { emitEvent, pushNotification, recordToolRun } from "@/lib/telemetry";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leadId, jobId, tokensUsed, findingsCount } = body;

    const orgId = (user.publicMetadata?.orgId as string) || user.id;

    // Emit activity event
    await emitEvent({
      orgId,
      clerkUserId: user.id,
      kind: "damage.completed",
      refType: "damage-report",
      refId: `damage-${Date.now()}`,
      title: `Damage analysis completed (${findingsCount || 0} findings)`,
      meta: { leadId, jobId, findingsCount },
    });

    // Record tool run for history
    await recordToolRun({
      orgId,
      clerkUserId: user.id,
      tool: "damage-complete",
      status: "success",
      tokensUsed: tokensUsed || 0,
      input: { leadId, jobId },
      output: { findingsCount },
    });

    // Push notification
    await pushNotification({
      orgId,
      clerkUserId: user.id,
      level: "success",
      title: `Damage analysis completed with ${findingsCount || 0} findings`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Telemetry error:", error);
    return NextResponse.json({ error: "Telemetry failed" }, { status: 500 });
  }
}

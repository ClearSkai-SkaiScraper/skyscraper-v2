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

    const orgId = (user.publicMetadata?.orgId as string) || user.id;
    const { exportId, carrier, format, tokensUsed } = await req.json();

    // Emit activity event
    await emitEvent({
      orgId,
      clerkUserId: user.id,
      kind: "carrier.exported",
      refType: "export",
      refId: exportId,
      title: `Carrier export generated: ${carrier} (${format})`,
      meta: { carrier, format },
    });

    // Push notification
    await pushNotification({
      orgId,
      clerkUserId: user.id,
      level: "success",
      title: "Export Ready",
      body: `Your ${carrier} export in ${format} format is ready.`,
      link: `/carrier/export`,
    });

    // Record tool run
    await recordToolRun({
      orgId,
      clerkUserId: user.id,
      tool: "carrier_export",
      status: "success",
      tokensUsed: tokensUsed || 0,
      input: { carrier, format },
      output: { exportId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Carrier export telemetry error:", error);
    return NextResponse.json(
      { error: "Failed to log carrier export telemetry" },
      { status: 500 }
    );
  }
}

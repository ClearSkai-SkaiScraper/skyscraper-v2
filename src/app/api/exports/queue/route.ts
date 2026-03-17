export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// API: EXPORT QUEUE
// ============================================================================

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 403 });
    }

    const jobs = await getDelegate("exportJob").findMany({
      where: {
        OR: [{ userId }, { orgId }],
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to recent 50
    });

    return NextResponse.json(jobs);
  } catch (error) {
    logger.error("[Export Queue GET]", error);
    return NextResponse.json(
      { error: "Failed to get queue" },
      { status: 500 }
    );
  }
}

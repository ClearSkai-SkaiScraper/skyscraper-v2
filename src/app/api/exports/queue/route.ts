export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// API: EXPORT QUEUE
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
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
    return NextResponse.json({ error: "Failed to get queue" }, { status: 500 });
  }
});

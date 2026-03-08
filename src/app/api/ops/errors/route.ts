export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Use activities model directly
const Activity = prisma.activities;

/**
 * GET /api/ops/errors
 * Returns recent error logs for ops dashboard
 */
export async function GET(req: Request) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const rl = await checkRateLimit(authResult.userId, "API");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    if (!Activity) {
      return NextResponse.json({ items: [] });
    }

    // activities uses 'type' and 'createdAt', not 'action' and 'created_at'
    const errors = await Activity.findMany({
      where: {
        type: {
          contains: "error",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        orgId: true,
        type: true,
        description: true,
        createdAt: true,
      },
    }).catch(() => []);

    return NextResponse.json({ items: errors });
  } catch (error) {
    logger.error("[OPS_ERRORS] Failed:", error);
    return NextResponse.json({ items: [] });
  }
}

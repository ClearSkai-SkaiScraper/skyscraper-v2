export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { delFlagCache, logCacheEvent } from "@/lib/flagCache";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/security/roles";

// Invalidate a single feature flag cache entry (admin only)
export async function POST(_req: Request, { params }: { params: { key: string } }) {
  try {
    const { orgId } = await requireAdmin();
    logger.info("[FLAGS_INVALIDATE]", { key: params.key, orgId });
    const cacheKey = `${orgId || "global"}:${params.key}`;
    await delFlagCache(cacheKey);
    logCacheEvent("invalidate", cacheKey);
    return NextResponse.json({ invalidated: cacheKey });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status: 401 });
  }
}

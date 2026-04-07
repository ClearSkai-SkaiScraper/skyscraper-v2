import { NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const steps: Record<string, unknown> = {};

  try {
    // Step 1: getTenant
    steps.step1_start = Date.now();
    const orgId = await getTenant();
    steps.step1_orgId = orgId;
    steps.step1_ok = !!orgId;

    if (!orgId) {
      return NextResponse.json({ ok: false, reason: "no_org", steps }, { status: 401 });
    }

    // Step 2: Count claims
    steps.step2_start = Date.now();
    const count = await prisma.claims.count({ where: { orgId } });
    steps.step2_count = count;

    // Step 3: Fetch claims (same query as page)
    steps.step3_start = Date.now();
    const claims = await prisma.claims.findMany({
      where: { orgId },
      include: {
        properties: true,
        activities: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    steps.step3_fetched = claims.length;
    steps.step3_firstId = claims[0]?.id ?? null;

    // Step 4: Stats query (same as page)
    steps.step4_start = Date.now();
    const stats = await prisma.claims.findMany({
      where: { orgId },
      select: { status: true, estimatedValue: true, signingStatus: true },
    });
    steps.step4_statsCount = stats.length;

    steps.totalMs = Date.now() - (steps.step1_start as number);

    return NextResponse.json({ ok: true, steps });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error("[DIAG_CLAIMS_TEST]", { error: msg, stack, steps });
    return NextResponse.json(
      { ok: false, error: msg, stack: stack?.split("\n").slice(0, 5), steps },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/track-step
 * Tracks onboarding wizard progress server-side.
 * Body: { step: number, complete?: boolean, metadata?: Record<string, unknown> }
 */
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const step = Number(body.step) || 0;
    const complete = body.complete === true;

    // Update org with onboarding progress
    await prisma.org
      .update({
        where: { id: orgId },
        data: {
          ...(step > 0 ? { onboardingStep: step } : {}),
          ...(complete ? { onboardingComplete: true } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, // Fields may not be in generated client yet
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((e: any) => {
        // Fields may not exist yet — fall back to raw SQL
        logger.debug("[TRACK_STEP] Prisma update failed, trying raw SQL:", e.message);
        return prisma.$executeRaw(
          Prisma.sql`UPDATE organizations SET
          onboarding_step = COALESCE(${step > 0 ? step : null}, onboarding_step),
          onboarding_complete = COALESCE(${complete || null}, onboarding_complete),
          updated_at = NOW()
        WHERE id = ${orgId}`
        );
      });

    logger.info("[ONBOARDING_TRACK]", { orgId, step, complete });

    return NextResponse.json({ ok: true, step, complete });
  } catch (error) {
    logger.error("[ONBOARDING_TRACK] Error:", error);
    return NextResponse.json({ error: "Failed to track step" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/track-step
 * Tracks onboarding wizard progress server-side.
 * Body: { step: number, complete?: boolean, metadata?: Record<string, unknown> }
 */
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
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
        } as any, // Fields may not be in generated client yet
      })
      .catch((e: any) => {
        // Fields may not exist yet — fall back to raw SQL
        logger.debug("[TRACK_STEP] Prisma update failed, trying raw SQL:", e.message);
        return prisma.$executeRawUnsafe(
          `UPDATE organizations SET
          onboarding_step = COALESCE($1, onboarding_step),
          onboarding_complete = COALESCE($2, onboarding_complete),
          updated_at = NOW()
        WHERE id = $3`,
          step > 0 ? step : null,
          complete || null,
          orgId
        );
      });

    logger.info("[ONBOARDING_TRACK]", { orgId, step, complete });

    return NextResponse.json({ ok: true, step, complete });
  } catch (error) {
    logger.error("[ONBOARDING_TRACK] Error:", error);
    return NextResponse.json({ error: "Failed to track step" }, { status: 500 });
  }
}

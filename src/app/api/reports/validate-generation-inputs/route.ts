export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { validateGenerationInputs } from "@/lib/reports/recommendation-engine";
import { ValidateInputsRequestSchema } from "@/lib/reports/recommendation-schema";

/**
 * POST /api/reports/validate-generation-inputs
 *
 * Check whether the user has all required inputs for a given template.
 * Returns readiness score, missing fields, and suggestions.
 * Call this before allowing the user to hit "Generate Report".
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = ValidateInputsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = validateGenerationInputs(parsed.data);

    logger.info("[VALIDATE_GENERATION_INPUTS]", {
      templateId: parsed.data.templateId,
      isReady: result.isReady,
      readiness: result.readinessScore,
      missingCount: result.missingRequired.length,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("[VALIDATE_GENERATION_INPUTS] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to validate generation inputs" },
      { status: 500 }
    );
  }
});

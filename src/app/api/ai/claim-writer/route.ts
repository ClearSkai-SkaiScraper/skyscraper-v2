export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { generateClaimNarrative } from "@/lib/ai/claimWriter";
import { aiFail, aiOk } from "@/lib/api/aiResponse";
import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { claimWriterSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

// Optional: limit function duration on Vercel (in seconds)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(aiFail("Unauthorized", "AUTH_ERROR"), { status: 401 });
    }

    // Rate limiting check (10 requests per minute for AI endpoints)
    const identifier = getRateLimitIdentifier(user.id, req);
    const allowed = await rateLimiters.ai.check(10, identifier);

    if (!allowed) {
      return NextResponse.json(
        aiFail("Rate limit exceeded. Please wait a moment and try again.", "RATE_LIMIT"),
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = validateAIRequest(claimWriterSchema, body);
    if (!validation.success) {
      return NextResponse.json(aiFail(validation.error, "BAD_REQUEST"), { status: 400 });
    }
    const { claimId, propertyAddress, claimType, lossSummary, notes, policySummary } =
      validation.data;

    const result = await generateClaimNarrative(
      {
        id: claimId,
        address: propertyAddress,
        damageType: claimType,
        dateOfLoss: lossSummary,
      },
      notes || policySummary || "",
      []
    );

    return NextResponse.json(aiOk(result));
  } catch (err) {
    logger.error("claim-writer route error:", err);

    return NextResponse.json(
      aiFail("Internal server error in claim-writer", "SERVER", {
        details: err?.message ?? "Unknown error",
      }),
      { status: 500 }
    );
  }
}

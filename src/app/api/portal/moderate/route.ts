export const dynamic = "force-dynamic";

/**
 * Content Moderation API
 * POST: Check content for violations before submission
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { logger } from "@/lib/logger";
import { getContentPolicy, moderateContent, quickCheck } from "@/lib/services/content-moderation";

const moderateSchema = z.object({
  content: z.string().min(1, "Content is required").max(50000),
  quickCheckOnly: z.boolean().nullish(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json();
    let parsed: z.infer<typeof moderateSchema>;
    try {
      parsed = moderateSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.errors[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }
      throw err;
    }

    const { content, quickCheckOnly } = parsed;

    // Quick check for real-time validation
    if (quickCheckOnly) {
      const result = quickCheck(content);
      return NextResponse.json(result);
    }

    // Full moderation check
    const result = moderateContent(content);

    return NextResponse.json({
      isClean: result.isClean,
      shouldBlock: result.shouldBlock,
      severity: result.severity,
      message: result.message,
      violations: result.violations.map((v) => ({
        type: v.type,
        severity: v.severity,
        suggestion: v.suggestion,
      })),
      sanitizedContent: result.sanitizedContent,
    });
  } catch (error) {
    logger.error("[ContentModeration POST] Error:", error);
    return NextResponse.json({ error: "Moderation check failed" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  // Return content policy
  const policy = getContentPolicy();
  return NextResponse.json({ policy });
}

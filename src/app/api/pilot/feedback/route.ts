export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const pilotFeedbackSchema = z.object({
  type: z.enum(["bug", "feature", "ux", "performance", "other"]),
  message: z.string().min(1).max(2000),
  rating: z.number().min(0).max(4).nullable().optional(),
  page: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  screenWidth: z.number().optional(),
  screenHeight: z.number().optional(),
});

/**
 * POST /api/pilot/feedback — In-app feedback widget submissions
 *
 * Canonical storage: activities table (type = "pilot_feedback").
 * This is the single source of truth for all feedback data.
 * The dedicated user_feedback table was removed to avoid storage split.
 * Structured feedback fields are stored in the metadata JSONB column.
 *
 * Session 9: Migrated from auth() → withAuth for DB-backed orgId.
 * Previously wrote `orgId || "unknown"` — poisoning data.
 */
const handleFeedbackPost = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "PUBLIC");
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: "Too many feedback submissions" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = pilotFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid feedback data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, message, rating, page, userAgent, screenWidth, screenHeight } = parsed.data;

    // Write to activities table for analytics tracking
    await prisma.activities.create({
      data: {
        id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        userId,
        orgId,
        type: "pilot_feedback",
        title: `Pilot Feedback: ${type}`,
        userName: "User",
        updatedAt: new Date(),
        metadata: {
          feedbackType: type,
          message,
          rating,
          page,
          userAgent: userAgent?.substring(0, 200),
          screenWidth,
          screenHeight,
        },
      },
    });

    return NextResponse.json({ ok: true, data: { submitted: true } });
  } catch (error) {
    logger.error("[PILOT_FEEDBACK_STORE_FAILED]", { error });
    return NextResponse.json({ ok: false, error: "Failed to submit feedback" }, { status: 500 });
  }
});

export const POST = handleFeedbackPost;

/**
 * GET /api/pilot/feedback — Retrieve pilot feedback for dashboard
 *
 * Session 9: Migrated from auth() → withAuth. Previously used
 * `orgId || undefined` which removed the tenant filter entirely.
 */
const handleFeedbackGet = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.activities.findMany({
        where: {
          orgId,
          type: "pilot_feedback",
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activities.count({
        where: {
          orgId,
          type: "pilot_feedback",
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        items,
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("[PILOT_FEEDBACK_RETRIEVE_FAILED]", { error });
    return NextResponse.json({ ok: false, error: "Failed to retrieve feedback" }, { status: 500 });
  }
});

export const GET = handleFeedbackGet;

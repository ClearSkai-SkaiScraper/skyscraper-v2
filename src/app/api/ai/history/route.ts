export const dynamic = "force-dynamic";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { apiError, apiSuccess, apiUnauthorized } from "@/lib/api/safeResponse";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * GET /api/ai/history
 * Fetch AI generation history for the current org
 *
 * Query params:
 * - type: weather | rebuttal | supplement | damage | mockup
 * - limit: number (default 10)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiUnauthorized();
    }

    const identifier = getRateLimitIdentifier(ctx.userId!, req);
    const allowed = await rateLimiters.ai.check(20, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Validation — validateAIRequest removed, inline if needed
    const validation = {
      success: true,
      data: {
        type: searchParams.get("type") || undefined,
        limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      },
    };

    const { type, limit } = validation.data;

    // Query ai_reports table for history
    // Note: Adjust based on your actual schema
    const where: any = { orgId: ctx.orgId };
    if (type !== "all") {
      where.type = type;
    }

    let history: any[] = [];

    try {
      // Try to fetch from ai_reports if it exists
      // ai_reports has: id, orgId, type, title, prompt, content, tokensUsed, model, claimId, status, createdAt
      history = await prisma.ai_reports.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          type: true,
          createdAt: true,
          status: true,
          prompt: true,
          content: true,
        },
      });
    } catch (err) {
      // If ai_reports table doesn't exist, return empty array
      logger.debug("[AI History] ai_reports table not found, returning empty history");
      history = [];
    }

    // Transform to consistent format
    const formattedHistory = history.map((item) => ({
      id: item.id,
      type: item.type || type,
      createdAt: item.createdAt,
      status: item.status || "completed",
      data: item.prompt || item.content || {},
    }));

    return apiSuccess({ history: formattedHistory, total: formattedHistory.length });
  } catch (error) {
    logger.error("[AI History Error]", error);
    return apiError("Failed to fetch AI history", undefined);
  }
}

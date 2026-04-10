export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const createNoticeSchema = z.object({
  community: z.string().min(1, "Community name is required"),
  stormDate: z.string().min(1, "Storm date is required"),
  homeCount: z.number().min(1, "Home count must be at least 1"),
  mode: z.enum(["neutral", "contractor_assisted"]).default("neutral"),
  customMessage: z.string().optional().nullable(),
  hailSize: z.string().optional(),
  windSpeed: z.string().optional(),
});

/**
 * GET /api/hoa/notices
 * List all HOA notice packs for the organization
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withOrgScope(async (request: Request, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const notices = await prisma.hoa_notice_packs.findMany({
      where: {
        orgId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Calculate stats
    const stats = {
      total: notices.length,
      sentThisMonth: notices.filter(
        (n) =>
          n.status === "sent" && n.sentAt && new Date(n.sentAt).getMonth() === new Date().getMonth()
      ).length,
      homesReached: notices
        .filter((n) => n.status === "sent")
        .reduce((sum, n) => sum + n.homeCount, 0),
    };

    return NextResponse.json({ notices, stats });
  } catch (error) {
    logger.error("[HOA_NOTICES] Error fetching notices:", error);
    return NextResponse.json({ error: "Failed to fetch HOA notices" }, { status: 500 });
  }
});

/**
 * POST /api/hoa/notices
 * Create a new HOA notice pack
 */
export const POST = withOrgScope(async (request: Request, { userId, orgId }) => {
  try {
    const body = await request.json();
    const validation = createNoticeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const notice = await prisma.hoa_notice_packs.create({
      data: {
        id: createId(),
        orgId,
        community: data.community,
        stormDate: new Date(data.stormDate),
        homeCount: data.homeCount,
        mode: data.mode,
        customMessage: data.customMessage,
        hailSize: data.hailSize,
        windSpeed: data.windSpeed,
        status: "draft",
        createdBy: userId,
      },
    });

    logger.info("[HOA_NOTICES] Created notice pack", {
      orgId,
      noticeId: notice.id,
      community: data.community,
    });

    return NextResponse.json({ id: notice.id, notice }, { status: 201 });
  } catch (error) {
    logger.error("[HOA_NOTICES] Error creating notice:", error);
    return NextResponse.json({ error: "Failed to create HOA notice" }, { status: 500 });
  }
});

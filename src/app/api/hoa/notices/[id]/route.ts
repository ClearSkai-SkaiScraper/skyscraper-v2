export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const updateNoticeSchema = z.object({
  community: z.string().min(1).optional(),
  stormDate: z.string().optional(),
  homeCount: z.number().min(1).optional(),
  mode: z.enum(["neutral", "contractor_assisted"]).optional(),
  customMessage: z.string().optional().nullable(),
  hailSize: z.string().optional(),
  windSpeed: z.string().optional(),
  status: z.enum(["draft", "pending", "sent", "archived"]).optional(),
});

/**
 * GET /api/hoa/notices/[id]
 * Get a single HOA notice pack by ID
 */
export const GET = withOrgScope(
  async (_request: Request, { userId, orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const notice = await prisma.hoa_notice_packs.findFirst({
        where: { id, orgId },
      });

      if (!notice) {
        return NextResponse.json({ error: "Notice not found" }, { status: 404 });
      }

      return NextResponse.json({ notice });
    } catch (error) {
      logger.error("[HOA_NOTICES] Error fetching notice:", error);
      return NextResponse.json({ error: "Failed to fetch HOA notice" }, { status: 500 });
    }
  }
);

/**
 * PATCH /api/hoa/notices/[id]
 * Update an HOA notice pack
 */
export const PATCH = withOrgScope(
  async (request: Request, { userId, orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const body = await request.json();
      const validation = updateNoticeSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid request", details: validation.error.errors },
          { status: 400 }
        );
      }

      // Verify the notice exists and belongs to this org
      const existing = await prisma.hoa_notice_packs.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return NextResponse.json({ error: "Notice not found" }, { status: 404 });
      }

      const data = validation.data;
      const notice = await prisma.hoa_notice_packs.update({
        where: { id },
        data: {
          ...(data.community ? { community: data.community } : {}),
          ...(data.stormDate ? { stormDate: new Date(data.stormDate) } : {}),
          ...(data.homeCount !== undefined ? { homeCount: data.homeCount } : {}),
          ...(data.mode ? { mode: data.mode } : {}),
          ...(data.customMessage !== undefined ? { customMessage: data.customMessage } : {}),
          ...(data.hailSize !== undefined ? { hailSize: data.hailSize } : {}),
          ...(data.windSpeed !== undefined ? { windSpeed: data.windSpeed } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
      });

      logger.info("[HOA_NOTICES] Updated notice pack", { orgId, noticeId: id });

      return NextResponse.json({ notice });
    } catch (error) {
      logger.error("[HOA_NOTICES] Error updating notice:", error);
      return NextResponse.json({ error: "Failed to update HOA notice" }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/hoa/notices/[id]
 * Delete an HOA notice pack
 */
export const DELETE = withOrgScope(
  async (_request: Request, { userId, orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      // Verify the notice exists and belongs to this org
      const existing = await prisma.hoa_notice_packs.findFirst({
        where: { id, orgId },
      });

      if (!existing) {
        return NextResponse.json({ error: "Notice not found" }, { status: 404 });
      }

      await prisma.hoa_notice_packs.delete({
        where: { id },
      });

      logger.info("[HOA_NOTICES] Deleted notice pack", { orgId, noticeId: id });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("[HOA_NOTICES] Error deleting notice:", error);
      return NextResponse.json({ error: "Failed to delete HOA notice" }, { status: 500 });
    }
  }
);

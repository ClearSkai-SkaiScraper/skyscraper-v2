export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { getDelegate } from "@/lib/db/modelAliases";

/**
 * GET /api/damage/[id]
 * Get a single damage assessment with all findings
 */
export const GET = withOrgScope(
  async (req: Request, { userId, orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const assessment = await getDelegate("damageAssessment").findFirst({
        where: { id, orgId },
        include: {
          findings: {
            orderBy: { createdAt: "asc" },
          },
          photos: true,
          claim: true,
        },
      });

      if (!assessment) {
        return NextResponse.json({ error: "Damage assessment not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        assessment,
      });
    } catch (error) {
      logger.error("[API] Get damage assessment error:", error);
      return NextResponse.json({ error: "Failed to fetch damage assessment" }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/damage/[id]
 * Delete a damage assessment
 */
export const DELETE = withOrgScope(
  async (req: Request, { userId, orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const result = await getDelegate("damageAssessment").deleteMany({
        where: { id, orgId },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Damage assessment not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        description: "Damage assessment deleted",
      });
    } catch (error) {
      logger.error("[API] Delete damage assessment error:", error);
      return NextResponse.json({ error: "Failed to delete damage assessment" }, { status: 500 });
    }
  }
);

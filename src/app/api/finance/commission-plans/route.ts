import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/commission-plans — List all commission plans for org
 */
export const GET = withAuth(async (_req: NextRequest, { orgId }) => {
  try {
    const plans = await prisma.commission_plans.findMany({
      where: { org_id: orgId },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        ruleType: p.rule_type,
        structure: p.structure,
        isActive: p.is_active,
        isDefault: p.is_default,
        appliesTo: p.applies_to,
        userIds: p.user_ids,
        createdAt: p.created_at.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("[API] commission-plans GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

/**
 * POST /api/finance/commission-plans — Create a new commission plan (ADMIN/MANAGER only)
 */
export const POST = withAuth(
  async (req: NextRequest, { orgId }) => {
    try {
      const body = await req.json();
      const { name, description, ruleType, structure, isDefault, appliesTo, userIds } = body;

      if (!name || !ruleType || !structure) {
        return NextResponse.json({ error: "name, ruleType, structure required" }, { status: 400 });
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await prisma.commission_plans.updateMany({
          where: { org_id: orgId, is_default: true },
          data: { is_default: false },
        });
      }

      const plan = await prisma.commission_plans.create({
        data: {
          org_id: orgId,
          name,
          description: description || null,
          rule_type: ruleType,
          structure: structure,
          is_default: isDefault || false,
          applies_to: appliesTo || "all",
          user_ids: userIds || [],
        },
      });

      return NextResponse.json({ success: true, data: { id: plan.id } }, { status: 201 });
    } catch (err) {
      logger.error("[API] commission-plans POST error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN", "MANAGER", "OWNER"] }
);

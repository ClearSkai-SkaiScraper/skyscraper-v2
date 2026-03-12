import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PUT /api/finance/commission-plans/[id] — Update a plan (ADMIN/MANAGER only)
 */
export const PUT = withAuth(
  async (req: NextRequest, { orgId }) => {
    try {
      // Extract route param from URL
      const url = new URL(req.url);
      const id = url.pathname.split("/").filter(Boolean).pop()!;
      const body = await req.json();

      // If setting as default, unset others (org-scoped)
      if (body.isDefault) {
        await prisma.commission_plans.updateMany({
          where: { org_id: orgId, is_default: true, id: { not: id } },
          data: { is_default: false },
        });
      }

      const result = await prisma.commission_plans.updateMany({
        where: { id, org_id: orgId },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.ruleType !== undefined && { rule_type: body.ruleType }),
          ...(body.structure !== undefined && { structure: body.structure }),
          ...(body.isActive !== undefined && { is_active: body.isActive }),
          ...(body.isDefault !== undefined && { is_default: body.isDefault }),
          ...(body.appliesTo !== undefined && { applies_to: body.appliesTo }),
          ...(body.userIds !== undefined && { user_ids: body.userIds }),
        },
      });
      if (result.count === 0)
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });

      return NextResponse.json({ success: true });
    } catch (err) {
      logger.error("[API] commission-plans PUT error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN", "MANAGER", "OWNER"] }
);

/**
 * DELETE /api/finance/commission-plans/[id] — Delete a plan (ADMIN only)
 */
export const DELETE = withAuth(
  async (req: NextRequest, { orgId }) => {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").filter(Boolean).pop()!;

      const existing = await prisma.commission_plans.deleteMany({ where: { id, org_id: orgId } });
      if (existing.count === 0)
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });

      return NextResponse.json({ success: true });
    } catch (err) {
      logger.error("[API] commission-plans DELETE error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN", "OWNER"] }
);

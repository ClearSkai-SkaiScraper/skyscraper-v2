export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/lib/permissions";

const settingsSchema = z.object({
  orgId: z.string().min(1),
  settings: z.object({
    roundRobinEnabled: z.boolean().optional(),
    geoRoutingEnabled: z.boolean().optional(),
    idleLeadReminders: z.boolean().optional(),
    reminderHours: z.number().min(1).max(168).optional(),
    autoAssignNewLeads: z.boolean().optional(),
  }),
});

const DEFAULT_SETTINGS = {
  roundRobinEnabled: false,
  geoRoutingEnabled: false,
  idleLeadReminders: true,
  reminderHours: 48,
  autoAssignNewLeads: false,
};

// GET - Fetch current settings
export const GET = withOrgScope(async (_req: Request, { userId: _userId, orgId: _orgId }) => {
  try {
    await requirePermission("manage_users");

    // Return defaults (org_settings table not yet available)
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  } catch (error) {
    logger.error("[GET /api/settings/lead-routing] Error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to fetch settings");
  }
});

// PUT - Update settings
export const PUT = withOrgScope(async (request, { userId: _userId, orgId: _orgId }) => {
  try {
    await requirePermission("manage_users");

    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid settings data");
    }

    const { settings } = parsed.data;

    // TODO: Persist to org_settings table when it exists
    logger.info("[PUT /api/settings/lead-routing] Settings received (not persisted yet)", {
      settings,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    logger.error("[PUT /api/settings/lead-routing] Error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to save settings");
  }
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions, requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

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

// GET - Fetch current settings
export async function GET() {
  try {
    await requirePermission("view_settings");
    const { orgId } = await getCurrentUserPermissions();

    if (!orgId) {
      return apiError(403, "NO_ORG", "Organization not found");
    }

    // Try to get settings from org_settings table
    const settings = await prisma.org_settings.findFirst({
      where: {
        orgId,
        key: "lead_routing",
      },
    });

    if (settings?.value) {
      return NextResponse.json({ settings: settings.value });
    }

    // Return defaults
    return NextResponse.json({
      settings: {
        roundRobinEnabled: false,
        geoRoutingEnabled: false,
        idleLeadReminders: true,
        reminderHours: 48,
        autoAssignNewLeads: false,
      },
    });
  } catch (error) {
    logger.error("[GET /api/settings/lead-routing] Error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to fetch settings");
  }
}

// PUT - Update settings
export async function PUT(request: Request) {
  try {
    await requirePermission("manage_settings");
    const { orgId: userOrgId } = await getCurrentUserPermissions();

    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid settings data");
    }

    const { orgId, settings } = parsed.data;

    // Verify user has access to this org
    if (userOrgId !== orgId) {
      return apiError(403, "FORBIDDEN", "Access denied to this organization");
    }

    // Upsert settings
    await prisma.org_settings.upsert({
      where: {
        orgId_key: {
          orgId,
          key: "lead_routing",
        },
      },
      update: {
        value: settings as any,
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        orgId,
        key: "lead_routing",
        value: settings as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info("[PUT /api/settings/lead-routing] Settings saved", { orgId });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    logger.error("[PUT /api/settings/lead-routing] Error:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to save settings");
  }
}

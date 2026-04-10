export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Universal Artifact System + Legacy Templates API
// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { requireRole } from "@/lib/security/roles";

const saveTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  sectionOrder: z.array(z.string()).min(1, "At least one section is required"),
  sectionEnabled: z.record(z.string(), z.boolean()),
  defaults: z.record(z.string(), z.any()).optional(),
  setAsDefault: z.boolean().optional().default(false),
});
import { logAction } from "@/modules/audit/core/logger";
import { listTemplates, saveTemplate, setDefaultTemplate } from "@/modules/templates/core/library";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const useUniversal = searchParams.get("universal") === "true";

    // UNIVERSAL ARTIFACT SYSTEM
    if (useUniversal) {
      // universalTemplate model doesn't exist in schema
      return NextResponse.json(
        {
          ok: false,
          error: "Universal templates not implemented",
          deprecated: true,
          message: "universalTemplate model requires schema updates",
        },
        { status: 501 }
      );
    }

    // LEGACY SYSTEM
    const { orgId } = await requireRole(["contractor", "adjuster", "admin"]);
    const templates = await listTemplates(orgId);
    return NextResponse.json({ templates, system: "legacy" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await requireRole(["contractor", "admin"]);
    const user = await currentUser();
    const userName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "Unknown";

    const body = await req.json();

    const parsed = saveTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, sectionOrder, sectionEnabled, defaults, setAsDefault } = parsed.data;

    const result = await saveTemplate(orgId, userId, {
      name,
      sectionOrder,
      sectionEnabled,
      defaults,
    });

    if (setAsDefault) {
      await setDefaultTemplate(result.id, orgId);
    }

    // Log template save
    await logAction({
      orgId,
      userId,
      userName,
      action: "TEMPLATE_SAVE",
      metadata: { templateName: name, isDefault: setAsDefault || false },
    }).catch((err) => logger.warn("[Templates] Failed to log save:", err));

    return NextResponse.json({
      success: true,
      templateId: result.id,
      description: `Template "${name}" saved successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status:
          error.message.includes("Unauthorized") || error.message.includes("Access denied")
            ? 401
            : 500,
      }
    );
  }
}

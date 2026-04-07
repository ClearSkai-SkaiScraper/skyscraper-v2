/**
 * My Templates API
 * GET /api/templates/my-templates
 * Returns the list of templates the current user/org has added from marketplace
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const allTemplates: { id: string; slug: string | null; name: string; marketplaceId: string }[] =
      [];

    // PRIORITY 1: Check OrgTemplate (main way templates are added from marketplace)
    try {
      const orgTemplates = await prisma.orgTemplate.findMany({
        where: { orgId },
        include: {
          Template: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      });

      for (const ot of orgTemplates) {
        if (ot.Template) {
          allTemplates.push({
            id: ot.Template.id,
            slug: ot.Template.slug,
            name: ot.Template.name,
            marketplaceId: ot.Template.slug || ot.Template.id, // Use slug as marketplace ID
          });
        }
      }
    } catch (e) {
      logger.debug("[my-templates] OrgTemplate query failed:", e);
    }

    // PRIORITY 2: Also fetch from legacy ReportTemplate if they exist
    try {
      const legacyTemplates = await prisma.reportTemplate.findMany({
        where: { orgId },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      for (const t of legacyTemplates) {
        // Avoid duplicates
        if (!allTemplates.find((at) => at.id === t.id)) {
          allTemplates.push({
            id: t.id,
            slug: t.id,
            name: t.name,
            marketplaceId: t.id,
          });
        }
      }
    } catch {
      // Legacy table might not have all fields
    }

    return NextResponse.json({ templates: allTemplates });
  } catch (error) {
    logger.error("[my-templates] Error:", error);
    return NextResponse.json({ templates: [] }, { status: 200 });
  }
});

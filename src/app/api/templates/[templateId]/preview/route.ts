import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getMergedTemplate } from "@/lib/templates/mergeTemplate";

export const dynamic = "force-dynamic";

// Use report_templates model directly
const Templates = prisma.report_templates;

/**
 * GET /api/templates/[templateId]/preview
 *
 * Returns template with company branding merged
 * Used for preview rendering
 */
export const GET = withOrgScope(
  async (req, { orgId }, { params }: { params: { templateId: string } }) => {
    try {
      const templateId = params.templateId;

      logger.debug(`[TEMPLATE_PREVIEW] Fetching template ${templateId} for org ${orgId}`);

      // Try marketplace template first (Template table)
      let template = await prisma.template.findUnique({
        where: { id: templateId },
        select: {
          id: true,
          name: true,
          description: true,
          sections: true,
          category: true,
        },
      });

      let isMarketplace = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let layout: any;

      if (template) {
        // Marketplace template found
        isMarketplace = true;
        layout = template.sections;
        logger.debug(`[TEMPLATE_PREVIEW] Found marketplace template: ${template.name}`);
      } else {
        // Try custom template (report_templates)
        const customTemplate = Templates
          ? await Templates.findUnique({
              where: { id: templateId },
              select: {
                id: true,
                name: true,
                org_id: true,
              },
            }).catch(() => null)
          : null;

        if (!customTemplate) {
          return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Get merged template (base + branding) for custom templates
        layout = await getMergedTemplate(templateId, orgId);

        if (!layout) {
          return NextResponse.json({ error: "Template merge failed" }, { status: 404 });
        }

        template = {
          id: customTemplate.id,
          name: customTemplate.name,
          description: null as string | null,
          sections: layout,
          category: null as string | null,
        };
      }

      // Get org branding for display
      const branding = await prisma.org_branding.findFirst({
        where: { orgId },
      });

      return NextResponse.json({
        success: true,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          layout: layout,
          isMarketplace,
        },
        branding: branding
          ? {
              companyName: branding.companyName,
              logoUrl: branding.logoUrl,
              colorPrimary: branding.colorPrimary,
              colorAccent: branding.colorAccent,
              phone: branding.phone,
              email: branding.email,
              website: branding.website,
            }
          : null,
      });
    } catch (error) {
      logger.error(`[TEMPLATE_PREVIEW] Error:`, error);
      return NextResponse.json(
        { error: "Failed to load template preview" },
        { status: 500 }
      );
    }
  }
);

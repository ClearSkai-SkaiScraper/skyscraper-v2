import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";
import { getTemplateById, getTemplateBySlug } from "@/lib/templates/templateRegistry";

export const dynamic = "force-dynamic";

/**
 * POST /api/templates/add-from-marketplace
 *
 * Adds a template from the marketplace to the user's org library (OrgTemplate)
 * Creates the template in DB from registry if it doesn't exist yet
 */
export const POST = withAuth(async (request: NextRequest, { orgId, userId }) => {
  let requestedTemplateId: string | null = null;

  try {
    const body = await request.json();
    const { templateId } = body;
    requestedTemplateId = templateId;

    if (!templateId) {
      return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
    }

    logger.debug(`[ADD_TEMPLATE] User ${userId} adding template ${templateId} to org ${orgId}`);

    // Find the template by ID or slug in database
    let template = await prisma.template.findFirst({
      where: {
        OR: [{ id: templateId }, { slug: templateId }],
      },
    });

    // If template not in DB, try to create it from registry
    if (!template) {
      logger.debug(`[ADD_TEMPLATE] Template ${templateId} not in DB, checking registry...`);

      // Check registry by slug first, then by id
      const registryTemplate = getTemplateBySlug(templateId) || getTemplateById(templateId);

      if (!registryTemplate) {
        return NextResponse.json({ error: "Template not found in marketplace" }, { status: 404 });
      }

      // Create template in database from registry
      logger.info(
        `[ADD_TEMPLATE] Creating template ${registryTemplate.slug} in database from registry`
      );
      template = await prisma.template.create({
        data: {
          id: registryTemplate.id,
          slug: registryTemplate.slug,
          name: registryTemplate.title,
          description: registryTemplate.description,
          category: registryTemplate.category,
          tags: registryTemplate.tags || [],
          version: registryTemplate.version || "1.0",
          isPublished: true,
          isActive: true,
          isMarketplace: true,
          thumbnailUrl: `/api/templates/${registryTemplate.id}/thumbnail`,
          sections: [],
        },
      });
      logger.debug(`[ADD_TEMPLATE] Created template ${template.slug} in database`);
    }

    // Check if already added to this org
    const existing = await prisma.orgTemplate.findFirst({
      where: {
        orgId,
        templateId: template.id,
      },
    });

    if (existing) {
      // Already exists - just return success
      logger.debug(`[ADD_TEMPLATE] Template ${template.slug} already in org ${orgId}`);
      return NextResponse.json({
        success: true,
        templateId: template.id,
        orgTemplateId: existing.id,
        name: template.name,
        description: template.description,
        message: "Template already in your library",
        alreadyExists: true,
      });
    }

    // Create OrgTemplate link
    const orgTemplate = await prisma.orgTemplate.create({
      data: {
        orgId,
        templateId: template.id,
        isActive: true,
      },
    });

    logger.debug(`[ADD_TEMPLATE] ✅ Added template ${template.slug} to org ${orgId}`);

    return NextResponse.json({
      success: true,
      templateId: template.id,
      orgTemplateId: orgTemplate.id,
      name: template.name,
      description: template.description,
      message: "Template added to your library",
    });
  } catch (error) {
    logger.error("[ADD_TEMPLATE] Error:", error);

    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: { subsystem: "templates" },
      extra: {
        userId,
        templateId: requestedTemplateId,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add template" },
      { status: 500 }
    );
  }
});

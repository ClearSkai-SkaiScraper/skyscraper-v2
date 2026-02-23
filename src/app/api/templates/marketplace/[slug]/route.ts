/**
 * GET /api/templates/marketplace/[slug]
 * Public endpoint - returns single template by slug
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import prisma from "@/lib/prisma";
import { getPremiumRegistryBySlug } from "@/lib/templates/registry";
import { getTemplateBySlug } from "@/lib/templates/templateRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    const template = await prisma.template.findFirst({
      where: {
        slug,
        isPublished: true,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        tags: true,
        version: true,
        thumbnailUrl: true,
        sections: true,
        createdAt: true,
      },
    });

    if (!template) {
      // Registry fallback for demo / DB-less environments
      const reg = getTemplateBySlug(slug);
      if (!reg) {
        return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
      }

      const premium = getPremiumRegistryBySlug(reg.slug);

      return NextResponse.json({
        ok: true,
        template: {
          id: reg.id,
          slug: reg.slug,
          title: reg.title,
          description: reg.description,
          category: reg.category,
          tags: reg.tags,
          version: reg.version,
          // Preview + thumbnail should always be same-origin and deterministic
          thumbnailUrl: `/api/templates/${reg.id}/thumbnail`,
          previewPdfUrl: `/api/templates/marketplace/${reg.slug}/preview-pdf`,
          placeholders: [],
          placeholderCount: premium?.placeholdersRequired ?? 0,

          // Intelligence fields (safe defaults for registry templates)
          hasHtml: true,
          previewReady: true,
          generateReady: true,
          batchReady: true,
          aiEnriched: true,
          intendedUse: reg.intendedUse ?? null,
          requiredData: null,
          autoFillMap: null,
          assets: premium
            ? {
                ...premium.assets,
                thumbnail: `/api/templates/${premium.id}/thumbnail`,
                previewPdf: `/api/templates/marketplace/${premium.slug}/preview-pdf`,
              }
            : null,
        },
      });
    }

    // Always return same-origin proxy URLs to avoid 403s and mixed-content issues.
    return NextResponse.json({
      ok: true,
      template: {
        ...template,
        // Map name to title for frontend consistency
        title: (template as any).name,
        thumbnailUrl: `/api/templates/${template.id}/thumbnail`,
        previewPdfUrl: `/api/templates/marketplace/${template.slug}/preview-pdf`,
        assets: (() => {
          const premium = getPremiumRegistryBySlug(template.slug!);
          if (!premium) return null;
          return {
            ...premium.assets,
            thumbnail: `/api/templates/${premium.id}/thumbnail`,
            previewPdf: `/api/templates/marketplace/${premium.slug}/preview-pdf`,
          };
        })(),
        placeholderCount: getPremiumRegistryBySlug(template.slug!)?.placeholdersRequired ?? 0,
      },
    });
  } catch (error) {
    logger.error(`[GET /api/templates/marketplace/${params.slug}] Error:`, error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

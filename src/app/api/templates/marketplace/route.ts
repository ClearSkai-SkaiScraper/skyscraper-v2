import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getPremiumRegistry } from "@/lib/templates/registry";
import { ALL_TEMPLATES } from "@/lib/templates/templateRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/templates/marketplace
 *
 * CANONICAL marketplace endpoint - returns published templates
 * - Tries database first
 * - Falls back to registry if database is empty
 * - Includes thumbnails via proxy route
 */
export async function GET() {
  try {
    const premiumBySlug = new Map(getPremiumRegistry().map((t) => [t.slug, t] as const));
    const canonicalSlugs = new Set(ALL_TEMPLATES.map((t) => t.slug));

    // Try database first (but never fail hard in demo mode)
    let dbTemplates: any[] = [];
    let dbWarning: string | undefined;

    try {
      dbTemplates = await prisma.template.findMany({
        where: { isPublished: true },
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
          updatedAt: true,
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
    } catch (e) {
      dbWarning = e?.message ?? "DATABASE_UNAVAILABLE";
      logger.warn("[MARKETPLACE_API] Database query failed, using registry:", dbWarning);
      dbTemplates = [];
    }

    // Canonicalize marketplace to the registry set.
    // If Prisma has rows for any registry slugs, overlay their metadata; otherwise fall back to registry.
    const dbBySlug = new Map(
      (dbTemplates || [])
        .filter((t) => typeof t?.slug === "string" && canonicalSlugs.has(t.slug))
        .map((t) => [t.slug as string, t] as const)
    );

    if (dbTemplates.length > 0) {
      const merged = ALL_TEMPLATES.map((reg) => {
        const db = dbBySlug.get(reg.slug) || null;
        const premium = premiumBySlug.get(reg.slug) || null;
        const base = db
          ? {
              ...db,
              // Ensure stable slug for downstream routes.
              slug: reg.slug,
              // Map name to title for frontend consistency
              title: (db as any).name || reg.title,
              description: db.description || reg.description,
              category: db.category || reg.category,
              tags: Array.isArray(db.tags) && db.tags.length > 0 ? db.tags : reg.tags,
              version: db.version || reg.version,
            }
          : {
              id: reg.id,
              slug: reg.slug,
              title: reg.title,
              description: reg.description,
              category: reg.category,
              tags: reg.tags,
              version: reg.version,
              thumbnailUrl: null,
              previewPdfUrl: null,
              placeholders: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

        return {
          ...base,
          // Style fields from registry for 3-tab marketplace
          styleCategory: reg.styleCategory ?? null,
          audience: reg.audience ?? null,
          bestFor: reg.bestFor ?? null,
          thumbnailUrl: `/api/templates/${reg.id}/thumbnail`,
          previewPdfUrl: `/api/templates/marketplace/${reg.slug}/preview-pdf`,
          placeholderCount: premium?.placeholdersRequired ?? 0,
          assets: premium
            ? {
                ...premium.assets,
                thumbnail: `/api/templates/${premium.id}/thumbnail`,
                previewPdf: `/api/templates/marketplace/${premium.slug}/preview-pdf`,
              }
            : null,
        };
      });

      return NextResponse.json({
        ok: true,
        templates: merged,
        count: merged.length,
        source: "database+registry",
      });
    }

    // Fall back to registry
    logger.debug("[MARKETPLACE_API] Database empty, using registry");

    const registryTemplates = ALL_TEMPLATES.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      category: t.category,
      // Style fields from registry for 3-tab marketplace
      styleCategory: t.styleCategory ?? null,
      audience: t.audience ?? null,
      bestFor: t.bestFor ?? null,
      tags: t.tags,
      version: t.version,
      thumbnailUrl: `/api/templates/${t.id}/thumbnail`,
      previewPdfUrl: `/api/templates/marketplace/${t.slug}/preview-pdf`,
      placeholders: [],
      placeholderCount: premiumBySlug.get(t.slug)?.placeholdersRequired ?? 0,
      assets: (() => {
        const premium = premiumBySlug.get(t.slug);
        if (!premium) return null;
        return {
          ...premium.assets,
          thumbnail: `/api/templates/${premium.id}/thumbnail`,
          previewPdf: `/api/templates/marketplace/${premium.slug}/preview-pdf`,
        };
      })(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return NextResponse.json({
      ok: true,
      templates: registryTemplates,
      count: registryTemplates.length,
      source: "registry",
      ...(dbWarning ? { warning: dbWarning } : {}),
    });
  } catch (e) {
    logger.error("[MARKETPLACE_API] Error:", e);
    // Final fallback: never 500 for demo QA.
    return NextResponse.json({
      ok: true,
      templates: [],
      count: 0,
      source: "fallback",
      warning: e?.message ?? "UNKNOWN_ERROR",
    });
  }
}

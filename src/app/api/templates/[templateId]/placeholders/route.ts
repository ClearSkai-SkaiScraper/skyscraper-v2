import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getPremiumRegistryBySlug } from "@/lib/templates/registry";
import { getTemplateById, getTemplateBySlug } from "@/lib/templates/templateRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/templates/:idOrSlug/placeholders
 *
 * Canonical placeholder schema endpoint for AI/template tooling.
 *
 * Note: This route is implemented under `api/templates/[templateId]/...` to avoid
 * Next.js App Router conflicts from having multiple dynamic segment names at the
 * same path level (e.g. `[slug]` and `[templateId]`). The URL is identical.
 */
export async function GET(_: Request, { params }: { params: { templateId: string } }) {
  const idOrSlug = params.templateId;
  logger.info("[TEMPLATES_PLACEHOLDERS]", { idOrSlug });

  const reg = getTemplateById(idOrSlug) ?? getTemplateBySlug(idOrSlug);
  const slug = reg?.slug ?? idOrSlug;

  const entry = getPremiumRegistryBySlug(slug);
  if (!entry) {
    return NextResponse.json({ ok: false, error: "Template slug not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    slug: entry.slug,
    required: entry.requiredPlaceholderPaths,
    optional: entry.optionalPlaceholderPaths,
    groups: entry.groups,
  });
}

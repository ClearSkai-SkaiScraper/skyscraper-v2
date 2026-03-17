/**
 * Template Thumbnail Proxy
 * GET /api/templates/[templateId]/thumbnail
 *
 * Streams thumbnails from R2 or serves local fallbacks
 * - Tries R2 first if configured
 * - Falls back to public/templates/{slug}/thumbnail.{png|svg}
 * - Attempts on-demand generation if no thumbnail exists
 * - Returns placeholder if all else fails
 */

import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getContentType, getR2Object, isR2Configured } from "@/lib/r2";
import { getTemplateById } from "@/lib/templates/templateRegistry";
import { generateTemplateThumbnail } from "@/lib/templates/thumbnailService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow time for on-demand generation

function getUniformCategoryThumbKey(category: string | null | undefined): string {
  // Uniform thumbnails: emoji/colored-background style, consistent across templates.
  // These live under /public/template-thumbs/*
  const normalized = (category || "").toLowerCase().trim();

  switch (normalized) {
    case "roofing":
    case "wind & hail":
      return "template-thumbs/wind-hail-roofing.svg";
    case "restoration":
    case "water":
      return "template-thumbs/water-damage-restoration.svg";
    case "retail & quotes":
    case "retail":
      return "template-thumbs/general-contractor-estimate.svg";
    case "supplements":
      return "template-thumbs/supplements-line-item.svg";
    case "legal & appraisal":
    case "legal":
      return "template-thumbs/legal-appraisal.svg";
    case "specialty reports":
    case "specialty":
      return "template-thumbs/specialty-reports.svg";
    default:
      return "template-thumbs/general-contractor-estimate.svg";
  }
}

function svgPlaceholder(title: string): Buffer {
  const safe = (title || "Template").slice(0, 42);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="72" y="72" width="1056" height="486" rx="28" fill="#0b1220" opacity="0.55"/>
  <text x="120" y="260" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="44" fill="#e2e8f0" font-weight="700">Premium Template</text>
  <text x="120" y="330" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="30" fill="#cbd5e1">${safe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
  <text x="120" y="410" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="22" fill="#94a3b8">Raven Preview</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

function imageCacheHeaders() {
  return {
    "Cache-Control": "public, max-age=86400, immutable",
  };
}

function getCategoryFallbackThumbKey(category: string | null | undefined): string {
  return getUniformCategoryThumbKey(category);
}

function getAlternateKeys(originalKey: string): string[] {
  const normalized = originalKey.replace(/\\/g, "/");
  const ext = path.extname(normalized).toLowerCase();
  if (!ext) return [normalized];
  const base = normalized.slice(0, -ext.length);

  if (ext === ".png") return [normalized, `${base}.svg`, `${base}.jpg`, `${base}.jpeg`];
  if (ext === ".jpg" || ext === ".jpeg") return [normalized, `${base}.png`, `${base}.svg`];
  if (ext === ".svg") return [normalized, `${base}.png`, `${base}.jpg`, `${base}.jpeg`];
  return [normalized];
}

const THUMBNAIL_FILENAMES_PRIORITY = [
  "thumbnail.png",
  "thumbnail.jpg",
  "thumbnail.jpeg",
  "thumb.png",
  "thumb.jpg",
  "thumb.jpeg",
  "thumbnail.svg",
  "thumb.svg",
  // last resort: some template generators produce a preview image
  "preview.png",
  "preview.jpg",
  "preview.jpeg",
] as const;

function buildThumbnailCandidateKeys(options: {
  templateId: string;
  templateSlug: string | null;
  registryThumbnailKey?: string | null;
}): string[] {
  const baseDirs = uniqKeys(
    [
      `templates/${options.templateId}`,
      `templates/${options.templateId}-premium`,
      options.templateSlug ? `templates/${options.templateSlug}` : null,
      options.templateSlug ? `templates/${options.templateSlug}-premium` : null,
    ].filter(Boolean) as string[]
  );

  const explicitFromRegistry = options.registryThumbnailKey
    ? getAlternateKeys(options.registryThumbnailKey)
    : [];

  const conventional = baseDirs.flatMap((dir) =>
    THUMBNAIL_FILENAMES_PRIORITY.flatMap((file) => getAlternateKeys(`${dir}/${file}`))
  );

  return uniqKeys([...explicitFromRegistry, ...conventional]);
}

function uniqKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const key = k.replace(/\\/g, "/");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

async function tryReadLocalPublicFile(relativeKey: string): Promise<Buffer | null> {
  const publicDir = path.join(process.cwd(), "public");
  const localPath = path.join(publicDir, relativeKey);
  try {
    return await fs.readFile(localPath);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { templateId: string } }) {
  const { templateId } = params;

  try {
    // 1) Try registry first (covers the static marketplace templates)
    const registryTemplate = getTemplateById(templateId);

    // 2) If not in registry, fall back to DB template metadata
    const dbTemplate = registryTemplate
      ? null
      : await prisma.template
          .findUnique({
            where: { id: templateId },
            select: { slug: true, category: true, thumbnailUrl: true },
          })
          .catch(() => null);

    if (!registryTemplate && !dbTemplate) {
      const buf = svgPlaceholder(templateId);
      return new NextResponse(Uint8Array.from(buf), {
        headers: {
          "Content-Type": "image/svg+xml",
          ...imageCacheHeaders(),
        },
      });
    }

    const templateSlug = dbTemplate?.slug ?? registryTemplate?.slug ?? null;
    const templateCategory = dbTemplate?.category ?? registryTemplate?.category ?? null;
    const templateTitle =
      (registryTemplate as any)?.title || (dbTemplate as any)?.title || templateSlug || templateId;

    // Build candidate keys for template-specific thumbnails FIRST
    const candidateKeys = buildThumbnailCandidateKeys({
      templateId,
      templateSlug,
      registryThumbnailKey: registryTemplate?.thumbnailKey ?? null,
    });

    // 3) Try template-specific R2 thumbnails first
    if (isR2Configured()) {
      for (const key of candidateKeys) {
        const stream = await getR2Object(key);
        if (stream) {
          const contentType = getContentType(key);
          return new NextResponse(stream, {
            headers: {
              "Content-Type": contentType,
              ...imageCacheHeaders(),
            },
          });
        }
      }
    }

    // 4) Try template-specific local thumbnails
    for (const key of candidateKeys) {
      const fileBuffer = await tryReadLocalPublicFile(key);
      if (fileBuffer) {
        const contentType = getContentType(key);
        return new NextResponse(Uint8Array.from(fileBuffer), {
          headers: {
            "Content-Type": contentType,
            ...imageCacheHeaders(),
          },
        });
      }
    }

    // 5) Try slug-based thumbnail in public/template-thumbs/
    if (templateSlug) {
      const slugThumbKey = `template-thumbs/${templateSlug}.svg`;
      const slugBuffer = await tryReadLocalPublicFile(slugThumbKey);
      if (slugBuffer) {
        return new NextResponse(Uint8Array.from(slugBuffer), {
          headers: {
            "Content-Type": "image/svg+xml",
            ...imageCacheHeaders(),
          },
        });
      }
    }

    // 6) If DB provides a thumbnailUrl, use it
    if (dbTemplate?.thumbnailUrl) {
      const url = dbTemplate.thumbnailUrl;

      // Remote URL
      if (url.startsWith("http")) {
        try {
          const r = await fetch(url, { redirect: "follow" });
          if (r.ok) {
            const contentType = r.headers.get("content-type") || "image/png";
            const buf = Buffer.from(await r.arrayBuffer());
            return new NextResponse(Uint8Array.from(buf), {
              headers: {
                "Content-Type": contentType,
                ...imageCacheHeaders(),
              },
            });
          }
        } catch {
          // fall through
        }
      }

      // Public-relative URL
      if (url.startsWith("/")) {
        const relativeKey = url.replace(/^\/+/, "");
        const fileBuffer = await tryReadLocalPublicFile(relativeKey);
        if (fileBuffer) {
          const contentType = getContentType(relativeKey);
          return new NextResponse(Uint8Array.from(fileBuffer), {
            headers: {
              "Content-Type": contentType,
              ...imageCacheHeaders(),
            },
          });
        }
      }
    }

    // 7. Category icon fallback
    const uniformKey = getUniformCategoryThumbKey(templateCategory);
    const fallbackBuffer = await tryReadLocalPublicFile(uniformKey);

    if (fallbackBuffer) {
      return new NextResponse(Uint8Array.from(fallbackBuffer), {
        headers: {
          "Content-Type": "image/svg+xml",
          ...imageCacheHeaders(),
        },
      });
    }

    // 8. Attempt on-demand thumbnail generation for DB templates
    // Only attempt this if we have a DB template (not just registry)
    const shouldAttemptGeneration = req.nextUrl.searchParams.get("generate") !== "false";
    if (shouldAttemptGeneration && dbTemplate) {
      try {
        logger.debug(`[THUMBNAIL_API] Attempting on-demand generation for ${templateId}`);
        const result = await generateTemplateThumbnail(templateId, {
          width: 1200,
          height: 630,
        });

        if (result.success && result.thumbnailUrl) {
          // Fetch the newly generated thumbnail
          const thumbnailResponse = await fetch(result.thumbnailUrl);
          if (thumbnailResponse.ok) {
            const buffer = Buffer.from(await thumbnailResponse.arrayBuffer());
            const contentType = thumbnailResponse.headers.get("content-type") || "image/png";
            return new NextResponse(buffer, {
              headers: {
                "Content-Type": contentType,
                ...imageCacheHeaders(),
              },
            });
          }
        }
      } catch (genError) {
        logger.error(`[THUMBNAIL_API] On-demand generation failed for ${templateId}:`, genError);
        // Fall through to placeholder
      }
    }

    // Final deterministic fallback
    const placeholder = svgPlaceholder(templateTitle);
    return new NextResponse(Uint8Array.from(placeholder), {
      headers: {
        "Content-Type": "image/svg+xml",
        ...imageCacheHeaders(),
      },
    });
  } catch (error) {
    logger.error(`[THUMBNAIL_API] Error for ${templateId}:`, error);

    const placeholder = svgPlaceholder(templateId);
    return new NextResponse(Uint8Array.from(placeholder), {
      headers: {
        "Content-Type": "image/svg+xml",
        ...imageCacheHeaders(),
      },
    });
  }
}

/**
 * Generate Template Thumbnail API
 * POST /api/templates/[templateId]/generate-thumbnail
 *
 * Generates a real preview thumbnail for a template using Playwright.
 * Stores the result in Supabase storage and updates the database.
 */

import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAdmin } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import { generateTemplateThumbnail } from "@/lib/templates/thumbnailService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GenerateThumbnailBody {
  forceRegenerate?: boolean;
  width?: number;
  height?: number;
}

export async function POST(req: NextRequest, { params }: { params: { templateId: string } }) {
  // Admin-only: template thumbnail generation
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { templateId } = params;

  try {
    // Parse request body for options
    let options: GenerateThumbnailBody = {};
    try {
      const body = await req.json();
      options = body || {};
    } catch {
      // No body or invalid JSON, use defaults
    }

    logger.debug(`[GenerateThumbnail] Starting generation for ${templateId}`, options);

    const result = await generateTemplateThumbnail(templateId, {
      forceRegenerate: options.forceRegenerate ?? false,
      width: options.width ?? 1200,
      height: options.height ?? 630,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error === "TEMPLATE_NOT_FOUND" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      thumbnailUrl: result.thumbnailUrl,
      cached: result.cached,
    });
  } catch (error) {
    logger.error(`[GenerateThumbnail] Error for ${templateId}:`, error);
    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Check if thumbnail exists or generate if missing
 */
export async function GET(req: NextRequest, { params }: { params: { templateId: string } }) {
  const { templateId } = params;
  const searchParams = req.nextUrl.searchParams;
  const forceRegenerate = searchParams.get("regenerate") === "true";

  try {
    const result = await generateTemplateThumbnail(templateId, {
      forceRegenerate,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error === "TEMPLATE_NOT_FOUND" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      thumbnailUrl: result.thumbnailUrl,
      cached: result.cached,
    });
  } catch (error) {
    logger.error(`[GenerateThumbnail] Error for ${templateId}:`, error);
    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

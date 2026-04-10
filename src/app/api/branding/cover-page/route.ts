import { NextResponse } from "next/server";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/branding/cover-page
 * Retrieves the saved cover page canvas state for the org
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { userId, orgId } = auth;

    if (!userId || !orgId) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    // Get branding record
    const branding = await prisma.org_branding.findUnique({
      where: { orgId },
    });

    if (!branding) {
      return NextResponse.json(null);
    }

    // Cover page data is stored in a metadata field or we'll create it
    // For now, we'll use a separate table or JSON field approach
    // Check if coverPageData exists (we'll add this field via migration)
    const coverPageData = await prisma.$queryRaw<{ data: string }[]>`
      SELECT cover_page_data as data FROM org_branding WHERE "orgId" = ${orgId}
    `.catch(() => null);

    if (coverPageData && coverPageData[0]?.data) {
      try {
        return NextResponse.json(JSON.parse(coverPageData[0].data));
      } catch {
        return NextResponse.json(null);
      }
    }

    return NextResponse.json(null);
  } catch (e: unknown) {
    logger.error("[COVER_PAGE_GET]", e);
    return apiError(500, "INTERNAL_ERROR", "Failed to load cover page");
  }
}

/**
 * POST /api/branding/cover-page
 * Saves the cover page canvas state
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { userId, orgId } = auth;

    if (!userId || !orgId) {
      return apiError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const body = (await req.json()) as {
      elements: unknown[];
      backgroundColor: string;
      backgroundImage: string | null;
    };
    const { elements, backgroundColor, backgroundImage } = body;

    if (!elements || !Array.isArray(elements)) {
      return apiError(400, "INVALID_INPUT", "Elements array is required");
    }

    const coverPageData = JSON.stringify({
      elements,
      backgroundColor: backgroundColor || "#117CFF",
      backgroundImage: backgroundImage || null,
      updatedAt: new Date().toISOString(),
    });

    // Try to update the cover_page_data column (if it exists)
    // If it doesn't exist, we'll need to add it via migration
    try {
      await prisma.$executeRaw`
        UPDATE org_branding 
        SET cover_page_data = ${coverPageData}::jsonb, 
            "updatedAt" = NOW()
        WHERE "orgId" = ${orgId}
      `;
    } catch (colError) {
      // Column might not exist - try to create the org_branding record first
      logger.warn("[COVER_PAGE_POST] Column may not exist, trying fallback", colError);

      // Ensure org_branding exists
      const existing = await prisma.org_branding.findUnique({
        where: { orgId },
      });

      if (!existing) {
        // Create branding record first
        const { createId } = await import("@paralleldrive/cuid2");
        await prisma.org_branding.create({
          data: {
            id: createId(),
            orgId,
            ownerId: userId,
            updatedAt: new Date(),
          },
        });
      }

      // Try again with raw SQL to add column if needed
      try {
        await prisma.$executeRaw`
          ALTER TABLE org_branding ADD COLUMN IF NOT EXISTS cover_page_data JSONB
        `;
        await prisma.$executeRaw`
          UPDATE org_branding 
          SET cover_page_data = ${coverPageData}::jsonb, 
              "updatedAt" = NOW()
          WHERE "orgId" = ${orgId}
        `;
      } catch (alterError) {
        logger.error("[COVER_PAGE_POST] Failed to alter table", alterError);
        throw alterError;
      }
    }

    logger.info("[COVER_PAGE_POST]", { orgId, elementsCount: elements.length });

    return NextResponse.json({ success: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    logger.error("[COVER_PAGE_POST]", e);
    return apiError(500, "INTERNAL_ERROR", "Failed to save cover page");
  }
}

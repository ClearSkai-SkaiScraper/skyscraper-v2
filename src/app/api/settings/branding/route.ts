/**
 * GET/PUT /api/settings/branding
 *
 * Manage org branding settings (logo, colors, etc.)
 * Wires up the white-label/branding settings pages.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await prisma.org.findUnique({
      where: { id: ctx.orgId },
      select: {
        id: true,
        name: true,
        brandLogoUrl: true,
        pdfHeaderText: true,
        pdfFooterText: true,
      },
    });

    return NextResponse.json({
      success: true,
      branding: {
        id: org?.id,
        name: org?.name,
        logoUrl: org?.brandLogoUrl || "",
        brandColor: "",
        secondaryColor: "",
        tagline: "",
        pdfHeaderText: org?.pdfHeaderText || "",
        pdfFooterText: org?.pdfFooterText || "",
      },
    });
  } catch (error) {
    logger.error("[SETTINGS_BRANDING] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch branding" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { logoUrl, pdfHeaderText, pdfFooterText } = body;

    const updated = await prisma.org.update({
      where: { id: ctx.orgId },
      data: {
        ...(logoUrl !== undefined && { brandLogoUrl: logoUrl }),
        ...(pdfHeaderText !== undefined && { pdfHeaderText }),
        ...(pdfFooterText !== undefined && { pdfFooterText }),
        updatedAt: new Date(),
      },
    });

    logger.info("[SETTINGS_BRANDING] Updated", { orgId: ctx.orgId });

    return NextResponse.json({ success: true, branding: updated });
  } catch (error) {
    logger.error("[SETTINGS_BRANDING] PUT Error:", error);
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}

// PATCH alias — the white-label page sends PATCH
export const PATCH = PUT;

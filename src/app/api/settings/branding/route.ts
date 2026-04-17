/**
 * GET/PUT /api/settings/branding
 *
 * Manage org branding settings (logo, colors, etc.)
 * Wires up the white-label/branding settings pages.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { logCriticalAction } from "@/lib/audit/criticalActions";
import { requireRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read PDF-specific fields from Org table
    const org = await prisma.org.findUnique({
      where: { id: ctx.orgId },
      select: {
        id: true,
        name: true,
        clerkOrgId: true,
        brandLogoUrl: true,
        pdfHeaderText: true,
        pdfFooterText: true,
      },
    });

    // Read branding from org_branding (canonical source for logo, colors, etc.)
    const orgIdCandidates = [ctx.orgId, org?.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    const branding = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      branding: {
        id: org?.id,
        name: branding?.companyName || org?.name,
        logoUrl: branding?.logoUrl || org?.brandLogoUrl || "",
        brandColor: branding?.colorPrimary || "",
        secondaryColor: branding?.colorAccent || "",
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

    // RBAC: Only admins can modify branding
    await requireRole("admin");

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

    // Sync logoUrl to org_branding (canonical branding table) to prevent split-brain
    if (logoUrl !== undefined) {
      try {
        const org = await prisma.org.findUnique({
          where: { id: ctx.orgId },
          select: { clerkOrgId: true },
        });
        const orgIdCandidates = [ctx.orgId, org?.clerkOrgId].filter(
          (v): v is string => typeof v === "string" && v.length > 0
        );
        const existingBranding = await prisma.org_branding.findFirst({
          where: { orgId: { in: orgIdCandidates } },
        });
        if (existingBranding) {
          await prisma.org_branding.update({
            where: { id: existingBranding.id },
            data: { logoUrl, updatedAt: new Date() },
          });
        }
      } catch (syncErr) {
        logger.warn("[SETTINGS_BRANDING] Failed to sync logoUrl to org_branding:", syncErr);
      }
    }

    logger.info("[SETTINGS_BRANDING] Updated", { orgId: ctx.orgId });

    // Audit log branding update
    await logCriticalAction("BRANDING_UPDATED", ctx.userId || "unknown", ctx.orgId, {
      changedFields: Object.keys(body)
        .filter((k) => body[k] !== undefined)
        .join(","),
    });

    return NextResponse.json({ success: true, branding: updated });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusCode = (error as any)?.statusCode;
    if (statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: 403 });
    }
    logger.error("[SETTINGS_BRANDING] PUT Error:", error);
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}

// PATCH alias — the white-label page sends PATCH
export const PATCH = PUT;

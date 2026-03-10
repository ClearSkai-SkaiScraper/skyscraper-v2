export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/branding/pdf
 *
 * Returns complete branding data (company + employee) for client-side PDF
 * generation. Combines org_branding, org, users, and user_organizations
 * tables into a single payload matching the BrandingData interface used
 * by the branded header system.
 */
export async function GET(_req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgCtx = await safeOrgContext();
    const orgId = orgCtx.ok ? orgCtx.orgId : null;

    if (!orgId) {
      return NextResponse.json({
        companyName: "Your Company",
        brandColor: "#1e40af",
      });
    }

    // Fetch org branding
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true, clerkOrgId: true },
    });

    const orgIdCandidates = [orgId, org?.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    const branding = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
      orderBy: { updatedAt: "desc" },
      select: {
        companyName: true,
        phone: true,
        email: true,
        website: true,
        license: true,
        logoUrl: true,
        colorPrimary: true,
        teamPhotoUrl: true,
      },
    });

    // Fetch user info
    const user = await prisma.users
      .findFirst({
        where: { clerkUserId },
        select: {
          id: true,
          name: true,
          email: true,
          headshot_url: true,
        },
      })
      .catch(() => null);

    let employeeName: string | undefined;
    let employeeTitle: string | undefined;
    let employeeEmail: string | undefined;
    let headshotUrl: string | undefined;

    if (user) {
      employeeName = user.name || undefined;
      employeeEmail = user.email || undefined;
      headshotUrl = user.headshot_url || undefined;

      // Get role/title from membership
      const membership = await prisma.user_organizations
        .findFirst({
          where: { userId: user.id, organizationId: orgId },
          select: { role: true },
        })
        .catch(() => null);

      if (membership?.role) {
        employeeTitle =
          membership.role.charAt(0).toUpperCase() + membership.role.slice(1).toLowerCase();
      }
    }

    return NextResponse.json({
      companyName: branding?.companyName || org?.name || "Your Company",
      companyPhone: branding?.phone || undefined,
      companyEmail: branding?.email || undefined,
      companyWebsite: branding?.website || undefined,
      companyLicense: branding?.license || undefined,
      logoUrl: branding?.logoUrl || undefined,
      brandColor: branding?.colorPrimary || "#1e40af",
      employeeName,
      employeeTitle,
      employeeEmail,
      headshotUrl: branding?.teamPhotoUrl || headshotUrl || undefined,
    });
  } catch (error) {
    logger.error("[branding/pdf] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

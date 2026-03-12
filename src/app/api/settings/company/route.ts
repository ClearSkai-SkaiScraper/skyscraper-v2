/**
 * GET/PATCH /api/settings/company
 *
 * Manage company profile settings (phone, email, license, service area).
 * Data lives on contractor_profiles (one-to-one with org).
 * Wires up the onboarding wizard + settings/company page.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { createId } from "@paralleldrive/cuid2";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.contractor_profiles.findUnique({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        businessName: true,
        phone: true,
        email: true,
        licenseNumber: true,
        serviceAreas: true,
        website: true,
        about: true,
        tagline: true,
        logoUrl: true,
      },
    });

    const org = await prisma.org.findUnique({
      where: { id: ctx.orgId },
      select: { name: true },
    });

    return NextResponse.json({
      success: true,
      company: {
        name: org?.name || "",
        phone: profile?.phone || "",
        contactEmail: profile?.email || "",
        licenseNumber: profile?.licenseNumber || "",
        serviceArea:
          typeof profile?.serviceAreas === "string"
            ? profile.serviceAreas
            : Array.isArray(profile?.serviceAreas)
              ? (profile.serviceAreas as string[]).join(", ")
              : "",
        website: profile?.website || "",
        about: profile?.about || "",
        tagline: profile?.tagline || "",
        logoUrl: profile?.logoUrl || "",
      },
    });
  } catch (error) {
    logger.error("[SETTINGS_COMPANY] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch company settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phone, contactEmail, licenseNumber, serviceArea, website, about, tagline } = body;

    // Upsert contractor profile with company info
    const profile = await prisma.contractor_profiles.upsert({
      where: { orgId: ctx.orgId },
      update: {
        ...(phone !== undefined && { phone }),
        ...(contactEmail !== undefined && { email: contactEmail }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(serviceArea !== undefined && {
          serviceAreas: serviceArea ? serviceArea.split(",").map((s: string) => s.trim()) : [],
        }),
        ...(website !== undefined && { website }),
        ...(about !== undefined && { about }),
        ...(tagline !== undefined && { tagline }),
        updatedAt: new Date(),
      },
      create: {
        id: createId(),
        orgId: ctx.orgId,
        slug: `org-${ctx.orgId.slice(0, 8)}`,
        businessName:
          (
            await prisma.org.findUnique({
              where: { id: ctx.orgId },
              select: { name: true },
            })
          )?.name || "My Company",
        phone: phone || null,
        email: contactEmail || null,
        licenseNumber: licenseNumber || null,
        serviceAreas: serviceArea ? serviceArea.split(",").map((s: string) => s.trim()) : [],
        services: [],
        updatedAt: new Date(),
      },
    });

    logger.info("[SETTINGS_COMPANY] Updated", { orgId: ctx.orgId });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    logger.error("[SETTINGS_COMPANY] PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update company settings" }, { status: 500 });
  }
}

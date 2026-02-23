export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const orgId = await getTenant();

    if (!orgId) {
      return NextResponse.json({ branding: null });
    }

    // Get branding from org_branding table
    const branding = await prisma.org_branding.findFirst({
      where: {
        OR: [{ orgId }, { ownerId: userId }],
      },
    });

    return NextResponse.json({ branding: branding ?? null });
  } catch (error) {
    logger.error("[Branding GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const orgId = await getTenant();
    const body = await req.json();

    // Find existing branding record
    const existing = await prisma.org_branding.findFirst({
      where: {
        OR: [{ orgId: orgId ?? undefined }, { ownerId: userId }],
      },
    });

    if (existing) {
      // Update existing record
      const updated = await prisma.org_branding.update({
        where: { id: existing.id },
        data: {
          companyName: body.company_name ?? existing.companyName,
          phone: body.phone ?? existing.phone,
          email: body.email ?? existing.email,
          license: body.license_no ?? existing.license,
          colorPrimary: body.brand_color ?? existing.colorPrimary,
          colorAccent: body.accent_color ?? existing.colorAccent,
          logoUrl: body.logo_url ?? existing.logoUrl,
          website: body.website ?? existing.website,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ branding: updated });
    } else {
      // Create new record
      const created = await prisma.org_branding.create({
        data: {
          id: nanoid(),
          orgId: orgId!,
          ownerId: userId,
          companyName: body.company_name ?? null,
          phone: body.phone ?? null,
          email: body.email ?? null,
          license: body.license_no ?? null,
          colorPrimary: body.brand_color ?? "#117CFF",
          colorAccent: body.accent_color ?? "#FFC838",
          logoUrl: body.logo_url ?? null,
          website: body.website ?? null,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ branding: created });
    }
  } catch (error) {
    logger.error("[Branding POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

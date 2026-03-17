export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const orgCtx = await getActiveOrgContext({ required: true });
    if (!orgCtx.ok) {
      return NextResponse.json({ branding: null });
    }

    // Backward-compatible lookup: check both DB UUID and Clerk orgId
    const orgIdCandidates = [orgCtx.orgId, orgCtx.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    const branding = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
      orderBy: { updatedAt: "desc" },
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
    const orgCtx = await getActiveOrgContext({ required: true });
    if (!orgCtx.ok) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const dbOrgId = orgCtx.orgId;
    const body = await req.json();

    // Backward-compatible lookup: check both DB UUID and Clerk orgId
    const orgIdCandidates = [dbOrgId, orgCtx.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    const existing = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      // Migrate legacy record to DB UUID if needed
      const needsMigration = existing.orgId !== dbOrgId;

      const updated = await prisma.org_branding.update({
        where: { id: existing.id },
        data: {
          orgId: needsMigration ? dbOrgId : undefined,
          companyName: body.company_name ?? body.companyName ?? existing.companyName,
          phone: body.phone ?? existing.phone,
          email: body.email ?? existing.email,
          license: body.license_no ?? body.license ?? existing.license,
          colorPrimary: body.brand_color ?? body.colorPrimary ?? existing.colorPrimary,
          colorAccent: body.accent_color ?? body.colorAccent ?? existing.colorAccent,
          logoUrl: body.logo_url ?? body.logoUrl ?? existing.logoUrl,
          website: body.website ?? existing.website,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ branding: updated });
    } else {
      const created = await prisma.org_branding.create({
        data: {
          id: nanoid(),
          orgId: dbOrgId,
          ownerId: userId,
          companyName: body.company_name ?? body.companyName ?? null,
          phone: body.phone ?? null,
          email: body.email ?? null,
          license: body.license_no ?? body.license ?? null,
          colorPrimary: body.brand_color ?? body.colorPrimary ?? "#117CFF",
          colorAccent: body.accent_color ?? body.colorAccent ?? "#FFC838",
          logoUrl: body.logo_url ?? body.logoUrl ?? null,
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

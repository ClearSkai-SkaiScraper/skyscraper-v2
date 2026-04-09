export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const brandingSchema = z.object({
  company_name: z.string().trim().max(200).nullish(),
  companyName: z.string().trim().max(200).nullish(),
  phone: z.string().trim().max(30).nullish(),
  email: z.union([z.string().trim().email(), z.literal("")]).nullish(),
  license_no: z.string().trim().max(100).nullish(),
  license: z.string().trim().max(100).nullish(),
  brand_color: z.string().trim().max(20).nullish(),
  colorPrimary: z.string().trim().max(20).nullish(),
  accent_color: z.string().trim().max(20).nullish(),
  colorAccent: z.string().trim().max(20).nullish(),
  logo_url: z.string().trim().max(2000).nullish(),
  logoUrl: z.string().trim().max(2000).nullish(),
  website: z.string().trim().max(500).nullish(),
});

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Backward-compatible lookup: check both DB UUID and Clerk orgId
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { clerkOrgId: true },
    });
    const orgIdCandidates = [orgId, org?.clerkOrgId].filter(
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
});

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    // Look up clerkOrgId for backward-compatible lookup
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { clerkOrgId: true },
    });

    const raw = await req.json();
    const parsed = brandingSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Backward-compatible lookup: check both DB UUID and Clerk orgId
    const orgIdCandidates = [orgId, org?.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    const existing = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      // Migrate legacy record to DB UUID if needed
      const needsMigration = existing.orgId !== orgId;

      const updated = await prisma.org_branding.update({
        where: { id: existing.id },
        data: {
          orgId: needsMigration ? orgId : undefined,
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
          orgId,
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
});

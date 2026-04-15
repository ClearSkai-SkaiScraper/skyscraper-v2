import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const createPropertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  zipCode: z.string().optional().default(""),
  propertyType: z.string().optional(),
  squareFootage: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
  roofType: z.string().optional(),
  roofAge: z.number().int().min(0).optional(),
  hvacAge: z.number().int().min(0).optional(),
  waterHeaterAge: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/property-profiles — List property profiles for the org
 */
export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await prisma.property_profiles.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        property_health_scores: {
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ success: true, data: profiles });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] property-profiles GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/property-profiles — Create a new property profile
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      address,
      city,
      state,
      zipCode,
      squareFootage,
      yearBuilt,
      roofType,
      roofAge,
      hvacAge,
      waterHeaterAge,
    } = parsed.data;

    // Build full address
    const fullAddress = [address, city, state, zipCode].filter(Boolean).join(", ");

    // Create the detailed property profile directly
    // propertyId is self-referencing when no base property record exists
    const profileId = createId();
    const profile = await prisma.property_profiles.create({
      data: {
        id: profileId,
        propertyId: profileId,
        orgId: ctx.orgId,
        fullAddress,
        streetAddress: address,
        city: city || "",
        state: state || "",
        zipCode: zipCode || "",
        squareFootage: squareFootage || null,
        yearBuilt: yearBuilt || null,
        roofType: roofType || null,
        roofAge: roofAge || null,
        hvacAge: hvacAge || null,
        waterHeaterAge: waterHeaterAge || null,
        updatedAt: new Date(),
      },
    });

    logger.info("[PROPERTY_PROFILE_CREATE]", { orgId: ctx.orgId, profileId });

    return NextResponse.json({ success: true, data: profile }, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] property-profiles POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

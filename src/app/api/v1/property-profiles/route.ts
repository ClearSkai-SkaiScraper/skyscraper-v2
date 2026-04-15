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

    // ── Dual-write: create `properties` row first (FK target for claims/jobs/inspections) ──
    // Then create `property_profiles` linked to it (rich data for health scores, digital twins)
    const propertyId = createId();
    const profileId = createId();

    // 1. Find or create a placeholder contact for the property
    //    (properties.contactId is required by schema)
    let contactId: string | null = null;
    const existingContact = await prisma.contacts.findFirst({
      where: { orgId: ctx.orgId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Create a placeholder contact for the org
      contactId = createId();
      await prisma.contacts.create({
        data: {
          id: contactId,
          orgId: ctx.orgId,
          firstName: "Property",
          lastName: "Owner",
          email: "",
          updatedAt: new Date(),
        },
      });
    }

    // 2. Create the base `properties` row (FK target)
    await prisma.properties.create({
      data: {
        id: propertyId,
        orgId: ctx.orgId,
        contactId,
        name: fullAddress,
        propertyType: parsed.data.propertyType || "residential",
        street: address,
        city: city || "",
        state: state || "",
        zipCode: zipCode || "",
        yearBuilt: yearBuilt || null,
        squareFootage: squareFootage || null,
        roofType: roofType || null,
        roofAge: roofAge || null,
        updatedAt: new Date(),
      },
    });

    // 3. Create the detailed `property_profiles` row linked to properties
    const profile = await prisma.property_profiles.create({
      data: {
        id: profileId,
        propertyId,
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

    logger.info("[PROPERTY_PROFILE_CREATE]", { orgId: ctx.orgId, propertyId, profileId });

    return NextResponse.json({ success: true, data: profile }, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] property-profiles POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

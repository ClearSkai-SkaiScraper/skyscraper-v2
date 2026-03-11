export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";

const createClaimSchema = z.object({
  title: z.string().min(1, "Title is required"),
  propertyAddress: z.string().optional(),
  lossType: z.string().optional(),
  dateOfLoss: z.string().optional(),
  description: z.string().optional(),
  homeownerName: z.string().min(1, "Homeowner name is required"),
  homeownerEmail: z.string().email().optional().or(z.literal("")),
  homeownerPhone: z.string().optional(),
  insuredName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createClaimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const insuredName = data.homeownerName || data.insuredName || "Unknown";

    // Look up the client to find any connected pro/org
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, orgId: true },
    });

    const orgId = client?.orgId || "portal";

    // Generate a claim number
    const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;

    // Create a property record if address provided
    let propertyId: string | null = null;
    if (data.propertyAddress) {
      const parts = data.propertyAddress.split(",").map((p: string) => p.trim());
      const property = await prisma.properties.create({
        data: {
          id: crypto.randomUUID(),
          street: parts[0] || data.propertyAddress,
          city: parts[1] || null,
          state: parts[2] || null,
          zipCode: parts[3] || null,
          orgId,
        },
      });
      propertyId = property.id;
    }

    // Create the claim
    const claim = await prisma.claims.create({
      data: {
        id: crypto.randomUUID(),
        claimNumber,
        title: data.title,
        orgId,
        insured_name: insuredName,
        homeowner_email: data.homeownerEmail || null,
        damageType: data.lossType || null,
        dateOfLoss: data.dateOfLoss ? new Date(data.dateOfLoss) : null,
        status: "NEW",
        lifecycle_stage: "INTAKE",
        propertyId: propertyId,
        source: "portal",
        notes: data.description || null,
        submittedBy: userId,
      },
    });

    // Create client access so the client can view this claim
    await prisma.client_access.create({
      data: {
        id: crypto.randomUUID(),
        claimId: claim.id,
        email: data.homeownerEmail || `${userId}@portal.local`,
      },
    });

    logger.info("[PORTAL_CLAIM_CREATE]", {
      userId,
      claimId: claim.id,
      claimNumber,
    });

    return NextResponse.json(
      {
        claim: {
          id: claim.id,
          claimNumber: claim.claimNumber,
          status: claim.status,
        },
        message: "Claim submitted successfully. A contractor will review it shortly.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[PORTAL_CLAIM_CREATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

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

    // Rate limit: 100 req/min per user
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
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

    // Resolve orgId: client.orgId → connected pro's org → "portal" fallback
    let orgId = client?.orgId || null;

    // If no orgId on client record, check for a connected pro's org
    if (!orgId || orgId === "self-service-clients") {
      const proConnection = await prisma.clientProConnection.findFirst({
        where: {
          clientId: client?.id ?? "",
          status: { in: ["connected", "accepted"] },
        },
        include: {
          tradesCompany: {
            select: { orgId: true },
          },
        },
        orderBy: { connectedAt: "desc" },
      });

      if (proConnection?.tradesCompany?.orgId) {
        orgId = proConnection.tradesCompany.orgId;
      }
    }

    // Final fallback — claim is visible only to the client until connected
    if (!orgId) {
      orgId = "portal";
    }

    // Generate a claim number
    const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}`;

    // Create a property record if address provided
    let propertyId: string | null = null;
    if (data.propertyAddress) {
      const parts = data.propertyAddress.split(",").map((p: string) => p.trim());
      const property = await prisma.properties.create({
        data: {
          id: crypto.randomUUID(),
          contactId: "portal-" + userId,
          name: data.propertyAddress,
          propertyType: "Residential",
          street: parts[0] || data.propertyAddress,
          city: parts[1] || "",
          state: parts[2] || "",
          zipCode: parts[3] || "",
          orgId,
          updatedAt: new Date(),
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
        damageType: data.lossType || "",
        dateOfLoss: data.dateOfLoss ? new Date(data.dateOfLoss) : new Date(),
        status: "NEW",
        lifecycle_stage: "FILED",
        propertyId: propertyId || "",
        description: data.description || null,
        updatedAt: new Date(),
      },
    });

    // Create client access so the client can view this claim (email-based)
    const clientEmail = data.homeownerEmail || `${userId}@portal.local`;
    await prisma.client_access.create({
      data: {
        id: crypto.randomUUID(),
        claimId: claim.id,
        email: clientEmail,
      },
    });

    // Also create ClaimClientLink (userId-based) for unified access
    if (client) {
      await prisma.claimClientLink
        .create({
          data: {
            id: crypto.randomUUID(),
            claimId: claim.id,
            clientEmail: clientEmail,
            clientName: insuredName,
            clientUserId: client.id,
            status: "ACCEPTED",
            invitedBy: userId,
            acceptedAt: new Date(),
          },
        })
        .catch(() => {
          // Ignore duplicate — may already exist
        });
    }

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

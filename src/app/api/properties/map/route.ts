export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Cache map data for 5 minutes (300 seconds) - properties don't change frequently
export const revalidate = 300;

export async function GET() {
  try {
    const orgId = await getTenant();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let properties: any[] = [];
    let leads: any[] = [];

    // Get all properties from the org with valid address data
    try {
      properties = await prisma.properties.findMany({
        where: {
          orgId,
          AND: [{ street: { not: "" } }, { city: { not: "" } }, { state: { not: "" } }],
        },
        select: {
          id: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
          name: true,
          propertyType: true,
          claims: {
            select: {
              id: true,
              lifecycle_stage: true,
              dateOfLoss: true,
              status: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 100,
      });
    } catch (error) {
      logger.error("[Map API] Properties query failed:", error);
      // Continue with empty properties array
    }

    // Also get leads with addresses
    try {
      leads = await prisma.leads.findMany({
        where: {
          orgId,
        },
        select: {
          id: true,
          contacts: {
            select: {
              street: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
          stage: true,
        },
        take: 100,
      });
    } catch (error) {
      logger.error("[Map API] Leads query failed:", error);
      // Continue with empty leads array
    }

    // Combine properties and leads into map items
    const mapItems = [
      ...properties.map((p) => {
        const latestClaim = p.claims?.[0];
        return {
          id: p.id,
          name: p.name || "",
          address: p.street || "",
          city: p.city || "",
          state: p.state || "",
          zipCode: p.zipCode || "",
          latitude: null, // Properties don't store coordinates
          longitude: null,
          propertyType: p.propertyType || "",
          status: latestClaim?.status || "property",
          lifecycleStage: latestClaim?.lifecycle_stage || null,
          dateOfLoss: latestClaim?.dateOfLoss ? latestClaim.dateOfLoss.toISOString() : null,
          type: "property",
        };
      }),
      ...leads
        .filter((l) => l.contacts?.street && l.contacts?.city && l.contacts?.state)
        .map((l) => ({
          id: l.id,
          address: l.contacts.street!,
          city: l.contacts.city!,
          state: l.contacts.state!,
          zipCode: l.contacts.zipCode || "",
          latitude: null,
          longitude: null,
          status: l.stage || "unknown",
          lifecycleStage: null,
          dateOfLoss: null,
          type: "lead",
        })),
    ];

    return NextResponse.json(mapItems, { status: 200 });
  } catch (error) {
    logger.error("[Map API] Critical error:", error);
    // Return empty array with 200 status to prevent UI crash
    return NextResponse.json([], { status: 200 });
  }
}

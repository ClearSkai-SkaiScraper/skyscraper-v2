export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const orgId = await getTenant();
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 403 });
    }

    const properties = await prisma.properties.findMany({
      where: { orgId },
      orderBy: { street: "asc" },
      select: {
        id: true,
        street: true,
        city: true,
        state: true,
        zipCode: true,
      },
    });

    // Map street to address for backwards compatibility with frontend
    const formattedProperties = properties.map((p) => ({
      id: p.id,
      address: p.street,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
    }));

    return NextResponse.json(formattedProperties);
  } catch (error) {
    logger.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

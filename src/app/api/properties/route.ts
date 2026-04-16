export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withOrgScope(async (req, { orgId }) => {
  try {
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
});

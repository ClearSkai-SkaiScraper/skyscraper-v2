export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.publicMetadata?.orgId as string | undefined;
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

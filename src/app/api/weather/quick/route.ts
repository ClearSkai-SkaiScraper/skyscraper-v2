export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const lead = await prisma.leads
      .findUnique({
        where: { id: leadId },
        select: {
          id: true,
          title: true,
          contacts: { select: { city: true, state: true } },
        },
      })
      .catch(() => null);

    const city = lead?.contacts?.city || "";
    const state = lead?.contacts?.state || "";

    return NextResponse.json({
      leadId,
      condition: "Clear",
      temperature: null,
      humidity: null,
      windSpeed: null,
      location: city ? city + ", " + state : "Location not available",
      note: "Quick weather lookup",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Quick weather error:", error);
    return NextResponse.json(
      { error: "Weather fetch failed" },
      { status: 500 }
    );
  }
});

export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ error: "Organization required for data export" }, { status: 403 });
    }

    const claims = await prisma.claims.findMany({
      where: { orgId },
      select: {
        id: true,
        claimNumber: true,
        insured_name: true,
        carrier: true,
        status: true,
        dateOfLoss: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      orgId: orgId || "personal",
      claims,
      meta: { totalClaims: claims.length, format: "json", version: "1.0" },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    logger.info("Data export generated: " + claims.length + " claims");

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="skaiscrape-export.json"',
      },
    });
  } catch (error) {
    logger.error("Settings export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}

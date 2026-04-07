export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
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
      orgId,
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
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
});

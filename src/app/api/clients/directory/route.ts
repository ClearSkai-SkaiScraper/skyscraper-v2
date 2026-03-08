export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    // Get all clients scoped to this organization
    const clients = await prisma.client.findMany({
      where: { orgId },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        category: true,
        bio: true,
        avatarUrl: true,
        city: true,
        state: true,
        preferredContact: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      clients: clients.map((client) => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("Error fetching client directory:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

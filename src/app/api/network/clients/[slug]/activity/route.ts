export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

/**
 * GET /api/network/clients/[slug]/activity
 * Returns activity feed for a client network
 */
export const GET = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  const { slug } = await routeParams.params;

  try {
    const client = await prisma.client_networks.findUnique({
      where: { slug },
    });

    if (!client) {
      return NextResponse.json({ error: "Client network not found" }, { status: 404 });
    }

    // @ts-ignore - Prisma client types
    const activity = await prisma.client_activity.findMany({
      where: { clientNetworkId: client.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ activity });
  } catch (error) {
    logger.error(`[GET /api/network/clients/${slug}/activity]`, error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
});

/**
 * POST /api/network/clients/[slug]/activity
 * Creates a new activity entry
 */
export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { slug } = await routeParams.params;

  try {
    const body = await req.json();
    const { actorType, type, message } = body;

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const client = await prisma.client_networks.findUnique({
      where: { slug },
    });

    if (!client) {
      return NextResponse.json({ error: "Client network not found" }, { status: 404 });
    }

    // Verify ownership
    if (client.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activity = await prisma.client_activity.create({
      data: {
        id: newId(),
        clientNetworkId: client.id,
        actorType: actorType || "pro",
        actorId: userId,
        type,
        message: message ?? null,
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    logger.error(`[POST /api/network/clients/${slug}/activity]`, error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
});

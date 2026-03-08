export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

interface Params {
  params: {
    slug: string;
  };
}

/**
 * GET /api/network/clients/[slug]/activity
 * Returns activity feed for a client network
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = params;

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
}

/**
 * POST /api/network/clients/[slug]/activity
 * Creates a new activity entry
 */
export async function POST(req: NextRequest, { params }: Params) {
  const authData = await auth();
  const { userId, orgId } = authData;

  const { slug } = params;

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

    // If authenticated, verify ownership
    if (userId && orgId && client.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activity = await prisma.client_activity.create({
      data: {
        id: newId(),
        clientNetworkId: client.id,
        actorType: actorType || (userId ? "pro" : "system"),
        actorId: userId || null,
        type,
        message: message ?? null,
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    logger.error(`[POST /api/network/clients/${slug}/activity]`, error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}

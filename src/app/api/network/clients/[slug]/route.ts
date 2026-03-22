export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface Params {
  params: {
    slug: string;
  };
}

/**
 * GET /api/network/clients/[slug]
 * B-16: Now requires authentication + org ownership check
 */
export async function GET(req: NextRequest, { params }: Params) {
  const authData = await auth();
  const { userId, orgId } = authData;
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = params;

  try {
    const client = await prisma.client_networks.findFirst({
      where: { slug, orgId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client network not found" }, { status: 404 });
    }

    const [contacts, activity] = await Promise.all([
      prisma.client_contacts.findMany({
        where: { clientNetworkId: client.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.client_activity.findMany({
        where: { clientNetworkId: client.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({ client: { ...client, contacts, activity } });
  } catch (error) {
    logger.error(`[GET /api/network/clients/${slug}]`, error);
    return NextResponse.json({ error: "Failed to fetch client network" }, { status: 500 });
  }
}

/**
 * PATCH /api/network/clients/[slug]
 * Updates a client network (authenticated only)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const authData = await auth();
  const { userId, orgId } = authData;
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = params;

  try {
    const body = await req.json();
    const { name } = body;

    // B-16: Use findFirst with orgId directly — no TOCTOU
    const client = await prisma.client_networks.findFirst({
      where: { slug, orgId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client network not found" }, { status: 404 });
    }

    const updated = await prisma.client_networks.update({
      where: { slug },
      data: { name, updatedAt: new Date() },
    });

    const contacts = await prisma.client_contacts.findMany({
      where: { clientNetworkId: updated.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ client: { ...updated, contacts } });
  } catch (error) {
    logger.error(`[PATCH /api/network/clients/${slug}]`, error);
    return NextResponse.json({ error: "Failed to update client network" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/network/clients/[slug]
 * B-16: Now requires authentication + org ownership check
 */
export const GET = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  const { slug } = await routeParams.params;

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
});

/**
 * PATCH /api/network/clients/[slug]
 * Updates a client network (authenticated only)
 */
export const PATCH = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  const { slug } = await routeParams.params;

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
});

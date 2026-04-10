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
 * GET /api/network/clients
 * Returns all client networks for the authenticated org
 */
export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const clients = await prisma.client_networks.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    const clientIds = clients.map((c) => c.id);

    const [contacts, recentActivity] = await Promise.all([
      clientIds.length === 0
        ? Promise.resolve([])
        : prisma.client_contacts.findMany({
            where: { clientNetworkId: { in: clientIds } },
            orderBy: { createdAt: "desc" },
          }),
      clientIds.length === 0
        ? Promise.resolve([])
        : prisma.client_activity.findMany({
            where: { clientNetworkId: { in: clientIds } },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
    ]);

    const contactsByClientId = new Map<string, typeof contacts>();
    for (const c of contacts) {
      const current = contactsByClientId.get(c.clientNetworkId) ?? [];
      current.push(c);
      contactsByClientId.set(c.clientNetworkId, current);
    }

    const activityByClientId = new Map<string, typeof recentActivity>();
    for (const a of recentActivity) {
      const current = activityByClientId.get(a.clientNetworkId) ?? [];
      if (current.length < 5) current.push(a);
      activityByClientId.set(a.clientNetworkId, current);
    }

    const enrichedClients = clients.map((c) => ({
      ...c,
      contacts: contactsByClientId.get(c.id) ?? [],
      activity: activityByClientId.get(c.id) ?? [],
    }));

    return NextResponse.json({ clients: enrichedClients });
  } catch (error) {
    logger.error("[GET /api/network/clients]", error);
    return NextResponse.json({ error: "Failed to fetch client networks" }, { status: 500 });
  }
});

/**
 * POST /api/network/clients
 * Creates a new client network
 */
export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json();
    const { name, slug, contacts } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await prisma.client_networks.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const client = await tx.client_networks.create({
        data: {
          id: newId(),
          orgId,
          name,
          slug,
          updatedAt: new Date(),
        },
      });

      const normalizedContacts = Array.isArray(contacts) ? contacts : [];
      if (normalizedContacts.length > 0) {
        await tx.client_contacts.createMany({
          data: normalizedContacts
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((c: any) => Boolean(c?.name))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((c: any) => ({
              id: newId(),
              clientNetworkId: client.id,
              name: String(c.name),
              email: c.email ? String(c.email) : null,
              phone: c.phone ? String(c.phone) : null,
              role: c.role ? String(c.role) : "Homeowner",
            })),
        });
      }

      const createdContacts = await tx.client_contacts.findMany({
        where: { clientNetworkId: client.id },
        orderBy: { createdAt: "desc" },
      });

      return { client, contacts: createdContacts };
    });

    return NextResponse.json(
      { client: { ...created.client, contacts: created.contacts } },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[POST /api/network/clients]", error);
    return NextResponse.json({ error: "Failed to create client network" }, { status: 500 });
  }
});

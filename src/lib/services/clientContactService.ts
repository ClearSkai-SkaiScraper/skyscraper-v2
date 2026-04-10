/**
 * Client Contact Service
 * Handles automatic creation of CRM client contacts from Trades Network connections
 */

import prisma from "@/lib/prisma";

interface CreateClientContactFromTradesParams {
  orgId: string;
  connectionId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  serviceType?: string;
}

/**
 * Create or update a Client Contact in the CRM when a Pro accepts a connection
 * Links the CRM client to the trades connection for future reference
 */
export async function createClientContactFromTrades(params: CreateClientContactFromTradesParams) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orgId, connectionId, clientName, clientEmail, clientPhone, clientAddress, serviceType } =
    params;

  // Find existing client or create new one
  let client = await prisma.client.findFirst({
    where: {
      email: clientEmail,
      orgId,
    },
  });

  if (client) {
    // Update existing client
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        name: clientName,
        phone: clientPhone || client.phone,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = await (prisma as any).Client.create({
      data: {
        slug: `client-${Date.now()}`,
        orgId,
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
      },
    });
  }

  // Update the connection with the CRM clientId reference
  await prisma.clientProConnection.update({
    where: { id: connectionId },
    data: {
      clientId: client!.id,
    },
  });

  return client;
}

/**
 * Get or create a Client record by email
 * Used when we already have client info but need to ensure they exist in CRM
 */
export async function getOrCreateClient(params: {
  orgId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  const { orgId, name, email, phone } = params;

  let client = await prisma.client.findFirst({
    where: {
      email,
      orgId,
    },
  });

  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = await (prisma as any).Client.create({
      data: {
        slug: `client-${Date.now()}`,
        orgId,
        name,
        email,
        phone,
      },
    });
  }

  return client;
}

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

/**
 * Get all claims associated with the currently logged-in client user.
 * Maps Clerk user email → Client → ClientPortalAccess → claims
 */
export async function getClientClaims() {
  const user = await currentUser();
  if (!user) return [];

  const email = user.emailAddresses[0]?.emailAddress;
  const userId = user.id;
  if (!email) return [];

  // Find the client by userId or email
  const client = await prisma.client.findFirst({
    where: {
      OR: [{ userId }, { email }],
    },
    select: {
      id: true,
      orgId: true,
    },
  });

  if (!client) return [];

  // Get all claims this client has access to via client_access (linked by email, NOT clientId)
  const accessRecords = await prisma.client_access.findMany({
    where: {
      email: email.toLowerCase(),
    },
    select: {
      claimId: true,
    },
  });

  if (accessRecords.length === 0) return [];

  // Get all claims linked to this client
  const claimIds = accessRecords.map((a) => a.claimId);

  const claims = await prisma.claims.findMany({
    where: {
      id: {
        in: claimIds,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      claimNumber: true,
      title: true,
      description: true,
      status: true,
      dateOfLoss: true,
      carrier: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return claims;
}

/**
 * Get a single claim by ID, but only if the current user has access to it
 */
export async function getClientClaim(claimId: string) {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  // Verify access
  const claims = await getClientClaims();
  const claim = claims.find((c) => c.id === claimId);

  if (!claim) return null;

  // Get full claim details - Note: claims table links to properties via propertyId
  const fullClaim = await prisma.claims.findUnique({
    where: { id: claimId },
  });

  // If we need property details, fetch separately
  // For now, return the claim without property details since the schema doesn't have the relation
  return fullClaim;
}

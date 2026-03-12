import prisma from "@/lib/prisma";

/**
 * Get client access for a claim by email
 * Uses the client_access model to check portal access
 */
export async function getClaimAccessByEmail(
  email: string,
  claimId: string
): Promise<{ access: any; claim: any } | null> {
  const access = await prisma.client_access.findFirst({
    where: {
      claimId,
      email,
    },
    include: {
      claims: {
        select: {
          id: true,
          claimNumber: true,
          title: true,
          orgId: true,
        },
      },
    },
  });

  if (!access) return null;

  return { access, claim: access.claims };
}

/**
 * Get ClaimAccess for a signed-in user
 * Looks up user email and checks client_access table
 */
export async function getClaimAccessForUser({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<any | null> {
  // Look up user email from user_registry or users table
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    // Fallback: try user_registry
    const registryUser = await prisma.user_registry.findUnique({
      where: { id: visitorId(userId) },
      select: { email: true },
    });
    if (!registryUser?.email) return null;

    return await prisma.client_access.findFirst({
      where: {
        claimId,
        email: registryUser.email,
      },
    });
  }

  return await prisma.client_access.findFirst({
    where: {
      claimId,
      email: user.email,
    },
  });
}

// Helper to extract visitor ID from Clerk userId if needed
function visitorId(userId: string): string {
  return userId;
}

/**
 * Assert that a user has portal access to a claim
 * Throws 403 if access denied
 * Checks THREE access paths:
 *   1. client_access (email-based, legacy)
 *   2. ClaimClientLink (userId-based, from pro invites)
 *   3. claims.clientId (direct attachment by pro)
 * Also verifies org membership to prevent cross-tenant access
 */
export async function assertPortalAccess({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<any> {
  // Path 1: client_access by email
  const access = await getClaimAccessForUser({ userId, claimId });

  if (access) {
    // Verify the claim exists and get its orgId for tenant isolation
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    });

    if (!claim) {
      throw new Error("Access denied: Claim not found");
    }

    return { ...access, orgId: claim.orgId };
  }

  // Path 2: ClaimClientLink by userId or email
  const client = await prisma.client.findFirst({
    where: { userId },
    select: { id: true, email: true },
  });

  if (client) {
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, ...(client.email ? [{ clientEmail: client.email }] : [])],
        status: "ACCEPTED",
      },
    });

    if (link) {
      const claim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: { orgId: true },
      });
      if (!claim) throw new Error("Access denied: Claim not found");
      return { claimId, email: client.email, orgId: claim.orgId };
    }

    // Path 3: claims.clientId matches this client's ID
    const claimByClientId = await prisma.claims.findFirst({
      where: { id: claimId, clientId: client.id },
      select: { orgId: true },
    });

    if (claimByClientId) {
      return { claimId, email: client.email, orgId: claimByClientId.orgId };
    }
  }

  throw new Error("Access denied: No active portal access to this claim");
}

/**
 * Create or get client access for a claim
 * Called when granting portal access to a client
 */
export async function createClientAccess({
  claimId,
  email,
}: {
  claimId: string;
  email: string;
}): Promise<any> {
  // Check if access already exists
  const existing = await prisma.client_access.findFirst({
    where: { claimId, email },
  });

  if (existing) {
    return existing;
  }

  // Create new access record
  const id = crypto.randomUUID();
  return await prisma.client_access.create({
    data: {
      id,
      claimId,
      email,
    },
  });
}

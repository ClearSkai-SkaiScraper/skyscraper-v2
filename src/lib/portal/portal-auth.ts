// Portal authentication helper - validates client access to claims
// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

/**
 * Returns the portal user & claim IF the logged-in client
 * actually has access to that claim via ClientPortalAccess.
 *
 * @throws Error with message "UNAUTHENTICATED" if no userId
 * @throws Error with message "FORBIDDEN" if no access to claim
 */
export async function getPortalClaim(claimId: string) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();

  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }

  // client_access has email+claimId (no userId). Look up user email first.
  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { email: true },
  });
  if (!user?.email) {
    throw new Error("UNAUTHENTICATED");
  }

  const portalAccess = await prisma.client_access.findFirst({
    where: {
      email: user.email,
      claimId,
    },
    select: {
      claimId: true,
    },
  });

  if (!portalAccess) {
    throw new Error("FORBIDDEN");
  }

  const claim = await prisma.claims.findUnique({ where: { id: portalAccess.claimId } });
  if (!claim) {
    throw new Error("FORBIDDEN");
  }

  return {
    userId,
    claim,
    orgId: claim.orgId,
  };
}

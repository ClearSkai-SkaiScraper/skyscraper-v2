import { auth } from "@clerk/nextjs/server";

import { getResolvedOrgResult } from "@/lib/auth/getResolvedOrgId";
import prisma from "@/lib/prisma";

export type ActiveOrg = {
  id: string;
  name: string;
  role: string;
};

export async function getActiveOrg(): Promise<ActiveOrg> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const orgResult = await getResolvedOrgResult();
  if (!orgResult.ok) {
    throw new Error("Organization not found for user");
  }

  const { orgId, userId: resolvedUserId } = orgResult;

  const membership = await prisma.user_organizations.findFirst({
    where: { userId: resolvedUserId, organizationId: orgId },
    include: { Org: true },
  });

  if (!membership || !membership.Org) {
    throw new Error("Organization membership not found");
  }

  return {
    id: orgId,
    name: membership.Org.name || "Unknown",
    role: membership.role || "ADMIN",
  };
}

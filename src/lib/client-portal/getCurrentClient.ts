// Helper to get client from Clerk user
// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";

import { safePortalQuery } from "@/lib/portal/safePortalQuery";
import prisma from "@/lib/prisma";

export async function getCurrentClient() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  const user = await currentUser();
  if (!user || !userId) return null;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  // Find client directly by userId or email
  const clientResult = await safePortalQuery(() =>
    prisma.client.findFirst({
      where: {
        OR: [{ userId }, { email }],
      },
    })
  );

  if (clientResult.ok && clientResult.data) {
    return clientResult.data;
  }

  // Return null if no client found - portal pages can render maintenance states
  return null;
}

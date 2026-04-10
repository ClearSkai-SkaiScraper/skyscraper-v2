// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";

/**
 * Returns { userId, orgId } and throws if unauthenticated.
 * If you support organizations, derive orgId here (from Clerk or your DB).
 */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  // Example orgId source: user.privateMetadata.orgId || user.organizationMemberships[0]?.organization.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (user as any)?.privateMetadata?.orgId ?? null;
  return { userId: user.id, orgId };
}

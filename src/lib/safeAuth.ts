import { auth } from "@clerk/nextjs/server";

export async function safeAuth() {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId, orgId, sessionId } = await auth();
    return { userId: userId || null, orgId: orgId || null, sessionId: sessionId || null };
  } catch {
    return { userId: null, orgId: null, sessionId: null };
  }
}

export function requireOrg(orgId: string | null) {
  if (!orgId) throw new Error("Organization context required");
}
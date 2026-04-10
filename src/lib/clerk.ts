import { getAuth } from "@clerk/nextjs/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getClerkIdentity(req: any) {
  try {
    const auth = getAuth(req);
    return {
      userId: auth.userId || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orgId: (auth as any).orgId || null,
      sessionId: auth.sessionId || null,
    };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return { userId: null, orgId: null, sessionId: null };
  }
}

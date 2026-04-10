import { getAuth } from "@clerk/nextjs/server";

export function getClerkIdentity(req: any) {
  try {
    const auth = getAuth(req);
    return {
      userId: auth.userId || null,
      orgId: (auth as any).orgId || null,
      sessionId: auth.sessionId || null,
    };
  } catch (_e) {
    return { userId: null, orgId: null, sessionId: null };
  }
}

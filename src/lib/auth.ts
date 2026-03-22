import type { NextApiRequest } from "next";

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getOrgContext } from "@/lib/org/getOrgContext";

/**
 * Simple auth helpers for Next.js API routes.
 * - SERVICE_ROLE_KEY: server-side secret (Supabase service role key) for internal calls.
 * - For local testing we accept the service role key in the Authorization header or an x-org-admin header.
 * Replace with robust JWT/session checks for production.
 */

export function requireOrgAdmin(req: NextApiRequest): {
  ok: boolean;
  reason?: string;
} {
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_KEY || "";
  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const xadmin = (req.headers["x-org-admin"] || "") as string;

  if (!svc) return { ok: false, reason: "service_key_missing" };
  if (auth && auth === svc) return { ok: true };
  if (xadmin && xadmin === svc) return { ok: true };

  return { ok: false, reason: "unauthorized" };
}

export function getBaseUrl() {
  return ((process.env.NEXT_PUBLIC_BASE_URL as string | undefined) ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    window.location.origin) as string;
}

/**
 * Get current session's orgId and userId using the canonical org resolver.
 *
 * This ensures we never depend directly on Clerk's orgId for tenancy;
 * instead we rely on DB-backed membership + org rows via getOrgContext().
 */
export async function getSessionOrgUser(): Promise<{ orgId: string; userId: string }> {
  const { orgId, userId } = await getOrgContext();
  return { orgId, userId };
}

const MIN_SEND_INTERVAL_MS = 5000; // 5s debounce

export async function sendMagicLink(email: string, createUser = true) {
  const key = `magiclink:ts:${email}`;
  const last = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  const now = Date.now();
  if (last && now - Number(last) < MIN_SEND_INTERVAL_MS) {
    return { error: new Error("Please wait before requesting another link.") };
  }

  if (typeof window !== "undefined") window.localStorage.setItem(key, String(now));

  try {
    const redirectTo = `${getBaseUrl()}/auth/callback`;
    const res = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: createUser,
      },
    });
    // log event (console for now)
    logger.info("auth_link_sent", { email, createUser });
    return res;
  } catch (err: any) {
    logger.error(`auth_failure: ${err?.message || err}`);
    return { error: err };
  }
}

import * as originalClerk from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";

export async function auth(...args: Parameters<typeof originalClerk.auth>) {
  const stack = new Error().stack?.split("\n").slice(2, 7).join("\n") || "No stack";
  logger.debug("🔥 auth() called from:\n", stack);
  return originalClerk.auth(...args);
}

import { clerkClient } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";

/**
 * Cache for user names to reduce Clerk API calls
 */
const userNameCache = new Map<string, { name: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's display name from Clerk with caching
 * @param userId - Clerk user ID
 * @returns User's full name or "User" as fallback
 */
export async function getUserName(userId: string): Promise<string> {
  try {
    // Check cache first
    const cached = userNameCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return cached.name;
    }

    // Fetch from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const name =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName || user.username || "User";

    // Cache the result
    userNameCache.set(userId, {
      name,
      expires: Date.now() + CACHE_TTL,
    });

    return name;
  } catch (error) {
    logger.error("Failed to fetch user name from Clerk:", error);
    return "User";
  }
}

/**
 * Clear the user name cache (useful for testing or when user updates profile)
 */
export function clearUserNameCache(userId?: string) {
  if (userId) {
    userNameCache.delete(userId);
  } else {
    userNameCache.clear();
  }
}

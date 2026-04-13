import { Redis } from "@upstash/redis";

// IMPORTANT:
// This module provides SAFE accessors for Upstash Redis.
// Never throw at module evaluation time – missing env MUST degrade gracefully.
// Always guard usage sites against a null client.
// Pattern:
//   const redis = createRedisClientSafely();
//   if (!redis) { /* handle absence (fail-open / warn) */ }

let client: Redis | null | undefined = undefined; // undefined = uninitialized sentinel

/**
 * Check if the Upstash URL is a valid, real endpoint (not a placeholder).
 * Returns false for placeholder URLs like "example.upstash.io" that would cause
 * DNS lookup failures and hang the server.
 */
function isValidUpstashUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Reject placeholder URLs
  if (url.includes("example.upstash.io")) return false;
  if (url.includes("placeholder")) return false;
  if (url.includes("xxx")) return false;
  // Must be a proper Upstash URL
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".upstash.io") && parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function createRedisClientSafely(): Redis | null {
  if (client !== undefined) return client;
  // eslint-disable-next-line no-restricted-syntax
  const url = process.env.UPSTASH_REDIS_REST_URL;
  // eslint-disable-next-line no-restricted-syntax
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!isValidUpstashUrl(url) || !token) {
    client = null;
    return client;
  }
  client = new Redis({ url, token });
  return client;
}

// Backward-compatible alias used by existing imports
export function getUpstash(): Redis | null {
  return createRedisClientSafely();
}

export const upstash: Redis | null = createRedisClientSafely();

// Alias for evidenceUrlCache
export const getUpstashRedis = getUpstash;

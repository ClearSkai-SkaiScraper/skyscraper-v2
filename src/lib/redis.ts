// Unified Redis Safety Helpers (PHASE 22)
// This file replaces previous eager ioredis client logic with a fail-open, null-safe contract.
// It coexists with Upstash helpers; both MUST remain optional.

import crypto from "crypto";
import Redis from "ioredis";
import { NextResponse } from "next/server";

// Enterprise Redis config (optional). If absent, enterprise client remains null.
// eslint-disable-next-line no-restricted-syntax
const host = process.env.REDIS_HOST;
// eslint-disable-next-line no-restricted-syntax
const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined;
// eslint-disable-next-line no-restricted-syntax
const username = process.env.REDIS_USERNAME || "default";
// eslint-disable-next-line no-restricted-syntax
const password = process.env.REDIS_PASSWORD;
// eslint-disable-next-line no-restricted-syntax
const useTls = process.env.REDIS_TLS === "true";

let enterpriseClient: Redis | null | undefined = undefined; // undefined = uninitialized sentinel

function createEnterpriseClientSafely(): Redis | null {
  if (enterpriseClient !== undefined) return enterpriseClient;
  if (!host || !port || !password) {
    enterpriseClient = null; // fail-open
    return enterpriseClient;
  }
  enterpriseClient = new Redis({
    host,
    port,
    username,
    password,
    tls: useTls ? {} : undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  enterpriseClient.on("error", (err) => {
    console.error("[REDIS] Connection error", { error: err.message });
  });
  return enterpriseClient;
}

// Backward compatibility: getRedis() now NEVER throws; may return a stub if missing.
export function getRedis(): Redis | null {
  return createEnterpriseClientSafely();
}

// Strict mode enforcement: returns JSON error response when Redis truly required.
export function requireRedisOrJson() {
  // Feature flag: if REDIS_STRICT_MODE !== '1', downgrade strict requirement (optional behavior)
  // eslint-disable-next-line no-restricted-syntax
  const strictEnabled = process.env.REDIS_STRICT_MODE === "1";
  const redis = getRedis();
  if (!strictEnabled) {
    // Strict mode off – treat absent redis as optional
    return { errorResponse: null, redis };
  }
  if (!redis) {
    return {
      errorResponse: NextResponse.json(
        { error: "Redis is required for this endpoint." },
        { status: 500 }
      ),
      redis: null as Redis | null,
    };
  }
  return { errorResponse: null, redis };
}

// maybeCache: generic caching wrapper (enterprise Redis). Upstash variant lives separately.
export async function maybeCache<T>(
  key: string,
  producer: () => Promise<T> | T,
  ttlSeconds = 300
): Promise<T> {
  const redis = getRedis();
  try {
    if (redis) {
      const cached = await redis.get(key);
      if (cached) {
        try {
          return JSON.parse(cached) as T;
        } catch {
          /* ignore parse errors */
        }
      }
      const value = await producer();
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return value;
    }
    return await producer();
  } catch {
    return await producer();
  }
}

// Simple soft rate limit (fallback allow when redis absent or error)
export async function maybeRateLimit(identifier: string, limit: number, windowSeconds: number) {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: limit, reset: Date.now() + windowSeconds * 1000 };
  try {
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `rate:${identifier}:${bucket}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: Date.now() + windowSeconds * 1000,
    };
  } catch {
    return { allowed: true, remaining: limit, reset: Date.now() + windowSeconds * 1000 };
  }
}

// safeFetchWithCache: caches GET responses (text/JSON) if Redis available.
export async function safeFetchWithCache(url: string, init: RequestInit = {}, ttlSeconds = 300) {
  const method = (init.method || "GET").toUpperCase();
  const shouldCache = method === "GET" && !init.body;
  if (!shouldCache) {
    const res = await fetch(url, init);
    return parseResponse(res);
  }
  const key = `fetch:${hash(url + JSON.stringify({ headers: init.headers || {}, method }))}`;
  return maybeCache(
    key,
    async () => {
      const res = await fetch(url, init);
      return parseResponse(res);
    },
    ttlSeconds
  );
}

function hash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function parseResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// Invalidation helper (no-op when absent)
export async function invalidateCache(key: string) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

// Legacy helpers retained (now safe):
export async function redisSet(key: string, value: string, ttlSeconds?: number) {
  const redis = getRedis();
  if (!redis) return false;
  if (ttlSeconds) return redis.set(key, value, "EX", ttlSeconds);
  return redis.set(key, value);
}

export async function redisGet(key: string) {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get(key);
}

export async function queuePush(queue: string, payload: string) {
  const redis = getRedis();
  if (!redis) return 0;
  return redis.lpush(`queue:${queue}`, payload);
}

export async function queuePop(queue: string) {
  const redis = getRedis();
  if (!redis) return null;
  return redis.rpop(`queue:${queue}`);
}

export async function ensureRedisConnected() {
  const redis = getRedis();
  if (!redis) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((redis as any).status === "wait") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (redis as any).connect();
    } catch {
      /* ignore */
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (redis as any).status === "ready";
}

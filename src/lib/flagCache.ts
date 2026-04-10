// eslint-disable-next-line no-restricted-syntax
const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
// eslint-disable-next-line no-restricted-syntax
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Basic structured logger (fallback to console)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function baseLog(evt: string, meta: Record<string, any>) {
  try {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({ ts: new Date().toISOString(), component: "flag-cache", evt, ...meta })
    );
  } catch {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upFetch(path: string, method: string = "GET", body?: any) {
  if (!UP_URL || !UP_TOKEN) return null;
  const url = `${UP_URL}/${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  return res && res.ok ? res.json().catch(() => null) : null;
}

export async function getFlagCache(key: string): Promise<string | null> {
  const result = await upFetch(`get/${encodeURIComponent(key)}`);
  if (!result || typeof result.result !== "string") return null;
  return result.result;
}

export async function setFlagCache(key: string, value: string, ttlSeconds: number = 60) {
  await upFetch(`set/${encodeURIComponent(key)}/${value}/EX/${ttlSeconds}`);
}

export async function delFlagCache(key: string) {
  await upFetch(`del/${encodeURIComponent(key)}`);
}

export function logCacheEvent(type: "hit" | "miss" | "set" | "invalidate", key: string) {
  baseLog("cache_" + type, { key });
}

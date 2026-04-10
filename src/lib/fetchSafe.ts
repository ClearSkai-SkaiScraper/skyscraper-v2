import { logger } from "@/lib/logger";

// fetchSafe.ts
// Resilient fetch wrapper with build-time guards & retry logic to suppress ECONNRESET noise.
// Import and use in external service integrations to avoid failing static builds.

function isBuildTime(): boolean {
  // eslint-disable-next-line no-restricted-syntax
  return Boolean(process.env.NEXT_PHASE) || (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL);
}

export interface FetchSafeOptions extends RequestInit {
  retries?: number;
  retryDelayMs?: number;
  swallowBuildErrors?: boolean;
  label?: string;
}

export async function fetchSafe(url: string, init: FetchSafeOptions = {}): Promise<Response | null> {
  const {
    retries = 2,
    retryDelayMs = 150,
    swallowBuildErrors = true,
    label = 'fetchSafe',
    ...rest
  } = init;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store', ...rest });
      return res;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const code = err?.code || '';
      const isConnReset = code === 'ECONNRESET' || /ECONNRESET/.test(String(err));
      const final = attempt === retries;
      const msg = isConnReset ? 'ECONNRESET' : (err?.message || 'Unknown error');
      logger.warn(`[${label}] attempt ${attempt + 1}/${retries + 1} ${msg} ${url}`);
      if (final) {
        if (isBuildTime() && swallowBuildErrors) {
          logger.warn(`[${label}] swallowing error during build for ${url}`);
          return null;
        }
        throw err;
      }
      await new Promise(r => setTimeout(r, retryDelayMs));
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchSafeJson<T = any>(url: string, init?: FetchSafeOptions): Promise<T | null> {
  const res = await fetchSafe(url, init);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

export async function fetchSafeText(url: string, init?: FetchSafeOptions): Promise<string | null> {
  const res = await fetchSafe(url, init);
  if (!res) return null;
  try { return await res.text(); } catch { return null; }
}

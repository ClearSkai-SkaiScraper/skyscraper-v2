import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function guardedFetch(url: string, options: any = {}, label = "external") {
  if (!url) {
    logger.warn(`⚠ guardedFetch called with empty URL [${label}]`);
    return null;
  }

  try {
    const res = await fetch(url, { ...options, cache: "no-store" });

    if (!res.ok) {
      logger.warn(`⚠ ${label} → HTTP ${res.status}`);
      return null;
    }

    return res;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.warn(`❌ ${label} fetch failed:`, err?.message || err);
    return null;
  }
}

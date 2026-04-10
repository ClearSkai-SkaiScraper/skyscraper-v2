// Lightweight fetch retry utility for transient network errors like ECONNRESET
// Usage: replace direct fetch calls where external network flakiness was observed.

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number; // initial backoff
  maxDelayMs?: number;
  jitter?: boolean;
  retryOnStatus?: number[]; // e.g. [429, 500, 502, 503, 504]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTransient = (error: any) => {
  if (!error) return false;
  const msg = String(error.message || error);
  return /ECONNRESET|ETIMEDOUT|EPIPE|EAI_AGAIN|socket hang up/i.test(msg);
};

export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, opts: RetryOptions = {}) {
  const {
    retries = 3,
    baseDelayMs = 250,
    maxDelayMs = 4000,
    jitter = true,
    retryOnStatus = [429, 500, 502, 503, 504]
  } = opts;

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(input, init);
      if (!res.ok && retryOnStatus.includes(res.status) && attempt < retries) {
        await delay(calcDelay(attempt, baseDelayMs, maxDelayMs, jitter));
        attempt++;
        continue;
      }
      return res;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (attempt >= retries || !isTransient(err)) throw err;
      await delay(calcDelay(attempt, baseDelayMs, maxDelayMs, jitter));
      attempt++;
    }
  }
}

function calcDelay(attempt: number, base: number, max: number, jitter: boolean): number {
  const exp = base * Math.pow(2, attempt);
  const capped = Math.min(exp, max);
  return jitter ? Math.round(capped * (0.5 + Math.random() * 0.5)) : capped;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/**
 * ============================================================================
 * CLIENT-SIDE RETRY QUEUE (Dead Letter Queue for Failed Saves)
 * ============================================================================
 *
 * When a PATCH/POST request fails (network blip, server error), this module
 * stores the request in localStorage and replays it on next page load.
 *
 * Prevents silent data loss from transient failures.
 *
 * Usage:
 *   import { retryQueue } from "@/lib/client/retryQueue";
 *
 *   // On fetch failure:
 *   retryQueue.enqueue({ url, method, body });
 *
 *   // On app mount (layout):
 *   const recovered = await retryQueue.replayAll();
 *
 * ============================================================================
 */

const STORAGE_KEY = "skai_retry_queue";
const MAX_QUEUE_SIZE = 50;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;

// ── Types ────────────────────────────────────────────────────────────────────

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: string;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export interface ReplayResult {
  total: number;
  succeeded: number;
  failed: number;
  expired: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedRequest[];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedRequest[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const retryQueue = {
  /**
   * Add a failed request to the retry queue.
   */
  enqueue(request: { url: string; method: string; body: string }): void {
    const queue = getQueue();

    // Evict expired entries
    const now = Date.now();
    const filtered = queue.filter((q) => now - q.timestamp < MAX_AGE_MS);

    // FIFO eviction if at capacity
    while (filtered.length >= MAX_QUEUE_SIZE) {
      filtered.shift();
    }

    filtered.push({
      id: generateId(),
      url: request.url,
      method: request.method,
      body: request.body,
      timestamp: now,
      retries: 0,
    });

    saveQueue(filtered);
  },

  /**
   * Replay all queued requests with exponential backoff.
   * Returns summary of results.
   */
  async replayAll(): Promise<ReplayResult> {
    const queue = getQueue();
    if (queue.length === 0) return { total: 0, succeeded: 0, failed: 0, expired: 0 };

    const now = Date.now();
    const result: ReplayResult = { total: queue.length, succeeded: 0, failed: 0, expired: 0 };
    const remaining: QueuedRequest[] = [];

    for (const item of queue) {
      // Skip expired
      if (now - item.timestamp > MAX_AGE_MS) {
        result.expired++;
        continue;
      }

      // Skip if max retries exceeded
      if (item.retries >= MAX_RETRIES) {
        result.failed++;
        continue;
      }

      try {
        // Exponential backoff delay: 1s, 2s, 4s
        if (item.retries > 0) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, item.retries - 1)));
        }

        const res = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: item.body,
        });

        if (res.ok) {
          result.succeeded++;
          // Don't add to remaining — it succeeded
        } else {
          // Server error — keep in queue for next attempt
          item.retries++;
          item.lastError = `HTTP ${res.status}`;
          remaining.push(item);
          result.failed++;
        }
      } catch (error) {
        // Network error — keep in queue
        item.retries++;
        item.lastError = error instanceof Error ? error.message : "Network error";
        remaining.push(item);
        result.failed++;
      }
    }

    saveQueue(remaining);
    return result;
  },

  /**
   * Get the number of queued items (for UI badges/indicators).
   */
  size(): number {
    return getQueue().length;
  },

  /**
   * Clear all queued items.
   */
  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },
};

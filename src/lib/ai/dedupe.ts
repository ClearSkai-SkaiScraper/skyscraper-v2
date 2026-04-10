/**
 * PHASE 34: AI REQUEST DEDUPLICATION LAYER
 * 
 * Prevents duplicate AI calls from:
 * - Double-clicks
 * - Rapid form submissions
 * - Race conditions
 * - Concurrent API requests
 * 
 * Global in-memory map tracks running requests.
 * Multiple calls with same key share the same Promise.
 */

import { logger } from "@/lib/logger";

import { buildAIKey } from './cache';

// Global map of running AI requests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runningRequests = new Map<string, Promise<any>>();

/**
 * Execute AI function with deduplication
 * 
 * If same request is already running, returns that promise.
 * Otherwise starts new request and tracks it.
 * 
 * Usage:
 *   const result = await withDedupe(
 *     'skai',
 *     { leadId: '123' },
 *     () => callSkaiAI()
 *   );
 */
export async function withDedupe<T>(
  routeName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputObj: any,
  fn: () => Promise<T>
): Promise<T> {
  const key = buildAIKey(routeName, inputObj);
  
  // Check if request is already running
  const existingRequest = runningRequests.get(key);
  if (existingRequest) {
    logger.debug(`[AI Dedupe] Joining existing request: ${routeName}`);
    return existingRequest as Promise<T>;
  }
  
  // Start new request
  logger.debug(`[AI Dedupe] Starting new request: ${routeName}`);
  const promise = fn()
    .finally(() => {
      // Clean up after completion (success or error)
      runningRequests.delete(key);
    });
  
  // Track running request
  runningRequests.set(key, promise);
  
  return promise;
}

/**
 * Check if request is currently running
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequestRunning(routeName: string, inputObj: any): boolean {
  const key = buildAIKey(routeName, inputObj);
  return runningRequests.has(key);
}

/**
 * Cancel/remove a running request
 * (Note: Doesn't actually cancel the Promise, just removes tracking)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cancelRequest(routeName: string, inputObj: any): void {
  const key = buildAIKey(routeName, inputObj);
  runningRequests.delete(key);
}

/**
 * Get count of currently running requests
 */
export function getRunningRequestCount(): number {
  return runningRequests.size;
}

/**
 * Clear all running requests
 * (Useful for cleanup/testing)
 */
export function clearAllRequests(): void {
  runningRequests.clear();
}

/**
 * Get all running request keys
 * (For debugging)
 */
export function getRunningRequestKeys(): string[] {
  return Array.from(runningRequests.keys());
}

/**
 * Conditional dedupe (respects org settings)
 */
export async function withConditionalDedupe<T>(
  routeName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputObj: any,
  fn: () => Promise<T>,
  options: {
    orgId: string;
    dedupeEnabled?: boolean;
  }
): Promise<T> {
  // If dedupe disabled, just execute
  if (options.dedupeEnabled === false) {
    return fn();
  }
  
  return withDedupe(routeName, inputObj, fn);
}

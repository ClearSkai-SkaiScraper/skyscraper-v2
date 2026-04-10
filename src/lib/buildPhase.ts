import { logger } from "@/lib/logger";

// lib/buildPhase.ts
// Guard heavy DB operations during Next.js build / CI phases.

export function isBuildPhase(): boolean {
  // eslint-disable-next-line no-restricted-syntax
  const phase = process.env.NEXT_PHASE;
  if (phase && phase.includes('build')) return true;
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.BUILD_PHASE === '1') return true;
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.CI && process.env.NODE_ENV === 'production') return true;
  return false;
}

export async function guarded<T>(label: string, fn: () => Promise<T>, fallback: T | (() => T)): Promise<T> {
  if (isBuildPhase()) {
    logger.debug(`[build-guard] Skipping heavy async operation: ${label}`);
    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  }
  return fn();
}

export function guardedSync<T>(label: string, fn: () => T, fallback: T | (() => T)): T {
  if (isBuildPhase()) {
    logger.debug(`[build-guard] Skipping heavy sync operation: ${label}`);
    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  }
  return fn();
}

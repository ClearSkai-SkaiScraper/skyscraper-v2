/* eslint-disable no-console */
import { logger } from "@/lib/logger";

/**
 * Mapbox Debug Console Utility
 * Logs Mapbox configuration and environment status during development
 */

export function logMapboxDebugContext(context: string) {
  if (process.env.NODE_ENV !== "development") return;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_API_KEY ?? "";

  console.groupCollapsed(`[MapboxDebug] ${context}`);
  logger.debug("Has token:", Boolean(token));
  logger.debug("Token prefix:", token ? token.slice(0, 8) + "..." : "NONE");
  logger.debug("Window MapboxGL:", typeof window !== "undefined" && (window as any).mapboxgl);
  logger.debug("Environment:", process.env.NODE_ENV);
  logger.debug("Timestamp:", new Date().toISOString());
  console.groupEnd();
}

/**
 * Get the Mapbox token with fallback support
 * Works on both client and server side
 */
export function getMapboxToken(): string | null {
  // Client-side: Check window.ENV or direct env access
  if (typeof window !== "undefined") {
    const token =
      (window as any).ENV?.NEXT_PUBLIC_MAPBOX_TOKEN ??
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
      process.env.MAPBOX_API_KEY ??
      null;
    if (!token) {
      console.warn(
        "[Mapbox] No token found on client. Set NEXT_PUBLIC_MAPBOX_TOKEN in your environment."
      );
    }
    return token;
  }

  // Server-side: Check process.env
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_API_KEY ?? null;
  if (!token) {
    console.warn(
      "[Mapbox] No token found on server. Set NEXT_PUBLIC_MAPBOX_TOKEN in your environment."
    );
  }
  return token;
}

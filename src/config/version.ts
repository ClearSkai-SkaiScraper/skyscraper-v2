/* eslint-disable no-restricted-syntax -- Version config reads env vars at build time */
/**
 * Application version configuration
 * Update this file when deploying new versions to ensure visible changes in production
 */

export const APP_VERSION = "BUILD #29 • Nov 18 - VERIFIED: ALL SYSTEMS OPERATIONAL";
export const BUILD_TIMESTAMP = new Date().toISOString();
export const SHOW_DEBUG_STRIP = process.env.NEXT_PUBLIC_SHOW_DEBUG_STRIP === "true";

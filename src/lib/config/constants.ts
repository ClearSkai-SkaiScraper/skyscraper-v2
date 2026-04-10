/**
 * CANONICAL DOMAIN CONFIGURATION
 *
 * DO NOT HARDCODE DOMAINS ANYWHERE ELSE IN THE CODEBASE
 *
 * This is the single source of truth for all domain references.
 * If you need to reference the app's URL, import PUBLIC_BASE_URL from here.
 */

export const DOMAIN_CONFIG = {
  // Canonical domain (NO "R" - it's skaiscrape not skaiscraper)
  canonical: "skaiscrape.com",
  protocol: "https",
  // eslint-disable-next-line no-restricted-syntax
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://www.skaiscrape.com",
} as const;

export const PUBLIC_BASE_URL = DOMAIN_CONFIG.baseUrl;

/**
 * Helper for constructing absolute URLs
 * @param path - Path to append to base URL (with or without leading slash)
 * @returns Absolute URL
 */
export function absoluteUrl(path: string): string {
  return `${PUBLIC_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Email configuration (no "r" typo)
 */
export const EMAIL_CONFIG = {
  // eslint-disable-next-line no-restricted-syntax
  default: process.env.RESEND_FROM_EMAIL || "claims@skaiscrape.com",
  support: "support@skaiscrape.com",
  noreply: "noreply@skaiscrape.com",
} as const;

/**
 * Service authentication (for internal services)
 */
export const SERVICE_CONFIG = {
  name: "skaiscrape-core", // No "r"
  // eslint-disable-next-line no-restricted-syntax
  tradesServiceUrl: process.env.TRADES_SERVICE_URL || "https://trades.skaiscrape.com",
} as const;

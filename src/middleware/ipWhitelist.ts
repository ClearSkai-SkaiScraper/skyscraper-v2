/**
 * IP Whitelisting
 *
 * Restricts access to admin routes based on IP address
 * Provides additional security layer for sensitive operations
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Whitelisted IP addresses (configure via environment)
 */
function getWhitelistedIPs(): string[] {
  // eslint-disable-next-line no-restricted-syntax
  const ipsEnv = process.env.WHITELISTED_IPS || "";

  if (!ipsEnv) {
    // In development, allow all IPs
    // eslint-disable-next-line no-restricted-syntax
    if (process.env.NODE_ENV === "development") {
      return [];
    }

    console.warn("⚠️ No WHITELISTED_IPS configured - IP whitelisting disabled");
    return [];
  }

  return ipsEnv.split(",").map((ip) => ip.trim());
}

/**
 * IP ranges (CIDR notation)
 */
function getWhitelistedRanges(): string[] {
  // eslint-disable-next-line no-restricted-syntax
  const rangesEnv = process.env.WHITELISTED_IP_RANGES || "";

  if (!rangesEnv) {
    return [];
  }

  return rangesEnv.split(",").map((range) => range.trim());
}

/**
 * Get client IP from request
 */
export function getClientIP(req: NextRequest): string {
  // Check X-Forwarded-For header (from proxy/load balancer)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Check X-Real-IP header
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to connection IP
  return "unknown";
}

/**
 * Check if IP is in whitelist
 */
export function isIPWhitelisted(ip: string): boolean {
  const whitelistedIPs = getWhitelistedIPs();
  const whitelistedRanges = getWhitelistedRanges();

  // If no whitelist configured, allow all (with warning)
  if (whitelistedIPs.length === 0 && whitelistedRanges.length === 0) {
    return true;
  }

  // Check exact match
  if (whitelistedIPs.includes(ip)) {
    return true;
  }

  // Check ranges
  for (const range of whitelistedRanges) {
    if (isIPInRange(ip, range)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if IP is in CIDR range
 */
function isIPInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IP to number for comparison
 */
function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Enforce IP whitelist
 */
export async function enforceIPWhitelist(req: NextRequest): Promise<void> {
  const clientIP = getClientIP(req);

  if (!isIPWhitelisted(clientIP)) {
    throw new Error(`Access denied: IP ${clientIP} not whitelisted`);
  }
}

/**
 * IP whitelist middleware
 */
export function withIPWhitelist() {
  return async (req: NextRequest) => {
    try {
      await enforceIPWhitelist(req);
      return null; // Allow request to proceed
    } catch {
      return new NextResponse(
        JSON.stringify({
          error: "Access denied",
          message: "Your IP address is not authorized to access this resource",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}

/**
 * Check if route requires IP whitelist
 */
export function requiresIPWhitelist(pathname: string): boolean {
  const protectedPaths = ["/api/admin", "/api/system", "/api/danger", "/admin", "/system"];

  return protectedPaths.some((path) => pathname.startsWith(path));
}

/**
 * Get IP whitelist status
 */
export function getIPWhitelistStatus(): {
  enabled: boolean;
  ips: number;
  ranges: number;
} {
  const ips = getWhitelistedIPs();
  const ranges = getWhitelistedRanges();

  return {
    enabled: ips.length > 0 || ranges.length > 0,
    ips: ips.length,
    ranges: ranges.length,
  };
}

/**
 * Add IP to whitelist (runtime - not persistent)
 */
export function addIPToWhitelist(ip: string): void {
  const currentIPs = getWhitelistedIPs();
  if (!currentIPs.includes(ip)) {
    // eslint-disable-next-line no-restricted-syntax
    process.env.WHITELISTED_IPS = [...currentIPs, ip].join(",");
  }
}

/**
 * Remove IP from whitelist (runtime - not persistent)
 */
export function removeIPFromWhitelist(ip: string): void {
  const currentIPs = getWhitelistedIPs();
  // eslint-disable-next-line no-restricted-syntax
  process.env.WHITELISTED_IPS = currentIPs.filter((i) => i !== ip).join(",");
}

/**
 * Log IP access attempt
 */
export function logIPAccess(ip: string, allowed: boolean, path: string): void {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ip,
      allowed,
      path,
      event: "IP_ACCESS_ATTEMPT",
    })
  );
}

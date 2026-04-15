/**
 * 🔀 IDENTITY-BASED ROUTING MIDDLEWARE
 *
 * Server-side middleware functions for routing users based on their identity type.
 * Used by the main middleware.ts and API routes.
 */

import { type NextRequest, NextResponse } from "next/server";

/**
 * Routes that should redirect based on user type
 */
export const DASHBOARD_ROUTES = {
  // Pro (contractor) dashboard routes
  pro: ["/dashboard", "/claims", "/pipeline", "/proposals", "/analytics", "/vendors", "/settings"],

  // Client (homeowner) portal routes — all portal sub-routes
  client: [
    "/portal",
    "/portal/claims",
    "/portal/contractors",
    "/portal/feed",
    "/portal/find-a-pro",
    "/portal/invite",
    "/portal/jobs",
    "/portal/messages",
    "/portal/my-pros",
    "/portal/network",
    "/portal/notifications",
    "/portal/onboarding",
    "/portal/products",
    "/portal/profile",
    "/portal/profiles",
    "/portal/projects",
    "/portal/request",
    "/portal/settings",
    "/portal/work-request",
  ],

  // Shared routes (accessible by both)
  shared: ["/profile", "/account", "/support", "/legal"],
};

/**
 * Get the appropriate dashboard URL for a user type
 */
export function getDashboardUrl(userType: "pro" | "client" | "unknown"): string {
  switch (userType) {
    case "pro":
      return "/dashboard";
    case "client":
      return "/portal";
    default:
      return "/onboarding/select-type";
  }
}

/**
 * Check if a path is a Pro-only route
 */
export function isProRoute(pathname: string): boolean {
  return DASHBOARD_ROUTES.pro.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a path is a Client-only route
 */
export function isClientRoute(pathname: string): boolean {
  return DASHBOARD_ROUTES.client.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a path is shared (accessible by both types)
 */
export function isSharedRoute(pathname: string): boolean {
  return DASHBOARD_ROUTES.shared.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Create a redirect response with identity-based routing
 */
export function createIdentityRedirect(
  req: NextRequest,
  userType: "pro" | "client" | "unknown",
  targetUrl?: string
): NextResponse {
  const pathname = req.nextUrl.pathname;

  // If target URL provided, use it
  if (targetUrl) {
    const url = new URL(targetUrl, req.url);
    return NextResponse.redirect(url);
  }

  // Unknown user type -> onboarding
  if (userType === "unknown") {
    const url = new URL("/onboarding/select-type", req.url);
    url.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(url);
  }

  // Pro trying to access client routes -> redirect to pro dashboard
  if (userType === "pro" && isClientRoute(pathname)) {
    // eslint-disable-next-line no-console
    console.info(`[IDENTITY_ROUTING] Pro user accessing client route, redirecting to /dashboard`, {
      pathname,
    });
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Client trying to access pro routes -> redirect to client portal
  if (userType === "client" && isProRoute(pathname)) {
    // eslint-disable-next-line no-console
    console.info(`[IDENTITY_ROUTING] Client user accessing pro route, redirecting to /portal`, {
      pathname,
    });
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // Default: continue with request
  return NextResponse.next();
}

/**
 * Headers to pass user type info downstream
 */
export function setIdentityHeaders(
  res: NextResponse,
  userType: "pro" | "client" | "unknown"
): NextResponse {
  res.headers.set("x-user-type", userType);
  res.headers.set("x-is-pro", userType === "pro" ? "1" : "0");
  res.headers.set("x-is-client", userType === "client" ? "1" : "0");
  return res;
}

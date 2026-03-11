import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * ===============================================================================
 * IDENTITY-BASED ROUTING (MIDDLEWARE LAYER)
 * ===============================================================================
 *
 * This is the SINGLE AUTHORITY for routing decisions:
 * - Who is this user?
 * - What surface do they belong to?
 *
 * NO layout should redirect across surfaces. Ever.
 * Middleware handles ALL cross-surface routing.
 *
 * Flow:
 * 1. Clerk auth
 * 2. Check x-user-type cookie (set by /api/auth/identity on login)
 * 3. Route to correct surface
 */

const PRO_ROUTES = [
  "/dashboard",
  "/claims",
  "/claims-ready-folder",
  "/pipeline",
  "/proposals",
  "/analytics",
  "/vendors",
  "/vendor-network",
  "/report-builder",
  "/trades",
  "/jobs",
  "/leads",
  "/appointments",
  "/messages",
  "/reports",
  "/settings",
  "/contacts",
  "/teams",
  "/maps",
  "/weather",
  "/ai",
  "/smart-docs",
  "/quick-dol",
  "/property-profiles",
  "/vision-lab",
  "/invitations",
  "/archive",
  "/feedback",
  "/depreciation",
  "/storm-center",
  "/supplements",
  "/crews",
  "/permits",
  "/materials",
  "/finance",
  "/invoices",
  "/commissions",
  "/mortgage-checks",
  "/sms",
  "/notifications",
  "/compliance",
  "/inspections",
  "/governance",
  "/mobile",
  "/carrier",
  "/estimates",
  "/tasks",
  "/annotation", // AI Damage Annotation tool
];

const CLIENT_ROUTES = ["/portal"];

const isPublicRoute = createRouteMatcher([
  "/",
  "/landing(.*)",
  "/marketing(.*)",
  "/pricing(.*)",
  "/contact(.*)",
  "/about(.*)",
  "/features(.*)",
  "/story(.*)",
  "/security(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/status(.*)",
  "/coming-soon(.*)",
  "/skaistack(.*)",
  "/investor(.*)",
  "/network(.*)",
  "/contractors(.*)", // Public contractor profiles (redirects to appropriate view)
  // "/claims" is NOT public - it requires auth for the workspace!
  // Use /claims-legacy for the public demo page instead
  "/claims-legacy", // Public demo claims page (read-only)
  "/claims/test(.*)", // Allow demo overview path for public read-only tabs
  "/api/public(.*)",
  "/api/diag/ready",
  "/api/deploy-info",
  // "/api/debug(.*)", // DISABLED — debug routes moved to _disabled
  "/api/claims/test/workspace", // Public demo workspace data (read-only)
  "/api/claims/test/ai", // Public demo AI assistant endpoint (safe)
  "/api/org/active", // Allow org context endpoint to return 401 JSON (no redirect)
  "/api/system/health", // Primary health endpoint only — no wildcards
  "/api/diag/ready", // Readiness probe only
  "/api/diag/live", // Liveness probe only
  "/api/diag/db", // DB latency probe
  "/api/health(.*)", // Health checks for uptime monitors
  "/api/trades/profile/(.*)/public", // Public trades profile API (no auth required)
  "/api/trades/companies/(.*)/public", // Public company API (no auth required)
  "/trades/profile/(.*)", // Public trades profile pages (no auth required)
  "/trades/profiles/(.*)/public", // Public trades profile pages (plural route, share links)
  "/trades/companies/(.*)/public", // Public company pages (shareable links)
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Onboarding routes for new users
  "/onboarding(.*)",
  // Client portal authentication (clients, not org members)
  "/client/sign-in(.*)",
  "/client/sign-up(.*)",
  // Portal pages are PROTECTED — layout.tsx handles auth gracefully
  // and individual pages call currentUser() which requires auth() context.
  // Marking portal as public was starving currentUser() of session data.
  "/api/templates/marketplace(.*)", // Public marketplace browsing only
  "/api/templates/health", // Template health check
  "/api/auth/identity", // Identity lookup API
  "/api/auth/register-client", // Client registration API
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/_next(.*)",
  "/images(.*)",
  "/fonts(.*)",
  "/static(.*)",
  "/assets(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // CRITICAL: ALWAYS call auth() FIRST to inject authentication context
  // Without this call, currentUser() will return null even for logged-in users
  // This is the #1 cause of "Sign In Required" showing for authenticated users
  const { userId } = auth();

  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search || "";
  // HARDENED: Beta bypass only available in non-production environments
  const betaMode =
    process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_BETA_MODE !== "false";
  const isApiRoute = pathname.startsWith("/api");

  // Debug: Log auth state (remove in production after fix is verified)
  if (process.env.NODE_ENV !== "production") {
    console.log(`[MIDDLEWARE] ${pathname} | userId: ${userId || "null"} | beta: ${betaMode}`);
  }

  // ALWAYS set pathname header - needed by layout to detect onboarding page
  res.headers.set("x-pathname", pathname);
  if (process.env.NODE_ENV !== "production") {
    res.headers.set("x-middleware-hit", "1");
  }

  // =========================================================================
  // STALE COOKIE CLEANUP
  // When a user signs out, the x-user-type cookie persists (7-day TTL).
  // If a DIFFERENT user signs in next, the stale cookie routes them to the
  // wrong surface. Clear it whenever there's no authenticated user.
  // =========================================================================
  if (!userId) {
    const staleCookie = req.cookies.get("x-user-type")?.value;
    if (staleCookie) {
      res.cookies.set("x-user-type", "", { path: "/", maxAge: 0 });
      if (process.env.NODE_ENV !== "production") {
        console.log(`[MIDDLEWARE] Cleared stale x-user-type cookie (was: ${staleCookie})`);
      }
    }
  }

  // =========================================================================
  // IDENTITY-BASED CROSS-SURFACE ROUTING
  // This is THE authority for routing - no layout should redirect across surfaces
  // =========================================================================
  const isProRoute = PRO_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isClientRoute = CLIENT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Get user type — COOKIE takes priority over Clerk sessionClaims.
  // Why: The after-sign-in page is the AUTHORITATIVE source for user type.
  // It sets the cookie immediately, but Clerk publicMetadata in sessionClaims
  // is cached for the session lifetime and does NOT update mid-session.
  // Using sessionClaims first caused stale routing when switching between
  // pro and client accounts in the same browser.
  const cookieUserType = req.cookies.get("x-user-type")?.value;
  const sessionClaims = auth().sessionClaims as { publicMetadata?: { userType?: string } } | null;
  const clerkUserType = sessionClaims?.publicMetadata?.userType;
  const userType = cookieUserType || clerkUserType;

  // CROSS-SURFACE REDIRECT LOGIC (Only for authenticated users with known type)
  // Skip for /after-sign-in — that page MUST run to set the correct user type
  if (userId && userType && !pathname.startsWith("/after-sign-in")) {
    // Client trying to access Pro routes → redirect to /portal
    if (userType === "client" && isProRoute) {
      console.log(`[MIDDLEWARE] Client user on Pro route, redirecting to /portal`);
      return NextResponse.redirect(new URL("/portal", req.url));
    }

    // Pro trying to access Client routes → redirect to /dashboard
    if (userType === "pro" && isClientRoute) {
      console.log(`[MIDDLEWARE] Pro user on Client route, redirecting to /dashboard`);
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (isProRoute) {
    res.headers.set("x-route-type", "pro");
  } else if (isClientRoute) {
    res.headers.set("x-route-type", "client");
  } else {
    res.headers.set("x-route-type", "shared");
  }

  // Allow static assets fast-path
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/assets")
  ) {
    res.headers.set("x-auth-mode", "public");
    return res;
  }

  // Dev-only: Beta mode allows Clerk to inject auth but doesn't block unauthenticated users
  // In production, betaMode is always false (hardened above)
  if (betaMode) {
    res.headers.set("x-auth-mode", "beta-passthrough");
  }

  // Redirect authenticated users from landing page to dashboard
  if (pathname === "/" && userId) {
    const dest = userType === "client" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // ─── Onboarding redirect ──────────────────────────────────────
  // If a pro user hits a dashboard route but hasn't completed onboarding,
  // redirect them to the wizard. We check the "x-onboarding-complete" cookie
  // (set by the wizard completion step) to avoid a DB call in middleware.
  // The wizard itself is always accessible (it's in the PRO_ROUTES list).
  if (
    userId &&
    isProRoute &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/settings")
  ) {
    const onboardingDone = req.cookies.get("x-onboarding-complete")?.value;
    if (onboardingDone === "0") {
      return NextResponse.redirect(new URL("/onboarding/wizard", req.url));
    }
  }

  if (isPublicRoute(req)) {
    res.headers.set("x-auth-mode", "public");
    return res;
  }

  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set("redirect_url", `${pathname}${search}`);

  // APIs should return JSON 401 instead of HTML redirects
  if (isApiRoute) {
    if (!userId) {
      res.headers.set("x-auth-mode", "protected-json-401");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    res.headers.set("x-auth-mode", "protected-api");
    return res;
  }

  // App routes: enforce authentication
  // Portal routes use client-specific sign-in URL
  const isPortalRoute = pathname.startsWith("/portal");
  const authRedirectUrl = isPortalRoute
    ? new URL(`/client/sign-in?redirect_url=${encodeURIComponent(pathname + search)}`, req.url)
    : signInUrl;

  // CRITICAL: Pass redirect_url in BOTH unauthenticated and unauthorized URLs
  // so invite tokens (/trades/join?token=xxx) survive the auth flow
  auth().protect({
    unauthenticatedUrl: authRedirectUrl.toString(),
    unauthorizedUrl: authRedirectUrl.toString(),
  });

  res.headers.set("x-auth-mode", "protected");
  return res;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/(api|trpc)(.*)"],
};

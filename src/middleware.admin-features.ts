// ============================================================================
// ADMIN MIDDLEWARE — Feature Flag Protection
// ============================================================================
// Gates /report-builder and /projects routes behind admin role check
// ============================================================================

import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Feature flags (can be moved to env vars or database)
const FEATURE_FLAGS = {
  // eslint-disable-next-line no-restricted-syntax
  REPORT_BUILDER_ENABLED: process.env.NEXT_PUBLIC_REPORT_BUILDER_ENABLED === "true",
  ADMIN_ONLY_ROUTES: ["/report-builder-demo", "/projects"],
};

export default authMiddleware({
  publicRoutes: [
    "/",
    "/api/health(.*)",
    "/claims/generate", // Public access to claims generator
  ],

  afterAuth(auth, req) {
    const { userId, sessionClaims } = auth;
    const pathname = req.nextUrl.pathname;

    // Check if route requires admin access
    const isAdminRoute = FEATURE_FLAGS.ADMIN_ONLY_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isAdminRoute) {
      // Require authentication
      if (!userId) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", pathname);
        return NextResponse.redirect(signInUrl);
      }

      // Check admin role
      const metadata = sessionClaims?.metadata as { role?: string } | undefined;
      const userRole = metadata?.role;
      if (userRole !== "admin") {
        return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
      }

      // Check feature flag
      if (pathname.startsWith("/report-builder") && !FEATURE_FLAGS.REPORT_BUILDER_ENABLED) {
        return NextResponse.json({ error: "Feature not enabled" }, { status: 404 });
      }
    }

    // Allow request
    return NextResponse.next();
  },
});

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

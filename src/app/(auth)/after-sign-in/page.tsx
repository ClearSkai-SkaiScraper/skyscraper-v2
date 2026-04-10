import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";

/**
 * After-sign-in routing — HARDENED v3
 *
 * Layer order: Clerk-first (no DB dependency for auth routing)
 *   L1: Clerk publicMetadata from currentUser()
 *   L2: Direct Clerk REST API fetch (bypasses SDK caching)
 *   L3: Clerk org membership (any org = pro)
 *   L4: Direct SQL with schema-qualified table name
 *   L5: Prisma ORM (last resort — known broken with PgBouncer)
 *
 * CRITICAL: Auth routing must work even when the database is down.
 */

async function setUserTypeCookie(type: "pro" | "client") {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const cookieStore = await cookies();
    cookieStore.set("x-user-type", type, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch (e) {
    logger.warn("[AFTER-SIGN-IN] Cookie set error", { error: e });
  }
}

/**
 * Sync Clerk publicMetadata with the resolved user type.
 * This is CRITICAL because the middleware reads sessionClaims.publicMetadata.userType
 * BEFORE the cookie fallback. If publicMetadata is empty or wrong, the middleware
 * will use the stale cookie and route the user to the wrong surface.
 */
async function syncClerkMetadata(clerkUserId: string, userType: "pro" | "client") {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { userType },
    });
    logger.info("[AFTER-SIGN-IN] Synced Clerk publicMetadata", { userType });
  } catch (e) {
    logger.warn("[AFTER-SIGN-IN] Failed to sync Clerk metadata", { error: e });
    // Non-fatal — cookie fallback will still work
  }
}

/** Direct Clerk REST API — bypasses SDK entirely */
async function getClerkUserTypeDirect(clerkUserId: string): Promise<"pro" | "client" | null> {
  try {
    const sk = process.env.CLERK_SECRET_KEY;
    if (!sk) return null;
    const r = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${sk}` },
      cache: "no-store",
    });
    if (!r.ok) {
      logger.warn("[AFTER-SIGN-IN] Clerk API HTTP", { status: r.status });
      return null;
    }
    const d = await r.json();
    const ut = d?.public_metadata?.userType;
    if (ut === "pro" || ut === "client") return ut;
    return null;
  } catch (e) {
    logger.warn("[AFTER-SIGN-IN] Clerk API fetch error", { error: e });
    return null;
  }
}

/** Schema-qualified direct SQL — bypasses Prisma ORM */
async function getUserTypeDirectSQL(clerkUserId: string): Promise<"pro" | "client" | null> {
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const { Prisma } = await import("@prisma/client");
    const result = await prisma.$queryRaw<{ userType: string }[]>(
      Prisma.sql`SELECT "userType" FROM app.user_registry WHERE "clerkUserId" = ${clerkUserId} LIMIT 1`
    );
    if (result?.[0]?.userType === "pro" || result?.[0]?.userType === "client") {
      return result[0].userType as "pro" | "client";
    }
    return null;
  } catch (e) {
    logger.warn("[AFTER-SIGN-IN] Direct SQL fallback failed", { error: e });
    return null;
  }
}

export default async function AfterSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; redirect_url?: string; __clerk_status?: string }>;
}) {
  const params = await searchParams;
  // CRITICAL: Detect mode from multiple sources
  // 1. Explicit mode param (most reliable)
  // 2. redirect_url containing /portal or /client (signals client portal origin)
  // 3. __clerk_status=sign_up combined with no org membership = likely new client
  let mode = params?.mode;
  const pendingRedirect = params?.redirect_url;

  // If no explicit mode but redirect_url points to client portal, infer client mode
  if (!mode && pendingRedirect) {
    if (pendingRedirect.startsWith("/portal") || pendingRedirect.startsWith("/client")) {
      mode = "client";
      logger.info("[AFTER-SIGN-IN] Inferred client mode from redirect_url", { pendingRedirect });
    }
  }

  let user;
  try {
    user = await currentUser();
  } catch (error) {
    logger.error("[AFTER-SIGN-IN] Error getting current user", { error });
    redirect("/sign-in");
  }

  if (!user?.id) {
    redirect("/sign-in");
  }

  logger.info("[AFTER-SIGN-IN] START", { userId: user.id, mode });

  let resolvedType: "pro" | "client" | null = null;

  // =========================================================================
  // CRITICAL FIX: If the sign-in page explicitly passed mode=client or mode=pro,
  // that is an AUTHORITATIVE signal from the surface the user signed in from.
  // It MUST override any stale Clerk publicMetadata or cookie from a previous session.
  //
  // Without this, a user who was ever resolved as "pro" will ALWAYS be routed
  // to /dashboard even when signing in via /client/sign-in, because L1 (Clerk
  // publicMetadata) fires before we ever look at the mode param.
  // =========================================================================
  if (mode === "client" || mode === "pro") {
    resolvedType = mode;
    logger.info("[AFTER-SIGN-IN] MODE OVERRIDE", { mode });
    // Sync cookie + Clerk metadata + DB registry so ALL layers agree
    await setUserTypeCookie(resolvedType);
    await syncClerkMetadata(user.id, resolvedType);
    // Also update user_registry so L4/L5 resolution stays consistent
    try {
      const { default: prisma } = await import("@/lib/prisma");
      const { Prisma } = await import("@prisma/client");
      const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;
      const email = user.emailAddresses?.[0]?.emailAddress || null;
      const avatarUrl = user.imageUrl || null;
      await prisma.$executeRaw(
        Prisma.sql`INSERT INTO app.user_registry ("clerkUserId", "userType", "isActive", "onboardingComplete", "displayName", email, "avatarUrl", "createdAt", "updatedAt")
         VALUES (${user.id}, ${resolvedType}, true, false, ${displayName}, ${email}, ${avatarUrl}, NOW(), NOW())
         ON CONFLICT ("clerkUserId") DO UPDATE SET "userType" = ${resolvedType}, "updatedAt" = NOW()`
      );
    } catch (regError) {
      logger.error("[AFTER-SIGN-IN] DB registry update err:", regError);
    }
    if (pendingRedirect?.startsWith("/")) redirect(pendingRedirect);
    if (resolvedType === "client") redirect("/portal");
    redirect("/dashboard");
  }

  // -- L1: Clerk publicMetadata (fastest, no network call) --
  try {
    const mt = (user.publicMetadata as Record<string, unknown>)?.userType;
    logger.debug("[AFTER-SIGN-IN] L1 Clerk meta", { mt });
    if (mt === "pro" || mt === "client") resolvedType = mt;
  } catch (e) {
    logger.warn("[AFTER-SIGN-IN] L1 err", { error: e });
  }

  // -- L2: Direct Clerk REST API (bypasses SDK) --
  if (!resolvedType) {
    logger.debug("[AFTER-SIGN-IN] L1 miss -> L2 Clerk API");
    const t2 = await getClerkUserTypeDirect(user.id);
    logger.debug("[AFTER-SIGN-IN] L2", { t2 });
    if (t2) resolvedType = t2;
  }

  // -- L3: Clerk org membership --
  if (!resolvedType) {
    const oc = user.organizationMemberships?.length ?? 0;
    logger.debug("[AFTER-SIGN-IN] L3 orgs", { count: oc });
    if (oc > 0) resolvedType = "pro";
  }

  // -- L4: Direct SQL (schema-qualified) --
  if (!resolvedType) {
    logger.debug("[AFTER-SIGN-IN] L3 miss -> L4 SQL");
    const t4 = await getUserTypeDirectSQL(user.id);
    logger.debug("[AFTER-SIGN-IN] L4", { t4 });
    if (t4) resolvedType = t4;
  }

  // -- L5: Prisma ORM (last resort) --
  if (!resolvedType) {
    logger.debug("[AFTER-SIGN-IN] L4 miss -> L5 Prisma ORM");
    try {
      const { getUserIdentity } = await import("@/lib/identity");
      const id5 = await getUserIdentity(user.id);
      const t5 = id5?.userType;
      logger.debug("[AFTER-SIGN-IN] L5", { t5 });
      if (t5 === "pro" || t5 === "client") resolvedType = t5;
    } catch (e) {
      logger.warn("[AFTER-SIGN-IN] L5 err", { error: e });
    }
  }

  logger.info("[AFTER-SIGN-IN] RESOLVED", { resolvedType, userId: user.id });

  // -- Known user: route by type --
  if (resolvedType) {
    await setUserTypeCookie(resolvedType);
    syncClerkMetadata(user.id, resolvedType).catch(() => {});
    if (pendingRedirect?.startsWith("/")) redirect(pendingRedirect);
    if (resolvedType === "client") redirect("/portal");
    redirect("/dashboard");
  }

  // -- New user: determine from mode param --
  // IMPORTANT: If mode is explicitly "client", register as client.
  // CRITICAL FIX: If user has NO org memberships and no explicit mode,
  // they're likely a CLIENT signing up (pros always have orgs).
  // Defaulting to "client" for org-less users prevents clients from getting
  // stuck on the pro dashboard with "no organization" errors.
  const hasOrgMembership = (user.organizationMemberships?.length ?? 0) > 0;
  let newType: "pro" | "client";

  if (mode === "client") {
    newType = "client";
  } else if (mode === "pro") {
    newType = "pro";
  } else if (hasOrgMembership) {
    // User has org membership = definitely pro
    newType = "pro";
  } else {
    // No org, no explicit mode = likely a client (safer default for new users)
    newType = "client";
    logger.info("[AFTER-SIGN-IN] Defaulting org-less new user to client");
  }
  logger.info("[AFTER-SIGN-IN] NEW USER", { mode, hasOrgMembership, newType });

  try {
    const { default: prisma } = await import("@/lib/prisma");
    const { Prisma } = await import("@prisma/client");
    const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;
    const email = user.emailAddresses?.[0]?.emailAddress || null;
    const avatarUrl = user.imageUrl || null;
    await prisma.$executeRaw(
      Prisma.sql`INSERT INTO app.user_registry ("clerkUserId", "userType", "isActive", "onboardingComplete", "displayName", email, "avatarUrl", "createdAt", "updatedAt")
       VALUES (${user.id}, ${newType}, true, false, ${displayName}, ${email}, ${avatarUrl}, NOW(), NOW())
       ON CONFLICT ("clerkUserId") DO NOTHING`
    );
  } catch (regError) {
    logger.error("[AFTER-SIGN-IN] DB reg err", { error: regError });
  }

  await setUserTypeCookie(newType);
  await syncClerkMetadata(user.id, newType);
  if (pendingRedirect?.startsWith("/")) redirect(pendingRedirect);
  if (newType === "pro") redirect("/dashboard");
  redirect("/portal");
}

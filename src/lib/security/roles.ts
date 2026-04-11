/**
 * Require admin role (throws if not admin)
 */
export async function requireAdmin(): Promise<{ userId: string; orgId: string }> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }
  const role = await getUserRole();
  if (role !== "admin") {
    throw new Error("Access denied: Admins only");
  }
  return { userId, orgId };
}
// Phase 5 - Security & Role Guards

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

export type UserRole = "contractor" | "adjuster" | "admin";

// Platform admin emails - these users get full admin access + forever free
export const PLATFORM_ADMIN_EMAILS = [
  "buildwithdamienray@gmail.com", // Damien Ray - Platform Owner
  "buildingwithdamienray@gmail.com", // Alternate email
  "damien@skaiscrape.com", // Company email
  "damien.willingham@outlook.com", // QA Test Account — GPT agent testing
] as const;

// Check if an email is a platform admin
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.some((e) => e.toLowerCase() === email.toLowerCase());
}

/**
 * Get user role from Clerk metadata
 * Automatically grants admin role to platform owner emails
 */
export async function getUserRole(): Promise<UserRole> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { sessionClaims, userId } = await auth();

  // Check if user is platform admin by email (session claims first)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userEmail = (sessionClaims as any)?.email || (sessionClaims as any)?.primaryEmailAddress;
  if (isAdminEmail(userEmail)) {
    return "admin";
  }

  // Fallback: check full user email addresses from Clerk API
  if (userId) {
    try {
      // eslint-disable-next-line no-restricted-imports
      const { currentUser } = await import("@clerk/nextjs/server");
      const user = await currentUser();
      if (user?.emailAddresses?.some((e) => isAdminEmail(e.emailAddress))) {
        return "admin";
      }
    } catch {
      // Fall through to metadata check
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (sessionClaims?.metadata as any)?.role || "contractor";
  return role as UserRole;
}

/**
 * Check if current user is a platform admin (bypasses billing)
 * Uses multiple fallbacks because Clerk JWT claims don't include email by default.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { sessionClaims, userId } = await auth();

  // Fast path: check session claims (works if Clerk session token template includes email)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const claimEmail = (sessionClaims as any)?.email || (sessionClaims as any)?.primaryEmailAddress;
  if (isAdminEmail(claimEmail)) return true;

  // Fallback 1: fetch full user from Clerk API — checks ALL email addresses
  if (userId) {
    try {
      // eslint-disable-next-line no-restricted-imports
      const { currentUser } = await import("@clerk/nextjs/server");
      const user = await currentUser();
      if (user?.emailAddresses?.some((e) => isAdminEmail(e.emailAddress))) {
        return true;
      }
    } catch {
      // Not in a request context or Clerk API unavailable — fall through to DB
    }
  }

  // Fallback 2: DB lookup — resilient to Clerk API outages
  // The users table stores the email used at registration time.
  if (userId) {
    try {
      const prismaModule = await import("@/lib/prisma");
      const prisma = prismaModule.default;
      const dbUser = await prisma.users.findUnique({
        where: { clerkUserId: userId },
        select: { email: true },
      });
      if (dbUser?.email && isAdminEmail(dbUser.email)) return true;
    } catch {
      // DB unavailable — final fallback exhausted
    }
  }

  return false;
}

/**
 * Require specific role(s)
 * Throws error if user doesn't have required role
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<{ userId: string; orgId: string; role: UserRole }> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const role = await getUserRole();
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!allowed.includes(role)) {
    throw new Error(`Access denied. Required role: ${allowed.join(" or ")}`);
  }

  return { userId, orgId, role };
}

/**
 * Check if user owns the org
 * TODO: Implement actual org ownership check via Clerk/Prisma
 */
export async function requireOrgOwnership(orgId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { orgId: userOrgId } = await auth();
  if (userOrgId !== orgId) {
    throw new Error("Access denied: Not your organization");
  }
  return true;
}

/**
 * Check if user can edit (contractor or admin only)
 */
export async function canEdit(): Promise<boolean> {
  const role = await getUserRole();
  return role === "contractor" || role === "admin";
}

/**
 * Check if adjuster (read-only)
 */
export async function isAdjuster(): Promise<boolean> {
  const role = await getUserRole();
  return role === "adjuster";
}

/**
 * Check if admin (full access + impersonation)
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin";
}

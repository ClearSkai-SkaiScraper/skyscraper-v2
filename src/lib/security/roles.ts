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
  const { sessionClaims } = await auth();

  // Check if user is platform admin by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userEmail = (sessionClaims as any)?.email || sessionClaims?.primaryEmailAddress;
  if (isAdminEmail(userEmail)) {
    return "admin";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (sessionClaims?.metadata as any)?.role || "contractor";
  return role as UserRole;
}

/**
 * Check if current user is a platform admin (bypasses billing)
 */
export async function isPlatformAdmin(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { sessionClaims } = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userEmail = (sessionClaims as any)?.email || sessionClaims?.primaryEmailAddress;
  return isAdminEmail(userEmail);
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

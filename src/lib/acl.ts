// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

// Access Control List helpers — wired to Clerk + Prisma
export type Role = "admin" | "manager" | "member";
export type Plan = "solo" | "business" | "enterprise";

/**
 * Get the current user's role from Clerk org membership.
 * Falls back to "member" if unavailable (safe default — lowest access).
 */
export async function userRole(): Promise<Role> {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { orgRole } = await auth();
    if (!orgRole) return "member";

    // Clerk orgRole is like "org:admin", "org:member", etc.
    const role = orgRole.replace("org:", "").toLowerCase();
    if (role === "admin") return "admin";
    if (role === "manager") return "manager";
    return "member";
  } catch {
    return "member";
  }
}

/**
 * Get the current org's plan from Prisma.
 * Falls back to "solo" if unavailable (lowest paid tier).
 */
export async function userPlan(): Promise<Plan> {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { orgId } = await auth();
    if (!orgId) return "solo";

    const org = await prisma.org.findFirst({
      where: { clerkOrgId: orgId },
      select: { planKey: true, Plan: { select: { slug: true } } },
    });

    const slug = org?.Plan?.slug ?? org?.planKey ?? "solo";
    if (slug === "enterprise") return "enterprise";
    if (slug === "business") return "business";
    return "solo";
  } catch {
    return "solo";
  }
}

/**
 * Check if user is allowed based on roles and plans.
 * Both role and plan must pass (if specified).
 */
export async function allowed(roles?: Role[], plans?: Plan[]): Promise<boolean> {
  const [r, p] = await Promise.all([userRole(), userPlan()]);
  const roleOk = !roles?.length || roles.includes(r);
  const planOk = !plans?.length || plans.includes(p);
  return roleOk && planOk;
}

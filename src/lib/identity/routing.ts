/**
 * 🔀 DUAL DASHBOARD ROUTER
 *
 * Server component that routes users to the correct dashboard
 * based on their identity type:
 *
 * - PRO users → /dashboard (existing Pro dashboard)
 * - CLIENT users → /portal (new Client portal)
 * - Unknown users → /onboarding/select-type
 */

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { determineUserType, getUserIdentity } from "@/lib/identity";

export async function routeToDashboard(): Promise<never> {
  const user = await currentUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  // Check identity
  let identity = await getUserIdentity(user.id);

  // If no identity, try to determine from legacy tables
  if (!identity) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userType = await determineUserType(user.id);
    identity = await getUserIdentity(user.id);
  }

  // Route based on user type
  if (!identity || identity.userType === "unknown") {
    // New user - needs to select their type
    redirect("/onboarding/select-type");
  }

  if (identity.userType === "pro") {
    redirect("/dashboard");
  }

  if (identity.userType === "client") {
    redirect("/portal");
  }

  // Fallback
  redirect("/dashboard");
}

/**
 * Middleware helper to check if user should access pro routes
 */
export async function requireProAccess(): Promise<{ orgId: string; proProfileId: string }> {
  const user = await currentUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  const identity = await getUserIdentity(user.id);

  if (!identity || identity.userType !== "pro") {
    redirect("/portal?error=pro_required");
  }

  if (!identity.orgId || !identity.proProfileId) {
    redirect("/onboarding/pro-setup");
  }

  return {
    orgId: identity.orgId,
    proProfileId: identity.proProfileId,
  };
}

/**
 * Middleware helper to check if user should access client routes
 */
export async function requireClientAccess(): Promise<{ clientProfileId: string }> {
  const user = await currentUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  const identity = await getUserIdentity(user.id);

  if (!identity || identity.userType !== "client") {
    redirect("/dashboard?error=client_required");
  }

  if (!identity.clientProfileId) {
    redirect("/onboarding/client-setup");
  }

  return {
    clientProfileId: identity.clientProfileId,
  };
}

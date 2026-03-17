/**
 * 🔐 USER IDENTITY BRIDGE
 *
 * Master identity lookup for Client vs Pro routing at scale.
 * This is the "fuel pump" - single source of truth for user type.
 *
 * Usage:
 *   const identity = await getUserIdentity(clerkUserId);
 *   if (identity.userType === 'pro') { ... }
 *   if (identity.userType === 'client') { ... }
 */

import { currentUser } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ============================================================================
// TYPES
// ============================================================================

export type UserType = "client" | "pro" | "unknown";

export interface UserIdentity {
  clerkUserId: string;
  userType: UserType;
  isActive: boolean;

  // Profile IDs
  proProfileId: string | null;
  clientProfileId: string | null;

  // Org binding (for pro users)
  orgId: string | null;

  // Display info
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;

  // Onboarding status
  onboardingComplete: boolean;

  // Timestamps
  createdAt: Date | null;
  lastSeenAt: Date | null;
}

export interface ProContext {
  userType: "pro";
  clerkUserId: string;
  proProfileId: string;
  orgId: string;
  companyId: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  specialties: string[];
}

export interface ClientContext {
  userType: "client";
  clerkUserId: string;
  clientProfileId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

// ============================================================================
// CORE IDENTITY LOOKUP (O(1) with index)
// ============================================================================

/**
 * Get user identity from registry - the fastest lookup
 * This is the primary entry point for all identity checks
 */
export async function getUserIdentity(clerkUserId: string): Promise<UserIdentity | null> {
  if (!clerkUserId) return null;

  try {
    const registry = await prisma.user_registry.findUnique({
      where: { clerkUserId },
    });

    if (!registry) {
      return null;
    }

    return {
      clerkUserId: registry.clerkUserId,
      userType: registry.userType as UserType,
      isActive: registry.isActive,
      proProfileId: registry.proProfileId,
      clientProfileId: registry.clientProfileId,
      orgId: registry.orgId,
      displayName: registry.displayName,
      email: registry.email,
      avatarUrl: registry.avatarUrl,
      onboardingComplete: registry.onboardingComplete ?? false,
      createdAt: registry.createdAt,
      lastSeenAt: registry.lastSeenAt,
    };
  } catch (error) {
    logger.error("[getUserIdentity] Error:", error);
    return null;
  }
}

/**
 * Determine user type with fallback to legacy tables
 * Use this during migration period
 */
export async function determineUserType(clerkUserId: string): Promise<UserType> {
  if (!clerkUserId) return "unknown";

  // First, check user_registry (fastest)
  const identity = await getUserIdentity(clerkUserId);
  if (identity) {
    return identity.userType;
  }

  // Fallback: Check tradesCompanyMember (PRO)
  try {
    const proMember = await prisma.tradesCompanyMember.findFirst({
      where: {
        userId: clerkUserId,
        status: "active",
      },
      select: { id: true },
    });

    if (proMember) {
      // Auto-register as PRO in user_registry
      await registerUser(clerkUserId, "pro", proMember.id);
      return "pro";
    }
  } catch (error) {
    logger.error("[determineUserType] Pro check error:", error);
  }

  // Fallback: Check clients table (CLIENT)
  try {
    const client = await prisma.clients.findFirst({
      where: { email: clerkUserId },
      select: { id: true },
    });

    if (client) {
      // Auto-register as CLIENT in user_registry
      await registerUser(clerkUserId, "client", undefined, client.id);
      return "client";
    }
  } catch (error) {
    logger.error("[determineUserType] Client check error:", error);
  }

  return "unknown";
}

// ============================================================================
// CONTEXT LOADERS - Never mix these!
// ============================================================================

/**
 * Load full PRO context - throws if user is not a pro
 */
export async function loadProContext(clerkUserId: string): Promise<ProContext> {
  const identity = await getUserIdentity(clerkUserId);

  if (!identity) {
    throw new Error(`[loadProContext] No identity found for ${clerkUserId}`);
  }

  if (identity.userType !== "pro") {
    throw new Error(
      `[loadProContext] User ${clerkUserId} is not a pro (type: ${identity.userType})`
    );
  }

  if (!identity.proProfileId) {
    throw new Error(`[loadProContext] Pro user ${clerkUserId} has no profile ID`);
  }

  // Load full pro member data
  const proMember = await prisma.tradesCompanyMember.findFirst({
    where: { id: identity.proProfileId },
    include: {
      company: {
        select: {
          id: true,
          isVerified: true,
          specialties: true,
        },
      },
    },
  });

  if (!proMember) {
    throw new Error(`[loadProContext] Pro member not found: ${identity.proProfileId}`);
  }

  return {
    userType: "pro",
    clerkUserId,
    proProfileId: identity.proProfileId,
    orgId: identity.orgId || proMember.orgId || "",
    companyId: proMember.companyId,
    displayName:
      identity.displayName ||
      (proMember as any).name ||
      `${proMember.firstName} ${proMember.lastName}`.trim(),
    email: identity.email || proMember.email,
    avatarUrl: identity.avatarUrl || proMember.avatar,
    isVerified: proMember.company?.isVerified || false,
    specialties: proMember.company?.specialties || [],
  };
}

/**
 * Load full CLIENT context - throws if user is not a client
 */
export async function loadClientContext(clerkUserId: string): Promise<ClientContext> {
  const identity = await getUserIdentity(clerkUserId);

  if (!identity) {
    throw new Error(`[loadClientContext] No identity found for ${clerkUserId}`);
  }

  if (identity.userType !== "client") {
    throw new Error(
      `[loadClientContext] User ${clerkUserId} is not a client (type: ${identity.userType})`
    );
  }

  if (!identity.clientProfileId) {
    throw new Error(`[loadClientContext] Client user ${clerkUserId} has no profile ID`);
  }

  // Load full client data
  const client = await prisma.clients.findUnique({
    where: { id: identity.clientProfileId },
  });

  if (!client) {
    throw new Error(`[loadClientContext] Client not found: ${identity.clientProfileId}`);
  }

  return {
    userType: "client",
    clerkUserId,
    clientProfileId: identity.clientProfileId,
    displayName:
      identity.displayName ||
      `${client.firstName} ${client.lastName}`.trim() ||
      client.email ||
      "Client",
    email: identity.email || client.email,
    phone: client.phone,
    avatarUrl: identity.avatarUrl,
  };
}

// ============================================================================
// REGISTRATION / MANAGEMENT
// ============================================================================

/**
 * Register a new user in the identity registry
 */
export async function registerUser(
  clerkUserId: string,
  userType: UserType,
  proProfileId?: string,
  clientProfileId?: string,
  orgId?: string,
  displayName?: string,
  email?: string
): Promise<UserIdentity | null> {
  if (!clerkUserId || userType === "unknown") {
    return null;
  }

  try {
    const result = await prisma.user_registry.upsert({
      where: { clerkUserId },
      create: {
        clerkUserId,
        userType,
        proProfileId: proProfileId || null,
        clientProfileId: clientProfileId || null,
        orgId: orgId || null,
        displayName: displayName || null,
        email: email || null,
        isActive: true,
      },
      update: {
        userType,
        proProfileId: proProfileId || undefined,
        clientProfileId: clientProfileId || undefined,
        orgId: orgId || undefined,
        displayName: displayName || undefined,
        email: email || undefined,
        lastSeenAt: new Date(),
      },
    });

    return {
      clerkUserId: result.clerkUserId,
      userType: result.userType as UserType,
      isActive: result.isActive,
      proProfileId: result.proProfileId,
      clientProfileId: result.clientProfileId,
      orgId: result.orgId,
      displayName: result.displayName,
      email: result.email,
      avatarUrl: result.avatarUrl,
      createdAt: result.createdAt,
      lastSeenAt: result.lastSeenAt,
      onboardingComplete: (result as any).onboardingComplete ?? false,
    };
  } catch (error) {
    logger.error("[registerUser] Error:", error);
    return null;
  }
}

/**
 * Update last seen timestamp (for activity tracking)
 */
export async function updateLastSeen(clerkUserId: string): Promise<void> {
  try {
    await prisma.user_registry.update({
      where: { clerkUserId },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    // Silently fail - this is not critical
    logger.error("[updateLastSeen] Error:", error);
  }
}

// ============================================================================
// HELPER: Get current user's identity
// ============================================================================

/**
 * Get identity for the currently authenticated user
 * Convenience wrapper around Clerk + getUserIdentity
 */
export async function getCurrentUserIdentity(): Promise<UserIdentity | null> {
  try {
    const user = await currentUser();
    if (!user?.id) return null;

    return await getUserIdentity(user.id);
  } catch (error) {
    logger.error("[getCurrentUserIdentity] Error:", error);
    return null;
  }
}

/**
 * Check if current user is a PRO
 */
export async function isCurrentUserPro(): Promise<boolean> {
  const identity = await getCurrentUserIdentity();
  return identity?.userType === "pro";
}

/**
 * Check if current user is a CLIENT
 */
export async function isCurrentUserClient(): Promise<boolean> {
  const identity = await getCurrentUserIdentity();
  return identity?.userType === "client";
}

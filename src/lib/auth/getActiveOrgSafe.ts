/**
 * CANONICAL ORG RESOLVER (DB-FIRST, SELF-HEALING, NEVER THROWS)
 *
 * RULES:
 * 1. DB membership is SOURCE OF TRUTH (not Clerk orgId)
 * 2. Auto-creates org + membership if missing (when allowAutoCreate=true)
 * 3. NEVER throws - always returns typed result
 * 4. Logs with [ORG_SAFE] tag for debugging
 *
 * Use this EVERYWHERE that needs org context.
 */

import { auth } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/** Dynamic delegate for user_organizations model */
interface UserOrgDelegate {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  findFirst(args?: Record<string, unknown>): Promise<unknown>;
  findMany(args?: Record<string, unknown>): Promise<OrgMembership[]>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
}

/** Membership record with included Org relation */
interface OrgMembership {
  id: string;
  userId?: string;
  organizationId?: string;
  role?: string;
  createdAt?: Date;
  Org?: { id: string; name: string; clerkOrgId: string | null } | null;
}

/** Prisma client extended with optional user_organizations delegate */
type PrismaWithUserOrgs = typeof prisma & {
  user_organizations?: UserOrgDelegate;
};

/**
 * Check if user has any pending team invitations.
 * If yes, we must NOT auto-create an org — let them accept the invite first.
 */
async function checkPendingInvites(userId: string): Promise<boolean> {
  try {
    const pendingInvites = await prisma.$queryRaw<Array<{ id: string }>>` 
      SELECT id FROM team_invitations
      WHERE status = 'pending'
        AND expires_at > NOW()
        AND email IN (
          SELECT email FROM users WHERE "clerkUserId" = ${userId}
        )
      LIMIT 1
    `;
    return pendingInvites.length > 0;
  } catch {
    // Non-fatal: table may not exist
    return false;
  }
}

export type ActiveOrgResult =
  | {
      ok: true;
      org: {
        id: string;
        name: string;
        clerkOrgId: string | null;
      };
      userId: string;
      source: "CLERK_ORG" | "DB_MEMBERSHIP" | "AUTO_CREATED";
    }
  | {
      ok: false;
      reason: "NO_SESSION" | "CREATE_FAILED" | "DB_ERROR" | "PRISMA_UNDEFINED";
      error?: string;
      userId?: string;
    };

/**
 * Try to create org with fallback for schema mismatches
 * Uses transaction to ensure atomicity
 */
async function tryCreateOrgMinimal(params: {
  name: string;
  clerkOrgId: string | null;
  userId: string;
}): Promise<{ id: string; name: string; clerkOrgId: string | null }> {
  const { name, clerkOrgId, userId } = params;

  logger.debug("[ORG_SAFE] Attempting org creation:", { name, hasClerkOrgId: !!clerkOrgId });

  // Use transaction for atomic create
  try {
    const result = await prisma.$transaction(async (tx) => {
      // DETERMINISTIC clerkOrgId — prevents duplicate orgs across concurrent requests
      const effectiveClerkOrgId = clerkOrgId ?? `org_${userId}`;

      // Create org
      const org = await tx.org.create({
        data: {
          id: crypto.randomUUID(),
          name,
          clerkOrgId: effectiveClerkOrgId,
          demoMode: false, // Enterprise orgs start in production mode
          updatedAt: new Date(),
        },
        select: { id: true, name: true, clerkOrgId: true },
      });

      logger.debug("[ORG_SAFE] ✅ Created org (full schema):", org.id);

      // Create membership with ADMIN role (delegate-aware)
      const txDynamic = tx as unknown as PrismaWithUserOrgs;
      const prismaDynamic = prisma as unknown as PrismaWithUserOrgs;
      const canUseUserOrganizations =
        typeof txDynamic.user_organizations?.create === "function" ||
        typeof prismaDynamic.user_organizations?.create === "function";

      if (canUseUserOrganizations) {
        await txDynamic.user_organizations!.create({
          data: {
            userId,
            organizationId: org.id,
            role: "ADMIN",
          },
        });
        logger.debug("[ORG_SAFE] ✅ Created membership via user_organizations (role: ADMIN)");
      } else {
        // Fallback: link via users.orgId (legacy schema)
        try {
          const existingUser = await tx.users.findUnique({
            where: { clerkUserId: userId },
            select: { id: true },
          });

          if (existingUser) {
            await tx.users.update({
              where: { clerkUserId: userId },
              data: { orgId: org.id, role: "ADMIN" },
            });
            logger.debug("[ORG_SAFE] ✅ Linked user to org via users.orgId (updated)");
          } else {
            await tx.users.create({
              data: {
                id: crypto.randomUUID(),
                clerkUserId: userId,
                email: `user-${userId}@example.com`,
                name: "User",
                role: "ADMIN",
                orgId: org.id,
              },
            });
            logger.debug("[ORG_SAFE] ✅ Linked user to org via users.orgId (created)");
          }
        } catch (linkError: unknown) {
          logger.error(
            "[ORG_SAFE] Membership link fallback failed:",
            linkError instanceof Error ? linkError.message : String(linkError)
          );
          throw linkError;
        }
      }

      // Create BillingSettings (required workspace primitive)
      await tx.billingSettings.create({
        data: {
          id: `billing_${org.id}`,
          orgId: org.id,
          updatedAt: new Date(),
        },
      });
      logger.debug("[ORG_SAFE] ✅ Created BillingSettings for org:", org.id);

      return org;
    });

    // Create org_branding outside transaction (raw SQL, separate table)
    try {
      await prisma.org_branding.upsert({
        where: { orgId: result.id },
        update: {},
        create: {
          id: crypto.randomUUID(),
          orgId: result.id,
          ownerId: result.id,
          updatedAt: new Date(),
        },
      });
      logger.debug("[ORG_SAFE] ✅ Created org_branding for org:", result.id);
    } catch (brandingErr: unknown) {
      // Non-fatal - table may not exist in all environments
      logger.warn(
        "[ORG_SAFE] Branding setup skipped:",
        brandingErr instanceof Error ? brandingErr.message : String(brandingErr)
      );
    }

    return result;
  } catch (createError: unknown) {
    const errInfo = createError as { message?: string; code?: string; meta?: unknown };
    logger.error("[ORG_SAFE] Org creation failed:", {
      message: errInfo.message,
      code: errInfo.code,
      meta: errInfo.meta,
    });
    throw createError;
  }
}

/**
 * Get active org context safely - NEVER throws
 * @param opts.allowAutoCreate - If true, creates org+membership if missing (default: true)
 */
export async function getActiveOrgSafe(opts?: {
  allowAutoCreate?: boolean;
}): Promise<ActiveOrgResult> {
  const allowAutoCreate = opts?.allowAutoCreate ?? true;

  try {
    // Guard: Verify prisma is initialized
    if (!prisma || typeof prisma?.org?.findFirst !== "function") {
      logger.error("[ORG_SAFE] PRISMA_UNDEFINED: Database client not available");
      return {
        ok: false,
        reason: "PRISMA_UNDEFINED",
        error: "Database client not initialized",
      };
    }

    // Get user session (Clerk v5 requires await)
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) {
      logger.warn("[ORG_SAFE] NO_SESSION: User not authenticated");
      return {
        ok: false,
        reason: "NO_SESSION",
        error: "User not authenticated",
      };
    }

    logger.debug(`[ORG_SAFE] userId: ${userId} clerkOrgId: ${clerkOrgId || "null"}`);

    // ═══════════════════════════════════════════════════════════════════════
    // CRITICAL FIX: ALWAYS check DB membership FIRST, then fall back to Clerk
    // This ensures consistency with resolveOrg() and prevents org mismatch
    // when claims are created via API (using resolveOrg) but viewed via pages
    // (using getActiveOrgSafe).
    // ═══════════════════════════════════════════════════════════════════════

    // STRATEGY 1 (PRIORITY): Find org via DB membership (DB is source of truth)
    try {
      const prismaDynamic = prisma as unknown as PrismaWithUserOrgs;
      const canUseUserOrganizations =
        typeof prismaDynamic.user_organizations?.findFirst === "function";

      if (canUseUserOrganizations) {
        // Get ALL memberships so we can clean up orphans
        const memberships = await prismaDynamic.user_organizations!.findMany({
          where: { userId },
          include: {
            Org: {
              select: { id: true, name: true, clerkOrgId: true },
            },
          },
          orderBy: { createdAt: "asc" }, // Use oldest (first) membership
        });

        // Find first membership with a valid Org
        const validMembership = memberships.find((m: OrgMembership) => m.Org);

        if (validMembership?.Org) {
          logger.debug("[ORG_SAFE] ✅ Found org via DB membership:", validMembership.Org.id);

          // Clean up any orphaned memberships in the background
          const orphanedMemberships = memberships.filter((m: OrgMembership) => !m.Org);
          if (orphanedMemberships.length > 0) {
            logger.warn(
              `[ORG_SAFE] Cleaning up ${orphanedMemberships.length} orphaned memberships`
            );
            prismaDynamic
              .user_organizations!.deleteMany({
                where: { id: { in: orphanedMemberships.map((m: OrgMembership) => m.id) } },
              })
              .catch((err: unknown) =>
                logger.error(
                  "[ORG_SAFE] Orphan cleanup failed:",
                  err instanceof Error ? err.message : String(err)
                )
              );
          }

          return {
            ok: true,
            org: validMembership.Org,
            userId,
            source: "DB_MEMBERSHIP",
          };
        }

        // All memberships are orphaned - clean them up
        if (memberships.length > 0) {
          logger.warn(
            `[ORG_SAFE] All ${memberships.length} memberships are orphaned, cleaning up...`
          );
          await prismaDynamic.user_organizations!.deleteMany({
            where: { userId },
          });
        }
      }

      // Fallback: legacy users.orgId linkage
      const legacyUser = await prisma.users.findUnique({
        where: { clerkUserId: userId },
        select: { orgId: true },
      });
      if (legacyUser?.orgId) {
        const org = await prisma.org.findUnique({
          where: { id: legacyUser.orgId },
          select: { id: true, name: true, clerkOrgId: true },
        });
        if (org) {
          logger.warn("[ORG_SAFE] Fallback activated: using users.orgId linkage");
          return {
            ok: true,
            org,
            userId,
            source: "DB_MEMBERSHIP",
          };
        }
      }
    } catch (error: unknown) {
      logger.error(
        "[ORG_SAFE] Error querying membership:",
        error instanceof Error ? error.message : String(error)
      );
    }

    // STRATEGY 2 (FALLBACK): If Clerk orgId exists and no DB membership, find/create DB org
    if (clerkOrgId) {
      try {
        let org: { id: string; name: string; clerkOrgId: string | null } | null =
          await prisma.org.findFirst({
            where: { clerkOrgId },
            select: { id: true, name: true, clerkOrgId: true },
          });

        if (org) {
          logger.debug("[ORG_SAFE] ✅ Found org via Clerk orgId (no DB membership):", org.id);
          return {
            ok: true,
            org: { ...org, clerkOrgId: org.clerkOrgId ?? "" },
            userId,
            source: "CLERK_ORG",
          } as ActiveOrgResult;
        }

        // Clerk org exists but not in DB — check for pending invites FIRST
        if (allowAutoCreate) {
          const hasPendingInvite = await checkPendingInvites(userId);
          if (hasPendingInvite) {
            logger.info("[ORG_SAFE] User has pending invite — skipping auto-create");
            return {
              ok: false,
              reason: "CREATE_FAILED" as const,
              error: "User has pending invitation — must accept before org creation",
              userId,
            };
          }

          logger.debug("[ORG_SAFE] Clerk org not in DB, creating...");
          org = await tryCreateOrgMinimal({
            name: "My Organization",
            clerkOrgId: clerkOrgId!,
            userId,
          });

          return {
            ok: true,
            org: org!,
            userId,
            source: "AUTO_CREATED",
          };
        }
      } catch (error: unknown) {
        logger.error(
          "[ORG_SAFE] Error with Clerk org strategy:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // STRATEGY 3: No org found - check pending invites, then auto-create if allowed
    if (allowAutoCreate) {
      // ── CRITICAL: Pending invite check ──────────────────────────
      // If user was invited to a team, do NOT auto-create a phantom org.
      // Let the UI show the invite banner so they can accept.
      const hasPendingInvite = await checkPendingInvites(userId);
      if (hasPendingInvite) {
        logger.info("[ORG_SAFE] User has pending invite — skipping auto-create (Strategy 3)");
        return {
          ok: false,
          reason: "DB_ERROR" as const,
          error: "User has pending invitation — must accept before org creation",
          userId,
        };
      }

      try {
        logger.debug("[ORG_SAFE] No org found, creating default org for user...");
        const org = await tryCreateOrgMinimal({
          name: "My Organization",
          clerkOrgId: clerkOrgId || null,
          userId,
        });

        logger.debug("[ORG_SAFE] ✅ Auto-created org:", org.id);
        return {
          ok: true,
          org,
          userId,
          source: "AUTO_CREATED",
        };
      } catch (createError: unknown) {
        const errMsg = createError instanceof Error ? createError.message : String(createError);
        logger.error("[ORG_SAFE] Auto-create failed:", errMsg);
        return {
          ok: false,
          reason: "CREATE_FAILED",
          error: errMsg,
          userId,
        };
      }
    }

    // No org and auto-create disabled
    logger.warn("[ORG_SAFE] No org found and auto-create disabled");
    return {
      ok: false,
      reason: "DB_ERROR",
      error: "No organization found for user",
      userId,
    };
  } catch (error: unknown) {
    logger.error("[ORG_SAFE] Unexpected error:", error);
    return {
      ok: false,
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

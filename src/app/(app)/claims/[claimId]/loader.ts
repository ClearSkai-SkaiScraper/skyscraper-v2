// src/app/(app)/claims/[claimId]/loader.ts
import { getClaimDetailsByParam } from "@/lib/claims/getClaimByParam";
import { logger } from "@/lib/logger";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

export type ClaimDetails = NonNullable<Awaited<ReturnType<typeof getClaimDetailsByParam>>>;

export type GetClaimResult =
  | { ok: true; claim: ClaimDetails }
  | { ok: false; reason: "UNAUTHENTICATED" | "NO_ORG" | "NOT_FOUND" | "DB_ERROR"; detail?: string };

/**
 * SAFE getClaim - NEVER throws, always returns a result object.
 *
 * Uses getOrg({ mode: "optional" }) - NEVER creates orgs during render.
 * Caller (layout) decides how to handle NO_ORG.
 *
 * @param claimId - The claim ID to fetch
 * @param orgId - Optional orgId to use (for API routes), otherwise resolves from auth
 */
export async function getClaim(claimId: string, orgId?: string): Promise<GetClaimResult> {
  try {
    logger.debug("[getClaim] START", { claimId });

    // PUBLIC DEMO ALIAS: Return synthetic claim without org context
    if (claimId === "test") {
      const now = new Date();
      return {
        ok: true,
        claim: {
          id: "test",
          orgId: "demo-org",
          claimNumber: "CLM-DEMO-001",
          status: "active",
          title: "John Smith — Demo Claim",
          description: "Demo claim for workspace preview",
          insured_name: "John Smith",
          homeownerEmail: "john.smith@example.com",
          carrier: "Demo Carrier",
          policyNumber: null,
          adjusterName: "Alex Adjuster",
          adjusterEmail: "alex.adjuster@example.com",
          adjusterPhone: "(555) 010-2000",
          damageType: "STORM",
          dateOfLoss: new Date("2025-12-01"),
          lifecycle_stage: "FILED",
          createdAt: now,
          updatedAt: now,
          propertyId: null,
          priority: null,
          estimatedValue: 0,
          approvedValue: 0,
          deductible: 0,
          assignedTo: null,
          coverPhotoUrl: null,
          coverPhotoId: null,
          property: { address: "123 Demo St, Phoenix, AZ 85001" },
          contact: null,
        },
      } as unknown as GetClaimResult;
    }

    // Resolve org ID using OPTIONAL mode (NEVER creates, NEVER redirects)
    const resolvedOrgId =
      orgId ??
      (await (async () => {
        const res = await getOrg({ mode: "optional" });
        if (!res.ok) {
          logger.error("[getClaim] Org resolution failed", { reason: res.reason });
          return null;
        }
        return res.orgId;
      })());

    if (!resolvedOrgId) {
      logger.error("[getClaim] NO_ORG: Cannot fetch claim without org context");
      return { ok: false, reason: "NO_ORG" };
    }

    logger.debug("[getClaim] Fetching claim", { orgId: resolvedOrgId });

    // ✅ CRITICAL FIX: Use resolver that accepts id OR claimNumber
    const claim = await getClaimDetailsByParam(resolvedOrgId, claimId);

    if (!claim) {
      logger.warn("[getClaim] CLAIM NOT FOUND", { claimId, orgId: resolvedOrgId });

      // ── ENHANCED DIAGNOSTICS: Check if claim exists in ANY org ──────────
      const claimInAnyOrg = await prisma.claims.findFirst({
        where: {
          OR: [{ id: claimId }, { claimNumber: claimId }],
        },
        select: { id: true, claimNumber: true, orgId: true, title: true },
      });

      if (claimInAnyOrg) {
        logger.error("[getClaim] ⚠️ TENANT MISMATCH DETECTED!", {
          requestedClaimId: claimId,
          claimActualOrgId: claimInAnyOrg.orgId,
          userResolvedOrgId: resolvedOrgId,
          claimNumber: claimInAnyOrg.claimNumber,
          hint: "Claim exists but in a different org. User may have multiple orgs or org resolution is wrong.",
        });
      } else {
        logger.warn("[getClaim] Claim does not exist in ANY org", { claimId });
      }

      const availableClaims = await prisma.claims.findMany({
        where: { orgId: resolvedOrgId },
        select: { id: true, claimNumber: true, title: true },
        take: 10,
      });
      logger.debug("[getClaim] Available claims in user's org", {
        count: availableClaims.length,
        orgId: resolvedOrgId,
        samples: availableClaims.slice(0, 3).map((c) => c.id),
      });
      return { ok: false, reason: "NOT_FOUND" };
    }

    logger.debug("[getClaim] SUCCESS", { claimNumber: claim.claimNumber });
    return { ok: true, claim };
  } catch (error) {
    logger.error("[getClaim] DB_ERROR", { error: error.message, stack: error.stack });
    return {
      ok: false,
      reason: "DB_ERROR",
      detail: error?.message ?? String(error),
    };
  }
}

// ORG-SCOPE: Scoped by userId/email — queries client_access by userEmail. No cross-tenant risk.
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/claims
 * List all claims the current user has portal access to
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId, email: userEmail } = authResult;

    // Rate limit portal requests
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    if (!userEmail) {
      return NextResponse.json({ ok: true, claims: [] });
    }

    // Find all claim accesses for this user via ALL access systems
    let accesses: any[] = [];
    let linkedClaims: any[] = [];
    let directClaimsList: any[] = [];
    try {
      // System 1: email-based client_access
      accesses = await prisma.client_access.findMany({
        where: {
          email: userEmail,
        },
        include: {
          claims: {
            select: {
              id: true,
              claimNumber: true,
              title: true,
              status: true,
              properties: {
                select: {
                  street: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // System 2: userId-based ClaimClientLink (from pro invites)
      const client = await prisma.client.findFirst({
        where: { OR: [{ userId }, { email: userEmail }] },
        select: { id: true },
      });

      if (client) {
        linkedClaims = await prisma.claimClientLink.findMany({
          where: {
            OR: [{ clientUserId: client.id }, { clientEmail: userEmail }],
            status: "ACCEPTED",
          },
          include: {
            claims: {
              select: {
                id: true,
                claimNumber: true,
                title: true,
                status: true,
                properties: {
                  select: {
                    street: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
          orderBy: {
            invitedAt: "desc",
          },
        });

        // System 3: Direct claims.clientId match (from pro attach-contact)
        // This matches the portal dashboard query to ensure consistency
        const directClaims = await prisma.claims.findMany({
          where: { clientId: client.id },
          select: {
            id: true,
            claimNumber: true,
            title: true,
            status: true,
            updatedAt: true,
            properties: {
              select: {
                street: true,
                city: true,
                state: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        });

        // Add direct claims to the map (these are the ones from attach-contact)
        for (const claim of directClaims) {
          if (!directClaimsList.some((c: any) => c.id === claim.id)) {
            directClaimsList.push(claim);
          }
        }
      }
    } catch (dbError) {
      logger.error("[GET /api/portal/claims] DB Error:", dbError);
      // Return empty array instead of throwing
      return NextResponse.json({
        ok: true,
        claims: [],
        warning: "Could not load claims",
      });
    }

    // Format and merge claims from all access systems (deduplicate by id)
    const claimMap = new Map<string, any>();

    // Add claims from client_access (email-based)
    for (const access of accesses) {
      if (access.claims && !claimMap.has(access.claims.id)) {
        claimMap.set(access.claims.id, {
          id: access.claims.id,
          claimNumber: access.claims.claimNumber,
          title: access.claims.title,
          status: access.claims.status || null,
          address: access.claims.properties
            ? `${access.claims.properties.street}, ${access.claims.properties.city}, ${access.claims.properties.state}`
            : null,
          role: "homeowner",
          accessGrantedAt: access.createdAt,
        });
      }
    }

    // Add claims from ClaimClientLink (userId-based)
    for (const link of linkedClaims) {
      if (link.claims && !claimMap.has(link.claims.id)) {
        claimMap.set(link.claims.id, {
          id: link.claims.id,
          claimNumber: link.claims.claimNumber,
          title: link.claims.title,
          status: link.claims.status || null,
          address: link.claims.properties
            ? `${link.claims.properties.street}, ${link.claims.properties.city}, ${link.claims.properties.state}`
            : null,
          role: "homeowner",
          accessGrantedAt: link.acceptedAt || link.invitedAt,
        });
      }
    }

    // Add claims from direct clientId attachment (System 3)
    for (const claim of directClaimsList) {
      if (!claimMap.has(claim.id)) {
        claimMap.set(claim.id, {
          id: claim.id,
          claimNumber: claim.claimNumber,
          title: claim.title,
          status: claim.status || null,
          address: claim.properties
            ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state}`
            : null,
          role: "homeowner",
          accessGrantedAt: claim.updatedAt,
        });
      }
    }

    const claims = Array.from(claimMap.values());

    return NextResponse.json({ ok: true, claims });
  } catch (error) {
    logger.error("[GET /api/portal/claims] Fatal Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error", claims: [] },
      { status: 500 }
    );
  }
}

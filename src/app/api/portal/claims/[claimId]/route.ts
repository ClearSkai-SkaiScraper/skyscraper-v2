import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { assertPortalAccess } from "@/lib/auth/portalAccess";
import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/claims/[claimId]
 * Get claim details for portal user including contractor info
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const authResult = await requirePortalAuth();
  if (isPortalAuthError(authResult)) return authResult;
  const { userId } = authResult;

  // Rate limit portal requests
  const rl = await checkRateLimit(userId, "API");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const { claimId } = await params;

    // Verify portal access
    await assertPortalAccess({ userId, claimId });

    // Fetch claim details with org, property, and contractor info
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        insured_name: true,
        dateOfLoss: true,
        orgId: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        Org: {
          select: {
            id: true,
            name: true,
            contractor_profiles: {
              select: {
                id: true,
                businessName: true,
                logoUrl: true,
                coverPhotoUrl: true,
                phone: true,
                email: true,
                website: true,
                primaryTrade: true,
                about: true,
                verified: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Build contractor info from contractor_profiles
    let contractor: any = null;
    const profile = claim.Org?.contractor_profiles;
    if (profile) {
      contractor = {
        id: profile.id,
        name: profile.businessName,
        companyName: profile.businessName,
        logo: profile.logoUrl,
        coverPhoto: profile.coverPhotoUrl,
        phone: profile.phone,
        email: profile.email,
        website: profile.website,
        specialty: profile.primaryTrade,
        description: profile.about,
        verified: profile.verified,
        profileSlug: profile.slug,
      };
    } else if (claim.Org) {
      // Fallback to org name if no contractor profile
      contractor = {
        id: claim.Org.id,
        name: claim.Org.name,
        companyName: claim.Org.name,
        logo: null,
        phone: null,
        email: null,
      };
    }

    // Build full address string from property
    const property = claim.properties;
    const fullAddress = property
      ? [property.street, property.city, property.state, property.zipCode]
          .filter(Boolean)
          .join(", ")
      : "";

    return NextResponse.json({
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title || `Claim ${claim.claimNumber}`,
        description: `Insurance claim for ${claim.insured_name || "property"}`,
        address: fullAddress,
        status: claim.status || "open",
        progress: 0, // Could calculate from timeline
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
        dateOfLoss: claim.dateOfLoss,
        contractor,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[GET /api/portal/claims/[claimId]] Error:", error);

    if (errorMessage.includes("Access denied")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}

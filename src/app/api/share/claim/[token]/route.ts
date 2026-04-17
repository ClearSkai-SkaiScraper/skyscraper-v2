/**
 * Homeowner Claim Report — Public Share Verification
 * GET /api/share/claim/[token]
 *
 * Validates an HMAC token and returns claim report data
 * for the public-facing homeowner view. No auth required.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const SHARE_SECRET =
  // eslint-disable-next-line no-restricted-syntax
  process.env.REPORT_SHARE_SECRET ||
  // eslint-disable-next-line no-restricted-syntax
  process.env.WEATHER_SHARE_SECRET ||
  "skaiscraper-share-secret-fallback";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length !== 32) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 400 });
    }

    // Find the claim by brute-forcing HMAC against recent claims
    // (same pattern as weather share — max 500 claims checked)
    const recentClaims = await prisma.claims.findMany({
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    let matchedClaimId: string | null = null;
    for (const claim of recentClaims) {
      const computed = crypto
        .createHmac("sha256", SHARE_SECRET)
        .update(claim.id)
        .digest("hex")
        .slice(0, 32);
      if (computed === token) {
        matchedClaimId = claim.id;
        break;
      }
    }

    if (!matchedClaimId) {
      return NextResponse.json({ error: "Share link expired or invalid" }, { status: 404 });
    }

    // Fetch claim data for public view
    const claim = await prisma.claims.findUnique({
      where: { id: matchedClaimId },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        propertyId: true,
        insured_name: true,
        homeownerEmail: true,
        estimatedValue: true,
        dateOfLoss: true,
        damageType: true,
        createdAt: true,
        updatedAt: true,
        orgId: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    let propertyAddress: string | null = null;
    try {
      const property = await prisma.properties.findUnique({
        where: { id: claim.propertyId },
        select: { street: true, city: true, state: true, zipCode: true },
      });
      if (property) {
        propertyAddress = [property.street, property.city, property.state, property.zipCode]
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      // property lookup optional
    }

    // Fetch org branding
    let branding: { companyName?: string; logoUrl?: string; primaryColor?: string } = {};
    try {
      const org = await prisma.org_branding.findFirst({
        where: { orgId: claim.orgId },
        select: {
          companyName: true,
          logoUrl: true,
          colorPrimary: true,
        },
      });
      if (org) {
        branding = {
          companyName: org.companyName || undefined,
          logoUrl: org.logoUrl || undefined,
          primaryColor: org.colorPrimary || undefined,
        };
      }
    } catch {
      // branding is optional
    }

    // Fetch photos (limit public view to 12)
    const photos = await prisma.claim_photo_meta.findMany({
      where: { claimId: matchedClaimId },
      select: {
        id: true,
        photoUrl: true,
        damageType: true,
        severity: true,
      },
      take: 12,
      orderBy: { createdAt: "asc" },
    });

    // Fetch damage findings (AI-detected line items)
    const findings = await prisma.supplement_line_items.findMany({
      where: { claim_id: matchedClaimId },
      select: {
        id: true,
        description: true,
        category: true,
        severity: true,
        quantity: true,
        unit_cost: true,
        total_cost: true,
        confidence_score: true,
      },
      take: 50,
    });

    logger.info("[CLAIM_SHARE_VIEW] Public report viewed", { claimId: matchedClaimId });

    return NextResponse.json({
      claim: {
        claimNumber: claim.claimNumber,
        status: claim.status,
        propertyAddress,
        homeownerName: claim.insured_name,
        claimAmount: claim.estimatedValue,
        dateOfLoss: claim.dateOfLoss,
        lossType: claim.damageType,
      },
      branding,
      photos: photos.map((p) => ({
        id: p.id,
        url: p.photoUrl,
        label: p.damageType,
        description: p.severity,
        category: p.damageType,
      })),
      findings: findings.map((f) => ({
        id: f.id,
        description: f.description,
        category: f.category,
        damageType: f.severity,
        quantity: Number(f.quantity),
        unitPrice: Number(f.unit_cost),
        total: Number(f.total_cost),
        confidence: f.confidence_score ? Number(f.confidence_score) : null,
      })),
      totalValue: findings.reduce((sum, f) => sum + Number(f.total_cost || 0), 0),
    });
  } catch (error) {
    logger.error("[CLAIM_SHARE_VIEW] Error:", error);
    return NextResponse.json({ error: "Failed to load report" }, { status: 500 });
  }
}

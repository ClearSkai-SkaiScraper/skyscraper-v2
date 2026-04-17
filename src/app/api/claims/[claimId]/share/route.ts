/**
 * Homeowner Claim Report — Share Link Generator
 * POST /api/claims/[claimId]/share
 *
 * Generates a public shareable link for a claim report.
 * Uses HMAC-SHA256 token (same pattern as weather share) so
 * no additional DB columns are needed.
 *
 * The homeowner sees: property photos, damage findings, scope summary,
 * and estimated claim value — branded with the contractor's company.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

const SHARE_SECRET =
  // eslint-disable-next-line no-restricted-syntax
  process.env.REPORT_SHARE_SECRET ||
  // eslint-disable-next-line no-restricted-syntax
  process.env.WEATHER_SHARE_SECRET ||
  "skaiscraper-share-secret-fallback";

function generateToken(claimId: string): string {
  return crypto.createHmac("sha256", SHARE_SECRET).update(claimId).digest("hex").slice(0, 32);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId } = await params;
    const { orgId } = ctx;

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true, claimNumber: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const token = generateToken(claimId);
    const baseUrl =
      // eslint-disable-next-line no-restricted-syntax
      process.env.NEXT_PUBLIC_APP_URL ||
      // eslint-disable-next-line no-restricted-syntax
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const shareUrl = `${baseUrl}/share/claim/${token}`;

    logger.info("[CLAIM_SHARE] Generated share link", { claimId, orgId });

    return NextResponse.json({
      shareUrl,
      token,
      claimId,
      claimNumber: claim.claimNumber,
    });
  } catch (error) {
    logger.error("[CLAIM_SHARE] Error:", error);
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/onboarding/progress
 * Returns onboarding checklist completion status based on real data
 */
export const GET = withOrgScope(async (req, { userId, orgId }) => {
  const rl = await checkRateLimit(userId, "AUTH");
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", message: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    // Check branding completion via org_branding table
    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
      select: {
        logoUrl: true,
        colorPrimary: true,
        email: true,
        license: true,
      },
    });

    const hasBranding = !!(branding && branding.logoUrl && branding.colorPrimary && branding.email);

    // Check if org has at least one client
    const clientCount = await prisma.client.count({
      where: { orgId },
    });
    const hasClient = clientCount > 0;

    // Check if org has at least one claim
    const claimCount = await prisma.claims.count({
      where: { orgId },
    });
    const hasClaim = claimCount > 0;

    // Check if org has uploaded at least 3 photos and 1 document (using FileAsset)
    const photoCount = await prisma.file_assets.count({
      where: {
        orgId,
        category: "photo",
      },
    });

    const documentCount = await prisma.file_assets.count({
      where: {
        orgId,
        category: { in: ["document", "pdf"] },
      },
    });

    const hasPhotos = photoCount >= 3 && documentCount >= 1;

    // Check if org has created at least one AI report
    const artifactCount = await prisma.ai_reports.count({
      where: { orgId },
    });
    const hasAiArtifact = artifactCount > 0;

    // Check if org has exported at least one PDF (AI reports with attachments)
    const pdfExportCount = await prisma.ai_reports.count({
      where: {
        orgId,
        NOT: { attachments: { equals: Prisma.JsonNull } },
      },
    });
    const hasPdfExport = pdfExportCount > 0;

    // Check if user has accessed vendor resources (via activity log)
    const vendorActivityCount = await prisma.activities.count({
      where: {
        orgId,
        OR: [
          { type: { contains: "vendor" } },
          { title: { contains: "Vendor" } },
          { title: { contains: "vendor" } },
        ],
      },
    });
    const hasVendorReference = vendorActivityCount > 0;

    // Check if org has any trades company entries
    const tradesCount = await prisma.tradesCompany.count();
    const hasTradesMember = tradesCount > 0;

    return NextResponse.json({
      hasBranding,
      hasClient,
      hasClaim,
      hasPhotos,
      hasAiArtifact,
      hasPdfExport,
      hasVendorReference,
      hasTradesMember,
    });
  } catch (error) {
    logger.error("[ONBOARDING_PROGRESS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch onboarding progress" }, { status: 500 });
  }
});

// src/app/api/claims/[claimId]/workspace/route.ts
import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getResolvedOrgResult } from "@/lib/auth/getResolvedOrgId";
import { resolveClaim } from "@/lib/claims/resolveClaim";
import { prismaModel } from "@/lib/db/prismaModel";
import { logger } from "@/lib/logger";
import { getActiveOrg } from "@/lib/org/getActiveOrg";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface WorkspaceData {
  claim: {
    id: string;
    claimNumber: string;
    title: string;
    status: string;
    damageType: string | null;
    propertyAddress: string | null;
    lossDate: string | null;
    inspectionDate: string | null;
    carrier: string | null;
    policyNumber: string | null;
    insured_name: string | null;
    homeownerEmail: string | null;
    adjusterName: string | null;
    adjusterPhone: string | null;
    adjusterEmail: string | null;
    propertyId: string | null;
    contactId: string | null;
    createdAt: string;
    updatedAt: string;
    signingStatus: string;
    estimatedJobValue: number | null;
    jobValueStatus: string;
    jobValueApprovedBy: string | null;
    jobValueApprovalNotes: string | null;
  };
  organization: { id: string; name: string; role: string };
  stats: {
    evidenceCount: number;
    documentsCount: number;
    reportCount: number;
    timelineEventCount: number;
  };
  permissions: { canEdit: boolean; canDelete: boolean; canGenerateReports: boolean };
}

async function ensureOrgDemoClaim(orgId: string) {
  const demoClaimNumber = `CLM-DEMO-${orgId.slice(0, 6).toUpperCase()}`;

  const existing = await prismaModel("claims")
    .findUnique({ where: { claimNumber: demoClaimNumber }, select: { id: true } })
    .catch(() => null);
  if (existing?.id) return { claimId: existing.id, claimNumber: demoClaimNumber };

  const now = new Date();
  const contactId = nanoid();
  const propertyId = nanoid();
  const claimId = nanoid();

  await prismaModel("contacts").create({
    data: {
      id: contactId,
      orgId: orgId,
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      phone: "(555) 010-2000",
      source: "demo",
      updatedAt: now,
    },
  });

  await prismaModel("properties").create({
    data: {
      id: propertyId,
      orgId,
      contactId,
      name: "Demo Property",
      propertyType: "RESIDENTIAL",
      street: "123 Demo St",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      updatedAt: now,
    },
  });

  await prismaModel("claims").create({
    data: {
      id: claimId,
      orgId,
      propertyId,
      claimNumber: demoClaimNumber,
      title: "John Smith — Demo Claim",
      description: "Demo claim for QA workflows",
      damageType: "STORM",
      dateOfLoss: new Date("2025-12-01"),
      status: "active",
      insured_name: "John Smith",
      homeownerEmail: "john.smith@example.com",
      carrier: "Demo Carrier",
      policy_number: "POL-DEMO-123",
      adjusterName: "Alex Adjuster",
      adjusterPhone: "(555) 010-2000",
      adjusterEmail: "alex.adjuster@example.com",
      updatedAt: now,
    },
  });

  return { claimId, claimNumber: demoClaimNumber };
}

export async function GET(request: NextRequest, { params }: { params: { claimId: string } }) {
  try {
    const { claimId } = params;

    // Demo alias: if signed-in and org resolvable -> create/reuse real claim and redirect.
    // Otherwise return a read-only demo payload.
    if (claimId === "test") {
      const { userId } = await auth();
      if (userId) {
        const orgResult = await getResolvedOrgResult();
        if (orgResult.ok) {
          const ensured = await ensureOrgDemoClaim(orgResult.orgId);
          return NextResponse.json({
            redirect: true,
            canonicalUrl: `/claims/${ensured.claimId}/overview`,
            reason: "DEMO_ALIAS",
          });
        }
      }

      const demoNow = new Date();
      const demoData: WorkspaceData = {
        claim: {
          id: "test",
          claimNumber: "CLM-DEMO-001",
          title: "John Smith — Demo Claim",
          status: "active",
          damageType: "STORM",
          propertyAddress: "123 Demo St, Phoenix, AZ 85001",
          lossDate: "2025-12-01",
          inspectionDate: null,
          carrier: "Demo Carrier",
          policyNumber: "POL-DEMO-123",
          insured_name: "John Smith",
          homeownerEmail: "john.smith@example.com",
          adjusterName: "Alex Adjuster",
          adjusterPhone: "(555) 010-2000",
          adjusterEmail: "alex.adjuster@example.com",
          propertyId: null,
          contactId: null,
          createdAt: demoNow.toISOString(),
          updatedAt: demoNow.toISOString(),
          signingStatus: "pending",
          estimatedJobValue: null,
          jobValueStatus: "draft",
          jobValueApprovedBy: null,
          jobValueApprovalNotes: null,
        },
        organization: { id: "demo-org", name: "Raven Demo", role: "ADMIN" },
        stats: { evidenceCount: 8, documentsCount: 2, reportCount: 1, timelineEventCount: 3 },
        permissions: { canEdit: false, canDelete: false, canGenerateReports: false },
      };
      return NextResponse.json({ success: true, data: demoData });
    }

    // Non-demo: require auth and resolve org
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

    const orgResult = await getResolvedOrgResult();
    if (!orgResult.ok) {
      return NextResponse.json(
        { error: "Organization not found", code: "ORG_NOT_FOUND", details: orgResult.reason },
        { status: 404 }
      );
    }
    const orgId = orgResult.orgId;

    // Get org details safely — don't throw if membership table is missing a row
    let orgName = "My Organization";
    let role = "ADMIN";
    try {
      const activeOrg = await getActiveOrg();
      orgName = activeOrg.name;
      role = activeOrg.role;
    } catch (orgErr) {
      // Membership may not exist yet — fall back to defaults
      logger.warn("[workspace-api] getActiveOrg fallback:", (orgErr as Error)?.message);
      // Try to get org name directly
      const org = await prisma.org
        .findUnique({ where: { id: orgId }, select: { name: true } })
        .catch(() => null);
      if (org?.name) orgName = org.name;
    }

    // Resolve claim (supports both id and claimNumber formats)
    const claimResult = await resolveClaim(claimId, orgId);
    if (!claimResult.ok) {
      return NextResponse.json(
        {
          error: "Claim not found",
          code: "CLAIM_NOT_FOUND",
          details: {
            reason: claimResult.reason,
            inputId: claimResult.inputId,
            orgId: claimResult.orgId,
          },
        },
        { status: 404 }
      );
    }
    const { claim, canonicalId } = claimResult;

    if (canonicalId !== claimId) {
      return NextResponse.json({
        redirect: true,
        canonicalUrl: `/claims/${canonicalId}/overview`,
        reason: "NON_CANONICAL_ID",
      });
    }

    const [evidenceCount, documentsCount, reportCount, timelineEventCount, property] =
      await Promise.all([
        // photos: count file_assets for this claim (the actual photos table)
        prisma.file_assets.count({ where: { claimId: claim.id, orgId } }).catch(() => 0),
        // documents: count from file_assets with document categories OR from documents table
        Promise.all([
          prisma.file_assets
            .count({
              where: {
                claimId: claim.id,
                orgId,
                category: { in: ["document", "contract", "estimate", "invoice", "other"] },
              },
            })
            .catch(() => 0),
          claim.projectId
            ? prismaModel("documents")
                .count({ where: { projectId: claim.projectId } })
                .catch(() => 0)
            : Promise.resolve(0),
        ]).then(([fileAssetDocs, projectDocs]) => fileAssetDocs + projectDocs),
        // reports: count ai_reports
        prismaModel("ai_reports")
          .count({ where: { claimId: claim.id } })
          .catch(() => 0),
        // timeline events
        prisma.claim_timeline_events.count({ where: { claim_id: claim.id } }).catch(() => 0),
        claim.propertyId
          ? prismaModel("properties")
              .findUnique({
                where: { id: claim.propertyId },
                select: { street: true, city: true, state: true, zipCode: true },
              })
              .catch(() => null)
          : Promise.resolve(null),
      ]);

    const workspaceData: WorkspaceData = {
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title || "Untitled Claim",
        status: claim.status || "new",
        damageType: claim.damageType || null,
        propertyAddress: property
          ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
          : null,
        lossDate: claim.dateOfLoss?.toISOString() || null,
        inspectionDate: claim.inspectionDate?.toISOString?.() || null,
        carrier: claim.carrier || null,
        policyNumber: claim.policyNumber || null,
        insured_name: claim.insured_name || null,
        homeownerEmail: claim.homeownerEmail || null,
        adjusterName: claim.adjusterName || null,
        adjusterPhone: claim.adjusterPhone || null,
        adjusterEmail: claim.adjusterEmail || null,
        propertyId: claim.propertyId || null,
        contactId: (claim as any).clientId || (claim as any).contactId || null,
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
        // Signing status
        signingStatus: (claim as any).signingStatus || "pending",
        // Job value estimation
        estimatedJobValue: (claim as any).estimatedJobValue || null,
        jobValueStatus: (claim as any).jobValueStatus || "draft",
        jobValueApprovedBy: (claim as any).jobValueApprovedBy || null,
        jobValueApprovalNotes: (claim as any).jobValueApprovalNotes || null,
      },
      organization: { id: orgId, name: orgName, role: role || "ADMIN" },
      stats: { evidenceCount, documentsCount, reportCount, timelineEventCount },
      permissions: {
        canEdit: role === "ADMIN" || role === "EDITOR",
        canDelete: role === "ADMIN",
        canGenerateReports: true,
      },
    };

    return NextResponse.json({ success: true, data: workspaceData });
  } catch (error) {
    const errorId = `workspace-${Date.now()}`;
    logger.error("[workspace-api] Error:", { errorId, error });
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        errorId,
        where: "api/claims/[claimId]/workspace",
      },
      { status: 500 }
    );
  }
}

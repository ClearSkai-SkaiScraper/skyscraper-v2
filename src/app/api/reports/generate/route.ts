/**
 * POST /api/reports/generate
 *
 * Generate a PDF report for a claim using a template.
 * Called by both /reports/new and /reports/templates/pdf-builder pages.
 *
 * Accepts:
 *   { claimId, orgTemplateId, template?, sections?, addOns?, inputs?, aiNotes? }
 *
 * Delegates to /api/reports/actions with action: "generate_from_template"
 * or creates a basic report if no template system is set up.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { claimId, orgTemplateId, template, sections, addOns, inputs, aiNotes } = body;

    // Check for preview mode
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        properties: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Resolve template if orgTemplateId provided
    let templateName = template || "claims";
    if (orgTemplateId) {
      const orgTemplate = await prisma.orgTemplate.findFirst({
        where: { id: orgTemplateId, orgId },
        include: { Template: { select: { name: true, slug: true } } },
      });
      if (orgTemplate?.Template) {
        templateName = orgTemplate.Template.slug || orgTemplate.Template.name;
      }
    }

    const reportTitle = `${templateName.charAt(0).toUpperCase() + templateName.slice(1)} Report - ${claim.claimNumber || claim.id.slice(0, 8)}`;

    // Create a report record in the reports table
    const report = await prisma.reports.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        claimId,
        createdById: userId,
        type: templateName,
        title: reportTitle,
        sections: sections || addOns || [],
        meta: { inputs: inputs || {}, aiNotes: aiNotes || null },
        updatedAt: new Date(),
      },
    });

    // For preview mode, return the report data without generating PDF
    if (mode === "preview") {
      return NextResponse.json({
        ok: true,
        reportId: report.id,
        preview: true,
        claim: {
          id: claim.id,
          claimNumber: claim.claimNumber,
          address: claim.properties
            ? [claim.properties.street, claim.properties.city, claim.properties.state]
                .filter(Boolean)
                .join(", ")
            : null,
        },
        template: templateName,
        sections: sections || addOns || [],
      });
    }

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      message: "Report created successfully",
      redirectUrl: `/reports/history`,
    });
  } catch (error) {
    logger.error("[POST /api/reports/generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 }
    );
  }
});

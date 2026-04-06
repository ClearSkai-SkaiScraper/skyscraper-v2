/**
 * POST /api/reports/generate
 *
 * Generate a PDF report for a claim using a template.
 * Called by both /reports/new and /reports/templates/pdf-builder pages.
 *
 * Accepts:
 *   { claimId, orgTemplateId, template?, sections?, addOns?, inputs?, aiNotes? }
 *
 * Pipeline: create DB record → render PDF via orchestrator → upload to
 * Supabase Storage → persist pdfUrl back on the report row.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { withRequestContext } from "@/lib/requestContext";
import { uploadPdf } from "@/lib/storage/uploadPdf";
import { validateBody } from "@/lib/validation/middleware";
import { generateReportSchema } from "@/lib/validation/report-schemas";
import {
  fetchReportCodes,
  fetchReportLineItems,
  fetchReportPhotos,
  fetchReportSupplements,
  fetchReportWeather,
} from "@/modules/reports/core/DataProviders";
import { exportReport } from "@/modules/reports/export/orchestrator";
import type { ReportContext, SectionKey } from "@/modules/reports/types";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    await withRequestContext();
    const body = await validateBody(req, generateReportSchema);
    if (body instanceof NextResponse) return body;
    const { claimId, orgTemplateId, template, sections, addOns, inputs, aiNotes } = body;

    // Check for preview mode
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // Resolve DB user UUID from Clerk userId (FK requires users.id, not clerkUserId)
    const dbUser = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        createdById: dbUser.id,
        type: templateName,
        title: reportTitle,
        sections: sections || addOns || [],
        meta: JSON.parse(JSON.stringify({ inputs: inputs || {}, aiNotes: aiNotes || null })),
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

    // ── Build ReportContext from claim + org branding ─────────────────────
    const branding = await prisma.org_branding.findUnique({ where: { orgId } });
    const dbUserFull = await prisma.users.findFirst({
      where: { id: dbUser.id },
      select: { name: true, email: true },
    });

    const propertyAddress = claim.properties
      ? [
          claim.properties.street,
          claim.properties.city,
          claim.properties.state,
          claim.properties.zipCode,
        ]
          .filter(Boolean)
          .join(", ")
      : "N/A";

    // Fetch all real data in parallel (weather, photos, scope, codes, supplements)
    const [weather, photos, lineItems, codes, supplements] = await Promise.all([
      fetchReportWeather(claimId).catch(() => undefined),
      fetchReportPhotos(claimId, orgId).catch(() => []),
      fetchReportLineItems(claimId).catch(() => []),
      fetchReportCodes(orgId).catch(() => []),
      fetchReportSupplements(claimId).catch(() => []),
    ]);

    const reportContext: ReportContext = {
      reportId: report.id,
      orgId,
      userId,
      userName: dbUserFull?.name || "Unknown",
      branding: {
        companyName: branding?.companyName || "SkaiScraper",
        brandColor: branding?.colorPrimary || "#117CFF",
        accentColor: branding?.colorAccent || "#FFC838",
        logoUrl: branding?.logoUrl || undefined,
        licenseNumber: branding?.license || undefined,
        phone: branding?.phone || "",
        email: branding?.email || "",
        website: branding?.website || undefined,
      },
      metadata: {
        reportId: report.id,
        claimNumber: claim.claimNumber,
        policyNumber: claim.policy_number || undefined,
        dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0],
        adjusterName: claim.adjusterName || undefined,
        propertyAddress,
        clientName: claim.insured_name || claim.title || "Homeowner",
        carrierName: claim.carrier || undefined,
        preparedBy: dbUserFull?.name || "SkaiScraper",
        submittedDate: new Date().toISOString().split("T")[0],
      },
      weather,
      photos,
      lineItems,
      codes,
      supplements,
      executiveSummary: `This report documents storm damage to the property at ${propertyAddress}. All findings are based on field inspection and weather verification data.`,
      adjusterNotes: "",
    };

    // Determine which sections to render
    const defaultSections: SectionKey[] = ["cover", "executive-summary", "scope-matrix"];
    const sectionKeys: SectionKey[] =
      (sections && sections.length > 0 ? (sections as SectionKey[]) : null) ||
      (addOns && addOns.length > 0 ? (addOns as SectionKey[]) : null) ||
      defaultSections;

    // ── Generate PDF via orchestrator ────────────────────────────────────
    const exportResult = await exportReport({
      reportId: report.id,
      userId,
      format: "pdf",
      sections: sectionKeys,
      context: reportContext,
    });

    if (!exportResult.success || !exportResult.buffer) {
      logger.error("[POST /api/reports/generate] PDF generation failed:", exportResult.error);
      // Still return the report ID — user can retry PDF later
      return NextResponse.json({
        ok: true,
        reportId: report.id,
        message: "Report record created but PDF generation failed",
        pdfError: exportResult.error || "Unknown error",
        redirectUrl: `/reports/history`,
      });
    }

    // ── Upload PDF to Supabase Storage ───────────────────────────────────
    let pdfUrl: string | null = null;
    try {
      const storagePath = `${orgId}/reports/${report.id}.pdf`;
      const uploadResult = await uploadPdf({
        buffer: exportResult.buffer,
        path: storagePath,
        orgId,
      });
      pdfUrl = uploadResult.url;
    } catch (uploadErr) {
      logger.error("[POST /api/reports/generate] PDF upload failed:", uploadErr);
      // Non-fatal — report record still exists
    }

    // ── Persist pdfUrl back on the report row ────────────────────────────
    if (pdfUrl) {
      await prisma.reports.update({
        where: { id: report.id },
        data: { pdfUrl, updatedAt: new Date() },
      });
    }

    logger.info("[REPORT_GENERATED]", {
      reportId: report.id,
      orgId,
      userId,
      hasPdf: !!pdfUrl,
    });

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      pdfUrl,
      message: pdfUrl ? "Report generated successfully" : "Report created (PDF upload pending)",
      redirectUrl: `/reports/history`,
    });
  } catch (error) {
    logger.error("[POST /api/reports/generate] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
});

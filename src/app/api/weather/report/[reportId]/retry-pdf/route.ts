export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getBrandingForOrg, getBrandingWithDefaults } from "@/lib/branding/fetchBranding";
import { BRAND_PRIMARY } from "@/lib/constants/branding";
import { logger } from "@/lib/logger";
import { renderWeatherReportPDF } from "@/lib/pdf/weather-report-pdf";
import prisma from "@/lib/prisma";
import { saveAiPdfToStorage } from "@/lib/reports/saveAiPdfToStorage";
import { buildWeatherPdfViewModel } from "@/lib/weather/weatherPdfViewModel";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/weather/report/[reportId]/retry-pdf
// Re-generate the PDF for an existing weather report
// ─────────────────────────────────────────────────────────────────────────────

interface StoredEvent {
  date: string;
  time?: string;
  type: string;
  intensity?: string;
  hailSize?: string;
  windSpeed?: string;
  notes?: string;
}

export const POST = withAuth(
  async (
    req: NextRequest,
    { userId, orgId }: { userId: string; orgId: string },
    routeParams: { params: Promise<{ reportId: string }> }
  ) => {
    const { reportId } = await routeParams.params;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    try {
      // 1. Load the existing weather report
      const report = await prisma.weather_reports.findFirst({
        where: {
          id: reportId,
          OR: [{ claims: { orgId } }, { createdById: userId, claimId: null }],
        },
      });

      if (!report) {
        return NextResponse.json(
          { error: "Weather report not found or access denied" },
          { status: 404 }
        );
      }

      logger.info("[RETRY_PDF] Starting PDF retry", {
        reportId,
        claimId: report.claimId,
        address: report.address,
      });

      // 2. Load claim details if linked
      let claimDetails: {
        claimNumber?: string;
        insuredName?: string;
        carrier?: string;
        policyNumber?: string;
        adjusterName?: string;
        adjusterPhone?: string;
        adjusterEmail?: string;
        propertyAddress?: string;
      } = {};

      if (report.claimId) {
        try {
          const claim = await prisma.claims.findFirst({
            where: { id: report.claimId, orgId },
            select: {
              claimNumber: true,
              insured_name: true,
              carrier: true,
              policy_number: true,
              adjusterName: true,
              adjusterPhone: true,
              adjusterEmail: true,
              properties: {
                select: { street: true, city: true, state: true, zipCode: true },
              },
            },
          });
          if (claim) {
            const prop = claim.properties;
            const fullAddress = prop
              ? [prop.street, prop.city, prop.state, prop.zipCode].filter(Boolean).join(", ")
              : undefined;
            claimDetails = {
              claimNumber: claim.claimNumber || undefined,
              insuredName: claim.insured_name || undefined,
              carrier: claim.carrier || undefined,
              policyNumber: claim.policy_number || undefined,
              adjusterName: claim.adjusterName || undefined,
              adjusterPhone: claim.adjusterPhone || undefined,
              adjusterEmail: claim.adjusterEmail || undefined,
              propertyAddress: fullAddress,
            };
          }
        } catch (claimErr) {
          logger.warn("[RETRY_PDF] Failed to load claim details:", claimErr);
        }
      }

      // 3. Parse stored data
      const globalSummary = report.globalSummary as Record<string, unknown> | null;
      const providerRaw = report.providerRaw as Record<string, unknown> | null;

      const lat = (globalSummary?.lat as number) ?? 0;
      const lng = (globalSummary?.lng as number) ?? 0;
      const locationResolved =
        (globalSummary?.locationResolved as boolean) ?? (lat !== 0 && lng !== 0);
      const radarStationId = (globalSummary?.radarStation as string) ?? undefined;
      const dol = report.dol
        ? report.dol.toISOString().split("T")[0]
        : ((providerRaw?.dol as string) ?? "");

      if (!dol) {
        return NextResponse.json({ error: "Report has no Date of Loss" }, { status: 400 });
      }

      // 4. Load branding
      let brandingData = {
        companyName: "SkaiScraper",
        phone: undefined as string | undefined,
        email: undefined as string | undefined,
        website: undefined as string | undefined,
        license: undefined as string | undefined,
        logoUrl: undefined as string | undefined,
        primaryColor: BRAND_PRIMARY,
      };
      try {
        const branding = await getBrandingForOrg(orgId);
        const defaults = getBrandingWithDefaults(branding);
        brandingData = {
          companyName: defaults.businessName,
          phone: defaults.phone || undefined,
          email: defaults.email || undefined,
          website: defaults.website || undefined,
          license: defaults.license || undefined,
          logoUrl: defaults.logo || undefined,
          primaryColor: defaults.primaryColor,
        };
      } catch (brandErr) {
        logger.warn("[RETRY_PDF] Failed to load branding:", brandErr);
      }

      // 5. Get user name
      let generatedBy: string | undefined;
      try {
        const user = await prisma.users.findFirst({
          where: { clerkUserId: userId },
          select: { name: true, email: true },
        });
        generatedBy = user?.name || user?.email || undefined;
      } catch (userLookupErr) {
        logger.warn("[RETRY_PDF] User name lookup failed (non-critical):", userLookupErr);
      }

      // 6. Build view model
      logger.info("[RETRY_PDF] ▶ Building view model");
      const vmStart = Date.now();

      const storedEvents = (providerRaw?.events ?? report.events ?? []) as StoredEvent[];

      const viewModel = await buildWeatherPdfViewModel({
        reportId: report.id,
        generatedBy,
        claimNumber: claimDetails.claimNumber,
        insuredName: claimDetails.insuredName,
        carrier: claimDetails.carrier,
        policyNumber: claimDetails.policyNumber,
        adjusterName: claimDetails.adjusterName,
        adjusterPhone: claimDetails.adjusterPhone,
        adjusterEmail: claimDetails.adjusterEmail,
        propertyAddress: claimDetails.propertyAddress || report.address || "",
        dateOfLoss: dol,
        claimPeril: report.primaryPeril ?? (providerRaw?.peril as string) ?? null,
        lat,
        lng,
        locationResolved,
        radarStationId,
        companyName: brandingData.companyName,
        companyPhone: brandingData.phone,
        companyEmail: brandingData.email,
        companyWebsite: brandingData.website,
        companyLicense: brandingData.license,
        companyLogoUrl: brandingData.logoUrl,
        primaryColor: brandingData.primaryColor,
        weatherConditions: [],
        events: storedEvents.map((e) => ({
          date: e.date,
          time: e.time,
          type: e.type,
          severity: e.intensity,
          intensity: e.intensity,
          hailSize: e.hailSize || undefined,
          windSpeed: e.windSpeed || undefined,
          notes: e.notes,
        })),
        radarFrames: [],
        summary:
          (providerRaw?.summary as string) ??
          (globalSummary?.overallAssessment as string) ??
          undefined,
        carrierTalkingPoints:
          (providerRaw?.carrierTalkingPoints as string) ??
          (globalSummary?.contractorNarrative as string) ??
          undefined,
        dolSource: "user_input",
        providersUsed: locationResolved ? ["visual_crossing", "iem_nexrad"] : [],
        providersFailed: [],
      });

      logger.info("[RETRY_PDF] ✅ View model built", {
        durationMs: Date.now() - vmStart,
        radarFrames: viewModel.radarFrames.length,
        hasRadarImagery: viewModel.hasRadarImagery,
      });

      // 7. Render PDF
      logger.info("[RETRY_PDF] ▶ Rendering PDF");
      const renderStart = Date.now();
      const pdfBuffer = await renderWeatherReportPDF(viewModel);
      logger.info("[RETRY_PDF] ✅ PDF rendered", {
        bytes: pdfBuffer.length,
        durationMs: Date.now() - renderStart,
      });

      // 8. Upload to Supabase
      logger.info("[RETRY_PDF] ▶ Uploading to Supabase");
      const uploadStart = Date.now();
      const pdfResult = await saveAiPdfToStorage({
        orgId,
        claimId: report.claimId || undefined,
        userId,
        type: "WEATHER",
        label: `Weather Report - ${report.address}`,
        pdfBuffer,
        visibleToClient: true,
        aiReportId: report.id,
      });

      logger.info("[RETRY_PDF] ✅ PDF uploaded", {
        pdfUrl: pdfResult.publicUrl,
        uploadMs: Date.now() - uploadStart,
        totalMs: Date.now() - vmStart,
      });

      return NextResponse.json({
        success: true,
        pdfUrl: pdfResult.publicUrl,
        reportId: report.id,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error("[RETRY_PDF] ❌ Failed:", {
        error: errMsg,
        stack: err instanceof Error ? err.stack : undefined,
        reportId,
      });
      return NextResponse.json({ error: `PDF retry failed: ${errMsg}` }, { status: 500 });
    }
  }
);

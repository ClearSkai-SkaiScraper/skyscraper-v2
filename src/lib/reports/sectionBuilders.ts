/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/reports/sectionBuilders.ts

import prisma from "@/lib/prisma";

import { aiGenerateClaimSummary, aiGenerateDamageCaptions, aiGenerateRetailSummary } from "./ai";
import {
  AiSummarySectionData,
  DamageSectionData,
  DepreciationSectionData,
  EstimateSectionData,
  MaterialsSectionData,
  OcrDocData,
  ReportSectionId,
  TimelineSectionData,
  WarrantySectionData,
  WeatherSummary,
} from "./types";

export async function buildWeatherData(
  claimId: string,
  sections: ReportSectionId[]
): Promise<WeatherSummary> {
  try {
    // Fetch the latest weather report for this claim
    const weatherReport = await prisma.weather_reports.findFirst({
      where: { claimId },
      orderBy: { createdAt: "desc" },
    });

    if (!weatherReport) return {};

    const globalSummary = weatherReport.globalSummary as Record<string, any> | null;
    const events = (weatherReport.events as any[]) || [];
    const candidates = (weatherReport.candidateDates as any[]) || [];

    const result: WeatherSummary = {};

    // Quick DOL section — from the most recent scan
    if (
      sections.includes("WEATHER_QUICK_DOL" as ReportSectionId) ||
      sections.includes("WEATHER_FULL" as ReportSectionId) ||
      weatherReport.mode === "quick_dol"
    ) {
      const topCandidate = candidates.sort(
        (a: any, b: any) => (b.confidence || 0) - (a.confidence || 0)
      )[0];

      result.quickDol = {
        eventDate:
          topCandidate?.date || weatherReport.dol?.toISOString().split("T")[0] || undefined,
        peril: weatherReport.primaryPeril || topCandidate?.perilType || undefined,
        hailSizeInches: topCandidate?.hailSize || undefined,
        windSpeedMph: topCandidate?.windSpeed || undefined,
        provider: "SkaiScraper Weather Intelligence",
        aiSummary:
          globalSummary?.overallAssessment ||
          globalSummary?.notes ||
          topCandidate?.reasoning ||
          undefined,
      };
    }

    // Full report section — from weather events
    if (
      sections.includes("WEATHER_FULL" as ReportSectionId) ||
      weatherReport.mode === "full_report"
    ) {
      result.fullReport = {
        events: events.map((e: any) => ({
          date: e.date || e.eventDate || "",
          peril: e.type || e.peril || e.perilType || "unknown",
          hailSizeInches: e.hailSize || e.hailSizeInches || undefined,
          windSpeedMph: e.windSpeed || e.windSpeedMph || undefined,
          distanceMiles: e.distance || e.distanceMiles || undefined,
        })),
        aiNarrative:
          globalSummary?.overallAssessment || globalSummary?.contractorNarrative || undefined,
      };
    }

    return result;
  } catch {
    // Non-critical — return empty rather than crash report generation
    return {};
  }
}

export async function buildAiDamageSection(photos: any[], claims: any): Promise<DamageSectionData> {
  const filtered = photos.filter((p) =>
    ["ROOF_DETAIL", "SOFT_METAL", "AERIAL", "FRONT_ELEVATION", "SIDING"].includes(p.type)
  );

  return {
    photos: await aiGenerateDamageCaptions(filtered, claims),
  };
}

export async function buildEstimateSection(
  claimId: string,
  sections: ReportSectionId[]
): Promise<EstimateSectionData> {
  void claimId;
  void sections;
  return {};
}

export async function buildDepreciationSection(claimId: string): Promise<DepreciationSectionData> {
  void claimId;
  return { items: [] };
}

export async function buildMaterialsSection(claimId: string): Promise<MaterialsSectionData> {
  const materials = await prisma.claimMaterial.findMany({
    where: { claimId },
  });

  if (materials.length === 0) {
    return { items: [] };
  }

  const productIds = Array.from(new Set(materials.map((m) => m.productId).filter(Boolean)));
  const products = await prisma.vendorProduct.findMany({
    where: { id: { in: productIds as string[] } },
  });

  const productById = new Map(products.map((p) => [p.id, p] as const));

  const vendorIds = Array.from(new Set(products.map((p) => p.vendorId).filter(Boolean)));
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds as string[] } },
    select: { id: true, name: true },
  });

  const vendorById = new Map(vendors.map((v) => [v.id, v] as const));

  // Find primary material (first one as default)
  const primaryShingleMaterial = materials[0];
  const primaryShingleProduct = primaryShingleMaterial
    ? productById.get(primaryShingleMaterial.productId)
    : undefined;

  return {
    primarySystemName: primaryShingleProduct?.name,
    primaryColorName: primaryShingleMaterial?.color ?? undefined,
    items: materials.map((m) => {
      const product = productById.get(m.productId);
      const vendor = product ? vendorById.get(product.vendorId) : undefined;

      return {
        category: "General",
        name: product?.name ?? m.productId,
        vendorName: vendor?.name,
        color: m.color ?? undefined,
        quantity: m.quantity ?? undefined,
        specSheetUrl: product?.data_sheet_url ?? undefined,
      };
    }),
  };
}

export async function buildWarrantySection(
  org: any,
  optionId?: string
): Promise<WarrantySectionData> {
  void org;
  void optionId;
  return {};
}

export async function buildTimelineSection(claimId: string): Promise<TimelineSectionData> {
  void claimId;
  return {};
}

export async function buildOcrSection(claimId: string): Promise<OcrDocData[]> {
  void claimId;
  return [];
}

export async function buildAiSummaryClaim(data: any): Promise<AiSummarySectionData> {
  return await aiGenerateClaimSummary(data);
}

export async function buildAiSummaryRetail(data: any): Promise<AiSummarySectionData> {
  return await aiGenerateRetailSummary(data);
}

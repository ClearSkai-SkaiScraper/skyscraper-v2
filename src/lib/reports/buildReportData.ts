// lib/reports/buildReportData.ts

import prisma from "@/lib/prisma";

import {
  buildAiDamageSection,
  buildAiSummaryClaim,
  buildAiSummaryRetail,
  buildDepreciationSection,
  buildEstimateSection,
  buildMaterialsSection,
  buildOcrSection,
  buildTimelineSection,
  buildWarrantySection,
  buildWeatherData,
} from "./sectionBuilders";
import { ReportConfig, ReportData } from "./types";

export async function buildReportData(config: ReportConfig): Promise<ReportData> {
  const { orgId, claimId, type, sections } = config;

  // 1. Load ORG Branding
  const orgRow = await prisma.org.findUnique({ where: { id: orgId } });
  if (!orgRow) throw new Error("Organization not found.");

  const brandingRow = await prisma.org_branding.findFirst({ where: { orgId: orgId } });

  const orgName = brandingRow?.companyName ?? orgRow.name ?? "Organization";
  const orgBranding = {
    name: orgName,
    logoUrl: brandingRow?.logoUrl ?? orgRow.brandLogoUrl ?? undefined,
    teamPhotoUrl: brandingRow?.teamPhotoUrl ?? undefined,
    agentPhotoUrl: brandingRow?.teamPhotoUrl ?? undefined, // Alias for agent/team photo
    primaryColor: brandingRow?.colorPrimary ?? undefined,
    accentColor: brandingRow?.colorAccent ?? undefined,
    website: brandingRow?.website ?? undefined,
    phone: brandingRow?.phone ?? undefined,
    email: brandingRow?.email ?? undefined,
    slogan: brandingRow?.companyAddress ?? undefined, // Can be used as slogan/tagline
    motto: undefined,
    fullAddress: brandingRow?.companyAddress ?? undefined,
  };

  // 2. Load Claim + Lead/Client
  const claimRow = await prisma.claims.findUnique({
    where: { id: claimId },
    include: { properties: true, ClaimClientLink: true },
  });

  if (!claimRow) throw new Error("Claim not found.");

  // === UNIFIED CLIENT SNAPSHOT ===
  const clientLink = claimRow.ClaimClientLink?.[0];
  const clientName = clientLink?.clientName ?? claimRow.insured_name ?? "Client";

  const property = claimRow.properties;
  const propertyAddress = `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`;

  const claimSnapshot = {
    clientName,
    clientPhone: undefined as string | undefined,
    clientEmail: clientLink?.clientEmail ?? claimRow.homeowner_email ?? undefined,
    carrier: claimRow.carrier ?? property.carrier ?? undefined,
    claimNumber: claimRow.claimNumber ?? undefined,
    policyNumber: claimRow.policy_number ?? property.policyNumber ?? undefined,
    dateOfLoss: claimRow.dateOfLoss?.toISOString() ?? undefined,
    causeOfLoss: claimRow.damageType ?? undefined,
    status: claimRow.status ?? undefined,
    propertyAddress,
  };

  // 3. Load Photos + Maps
  const photoRows = await prisma.file_assets.findMany({ where: { claimId } });
  const photos = photoRows.map((p) => ({
    url: p.publicUrl,
    type: p.category ?? "UNKNOWN",
    caption: p.note ?? undefined,
  }));

  // Extract front + aerial for cover
  const frontPhoto = photos.find((p) => p.type === "FRONT_ELEVATION")?.url;
  const aerialPhoto = photos.find((p) => p.type === "AERIAL")?.url;
  const streetMap = undefined;

  // Build base ReportData object
  const data: ReportData = {
    org: orgBranding,

    claim: claimSnapshot,

    cover: {
      title:
        config.options?.customTitle ??
        (type === "INSURANCE_CLAIM"
          ? "AI Claims Report & Damage Assessment"
          : type === "RETAIL_PROPOSAL"
            ? "Property Restoration Proposal"
            : "Storm Impact Assessment"),
      subtitle: `Prepared for ${clientName}`,
      createdAt: new Date().toISOString(),
      frontPhotoUrl: frontPhoto,
      aerialPhotoUrl: aerialPhoto,
    },

    mapsAndPhotos: {
      frontPhotoUrl: frontPhoto,
      aerialPhotoUrl: aerialPhoto,
      streetMapUrl: streetMap,
      mockupPhotoUrl: photos.find((p) => p.type === "MOCKUP")?.url,
    },
  };

  // === CONDITIONAL SECTIONS (only build what UI selected) ===
  if (sections.includes("WEATHER_QUICK_DOL") || sections.includes("WEATHER_FULL")) {
    data.weather = await buildWeatherData(claimId, sections);
  }

  if (sections.includes("AI_DAMAGE")) {
    data.damage = await buildAiDamageSection(photos, claimSnapshot);
  }

  if (sections.includes("ESTIMATE_INITIAL") || sections.includes("ESTIMATE_SUPPLEMENT")) {
    data.estimate = await buildEstimateSection(claimId, sections);
  }

  if (sections.includes("DEPRECIATION")) {
    data.depreciation = await buildDepreciationSection(claimId);
  }

  if (sections.includes("MATERIALS")) {
    data.materials = await buildMaterialsSection(claimId);
  }

  if (sections.includes("WARRANTY_DETAILS")) {
    const optionId = config.options?.warrantyOptionId;
    data.warranty = await buildWarrantySection(orgBranding, optionId);
  }

  if (sections.includes("TIMELINE")) {
    data.timeline = await buildTimelineSection(claimId);
  }

  if (sections.includes("OCR_DOCS")) {
    data.ocrDocs = await buildOcrSection(claimId);
  }

  if (sections.includes("AI_SUMMARY_CLAIM")) {
    data.aiSummaryClaim = await buildAiSummaryClaim(data);
  }

  if (sections.includes("AI_SUMMARY_RETAIL")) {
    data.aiSummaryRetail = await buildAiSummaryRetail(data);
  }

  return data;
}

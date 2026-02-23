// ============================================================================
// DATA PROVIDERS — Real DB queries (Phase 2)
// ============================================================================
// Each function accepts org/claim identifiers and queries Prisma.
// Called from the export route after looking up the report's claimId.
// ============================================================================

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type {
  BrandingConfig,
  CodeCitation,
  LineItem,
  PhotoItem,
  ReportMetadata,
  SupplementItem,
  WeatherData,
} from "../types";

// ── helpers ───────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().split("T")[0];
}

// ── 1. Branding ───────────────────────────────────────────────────────────
export async function fetchReportBranding(orgId: string): Promise<BrandingConfig> {
  const [branding, org] = await Promise.all([
    prisma.org_branding.findUnique({ where: { orgId } }),
    prisma.org.findFirst({ where: { id: orgId }, select: { name: true, brandLogoUrl: true } }),
  ]);

  return {
    companyName: branding?.companyName || org?.name || "Unknown Company",
    brandColor: branding?.colorPrimary || "#117CFF",
    accentColor: branding?.colorAccent || "#FFC838",
    logoUrl: branding?.logoUrl || org?.brandLogoUrl || undefined,
    licenseNumber: branding?.license || undefined,
    website: branding?.website || undefined,
    phone: branding?.phone || "",
    email: branding?.email || "",
    headshotUrl: branding?.teamPhotoUrl || undefined,
  };
}

// ── 2. Claim / Report metadata ────────────────────────────────────────────
export async function fetchReportClaimData(
  reportId: string,
  claimId: string,
  userId?: string
): Promise<ReportMetadata> {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId },
    include: { properties: true },
  });

  if (!claim) {
    logger.warn(`[DataProviders] Claim ${claimId} not found for report ${reportId}`);
    return {
      reportId,
      claimNumber: "",
      propertyAddress: "Unknown address",
      clientName: "Unknown",
      preparedBy: "SkaiScraper",
      submittedDate: fmtDate(new Date()),
    };
  }

  const property = claim.properties;
  const addr = property
    ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
    : "Address not on file";

  return {
    reportId,
    claimNumber: claim.claimNumber || undefined,
    policyNumber: claim.policy_number || undefined,
    dateOfLoss: fmtDate(claim.dateOfLoss),
    adjusterName: claim.adjusterName || undefined,
    propertyAddress: addr,
    clientName: claim.insured_name || property?.name || "Homeowner",
    carrierName: claim.carrier || undefined,
    preparedBy: "SkaiScraper Pro",
    submittedDate: fmtDate(new Date()),
  };
}

// ── 3. Weather verification ───────────────────────────────────────────────
export async function fetchReportWeather(claimId: string): Promise<WeatherData | undefined> {
  const wr = await prisma.weather_reports.findFirst({
    where: { claimId },
    orderBy: { createdAt: "desc" },
  });

  if (!wr) return undefined;

  // Extract hail/wind from the events JSON if available
  const events = (wr.events as Record<string, unknown>[] | null) ?? [];
  let hailSize: string | undefined;
  let windSpeed: string | undefined;

  for (const ev of events) {
    if (typeof ev === "object" && ev !== null) {
      if ("hailSize" in ev && ev.hailSize) hailSize = String(ev.hailSize);
      if ("windSpeed" in ev && ev.windSpeed) windSpeed = String(ev.windSpeed);
    }
  }

  return {
    dateOfLoss: fmtDate(wr.dol),
    hailSize,
    windSpeed,
    source: "NOAA / SkaiScraper Weather Intelligence",
    verificationStatement:
      wr.overallAssessment ||
      `Weather verification completed for ${fmtDate(wr.dol)} at ${wr.address || "property address"}.`,
  };
}

// ── 4. Photo evidence ─────────────────────────────────────────────────────
export async function fetchReportPhotos(claimId: string, orgId: string): Promise<PhotoItem[]> {
  const assets = await prisma.file_assets.findMany({
    where: {
      orgId,
      claimId,
      mimeType: { startsWith: "image/" },
    },
    orderBy: { createdAt: "asc" },
    take: 100, // cap for PDF sanity
  });

  return assets.map((a) => ({
    id: a.id,
    url: a.publicUrl,
    caption: a.note || a.filename,
    category: a.category || "other",
    locationTag: a.photo_angle || undefined,
    takenAt: a.createdAt.toISOString(),
  }));
}

// ── 5. Scope line items ───────────────────────────────────────────────────
export async function fetchReportLineItems(claimId: string): Promise<LineItem[]> {
  const scopes = await prisma.scopes.findMany({
    where: { claim_id: claimId },
    include: {
      scope_areas: {
        include: {
          scope_items: {
            where: { included: true },
            orderBy: { sort_order: "asc" },
          },
        },
        orderBy: { sort_order: "asc" },
      },
    },
    orderBy: { created_at: "desc" },
    take: 1, // latest scope
  });

  const items: LineItem[] = [];
  for (const scope of scopes) {
    for (const area of scope.scope_areas) {
      for (const si of area.scope_items) {
        items.push({
          id: si.id,
          description: si.description,
          quantity: si.quantity || 1,
          unit: si.unit || "EA",
          contractorPrice: 0, // price data lives in estimates, not scope_items
          status: "new",
        });
      }
    }
  }
  return items;
}

// ── 6. Code compliance citations ──────────────────────────────────────────
export async function fetchReportCodes(orgId: string): Promise<CodeCitation[]> {
  const codes = await prisma.code_requirements.findMany({
    where: { orgId },
  });

  return codes.map((c) => ({
    code: c.code,
    description: c.summary,
    jurisdictionType: (c.region?.includes("IRC")
      ? "IRC"
      : c.region?.includes("IBC")
        ? "IBC"
        : c.region?.includes("Local") || c.region?.includes("local")
          ? "Local"
          : "Manufacturer") as CodeCitation["jurisdictionType"],
    requirementText: c.summary,
  }));
}

// ── 7. Supplements ────────────────────────────────────────────────────────
export async function fetchReportSupplements(claimId: string): Promise<SupplementItem[]> {
  const supplements = await prisma.supplements.findMany({
    where: { claim_id: claimId },
    include: {
      supplement_items: true,
    },
    orderBy: { created_at: "desc" },
  });

  const items: SupplementItem[] = [];
  for (const supp of supplements) {
    for (const si of supp.supplement_items) {
      items.push({
        description: si.name || si.description || "Supplement item",
        reasonCode: si.justification || "Supplement",
        amount: si.total ? Number(si.total) : si.price_cents ? si.price_cents / 100 : 0,
        justification: si.justification || si.code_reference || "",
      });
    }
  }
  return items;
}

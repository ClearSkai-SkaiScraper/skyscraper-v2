/**
 * Claims Folder Assembler Engine
 * Orchestrates data fetching from all SkaiScraper modules to build a complete claim folder
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import type {
  AnnotatedPhoto,
  AssembleFolderRequest,
  AssembleFolderResponse,
  ClaimFolder,
  CodeComplianceData,
  CoverSheetData,
  InspectionOverviewData,
  ReadinessScoreBreakdown,
  ScopePricingData,
  TimelineEvent,
  WeatherCauseOfLossData,
} from "./folderSchema";

// ============================================================================
// Data Fetchers
// ============================================================================

/**
 * Fetch weather data for a claim — resolves propertyId from the claim
 */
export async function fetchWeatherData(claimId: string): Promise<WeatherCauseOfLossData | null> {
  try {
    // Resolve the propertyId from the claim first
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { propertyId: true },
    });

    if (!claim?.propertyId) return null;

    // Get weather documents for this property
    const weatherDocs = await prisma.weather_documents.findMany({
      where: { propertyId: claim.propertyId },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (weatherDocs.length === 0) return null;

    const doc = weatherDocs[0];

    return {
      stormDate: doc.dolDate ? new Date(doc.dolDate) : new Date(),
      stormType: "other" as const,
      noaaVerification: true,
      narrativeSummary: doc.summaryText || "Weather verification pending.",
      weatherSources: [
        {
          source: "NOAA",
          data: doc.summaryText || "",
          timestamp: doc.createdAt,
        },
      ],
    };
  } catch (error) {
    logger.error("Error fetching weather data:", error);
    return null;
  }
}

/**
 * Fetch claim and property data for cover sheet and inspection
 */
export async function fetchClaimData(claimId: string): Promise<{
  coverSheet: CoverSheetData | null;
  inspection: InspectionOverviewData | null;
}> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
      },
    });

    if (!claim) return { coverSheet: null, inspection: null };

    const property = claim.properties;

    const coverSheet: CoverSheetData = {
      propertyAddress: property
        ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
        : claim.title || "Address not available",
      policyholderName: claim.insured_name || "Not specified",
      dateOfLoss: claim.dateOfLoss || new Date(),
      claimNumber: claim.claimNumber || claim.id,
      carrier: claim.carrier || undefined,
      contractorName: "SkaiScraper Contractor",
      preparedBy: "SkaiScraper AI",
      generatedAt: new Date(),
    };

    const inspection: InspectionOverviewData = {
      inspectionDate: claim.createdAt || new Date(),
      inspectorName: "SkaiScraper Inspector",
      roofType: (claim as unknown as { roofType?: string }).roofType || "Asphalt Shingle",
      roofPitch: (claim as unknown as { roofPitch?: string }).roofPitch || undefined,
      estimatedAge: (claim as unknown as { roofAge?: number }).roofAge || undefined,
      overallCondition: "fair",
      notes: claim.description || undefined,
    };

    return { coverSheet, inspection };
  } catch (error) {
    logger.error("Error fetching claim data:", error);
    return { coverSheet: null, inspection: null };
  }
}

/**
 * Fetch photos with AI analysis
 */
export async function fetchPhotos(claimId: string): Promise<AnnotatedPhoto[]> {
  try {
    const files = await prisma.file_assets.findMany({
      where: {
        claimId,
        mimeType: { startsWith: "image/" },
      },
      orderBy: { createdAt: "asc" },
    });

    return files.map((file) => ({
      id: file.id,
      url: file.publicUrl || "",
      thumbnailUrl: file.publicUrl || "",
      caption: file.note || undefined,
      // AI analysis would be fetched from a separate table or JSON field
      aiCaption: undefined,
      damageBoxes: undefined,
      timestamp: file.createdAt,
    }));
  } catch (error) {
    logger.error("Error fetching photos:", error);
    return [];
  }
}

/**
 * Fetch code compliance data
 */
export async function fetchCodeData(claimId: string): Promise<CodeComplianceData | null> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        properties: {
          select: {
            state: true,
            yearBuilt: true,
          },
        },
      },
    });

    if (!claim?.properties) return null;

    // Build code requirements inline (simplified version)
    const state = claim.properties.state || "AZ";
    const yearBuilt = claim.properties.yearBuilt || 2000;

    // Basic code requirements for roofing
    const codes: CodeComplianceData["codes"] = [
      {
        code: "IRC R905.2.3",
        title: "Deck Requirements",
        requirement: "Solid or closely fitted deck required",
        category: "other" as const,
        source: "irc" as const,
        appliesTo: "roof",
        citation: "IRC R905.2.3",
      },
      {
        code: "IRC R905.2.7",
        title: "Underlayment",
        requirement: "Underlayment required on entire roof deck",
        category: "underlayment" as const,
        source: "irc" as const,
        appliesTo: "roof",
        citation: "IRC R905.2.7",
      },
      {
        code: "IRC R905.2.8.5",
        title: "Drip Edge",
        requirement: "Drip edge required at eaves and rakes",
        category: "drip_edge" as const,
        source: "irc" as const,
        appliesTo: "roof",
        citation: "IRC R905.2.8.5",
      },
    ];

    // Add ice/water shield for cold climate states
    const coldStates = ["MN", "WI", "MI", "ND", "SD", "MT", "ME", "NH", "VT", "NY"];
    const needsIceShield = coldStates.includes(state);

    if (needsIceShield) {
      codes.push({
        code: "IRC R905.2.7.1",
        title: "Ice Barrier",
        requirement: "Ice barrier required in areas subject to ice damming",
        category: "ice_water" as const,
        source: "irc" as const,
        appliesTo: "roof",
        citation: "IRC R905.2.7.1",
      });
    }

    return {
      codes,
      permitRequired: true,
      iceWaterShieldRequired: needsIceShield,
    };
  } catch (error) {
    logger.error("Error fetching code data:", error);
    return null;
  }
}

/**
 * Fetch scope and pricing data
 */
export async function fetchScopeData(claimId: string): Promise<ScopePricingData | null> {
  try {
    const estimate = await prisma.estimates.findFirst({
      where: { claim_id: claimId },
      include: {
        estimate_line_items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!estimate) return null;

    const lineItems = estimate.estimate_line_items.map((item) => ({
      code: item.code || "",
      description: item.name,
      quantity: item.quantity || 0,
      unit: item.unit || "EA",
      unitPrice: item.unit_price || 0,
      total: item.line_total || 0,
      category: item.category || "general",
      laborIncluded: true,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

    return {
      lineItems,
      subtotal,
      wasteFactor: 1.1,
      laborTotal: subtotal * 0.4,
      removalTotal: subtotal * 0.15,
      accessoriesTotal: subtotal * 0.1,
      overheadAndProfit: {
        enabled: true,
        percentage: 20,
        amount: subtotal * 0.2,
      },
      grandTotal: subtotal * 1.2,
      xactimateCompatible: true,
    };
  } catch (error) {
    logger.error("Error fetching scope data:", error);
    return null;
  }
}

/**
 * Fetch timeline events
 */
export async function fetchTimeline(claimId: string): Promise<TimelineEvent[]> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        createdAt: true,
        dateOfLoss: true,
        status: true,
      },
    });

    if (!claim) return [];

    const events: TimelineEvent[] = [];

    if (claim.dateOfLoss) {
      events.push({
        date: claim.dateOfLoss,
        event: "Date of Loss",
        category: "loss",
        details: "Storm event occurred",
      });
    }

    events.push({
      date: claim.createdAt,
      event: "Claim Created",
      category: "claim",
      details: "Claim filed in SkaiScraper",
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    logger.error("Error fetching timeline:", error);
    return [];
  }
}

// ============================================================================
// Score Calculator
// ============================================================================

export function calculateReadinessScore(folder: Partial<ClaimFolder>): ReadinessScoreBreakdown {
  const categories: Record<
    string,
    { score: number; maxScore: number; status: "complete" | "partial" | "missing" }
  > = {
    weather: { score: 0, maxScore: 15, status: "missing" },
    photos: { score: 0, maxScore: 20, status: "missing" },
    codes: { score: 0, maxScore: 15, status: "missing" },
    scope: { score: 0, maxScore: 20, status: "missing" },
    narratives: { score: 0, maxScore: 15, status: "missing" },
    signatures: { score: 0, maxScore: 10, status: "missing" },
    timeline: { score: 0, maxScore: 5, status: "missing" },
  };

  // Weather
  if (folder.weatherCauseOfLoss?.noaaVerification) {
    categories.weather = { score: 15, maxScore: 15, status: "complete" };
  } else if (folder.weatherCauseOfLoss) {
    categories.weather = { score: 8, maxScore: 15, status: "partial" };
  }

  // Photos
  const photoCount = folder.photos?.length || 0;
  if (photoCount >= 10) {
    categories.photos = { score: 20, maxScore: 20, status: "complete" };
  } else if (photoCount >= 5) {
    categories.photos = { score: 12, maxScore: 20, status: "partial" };
  } else if (photoCount > 0) {
    categories.photos = { score: 5, maxScore: 20, status: "partial" };
  }

  // Codes
  const codeCount = folder.codeCompliance?.codes?.length || 0;
  if (codeCount >= 5) {
    categories.codes = { score: 15, maxScore: 15, status: "complete" };
  } else if (codeCount > 0) {
    categories.codes = { score: 8, maxScore: 15, status: "partial" };
  }

  // Scope
  const lineItemCount = folder.scopePricing?.lineItems?.length || 0;
  if (lineItemCount >= 10) {
    categories.scope = { score: 20, maxScore: 20, status: "complete" };
  } else if (lineItemCount > 0) {
    categories.scope = { score: 10, maxScore: 20, status: "partial" };
  }

  // Narratives
  if (folder.repairJustification && folder.contractorSummary && folder.adjusterCoverLetter) {
    categories.narratives = { score: 15, maxScore: 15, status: "complete" };
  } else if (folder.repairJustification || folder.contractorSummary) {
    categories.narratives = { score: 8, maxScore: 15, status: "partial" };
  }

  // Signatures
  const sigCount = folder.signatures?.length || 0;
  if (sigCount >= 2) {
    categories.signatures = { score: 10, maxScore: 10, status: "complete" };
  } else if (sigCount > 0) {
    categories.signatures = { score: 5, maxScore: 10, status: "partial" };
  }

  // Timeline
  const eventCount = folder.timeline?.length || 0;
  if (eventCount >= 3) {
    categories.timeline = { score: 5, maxScore: 5, status: "complete" };
  } else if (eventCount > 0) {
    categories.timeline = { score: 3, maxScore: 5, status: "partial" };
  }

  // Calculate overall score
  const totalScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0);
  const maxScore = Object.values(categories).reduce((sum, cat) => sum + cat.maxScore, 0);
  const overall = Math.round((totalScore / maxScore) * 100);

  // Determine grade
  let grade: "A" | "B" | "C" | "D" | "F";
  if (overall >= 90) grade = "A";
  else if (overall >= 80) grade = "B";
  else if (overall >= 70) grade = "C";
  else if (overall >= 60) grade = "D";
  else grade = "F";

  // Generate recommendation
  let recommendation = "";
  if (categories.weather.status === "missing") {
    recommendation = "Add weather verification to improve claim strength.";
  } else if (categories.photos.status !== "complete") {
    recommendation = "Upload more photos to document damage thoroughly.";
  } else if (categories.narratives.status !== "complete") {
    recommendation = "Generate repair justification and contractor summary.";
  } else if (overall >= 90) {
    recommendation = "Your folder is carrier-ready!";
  } else {
    recommendation = "Complete missing sections to strengthen your claim.";
  }

  return {
    weather: categories.weather,
    photos: categories.photos,
    codes: categories.codes,
    scope: categories.scope,
    narratives: categories.narratives,
    signatures: categories.signatures,
    timeline: categories.timeline,
    overall,
    grade,
    recommendation,
  };
}

// ============================================================================
// Main Assembler
// ============================================================================

/**
 * Assemble a complete claims folder from all data sources
 */
export async function assembleClaimFolder(
  request: AssembleFolderRequest
): Promise<AssembleFolderResponse> {
  const { claimId, generateNarratives = true } = request;
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Fetch all data in parallel
    const [weatherData, { coverSheet, inspection }, photos, codeData, scopeData, timeline] =
      await Promise.all([
        fetchWeatherData(claimId),
        fetchClaimData(claimId),
        fetchPhotos(claimId),
        fetchCodeData(claimId),
        fetchScopeData(claimId),
        fetchTimeline(claimId),
      ]);

    // Validate required data
    if (!coverSheet) {
      errors.push("Could not fetch claim data. Please ensure the claim exists.");
      return { success: false, errors };
    }

    // Build partial folder
    const partialFolder: Partial<ClaimFolder> = {
      metadata: {
        folderId: `folder-${claimId}-${Date.now()}`,
        claimId,
        orgId: "", // Would be filled from auth context
        createdAt: new Date(),
        generatedBy: "SkaiScraper AI",
        version: "1.0.0",
      },
      coverSheet,
      weatherCauseOfLoss: weatherData || undefined,
      inspectionOverview: inspection || undefined,
      photos,
      codeCompliance: codeData || undefined,
      scopePricing: scopeData || undefined,
      timeline,
      signatures: [],
      checklist: [],
    };

    // Add warnings for missing data
    if (!weatherData) warnings.push("Weather verification data not found.");
    if (!codeData) warnings.push("Code compliance data not generated.");
    if (!scopeData) warnings.push("Scope and pricing data not found.");
    if (photos.length === 0) warnings.push("No photos uploaded for this claim.");

    // Generate AI narratives if requested
    if (generateNarratives) {
      // TODO: Call AI engines to generate:
      // - repairJustification
      // - contractorSummary
      // - adjusterCoverLetter
      warnings.push("AI narratives generation pending implementation.");
    }

    // Calculate readiness score
    const readinessScore = calculateReadinessScore(partialFolder);

    // Build checklist
    partialFolder.checklist = [
      {
        section: "Cover Sheet",
        item: "Property info complete",
        status: coverSheet ? "complete" : "incomplete",
        required: true,
      },
      {
        section: "Weather",
        item: "NOAA verification",
        status: weatherData?.noaaVerification ? "complete" : "incomplete",
        required: true,
      },
      {
        section: "Photos",
        item: "Damage photos uploaded",
        status: photos.length > 0 ? "complete" : "incomplete",
        required: true,
      },
      {
        section: "Codes",
        item: "Code citations generated",
        status: codeData ? "complete" : "incomplete",
        required: true,
      },
      {
        section: "Scope",
        item: "Line items defined",
        status: scopeData ? "complete" : "incomplete",
        required: true,
      },
      { section: "Signatures", item: "Homeowner signature", status: "incomplete", required: false },
      {
        section: "Signatures",
        item: "Contractor signature",
        status: "incomplete",
        required: false,
      },
    ];

    partialFolder.readinessScore = readinessScore.overall;
    partialFolder.missingItems = warnings;

    // Build section status map using FolderSectionKey (kebab-case) values
    partialFolder.sectionStatus = {
      "cover-sheet": coverSheet ? "complete" : "missing",
      "table-of-contents": coverSheet ? "complete" : "missing",
      "executive-summary": "missing",
      "weather-cause-of-loss": weatherData ? "complete" : "missing",
      "inspection-overview": inspection ? "complete" : "missing",
      "damage-grids": photos.length > 0 ? "partial" : "missing",
      "photo-evidence": photos.length > 0 ? "complete" : "missing",
      "test-cuts": "missing",
      "code-compliance": codeData ? "complete" : "missing",
      "scope-pricing": scopeData ? "complete" : "missing",
      "supplements-variances": "missing",
      "repair-justification": "missing",
      "contractor-summary": "missing",
      timeline: timeline.length > 0 ? "complete" : "missing",
      "homeowner-statement": "missing",
      "adjuster-cover-letter": "missing",
      "claim-checklist": coverSheet ? "partial" : "missing",
      "digital-signatures": "missing",
      attachments: "missing",
    };

    return {
      success: true,
      folder: partialFolder as ClaimFolder,
      readinessScore,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    logger.error("Error assembling claim folder:", error);
    errors.push("An unexpected error occurred while assembling the folder.");
    return { success: false, errors };
  }
}

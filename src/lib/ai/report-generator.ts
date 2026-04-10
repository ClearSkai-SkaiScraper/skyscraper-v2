/**
 * UNIVERSAL CLAIMS REPORT GENERATOR
 *
 * Pulls claim data, photos, weather, codes and drops into standardized 10-section layout.
 * Auto-generates 10-20 page PDF with company branding.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { CODE_LIBRARY, UniversalClaimsReport } from "@/types/universal-claims-report";

import { generatePhotoCaptionsBatch } from "./photo-caption-generator";

/**
 * Generate complete universal claims report from claim ID
 */
export async function generateUniversalReport(
  claimId: string,
  userId: string
): Promise<UniversalClaimsReport> {
  logger.debug(`[REPORT_GEN] Starting report generation for claim ${claimId}`);

  // 1. Fetch all required data
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    include: {
      Org: {
        include: {
          contractor_profiles: true,
        },
      },
      properties: true,
    },
  });

  if (!claim) {
    throw new Error(`Claim ${claimId} not found`);
  }

  // Fetch photos from claim_photo_meta
  // TODO: claim_photo_meta model doesn't exist in schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photos: any[] = [];

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  // 2. Fetch weather data for DOL (placeholder - integrate with weather API)
  const weatherData = {
    hailSize: "2.00 inches",
    windSpeed: "65 mph gusts",
    noaaReports: [] as string[],
    noaaWarnings: [] as string[],
    hailSwathMapUrl: "",
    radarLoopUrls: [] as string[],
    hailTravelPath: "Storm system traveled from southwest",
    proximityToAddress: "Within 0.5 miles of property",
    additionalNotes: "Severe thunderstorm warnings issued",
  };

  // 3. Generate AI photo captions
  const photoCaptions = await generatePhotoCaptionsBatch(
    photos.map((photo) => ({
      imageUrl: photo.url || "",
      claimContext: {
        materialType: detectMaterialType(claim),
        materialDetail: claim.properties?.roofType || "Unknown roofing material",
        dateOfLoss: claim.dateOfLoss?.toISOString() || new Date().toISOString(),
        hailSize: weatherData?.hailSize,
        windSpeed: weatherData?.windSpeed,
      },
    }))
  );

  // 4. Build the 10-section report
  const contractorProfile = claim.Org?.contractor_profiles;
  const report: UniversalClaimsReport = {
    id: `report_${Date.now()}`,
    claimId: claim.id,
    version: 1,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // SECTION 1: COVER PAGE
    coverPage: {
      contractorLogo: contractorProfile?.coverPhotoUrl || claim.Org?.brandLogoUrl || "",
      contractorName:
        contractorProfile?.businessName || claim.Org?.name || "ClearSkai Technologies",
      contractorLicenseNumber: contractorProfile?.licenseNumber || "",
      contractorAddress:
        `${claim.properties?.street || ""}, ${claim.properties?.city || ""}, ${claim.properties?.state || ""} ${claim.properties?.zipCode || ""}`.trim(),
      contractorPhone: contractorProfile?.phone || "",
      contractorEmail: contractorProfile?.email || "",

      clientName: claim.properties?.name || claim.insured_name || "",
      propertyAddress:
        `${claim.properties?.street || ""}, ${claim.properties?.city || ""}, ${claim.properties?.state || ""}`.trim(),
      claimNumber: claim.claimNumber || "",
      dateOfLoss: claim.dateOfLoss?.toISOString() || "",

      preparedBy: user?.name || "Inspector",
      preparedByTitle: "Senior Field Ops Manager",
      preparedByPhone: "",
      datePrepared: new Date().toISOString(),

      heroImageUrl: photos[0]?.url || "",
    },

    // SECTION 2: EXECUTIVE SUMMARY
    executiveSummary: {
      stormEvent: {
        hailSize: weatherData?.hailSize || "Unknown",
        windSpeed: weatherData?.windSpeed || "Unknown",
        noaaReports: weatherData?.noaaReports || [],
        hailSwathMapUrl: weatherData?.hailSwathMapUrl || "",
        proximityToAddress: weatherData?.proximityToAddress || "",
      },
      roofCondition: {
        systemType: detectMaterialType(claim),
        systemTypeDetail: claim.properties?.roofType || "Unknown roofing system",
        ageEstimate: claim.properties?.roofAge?.toString() || "Unknown",
        manufacturer: "Unknown",
        colorBlend: "Unknown",
        discontinued: false, // TODO: Auto-detect from AI
        preExistingRepairs: [], // TODO: Extract from photos
      },
      conclusion: generateExecutiveConclusion(claim, weatherData),
    },

    // SECTION 3: DAMAGE SUMMARY
    damageSummary: {
      functionalDamage: {
        crackedTilesCount: 0, // TODO: Count from AI photo analysis
        brokenTilesCount: 0,
        ridgeUplift: false,
        fieldTileFractures: 0,
        underlaymentExposure: false,
        flashingFailure: false,
        masticRepairs: 0,
        otherDamage: [],
      },
      manufacturerIssues: {
        tileDiscontinued: false,
        incompatibleWithModernMolds: false,
        mortarRidgeNoncompliance: false,
        underlaymentBeyondLifeExpectancy: false,
        otherIssues: [],
      },
      codeFailures: generateCodeFailures(claim),
      safetyHazards: ["Water intrusion risk", "Fastener exposure", "Structural underlayment decay"],
    },

    // SECTION 4: DAMAGE PHOTOS
    damagePhotos: photos.map((photo, index) => ({
      photoNumber: index + 1,
      imageUrl: photo.url || "",
      thumbnailUrl: undefined,
      caption: photoCaptions[index],
      timestamp: photo.created_at?.toISOString() || "",
      gpsCoordinates: undefined,
      takenBy: user?.name || "Inspector",
    })),

    // SECTION 5: WEATHER VERIFICATION
    weatherVerification: {
      dateOfLoss: claim.dateOfLoss?.toISOString() || "",
      hailSize: weatherData?.hailSize || "",
      windSpeed: weatherData?.windSpeed || "",
      noaaWarnings: weatherData?.noaaWarnings || [],
      radarLoopUrls: weatherData?.radarLoopUrls || [],
      hailTravelPath: weatherData?.hailTravelPath || "",
      proximityToAddress: weatherData?.proximityToAddress || "",
      additionalNotes: weatherData?.additionalNotes || "",
    },

    // SECTION 6: CODE COMPLIANCE
    codeCompliance: {
      materialType: detectMaterialType(claim),
      codes: generateDetailedCodeCompliance(claim),
    },

    // SECTION 7: SYSTEM FAILURE ANALYSIS
    systemFailureAnalysis: generateSystemFailureAnalysis(claim),

    // SECTION 8: SCOPE OF WORK
    scopeOfWork: generateScopeOfWork(claim),

    // SECTION 9: PROFESSIONAL OPINION
    professionalOpinion: generateProfessionalOpinion(claim),

    // SECTION 10: SIGNATURES & CONTACT
    signaturesAndContact: {
      inspectorName: user?.name || "Inspector",
      inspectorPosition: "Senior Field Ops Manager",
      inspectorPhone: "",
      inspectorEmail: user?.email || "",
      inspectorLicenseNumber: "",

      companyName:
        claim.Org?.contractor_profiles?.businessName || claim.Org?.name || "ClearSkai Technologies",
      companyAddress: "",
      companyPhone: claim.Org?.contractor_profiles?.phone || "",
      companyEmail: claim.Org?.contractor_profiles?.email || "",
      companyWebsite: claim.Org?.contractor_profiles?.website || "",

      qrCodeUrl: `https://skaiscrape.com/portal?claim=${claim.claimNumber}`,
    },
  };

  logger.debug(`[REPORT_GEN] Report generation complete for claim ${claimId}`);
  return report;
}

/**
 * Detect material type from claim data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectMaterialType(claim: any): "tile" | "shingle" | "metal" | "tpo" {
  const roofType = (claim.properties?.roofType || "").toLowerCase();

  if (roofType.includes("tile") || roofType.includes("concrete")) return "tile";
  if (roofType.includes("shingle") || roofType.includes("asphalt")) return "shingle";
  if (roofType.includes("metal")) return "metal";
  if (roofType.includes("tpo") || roofType.includes("membrane")) return "tpo";

  return "shingle"; // Default
}

/**
 * Generate executive summary conclusion
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateExecutiveConclusion(claim: any, weatherData: any): string {
  return `Following a comprehensive inspection of the property at ${claim.properties?.address || claim.properties?.street || "the subject property"}, conducted after the ${weatherData?.hailSize || "hail"} storm event on ${claim.dateOfLoss?.toISOString().split("T")[0] || "the date of loss"}, this roof has sustained functional damage requiring full replacement.

The existing ${claim.properties?.roofType || "roofing"} system shows systemic failure across multiple components. Spot repairs are not feasible due to discontinued materials, code violations, and the extent of damage affecting the roof's weatherproofing integrity.

A full roof replacement is the only viable solution to restore the property to code-compliant, warrantable condition.`;
}

/**
 * Generate code failure list
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateCodeFailures(claim: any): Array<{ code: string; description: string }> {
  const materialType = detectMaterialType(claim);
  const codes = CODE_LIBRARY[materialType] || [];

  return codes.map((code) => ({
    code,
    description: `Observed conditions do not meet requirements specified in ${code}`,
  }));
}

/**
 * Generate detailed code compliance analysis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateDetailedCodeCompliance(claim: any) {
  const materialType = detectMaterialType(claim);

  // Template compliance items based on material type
  if (materialType === "tile") {
    return [
      {
        codeReference: "IRC R903",
        codeRequirement:
          "Roof assemblies shall be designed and installed to resist wind uplift and prevent moisture intrusion",
        conditionObserved: "Multiple tile fractures with exposed underlayment",
        whyFailed: "Compromised weatherproofing barrier allows water penetration",
        requiredCorrection: "Complete roof system replacement with code-compliant underlayment",
      },
      {
        codeReference: "IRC R905.3",
        codeRequirement:
          "Tile roofing shall be installed per manufacturer specifications with proper fastening",
        conditionObserved: "Ridge system deteriorated, tiles improperly secured",
        whyFailed: "Does not meet manufacturer installation requirements",
        requiredCorrection: "Install new tile system with compliant ridge and fastening",
      },
    ];
  }

  // Add other material types...
  return [];
}

/**
 * Generate system failure analysis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateSystemFailureAnalysis(claim: any) {
  return {
    whyRoofFailed: `The roof system failed due to storm damage on ${claim.dateOfLoss?.toISOString().split("T")[0] || "the date of loss"}. The ${claim.properties?.roofType || "roofing material"} sustained impact damage that compromised the weatherproofing membrane and structural integrity of the assembly.`,

    whyPatchingImpossible:
      "Spot repairs are not viable because the damage is systemic across the entire roof plane. Isolated repairs would create a non-uniform system with mismatched materials, voiding manufacturer warranties.",

    discontinuedMaterialsImpact:
      "The original roofing material is no longer manufactured. Replacement tiles are unavailable, and substitute products do not match the profile, dimensions, or color of the existing system.",

    underlaymentExposureMatters:
      "Exposed underlayment degrades rapidly under UV exposure and loses its waterproofing capability. This creates immediate risk of water intrusion and interior damage.",

    waterEntryRisk:
      "The compromised roof assembly allows water to penetrate the structure, leading to mold growth, wood rot, insulation damage, and potential structural failure if left unaddressed.",

    mixingTilesViolation:
      "Installing new tiles alongside existing tiles of different manufacture violates IRC requirements for uniform roof assemblies and voids all manufacturer warranties.",

    liabilityAndHomeownerRisk:
      "A partially repaired roof system leaves the homeowner liable for future failures and exposes the property to uninsurable risk. Only a complete replacement restores code compliance and warranty protection.",
  };
}

/**
 * Generate scope of work
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateScopeOfWork(claim: any) {
  return {
    lineItems: [
      {
        item: "1. Complete Roof System Removal",
        description: "Remove and dispose of entire existing roof covering down to deck",
      },
      {
        item: "2. Deck Inspection and Repair",
        description: "Inspect roof deck for damage, replace deteriorated sections as needed",
      },
      {
        item: "3. Underlayment Installation",
        description: "Install new code-compliant synthetic or self-adhering underlayment system",
      },
      {
        item: "4. Flashing Replacement",
        description: "Replace all valley, penetration, and transition flashings with new materials",
      },
      {
        item: "5. Ridge System Installation",
        description:
          "Install new foam-backed ridge system with proper ventilation and anchor points",
      },
      {
        item: "6. Primary Roofing Material",
        description: `Install new ${claim.properties?.roofType || "roofing material"} per manufacturer specifications`,
      },
      {
        item: "7. Accessory Components",
        description: "Install all required bird stops, eave closures, and edge terminations",
      },
      {
        item: "8. Final Inspection and Warranty",
        description: "Complete final inspection and provide manufacturer warranty documentation",
      },
    ],
  };
}

/**
 * Generate professional opinion
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function generateProfessionalOpinion(claim: any) {
  return {
    functionalDamageStatement: `This roof has sustained functional damage that prevents it from performing its intended purpose of weatherproofing the structure.`,

    discontinuedMaterialsStatement: `The original roofing materials are discontinued and unavailable for matching repairs.`,

    codeViolationsStatement: `The existing conditions violate multiple building code requirements including IRC R903 and material-specific provisions.`,

    partialRepairStatement: `Partial repairs would create a non-warrantable system with mismatched materials that violates code and manufacturer requirements.`,

    fullReplacementStatement: `Complete roof replacement is the only feasible remedy that restores the property to code-compliant, warrantable condition.`,

    currentPaymentStatement: `The current insurance payment is insufficient to address the full scope of damage and required corrections.`,

    requestStatement: `We respectfully request a supplemental re-inspection and approval for full roof system replacement as documented in this report.`,
  };
}

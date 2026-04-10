/**
 * OFFICIAL CLEARSKAI RESIDENTIAL CLAIMS HANDLING SYSTEM
 * Universal Layout — AI-Ready — Auto-Generated — Clean & Consistent
 *
 * This is the master template that SkaiScraper uses for every claim, every time.
 */

// ============================================================================
// 1. COVER PAGE
// ============================================================================

export interface ReportCoverPage {
  // Company Branding (auto-pulled from CRM org profile)
  contractorLogo: string; // URL to logo
  contractorName: string;
  contractorLicenseNumber: string;
  contractorAddress: string;
  contractorPhone: string;
  contractorEmail: string;

  // Client Info (auto-pulled from claim)
  clientName: string;
  propertyAddress: string;
  claimNumber: string;
  dateOfLoss: string; // ISO date string

  // Report Info
  preparedBy: string; // Inspector name
  preparedByTitle: string; // e.g., "Senior Field Ops Manager"
  preparedByPhone: string;
  datePrepared: string; // ISO date string

  // Hero Image
  heroImageUrl: string; // Main photo of property
}

// ============================================================================
// 2. EXECUTIVE SUMMARY (1-PAGE)
// ============================================================================

export interface ReportExecutiveSummary {
  // A. Storm Event Confirmation
  stormEvent: {
    hailSize: string; // e.g., "2.00 inches"
    windSpeed: string; // e.g., "65 mph gusts"
    noaaReports: string[]; // Array of official report URLs
    hailSwathMapUrl: string; // Screenshot of hail path near address
    proximityToAddress: string; // e.g., "0.3 miles from property"
  };

  // B. Overall Roof Condition
  roofCondition: {
    systemType: "tile" | "shingle" | "metal" | "tpo" | "other";
    systemTypeDetail: string; // e.g., "Concrete S-Tile"
    ageEstimate: string; // e.g., "25+ years"
    manufacturer: string; // e.g., "Westlake Royal"
    colorBlend: string; // e.g., "Terra Cotta Blend"
    discontinued: boolean;
    discontinuedDetails?: string;
    preExistingRepairs: string[]; // e.g., ["Mastic repairs visible", "Mortar ridge deterioration"]
  };

  // C. Conclusion
  conclusion: string; // Multi-paragraph conclusion explaining why full replacement is required
}

// ============================================================================
// 3. DAMAGE SUMMARY PAGE (THE INSURANCE KILLER PAGE)
// ============================================================================

export interface ReportDamageSummary {
  // A. Functional Damage
  functionalDamage: {
    crackedTilesCount?: number;
    brokenTilesCount?: number;
    ridgeUplift: boolean;
    ridgeUpliftDescription?: string;
    fieldTileFractures: number;
    underlaymentExposure: boolean;
    flashingFailure: boolean;
    masticRepairs: number;
    shingleDamageAtTransitions?: boolean;
    otherDamage: string[]; // Free-form array
  };

  // B. Manufacturer Issues
  manufacturerIssues: {
    tileDiscontinued: boolean;
    discontinuedDimensions?: string;
    discontinuedModel?: string;
    incompatibleWithModernMolds: boolean;
    mortarRidgeNoncompliance: boolean;
    underlaymentBeyondLifeExpectancy: boolean;
    otherIssues: string[];
  };

  // C. Code Failures (auto-pulled based on material type)
  codeFailures: {
    code: string; // e.g., "IRC R903"
    description: string;
  }[];

  // D. Safety Hazards
  safetyHazards: string[]; // e.g., ["Water intrusion risk", "Fastener exposure"]
}

// ============================================================================
// 4. FULL DAMAGE PHOTO SECTION (AUTO-CAPTIONED)
// ============================================================================

export interface ReportDamagePhoto {
  photoNumber: number;
  imageUrl: string;
  thumbnailUrl?: string;

  // AI-Generated Caption
  caption: {
    materialType: string; // e.g., "Concrete S-Tile"
    damageType: string; // e.g., "Impact fracture"
    functionalImpact: string; // e.g., "Exposes underlayment to UV degradation and water penetration"
    applicableCode: string; // e.g., "IRC R905.3 - Tile roofing requirements"
    dolTieIn: string; // e.g., "Consistent with 2-inch hail impact on 8/15/2024"
  };

  // Metadata
  timestamp: string; // ISO date string
  gpsCoordinates?: { lat: number; lng: number };
  takenBy: string; // Inspector name
  highlightBoxes?: { x: number; y: number; width: number; height: number }[]; // Auto-highlighted damage areas
}

// ============================================================================
// 5. WEATHER VERIFICATION SECTION
// ============================================================================

export interface ReportWeatherVerification {
  dateOfLoss: string;
  hailSize: string;
  windSpeed: string;
  noaaWarnings: string[]; // Array of warning text
  radarLoopUrls: string[]; // Screenshots of radar
  hailTravelPath: string; // Description
  proximityToAddress: string;
  additionalNotes: string;
}

// ============================================================================
// 6. BUILDING CODE & COMPLIANCE PAGE
// ============================================================================

export interface ReportCodeCompliance {
  materialType: "tile" | "shingle" | "metal" | "tpo";

  // Essential Codes Referenced (Auto-Detect Based on Material)
  codes: {
    codeReference: string; // e.g., "IRC R903"
    codeRequirement: string; // What the code says
    conditionObserved: string; // What we found
    whyFailed: string; // Why it doesn't comply
    requiredCorrection: string; // What must be done
  }[];
}

// ============================================================================
// 7. SYSTEM FAILURE ANALYSIS PAGE
// ============================================================================

export interface ReportSystemFailureAnalysis {
  whyRoofFailed: string; // Multi-paragraph explanation
  whyPatchingImpossible: string;
  discontinuedMaterialsImpact: string;
  underlaymentExposureMatters: string;
  waterEntryRisk: string;
  mixingTilesViolation: string;
  liabilityAndHomeownerRisk: string;
}

// ============================================================================
// 8. FULL REPLACEMENT SCOPE OF WORK
// ============================================================================

export interface ReportScopeOfWork {
  lineItems: {
    item: string; // e.g., "Tear off entire existing roof system"
    description: string;
    quantity?: string;
    unit?: string;
  }[];
}

// ============================================================================
// 9. FINAL PROFESSIONAL OPINION & REQUEST
// ============================================================================

export interface ReportProfessionalOpinion {
  functionalDamageStatement: string;
  discontinuedMaterialsStatement: string;
  codeViolationsStatement: string;
  partialRepairStatement: string;
  fullReplacementStatement: string;
  currentPaymentStatement: string;
  requestStatement: string; // Request supplemental re-inspection & full roof replacement
}

// ============================================================================
// 10. SIGNATURES & CONTACT PAGE
// ============================================================================

export interface ReportSignaturesAndContact {
  inspectorName: string;
  inspectorPosition: string;
  inspectorPhone: string;
  inspectorEmail: string;
  inspectorLicenseNumber: string;

  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;

  qrCodeUrl?: string; // QR code to CRM portal for status
  homeownerSignatureUrl?: string; // If signed
  homeownerSignatureDate?: string;
}

// ============================================================================
// MASTER UNIVERSAL CLAIMS REPORT
// ============================================================================

export interface UniversalClaimsReport {
  id: string; // Report ID
  claimId: string; // Reference to claims table
  version: number; // Version number for revisions
  status: "draft" | "under_review" | "finalized" | "submitted";

  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  submittedAt?: string;

  // 10 Sections
  coverPage: ReportCoverPage;
  executiveSummary: ReportExecutiveSummary;
  damageSummary: ReportDamageSummary;
  damagePhotos: ReportDamagePhoto[];
  weatherVerification: ReportWeatherVerification;
  codeCompliance: ReportCodeCompliance;
  systemFailureAnalysis: ReportSystemFailureAnalysis;
  scopeOfWork: ReportScopeOfWork;
  professionalOpinion: ReportProfessionalOpinion;
  signaturesAndContact: ReportSignaturesAndContact;

  // PDF Generation
  pdfUrl?: string; // Generated PDF URL
  pdfGeneratedAt?: string;
}

// ============================================================================
// AI GENERATION CONTEXT
// ============================================================================

export interface ReportGenerationContext {
  claimId: string;
  orgId: string;
  userId: string;

  // Data Sources
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claimData: any; // Full claim record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photos: any[]; // All claim photos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weatherData: any; // Weather API data for DOL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  organizationProfile: any; // Company branding & info

  // AI Preferences
  toneOfVoice: "assertive" | "technical" | "balanced"; // Never use "may" or "possible"
  photoAnnotation: boolean; // Auto-highlight damage in photos
  codeDetection: "auto" | "manual"; // Auto-detect codes based on material
}

// ============================================================================
// AI PHOTO CAPTION RULES
// ============================================================================

export const AI_PHOTO_CAPTION_RULES = {
  mentionMaterialType: true,
  identifyDamageType: true,
  stateFunctionalImpact: true,
  attachApplicableCode: true,
  neverSayMayOrPossible: true, // Always assert facts
  tieEveryPhotoToDOL: true,
  useActiveVoice: true, // "This tile fractured" not "This tile may have fractured"
};

// ============================================================================
// CODE LIBRARY BY MATERIAL TYPE
// ============================================================================

export const CODE_LIBRARY = {
  tile: [
    "IRC R903 - Weather Protection",
    "IRC R905.3 - Clay and Concrete Tile",
    "R908.1 - General Requirements",
    "TRI/NRCA 2.6 - Tile Roof Underlayment",
    "TRI/NRCA 3.10 - Ridge Ventilation",
    "Manufacturer Requirements (Westlake, Eagle, Boral)",
  ],
  shingle: [
    "IRC R905.2.8.2 - Asphalt Shingle Underlayment",
    "R905.2.8.3 - Ice Barrier",
    "Starter Course Requirements",
    "Underlayment / Drip Edge",
    "Nailing Patterns",
    "IBC 1507 - Roofing Requirements",
  ],
  metal: [
    "IRC R905.10 - Metal Roof Panels",
    "IRC R905.10.2 - Deck Requirements",
    "Manufacturer Installation Specifications",
    "Fastener Pattern Requirements",
  ],
  tpo: [
    "IRC R905.12 - Thermoplastic Single-Ply Roofing",
    "IRC R905.12.2 - Material Standards",
    "Membrane Seam Requirements",
    "Attachment Requirements",
  ],
};

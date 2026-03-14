/**
 * Claims-Ready Folder Schema
 * TypeScript types for the carrier-compliant claim packet assembly system
 */

import { z } from "zod";

// ============================================================================
// Core Section Types
// ============================================================================

export interface ClaimFolderMetadata {
  folderId: string;
  claimId: string;
  orgId: string;
  createdAt: Date;
  generatedBy: string;
  version: string;
}

export interface CoverSheetData {
  propertyAddress: string;
  policyholderName: string;
  insured_name?: string; // alias for policyholderName
  policyNumber?: string;
  dateOfLoss: Date;
  claimNumber: string;
  carrier?: string;
  contractorName: string;
  contractorLicense?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  preparedBy: string;
  generatedAt: Date;
}

export interface WeatherCauseOfLossData {
  stormDate: Date;
  stormType: "hail" | "wind" | "tornado" | "hurricane" | "other";
  hailSize?: string; // e.g., "1.25 inch"
  windSpeed?: number; // mph
  stormSwathMap?: string; // URL to map image
  noaaVerification: boolean;
  localStationConfirmation?: string;
  distanceFromProperty?: number; // miles
  narrativeSummary: string;
  weatherSources: Array<{
    source: string;
    data: string;
    timestamp: Date;
  }>;
}

export interface InspectionOverviewData {
  inspectionDate: Date;
  inspectorName: string;
  roofType: string;
  roofPitch?: string;
  estimatedAge?: number;
  layers?: number;
  slopeCount?: number;
  accessPoints?: string[];
  softMetalsPresent?: boolean;
  accessoriesImpacted?: string[];
  overallCondition: "good" | "fair" | "poor" | "critical";
  notes?: string;
}

export interface DamageGridData {
  elevations: Array<{
    direction: "north" | "east" | "south" | "west";
    hitCount?: number;
    creasePatterns?: boolean;
    brittleTestResult?: "pass" | "fail";
    mechanicalDamage?: boolean;
    spatterDirection?: string;
    damagePercentage?: number;
  }>;
  totalAffectedArea?: number; // sq ft
  damagePattern: "random" | "directional" | "concentrated";
}

export interface AnnotatedPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  aiCaption?: {
    materialType: string;
    damageType: string;
    functionalImpact: string;
    applicableCode?: string;
    dolTieIn?: string;
  };
  damageBoxes?: Array<{
    x: number; // 0-1 relative
    y: number;
    w: number;
    h: number;
    label: string;
    confidence?: number;
    severity?: "minor" | "moderate" | "severe";
  }>;
  elevation?: string;
  timestamp?: Date;
  exifData?: Record<string, string>;
}

export interface CodeComplianceData {
  codes: Array<{
    code: string; // e.g., "IRC R905.2.7"
    title: string;
    requirement: string;
    category:
      | "underlayment"
      | "flashing"
      | "ventilation"
      | "fasteners"
      | "ice_water"
      | "drip_edge"
      | "valley"
      | "other";
    source: "irc" | "local" | "manufacturer";
    appliesTo: string;
    citation?: string;
  }>;
  localAmendments?: string[];
  permitRequired: boolean;
  permitFees?: number;
  highWindZone?: boolean;
  iceWaterShieldRequired?: boolean;
}

export interface ScopeLineItem {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: string;
  wasteFactor?: number;
  laborIncluded: boolean;
  notes?: string;
}

export interface ScopePricingData {
  lineItems: ScopeLineItem[];
  subtotal: number;
  wasteFactor: number;
  laborTotal: number;
  removalTotal: number;
  accessoriesTotal: number;
  steepCharges?: number;
  safetyCharges?: number;
  permitFees?: number;
  overheadAndProfit?: {
    enabled: boolean;
    percentage: number;
    amount: number;
    justification?: string;
  };
  grandTotal: number;
  xactimateCompatible: boolean;
}

export interface RepairJustificationData {
  narrative: string;
  reasons: string[];
  brittleTestFailed?: boolean;
  patternDamageAcrossElevations?: boolean;
  spotRepairInfeasible: boolean;
  matchingConcerns?: string[];
  manufacturerDiscontinued?: boolean;
  localOrdinanceTriggers?: string[];
}

export interface ContractorSummaryData {
  companyName: string;
  contactName: string;
  license: string;
  phone: string;
  email: string;
  whyReplacementRequired: string;
  scopeOverview: string;
  complianceNeeds: string[];
  safetyIssues?: string[];
  matchingConcerns?: string[];
  estimatedDuration?: string;
  warrantyOffered?: string;
}

export interface TimelineEvent {
  date: Date;
  event: string;
  category: "loss" | "inspection" | "weather" | "claim" | "adjuster" | "supplement" | "other";
  details?: string;
  documentRef?: string;
}

export interface HomeownerStatementData {
  statementText: string;
  homeownerName: string;
  signedAt?: Date;
  ipAddress?: string;
  digitalSignature?: string;
  witnessName?: string;
}

export interface AdjusterCoverLetterData {
  adjusterName?: string;
  carrierName: string;
  claimNumber: string;
  dateOfLoss: Date;
  propertyAddress: string;
  letterBody: string;
  attachmentsList: string[];
  senderName: string;
  senderTitle: string;
}

export interface ClaimChecklistItem {
  section: string;
  item: string;
  status: "complete" | "incomplete" | "not_applicable";
  required: boolean;
  notes?: string;
}

export interface DigitalSignature {
  signerName: string;
  signerRole: "contractor" | "homeowner" | "witness";
  signedAt: Date;
  ipAddress?: string;
  signatureData?: string; // Base64 or URL
}

// ============================================================================
// Master Folder Schema
// ============================================================================

export interface ClaimFolder {
  metadata: ClaimFolderMetadata;

  // Core sections
  coverSheet: CoverSheetData;
  weatherCauseOfLoss?: WeatherCauseOfLossData;
  inspectionOverview?: InspectionOverviewData;
  damageGrids?: DamageGridData;
  photos: AnnotatedPhoto[];
  codeCompliance?: CodeComplianceData;
  scopePricing?: ScopePricingData;

  // AI-generated narratives
  repairJustification?: RepairJustificationData;
  contractorSummary?: ContractorSummaryData;
  adjusterCoverLetter?: AdjusterCoverLetterData;

  // Timeline & signatures
  timeline: TimelineEvent[];
  homeownerStatement?: HomeownerStatementData;
  signatures: DigitalSignature[];

  // Validation
  checklist: ClaimChecklistItem[];
  readinessScore: number; // 0-100
  missingItems: string[];

  // Section completion tracking
  sectionStatus?: Record<string, SectionStatus>;

  // Export files
  exportFiles?: Array<{
    name: string;
    type: "pdf" | "docx" | "zip" | "esx";
    url?: string;
    generatedAt?: Date;
  }>;
}

// ============================================================================
// Readiness Score Calculation
// ============================================================================

export interface ReadinessScoreBreakdown {
  weather: { score: number; maxScore: number; status: "complete" | "partial" | "missing" };
  photos: { score: number; maxScore: number; status: "complete" | "partial" | "missing" };
  codes: { score: number; maxScore: number; status: "complete" | "partial" | "missing" };
  scope: { score: number; maxScore: number; status: "complete" | "partial" | "missing" };
  narratives: { score: number; maxScore: number; status: "complete" | "partial" | "missing" };
  signatures: { score: number; maxScore: number; status: "complete" | "partial" | "missing" };
  timeline: { score: number; maxScore: number; status: "complete" | "partial" | "missing" };
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  recommendation: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AssembleFolderRequest {
  claimId: string;
  includeSections?: string[];
  generateNarratives?: boolean;
  includeHomeownerStatement?: boolean;
}

export interface AssembleFolderResponse {
  success: boolean;
  folder?: ClaimFolder;
  readinessScore?: ReadinessScoreBreakdown;
  errors?: string[];
  warnings?: string[];
}

export interface ExportFolderRequest {
  folderId: string;
  format: "pdf" | "docx" | "zip" | "esx";
  includeSections?: string[];
  carrierFormat?: string;
}

export interface ExportFolderResponse {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  error?: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const AssembleFolderRequestSchema = z.object({
  claimId: z.string().min(1),
  includeSections: z.array(z.string()).optional(),
  generateNarratives: z.boolean().optional().default(true),
  includeHomeownerStatement: z.boolean().optional().default(false),
});

export const ExportFolderRequestSchema = z.object({
  folderId: z.string().min(1),
  format: z.enum(["pdf", "docx", "zip", "esx"]),
  includeSections: z.array(z.string()).optional(),
  carrierFormat: z.string().optional(),
});

// ============================================================================
// Section Keys for Navigation
// ============================================================================

export const FOLDER_SECTIONS = {
  COVER_SHEET: "cover-sheet",
  TABLE_OF_CONTENTS: "table-of-contents",
  EXECUTIVE_SUMMARY: "executive-summary",
  WEATHER_CAUSE_OF_LOSS: "weather-cause-of-loss",
  INSPECTION_OVERVIEW: "inspection-overview",
  DAMAGE_GRIDS: "damage-grids",
  PHOTO_EVIDENCE: "photo-evidence",
  TEST_CUTS: "test-cuts",
  CODE_COMPLIANCE: "code-compliance",
  SCOPE_PRICING: "scope-pricing",
  SUPPLEMENTS_VARIANCES: "supplements-variances",
  REPAIR_JUSTIFICATION: "repair-justification",
  CONTRACTOR_SUMMARY: "contractor-summary",
  TIMELINE: "timeline",
  HOMEOWNER_STATEMENT: "homeowner-statement",
  ADJUSTER_COVER_LETTER: "adjuster-cover-letter",
  CLAIM_CHECKLIST: "claim-checklist",
  DIGITAL_SIGNATURES: "digital-signatures",
  ATTACHMENTS: "attachments",
} as const;

export type FolderSectionKey = (typeof FOLDER_SECTIONS)[keyof typeof FOLDER_SECTIONS];

// Legacy aliases for backward compatibility
export type FolderSection =
  | "coverSheet"
  | "weatherCauseOfLoss"
  | "annotatedPhotos"
  | "codeCompliance"
  | "scopePricing"
  | "repairJustification"
  | "causeOfLossNarrative"
  | "timeline"
  | "homeownerStatement"
  | "priorCondition"
  | "vendorNetwork"
  | "supplementHistory"
  | "communicationLog"
  | "carrierCoverLetter"
  | "legalProtection"
  | "badFaithIndicators"
  | "auditTrail";

export type SectionStatus = "complete" | "partial" | "missing" | "generating";

export const SECTION_METADATA: Record<
  FolderSectionKey,
  {
    title: string;
    description: string;
    required: boolean;
    icon: string;
  }
> = {
  [FOLDER_SECTIONS.COVER_SHEET]: {
    title: "Cover Sheet",
    description: "Property info, policyholder, claim details",
    required: true,
    icon: "FileText",
  },
  [FOLDER_SECTIONS.TABLE_OF_CONTENTS]: {
    title: "Table of Contents",
    description: "Auto-generated document index",
    required: false,
    icon: "List",
  },
  [FOLDER_SECTIONS.EXECUTIVE_SUMMARY]: {
    title: "Executive Summary",
    description: "AI-generated claim overview",
    required: true,
    icon: "FileSignature",
  },
  [FOLDER_SECTIONS.WEATHER_CAUSE_OF_LOSS]: {
    title: "Weather & Cause of Loss",
    description: "NOAA verification, storm data, timeline",
    required: true,
    icon: "CloudLightning",
  },
  [FOLDER_SECTIONS.INSPECTION_OVERVIEW]: {
    title: "Inspection Overview",
    description: "Roof type, pitch, age, condition",
    required: true,
    icon: "ClipboardCheck",
  },
  [FOLDER_SECTIONS.DAMAGE_GRIDS]: {
    title: "Elevation & Damage Grids",
    description: "Damage mapping by direction",
    required: false,
    icon: "Grid3X3",
  },
  [FOLDER_SECTIONS.PHOTO_EVIDENCE]: {
    title: "Annotated Photo Set",
    description: "AI-labeled photos with damage markers",
    required: true,
    icon: "Camera",
  },
  [FOLDER_SECTIONS.TEST_CUTS]: {
    title: "Test Cuts / Cores / Measurements",
    description: "Core samples, test cuts, and measurement documentation",
    required: false,
    icon: "Ruler",
  },
  [FOLDER_SECTIONS.CODE_COMPLIANCE]: {
    title: "Code Compliance",
    description: "IRC citations, local codes, permits",
    required: true,
    icon: "Scale",
  },
  [FOLDER_SECTIONS.SCOPE_PRICING]: {
    title: "Xactimate-Ready Scope",
    description: "Line items, quantities, pricing",
    required: true,
    icon: "DollarSign",
  },
  [FOLDER_SECTIONS.SUPPLEMENTS_VARIANCES]: {
    title: "Supplements & Variances",
    description: "Additional items not in original carrier scope",
    required: false,
    icon: "PlusCircle",
  },
  [FOLDER_SECTIONS.REPAIR_JUSTIFICATION]: {
    title: "Repair Justification",
    description: "AI narrative for full replacement",
    required: true,
    icon: "FileWarning",
  },
  [FOLDER_SECTIONS.CONTRACTOR_SUMMARY]: {
    title: "Contractor Summary",
    description: "Why replacement, compliance, matching",
    required: true,
    icon: "HardHat",
  },
  [FOLDER_SECTIONS.TIMELINE]: {
    title: "Timeline of Events",
    description: "Chronological claim history",
    required: false,
    icon: "Calendar",
  },
  [FOLDER_SECTIONS.HOMEOWNER_STATEMENT]: {
    title: "Homeowner Statement",
    description: "Digitally signed attestation",
    required: false,
    icon: "UserCheck",
  },
  [FOLDER_SECTIONS.ADJUSTER_COVER_LETTER]: {
    title: "Adjuster Cover Letter",
    description: "Professional introduction letter",
    required: false,
    icon: "Mail",
  },
  [FOLDER_SECTIONS.CLAIM_CHECKLIST]: {
    title: "Claim Checklist",
    description: "Carrier-friendly completion status",
    required: false,
    icon: "CheckSquare",
  },
  [FOLDER_SECTIONS.DIGITAL_SIGNATURES]: {
    title: "Digital Signatures",
    description: "Contractor & homeowner e-signs",
    required: false,
    icon: "PenTool",
  },
  [FOLDER_SECTIONS.ATTACHMENTS]: {
    title: "Attachments Index",
    description: "Supporting documents manifest",
    required: false,
    icon: "Paperclip",
  },
};

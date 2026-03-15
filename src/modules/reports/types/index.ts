// ============================================================================
// UNIVERSAL CONTRACTOR PACKET - TYPE DEFINITIONS
// ============================================================================

export type SectionKey =
  | "cover"
  | "toc"
  | "executive-summary"
  | "adjuster-notes"
  | "weather-verification"
  | "photo-evidence"
  | "test-cuts"
  | "scope-matrix"
  | "code-compliance"
  | "pricing-comparison"
  | "supplements"
  | "signature-page"
  | "attachments-index"
  | "retail-proposal"
  | "customer-details"
  | "material-selections"
  | "payment-schedule"
  | "warranty-terms"
  | "material-estimate"
  | "project-timeline"
  | "visual-mockups";

export type ExportFormat = "pdf" | "docx" | "zip";

export interface BrandingConfig {
  logoUrl?: string;
  brandColor: string;
  accentColor: string;
  companyName: string;
  licenseNumber?: string;
  website?: string;
  phone: string;
  email: string;
  headshotUrl?: string;
  address?: string;
}

export interface ReportMetadata {
  reportId: string;
  claimNumber?: string;
  policyNumber?: string;
  dateOfLoss?: string;
  adjusterName?: string;
  inspectionDate?: string;
  propertyAddress: string;
  clientName: string;
  carrierName?: string;
  preparedBy: string;
  submittedDate: string;
}

export interface WeatherData {
  dateOfLoss: string;
  hailSize?: string;
  windSpeed?: string;
  source: string;
  verificationStatement: string;
  mapUrls?: string[];
}

export interface PhotoItem {
  id: string;
  url: string;
  caption: string;
  category?: string; // "soft-metals" | "field" | "collateral" | "interior" | "test-cuts"
  locationTag?: string;
  takenAt?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  contractorPrice: number;
  carrierPrice?: number;
  status?: "approved" | "pending" | "denied" | "new";
  variance?: number;
}

export interface CodeCitation {
  code: string;
  description: string;
  jurisdictionType: "IRC" | "IBC" | "Local" | "Manufacturer";
  requirementText: string;
}

export interface SupplementItem {
  description: string;
  reasonCode: string;
  amount: number;
  justification: string;
  attachments?: string[];
}

export interface Section {
  key: SectionKey;
  title: string;
  icon?: string;
  enabled: boolean;
  order: number;
  requiredDataKeys: string[];
  renderFn: (context: ReportContext) => Promise<void> | void;
}

export interface ReportContext {
  reportId?: string; // Add for AI section lookup
  orgId?: string; // For audit logging
  userId?: string; // For audit logging
  userName?: string; // For audit logging
  jobId?: string; // For audit logging
  branding: BrandingConfig;
  metadata: ReportMetadata;
  weather?: WeatherData;
  photos?: PhotoItem[];
  lineItems?: LineItem[];
  codes?: CodeCitation[];
  supplements?: SupplementItem[];
  adjusterNotes?: string;
  executiveSummary?: string;
  testCutsData?: any;
  pricingComparison?: any;
  attachments?: Array<{ name: string; url: string }>;
  homeowner?: { name?: string; email?: string; phone?: string };
  testCuts?: Array<{ location?: string; size?: string; layers?: string; findings?: string }>;
  warrantyTerms?: Array<{ term: string; duration: string; description: string }>;
  materials?: Array<{ name?: string; brand?: string; color?: string; quantity?: number }>;
  paymentSchedule?: Array<{
    phase?: string;
    name?: string;
    percentage?: number;
    amount?: number;
    description?: string;
  }>;
  retailProposal?: {
    propertyAddress?: string;
    scopeSummary?: string;
    total?: number;
    timeline?: string;
    validUntil?: string;
    notes?: string;
  };
}

export interface ExportOptions {
  reportId: string;
  userId: string;
  format: ExportFormat;
  sections: SectionKey[];
  context: ReportContext;
  blockOnUnapproved?: boolean; // Block export if unapproved AI fields
}

export type ExportErrorCode =
  | "MISSING_BRANDING"
  | "EMPTY_SECTION"
  | "AI_UNAPPROVED"
  | "DATA_PROVIDER_EMPTY"
  | "UNSUPPORTED_FORMAT"
  | "UNKNOWN";

export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  buffer?: Buffer;
  error?: string;
  errorCode?: ExportErrorCode;
  hint?: string;
}

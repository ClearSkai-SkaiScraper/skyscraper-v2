/**
 * PDF Generation Types
 *
 * Shared types for PDF/report generation across the platform.
 * These types eliminate `any` usage in pdf/ and reports/ libraries.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Branding Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFBranding {
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLicense?: string;
  logoUrl?: string;
  brandColor?: string;
  accentColor?: string;
  employeeName?: string;
  employeeTitle?: string;
  employeeEmail?: string;
  employeePhone?: string;
  headshotUrl?: string;
  coverPhotoUrl?: string;
  tagline?: string;
  rocNumber?: string;
}

export interface OrgBranding extends PDFBranding {
  orgId: string;
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFSection {
  id: string;
  title: string;
  content?: string;
  paragraphs?: string[];
  enabled?: boolean;
  order?: number;
}

export interface PDFSectionData {
  sections?: PDFSection[];
  addons?: Record<string, unknown>;
  ai?: Record<string, PDFAISection>;
}

export interface PDFAISection {
  trigger?: string;
  run?: () => Promise<unknown>;
  content?: string;
  paragraphs?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFReport {
  id: string;
  title: string;
  type?: string;
  sections?: PDFSection[];
  metadata?: Record<string, unknown>;
}

export interface PDFReportContext {
  reports?: PDFReport[];
  branding?: PDFBranding;
  sections?: string[];
  addons?: Record<string, unknown>;
  ai?: Record<string, PDFAISection>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Generation Context
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFContext {
  reports?: PDFReport[];
  branding?: PDFBranding;
  sections?: string[];
  addons?: Record<string, unknown>;
  ai?: Record<string, PDFAISection>;
  claim?: PDFClaimData;
  property?: PDFPropertyData;
  weather?: PDFWeatherData;
}

export interface PDFClaimData {
  id: string;
  claimNumber?: string;
  status?: string;
  dateOfLoss?: string | Date;
  homeownerName?: string;
  homeownerEmail?: string;
  homeownerPhone?: string;
  propertyAddress?: string;
  insuranceCarrier?: string;
  policyNumber?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  exposureCents?: number;
  photos?: PDFPhotoData[];
}

export interface PDFPropertyData {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  yearBuilt?: number;
  roofType?: string;
  roofAge?: number;
  squareFootage?: number;
}

export interface PDFWeatherData {
  eventDate?: string | Date;
  eventType?: string;
  maxWindSpeed?: number;
  maxHailSize?: number;
  precipitation?: number;
  temperature?: number;
  conditions?: string;
  source?: string;
  verified?: boolean;
}

export interface PDFPhotoData {
  url: string;
  caption?: string;
  category?: string;
  aiAnalysis?: string;
  annotations?: PDFAnnotation[];
}

export interface PDFAnnotation {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  color?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFTemplate {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  layout?: PDFLayout;
  sections?: PDFSection[];
  styles?: PDFStyles;
}

export interface PDFLayout {
  orientation?: "portrait" | "landscape";
  pageSize?: "letter" | "a4" | "legal";
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  columns?: number;
}

export interface PDFStyles {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
  headerStyle?: Record<string, string | number>;
  bodyStyle?: Record<string, string | number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFExportOptions {
  format?: "pdf" | "html" | "docx";
  quality?: "draft" | "standard" | "high";
  includePhotos?: boolean;
  includeAnnotations?: boolean;
  watermark?: string;
  password?: string;
}

export interface PDFExportResult {
  success: boolean;
  url?: string;
  buffer?: Buffer;
  error?: string;
  metadata?: {
    pageCount?: number;
    fileSize?: number;
    generatedAt?: Date;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props Types (for React-PDF)
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFDocumentProps {
  context: PDFContext;
  template?: PDFTemplate;
  branding?: PDFBranding;
}

export interface PDFPageProps {
  children: React.ReactNode;
  style?: Record<string, unknown>;
  size?: string | [number, number];
  orientation?: "portrait" | "landscape";
}

export interface PDFHeaderProps {
  branding?: PDFBranding;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export interface PDFFooterProps {
  pageNumber?: number;
  totalPages?: number;
  companyName?: string;
  showDate?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Weather Report Specific Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatherReportData {
  claim: PDFClaimData;
  property: PDFPropertyData;
  weather: PDFWeatherData;
  events?: WeatherEvent[];
  analysis?: WeatherAnalysis;
}

export interface WeatherEvent {
  date: string | Date;
  type: string;
  severity?: string;
  windSpeed?: number;
  hailSize?: number;
  details?: string;
}

export interface WeatherAnalysis {
  summary?: string;
  damageCorrelation?: string;
  riskAssessment?: string;
  recommendations?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Justification Report Types
// ─────────────────────────────────────────────────────────────────────────────

export interface JustificationReportData {
  claim: PDFClaimData;
  findings: JustificationFinding[];
  recommendations: string[];
  totalEstimate?: number;
}

export interface JustificationFinding {
  area: string;
  damage: string;
  severity: string;
  repairCost?: number;
  photos?: PDFPhotoData[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cover Page Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CoverPageData {
  title: string;
  subtitle?: string;
  reportDate?: string | Date;
  preparedFor?: string;
  preparedBy?: string;
  branding?: PDFBranding;
  property?: PDFPropertyData;
  claim?: PDFClaimData;
  coverPhotoUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Builder Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionBuilder {
  id: string;
  name: string;
  build: (data: PDFContext) => PDFSection | null;
  order: number;
  required?: boolean;
}

export interface SectionRegistry {
  sections: Map<string, SectionBuilder>;
  register: (builder: SectionBuilder) => void;
  get: (id: string) => SectionBuilder | undefined;
  getAll: () => SectionBuilder[];
  buildAll: (data: PDFContext) => PDFSection[];
}

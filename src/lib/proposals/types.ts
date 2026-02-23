/**
 * PHASE 3 SPRINT 3: Proposals & Claims-Ready Packets
 * Type definitions for proposal system
 */

export interface ProposalContext {
  org: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
    subdomain: string | null;
    fontFamily: string;
  };
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    carrier: string | null;
    policyNumber: string | null;
    claimNumber: string | null;
  };
  job: {
    id: string;
    title: string;
    description: string | null;
    propertyType: string | null;
    lossType: string | null;
    lossDate: Date | null;
    sqft: number | null;
    stories: number | null;
    status: string;
    createdAt: Date;
  };
  evidence: Array<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    caption: string | null;
    uploadedAt: Date;
  }>;
  weather: {
    summary: string | null;
    windMph: number | null;
    precipIn: number | null;
    tempF: number | null;
    reportDate: Date | null;
  } | null;
  dol: {
    summary: string | null;
    causation: string | null;
    recommendations: string | null;
    reportDate: Date | null;
  } | null;
}

export interface AIDraftSections {
  summary: string;
  scope: string;
  terms: string;
  notes: string;
}

export type PacketType = "retail" | "claims" | "contractor";
export type ProposalStatus = "draft" | "rendered" | "published";
export type TemplateVersion = "retail/v1" | "claims/v1" | "contractor/v1";
export type TonePreset = "homeowner" | "gc" | "carrier" | "pa-legal";

export interface ProposalBuildRequest {
  leadId: string;
  jobId: string;
  packetType: PacketType;
  tone?: TonePreset; // Optional tone preset for AI-generated content
}

export interface ProposalBuildResponse {
  draftId: string;
  ai: AIDraftSections;
  context: ProposalContext;
}

export interface ProposalRenderRequest {
  draftId: string;
  template: TemplateVersion;
  options?: {
    includeEvidence?: boolean;
    maxEvidenceImages?: number;
    includeWeather?: boolean;
    includeDol?: boolean;
  };
}

export interface ProposalRenderResponse {
  proposalId: string;
  fileId: string;
  pdfUrl: string;
  pages: number;
  fileSize: number;
}

export interface ProposalPublishRequest {
  emailRecipients?: string[];
  message?: string;
}

export interface ProposalPublishResponse {
  success: boolean;
  publishedAt: Date;
  emailsSent?: number;
}

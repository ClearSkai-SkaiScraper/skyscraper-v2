/**
 * Export Payloads
 *
 * Functions to build payloads for various export types
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ExportPayload {
  type: string;
  data: Record<string, any>;
  format: "pdf" | "xlsx" | "csv" | "docx";
  filename: string;
}

export interface EmailDraftPayload {
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
  }>;
}

export interface EstimatePacketPayload {
  claim: any;
  estimates: any;
  lineItems: any[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  opEnabled: boolean;
  opPercent: number;
  opAmount: number;
  grandTotal: number;
}

export interface ReportPacketPayload {
  claim: any;
  report: any;
  damageAssessments: any[];
  weatherReports: any[];
  estimates: any[];
  supplements: any[];
  scopes: any[];
}

export interface SupplementPacketPayload {
  claim: any;
  supplements: any;
  headline: string;
  summary: string;
  keyItems: any[];
  totalRequested: number;
  nextSteps: string[];
  lineItems: any[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  opEnabled: boolean;
  opPercent: number;
  opAmount: number;
  grandTotal: number;
}

export interface HomeownerReportPayload {
  claim: any;
  headline: string;
  summary: string;
  keyFindings: string[];
  nextSteps: string[];
}

/**
 * Generate estimate email draft payload
 */
export function generateEstimateDraftPayload(
  estimate: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: { includeAttachments?: boolean }
): EmailDraftPayload {
  logger.debug("[ExportPayloads] Generating estimate draft");
  return {
    subject: `Estimate for ${estimate.claimNumber || "Claim"}`,
    body: "Estimate details would be here.",
    attachments: [],
  };
}

/**
 * Generate export payload
 */
export function generateExportPayload(type: string, data: Record<string, any>): ExportPayload {
  return {
    type,
    data,
    format: "pdf",
    filename: `export_${Date.now()}.pdf`,
  };
}

/**
 * Build estimate packet payload for export
 */
export async function buildEstimatePacketPayload(
  estimateId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId: string | null
): Promise<EstimatePacketPayload> {
  const estimate = await prisma.estimates.findUnique({
    where: { id: estimateId },
    include: {
      claims: {
        include: {
          properties: true,
        },
      },
    },
  });

  if (!estimate) {
    return {
      claim: null,
      estimates: null,
      lineItems: [],
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      opEnabled: false,
      opPercent: 0,
      opAmount: 0,
      grandTotal: 0,
    };
  }

  // Parse line items from estimate data
  const data = (estimate.scopeItems as any) || {};
  const lineItems = data.lineItems || [];
  const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
  const taxRate = data.taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const opEnabled = data.opEnabled || false;
  const opPercent = data.opPercent || 10;
  const opAmount = opEnabled ? (subtotal + taxAmount) * (opPercent / 100) : 0;
  const grandTotal = subtotal + taxAmount + opAmount;

  return {
    claim: estimate.claims,
    estimates: estimate,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    opEnabled,
    opPercent,
    opAmount,
    grandTotal,
  };
}

/**
 * Build adjuster packet payload for export
 */
export function buildAdjusterPacketPayload(
  claim: Record<string, any>,
  adjusterInfo: Record<string, any>,
  options?: { includePhotos?: boolean; includeDocs?: boolean }
): ExportPayload {
  logger.debug(
    `[EXPORT_PAYLOADS] Building adjuster packet for claim ${claim.id || claim.claimNumber}`
  );
  return {
    type: "adjuster_packet",
    data: { claim, adjuster: adjusterInfo, ...options },
    format: "pdf",
    filename: `adjuster_packet_${claim.claimNumber || claim.id}_${Date.now()}.pdf`,
  };
}

/**
 * Build homeowner summary payload
 */
export async function buildHomeownerSummaryPayload(
  reportId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId: string | null
): Promise<HomeownerReportPayload> {
  const report = await prisma.reports.findUnique({
    where: { id: reportId },
    include: {
      claims: {
        include: {
          properties: true,
        },
      },
    },
  });

  if (!report) {
    return {
      claim: null,
      headline: "Report Not Found",
      summary: "",
      keyFindings: [],
      nextSteps: [],
    };
  }

  const meta = (report.meta as any) || {};

  return {
    claim: report.claims,
    headline: meta.headline || report.title || "Damage Assessment Report",
    summary: meta.summary || "",
    keyFindings: meta.keyFindings || [],
    nextSteps: meta.nextSteps || ["Contact your insurance company", "Schedule repairs"],
  };
}

/**
 * Build report adjuster payload
 */
export async function buildReportAdjusterPayload(
  reportId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId: string | null
): Promise<ReportPacketPayload> {
  const report = await prisma.reports.findUnique({
    where: { id: reportId },
    include: {
      claims: {
        include: {
          properties: true,
          damage_assessments: true,
          weather_reports: true,
          estimates: true,
          supplements: true,
          scopes: true,
        },
      },
    },
  });

  if (!report) {
    return {
      claim: null,
      report: null,
      damageAssessments: [],
      weatherReports: [],
      estimates: [],
      supplements: [],
      scopes: [],
    };
  }

  return {
    claim: report.claims,
    report,
    damageAssessments: report.claims?.damage_assessments || [],
    weatherReports: report.claims?.weather_reports || [],
    estimates: report.claims?.estimates || [],
    supplements: report.claims?.supplements || [],
    scopes: report.claims?.scopes || [],
  };
}

/**
 * Build supplement packet payload
 */
export async function buildSupplementPacketPayload(
  supplementId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId: string | null
): Promise<SupplementPacketPayload> {
  const supplement = await prisma.supplements.findUnique({
    where: { id: supplementId },
    include: {
      claims: {
        include: {
          properties: true,
        },
      },
      supplement_items: true,
    },
  });

  if (!supplement) {
    return {
      claim: null,
      supplements: null,
      headline: "Supplement Not Found",
      summary: "",
      keyItems: [],
      totalRequested: 0,
      nextSteps: [],
      lineItems: [],
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      opEnabled: false,
      opPercent: 0,
      opAmount: 0,
      grandTotal: 0,
    };
  }

  const scopeData = (supplement.scope_items as any) || {};
  const lineItems = supplement.supplement_items || [];
  const subtotal =
    lineItems.reduce((sum: number, item: any) => sum + (item.amount_cents || 0), 0) / 100;
  const taxRate = supplement.tax_rate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const opEnabled = supplement.op_type !== null;
  const opPercent = supplement.op_percent || 10;
  const opAmount = opEnabled ? (subtotal + taxAmount) * (opPercent / 100) : 0;
  const grandTotal = subtotal + taxAmount + opAmount;

  return {
    claim: supplement.claims,
    supplements: supplement,
    headline: scopeData.headline || supplement.claim_number || "Supplement Request",
    summary: scopeData.summary || supplement.notes || "",
    keyItems: lineItems.slice(0, 5),
    totalRequested: grandTotal,
    nextSteps: scopeData.nextSteps || ["Carrier review pending", "Follow up in 5-7 business days"],
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    opEnabled,
    opPercent,
    opAmount,
    grandTotal,
  };
}

/**
 * Build supplement homeowner payload
 */
export async function buildSupplementHomeownerPayload(
  supplementId: string,
  orgId: string | null
): Promise<SupplementPacketPayload> {
  return buildSupplementPacketPayload(supplementId, orgId);
}

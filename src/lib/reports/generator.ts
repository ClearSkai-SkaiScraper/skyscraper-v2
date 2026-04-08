/**
 * Report Generator Engine
 *
 * Generate professional PDF reports for claims, jobs, estimates
 * Support for charts, tables, photos, branding
 */

import { BRAND_PRIMARY } from "@/lib/constants/branding";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type ReportType =
  | "CLAIM_SUMMARY"
  | "JOB_COMPLETION"
  | "ESTIMATE"
  | "INVOICE"
  | "INSPECTION"
  | "PROGRESS"
  | "FINANCIAL";

export interface ReportConfig {
  type: ReportType;
  title: string;
  resourceId: string;
  orgId: string;
  includePhotos?: boolean;
  includeFinancials?: boolean;
  customSections?: ReportSection[];
}

export interface ReportSection {
  title: string;
  content: string | ReportTable | ReportChart;
  type: "TEXT" | "TABLE" | "CHART" | "PHOTOS";
}

export interface ReportTable {
  headers: string[];
  rows: string[][];
}

export interface ReportChart {
  type: "BAR" | "LINE" | "PIE";
  data: { label: string; value: number }[];
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  url: string;
  generatedAt: Date;
  expiresAt?: Date;
}

/**
 * Generate report
 */
export async function generateReport(config: ReportConfig): Promise<GeneratedReport> {
  try {
    // Collect data based on report type
    const data = await collectReportData(config);

    // Apply report template
    const sections = await buildReportSections(config, data);

    // Generate PDF
    const pdfUrl = await generatePDF({
      title: config.title,
      orgId: config.orgId,
      sections,
      branding: await getOrgBranding(config.orgId),
    });

    // Store report record
    const report = await storeReport({
      type: config.type,
      title: config.title,
      resourceId: config.resourceId,
      orgId: config.orgId,
      url: pdfUrl,
    });

    return report;
  } catch (error) {
    logger.error("Report generation failed:", error);
    throw new Error("Failed to generate report");
  }
}

/**
 * Collect data for report
 */
async function collectReportData(config: ReportConfig) {
  switch (config.type) {
    case "CLAIM_SUMMARY":
      return await collectClaimData(config.resourceId);
    case "JOB_COMPLETION":
      return await collectJobData(config.resourceId);
    case "ESTIMATE":
      return await collectEstimateData(config.resourceId);
    case "INVOICE":
      return await collectInvoiceData(config.resourceId);
    case "INSPECTION":
      return await collectInspectionData(config.resourceId);
    default:
      return {};
  }
}

/**
 * Collect claim data
 */
async function collectClaimData(claimId: string) {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: {
          include: { contacts: true },
        },
      },
    });

    if (!claim) return {};

    const jobs = await prisma.jobs.findMany({
      where: { claimId },
      orderBy: { createdAt: "desc" },
    });

    // Flatten contact from properties for template compatibility
    const contact = claim.properties?.contacts ?? null;
    return { ...claim, contact, jobs };
  } catch {
    return {};
  }
}

/**
 * Collect job data
 */
async function collectJobData(jobId: string) {
  try {
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
    });

    if (!job) return {};

    const claim = job.claimId
      ? await prisma.claims.findUnique({
          where: { id: job.claimId },
          include: {
            properties: {
              include: { contacts: true },
            },
          },
        })
      : null;

    // Flatten contact from properties for template compatibility
    const contact = claim?.properties?.contacts ?? null;
    return { ...job, claim: claim ? { ...claim, contact } : null };
  } catch {
    return {};
  }
}

/**
 * Collect estimate data
 */
async function collectEstimateData(estimateId: string) {
  // TODO: Implement when estimates table exists
  return {};
}

/**
 * Collect invoice data
 */
async function collectInvoiceData(invoiceId: string) {
  // TODO: Implement when invoices table exists
  return {};
}

/**
 * Collect inspection data
 */
async function collectInspectionData(inspectionId: string) {
  // TODO: Implement when inspections table exists
  return {};
}

/**
 * Build report sections
 */
async function buildReportSections(config: ReportConfig, data: any): Promise<ReportSection[]> {
  const sections: ReportSection[] = [];

  // Custom sections
  if (config.customSections) {
    sections.push(...config.customSections);
  }

  // Type-specific sections
  switch (config.type) {
    case "CLAIM_SUMMARY":
      sections.push(
        {
          title: "Claim Information",
          content: formatClaimInfo(data),
          type: "TEXT",
        },
        {
          title: "Jobs",
          content: formatJobsTable(data.jobs || []),
          type: "TABLE",
        }
      );
      break;

    case "JOB_COMPLETION":
      sections.push({
        title: "Job Details",
        content: formatJobInfo(data),
        type: "TEXT",
      });

      if (config.includePhotos && data.photos) {
        sections.push({
          title: "Photos",
          content: formatPhotosSection(data.photos),
          type: "PHOTOS",
        });
      }
      break;
  }

  return sections;
}

/**
 * Format claim info
 */
function formatClaimInfo(claim: any): string {
  return `
Claim Number: ${claim.claimNumber || "N/A"}
Status: ${claim.status}
Loss Type: ${claim.lossType || "N/A"}
Loss Date: ${claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "N/A"}

Insured: ${claim.insured_name || "N/A"}
Property: ${claim.properties?.address || "N/A"}
Contact: ${claim.contact?.email || "N/A"}

Insurance Carrier: ${claim.carrier || "N/A"}
Policy Number: ${claim.policy_number || "N/A"}
  `.trim();
}

/**
 * Format job info
 */
function formatJobInfo(job: any): string {
  return `
Job Title: ${job.title}
Status: ${job.status}
Scheduled: ${job.scheduledStart || "Not scheduled"}
Completed: ${job.completedAt || "In progress"}

Estimated Cost: $${job.estimatedCost || 0}
Actual Cost: $${job.actualCost || 0}

Description:
${job.description || "No description"}
  `.trim();
}

/**
 * Format jobs table
 */
function formatJobsTable(jobs: any[]): ReportTable {
  return {
    headers: ["Job Title", "Status", "Cost", "Scheduled"],
    rows: jobs.map((job) => [
      job.title,
      job.status,
      `$${job.estimatedCost || 0}`,
      job.scheduledStart || "TBD",
    ]),
  };
}

/**
 * Format photos section
 */
function formatPhotosSection(photos: any[]): string {
  return photos.map((p) => p.url).join("\n");
}

/**
 * Get org branding including cover page canvas data
 */
async function getOrgBranding(orgId: string) {
  try {
    const [org, branding] = await Promise.all([
      prisma.org.findUnique({ where: { id: orgId } }),
      prisma.org_branding.findFirst({ where: { orgId } }).catch(() => null),
    ]);

    // Try to fetch cover page canvas data
    let coverPageData = null;
    try {
      const coverPageResult = await prisma.$queryRaw<{ data: string }[]>`
        SELECT cover_page_data as data FROM org_branding WHERE "orgId" = ${orgId}
      `;
      if (coverPageResult?.[0]?.data) {
        coverPageData = JSON.parse(coverPageResult[0].data);
      }
    } catch {
      // Column may not exist yet - that's OK
    }

    return {
      name: branding?.companyName || org?.name || "SkaiScraper",
      logo: branding?.logoUrl || org?.brandLogoUrl || null,
      teamPhoto: branding?.teamPhotoUrl || null,
      primaryColor: branding?.colorPrimary || BRAND_PRIMARY,
      accentColor: branding?.colorAccent || null,
      slogan: branding?.slogan || null,
      coverPage: coverPageData, // Canvas elements, backgroundColor, backgroundImage
    };
  } catch {
    return {
      name: "SkaiScraper",
      logo: null,
      teamPhoto: null,
      primaryColor: BRAND_PRIMARY,
      accentColor: null,
      slogan: null,
      coverPage: null,
    };
  }
}

/**
 * Generate PDF
 */
async function generatePDF(data: {
  title: string;
  orgId: string;
  sections: ReportSection[];
  branding: any;
}): Promise<string> {
  // TODO: Integrate with PDF library (react-pdf, pdfkit, puppeteer)

  logger.debug(
    `[PDF_GEN] Generating PDF Report | Title: ${data.title} | Sections: ${data.sections.length} | Branding: ${data.branding.name}`
  );

  // Mock URL - in production, upload to S3 and return URL
  return `https://storage.example.com/reports/${Date.now()}.pdf`;
}

/**
 * Store report record
 */
async function storeReport(data: {
  type: ReportType;
  title: string;
  resourceId: string;
  orgId: string;
  url: string;
}): Promise<GeneratedReport> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry

    return {
      id: `report_${Date.now()}`,
      type: data.type,
      title: data.title,
      url: data.url,
      generatedAt: new Date(),
      expiresAt,
    };
  } catch (error) {
    throw new Error("Failed to store report");
  }
}

/**
 * Get generated reports
 */
export async function getReports(orgId: string, limit: number = 20) {
  void orgId;
  void limit;
  return [];
}

/**
 * Delete expired reports
 */
export async function cleanupExpiredReports(): Promise<number> {
  return 0;
}

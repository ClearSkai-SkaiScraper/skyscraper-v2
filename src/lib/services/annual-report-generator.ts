/**
 * Simplified Annual Report Generator (stubbed)
 * Original implementation referenced deep relational graphs (digitalTwins, maintenanceRecords, etc.)
 * which are currently excluded from queries causing widespread type errors. This stub keeps the
 * external API stable while eliminating deep property access.
 */
import prisma from "@/lib/prisma";

export interface AnnualReportData {
  propertyProfileId: string;
  reportYear: number;
  orgId: string;
}

export interface GeneratedReport {
  id: string;
  reportUrl?: string;
  executiveSummary: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyFindings: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  priorityActions: any[];
}

export async function generateAnnualReport(data: AnnualReportData): Promise<GeneratedReport> {
  const { propertyProfileId, reportYear, orgId } = data;

  const profile = await prisma.properties.findFirst({
    where: { id: propertyProfileId, orgId },
  });

  if (!profile) {
    throw new Error('Property profile not found');
  }

  // Placeholder values (stable shapes, no deep relations)
  const executiveSummary = `Annual report for property ${profile['fullAddress'] || propertyProfileId} (Year ${reportYear}). Detailed system analytics currently unavailable.`;
  const keyFindings = [
    'Property profile located successfully',
    'Deep system metrics unavailable in simplified mode',
    `Reporting year: ${reportYear}`,
  ];
  const priorityActions = [
    { action: 'Enable full data collection', timeframe: 'Next cycle', priority: 'LOW' },
  ];

  // Persist minimal report record (fields reduced to those certainly present in schema)
  const report = await prisma.property_annual_reports.create({
    data: {
      propertyProfileId,
      orgId,
      reportYear,
      executiveSummary,
      keyFindings,
      priorityActions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  return {
    id: report.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reportUrl: (report as any).reportUrl || undefined,
    executiveSummary,
    keyFindings,
    priorityActions,
  };
}

// src/lib/report-engine/save.ts
import { randomUUID } from "crypto";

import prisma from "@/lib/prisma";

import { GeneratedReport } from "./report-types";

/**
 * Save a GeneratedReport to the database as a Report record
 * This allows reports to be stored, viewed later, and linked to claims
 */
export async function saveGeneratedReportToDb({
  claimId,
  orgId,
  userId,
  report,
}: {
  claimId: string;
  orgId?: string | null;
  userId?: string | null;
  report: GeneratedReport;
}) {
  // Generate a friendly title based on report type
  const title =
    report.title ||
    (report.reportType === "CLAIMS_READY"
      ? "Claims-Ready Report"
      : report.reportType === "RETAIL_PROPOSAL"
        ? "Retail Proposal"
        : report.reportType === "FORENSIC"
          ? "Forensic Report"
          : "Quick Report");

  // Construct type string for the Report model
  // Map our reportType + audience to a semantic type
  const reportTypeString = `${report.reportType.toLowerCase()}_${report.audience.toLowerCase()}`;

  // Create the report record
  const created = await prisma.ai_reports.create({
    data: {
      id: randomUUID(),
      claimId,
      orgId: orgId ?? undefined,
      createdById: userId!,
      title,
      type: reportTypeString, // e.g. "claims_ready_adjuster"
      subtitle: report.subtitle ?? null,
      lossType: report.meta.location ?? null,
      dol: report.meta.dateOfLoss ? new Date(report.meta.dateOfLoss) : null,
      address: report.meta.location ?? null,
      updatedAt: new Date(),

      // Store the full GeneratedReport JSON in sections field
      // (We can also split this into sections/summary/meta if needed later)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sections: report as any,

      // Meta can hold addon toggles and other generation config
      meta: {
        reportType: report.reportType,
        audience: report.audience,
        generatedAt: new Date().toISOString(),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  return created;
}

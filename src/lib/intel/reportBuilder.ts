import { logger } from "@/lib/logger";

/**
 * Report Builder - Generate reports
 * Stub file for legacy imports
 */

export interface ReportResult {
  id: string;
  content: string;
}

/**
 * Generate report
 * @deprecated Use report AI functions instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateReport(claim_id: string): Promise<ReportResult> {
  logger.warn('generateReport is deprecated');
  return {
    id: 'stub',
    content: ''
  };
}

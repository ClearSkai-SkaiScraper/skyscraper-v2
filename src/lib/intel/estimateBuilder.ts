import { logger } from "@/lib/logger";

/**
 * Estimate Builder - Generate estimates
 * Stub file for legacy imports
 */

export interface EstimateResult {
  total: number;
  lineItems: any[];
}

/**
 * Generate estimate
 * @deprecated Use estimate AI functions instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateEstimate(claim_id: string): Promise<EstimateResult> {
  logger.warn('generateEstimate is deprecated');
  return {
    total: 0,
    lineItems: []
  };
}

import { logger } from "@/lib/logger";

/**
 * Xactimate Parser Stub
 *
 * TODO: Implement Xactimate ESX/XML file parsing
 * This is a placeholder to allow builds to succeed
 */

export interface XactimateLineItem {
  category: string;
  selector: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface XactimateParseResult {
  success: boolean;
  claimNumber?: string;
  insured?: string;
  dateOfLoss?: string;
  lineItems: XactimateLineItem[];
  grandTotal: number;
  errors: string[];
}

/**
 * Parse Xactimate ESX file
 * Stub implementation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function parseXactimateFile(file: File | Blob): Promise<XactimateParseResult> {
  logger.debug("[XactimateParser] Stub: Would parse Xactimate file");
  return {
    success: false,
    lineItems: [],
    grandTotal: 0,
    errors: ["Xactimate parsing not yet implemented"],
  };
}

/**
 * Parse Xactimate XML content
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseXactimateXML(content: string): XactimateParseResult {
  logger.debug("[XactimateParser] Stub: Would parse Xactimate XML");
  return {
    success: false,
    lineItems: [],
    grandTotal: 0,
    errors: ["Xactimate XML parsing not yet implemented"],
  };
}

/**
 * Convert Xactimate line items to claim format
 */
export function convertToClaimFormat(items: XactimateLineItem[]): Record<string, any>[] {
  return items.map((item) => ({
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
  }));
}

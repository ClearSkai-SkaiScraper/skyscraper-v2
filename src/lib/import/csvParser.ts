import { logger } from "@/lib/logger";

/**
 * CSV Parser Stub
 *
 * TODO: Implement full CSV parsing for claim imports
 * This is a placeholder to allow builds to succeed
 */

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  success: boolean;
  rows: ParsedRow[];
  headers: string[];
  errors: string[];
  rowCount: number;
}

export interface LineItem {
  code?: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  category?: string;
}

/**
 * Parse CSV content
 * Stub implementation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseCSV(content: string): ParseResult {
  logger.debug("[CSVParser] Stub: Would parse CSV content");
  return {
    success: true,
    rows: [],
    headers: [],
    errors: [],
    rowCount: 0,
  };
}

/**
 * Parse CSV file
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function parseCSVFile(file: File | Blob): Promise<ParseResult> {
  logger.debug("[CSVParser] Stub: Would parse CSV file");
  return parseCSV("");
}

/**
 * Validate CSV structure
 */
export function validateCSVStructure(
  headers: string[],
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter((f) => !headers.includes(f));
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate line items - stub
 */
export function validateLineItems(items: LineItem[]): { valid: boolean; errors: string[] } {
  logger.debug(`[CSVParser] Validating ${items.length} line items`);
  return { valid: true, errors: [] };
}

/**
 * Normalize category - stub
 */
export function normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  const mappings: Record<string, string> = {
    roofing: "Roofing",
    siding: "Siding",
    gutters: "Gutters",
    windows: "Windows",
    general: "General",
  };
  return mappings[normalized] || category;
}

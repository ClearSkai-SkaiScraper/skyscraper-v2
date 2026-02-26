/**
 * CSV Exporter (Sprint 8.1)
 *
 * Generic utility to convert arrays of objects into CSV format.
 * Used across claims, invoices, contacts, and pipeline exports.
 *
 * @example
 * const csv = toCsv(claims, ['claimNumber', 'homeownerName', 'status']);
 * downloadCsv(csv, 'claims-export.csv');
 */

export interface CsvColumn<T> {
  /** The key on each row object */
  key: keyof T & string;
  /** Display header (defaults to key) */
  header?: string;
  /** Optional formatter */
  format?: (value: unknown, row: T) => string;
}

/**
 * Convert an array of objects to a CSV string.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: (CsvColumn<T> | (keyof T & string))[],
  options?: { delimiter?: string; includeHeader?: boolean }
): string {
  const { delimiter = ",", includeHeader = true } = options ?? {};

  const cols: CsvColumn<T>[] = columns.map((col) =>
    typeof col === "string" ? { key: col, header: col } : col
  );

  const lines: string[] = [];

  if (includeHeader) {
    lines.push(cols.map((c) => escapeCell(c.header ?? c.key)).join(delimiter));
  }

  for (const row of rows) {
    const cells = cols.map((col) => {
      const raw = row[col.key];
      const formatted = col.format ? col.format(raw, row) : String(raw ?? "");
      return escapeCell(formatted);
    });
    lines.push(cells.join(delimiter));
  }

  return lines.join("\n");
}

/**
 * Escape a cell value for CSV (RFC 4180).
 */
function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger a browser download of a CSV string.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Filter rows by date range (inclusive).
 */
export function filterByDateRange<T extends Record<string, unknown>>(
  rows: T[],
  dateKey: keyof T & string,
  start?: Date | string,
  end?: Date | string
): T[] {
  return rows.filter((row) => {
    const val = row[dateKey];
    if (!val) return false;
    const date = new Date(val as string);
    if (start && date < new Date(start)) return false;
    if (end && date > new Date(end)) return false;
    return true;
  });
}

/**
 * Common date formatter for CSV cells.
 */
export function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Common currency formatter for CSV cells.
 */
export function formatCurrency(value: unknown): string {
  if (value == null) return "$0.00";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

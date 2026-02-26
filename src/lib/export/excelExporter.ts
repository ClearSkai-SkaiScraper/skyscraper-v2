/**
 * Excel (XLSX) Exporter stub (Sprint 8.1)
 *
 * Lightweight wrapper that will use the `xlsx` or `exceljs` package
 * when installed. Falls back to CSV download if not available.
 *
 * For now, this provides the interface. Install exceljs later for
 * full XLSX support with formatting, multiple sheets, and styling.
 */

import { downloadCsv, toCsv, type CsvColumn } from "./csvExporter";

export interface ExcelSheet<T extends Record<string, unknown>> {
  name: string;
  rows: T[];
  columns: (CsvColumn<T> | (keyof T & string))[];
}

/**
 * Export data as XLSX. Falls back to CSV if exceljs is not installed.
 */
export async function downloadExcel<T extends Record<string, unknown>>(
  sheets: ExcelSheet<T>[],
  filename: string
): Promise<void> {
  try {
    // Dynamic import — only loads if exceljs is installed
    // @ts-expect-error - exceljs is an optional dependency, fallback to CSV if not installed
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    for (const sheet of sheets) {
      const ws = workbook.addWorksheet(sheet.name);
      const cols = sheet.columns.map((col) =>
        typeof col === "string" ? { key: col, header: col } : col
      );

      // Header row
      ws.columns = cols.map((c) => ({
        header: c.header ?? c.key,
        key: c.key,
        width: 20,
      }));

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF147BFF" },
      };
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Data rows
      for (const row of sheet.rows) {
        const rowData: Record<string, string> = {};
        for (const col of cols) {
          const raw = row[col.key];
          rowData[col.key] = col.format ? col.format(raw, row) : String(raw ?? "");
        }
        ws.addRow(rowData);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    // Fallback to CSV if exceljs not installed
    console.warn("exceljs not available — falling back to CSV export");
    if (sheets.length > 0) {
      const first = sheets[0];
      const csv = toCsv(first.rows, first.columns);
      downloadCsv(csv, filename.replace(".xlsx", ".csv"));
    }
  }
}

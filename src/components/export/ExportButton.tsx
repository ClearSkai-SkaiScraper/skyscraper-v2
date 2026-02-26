/**
 * ExportButton — Reusable CSV/Excel export trigger (Sprint 8.1)
 *
 * Drop-in button that can be placed on any list page
 * to export the current data view.
 *
 * @example
 * <ExportButton
 *   data={claims}
 *   columns={[
 *     { key: 'claimNumber', header: 'Claim #' },
 *     { key: 'homeownerName', header: 'Homeowner' },
 *     { key: 'status', header: 'Status' },
 *   ]}
 *   filename="claims-export"
 * />
 */

"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toCsv, downloadCsv, type CsvColumn } from "@/lib/export/csvExporter";
import { downloadExcel } from "@/lib/export/excelExporter";

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: (CsvColumn<T> | (keyof T & string))[];
  filename: string;
  sheetName?: string;
  /** Show a loading state while data is being prepared */
  isLoading?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  sheetName = "Export",
  isLoading = false,
  variant = "outline",
  size = "sm",
}: ExportButtonProps<T>) {
  const [exporting, setExporting] = useState(false);

  const handleCsvExport = () => {
    setExporting(true);
    try {
      const csv = toCsv(data, columns);
      downloadCsv(csv, `${filename}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      await downloadExcel(
        [{ name: sheetName, rows: data, columns }],
        `${filename}.xlsx`,
      );
    } finally {
      setExporting(false);
    }
  };

  const disabled = isLoading || exporting || data.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          <Download className="mr-1.5 h-4 w-4" />
          {exporting ? "Exporting…" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsvExport}>
          📄 Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcelExport}>
          📊 Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

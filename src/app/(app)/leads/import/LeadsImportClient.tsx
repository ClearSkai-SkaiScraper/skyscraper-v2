"use client";

import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EXPECTED_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "address", label: "Address", required: true },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "Zip Code", required: false },
  { key: "source", label: "Source", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

type MappingState = Record<string, string>;

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines
    .slice(1)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

function autoMap(csvHeaders: string[]): MappingState {
  const mapping: MappingState = {};
  const lower = csvHeaders.map((h) => h.toLowerCase());

  for (const field of EXPECTED_FIELDS) {
    const idx = lower.findIndex(
      (h) =>
        h === field.key ||
        h === field.label.toLowerCase() ||
        h.includes(field.key) ||
        (field.key === "name" && (h.includes("name") || h.includes("contact"))) ||
        (field.key === "phone" &&
          (h.includes("phone") || h.includes("mobile") || h.includes("cell"))) ||
        (field.key === "address" && (h.includes("address") || h.includes("street"))) ||
        (field.key === "zip" && (h.includes("zip") || h.includes("postal"))) ||
        (field.key === "source" &&
          (h.includes("source") || h.includes("origin") || h.includes("channel")))
    );
    if (idx >= 0) {
      mapping[field.key] = csvHeaders[idx];
    }
  }
  return mapping;
}

export function LeadsImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<MappingState>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setMapping(autoMap(headers));
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && (f.name.endsWith(".csv") || f.type === "text/csv")) {
        handleFile(f);
      } else {
        toast.error("Please upload a .csv file");
      }
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!csvRows.length) return;

    const nameCol = mapping.name;
    const addressCol = mapping.address;
    if (!nameCol || !addressCol) {
      toast.error("Name and Address mappings are required");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const leads = csvRows
        .map((row) => {
          const rowObj: Record<string, string> = {};
          csvHeaders.forEach((h, i) => {
            rowObj[h] = row[i] || "";
          });

          return {
            name: rowObj[nameCol] || "",
            email: mapping.email ? rowObj[mapping.email] : undefined,
            phone: mapping.phone ? rowObj[mapping.phone] : undefined,
            address: rowObj[addressCol] || "",
            city: mapping.city ? rowObj[mapping.city] : undefined,
            state: mapping.state ? rowObj[mapping.state] : undefined,
            zip: mapping.zip ? rowObj[mapping.zip] : undefined,
            source: mapping.source ? rowObj[mapping.source] : "CSV Import",
            notes: mapping.notes ? rowObj[mapping.notes] : undefined,
          };
        })
        .filter((l) => l.name && l.address);

      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Import failed");
      }

      const data = await res.json();
      setResult({
        imported: data.imported ?? leads.length,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      toast.success(`Imported ${data.imported ?? leads.length} leads`);
    } catch (error) {
      toast.error(String(error));
      setResult({ imported: 0, skipped: csvRows.length, errors: [String(error)] });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Step 1: Upload
  if (!file) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Drop a CSV file or click to browse. We&apos;ll auto-map your columns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 transition-colors hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-primary"
          >
            <Upload className="mb-3 h-10 w-10 text-slate-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Drag & drop your CSV file here
            </p>
            <p className="mt-1 text-xs text-slate-500">or click to browse</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <h4 className="mb-2 text-sm font-semibold">Expected Columns</h4>
            <div className="flex flex-wrap gap-2">
              {EXPECTED_FIELDS.map((f) => (
                <span
                  key={f.key}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    f.required
                      ? "bg-primary/10 text-primary"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {f.label}
                  {f.required && " *"}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Map + Preview + Import
  return (
    <div className="space-y-6">
      {/* File Info */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {csvRows.length} rows · {csvHeaders.length} columns
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="mr-1 h-4 w-4" /> Remove
          </Button>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Column Mapping</CardTitle>
          <CardDescription>
            We auto-mapped what we could. Adjust any that are wrong.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXPECTED_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <Select
                  value={mapping[field.key] || "__none__"}
                  onValueChange={(v) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field.key]: v === "__none__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select column…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not mapped —</SelectItem>
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview (first 5 rows)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {csvHeaders.map((h) => (
                  <TableHead key={h} className="text-xs">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {csvRows.slice(0, 5).map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="text-xs">
                      {cell || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Import Result */}
      {result && (
        <Card
          className={
            result.imported > 0
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
          }
        >
          <CardContent className="flex items-start gap-3 py-4">
            {result.imported > 0 ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="text-sm font-medium">
                {result.imported > 0
                  ? `Successfully imported ${result.imported} leads`
                  : "Import failed"}
              </p>
              {result.skipped > 0 && (
                <p className="text-xs text-muted-foreground">
                  {result.skipped} rows skipped (missing required fields)
                </p>
              )}
              {result.errors.length > 0 && (
                <ul className="mt-1 text-xs text-red-600">
                  {result.errors.slice(0, 3).map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action */}
      <div className="flex gap-3">
        <Button onClick={handleImport} disabled={importing || !mapping.name || !mapping.address}>
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing {csvRows.length} leads…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import {csvRows.length} Leads
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Start Over
        </Button>
      </div>
    </div>
  );
}

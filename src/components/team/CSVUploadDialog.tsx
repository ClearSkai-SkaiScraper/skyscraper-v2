"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

// ── Types ──────────────────────────────────────────────────────────────────
interface ParsedRow {
  email: string;
  role: string;
  name?: string;
  valid: boolean;
  error?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors?: Array<{ email: string; reason: string }>;
  invitations?: Array<{ email: string; role: string; status: string }>;
}

type Step = "upload" | "preview" | "importing" | "results";

// ── CSV Parser (client-side preview) ───────────────────────────────────────
function parseCSVPreview(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("email") || firstLine.includes("name") || firstLine.includes("role");
  const startIdx = hasHeader ? 1 : 0;

  let emailCol = 0;
  let roleCol = 1;
  let nameCol = 2;

  if (hasHeader) {
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
    emailCol = headers.indexOf("email");
    roleCol = headers.indexOf("role");
    nameCol = headers.indexOf("name");
    if (emailCol === -1) emailCol = 0;
  }

  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const email = cols[emailCol]?.trim().toLowerCase();
    const role = roleCol >= 0 ? cols[roleCol]?.trim() || "member" : "member";
    const name = nameCol >= 0 ? cols[nameCol]?.trim() || undefined : undefined;

    if (!email) continue;

    // Validate
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRoles = [
      "owner",
      "admin",
      "manager",
      "project_manager",
      "sales_rep",
      "field_tech",
      "finance",
      "member",
      "viewer",
      "org:admin",
      "org:member",
    ];

    let valid = true;
    let error: string | undefined;

    if (!emailRegex.test(email)) {
      valid = false;
      error = "Invalid email";
    } else if (seen.has(email)) {
      valid = false;
      error = "Duplicate";
    } else if (role && !validRoles.includes(role.toLowerCase())) {
      valid = false;
      error = `Unknown role "${role}"`;
    }

    seen.add(email);
    rows.push({ email, role: role || "member", name, valid, error });
  }

  return rows;
}

// ── Template CSV ───────────────────────────────────────────────────────────
const TEMPLATE_CSV = `email,name,role
john.smith@company.com,John Smith,admin
jane.doe@company.com,Jane Doe,member
bob.wilson@company.com,Bob Wilson,member
sarah.jones@company.com,Sarah Jones,viewer`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "team-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────
export function CSVUploadDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rawCSV, setRawCSV] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setRawCSV("");
    setParsedRows([]);
    setResult(null);
    setProgress(0);
    setFileName("");
  }, []);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && step === "importing") return; // Prevent close during import
      setOpen(isOpen);
      if (!isOpen) reset();
    },
    [step, reset]
  );

  // ── File Drop Handler ─────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawCSV(text);
      const rows = parseCSVPreview(text);
      setParsedRows(rows);
      setStep("preview");
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
      "text/plain": [".txt", ".csv"],
    },
    maxSize: 5 * 1024 * 1024, // 5 MB
    maxFiles: 1,
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0];
      if (reason?.code === "file-too-large") {
        toast.error("File too large. Maximum 5 MB.");
      } else if (reason?.code === "file-invalid-type") {
        toast.error("Invalid file type. Please upload a .csv file.");
      } else {
        toast.error("File rejected. Please try a different file.");
      }
    },
  });

  // ── Import Handler ────────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setStep("importing");
    setProgress(10);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setProgress(30);

      const response = await fetch("/api/team/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            email: r.email,
            role: r.role,
            name: r.name,
          })),
        }),
        signal: controller.signal,
      });

      setProgress(80);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import failed");
      }

      const data: ImportResult = await response.json();
      setResult(data);
      setProgress(100);
      setStep("results");

      if (data.imported > 0) {
        toast.success(`${data.imported} team member${data.imported === 1 ? "" : "s"} imported!`);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Import failed");
      setStep("preview");
    } finally {
      abortRef.current = null;
    }
  }, [parsedRows]);

  // ── Derived State ─────────────────────────────────────────────────────
  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {/* ── Step 1: Upload ──────────────────────────────────────────── */}
        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Bulk Import Team Members
              </DialogTitle>
              <DialogDescription>
                Upload a CSV file with email addresses to invite multiple team members at once.
                Maximum 500 members per import.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-gray-900/30"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                {isDragActive ? (
                  <p className="text-sm font-medium text-blue-600">Drop your CSV file here...</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[color:var(--text)]">
                      Drag & drop a CSV file here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Accepts .csv files up to 5 MB
                    </p>
                  </>
                )}
              </div>

              {/* Template Download */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Need a template?</span>
                </div>
                <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Download CSV Template
                </Button>
              </div>

              {/* Format Info */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950/30">
                <p className="mb-1.5 font-medium text-blue-800 dark:text-blue-200">CSV Format</p>
                <code className="block whitespace-pre rounded bg-white px-3 py-2 text-xs text-blue-900 dark:bg-gray-800 dark:text-blue-100">
                  {`email,name,role\njohn@company.com,John Smith,admin\njane@company.com,Jane Doe,member`}
                </code>
                <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-300">
                  Roles: <strong>admin</strong>, <strong>member</strong> (default),{" "}
                  <strong>viewer</strong>
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Preview ─────────────────────────────────────────── */}
        {step === "preview" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Preview Import — {fileName}
              </DialogTitle>
              <DialogDescription>
                Review the parsed data before importing. Invalid rows will be skipped.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Summary Bar */}
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-950/30 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {validCount} valid
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    <XCircle className="h-4 w-4" />
                    {invalidCount} invalid
                  </div>
                )}
                <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {parsedRows.length} total rows
                </div>
              </div>

              {/* Preview Table */}
              <div className="max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                        Role
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {parsedRows.map((row, i) => (
                      <tr
                        key={i}
                        className={
                          row.valid
                            ? "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            : "bg-red-50/50 dark:bg-red-950/20"
                        }
                      >
                        <td className="px-3 py-2">
                          {row.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="flex items-center gap-1" title={row.error}>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-600 dark:text-red-400">
                                {row.error}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                          {row.name || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={row.role === "admin" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {row.role}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warning for invalid rows */}
              {invalidCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {invalidCount} row{invalidCount === 1 ? "" : "s"} will be skipped due to
                    validation errors. Only {validCount} valid member
                    {validCount === 1 ? "" : "s"} will be imported.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0} className="gap-2">
                <Upload className="h-4 w-4" />
                Import {validCount} Member{validCount === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Importing ───────────────────────────────────────── */}
        {step === "importing" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Importing Team Members...
              </DialogTitle>
              <DialogDescription>
                Sending invitations to {validCount} team member{validCount === 1 ? "" : "s"}. This
                may take a moment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-6">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Processing invitations... please don&apos;t close this dialog.
              </p>
            </div>
          </>
        )}

        {/* ── Step 4: Results ─────────────────────────────────────────── */}
        {step === "results" && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {result.imported > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                Import Complete
              </DialogTitle>
              <DialogDescription>
                {result.imported} of {result.total} invitations sent successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/30">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {result.imported}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">Imported</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/30">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Skipped</p>
                </div>
                <div className="rounded-lg bg-gray-100 p-3 text-center dark:bg-gray-800">
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                    {result.total}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                </div>
              </div>

              {/* Error Details */}
              {result.errors && result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800">
                  <div className="border-b border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      Skipped Rows ({result.errors.length})
                    </p>
                  </div>
                  <div className="max-h-32 overflow-auto">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border-b border-red-100 px-3 py-1.5 text-xs last:border-b-0 dark:border-red-900/30"
                      >
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {err.email}
                        </span>
                        <span className="text-red-600 dark:text-red-400">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success List */}
              {result.invitations && result.invitations.length > 0 && (
                <div className="rounded-lg border border-green-200 dark:border-green-800">
                  <div className="border-b border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/30">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Invitations Sent ({result.invitations.length})
                    </p>
                  </div>
                  <div className="max-h-32 overflow-auto">
                    {result.invitations.map((inv, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border-b border-green-100 px-3 py-1.5 text-xs last:border-b-0 dark:border-green-900/30"
                      >
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {inv.email}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {inv.role.replace("org:", "")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                  // Refresh the page to show new members
                  window.location.reload();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

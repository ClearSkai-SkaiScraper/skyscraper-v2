"use client";

import { Download, History, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

const CARRIERS = [
  { id: "state-farm", name: "State Farm" },
  { id: "allstate", name: "Allstate" },
  { id: "farmers", name: "Farmers Insurance" },
  { id: "liberty-mutual", name: "Liberty Mutual" },
  { id: "progressive", name: "Progressive" },
  { id: "usaa", name: "USAA" },
  { id: "geico", name: "GEICO" },
  { id: "nationwide", name: "Nationwide" },
];

const EXPORT_FORMATS = [
  { id: "xactimate", name: "Xactimate XML" },
  { id: "symbility", name: "Symbility" },
  { id: "edjuster", name: "eAdjuster" },
  { id: "pdf", name: "PDF Report" },
  { id: "csv", name: "CSV Spreadsheet" },
];

export default function CarrierExportClient() {
  const [loading, setLoading] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [format, setFormat] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleExport = async () => {
    if (!carrier || !format) {
      alert("Please select both carrier and export format");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/carrier/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier, format, claimId: "latest" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({
          success: true,
          carrier: CARRIERS.find((c) => c.id === carrier)?.name,
          format: EXPORT_FORMATS.find((f) => f.id === format)?.name,
          exportUrl: data.exportUrl || null,
          message: data.message || "Export generated successfully",
          exportData: data.exportData,
        });
      } else {
        setResult({
          success: false,
          carrier: CARRIERS.find((c) => c.id === carrier)?.name,
          format: EXPORT_FORMATS.find((f) => f.id === format)?.name,
          exportUrl: "#",
          message: data.error || "Export failed. Please try again.",
        });
      }

      // Call telemetry API to log carrier export
      try {
        await fetch("/api/telemetry/carrier-export-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exportId: `export-${Date.now()}`,
            carrier: CARRIERS.find((c) => c.id === carrier)?.name,
            format: EXPORT_FORMATS.find((f) => f.id === format)?.name,
            tokensUsed: 0,
          }),
        });
      } catch (err) {
        logger.error("Telemetry error:", err);
      }
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-[color:var(--text)]">
            <Package className="h-8 w-8 text-emerald-600" />
            Carrier Export Builder
          </h1>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            Build carrier-specific export formats automatically
          </p>
        </div>
        <Link
          href="/carrier/export/history"
          className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[color:var(--text)] hover:bg-[var(--surface-2)]"
        >
          <History className="h-4 w-4" />
          View History
        </Link>
      </div>

      {/* Form */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="carrier">Insurance Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger id="carrier">
                <SelectValue placeholder="Select carrier..." />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="format">Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format..." />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExport}
            disabled={loading || !carrier || !format}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Export...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Generate Carrier Export
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Export Results</h3>
          {result.error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">
              <p className="font-medium">Error:</p>
              <p>{result.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="mb-2 font-medium text-emerald-900">✅ {result.message}</p>
                <div className="space-y-1 text-sm text-emerald-800">
                  <p>
                    <strong>Carrier:</strong> {result.carrier}
                  </p>
                  <p>
                    <strong>Format:</strong> {result.format}
                  </p>
                </div>
              </div>

              {result.exportUrl && result.exportUrl !== "#" && (
                <Button asChild>
                  <a href={result.exportUrl} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download Export File
                  </a>
                </Button>
              )}

              {result.exportData && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    Export Data Preview
                  </p>
                  <pre className="text-xs text-slate-700 dark:text-slate-300">
                    {JSON.stringify(result.exportData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Features */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-emerald-900">Export Features</h3>
        <ul className="space-y-2 text-sm text-emerald-800">
          <li>✓ Carrier-specific format compliance</li>
          <li>✓ Automatic field mapping</li>
          <li>✓ Validation and error checking</li>
          <li>✓ Batch export capabilities</li>
          <li>✓ Custom templates per carrier</li>
        </ul>
      </Card>
    </div>
  );
}

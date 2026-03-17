"use client";

import { CheckCircle2, FileCode, FileSpreadsheet, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { logger } from "@/lib/logger";

type ImportSource = "adjuster" | "contractor";

interface ImportedItem {
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  category?: string;
}

interface MatchResult {
  adjuster: ImportedItem;
  contractor: ImportedItem;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params?.claimId as string;

  const [source, setSource] = useState<ImportSource>("adjuster");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchStats, setMatchStats] = useState<{
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    unmatched: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const extension = selectedFile.name.split(".").pop()?.toLowerCase();

      if (!["csv", "xml", "esx"].includes(extension || "")) {
        toast.error("Please upload a .csv, .xml, or .esx file.");
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Please upload a file smaller than 10MB.");
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/claims/${claimId}/import?source=${source}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setImportedItems(result.items || []);
      setMatches(result.matches || []);
      setMatchStats(result.matchStats || null);

      toast.success(`Imported ${result.imported} line items.`);

      // If matches were found, show a secondary toast
      if (result.matches && result.matches.length > 0) {
        setTimeout(() => {
          toast.success(
            `Auto-matching complete — ${result.matchStats?.highConfidence || 0} high-confidence matches.`
          );
        }, 1500);
      }
    } catch (error) {
      logger.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred during import.");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    if (extension === "csv") return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (extension === "xml" || extension === "esx")
      return <FileCode className="h-5 w-5 text-blue-600" />;
    return <Upload className="h-5 w-5 text-gray-600" />;
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${colors[confidence as keyof typeof colors]}`}
      >
        {confidence}
      </span>
    );
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Estimate</h1>
          <p className="text-muted-foreground">Upload CSV or Xactimate XML files</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/claims/${claimId}`)}>
          Back to Claim
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Select the source and upload a CSV or Xactimate XML file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Source</Label>
            <RadioGroup value={source} onValueChange={(value) => setSource(value as ImportSource)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adjuster" id="adjuster" />
                <Label htmlFor="adjuster" className="cursor-pointer font-normal">
                  Adjuster Estimate
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contractor" id="contractor" />
                <Label htmlFor="contractor" className="cursor-pointer font-normal">
                  Contractor Estimate
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">File</Label>
            <div className="flex items-center gap-4">
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xml,.esx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                aria-label="Import File"
                title="Import File"
                placeholder="Import File"
              />
              {file && (
                <div className="flex items-center gap-2">
                  {getFileIcon(file.name)}
                  <span className="text-sm text-muted-foreground">{file.name}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Accepts .csv, .xml, or .esx files (max 10MB)
            </p>
          </div>

          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload and Import"}
          </Button>
        </CardContent>
      </Card>

      {importedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Imported Line Items ({importedItems.length})</CardTitle>
            <CardDescription>Preview of imported estimate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-left">Unit</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Total</th>
                    {importedItems.some((i) => i.category) && (
                      <th className="p-2 text-left">Category</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {importedItems.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right">{item.qty}</td>
                      <td className="p-2">{item.unit}</td>
                      <td className="p-2 text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right font-medium">${item.total.toFixed(2)}</td>
                      {importedItems.some((i) => i.category) && (
                        <td className="p-2">{item.category || "-"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importedItems.length > 10 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing first 10 of {importedItems.length} items
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Auto-Matching Results
            </CardTitle>
            <CardDescription>
              Found {matchStats?.total || matches.length} matches between adjuster and contractor
              estimates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matchStats && (
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">High Confidence</p>
                  <p className="text-2xl font-bold text-green-600">{matchStats.highConfidence}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Medium Confidence</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {matchStats.mediumConfidence}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Low Confidence</p>
                  <p className="text-2xl font-bold text-red-600">{matchStats.lowConfidence}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unmatched</p>
                  <p className="text-2xl font-bold text-gray-600">{matchStats.unmatched}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {matches.slice(0, 5).map((match, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Match {idx + 1}</h4>
                    {getConfidenceBadge(match.confidence)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Adjuster</p>
                      <p className="font-medium">{match.adjuster.description}</p>
                      <p className="text-muted-foreground">
                        {match.adjuster.qty} {match.adjuster.unit} × $
                        {match.adjuster.unitPrice.toFixed(2)} = ${match.adjuster.total.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Contractor</p>
                      <p className="font-medium">{match.contractor.description}</p>
                      <p className="text-muted-foreground">
                        {match.contractor.qty} {match.contractor.unit} × $
                        {match.contractor.unitPrice.toFixed(2)} = $
                        {match.contractor.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs italic text-muted-foreground">{match.reason}</p>
                </div>
              ))}
            </div>
            {matches.length > 5 && (
              <p className="text-xs text-muted-foreground">
                Showing first 5 of {matches.length} matches
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

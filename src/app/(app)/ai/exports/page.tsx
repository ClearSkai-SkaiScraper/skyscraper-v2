"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  Download,
  FolderOpen,
  HelpCircle,
  History,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  { id: "travelers", name: "Travelers" },
  { id: "american-family", name: "American Family" },
  { id: "other", name: "Other Carrier" },
];

const EXPORT_FORMATS = [
  { id: "xactimate", name: "Xactimate XML", desc: "Industry standard format" },
  { id: "symbility", name: "Symbility", desc: "For Symbility-compatible carriers" },
  { id: "eadjuster", name: "eAdjuster", desc: "ClaimXperience export" },
  { id: "pdf", name: "PDF Report", desc: "Universal carrier format" },
  { id: "csv", name: "CSV Spreadsheet", desc: "For data import" },
  { id: "zip", name: "Complete ZIP Package", desc: "All documents bundled" },
];

interface ClaimOption {
  id: string;
  title: string;
  claimNumber?: string;
  address?: string;
  carrier?: string;
}

export default function CarrierExportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useUser();
  const { orgId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [claims, setClaims] = useState<ClaimOption[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState(searchParams?.get("claimId") || "");
  const [carrier, setCarrier] = useState("");
  const [format, setFormat] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  // Pre-select carrier from URL param (after claims load so auto-detect can also fire)
  const urlCarrier = searchParams?.get("carrier") || "";

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in?redirect_url=/ai/exports");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch claims
  useEffect(() => {
    if (!isSignedIn || !orgId) return;

    async function fetchClaims() {
      try {
        const res = await fetch("/api/claims/list-lite");
        if (res.ok) {
          const data = await res.json();
          setClaims(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data.claims || []).map((c: any) => ({
              id: c.id,
              title: c.title || "Untitled Claim",
              claimNumber: c.claimNumber,
              address: c.address || c.propertyAddress,
              carrier: c.carrier,
            }))
          );
        }
      } catch (err) {
        logger.error("[CarrierExports] Failed to fetch claims:", err);
      } finally {
        setLoadingClaims(false);
      }
    }

    void fetchClaims();
  }, [isSignedIn, orgId]);

  // Auto-select carrier when claim is selected (from claim data or URL param)
  useEffect(() => {
    if (selectedClaimId) {
      const claim = claims.find((c) => c.id === selectedClaimId);
      if (claim?.carrier) {
        const matchedCarrier = CARRIERS.find(
          (c) => c.name.toLowerCase() === claim.carrier?.toLowerCase()
        );
        if (matchedCarrier) {
          setCarrier(matchedCarrier.id);
          return;
        }
      }
      // Fall back to URL carrier param if no match from claim data
      if (urlCarrier && !carrier) {
        const matchedUrlCarrier = CARRIERS.find(
          (c) =>
            c.id === urlCarrier.toLowerCase() || c.name.toLowerCase() === urlCarrier.toLowerCase()
        );
        if (matchedUrlCarrier) {
          setCarrier(matchedUrlCarrier.id);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClaimId, claims, urlCarrier]);

  if (!isLoaded || !isSignedIn) {
    return (
      <PageContainer>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </PageContainer>
    );
  }

  const handleExport = async () => {
    if (!selectedClaimId || !carrier || !format) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Call the carrier export API
      const res = await fetch("/api/carrier/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          carrier,
          format,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({
          success: true,
          carrier: CARRIERS.find((c) => c.id === carrier)?.name,
          format: EXPORT_FORMATS.find((f) => f.id === format)?.name,
          exportUrl: data.exportUrl || data.url,
          message: "Export generated successfully! Your carrier-formatted package is ready.",
        });

        // Log telemetry
        fetch("/api/telemetry/carrier-export-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carrier, format, claimId: selectedClaimId }),
        }).catch(() => {});
      } else {
        const errData = await res.json().catch(() => ({}));
        setResult({
          success: false,
          carrier: CARRIERS.find((c) => c.id === carrier)?.name,
          format: EXPORT_FORMATS.find((f) => f.id === format)?.name,
          message:
            errData.error ||
            "Export generation failed. Please verify a claim is selected and try again.",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: String(error),
        message: "Failed to generate export. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedClaim = claims.find((c) => c.id === selectedClaimId);

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="reports"
        title="Carrier Export Builder"
        subtitle="Generate carrier-specific export formats for insurance submissions — Xactimate, Symbility, and more"
        icon={<Package className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="bg-white/10 text-white hover:bg-white/20">
            <Link href="/carrier/export/history">
              <History className="mr-2 h-4 w-4" />
              Export History
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-white/10 text-white hover:bg-white/20">
            <Link href="/reports/hub">
              <FolderOpen className="mr-2 h-4 w-4" />
              Reports Hub
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* How It Works Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <HelpCircle className="h-5 w-5" />
            How Carrier Exports Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 dark:text-blue-300">
          <p className="mb-3">
            Carrier Exports generate industry-standard formatted files that insurance adjusters and
            carriers expect. Use this tool to:
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>Export claim data in Xactimate XML format</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>Generate Symbility-compatible packages</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>Create PDF bundles with all documentation</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span>Use with Claims-Ready Folder for maximum coverage</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
            <strong>💡 Pro Tip:</strong> You can also generate carrier exports directly from any
            claim&apos;s overview page — click &quot;Carrier Export&quot; in the Actions section and
            your claim + carrier are auto-selected. The AI will save this export and use the
            carrier-specific formatting for all future reports on that claim.
          </p>
        </CardContent>
      </Card>

      {/* Export Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Export</CardTitle>
          <CardDescription>
            Select a claim and configure the export format for carrier submission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Claim Selector */}
          <div>
            <Label htmlFor="claim">Select Claim *</Label>
            <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
              <SelectTrigger id="claim">
                <SelectValue
                  placeholder={loadingClaims ? "Loading claims..." : "Select a claim..."}
                />
              </SelectTrigger>
              <SelectContent>
                {claims.length === 0 && !loadingClaims && (
                  <SelectItem value="none" disabled>
                    No claims found
                  </SelectItem>
                )}
                {claims.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-blue-500" />
                      {c.claimNumber || c.title}
                      {c.address && <span className="text-xs text-slate-400">— {c.address}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {claims.length === 0 && !loadingClaims && (
              <p className="mt-1 text-xs text-slate-500">
                <Link href="/claims/new" className="text-blue-600 hover:underline">
                  Create a claim
                </Link>{" "}
                to generate carrier exports
              </p>
            )}
          </div>

          {/* Selected Claim Info */}
          {selectedClaim && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-sm font-medium">{selectedClaim.title}</p>
              <p className="text-xs text-slate-500">
                {selectedClaim.claimNumber && `#${selectedClaim.claimNumber} · `}
                {selectedClaim.address}
                {selectedClaim.carrier && ` · ${selectedClaim.carrier}`}
              </p>
            </div>
          )}

          {/* Carrier Selector */}
          <div>
            <Label htmlFor="carrier">Insurance Carrier *</Label>
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

          {/* Format Selector */}
          <div>
            <Label htmlFor="format">Export Format *</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format..." />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <div className="flex items-center gap-2">
                      <span>{f.name}</span>
                      <span className="text-xs text-slate-400">— {f.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExport}
            disabled={loading || !selectedClaimId || !carrier || !format}
            className="w-full"
            size="lg"
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
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={result.success ? "border-green-200" : "border-amber-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <HelpCircle className="h-5 w-5 text-amber-600" />
              )}
              Export Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950/30">
                <p className="font-medium">Error:</p>
                <p className="text-sm">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">{result.message}</p>
                <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/50">
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong>Carrier:</strong> {result.carrier}
                    </p>
                    <p>
                      <strong>Format:</strong> {result.format}
                    </p>
                  </div>
                </div>

                {result.exportUrl && result.success && (
                  <Button asChild className="w-full">
                    <a href={result.exportUrl} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download Export File
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration with Claims-Ready Folder */}
      <Card className="mt-6 border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
            <Sparkles className="h-5 w-5" />
            Works With Claims-Ready Folder
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-purple-700 dark:text-purple-300">
          <p className="mb-3">
            For the most comprehensive carrier submission, combine this export with your
            Claims-Ready Folder:
          </p>
          <ol className="mb-4 list-inside list-decimal space-y-1 text-xs">
            <li>Generate the carrier export here (optional but recommended)</li>
            <li>Open the Claims-Ready Folder for your claim</li>
            <li>AI will detect and include your carrier export automatically</li>
            <li>Generate the complete submission package</li>
          </ol>
          <Button asChild variant="outline" className="border-purple-300 hover:bg-purple-100">
            <Link href="/claims-ready-folder">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Claims-Ready Folder
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Export Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Carrier-specific format compliance
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Automatic field mapping
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Validation and error checking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Batch export capabilities
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Custom templates per carrier
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Export history tracking
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

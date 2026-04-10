/**
 * Estimate Export Panel Component
 *
 * Phase 39 & 40: Estimator Engine + Pricing Engine
 * Exports claims to Xactimate XML and Symbility JSON with optional pricing
 */

"use client";

import {
  AlertCircle,
  Calculator,
  CheckCircle,
  DollarSign,
  FileCode,
  FileJson,
  FileText,
  Loader2,
  Package,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

interface EstimateExportPanelProps {
  leadId: string;
  claimId?: string; // Optional: if claim was generated first
}

interface ExportData {
  id: string;
  xml: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  symbility: any;
  summary: string;
  downloadZipUrl?: string;
  createdAt: string;
}

interface PricingData {
  subtotal: number;
  waste: number;
  wasteAmount: number;
  region: number;
  regionAmount: number;
  labor: number;
  laborAmount: number;
  tax: number;
  taxAmount: number;
  op: number;
  opAmount: number;
  total: number;
  pricedItems: Array<{
    code: string;
    description: string;
    quantity: number;
    unit: string;
    basePrice: number;
    totalPrice: number;
  }>;
}

// Use canonical tax rates from shared constants
import { getCityTaxOptions } from "@/lib/constants/taxRates";
const AZ_CITIES = getCityTaxOptions();

export function EstimateExportPanel({ leadId, claimId }: EstimateExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPricing, setIsPricing] = useState(false);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("Phoenix");

  const exportEstimate = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/estimate/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, claimId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError("Insufficient AI tokens. Please upgrade your plan.");
          toast.error("Insufficient Tokens", {
            description: "Your organization needs more AI tokens.",
          });
        } else if (response.status === 404) {
          setError("Claim not found. Please generate a claim first.");
          toast.error("Claim Not Found", {
            description: "Generate a claim before exporting estimates.",
          });
        } else {
          setError(data.error || "Failed to export estimate.");
          toast.error("Export Failed", {
            description: data.error || "An error occurred during export.",
          });
        }
        return;
      }

      setExportData(data.export);
      toast.success("Estimate Exported Successfully", {
        description: "Your XML and JSON files are ready for download.",
      });
    } catch (error) {
      logger.error("Error exporting estimate:", error);
      setError("Network error. Please check your connection and try again.");
      toast.error("Network Error", {
        description: "Failed to connect to export service.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generatePricedEstimate = async () => {
    setIsPricing(true);
    setError(null);

    const cityData = AZ_CITIES.find((c) => c.value === selectedCity);
    const taxRate = cityData ? cityData.rate / 100 : 0.089;

    try {
      const response = await fetch("/api/estimate/priced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          claimId,
          taxRate,
          city: selectedCity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError("Insufficient AI tokens. Please upgrade your plan.");
          toast.error("Insufficient Tokens", {
            description: "Your organization needs more AI tokens.",
          });
        } else {
          setError(data.error || "Failed to generate priced estimate.");
          toast.error("Pricing Failed", {
            description: data.error || "An error occurred during pricing.",
          });
        }
        return;
      }

      setPricingData(data.pricing);
      toast.success("Priced Estimate Generated", {
        description: `Total: $${data.pricing.total.toFixed(2)}`,
      });
    } catch (error) {
      logger.error("Error pricing estimate:", error);
      setError("Network error. Please check your connection and try again.");
      toast.error("Network Error", {
        description: "Failed to connect to pricing service.",
      });
    } finally {
      setIsPricing(false);
    }
  };

  const downloadXML = () => {
    if (!exportData || !exportData.xml) return;

    const blob = new Blob([exportData.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimate-${leadId}-${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("XML Downloaded", {
      description: "Import this file into Xactimate X1.",
    });
  };

  const downloadJSON = () => {
    if (!exportData || !exportData.symbility) return;

    const jsonStr = JSON.stringify(exportData.symbility, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimate-${leadId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("JSON Downloaded", {
      description: "Import this file into Symbility Claims.",
    });
  };

  const downloadZIP = () => {
    if (!exportData || !exportData.downloadZipUrl) return;

    window.open(exportData.downloadZipUrl, "_blank");

    toast.success("ZIP Download Started", {
      description: "Complete bundle with all estimate files.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <FileCode className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Estimate Export</CardTitle>
                <CardDescription>
                  Export estimates to Xactimate and Symbility formats
                </CardDescription>
              </div>
            </div>
            {exportData && (
              <Badge variant="outline" className="ml-auto">
                <CheckCircle className="mr-1 h-3 w-3" />
                Exported {new Date(exportData.createdAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!exportData && !isExporting && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="rounded-full bg-green-100 p-6 dark:bg-green-900/30">
                <FileCode className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Estimate Exported Yet</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Export your claim to industry-standard formats: Xactimate ESX (XML) and Symbility
                  D22 (JSON). Import directly into carrier systems.
                </p>
              </div>
              <Button size="lg" onClick={exportEstimate} className="bg-blue-600 hover:bg-blue-700">
                <FileCode className="mr-2 h-4 w-4" />
                Export Estimate
              </Button>
              <p className="text-xs text-muted-foreground">Cost: 10 AI tokens</p>
            </div>
          )}

          {isExporting && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Exporting Estimate...</h3>
                <p className="text-sm text-muted-foreground">Generating XML and JSON files</p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Results */}
      {exportData && (
        <>
          {/* Download Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadXML} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Download XML (Xactimate)
            </Button>
            <Button onClick={downloadJSON} variant="outline">
              <FileJson className="mr-2 h-4 w-4" />
              Download JSON (Symbility)
            </Button>
            {exportData.downloadZipUrl && (
              <Button onClick={downloadZIP} variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Download Complete Bundle (ZIP)
              </Button>
            )}
            <Button onClick={exportEstimate} variant="ghost" size="sm" className="ml-auto">
              <FileCode className="mr-2 h-4 w-4" />
              Re-Export
            </Button>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
              <CardDescription>File formats and import instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{exportData.summary}</p>
            </CardContent>
          </Card>

          {/* Pricing Section */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Add Pricing</CardTitle>
                    <CardDescription>
                      Apply market pricing with regional adjustments
                    </CardDescription>
                  </div>
                </div>
                {pricingData && (
                  <Badge variant="outline" className="ml-auto">
                    <DollarSign className="mr-1 h-3 w-3" />${pricingData.total.toFixed(2)}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {!pricingData ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City/Tax Region</Label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger id="city">
                        <SelectValue placeholder="Select a city" />
                      </SelectTrigger>
                      <SelectContent>
                        {AZ_CITIES.map((city) => (
                          <SelectItem key={city.value} value={city.value}>
                            {city.label} ({city.rate}% tax)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Tax rates vary by location. Select the job site city.
                    </p>
                  </div>

                  <Button onClick={generatePricedEstimate} disabled={isPricing} className="w-full">
                    {isPricing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating Pricing...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Generate Priced Estimate
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Cost: 15 AI tokens</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pricing Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between border-b py-2">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="text-sm">${pricingData.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b py-2 text-muted-foreground">
                      <span className="text-sm">
                        Waste Factor ({(pricingData.waste * 100).toFixed(0)}%)
                      </span>
                      <span className="text-sm">+${pricingData.wasteAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b py-2 text-muted-foreground">
                      <span className="text-sm">
                        Region Multiplier ({pricingData.region.toFixed(2)}x)
                      </span>
                      <span className="text-sm">+${pricingData.regionAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b py-2 text-muted-foreground">
                      <span className="text-sm">
                        Labor Burden ({pricingData.labor.toFixed(2)}x)
                      </span>
                      <span className="text-sm">+${pricingData.laborAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b py-2 text-muted-foreground">
                      <span className="text-sm">
                        Sales Tax ({(pricingData.tax * 100).toFixed(2)}%)
                      </span>
                      <span className="text-sm">+${pricingData.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b py-2 text-muted-foreground">
                      <span className="text-sm">
                        Overhead & Profit ({(pricingData.op * 100).toFixed(0)}%)
                      </span>
                      <span className="text-sm">+${pricingData.opAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t-2 border-primary py-3">
                      <span className="text-lg font-bold">Total Estimate</span>
                      <span className="text-lg font-bold text-primary">
                        ${pricingData.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Line Items */}
                  {pricingData.pricedItems && pricingData.pricedItems.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-3 font-semibold">Priced Line Items</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Code</th>
                              <th className="p-2 text-left">Description</th>
                              <th className="p-2 text-right">Qty</th>
                              <th className="p-2 text-left">Unit</th>
                              <th className="p-2 text-right">Base</th>
                              <th className="p-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricingData.pricedItems.map((item, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2 font-mono text-xs">{item.code}</td>
                                <td className="p-2">{item.description}</td>
                                <td className="p-2 text-right">{item.quantity}</td>
                                <td className="p-2">{item.unit}</td>
                                <td className="p-2 text-right">${item.basePrice.toFixed(2)}</td>
                                <td className="p-2 text-right font-semibold">
                                  ${item.totalPrice.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={generatePricedEstimate}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Recalculate with Different City
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

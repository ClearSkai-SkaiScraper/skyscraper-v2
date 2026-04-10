"use client";
/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */

import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Download,
  FileText,
  Info,
  Loader2,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CarrierCompliancePanelProps {
  leadId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentScope?: any[];
}

interface ComplianceResult {
  carrier: {
    name: string;
    confidence: number;
    detectedFrom: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conflicts: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adjustments: any[];
  summary: {
    pass: boolean;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
    approvalChance: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recommendedScope: any[];
}

export function CarrierCompliancePanel({ leadId, currentScope = [] }: CarrierCompliancePanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [adjusterEmail, setAdjusterEmail] = useState("");
  const [manualCarrier, setManualCarrier] = useState("");

  async function runComplianceCheck() {
    if (currentScope.length === 0) {
      toast.error("No Scope Data", {
        description: "Please generate an estimate first using SkaiPDF",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/carrier/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          scope: currentScope,
          adjusterEmail: adjusterEmail || undefined,
          manualCarrier: manualCarrier || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Compliance check failed");
      }

      setResult(data);
      toast.success("Compliance Analysis Complete!", {
        description: `Detected ${data.carrier.name} with ${Math.round(data.carrier.confidence * 100)}% confidence`,
      });
    } catch (err) {
      toast.error("Compliance Check Failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5" />;
      case "warning":
        return <Info className="h-5 w-5" />;
      case "info":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Carrier Compliance Checker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Automatically detect the insurance carrier and analyze your scope for carrier-specific
            compliance issues.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adjusterEmail">Adjuster Email (Optional)</Label>
              <Input
                id="adjusterEmail"
                type="email"
                placeholder="adjuster@statefarm.com"
                value={adjusterEmail}
                onChange={(e) => setAdjusterEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                We&apos;ll detect the carrier from the email domain
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manualCarrier">Manual Carrier (Optional)</Label>
              <Input
                id="manualCarrier"
                placeholder="State Farm"
                value={manualCarrier}
                onChange={(e) => setManualCarrier(e.target.value)}
              />
              <p className="text-xs text-gray-500">Or select carrier manually</p>
            </div>
          </div>

          <Button
            onClick={runComplianceCheck}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Compliance...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Run Compliance Check
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <>
          {/* Carrier Detection */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <Building2 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{result.carrier.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Detected via:{" "}
                      <span className="font-medium">{result.carrier.detectedFrom}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-sm text-gray-600">Confidence:</div>
                      <Badge variant="outline" className="bg-white">
                        {Math.round(result.carrier.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-600">
                    {result.summary.approvalChance}%
                  </div>
                  <div className="text-sm text-gray-600">Approval Chance</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Compliance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Total Issues</span>
                  </div>
                  <div className="text-2xl font-bold">{result.conflicts.length}</div>
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">Critical</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {result.summary.criticalIssues}
                  </div>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Warnings</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {result.summary.warningIssues}
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600">Info</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {result.summary.infoIssues}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 p-4">
                <div className="flex items-center gap-3">
                  {result.summary.pass ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">Scope is Compliant!</p>
                        <p className="text-sm text-green-700">
                          High likelihood of carrier approval ({result.summary.approvalChance}%)
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                      <div>
                        <p className="font-semibold text-orange-900">Action Required</p>
                        <p className="text-sm text-orange-700">
                          {result.summary.criticalIssues} critical issues must be resolved before
                          submission
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conflicts List */}
          {result.conflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Compliance Conflicts ({result.conflicts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-3">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {result.conflicts.map((conflict: any, idx: number) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-4 ${getSeverityColor(conflict.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(conflict.severity)}
                        <div className="flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <h4 className="font-semibold">
                              {conflict.type.replace(/_/g, " ").toUpperCase()}
                            </h4>
                            <Badge variant="outline">{conflict.severity}</Badge>
                          </div>
                          <p className="mb-2 text-sm">{conflict.description}</p>
                          <div className="space-y-1 text-xs">
                            <p>
                              <span className="font-medium">Item:</span> {conflict.itemDescription}
                            </p>
                            {conflict.suggestedFix && (
                              <p className="font-medium text-green-700">
                                💡 Suggested Fix: {conflict.suggestedFix}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommended Adjustments */}
          {result.adjustments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Recommended Adjustments ({result.adjustments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-3">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {result.adjustments.map((adjustment: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="font-semibold text-green-900">{adjustment.reason}</h4>
                        <Badge variant="outline" className="bg-white">
                          {adjustment.adjustmentType}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="mb-1 text-gray-600">Original:</p>
                          <p className="font-mono">{adjustment.originalItem.description}</p>
                          <p className="font-mono text-red-600">
                            ${adjustment.originalItem.totalPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-gray-600">Adjusted:</p>
                          <p className="font-mono">{adjustment.adjustedItem.description}</p>
                          <p className="font-mono text-green-600">
                            ${adjustment.adjustedItem.totalPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Apply All Adjustments
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

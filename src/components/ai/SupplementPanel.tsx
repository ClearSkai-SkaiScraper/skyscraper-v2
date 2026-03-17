"use client";

import { 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Download,
  FileText, 
  Gavel,
  Loader2,
  Mail,
  MessageSquare,
  Upload, 
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SupplementPanelProps {
  leadId: string;
  claimId?: string;
  currentScope?: any[];
}

interface SupplementResult {
  supplementId: string;
  carrier: {
    name: string;
    confidence: number;
  };
  comparison: {
    missingItems: any[];
    underpaidItems: any[];
    mismatchedCodes: any[];
  };
  codeUpgrades: any[];
  arguments: any[];
  negotiationScript: string;
  financials: {
    subtotal: number;
    tax: number;
    total: number;
  };
  emailDraft: string;
}

export function SupplementPanel({ leadId, claimId, currentScope = [] }: SupplementPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SupplementResult | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [adjusterEmail, setAdjusterEmail] = useState("");
  const [tone, setTone] = useState<"professional" | "firm" | "legal">("professional");
  const [city, setCity] = useState("Phoenix");

  async function generateSupplement() {
    if (!claimId) {
      toast.error("No Claim ID", {
        description: "This lead needs a claim number to generate a supplement",
      });
      return;
    }

    if (!pdfFile) {
      toast.error("Missing Carrier Scope", {
        description: "Please upload the carrier's scope PDF",
      });
      return;
    }

    if (currentScope.length === 0) {
      toast.error("No Contractor Scope", {
        description: "Generate an estimate with Dominus AI first",
      });
      return;
    }

    setLoading(true);
    try {
      // Read PDF as text (simplified - in production you'd use proper PDF parsing)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfText = e.target?.result as string;

        const res = await fetch(`/api/claims/${claimId}/supplement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimId,
            carrierScopePDF: pdfText,
            contractorScope: currentScope,
            adjusterEmail: adjusterEmail || undefined,
            city,
            tone,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Supplement generation failed");
        }

        setResult(data);
        toast.success("Supplement Generated!", {
        description: `Total supplement: $${data.financials.total.toFixed(2)}`,
      });
      };

      reader.readAsText(pdfFile);
    } catch (err) {
      toast.error("Supplement Generation Failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  function getToneIcon(selectedTone: string) {
    switch (selectedTone) {
      case "professional": return <MessageSquare className="h-4 w-4" />;
      case "firm": return <AlertTriangle className="h-4 w-4" />;
      case "legal": return <Gavel className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  }

  function getToneColor(selectedTone: string) {
    switch (selectedTone) {
      case "professional": return "text-blue-600 bg-blue-50 border-blue-200";
      case "firm": return "text-orange-600 bg-orange-50 border-orange-200";
      case "legal": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-blue-600 bg-blue-50 border-blue-200";
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Auto-Supplement Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload the carrier's scope PDF and we'll automatically generate a professional supplement with AI-powered arguments.
          </p>

          <div className="space-y-2">
            <Label htmlFor="carrierPDF">Carrier Scope PDF</Label>
            <div className="flex gap-2">
              <Input
                id="carrierPDF"
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {pdfFile && (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {pdfFile.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adjEmail">Adjuster Email (Optional)</Label>
              <Input
                id="adjEmail"
                type="email"
                placeholder="adjuster@allstate.com"
                value={adjusterEmail}
                onChange={(e) => setAdjusterEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City/Jurisdiction</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Phoenix">Phoenix, AZ</SelectItem>
                  <SelectItem value="Prescott">Prescott, AZ</SelectItem>
                  <SelectItem value="Chino Valley">Chino Valley, AZ</SelectItem>
                  <SelectItem value="Scottsdale">Scottsdale, AZ</SelectItem>
                  <SelectItem value="Tucson">Tucson, AZ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Negotiation Tone</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTone("professional")}
                className={`rounded-lg border-2 p-3 transition-all ${
                  tone === "professional"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <MessageSquare className={`mx-auto mb-2 h-5 w-5 ${tone === "professional" ? "text-blue-600" : "text-gray-400"}`} />
                <p className="text-sm font-medium">Professional</p>
                <p className="text-xs text-gray-500">Cooperative</p>
              </button>

              <button
                onClick={() => setTone("firm")}
                className={`rounded-lg border-2 p-3 transition-all ${
                  tone === "firm"
                    ? "border-orange-600 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <AlertTriangle className={`mx-auto mb-2 h-5 w-5 ${tone === "firm" ? "text-orange-600" : "text-gray-400"}`} />
                <p className="text-sm font-medium">Firm</p>
                <p className="text-xs text-gray-500">Assertive</p>
              </button>

              <button
                onClick={() => setTone("legal")}
                className={`rounded-lg border-2 p-3 transition-all ${
                  tone === "legal"
                    ? "border-red-600 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Gavel className={`mx-auto mb-2 h-5 w-5 ${tone === "legal" ? "text-red-600" : "text-gray-400"}`} />
                <p className="text-sm font-medium">Legal</p>
                <p className="text-xs text-gray-500">Formal</p>
              </button>
            </div>
          </div>

          <Button 
            onClick={generateSupplement}
            disabled={loading || !pdfFile}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Supplement...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate AI Supplement
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <>
          {/* Financial Summary */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-gray-600">Total Supplement Amount</p>
                  <p className="text-4xl font-bold text-green-600">
                    ${result.financials.total.toFixed(2)}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Subtotal: ${result.financials.subtotal.toFixed(2)} + Tax: ${result.financials.tax.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <DollarSign className="h-12 w-12 text-green-600" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-gray-600">Missing Items</p>
                  <p className="text-xl font-bold">{result.comparison.missingItems.length}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-gray-600">Underpaid</p>
                  <p className="text-xl font-bold">{result.comparison.underpaidItems.length}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-gray-600">Code Upgrades</p>
                  <p className="text-xl font-bold">{result.codeUpgrades.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Arguments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                AI-Generated Arguments ({result.arguments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.arguments.slice(0, 5).map((arg: any, idx: number) => (
                  <div key={idx} className="rounded-lg border bg-gray-50 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="font-semibold">{arg.itemDescription}</h4>
                      <Badge variant="outline" className="bg-white">
                        ${arg.difference.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{arg.argument}</p>
                    {arg.codeReferences && arg.codeReferences.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {arg.codeReferences.map((code: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {result.arguments.length > 5 && (
                  <p className="text-center text-sm text-gray-500">
                    + {result.arguments.length - 5} more arguments in full report
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Negotiation Script */}
          <Card className={`border-2 ${getToneColor(tone)}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getToneIcon(tone)}
                Negotiation Script ({tone.charAt(0).toUpperCase() + tone.slice(1)} Tone)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={result.negotiationScript}
                readOnly
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Email Draft */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Draft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={result.emailDraft}
                readOnly
                className="min-h-[200px] text-sm"
              />
              <div className="mt-4 flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Mail className="mr-2 h-4 w-4" />
                  Send to Adjuster
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

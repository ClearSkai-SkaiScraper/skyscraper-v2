"use client";

import { useUser } from "@clerk/nextjs";
import { CheckCircle, FileText, Flag, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

export default function NewScopePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [step, setStep] = useState<"input" | "structure" | "cleanup" | "save">("input");
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<any>(null);

  // Input state
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<
    "carrier_estimate" | "contractor_estimate" | "scope_of_work" | "notes" | "mixed"
  >("carrier_estimate");
  const [lossType, setLossType] = useState("hail");
  const [dol, setDol] = useState("");
  const [address, setAddress] = useState("");
  const [claimId, setClaimId] = useState("");

  // Source documents
  const [carrierFile, setCarrierFile] = useState<File | null>(null);
  const [contractorFile, setContractorFile] = useState<File | null>(null);
  const [notesText, setNotesText] = useState("");
  const [carrierEstimateText, setCarrierEstimateText] = useState("");
  const [contractorScopeText, setContractorScopeText] = useState("");

  // Options
  const [tryMapCodes, setTryMapCodes] = useState(true);
  const [flagSupplementCandidates, setFlagSupplementCandidates] = useState(true);

  const handleBuildScope = async () => {
    setLoading(true);
    try {
      // In production, handle file upload/parsing here
      // For now, using text fields directly

      const response = await fetch("/api/scopes/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sourceType,
          lossType,
          dol,
          address,
          claim_id: claimId || undefined,
          carrierEstimateText: carrierEstimateText || undefined,
          contractorScopeText: contractorScopeText || undefined,
          notesText: notesText || undefined,
          options: {
            tryMapCodes,
            flagSupplementCandidates,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setScope(data.scope);
        setStep("structure");
      }
    } catch (error) {
      logger.error("Build scope error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLineItem = (areaId: string, itemId: string) => {
    setScope((prev: any) => {
      const updated = { ...prev };
      const area = updated.areas.find((a: any) => a.id === areaId);
      if (area) {
        const item = area.lineItems.find((li: any) => li.id === itemId);
        if (item) {
          item.included = !item.included;
        }
      }
      return updated;
    });
  };

  const handleSaveScope = async () => {
    setLoading(true);
    try {
      // In production, would PUT to /api/scopes/[id] to update included items
      // Then optionally navigate to estimate builder or supplement builder

      setStep("save");
    } catch (error) {
      logger.error("Save scope error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEstimate = () => {
    router.push(`/estimates/new?scopeId=${scope?.id}`);
  };

  const handleCreateSupplement = () => {
    router.push(`/supplements/new?scopeId=${scope?.id}`);
  };

  return (
    <div className="container max-w-7xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">AI Scope Builder</h1>
          <p className="text-muted-foreground">
            Transform unstructured PDFs, notes, and carrier estimates into clean, structured scopes
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <Tabs
        value={step}
        onValueChange={(v) => setStep(v as "input" | "structure" | "cleanup" | "save")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="input">1. Input Source</TabsTrigger>
          <TabsTrigger value="structure" disabled={!scope}>
            2. Structure
          </TabsTrigger>
          <TabsTrigger value="cleanup" disabled={!scope}>
            3. Cleanup & Merge
          </TabsTrigger>
          <TabsTrigger value="save" disabled={!scope}>
            4. Save & Send
          </TabsTrigger>
        </TabsList>

        {/* STEP 1: INPUT SOURCE */}
        <TabsContent value="input" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Scope Details</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Scope Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., 123 Main St - Full Exterior Scope"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source-type">Source Type</Label>
                  <Select value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carrier_estimate">Carrier Estimate</SelectItem>
                      <SelectItem value="contractor_estimate">Contractor Estimate</SelectItem>
                      <SelectItem value="scope_of_work">Scope of Work</SelectItem>
                      <SelectItem value="notes">Field Notes</SelectItem>
                      <SelectItem value="mixed">Mixed Sources</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="loss-type">Loss Type</Label>
                  <Select value={lossType} onValueChange={setLossType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hail">Hail</SelectItem>
                      <SelectItem value="wind">Wind</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="fire">Fire</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dol">Date of Loss</Label>
                  <Input
                    id="dol"
                    type="date"
                    value={dol}
                    onChange={(e) => setDol(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, ST"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="claim-id">Claim ID (Optional)</Label>
                <Input
                  id="claim-id"
                  placeholder="Link to existing claim"
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Upload Documents</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="carrier-file">Carrier Estimate PDF</Label>
                <div className="flex gap-2">
                  <Input
                    id="carrier-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setCarrierFile(e.target.files?.[0] || null)}
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Or paste text directly:</p>
                <Textarea
                  placeholder="Paste carrier estimate text..."
                  value={carrierEstimateText}
                  onChange={(e) => setCarrierEstimateText(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="contractor-file">Contractor SOW PDF</Label>
                <div className="flex gap-2">
                  <Input
                    id="contractor-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setContractorFile(e.target.files?.[0] || null)}
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Or paste text directly:</p>
                <Textarea
                  placeholder="Paste contractor scope text..."
                  value={contractorScopeText}
                  onChange={(e) => setContractorScopeText(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="notes">Field Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Paste field notes, adjuster notes, or free-form text..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">AI Options</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="try-map-codes"
                  checked={tryMapCodes}
                  onCheckedChange={(v) => setTryMapCodes(v as boolean)}
                />
                <Label htmlFor="try-map-codes" className="font-normal">
                  Try to map line items to Xactimate-style codes (RFG+COMP, GUTR+RA, etc.)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="flag-supplement"
                  checked={flagSupplementCandidates}
                  onCheckedChange={(v) => setFlagSupplementCandidates(v as boolean)}
                />
                <Label htmlFor="flag-supplement" className="font-normal">
                  Flag items that may be supplement candidates (code-required, under-scoped)
                </Label>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleBuildScope}
              disabled={
                loading || !title || (!carrierEstimateText && !contractorScopeText && !notesText)
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing Documents...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Build Scope
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* STEP 2: STRUCTURE VIEW */}
        <TabsContent value="structure" className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{scope?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Source: {scope?.sourceType?.replace("_", " ")} • Confidence:{" "}
                  {Math.round((scope?.confidence || 0) * 100)}%
                </p>
              </div>
              {scope?.issues && scope.issues.length > 0 && (
                <Badge variant="destructive">
                  <Flag className="mr-1 h-3 w-3" />
                  {scope.issues.length} Issue{scope.issues.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {/* Issues Display */}
            {scope?.issues && scope.issues.length > 0 && (
              <div className="mb-6 rounded-lg border bg-yellow-50 p-4 dark:bg-yellow-950">
                <h4 className="mb-2 font-semibold">⚠️ Issues Detected:</h4>
                <ul className="space-y-2">
                  {scope.issues.map((issue: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      <span className="font-medium">{issue.type}:</span> {issue.message}
                      {issue.suggestedResolution && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          → {issue.suggestedResolution}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas & Line Items */}
            <div className="space-y-8">
              {scope?.areas?.map((area: any) => (
                <div key={area.id} className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold">{area.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {area.type} • {area.tradeHint}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {area.lineItems.filter((li: any) => li.included).length} /{" "}
                      {area.lineItems.length} items
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">✓</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Trade</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Flags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {area.lineItems.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={item.included}
                                onCheckedChange={() => handleToggleLineItem(area.id, item.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.code || "—"}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.description}</div>
                                {item.sourceText && (
                                  <div className="mt-1 text-xs italic text-muted-foreground">
                                    &quot;{item.sourceText}&quot;
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.trade}</Badge>
                            </TableCell>
                            <TableCell>{item.quantity || "?"}</TableCell>
                            <TableCell className="font-mono text-xs">{item.unit || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {item.flags?.isCodeRequired && (
                                  <Badge variant="secondary" className="text-xs">
                                    Code
                                  </Badge>
                                )}
                                {item.flags?.isSupplementCandidate && (
                                  <Badge variant="destructive" className="text-xs">
                                    Supp
                                  </Badge>
                                )}
                                {item.flags?.isDemolition && (
                                  <Badge variant="outline" className="text-xs">
                                    Demo
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button onClick={() => setStep("cleanup")}>Continue to Cleanup</Button>
            </div>
          </Card>
        </TabsContent>

        {/* STEP 3: CLEANUP & MERGE */}
        <TabsContent value="cleanup" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Cleanup & Merge</h3>
            <p className="mb-4 text-muted-foreground">In this step, you&apos;ll be able to:</p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Merge duplicate line items</li>
              <li>Split combined line items into separate entries</li>
              <li>Reassign items to different areas</li>
              <li>Tag ambiguous items for review</li>
              <li>Edit quantities and descriptions</li>
            </ul>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("structure")}>
                Back
              </Button>
              <Button onClick={handleSaveScope}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Scope"
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* STEP 4: SAVE & SEND */}
        <TabsContent value="save" className="space-y-6">
          <Card className="p-6">
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <h3 className="mb-2 text-2xl font-bold">Scope Saved!</h3>
              <p className="mb-6 text-muted-foreground">
                Your structured scope is ready to use. What would you like to do next?
              </p>

              <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
                <Card
                  className="cursor-pointer p-6 hover:border-primary"
                  onClick={handleCreateEstimate}
                >
                  <FileText className="mx-auto mb-2 h-8 w-8 text-blue-500" />
                  <h4 className="mb-1 font-semibold">Create Estimate</h4>
                  <p className="text-xs text-muted-foreground">
                    Generate insurance or retail estimate from this scope
                  </p>
                </Card>

                <Card
                  className="cursor-pointer p-6 hover:border-primary"
                  onClick={handleCreateSupplement}
                >
                  <FileText className="mx-auto mb-2 h-8 w-8 text-purple-500" />
                  <h4 className="mb-1 font-semibold">Create Supplement</h4>
                  <p className="text-xs text-muted-foreground">
                    Build supplement from flagged items
                  </p>
                </Card>

                <Card className="cursor-pointer p-6 hover:border-primary">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-green-500" />
                  <h4 className="mb-1 font-semibold">Create Report</h4>
                  <p className="text-xs text-muted-foreground">
                    Generate adjuster packet or contractor report
                  </p>
                </Card>
              </div>

              <div className="mt-8">
                <Button variant="outline" onClick={() => router.push("/scopes")}>
                  View All Scopes
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

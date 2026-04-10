"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Supplement Builder — Standalone Page
 *
 * Build insurance supplement packages with AI-assisted line item generation,
 * scope of work file uploads, and Xactimate PDF export.
 *
 * Separate from the Scope Editor — this page focuses on SUPPLEMENT generation
 * for carrier pushback / underpayment recovery.
 */

import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Download,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { ClaimContextHeader } from "@/components/claims/ClaimContextHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useClaims } from "@/hooks/useClaims";
import { logger } from "@/lib/logger";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SupplementItem {
  id: string;
  category: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  disputed?: boolean;
}

const CATEGORIES = [
  "Roofing",
  "Siding",
  "Gutters",
  "Interior",
  "General Conditions",
  "Overhead & Profit",
  "Labor",
  "Materials",
  "Permits",
  "Other",
];
const UNITS = ["SF", "LF", "EA", "SQ", "HR", "LS", "CY", "GAL"];

/* ------------------------------------------------------------------ */
/*  Inner component (needs useSearchParams via Suspense)               */
/* ------------------------------------------------------------------ */

function SupplementBuilderInner() {
  const searchParams = useSearchParams();
  const initialClaimId = searchParams?.get("claimId") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { claims, isLoading: claimsLoading } = useClaims();
  const [selectedClaimId, setSelectedClaimId] = useState(initialClaimId);
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [supplementTitle, setSupplementTitle] = useState("Supplement #1");

  /* AI Generation state */
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  /* File upload state */
  const [uploading, setUploading] = useState(false);

  /* Save / Export state */
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* Disputed import state */
  const [importingDisputed, setImportingDisputed] = useState(false);

  // Normalize claims for ClaimContextHeader shape
  const headerClaims = useMemo(
    () =>
      claims.map((c) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        propertyAddress: c.lossAddress,
        dateOfLoss: c.createdAt ? new Date(c.createdAt) : null,
      })),
    [claims]
  );

  /* ---------------------------------------------------------------- */
  /*  AI Generate Items                                                */
  /* ---------------------------------------------------------------- */
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Enter a description of what the supplement should cover");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai/supplement/generate-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          claimId: selectedClaimId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "AI generation failed");
      }
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newItems: SupplementItem[] = (data.items || []).map((item: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        category: item.category || "Other",
        code: item.code || "",
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "EA",
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        disputed: false,
      }));
      setItems((prev) => [...prev, ...newItems]);
      toast.success(`${newItems.length} items generated by AI`);
      setAiPrompt("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[SUPPLEMENT_AI_GENERATE]", err);
      toast.error(err.message || "Failed to generate items");
    } finally {
      setAiGenerating(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Scope File Upload (ESX / PDF)                                    */
  /* ---------------------------------------------------------------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedClaimId) formData.append("claimId", selectedClaimId);

      const res = await fetch("/api/upload/supabase", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success(`Uploaded: ${file.name}. Use AI prompt to extract line items from it.`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[SUPPLEMENT_FILE_UPLOAD]", err);
      toast.error("File upload failed");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Import Disputed Items from Scope                                 */
  /* ---------------------------------------------------------------- */
  const handleImportDisputed = async () => {
    if (!selectedClaimId) {
      toast.error("Select a claim first");
      return;
    }
    setImportingDisputed(true);
    try {
      const res = await fetch(`/api/claims/${selectedClaimId}/scope`);
      if (!res.ok) throw new Error("Failed to fetch scope");
      const data = await res.json();
      const disputedItems = (data.lineItems || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((item: any) => item.disputed)
        .map((item: any) => ({
          id: `disp-${Date.now()}-${item.id}`,
          category: item.category || "Other",
          code: item.code || "",
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          unit: item.unit || "EA",
          unitPrice: Number(item.unitPrice) || 0,
          total: Number(item.total) || 0,
          disputed: true,
        }));
      if (disputedItems.length === 0) {
        toast.info("No disputed items found in scope");
        return;
      }
      setItems((prev) => [...prev, ...disputedItems]);
      toast.success(`${disputedItems.length} disputed items imported`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[SUPPLEMENT_IMPORT_DISPUTED]", err);
      toast.error("Failed to import disputed items");
    } finally {
      setImportingDisputed(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Manual Item Editing                                              */
  /* ---------------------------------------------------------------- */
  const handleAddItem = () => {
    const newItem: SupplementItem = {
      id: `manual-${Date.now()}`,
      category: "Roofing",
      code: "",
      description: "",
      quantity: 1,
      unit: "SF",
      unitPrice: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemChange = (id: string, field: keyof SupplementItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  /* ---------------------------------------------------------------- */
  /*  Save to Supplement Tracker                                       */
  /* ---------------------------------------------------------------- */
  const handleSave = async () => {
    if (!selectedClaimId) {
      toast.error("Select a claim first");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    setSaving(true);
    try {
      const total = items.reduce((sum, item) => sum + item.total, 0);
      const res = await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          items,
          total,
          status: "draft",
          title: supplementTitle,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Supplement saved to tracker");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[SUPPLEMENT_SAVE]", err);
      toast.error("Failed to save supplement");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Export Xactimate PDF                                              */
  /* ---------------------------------------------------------------- */
  const handleExportPdf = async () => {
    if (!selectedClaimId) {
      toast.error("Select a claim first");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/ai/supplement/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          items: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          total: items.reduce((sum, i) => sum + i.total, 0),
        }),
      });
      if (!res.ok) throw new Error("PDF export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `supplement-${selectedClaimId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[SUPPLEMENT_EXPORT_PDF]", err);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Computed                                                         */
  /* ---------------------------------------------------------------- */
  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const disputedCount = useMemo(() => items.filter((i) => i.disputed).length, [items]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <ClaimContextHeader
        title="Supplement Builder"
        subtitle="Build insurance supplement packages with AI-assisted line items"
        icon={<FileText className="h-6 w-6" />}
        claims={headerClaims}
        selectedClaimId={selectedClaimId}
        onClaimChange={setSelectedClaimId}
        showTemplateSelector={false}
      >
        <div className="flex items-center gap-2">
          <Link href="/scope-editor">
            <Button variant="outline" size="sm">
              Scope Editor
            </Button>
          </Link>
        </div>
      </ClaimContextHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">Supplement Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-sm text-muted-foreground">Line Items</div>
          </CardContent>
        </Card>
        <Card
          className={
            disputedCount > 0
              ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
              : ""
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-2xl font-bold">
              {disputedCount > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              {disputedCount}
            </div>
            <div className="text-sm text-muted-foreground">Disputed Items</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Generation Box */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            AI Supplement Generator
          </CardTitle>
          <CardDescription>
            Describe the damage or work needed — AI will generate Xactimate-coded line items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Textarea
              placeholder="e.g. Replace 30 SQ of laminate shingles, 240 LF of drip edge, replace 4 damaged plywood decking sheets, install synthetic underlayment, 3 pipe boots..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="min-h-[80px] flex-1 bg-white dark:bg-slate-900"
              disabled={aiGenerating}
            />
            <Button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="self-end"
            >
              {aiGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload + Import Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Scope File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Upload Scope of Work
            </CardTitle>
            <CardDescription>Upload Xactimate ESX, PDF, or scope documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="scope-upload"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm transition hover:bg-muted"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Choose File"}
              </Label>
              <Input
                id="scope-upload"
                type="file"
                accept=".esx,.pdf,.xlsx,.csv,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <span className="text-xs text-muted-foreground">ESX, PDF, XLSX, CSV</span>
            </div>
          </CardContent>
        </Card>

        {/* Import Disputed from Scope */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Import from Scope Editor
            </CardTitle>
            <CardDescription>
              Pull in all disputed items from the claim&apos;s scope
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleImportDisputed}
              disabled={!selectedClaimId || importingDisputed}
            >
              {importingDisputed ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Import Disputed Items
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Supplement Title */}
      <div className="flex items-center gap-3">
        <Label htmlFor="supp-title" className="text-sm font-medium">
          Supplement Title:
        </Label>
        <Input
          id="supp-title"
          value={supplementTitle}
          onChange={(e) => setSupplementTitle(e.target.value)}
          className="max-w-xs"
          placeholder="Supplement #1"
        />
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Edit values directly in the table</CardDescription>
          </div>
          <Button size="sm" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Category</TableHead>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead className="min-w-[220px]">Description</TableHead>
                  <TableHead className="w-16 text-right">Qty</TableHead>
                  <TableHead className="w-16">Unit</TableHead>
                  <TableHead className="w-24 text-right">Unit $</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={item.disputed ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                  >
                    <TableCell>
                      <Select
                        value={item.category}
                        onValueChange={(v) => handleItemChange(item.id, "category", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.code}
                        onChange={(e) => handleItemChange(item.id, "code", e.target.value)}
                        className="h-8 font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-right text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.unit}
                        onValueChange={(v) => handleItemChange(item.id, "unit", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-right text-sm"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 text-lg font-medium">No Line Items Yet</h3>
              <p className="mb-4 max-w-md text-center text-sm text-muted-foreground">
                Use the AI generator above, import disputed items from your scope, or add items
                manually
              </p>
              <div className="flex gap-2">
                <Button onClick={handleAddItem} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Manually
                </Button>
                <Button
                  onClick={handleImportDisputed}
                  variant="outline"
                  disabled={!selectedClaimId}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Import Disputed
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Bar */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} •{" "}
            <span className="font-semibold text-foreground">
              ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            {disputedCount > 0 && (
              <>
                {" "}
                •{" "}
                <Badge variant="outline" className="text-amber-600">
                  {disputedCount} disputed
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export PDF
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !selectedClaimId}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save to Tracker
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Wrapper (Suspense for useSearchParams)                        */
/* ------------------------------------------------------------------ */

export default function SupplementBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SupplementBuilderInner />
    </Suspense>
  );
}

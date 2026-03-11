"use client";

import {
  ArrowRight,
  Download,
  FileCheck,
  FilePlus,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ClaimContextHeader } from "@/components/claims/ClaimContextHeader";
import { PageContainer } from "@/components/layout/PageContainer";
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
import { Textarea } from "@/components/ui/textarea";
import { useClaims } from "@/hooks/useClaims";
import { logger } from "@/lib/logger";

interface LineItem {
  id: string;
  category: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  disputed: boolean;
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

export default function SupplementBuilderPage() {
  const searchParams = useSearchParams();
  const claimIdFromUrl = searchParams?.get("claimId");
  const { claims } = useClaims();

  const [claimId, setClaimId] = useState(claimIdFromUrl || "");
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("professional");

  // New item form
  const [newCategory, setNewCategory] = useState("Roofing");
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnit, setNewUnit] = useState("EA");
  const [newUnitPrice, setNewUnitPrice] = useState(0);

  // AI assistance
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // File upload
  const [isUploading, setIsUploading] = useState(false);

  // Export/Save state
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => {
    if (!claimId) {
      toast.error("Please select a claim before adding items");
      return;
    }
    if (!newDescription.trim()) {
      toast.error("Please enter a description");
      return;
    }

    const item: LineItem = {
      id: Date.now().toString(),
      category: newCategory,
      code: newCode || `SUP-${Date.now().toString().slice(-4)}`,
      description: newDescription,
      quantity: newQuantity,
      unit: newUnit,
      unitPrice: newUnitPrice,
      total: newQuantity * newUnitPrice,
      disputed: false,
    };

    setItems([...items, item]);
    setNewDescription("");
    setNewCode("");
    setNewQuantity(1);
    setNewUnitPrice(0);
    toast.success("Line item added");
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    toast.success("Item removed");
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);

  // AI-assisted line item generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe the damage or work needed");
      return;
    }

    setIsAiGenerating(true);
    try {
      const response = await fetch("/api/ai/supplement/generate-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, claimId }),
      });

      if (!response.ok) throw new Error("Failed to generate items");

      const data = await response.json();
      if (data.items && Array.isArray(data.items)) {
        const newItems: LineItem[] = data.items.map((item: any, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          category: item.category || "Other",
          code: item.code || `AI-${idx + 1}`,
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit || "EA",
          unitPrice: item.unitPrice || 0,
          total: (item.quantity || 1) * (item.unitPrice || 0),
          disputed: false,
        }));
        setItems([...items, ...newItems]);
        toast.success(`Added ${newItems.length} AI-generated line items`);
        setAiPrompt("");
      }
    } catch (error) {
      logger.error("AI generation error:", error);
      toast.error("Failed to generate items. Please try again.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Import from scope editor
  const handleImportFromScope = async () => {
    if (!claimId) {
      toast.error("Please select a claim first");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/scope`);
      if (!response.ok) throw new Error("Failed to fetch scope");

      const data = await response.json();
      // API returns lineItems, not items
      const scopeData = data.lineItems || data.items || [];
      if (Array.isArray(scopeData) && scopeData.length > 0) {
        const scopeItems: LineItem[] = scopeData
          .filter((item: any) => item.disputed)
          .map((item: any) => ({
            id: `scope-${item.id}`,
            category: item.category || "Other",
            code: item.code || "",
            description: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || "EA",
            unitPrice: item.unitPrice || 0,
            total: item.total || item.quantity * item.unitPrice,
            disputed: true,
          }));

        if (scopeItems.length > 0) {
          setItems([...items, ...scopeItems]);
          toast.success(`Imported ${scopeItems.length} disputed items from scope`);
        } else {
          // Items exist but none are disputed
          toast.info("No disputed items found in scope. Mark items as disputed first.");
        }
      } else {
        toast.info("No scope items found for this claim");
      }
    } catch (error) {
      logger.error("Import error:", error);
      toast.error("Failed to import scope items");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!claimId) {
      toast.error("Please select a claim first");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add items before exporting");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/ai/supplement/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, items, total, template: selectedTemplate }),
      });

      if (!response.ok) throw new Error("Failed to export PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `supplement-${claimId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF exported in Xactimate format!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToTracker = async () => {
    if (!claimId) {
      toast.error("Please select a claim first");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add items before saving");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          items,
          total,
          status: "draft",
          title: `Supplement - ${new Date().toLocaleDateString()}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save supplement");
      }

      const data = await response.json();
      toast.success("Supplement saved to tracker!");

      // Optionally redirect to tracker
      if (data.supplementId) {
        window.location.href = `/supplements?highlight=${data.supplementId}`;
      }
    } catch (error) {
      logger.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save supplement");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <ClaimContextHeader
        title="Supplement Builder"
        subtitle="Create Xactimate-formatted claim supplements with AI assistance"
        icon={<FilePlus className="h-6 w-6" />}
        claims={claims.map((c) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          propertyAddress: c.lossAddress,
          dateOfLoss: null,
        }))}
        selectedClaimId={claimId}
        onClaimChange={setClaimId}
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
      />

      {/* Quick Actions Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/supplements">
          <Button variant="outline" size="sm">
            <ListChecks className="mr-2 h-4 w-4" />
            View Supplement Tracker
          </Button>
        </Link>
        {claimId && (
          <Link href={`/claims/${claimId}/scope`}>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Open Scope Editor
            </Button>
          </Link>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportFromScope}
          disabled={!claimId || isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Import Disputed Items
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Line Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Supplement Line Items
              {items.length > 0 && <Badge variant="secondary">{items.length} items</Badge>}
            </CardTitle>
            <CardDescription>
              Add line items manually, import from scope, or use AI to generate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI Generation Box */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-1 h-5 w-5 shrink-0 text-primary" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="ai-prompt" className="text-sm font-medium">
                        AI-Assisted Line Item Generation
                      </Label>
                      <Textarea
                        id="ai-prompt"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the damage or work needed... e.g., 'The adjuster missed the ridge vent replacement, ice & water shield on valleys, and 3 pipe boots'"
                        rows={2}
                      />
                      <Button
                        onClick={handleAiGenerate}
                        disabled={isAiGenerating || !aiPrompt.trim()}
                        size="sm"
                      >
                        {isAiGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Line Items
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items List */}
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.code && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.code}
                          </span>
                        )}
                        {item.disputed && (
                          <Badge variant="destructive" className="text-xs">
                            Disputed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.quantity} {item.unit} × ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">${item.total.toFixed(2)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-12 w-12" />
                    <p>No items added yet</p>
                    <p className="mt-1 text-sm">Use AI generation or add items manually</p>
                  </div>
                )}
              </div>

              {/* Total */}
              {items.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Supplement Total:</span>
                    <span className="text-emerald-600">${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Add Item Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Line Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="RFG LAMI"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., Ridge vent replacement"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="quantity">Qty</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger id="unit">
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
                </div>
                <div>
                  <Label htmlFor="unitPrice">Price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Button onClick={addItem} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export & Save</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={handleExportPDF}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={items.length === 0 || !claimId || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Xactimate PDF
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                disabled={items.length === 0 || !claimId || isSaving}
                onClick={handleSaveToTracker}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Save to Supplement Tracker
                  </>
                )}
              </Button>

              <p className="mt-2 text-center text-xs text-muted-foreground">
                Saved supplements are tracked and can be sent to adjusters
              </p>
            </CardContent>
          </Card>

          {/* Link to Tracker */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-4">
              <Link href="/supplements" className="group flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Supplement Tracker</p>
                    <p className="text-xs text-muted-foreground">Track all your supplements</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

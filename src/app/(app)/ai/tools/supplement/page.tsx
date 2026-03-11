"use client";

import {
  ArrowRight,
  Check,
  CheckCircle,
  Download,
  FileCheck,
  FilePlus,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useClaims } from "@/hooks/useClaims";
import { logger } from "@/lib/logger";

/* ─── Types ─── */
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
  ocpApproved?: boolean;
  _editing?: boolean;
}

/* ─── Constants ─── */
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

/* ─── Shared Add-Item Form ─── */
function AddItemForm({
  newCategory,
  setNewCategory,
  newCode,
  setNewCode,
  newDescription,
  setNewDescription,
  newQuantity,
  setNewQuantity,
  newUnit,
  setNewUnit,
  newUnitPrice,
  setNewUnitPrice,
  onAdd,
  label,
}: {
  newCategory: string;
  setNewCategory: (v: string) => void;
  newCode: string;
  setNewCode: (v: string) => void;
  newDescription: string;
  setNewDescription: (v: string) => void;
  newQuantity: number;
  setNewQuantity: (v: number) => void;
  newUnit: string;
  setNewUnit: (v: string) => void;
  newUnitPrice: number;
  setNewUnitPrice: (v: number) => void;
  onAdd: () => void;
  label: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Line Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger>
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
          </div>
          <div>
            <Label>Code</Label>
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="RFG LAMI"
            />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="e.g., Ridge vent replacement"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Qty</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 1)}
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={newUnit} onValueChange={setNewUnit}>
              <SelectTrigger>
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
            <Label>Price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newUnitPrice}
              onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <Button onClick={onAdd} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Page Component — Scope Editor + Supplement Builder
   ═══════════════════════════════════════════════════════════════ */
export default function SupplementBuilderPage() {
  const searchParams = useSearchParams();
  const claimIdFromUrl = searchParams?.get("claimId");
  const { claims } = useClaims();

  // Core state
  const [claimId, setClaimId] = useState(claimIdFromUrl || "");
  const [activeTab, setActiveTab] = useState<string>("scope");
  const [selectedTemplate, setSelectedTemplate] = useState("professional");

  // Scope items
  const [scopeItems, setScopeItems] = useState<LineItem[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeLoaded, setScopeLoaded] = useState(false);

  // Supplement items
  const [items, setItems] = useState<LineItem[]>([]);

  // Shared new-item form fields
  const [newCategory, setNewCategory] = useState("Roofing");
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnit, setNewUnit] = useState("EA");
  const [newUnitPrice, setNewUnitPrice] = useState(0);

  // AI / upload / export
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ─── Scope fetch ─── */
  const fetchScopeItems = useCallback(async () => {
    if (!claimId) return;
    setScopeLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/scope`);
      if (!res.ok) throw new Error("Failed to fetch scope");
      const data = await res.json();
      const fetched = (data.lineItems || []).map((item: any) => ({
        id: item.id,
        category: item.category || "Other",
        code: item.code || "",
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "EA",
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.total) || 0,
        disputed: item.disputed || false,
        ocpApproved: item.ocpApproved || false,
      }));
      setScopeItems(fetched);
      setScopeLoaded(true);
    } catch (err) {
      logger.error("Scope fetch error:", err);
      setScopeItems([]);
      setScopeLoaded(true);
    } finally {
      setScopeLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    if (claimId) {
      fetchScopeItems();
    } else {
      setScopeItems([]);
      setScopeLoaded(false);
    }
  }, [claimId, fetchScopeItems]);

  /* ─── Scope editing ─── */
  const handleScopeItemUpdate = (id: string, field: keyof LineItem, value: any) => {
    setScopeItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      })
    );
  };

  const handleToggleDisputed = (id: string) =>
    setScopeItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, disputed: !it.disputed } : it))
    );

  const handleToggleApproved = (id: string) =>
    setScopeItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ocpApproved: !it.ocpApproved } : it))
    );

  const handleToggleEditing = (id: string) =>
    setScopeItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, _editing: !it._editing } : it))
    );

  const handleAddScopeItem = () => {
    if (!newDescription.trim()) {
      toast.error("Enter a description");
      return;
    }
    const item: LineItem = {
      id: `scope-new-${Date.now()}`,
      category: newCategory,
      code: newCode || `SCO-${Date.now().toString().slice(-4)}`,
      description: newDescription,
      quantity: newQuantity,
      unit: newUnit,
      unitPrice: newUnitPrice,
      total: newQuantity * newUnitPrice,
      disputed: false,
      ocpApproved: false,
    };
    setScopeItems((prev) => [...prev, item]);
    resetForm();
    toast.success("Scope item added");
  };

  const handleRemoveScopeItem = (id: string) => {
    setScopeItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Scope item removed");
  };

  const handleSaveScope = async () => {
    if (!claimId) {
      toast.error("Select a claim first");
      return;
    }
    setScopeSaving(true);
    try {
      const payload = scopeItems.map(({ _editing, ...rest }) => rest);
      const res = await fetch(`/api/claims/${claimId}/scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Scope saved successfully");
    } catch (err) {
      logger.error("Save scope error:", err);
      toast.error("Failed to save scope");
    } finally {
      setScopeSaving(false);
    }
  };

  /* ─── Carry disputed -> supplement ─── */
  const handleCarryDisputedToSupplement = () => {
    const disputed = scopeItems.filter((item) => item.disputed);
    if (disputed.length === 0) {
      toast.info("No disputed items found. Mark items as disputed first.");
      return;
    }
    const newItems: LineItem[] = disputed.map((item) => ({
      ...item,
      id: `sup-${item.id}`,
      _editing: false,
    }));
    setItems((prev) => [...prev, ...newItems]);
    setActiveTab("supplement");
    toast.success(`Carried ${disputed.length} disputed items to supplement`);
  };

  /* ─── Supplement handlers ─── */
  const resetForm = () => {
    setNewDescription("");
    setNewCode("");
    setNewQuantity(1);
    setNewUnitPrice(0);
  };

  const addSupplementItem = () => {
    if (!claimId) {
      toast.error("Select a claim first");
      return;
    }
    if (!newDescription.trim()) {
      toast.error("Enter a description");
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
    setItems((prev) => [...prev, item]);
    resetForm();
    toast.success("Line item added");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Item removed");
  };

  /* ─── Computed ─── */
  const total = items.reduce((s, i) => s + i.total, 0);
  const scopeTotal = scopeItems.reduce((s, i) => s + i.total, 0);
  const disputedCount = scopeItems.filter((i) => i.disputed).length;

  /* ─── AI generation ─── */
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Describe the damage or work needed");
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
        const generated: LineItem[] = data.items.map((item: any, idx: number) => ({
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
        setItems((prev) => [...prev, ...generated]);
        toast.success(`Added ${generated.length} AI-generated line items`);
        setAiPrompt("");
      }
    } catch (error) {
      logger.error("AI generation error:", error);
      toast.error("Failed to generate items. Please try again.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  /* ─── Import from scope ─── */
  const handleImportFromScope = async () => {
    if (!claimId) {
      toast.error("Select a claim first");
      return;
    }
    if (scopeLoaded && scopeItems.length > 0) {
      handleCarryDisputedToSupplement();
      return;
    }
    setIsUploading(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/scope`);
      if (!response.ok) throw new Error("Failed to fetch scope");
      const data = await response.json();
      const scopeData = data.lineItems || data.items || [];
      if (Array.isArray(scopeData) && scopeData.length > 0) {
        const disputedItems: LineItem[] = scopeData
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
        if (disputedItems.length > 0) {
          setItems((prev) => [...prev, ...disputedItems]);
          toast.success(`Imported ${disputedItems.length} disputed items from scope`);
        } else {
          toast.info("No disputed items found. Go to Scope tab and mark items as disputed first.");
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

  /* ─── Export PDF ─── */
  const handleExportPDF = async () => {
    if (!claimId) {
      toast.error("Select a claim first");
      return;
    }
    if (items.length === 0) {
      toast.error("Add items before exporting");
      return;
    }
    setIsExporting(true);
    try {
      const response = await fetch("/api/ai/supplement/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          items,
          total,
          template: selectedTemplate,
        }),
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

  /* ─── Save to tracker ─── */
  const handleSaveToTracker = async () => {
    if (!claimId) {
      toast.error("Select a claim first");
      return;
    }
    if (items.length === 0) {
      toast.error("Add items before saving");
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

  /* ═══ RENDER ═══ */
  return (
    <PageContainer maxWidth="7xl">
      <ClaimContextHeader
        title="Scope Editor & Supplement Builder"
        subtitle="Edit claim scope, flag disputed items, and build Xactimate supplements"
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

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="scope" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Scope Editor
              {scopeItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {scopeItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="supplement" className="gap-2">
              <FilePlus className="h-4 w-4" />
              Supplement Builder
              {items.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {items.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <Link href="/supplements">
            <Button variant="outline" size="sm">
              <ListChecks className="mr-2 h-4 w-4" />
              Tracker
            </Button>
          </Link>
        </div>

        {/* ═══════ SCOPE EDITOR TAB ═══════ */}
        <TabsContent value="scope">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left — editable table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Scope Line Items
                      {scopeItems.length > 0 && (
                        <Badge variant="secondary">{scopeItems.length} items</Badge>
                      )}
                      {disputedCount > 0 && (
                        <Badge variant="destructive">{disputedCount} disputed</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Edit line items, mark disputed, then carry to Supplement
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveScope}
                      disabled={scopeSaving || scopeItems.length === 0 || !claimId}
                    >
                      {scopeSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Scope
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCarryDisputedToSupplement}
                      disabled={disputedCount === 0}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Carry {disputedCount} to Supplement
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {scopeLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : scopeItems.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto mb-2 h-12 w-12" />
                    <p className="font-medium">No scope items yet</p>
                    <p className="mt-1 text-sm">
                      {claimId
                        ? "Add items using the form on the right"
                        : "Select a claim above to load scope items"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-2 border-b pb-2 text-xs font-semibold text-muted-foreground">
                      <div className="col-span-1">Status</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-1">Code</div>
                      <div className="col-span-3">Description</div>
                      <div className="col-span-1 text-right">Qty</div>
                      <div className="col-span-1">Unit</div>
                      <div className="col-span-1 text-right">Price</div>
                      <div className="col-span-1 text-right">Total</div>
                      <div className="col-span-1 text-center">Actions</div>
                    </div>

                    {/* Rows */}
                    <div className="max-h-[500px] space-y-1 overflow-y-auto">
                      {scopeItems.map((item) => {
                        const rowBg = item.disputed
                          ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
                          : item.ocpApproved
                            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
                            : "hover:bg-muted/50";
                        return (
                          <div
                            key={item.id}
                            className={`grid grid-cols-12 items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors ${rowBg}`}
                          >
                            {/* Status toggles */}
                            <div className="col-span-1 flex gap-1">
                              <button
                                onClick={() => handleToggleDisputed(item.id)}
                                title={item.disputed ? "Remove dispute" : "Mark disputed"}
                                className={`rounded p-1 transition-colors ${
                                  item.disputed
                                    ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                                    : "text-gray-400 hover:text-red-500"
                                }`}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleApproved(item.id)}
                                title={item.ocpApproved ? "Remove approval" : "Mark approved"}
                                className={`rounded p-1 transition-colors ${
                                  item.ocpApproved
                                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                                    : "text-gray-400 hover:text-green-500"
                                }`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Editable vs read-only cells */}
                            {item._editing ? (
                              <>
                                <div className="col-span-2">
                                  <Select
                                    value={item.category}
                                    onValueChange={(v) =>
                                      handleScopeItemUpdate(item.id, "category", v)
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs">
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
                                </div>
                                <div className="col-span-1">
                                  <Input
                                    value={item.code}
                                    onChange={(e) =>
                                      handleScopeItemUpdate(item.id, "code", e.target.value)
                                    }
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <Input
                                    value={item.description}
                                    onChange={(e) =>
                                      handleScopeItemUpdate(item.id, "description", e.target.value)
                                    }
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleScopeItemUpdate(
                                        item.id,
                                        "quantity",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="h-7 text-right text-xs"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <Select
                                    value={item.unit}
                                    onValueChange={(v) => handleScopeItemUpdate(item.id, "unit", v)}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
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
                                <div className="col-span-1">
                                  <Input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      handleScopeItemUpdate(
                                        item.id,
                                        "unitPrice",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="h-7 text-right text-xs"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="col-span-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                </div>
                                <div className="col-span-1 font-mono text-xs text-muted-foreground">
                                  {item.code}
                                </div>
                                <div className="col-span-3 truncate text-sm">
                                  {item.description}
                                </div>
                                <div className="col-span-1 text-right text-xs">{item.quantity}</div>
                                <div className="col-span-1 text-xs text-muted-foreground">
                                  {item.unit}
                                </div>
                                <div className="col-span-1 text-right text-xs">
                                  ${item.unitPrice.toFixed(2)}
                                </div>
                              </>
                            )}

                            {/* Total */}
                            <div className="col-span-1 text-right text-sm font-semibold">
                              ${item.total.toFixed(2)}
                            </div>

                            {/* Actions */}
                            <div className="col-span-1 flex justify-center gap-1">
                              <button
                                onClick={() => handleToggleEditing(item.id)}
                                className="rounded p-1 text-gray-400 hover:text-blue-500"
                                title={item._editing ? "Done" : "Edit"}
                              >
                                {item._editing ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Pencil className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleRemoveScopeItem(item.id)}
                                className="rounded p-1 text-gray-400 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer total */}
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="font-semibold">Scope Total ({scopeItems.length} items)</span>
                      <span className="text-lg font-bold text-emerald-600">
                        ${scopeTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right — add form + carry card */}
            <div className="space-y-6">
              <AddItemForm
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                newCode={newCode}
                setNewCode={setNewCode}
                newDescription={newDescription}
                setNewDescription={setNewDescription}
                newQuantity={newQuantity}
                setNewQuantity={setNewQuantity}
                newUnit={newUnit}
                setNewUnit={setNewUnit}
                newUnitPrice={newUnitPrice}
                setNewUnitPrice={setNewUnitPrice}
                onAdd={handleAddScopeItem}
                label="Add Scope Item"
              />

              {/* Carry card */}
              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:border-orange-900 dark:from-orange-950/30 dark:to-amber-950/30">
                <CardContent className="py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-orange-600" />
                    <p className="font-medium text-orange-700 dark:text-orange-400">
                      Carry to Supplement
                    </p>
                  </div>
                  <p className="mb-3 text-xs text-orange-600 dark:text-orange-400">
                    Mark items as <strong>disputed</strong> (red X), then carry them to the
                    Supplement Builder tab.
                  </p>
                  <Button
                    onClick={handleCarryDisputedToSupplement}
                    disabled={disputedCount === 0}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    size="sm"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Carry {disputedCount} Disputed Items
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ SUPPLEMENT BUILDER TAB ═══════ */}
        <TabsContent value="supplement">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveTab("scope")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Back to Scope Editor
            </Button>
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
            {/* Left — supplement items + AI */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Supplement Line Items
                  {items.length > 0 && <Badge variant="secondary">{items.length} items</Badge>}
                </CardTitle>
                <CardDescription>Add items manually, import from scope, or use AI</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* AI box */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-medium">
                            AI-Assisted Line Item Generation
                          </Label>
                          <Textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Describe the damage or work needed... e.g., 'The adjuster missed the ridge vent replacement, ice and water shield on valleys, and 3 pipe boots'"
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

                  {/* Items list */}
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
                            {item.quantity} {item.unit} x ${item.unitPrice.toFixed(2)}
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
                        <p>No supplement items added yet</p>
                        <p className="mt-1 text-sm">
                          Use AI generation, add manually, or{" "}
                          <button
                            className="text-primary underline"
                            onClick={() => setActiveTab("scope")}
                          >
                            carry disputed items from the Scope Editor
                          </button>
                        </p>
                      </div>
                    )}
                  </div>

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

            {/* Right — add form + export */}
            <div className="space-y-6">
              <AddItemForm
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                newCode={newCode}
                setNewCode={setNewCode}
                newDescription={newDescription}
                setNewDescription={setNewDescription}
                newQuantity={newQuantity}
                setNewQuantity={setNewQuantity}
                newUnit={newUnit}
                setNewUnit={setNewUnit}
                newUnitPrice={newUnitPrice}
                setNewUnitPrice={setNewUnitPrice}
                onAdd={addSupplementItem}
                label="Add Supplement Item"
              />

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
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

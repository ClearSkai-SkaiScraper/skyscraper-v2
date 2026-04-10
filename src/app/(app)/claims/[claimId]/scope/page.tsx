"use client";

/**
 * Scope Editor Page
 * Xactimate-style line item editor for claim scope of work.
 * Fetches/saves against /api/claims/[claimId]/scope.
 */

import {
  Calculator,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ocpApproved: boolean;
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

export default function ScopePage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchScope() {
      if (!claimId) return;
      try {
        const res = await fetch(`/api/claims/${claimId}/scope`);
        if (res.ok) {
          const data = await res.json();
          setLineItems(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data.lineItems || []).map((item: any) => ({
              id: item.id,
              category: item.category || "Other",
              code: item.code || "",
              description: item.description || "",
              quantity: Number(item.quantity) || 1,
              unit: item.unit || "EA",
              unitPrice: Number(item.unitPrice) || 0,
              total: Number(item.total) || 0,
              ocpApproved: item.ocpApproved || false,
              disputed: item.disputed || false,
            }))
          );
        }
      } catch (err) {
        logger.error("Failed to fetch scope:", err);
      } finally {
        setLoading(false);
      }
    }
    void fetchScope();
  }, [claimId]);

  const calculateTotals = useCallback(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const approved = lineItems
      .filter((item) => item.ocpApproved)
      .reduce((sum, item) => sum + item.total, 0);
    const disputed = lineItems
      .filter((item) => item.disputed)
      .reduce((sum, item) => sum + item.total, 0);
    return { subtotal, approved, disputed };
  }, [lineItems]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      category: "Roofing",
      code: "",
      description: "",
      quantity: 1,
      unit: "SF",
      unitPrice: 0,
      total: 0,
      ocpApproved: false,
      disputed: false,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleDeleteSelected = () => {
    setLineItems((items) => items.filter((item) => !selectedItems.has(item.id)));
    setSelectedItems(new Set());
    toast.success("Items removed");
  };

  const handleSave = async () => {
    if (!claimId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Scope saved successfully");
    } catch (err) {
      logger.error("Save scope error:", err);
      toast.error("Failed to save scope");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Code",
      "Description",
      "Qty",
      "Unit",
      "Unit Price",
      "Total",
      "Approved",
      "Disputed",
    ];
    const rows = lineItems.map((item) => [
      item.code,
      `"${item.description}"`,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.total,
      item.ocpApproved ? "Yes" : "No",
      item.disputed ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scope-${claimId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const { subtotal, approved, disputed } = calculateTotals();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <PageHero
        title="Scope Editor"
        subtitle="Xactimate-style line item editor for claim scope of work"
        icon={<FileSpreadsheet className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/scope-editor">
              <Button variant="outline" size="sm">
                All Claims
              </Button>
            </Link>
            <Link href={`/ai/tools/supplement?claimId=${claimId}`}>
              <Button variant="outline" size="sm">
                Supplement Builder
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      />

      {/* Totals Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">Total Scope</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-2xl font-bold text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />$
              {approved.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">Carrier Approved</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-2xl font-bold text-red-700 dark:text-red-400">
              <XCircle className="h-5 w-5" />$
              {disputed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">Disputed Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{lineItems.length}</div>
            <div className="text-sm text-muted-foreground">Line Items</div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Line Items
            </CardTitle>
            <CardDescription>Click cells to edit values directly</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedItems.size})
              </Button>
            )}
            <Button size="sm" onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedItems.size === lineItems.length && lineItems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(new Set(lineItems.map((i) => i.id)));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-24">Category</TableHead>
                  <TableHead className="w-28">Code</TableHead>
                  <TableHead className="min-w-[250px]">Description</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-16">Unit</TableHead>
                  <TableHead className="w-24 text-right">Unit Price</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-16 text-center">OCP</TableHead>
                  <TableHead className="w-16 text-center">Dispute</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={
                      item.disputed
                        ? "bg-red-50 dark:bg-red-950/20"
                        : item.ocpApproved
                          ? "bg-green-50/50 dark:bg-green-950/10"
                          : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedItems);
                          if (checked) next.add(item.id);
                          else next.delete(item.id);
                          setSelectedItems(next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.category}
                        onValueChange={(v) => handleItemChange(item.id, "category", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.ocpApproved}
                        onCheckedChange={(checked) =>
                          handleItemChange(item.id, "ocpApproved", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.disputed}
                        onCheckedChange={(checked) =>
                          handleItemChange(item.id, "disputed", !!checked)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {lineItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 text-lg font-medium">No Line Items</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Click &quot;Add Item&quot; to start building your scope
              </p>
              <Button onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900" />
              <span>OCP Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-red-300 bg-red-100 dark:border-red-700 dark:bg-red-900" />
              <span>Disputed Item</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">SF</Badge>
              <span>= Square Feet</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">LF</Badge>
              <span>= Linear Feet</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">SQ</Badge>
              <span>= Roofing Square (100 SF)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">EA</Badge>
              <span>= Each</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">LS</Badge>
              <span>= Lump Sum</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

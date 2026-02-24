"use client";

import { Download, FileCheck, FilePlus, FileText, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ClaimContextHeader } from "@/components/claims/ClaimContextHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClaims } from "@/hooks/useClaims";
import { logger } from "@/lib/logger";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function SupplementBuilderPage() {
  const searchParams = useSearchParams();
  const claimIdFromUrl = searchParams?.get("claimId");
  const { claims } = useClaims();

  const [claimId, setClaimId] = useState(claimIdFromUrl || "");
  const [items, setItems] = useState<LineItem[]>([]);
  const [newDescription, setNewDescription] = useState("");
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("professional");

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
      description: newDescription,
      quantity: newQuantity,
      unitPrice: newUnitPrice,
    };
    setItems([...items, item]);
    setNewDescription("");
    setNewQuantity(1);
    setNewUnitPrice(0);
    toast.success("Item added");
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    toast.success("Item removed");
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
        body: JSON.stringify({ claimId, items, total }),
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

      toast.success("PDF exported successfully!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToClaim = async () => {
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
      const response = await fetch("/api/ai/supplement/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, items, total }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save supplement");
      }

      toast.success("Supplement saved to claim!");
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
        subtitle="Create additional scope items and claim amendments"
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

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Line Items</h2>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-12 w-12" />
                    <p>No items added yet</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Add Item</h2>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g., Ridge vent replacement"
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div>
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <Button onClick={addItem} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Button
                  onClick={handleExportPDF}
                  className="w-full"
                  disabled={items.length === 0 || !claimId || isExporting}
                >
                  {isExporting ? (
                    <>
                      <Download className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Branded PDF
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={items.length === 0 || !claimId || isSaving}
                  onClick={handleSaveToClaim}
                >
                  {isSaving ? (
                    <>
                      <FileCheck className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Save to Claim
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

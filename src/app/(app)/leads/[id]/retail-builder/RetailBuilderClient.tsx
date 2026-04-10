"use client";

import {
  Calendar,
  DollarSign,
  FileText,
  Plus,
  Save,
  Send,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Material {
  id: string;
  name: string;
  category?: string;
  price?: number;
  vendor?: string;
}

interface RetailBuilderClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lead: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contact: any;
  materials: Material[];
}

export default function RetailBuilderClient({
  lead,
  contact,
  materials,
}: RetailBuilderClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("scope");

  // Scope state
  const [scope, setScope] = useState({
    title: lead.title || "",
    description: lead.description || "",
    workType: lead.workType || "",
    squareFootage: "",
    stories: "1",
    notes: "",
  });

  // Materials state
  const [selectedMaterials, setSelectedMaterials] = useState<
    Array<{
      materialId: string;
      name: string;
      category: string;
      quantity: number;
      unitPrice: number;
      tier: "essential" | "recommended" | "premium";
    }>
  >([]);

  // Pricing state
  const [pricing, setPricing] = useState({
    materialCost: 0,
    laborCost: 0,
    permitCost: 0,
    overheadCost: 0,
    profitMargin: 20, // percentage
  });

  // Timeline state
  const [timeline, setTimeline] = useState({
    estimatedStartDate: "",
    estimatedEndDate: "",
    phases: [] as Array<{ name: string; days: number }>,
  });

  // Calculate totals
  const materialTotal = selectedMaterials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);
  const laborTotal = pricing.laborCost;
  const subtotal = materialTotal + laborTotal + pricing.permitCost + pricing.overheadCost;
  const profit = subtotal * (pricing.profitMargin / 100);
  const grandTotal = subtotal + profit;

  const addMaterial = (material: Material) => {
    setSelectedMaterials([
      ...selectedMaterials,
      {
        materialId: material.id,
        name: material.name,
        category: material.category || "Other",
        quantity: 1,
        unitPrice: material.price || 0,
        tier: "recommended",
      },
    ]);
  };

  const removeMaterial = (index: number) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMaterial = (index: number, field: string, value: any) => {
    const updated = [...selectedMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedMaterials(updated);
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      const payload = {
        leadId: lead.id,
        scope,
        materials: selectedMaterials,
        pricing: {
          ...pricing,
          materialCost: materialTotal,
          totalPrice: grandTotal,
        },
        timeline,
        status: "draft",
      };

      const response = await fetch("/api/retail-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        toast.error("Failed to save draft");
        setIsLoading(false);
        return;
      }

      const retailJob = await response.json();
      toast.success("Draft saved successfully!");
      router.push(`/retail-jobs/${retailJob.id}`);
    } catch (error) {
      logger.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProposal = async () => {
    setIsLoading(true);
    try {
      const payload = {
        leadId: lead.id,
        scope,
        materials: selectedMaterials,
        pricing: {
          ...pricing,
          materialCost: materialTotal,
          totalPrice: grandTotal,
        },
        timeline,
        status: "proposal",
      };

      const response = await fetch("/api/retail-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        toast.error("Failed to create retail job");
        setIsLoading(false);
        return;
      }

      const retailJob = await response.json();

      // Generate PDF proposal
      toast.success("🎉 Retail job created! Generating proposal...");
      router.push(`/retail-jobs/${retailJob.id}?generateProposal=true`);
    } catch (error) {
      logger.error("Error creating retail job:", error);
      toast.error("Failed to create retail job");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Retail Job Builder</h1>
          <p className="mt-1 text-gray-600">
            Converting lead: {contact.firstName} {contact.lastName}
          </p>
        </div>
        <Badge variant="default" className="px-4 py-2 text-lg">
          🛒 Retail Pipeline
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scope">
            <FileText className="mr-2 h-4 w-4" />
            Scope
          </TabsTrigger>
          <TabsTrigger value="materials">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="mr-2 h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Calendar className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* SCOPE TAB */}
        <TabsContent value="scope">
          <Card>
            <CardHeader>
              <CardTitle>Project Scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={scope.title}
                  onChange={(e) => setScope({ ...scope, title: e.target.value })}
                  placeholder="e.g., Full Roof Replacement"
                />
              </div>

              <div>
                <Label htmlFor="workType">Work Type</Label>
                <Input
                  id="workType"
                  value={scope.workType}
                  onChange={(e) => setScope({ ...scope, workType: e.target.value })}
                  placeholder="e.g., Roof Replacement, Siding, Windows"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="squareFootage">Square Footage</Label>
                  <Input
                    id="squareFootage"
                    type="number"
                    value={scope.squareFootage}
                    onChange={(e) => setScope({ ...scope, squareFootage: e.target.value })}
                    placeholder="2500"
                  />
                </div>
                <div>
                  <Label htmlFor="stories">Stories</Label>
                  <Input
                    id="stories"
                    value={scope.stories}
                    onChange={(e) => setScope({ ...scope, stories: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  rows={6}
                  value={scope.description}
                  onChange={(e) => setScope({ ...scope, description: e.target.value })}
                  placeholder="Describe the full scope of work..."
                />
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={scope.notes}
                  onChange={(e) => setScope({ ...scope, notes: e.target.value })}
                  placeholder="Any notes for your team..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MATERIALS TAB */}
        <TabsContent value="materials">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Material Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] space-y-2 overflow-y-auto">
                  {materials.length === 0 ? (
                    <p className="text-gray-500">No materials available</p>
                  ) : (
                    materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-sm text-gray-500">{material.category}</p>
                        </div>
                        <Button size="sm" onClick={() => addMaterial(material)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selected Materials ({selectedMaterials.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] space-y-3 overflow-y-auto">
                  {selectedMaterials.length === 0 ? (
                    <p className="text-gray-500">No materials selected</p>
                  ) : (
                    selectedMaterials.map((material, index) => (
                      <div key={index} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{material.name}</p>
                            <p className="text-sm text-gray-500">{material.category}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeMaterial(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) =>
                                updateMaterial(index, "quantity", parseInt(e.target.value) || 1)
                              }
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Price</Label>
                            <Input
                              type="number"
                              value={material.unitPrice}
                              onChange={(e) =>
                                updateMaterial(index, "unitPrice", parseFloat(e.target.value) || 0)
                              }
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <Input
                              value={`$${(material.quantity * material.unitPrice).toFixed(2)}`}
                              disabled
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedMaterials.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Material Total:</span>
                      <span>${materialTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PRICING TAB */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="laborCost">Labor Cost</Label>
                <Input
                  id="laborCost"
                  type="number"
                  value={pricing.laborCost}
                  onChange={(e) =>
                    setPricing({ ...pricing, laborCost: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="5000"
                />
              </div>

              <div>
                <Label htmlFor="permitCost">Permit Cost</Label>
                <Input
                  id="permitCost"
                  type="number"
                  value={pricing.permitCost}
                  onChange={(e) =>
                    setPricing({ ...pricing, permitCost: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="500"
                />
              </div>

              <div>
                <Label htmlFor="overheadCost">Overhead Cost</Label>
                <Input
                  id="overheadCost"
                  type="number"
                  value={pricing.overheadCost}
                  onChange={(e) =>
                    setPricing({ ...pricing, overheadCost: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="1000"
                />
              </div>

              <div>
                <Label htmlFor="profitMargin">Profit Margin (%)</Label>
                <Input
                  id="profitMargin"
                  type="number"
                  value={pricing.profitMargin}
                  onChange={(e) =>
                    setPricing({ ...pricing, profitMargin: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="20"
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span>Material Cost:</span>
                  <span>${materialTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span>${laborTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Permit Cost:</span>
                  <span>${pricing.permitCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overhead Cost:</span>
                  <span>${pricing.overheadCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profit ({pricing.profitMargin}%):</span>
                  <span>${profit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-xl font-bold">
                  <span>Grand Total:</span>
                  <span className="text-green-600">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIMELINE TAB */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Estimated Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={timeline.estimatedStartDate}
                    onChange={(e) =>
                      setTimeline({ ...timeline, estimatedStartDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Estimated End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={timeline.estimatedEndDate}
                    onChange={(e) => setTimeline({ ...timeline, estimatedEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-600">
                  📅 Duration:{" "}
                  {timeline.estimatedStartDate && timeline.estimatedEndDate
                    ? `${Math.ceil((new Date(timeline.estimatedEndDate).getTime() - new Date(timeline.estimatedStartDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                    : "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button onClick={handleGenerateProposal} disabled={isLoading || !scope.title}>
          <Send className="mr-2 h-4 w-4" />
          Generate Proposal
        </Button>
      </div>
    </div>
  );
}

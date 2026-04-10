// src/features/claims/steps/Step5_MaterialsScope.tsx
"use client";

import { Package, Plus, ShieldCheck,X } from "lucide-react";
import { useState } from "react";

import { MaterialPicker } from "@/components/MaterialPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface SelectedMaterial {
  id: string;
  name: string;
  vendor: string;
  type: string;
  category: string;
  description?: string;
  specs?: { label: string; value: string }[];
  warranty?: string;
  selectedColor?: string;
  quantity?: number;
  notes?: string;
}

export interface Step5Data {
  materialsList?: string;
  scopeOfWork?: string;
  estimatedCosts?: string;
  selectedMaterials?: SelectedMaterial[];
}

interface Step5Props {
  data: Partial<Step5Data>;
  onChange: (data: Partial<Step5Data>) => void;
}

export function Step5_MaterialsScope({ data, onChange }: Step5Props) {
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const selectedMaterials = data.selectedMaterials || [];

  const updateField = (field: keyof Step5Data, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddMaterial = (product: any) => {
    const newMaterial: SelectedMaterial = {
      id: product.id,
      name: product.name,
      vendor: product.vendor,
      type: product.type,
      category: product.category,
      description: product.description,
      specs: product.specs,
      warranty: product.warranty,
      quantity: 1,
    };

    const updated = [...selectedMaterials, newMaterial];
    onChange({ ...data, selectedMaterials: updated });

    // Auto-populate materials list
    const materialText = updated
      .map(
        (m) =>
          `${m.quantity}x ${m.name} (${m.vendor}) - ${m.selectedColor || m.type}\n  Specs: ${m.specs?.map((s) => `${s.label}: ${s.value}`).join(", ") || "N/A"}\n  Warranty: ${m.warranty || "N/A"}`
      )
      .join("\n\n");
    updateField("materialsList", materialText);
  };

  const handleRemoveMaterial = (index: number) => {
    const updated = selectedMaterials.filter((_, i) => i !== index);
    onChange({ ...data, selectedMaterials: updated });
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const updated = [...selectedMaterials];
    updated[index] = { ...updated[index], quantity };
    onChange({ ...data, selectedMaterials: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Materials & Scope of Work</h2>
        <p className="mt-2 text-sm text-slate-600">
          Select materials from verified manufacturer catalogs and detail work to be performed.
        </p>
      </div>

      {/* Selected Materials */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Selected Materials</Label>
          <Button onClick={() => setShowMaterialPicker(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add from Catalog
          </Button>
        </div>

        {selectedMaterials.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-600">No materials selected yet</p>
              <p className="text-xs text-slate-500">
                Add products from GAF, Westlake, and other manufacturers
              </p>
              <Button
                onClick={() => setShowMaterialPicker(true)}
                size="sm"
                className="mt-4"
                variant="outline"
              >
                Browse Catalog
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedMaterials.map((material, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">{material.name}</h4>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {material.vendor}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {material.category}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMaterial(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {material.description && (
                        <p className="text-sm text-slate-600">{material.description}</p>
                      )}

                      {material.specs && material.specs.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {material.specs.slice(0, 4).map((spec, idx) => (
                            <span key={idx} className="text-slate-600">
                              <span className="font-medium">{spec.label}:</span> {spec.value}
                            </span>
                          ))}
                        </div>
                      )}

                      {material.warranty && (
                        <div className="flex items-center gap-1 text-xs text-green-700">
                          <ShieldCheck className="h-3 w-3" />
                          {material.warranty}
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`quantity-${index}`} className="text-xs">
                            Quantity:
                          </Label>
                          <input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={material.quantity || 1}
                            onChange={(e) =>
                              handleUpdateQuantity(index, parseInt(e.target.value) || 1)
                            }
                            className="w-20 rounded border px-2 py-1 text-sm"
                            aria-label="Material quantity"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="materialsList">Materials List (Auto-Generated)</Label>
        <Textarea
          id="materialsList"
          value={data.materialsList || ""}
          onChange={(e) => updateField("materialsList", e.target.value)}
          placeholder="Select materials above or manually enter materials list..."
          rows={8}
        />
        <p className="text-xs text-slate-500">
          This list is automatically populated from your selected materials above
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scopeOfWork">Scope of Work</Label>
        <Textarea
          id="scopeOfWork"
          value={data.scopeOfWork || ""}
          onChange={(e) => updateField("scopeOfWork", e.target.value)}
          placeholder="Detailed description of all work to be performed..."
          rows={8}
        />
        <p className="text-xs text-slate-500">
          Break down by phase or area (tear-off, installation, cleanup, etc.)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedCosts">Estimated Costs</Label>
        <Textarea
          id="estimatedCosts"
          value={data.estimatedCosts || ""}
          onChange={(e) => updateField("estimatedCosts", e.target.value)}
          placeholder="Breakdown of estimated costs..."
          rows={6}
        />
        <p className="text-xs text-slate-500">
          Include labor, materials, permits, and any other expenses
        </p>
      </div>

      {/* Material Picker Modal */}
      <MaterialPicker
        open={showMaterialPicker}
        onClose={() => setShowMaterialPicker(false)}
        onSelect={handleAddMaterial}
        title="Select Roofing Materials"
        description="Choose from GAF, Westlake, and other verified manufacturers"
      />
    </div>
  );
}

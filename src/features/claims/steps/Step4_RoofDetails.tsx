// src/features/claims/steps/Step4_RoofDetails.tsx
"use client";

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
import { CONDITION_OPTIONS, MATERIAL_OPTIONS, PITCH_OPTIONS } from "@/lib/constants/roofing";

export interface Step4Data {
  roofAge?: string;
  roofMaterial?: string;
  roofSquares?: string;
  roofPitch?: string;
  roofLayers?: string;
  roofCondition?: string;
  damageExtent?: string;
  roofNotes?: string;
}

interface Step4Props {
  data: Partial<Step4Data>;
  onChange: (data: Partial<Step4Data>) => void;
}

export function Step4_RoofDetails({ data, onChange }: Step4Props) {
  const updateField = (field: keyof Step4Data, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Roof Details</h2>
        <p className="mt-2 text-sm text-slate-600">
          Comprehensive roof information and damage assessment.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="roofAge">Roof Age (years)</Label>
          <Input
            id="roofAge"
            type="number"
            value={data.roofAge || ""}
            onChange={(e) => updateField("roofAge", e.target.value)}
            placeholder="Age in years"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roofMaterial">Roof Material</Label>
          <Select
            value={data.roofMaterial || ""}
            onValueChange={(value) => updateField("roofMaterial", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roofSquares">Roof Squares</Label>
          <Input
            id="roofSquares"
            type="number"
            value={data.roofSquares || ""}
            onChange={(e) => updateField("roofSquares", e.target.value)}
            placeholder="Total squares"
            step="0.1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roofPitch">Roof Pitch</Label>
          <Select
            value={data.roofPitch || ""}
            onValueChange={(value) => updateField("roofPitch", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select pitch" />
            </SelectTrigger>
            <SelectContent>
              {PITCH_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roofLayers">Number of Layers</Label>
          <Input
            id="roofLayers"
            type="number"
            value={data.roofLayers || ""}
            onChange={(e) => updateField("roofLayers", e.target.value)}
            placeholder="1, 2, 3+"
            min="1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roofCondition">Pre-Loss Condition</Label>
          <Select
            value={data.roofCondition || ""}
            onValueChange={(value) => updateField("roofCondition", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="damageExtent">Damage Extent</Label>
        <Textarea
          id="damageExtent"
          value={data.damageExtent || ""}
          onChange={(e) => updateField("damageExtent", e.target.value)}
          placeholder="Describe the extent of roof damage..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="roofNotes">Additional Roof Notes</Label>
        <Textarea
          id="roofNotes"
          value={data.roofNotes || ""}
          onChange={(e) => updateField("roofNotes", e.target.value)}
          placeholder="Special considerations, warranties, previous repairs, etc."
          rows={3}
        />
      </div>
    </div>
  );
}

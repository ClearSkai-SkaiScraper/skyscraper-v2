// src/features/claims/steps/Step3_DamageAssessment.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface Step3Data {
  damageDescription?: string;
  affectedAreas?: string[];
  severityLevel?: string;
  waterDamage?: boolean;
  structuralDamage?: boolean;
  interiorDamage?: boolean;
  exteriorDamage?: boolean;
  estimatedCausation?: string;
}

interface Step3Props {
  data: Partial<Step3Data>;
  onChange: (data: Partial<Step3Data>) => void;
}

const AFFECTED_AREAS = [
  "Roof",
  "Siding",
  "Windows",
  "Doors",
  "Gutters",
  "Fascia/Soffit",
  "Interior Walls",
  "Ceilings",
  "Flooring",
  "HVAC",
  "Electrical",
  "Plumbing",
];

export function Step3_DamageAssessment({ data, onChange }: Step3Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (field: keyof Step3Data, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleArea = (area: string) => {
    const current = data.affectedAreas || [];
    const updated = current.includes(area) ? current.filter((a) => a !== area) : [...current, area];
    updateField("affectedAreas", updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Damage Assessment</h2>
        <p className="mt-2 text-sm text-slate-600">Document the extent and nature of the damage.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="damageDescription">Damage Description</Label>
        <Textarea
          id="damageDescription"
          value={data.damageDescription || ""}
          onChange={(e) => updateField("damageDescription", e.target.value)}
          placeholder="Detailed description of visible damage..."
          rows={6}
        />
      </div>

      <div className="space-y-4">
        <Label>Affected Areas</Label>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {AFFECTED_AREAS.map((area) => (
            <div key={area} className="flex items-center space-x-2">
              <Checkbox
                id={`area-${area}`}
                checked={(data.affectedAreas || []).includes(area)}
                onCheckedChange={() => toggleArea(area)}
              />
              <label
                htmlFor={`area-${area}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {area}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Label>Damage Types</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="waterDamage"
                checked={data.waterDamage || false}
                onCheckedChange={(checked) => updateField("waterDamage", checked)}
              />
              <label htmlFor="waterDamage" className="text-sm font-medium">
                Water Damage Present
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="structuralDamage"
                checked={data.structuralDamage || false}
                onCheckedChange={(checked) => updateField("structuralDamage", checked)}
              />
              <label htmlFor="structuralDamage" className="text-sm font-medium">
                Structural Damage
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="interiorDamage"
                checked={data.interiorDamage || false}
                onCheckedChange={(checked) => updateField("interiorDamage", checked)}
              />
              <label htmlFor="interiorDamage" className="text-sm font-medium">
                Interior Damage
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exteriorDamage"
                checked={data.exteriorDamage || false}
                onCheckedChange={(checked) => updateField("exteriorDamage", checked)}
              />
              <label htmlFor="exteriorDamage" className="text-sm font-medium">
                Exterior Damage
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedCausation">Estimated Causation</Label>
        <Textarea
          id="estimatedCausation"
          value={data.estimatedCausation || ""}
          onChange={(e) => updateField("estimatedCausation", e.target.value)}
          placeholder="What likely caused this damage? Include supporting evidence..."
          rows={4}
        />
      </div>
    </div>
  );
}

// src/features/claims/steps/Step7_CodeCompliance.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface Step7Data {
  codeUpgradesRequired?: boolean;
  codeUpgradesDescription?: string;
  permitRequired?: boolean;
  permitNumber?: string;
  complianceNotes?: string;
}

interface Step7Props {
  data: Partial<Step7Data>;
  onChange: (data: Partial<Step7Data>) => void;
}

export function Step7_CodeCompliance({ data, onChange }: Step7Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (field: keyof Step7Data, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Code Compliance</h2>
        <p className="mt-2 text-sm text-slate-600">
          Document any code upgrades or compliance requirements.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="codeUpgradesRequired"
            checked={data.codeUpgradesRequired || false}
            onCheckedChange={(checked) =>
              updateField("codeUpgradesRequired", checked)
            }
          />
          <label
            htmlFor="codeUpgradesRequired"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Code Upgrades Required
          </label>
        </div>

        {data.codeUpgradesRequired && (
          <div className="space-y-2 pl-6">
            <Label htmlFor="codeUpgradesDescription">
              Code Upgrades Description
            </Label>
            <Textarea
              id="codeUpgradesDescription"
              value={data.codeUpgradesDescription || ""}
              onChange={(e) =>
                updateField("codeUpgradesDescription", e.target.value)
              }
              placeholder="Describe required code upgrades in detail..."
              rows={6}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="permitRequired"
            checked={data.permitRequired || false}
            onCheckedChange={(checked) =>
              updateField("permitRequired", checked)
            }
          />
          <label
            htmlFor="permitRequired"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Permit Required
          </label>
        </div>

        {data.permitRequired && (
          <div className="space-y-2 pl-6">
            <Label htmlFor="permitNumber">Permit Number (if obtained)</Label>
            <Input
              id="permitNumber"
              value={data.permitNumber || ""}
              onChange={(e) => updateField("permitNumber", e.target.value)}
              placeholder="Permit number"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="complianceNotes">Compliance Notes</Label>
        <Textarea
          id="complianceNotes"
          value={data.complianceNotes || ""}
          onChange={(e) => updateField("complianceNotes", e.target.value)}
          placeholder="Additional compliance notes, special requirements, etc."
          rows={4}
        />
      </div>
    </div>
  );
}

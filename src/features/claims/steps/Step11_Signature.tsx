// src/features/claims/steps/Step11_Signature.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Step11Data {
  reporterName: string;
  reporterTitle?: string;
  reporterEmail?: string;
  reportDate?: string;
  certificationAccepted: boolean;
}

interface Step11Props {
  data: Partial<Step11Data>;
  onChange: (data: Partial<Step11Data>) => void;
}

export function Step11_Signature({ data, onChange }: Step11Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (field: keyof Step11Data, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Signature & Certification</h2>
        <p className="mt-2 text-sm text-slate-600">Finalize and certify this claims report.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="reporterName" className="required">
            Reporter Name
          </Label>
          <Input
            id="reporterName"
            value={data.reporterName || ""}
            onChange={(e) => updateField("reporterName", e.target.value)}
            placeholder="Full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reporterTitle">Title / License</Label>
          <Input
            id="reporterTitle"
            value={data.reporterTitle || ""}
            onChange={(e) => updateField("reporterTitle", e.target.value)}
            placeholder="e.g., Licensed Public Adjuster"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reporterEmail">Email</Label>
          <Input
            id="reporterEmail"
            type="email"
            value={data.reporterEmail || ""}
            onChange={(e) => updateField("reporterEmail", e.target.value)}
            placeholder="email@company.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reportDate">Report Date</Label>
          <Input
            id="reportDate"
            type="date"
            value={data.reportDate || new Date().toISOString().split("T")[0]}
            onChange={(e) => updateField("reportDate", e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-medium text-slate-900">Digital Signature (Phase 2)</p>
        <p className="mt-2 text-xs text-slate-500">E-signature integration coming in Phase 2</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="certificationAccepted"
            checked={data.certificationAccepted || false}
            onCheckedChange={(checked) => updateField("certificationAccepted", checked)}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor="certificationAccepted"
              className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I certify that this claims report is accurate
            </label>
            <p className="mt-2 text-xs text-slate-600">
              I certify that the information contained in this claims report is accurate and
              complete to the best of my knowledge. I understand that this report will be submitted
              to the insurance carrier and used in the claims adjustment process.
            </p>
          </div>
        </div>
      </div>

      {!data.certificationAccepted && (
        <p className="text-sm font-medium text-amber-600">
          ⚠️ You must accept the certification to complete this report
        </p>
      )}
    </div>
  );
}

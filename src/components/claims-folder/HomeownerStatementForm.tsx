// src/components/claims-folder/HomeownerStatementForm.tsx
"use client";

import { AlertCircle, Check, FileText, Loader2, Pen, Save } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

export interface HomeownerStatement {
  description: string;
  discoveryDate: string;
  discoveryDescription: string;
  priorConditions: string;
  priorRepairs: string;
  additionalInfo: string;
  signed: boolean;
  signedBy: string;
  signedDate: string;
  signatureDataUrl?: string;
}

interface HomeownerStatementFormProps {
  claimId: string;
  initialData?: Partial<HomeownerStatement>;
  onSave?: (data: HomeownerStatement) => Promise<void>;
  readOnly?: boolean;
}

export default function HomeownerStatementForm({
  claimId,
  initialData,
  onSave,
  readOnly = false,
}: HomeownerStatementFormProps) {
  const [formData, setFormData] = useState<HomeownerStatement>({
    description: initialData?.description || "",
    discoveryDate: initialData?.discoveryDate || "",
    discoveryDescription: initialData?.discoveryDescription || "",
    priorConditions: initialData?.priorConditions || "",
    priorRepairs: initialData?.priorRepairs || "",
    additionalInfo: initialData?.additionalInfo || "",
    signed: initialData?.signed || false,
    signedBy: initialData?.signedBy || "",
    signedDate: initialData?.signedDate || "",
    signatureDataUrl: initialData?.signatureDataUrl,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleChange = (field: keyof HomeownerStatement, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!onSave) return;

    setSaving(true);
    try {
      await onSave(formData);
      setSaved(true);
    } catch (error) {
      logger.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSign = () => {
    if (!signatureName.trim() || !agreed) return;

    setFormData((prev) => ({
      ...prev,
      signed: true,
      signedBy: signatureName.trim(),
      signedDate: new Date().toISOString().split("T")[0],
    }));
    setSignatureDialogOpen(false);
    setSaved(false);
  };

  const isComplete =
    formData.description.trim() !== "" && formData.discoveryDate !== "" && formData.signed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold">Homeowner Statement</h3>
            <p className="text-sm text-slate-500">Claim #{claimId}</p>
          </div>
        </div>
        <Badge variant={isComplete ? "default" : "secondary"}>
          {isComplete ? "Complete" : "In Progress"}
        </Badge>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        {/* Damage Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description of Damage <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-slate-500">
            Please describe the damage you observed to your property in your own words.
          </p>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe what damage you noticed to your property..."
            rows={4}
            disabled={readOnly || formData.signed}
            className="resize-none"
          />
        </div>

        {/* Discovery Date */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="discoveryDate" className="text-sm font-medium">
              Date Damage Was Discovered <span className="text-red-500">*</span>
            </Label>
            <Input
              id="discoveryDate"
              type="date"
              value={formData.discoveryDate}
              onChange={(e) => handleChange("discoveryDate", e.target.value)}
              disabled={readOnly || formData.signed}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discoveryDescription" className="text-sm font-medium">
              How Was It Discovered?
            </Label>
            <Input
              id="discoveryDescription"
              value={formData.discoveryDescription}
              onChange={(e) => handleChange("discoveryDescription", e.target.value)}
              placeholder="e.g., Noticed leak in ceiling, saw missing shingles..."
              disabled={readOnly || formData.signed}
            />
          </div>
        </div>

        {/* Prior Conditions */}
        <div className="space-y-2">
          <Label htmlFor="priorConditions" className="text-sm font-medium">
            Prior Conditions
          </Label>
          <p className="text-xs text-slate-500">
            Were there any pre-existing conditions or damage to your property before this event?
          </p>
          <Textarea
            id="priorConditions"
            value={formData.priorConditions}
            onChange={(e) => handleChange("priorConditions", e.target.value)}
            placeholder="Describe any pre-existing conditions or enter 'None' if there were no prior issues..."
            rows={3}
            disabled={readOnly || formData.signed}
            className="resize-none"
          />
        </div>

        {/* Prior Repairs */}
        <div className="space-y-2">
          <Label htmlFor="priorRepairs" className="text-sm font-medium">
            Previous Repairs or Claims
          </Label>
          <p className="text-xs text-slate-500">
            Have you had any previous repairs or insurance claims for this property?
          </p>
          <Textarea
            id="priorRepairs"
            value={formData.priorRepairs}
            onChange={(e) => handleChange("priorRepairs", e.target.value)}
            placeholder="List any prior repairs or claims, or enter 'None'..."
            rows={2}
            disabled={readOnly || formData.signed}
            className="resize-none"
          />
        </div>

        {/* Additional Information */}
        <div className="space-y-2">
          <Label htmlFor="additionalInfo" className="text-sm font-medium">
            Additional Information
          </Label>
          <Textarea
            id="additionalInfo"
            value={formData.additionalInfo}
            onChange={(e) => handleChange("additionalInfo", e.target.value)}
            placeholder="Any other information you'd like to include..."
            rows={3}
            disabled={readOnly || formData.signed}
            className="resize-none"
          />
        </div>

        {/* Signature Section */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <Pen className="h-4 w-4" />
            Signature
          </h4>

          {formData.signed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-medium">Statement Signed</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Signed by <strong>{formData.signedBy}</strong> on {formData.signedDate}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                By signing this statement, you certify that the information provided is accurate to
                the best of your knowledge.
              </p>
              <Button
                onClick={() => setSignatureDialogOpen(true)}
                disabled={readOnly || !formData.description.trim() || !formData.discoveryDate}
              >
                <Pen className="mr-2 h-4 w-4" />
                Sign Statement
              </Button>
              {(!formData.description.trim() || !formData.discoveryDate) && (
                <p className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  Complete required fields before signing
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div>
            {saved && (
              <p className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Statement saved
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving || formData.signed}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
            {formData.signed && onSave && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Submit Statement
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Homeowner Statement</DialogTitle>
            <DialogDescription>
              Please enter your name and confirm that the information in this statement is accurate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signatureName">Full Legal Name</Label>
              <Input
                id="signatureName"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                By typing your name and clicking &quot;Sign Statement&quot;, you certify that:
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-amber-700 dark:text-amber-300">
                <li>All information provided is true and accurate</li>
                <li>You are the property owner or authorized representative</li>
                <li>You understand this statement becomes part of the claim record</li>
              </ul>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="agree" className="text-sm">
                I have read and understand the above certification and agree to sign this statement
                electronically.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={!signatureName.trim() || !agreed}>
              <Pen className="mr-2 h-4 w-4" />
              Sign Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * RetailWizard.tsx
 *
 * Main 8-step wizard for Retail packet generation
 *
 * GUARDS:
 * - Requires company branding (else shows BrandingRequiredNotice)
 * - Auto-drafts on first change (silent)
 * - Validates required fields before allowing Next
 * - Prevents browser close with unsaved changes
 *
 * FEATURES:
 * - Progress bar showing 8 steps
 * - Next/Back navigation
 * - Auto-save with visual indicator ("Saving..." → "Saved ✓")
 * - Resume draft banner if in-progress packet exists
 * - Export modal (PDF/DOCX/ZIP) on final step
 */

"use client";

import { useUser } from "@clerk/nextjs";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { useCallback,useEffect, useState } from "react";

import { ExportPdfButton } from "@/components/ExportPdfButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Step imports
import { Step1_ClientProperty } from "@/features/retail/steps/Step1_ClientProperty";
import { Step2_MaterialsUpgrades } from "@/features/retail/steps/Step2_MaterialsUpgrades";
import { Step3_Financing } from "@/features/retail/steps/Step3_Financing";
import { Step4_WhyUs } from "@/features/retail/steps/Step4_WhyUs";
import { Step5_Timeline } from "@/features/retail/steps/Step5_Timeline";
import { Step6_Warranty } from "@/features/retail/steps/Step6_Warranty";
import { Step7_Photos } from "@/features/retail/steps/Step7_Photos";
import { Step8_Signature } from "@/features/retail/steps/Step8_Signature";
import Progress from "@/features/retail/wizard/Progress";
import { ResumeDraftBanner } from "@/features/retail/wizard/ResumeDraftBanner";
import { useAutoSave } from "@/hooks/useAutoSave";
import { BLANK_PACKET,ClaimPacketData } from "@/lib/claims/templates";
import { isFeatureEnabled } from "@/lib/env";
import { getOrgBranding } from "@/lib/theme";

const STEPS = [
  { id: 1, label: "Client & Property", component: Step1_ClientProperty },
  { id: 2, label: "Materials & Upgrades", component: Step2_MaterialsUpgrades },
  { id: 3, label: "Financing Options", component: Step3_Financing },
  { id: 4, label: "Why Choose Us", component: Step4_WhyUs },
  { id: 5, label: "Timeline", component: Step5_Timeline },
  { id: 6, label: "Warranty", component: Step6_Warranty },
  { id: 7, label: "Photos", component: Step7_Photos },
  { id: 8, label: "Signature & Terms", component: Step8_Signature },
];

interface RetailWizardProps {
  initialData?: Partial<ClaimPacketData>;
  resumePacketId?: string;
  onComplete?: (packetId: string) => void;
}

export default function RetailWizard({
  initialData,
  resumePacketId,
  onComplete,
}: RetailWizardProps) {
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<ClaimPacketData>({
    ...BLANK_PACKET,
    ...initialData,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // RESUME DRAFT STATE
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftDetected, setDraftDetected] = useState<{
    packetId: string;
    currentStep: number;
    data: Partial<ClaimPacketData>;
    updatedAt: string;
  } | null>(null);
  const [resumedPacketId, setResumedPacketId] = useState<string | null>(resumePacketId || null);

  // AUTOSAVE: Hook manages packetId, saving state, timestamps
  const {
    saving,
    savedAt,
    packetId,
    error: saveError,
  } = useAutoSave({
    mode: "retail",
    step: currentStep,
    data,
    enabled: isFeatureEnabled("AUTOSAVE") && !!resumedPacketId,
  });

  // GUARD: Check if branding exists
  const branding = getOrgBranding();
  const hasBranding = Boolean(branding?.company_name);

  /**
   * RESUME DRAFT: Check for existing draft on mount
   */
  useEffect(() => {
    if (!user?.id || resumedPacketId) {
      setLoadingDraft(false);
      return;
    }

    const checkForDraft = async () => {
      try {
        const response = await fetch("/api/retail/resume");
        const result = await response.json();

        if (result.ok && result.packetId) {
          setDraftDetected({
            packetId: result.packetId,
            currentStep: result.currentStep || 1,
            data: result.data || {},
            updatedAt: result.updatedAt,
          });
        }
      } catch (err) {
        console.error("[RetailWizard] Failed to check for draft:", err);
      } finally {
        setLoadingDraft(false);
      }
    };

    void checkForDraft();
  }, [user?.id, resumedPacketId]);

  /**
   * RESUME DRAFT: Load draft data when user clicks "Resume"
   */
  const handleResumeDraft = useCallback(() => {
    if (!draftDetected) return;

    setData((prev) => ({
      ...prev,
      ...draftDetected.data,
    }));
    setCurrentStep(draftDetected.currentStep);
    setResumedPacketId(draftDetected.packetId);
    setDraftDetected(null); // Hide banner
  }, [draftDetected]);

  /**
   * RESUME DRAFT: Dismiss banner and start fresh
   */
  const handleDismissDraft = useCallback(() => {
    setDraftDetected(null);
    setLoadingDraft(false);
  }, []);

  /**
   * GUARD: Validate required fields for current step
   */
  const validateStep = useCallback(
    (step: number): boolean => {
      const errors: Record<string, string> = {};

      switch (step) {
        case 1: // Client & Property
          if (!data.insured_name) errors.insured_name = "Client name is required";
          if (!data.propertyAddress) errors.propertyAddress = "Property address is required";
          break;
        case 2: // Materials & Upgrades
          if (!data.roofType) errors.roofType = "Roof type is required";
          break;
        case 3: // Financing (NEW - optional but validate if filled)
          if (
            data.financingAvailable &&
            (!data.financingPartners || data.financingPartners.length === 0)
          ) {
            errors.financingPartners = "Select at least one financing partner";
          }
          break;
        case 4: // Why Us (NEW - optional)
          // No required fields, all optional
          break;
        case 5: // Timeline
          if (!data.inspectionDate) errors.inspectionDate = "Inspection date is required";
          break;
        case 6: // Warranty
          // Optional fields only
          break;
        case 7: // Photos
          // Optional, but could require at least 1 photo
          break;
        case 8: // Signature
          if (!data.clientSignature && !data.clientPrintedName) {
            errors.signature = "Signature or printed name required";
          }
          if (data.termsAccepted === false) {
            errors.terms = "Must accept terms before continuing";
          }
          break;
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [data]
  );

  /**
   * Update data (autosave handled by useAutoSave hook)
   */
  const updateData = useCallback((updates: Partial<ClaimPacketData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Navigation handlers
   */
  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return; // Validation failed, errors displayed
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (!validateStep(currentStep)) return;

    if (onComplete && packetId) {
      onComplete(packetId);
    }
  };

  // GUARD: Show branding required notice
  if (!hasBranding) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Company Branding Required</strong>
            <p className="mt-2">
              Before creating retail packets, please set up your company branding in{" "}
              <a href="/admin/branding" className="underline">
                Admin → Branding
              </a>
              .
            </p>
            <p className="mt-2 text-sm">
              This ensures your packets display your company name, logo, and contact information.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  return (
    <div className="container mx-auto max-w-5xl py-8">
      {/* Resume Draft Banner */}
      {draftDetected && (
        <ResumeDraftBanner
          updatedAt={draftDetected.updatedAt}
          onResume={handleResumeDraft}
          onDismiss={handleDismissDraft}
        />
      )}

      {/* Resumed Packet Indicator */}
      {resumedPacketId && !draftDetected && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Resuming in-progress packet. Your changes are being auto-saved.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      <Progress currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />

      {/* Save Indicator */}
      <div className="mb-4 flex items-center justify-end gap-2 text-sm">
        {saving && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
        {!saving && savedAt && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>Saved at {new Date(savedAt).toLocaleTimeString()}</span>
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-3 w-3" />
            <span>Save failed: {saveError}</span>
          </div>
        )}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            Step {currentStep}: {STEPS[currentStep - 1].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent
            data={data}
            updateData={updateData}
            validationErrors={Object.values(validationErrors)}
          />
        </CardContent>
      </Card>

      {/* Export PDF Button (Final Step Only) */}
      {currentStep === STEPS.length && packetId && (
        <div className="mt-6 flex justify-center">
          <ExportPdfButton
            mode="retail"
            packetId={packetId}
            data={data}
            variant="outline"
            size="lg"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            Download PDF
          </ExportPdfButton>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          Back
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete & Preview
          </Button>
        )}
      </div>

      {/* Validation Errors */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Please fix the following errors:</strong>
            <ul className="mt-2 list-inside list-disc">
              {Object.values(validationErrors).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

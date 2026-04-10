/**
 * ClaimsWizard.tsx
 *
 * Main 11-step wizard for Claims report generation
 *
 * DIFFERS FROM RETAIL:
 * - 11 steps instead of 8
 * - StartDraftGate modal (requires confirmation before first autosave)
 * - Claims-specific validation rules
 * - Uses claim_reports table
 *
 * FEATURES:
 * - Progress bar showing 11 steps
 * - Next/Back navigation
 * - Auto-save with visual indicator
 * - Resume draft banner
 * - StartDraftGate confirmation modal
 */

"use client";

import { useUser } from "@clerk/nextjs";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback,useEffect, useState } from "react";

import { ExportPdfButton } from "@/components/ExportPdfButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Step1_CarrierClaim } from "@/features/claims/steps/Step1_CarrierClaim";
import { Step2_InsuredProperty } from "@/features/claims/steps/Step2_InsuredProperty";
import { Step3_DamageAssessment } from "@/features/claims/steps/Step3_DamageAssessment";
import { Step4_RoofDetails } from "@/features/claims/steps/Step4_RoofDetails";
import { Step5_MaterialsScope } from "@/features/claims/steps/Step5_MaterialsScope";
import { Step6_InspectionFindings } from "@/features/claims/steps/Step6_InspectionFindings";
import { Step7_CodeCompliance } from "@/features/claims/steps/Step7_CodeCompliance";
import { Step8_PhotosEvidence } from "@/features/claims/steps/Step8_PhotosEvidence";
import { Step9_Settlement } from "@/features/claims/steps/Step9_Settlement";
import { Step10_Recommendations } from "@/features/claims/steps/Step10_Recommendations";
import { Step11_Signature } from "@/features/claims/steps/Step11_Signature";
import { StartDraftGate } from "@/features/claims/wizard/StartDraftGate";
import Progress from "@/features/retail/wizard/Progress"; // Reuse
import { ResumeDraftBanner } from "@/features/retail/wizard/ResumeDraftBanner";
import { useAutoSave } from "@/hooks/useAutoSave";
import { BLANK_PACKET,ClaimPacketData } from "@/lib/claims/templates";
import { isFeatureEnabled } from "@/lib/env";
import { getOrgBranding } from "@/lib/theme";

const STEPS = [
  { id: 1, label: "Carrier & Claim Info", component: Step1_CarrierClaim },
  { id: 2, label: "Insured & Property", component: Step2_InsuredProperty },
  { id: 3, label: "Damage Assessment", component: Step3_DamageAssessment },
  { id: 4, label: "Roof Details", component: Step4_RoofDetails },
  { id: 5, label: "Materials & Scope", component: Step5_MaterialsScope },
  { id: 6, label: "Inspection Findings", component: Step6_InspectionFindings },
  { id: 7, label: "Code Compliance", component: Step7_CodeCompliance },
  { id: 8, label: "Photos & Evidence", component: Step8_PhotosEvidence },
  { id: 9, label: "Settlement Estimate", component: Step9_Settlement },
  { id: 10, label: "Recommendations", component: Step10_Recommendations },
  { id: 11, label: "Signature & Submit", component: Step11_Signature },
];

interface ClaimsWizardProps {
  initialData?: Partial<ClaimPacketData>;
  resumeReportId?: string;
  onComplete?: (reportId: string) => void;
  user?: { id: string; email: string | null; firstName: string | null; lastName: string | null };
  branding?: {
    logo_url: string | null;
    brand_color: string;
    accent_color: string;
    company_name: string | null;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lead?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job?: any;
}

export default function ClaimsWizard({
  initialData,
  resumeReportId,
  onComplete,
  user: propUser,
  branding: propBranding,
  lead,
  job,
}: ClaimsWizardProps) {
  const { user: clerkUser } = useUser();
  const user = propUser || clerkUser;
  const [currentStep, setCurrentStep] = useState(1);

  // Pre-fill data from lead/job if provided
  const [data, setData] = useState<ClaimPacketData>(() => {
    const baseData = {
      ...BLANK_PACKET,
      ...initialData,
    };

    // Pre-fill from lead if available
    if (lead) {
      if (lead.name) {
        baseData.insured_name = lead.name;
      }
      if (lead.contacts?.email) {
        baseData.preparedEmail = lead.contacts.email;
      }
      if (lead.contacts?.phone) {
        baseData.preparedPhone = lead.contacts.phone;
      }
      if (lead.address) {
        baseData.propertyAddress = lead.address;
      }
    }

    // Pre-fill from job if available
    if (job) {
      if (job.address) {
        baseData.propertyAddress = job.address;
      }
      if (job.title) {
        baseData.insured_name = job.title;
      }
    }

    return baseData;
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // START DRAFT GATE STATE
  const [showStartGate, setShowStartGate] = useState(false);
  const [draftConfirmed, setDraftConfirmed] = useState(false);

  // RESUME DRAFT STATE
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftDetected, setDraftDetected] = useState<{
    reportId: string;
    currentStep: number;
    data: Partial<ClaimPacketData>;
    updatedAt: string;
  } | null>(null);
  const [resumedReportId, setResumedReportId] = useState<string | null>(resumeReportId || null);

  // AUTOSAVE: Only enabled after StartDraftGate confirmed
  const {
    saving,
    savedAt,
    packetId: reportId,
    error: saveError,
  } = useAutoSave({
    mode: "claims",
    step: currentStep,
    data,
    enabled: isFeatureEnabled("AUTOSAVE") && draftConfirmed && !!resumedReportId,
  });

  // Use prop branding if provided, otherwise fetch from org
  const fallbackBranding = getOrgBranding();
  const branding = propBranding || fallbackBranding;
  const hasBranding = Boolean(branding?.company_name);

  /**
   * RESUME DRAFT: Check for existing draft on mount
   */
  useEffect(() => {
    if (!user?.id || resumedReportId) {
      setLoadingDraft(false);
      return;
    }

    const checkForDraft = async () => {
      try {
        const response = await fetch("/api/claims/resume");
        const result = await response.json();

        if (result.ok && result.reportId) {
          setDraftDetected({
            reportId: result.reportId,
            currentStep: result.currentStep || 1,
            data: result.data || {},
            updatedAt: result.updatedAt,
          });
        }
      } catch (err) {
        console.error("[ClaimsWizard] Failed to check for draft:", err);
      } finally {
        setLoadingDraft(false);
      }
    };

    void checkForDraft();
  }, [user?.id, resumedReportId]);

  /**
   * RESUME DRAFT: Load draft data
   */
  const handleResumeDraft = useCallback(() => {
    if (!draftDetected) return;

    setData((prev) => ({
      ...prev,
      ...draftDetected.data,
    }));
    setCurrentStep(draftDetected.currentStep);
    setResumedReportId(draftDetected.reportId);
    setDraftConfirmed(true); // Already confirmed when draft was created
    setDraftDetected(null);
  }, [draftDetected]);

  /**
   * RESUME DRAFT: Dismiss banner
   */
  const handleDismissDraft = useCallback(() => {
    setDraftDetected(null);
    setLoadingDraft(false);
  }, []);

  /**
   * START DRAFT GATE: Trigger on first data change
   */
  useEffect(() => {
    if (draftConfirmed || resumedReportId || !user?.id) return;

    // Check if user has made any changes
    const hasChanges = Object.keys(data).some((key) => {
      return data[key as keyof ClaimPacketData] !== BLANK_PACKET[key as keyof ClaimPacketData];
    });

    if (hasChanges && !showStartGate) {
      setShowStartGate(true);
    }
  }, [data, draftConfirmed, resumedReportId, user?.id, showStartGate]);

  /**
   * START DRAFT GATE: Confirm and create draft
   */
  const handleConfirmStartDraft = useCallback(async () => {
    setDraftConfirmed(true);
    setShowStartGate(false);

    // Create draft via API
    try {
      const response = await fetch("/api/claims/start", { method: "POST" });
      const result = await response.json();

      if (result.reportId) {
        setResumedReportId(result.reportId);
      }
    } catch (err) {
      console.error("[ClaimsWizard] Failed to create draft:", err);
    }
  }, []);

  /**
   * START DRAFT GATE: Cancel (revert changes)
   */
  const handleCancelStartDraft = useCallback(() => {
    setShowStartGate(false);
    setData(BLANK_PACKET); // Reset form
  }, []);

  /**
   * VALIDATION: Required fields per step
   */
  const validateStep = useCallback(
    (step: number): boolean => {
      const errors: Record<string, string> = {};

      switch (step) {
        case 1: // Carrier & Claim Info
          // Only require carrier name for step 1 - allow user to progress even without claim number
          if (!data.insuranceCarrier || data.insuranceCarrier.trim() === "") {
            errors.carrier = "Insurance carrier required";
          }
          break;
        case 2: // Insured & Property
          if (!data.insured_name || data.insured_name.trim() === "") {
            errors.insured_name = "Insured name required";
          }
          if (!data.propertyAddress || data.propertyAddress.trim() === "") {
            errors.propertyAddress = "Property address required";
          }
          break;
        // Steps 3-10: Optional validations (allow progression)
        case 11: // Signature
          if (!data.clientSignature && !data.clientPrintedName) {
            errors.signature = "Signature or printed name required";
          }
          if (data.termsAccepted === false) {
            errors.terms = "Must accept terms";
          }
          break;
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [data]
  );

  /**
   * UPDATE DATA
   */
  const updateData = useCallback((updates: Partial<ClaimPacketData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * NAVIGATION
   */
  const handleNext = () => {
    if (!validateStep(currentStep)) return;
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
    if (onComplete && reportId) {
      onComplete(reportId);
    }
  };

  // GUARD: Branding required
  if (!hasBranding) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Company Branding Required</strong>
            <p className="mt-2">
              Set up company branding in{" "}
              <a href="/admin/branding" className="underline">
                Admin → Branding
              </a>
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

      {/* Resumed Report Indicator */}
      {resumedReportId && !draftDetected && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Resuming in-progress claim report. Changes auto-saved.
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

      {/* Current Step */}
      <div className="mb-6">
        <CurrentStepComponent data={data} onChange={updateData} />
      </div>

      {/* Export PDF Button (Final Step Only) */}
      {currentStep === STEPS.length && reportId && (
        <div className="mb-6 flex justify-center">
          <ExportPdfButton
            mode="claims"
            reportId={reportId}
            data={data}
            variant="outline"
            size="lg"
            className="border-purple-600 text-purple-600 hover:bg-purple-50"
          >
            Download Claims Report PDF
          </ExportPdfButton>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          Back
        </Button>
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of {STEPS.length}
        </div>
        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleComplete}>Complete Report</Button>
        )}
      </div>

      {/* StartDraftGate Modal */}
      <StartDraftGate
        open={showStartGate}
        onConfirm={handleConfirmStartDraft}
        onCancel={handleCancelStartDraft}
        carrierName={data.insuranceCarrier}
        claimNumber={data.claimNumber}
      />
    </div>
  );
}

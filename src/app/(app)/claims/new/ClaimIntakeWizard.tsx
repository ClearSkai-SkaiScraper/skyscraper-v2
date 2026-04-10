/**
 * PHASE D: Redesigned 5-Step Claim Intake Wizard
 *
 * Step 1 → Loss Type (what happened)
 * Step 2 → Trade Type (what trade is needed — adapts per loss type)
 * Step 3 → Client Details (name, phone, email, carrier, policy)
 * Step 4 → Property Address (address, structure, trade-specific fields)
 * Step 5 → Date of Loss (date picker + Quick DOL for storm/roofing)
 */

"use client";

import { Camera, CheckCircle, CloudRain, FileText, Loader2, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuickDOLFinder } from "@/components/weather/QuickDOLFinder";
import { logger } from "@/lib/logger";

type Props = {
  orgId: string;
};

type Step = 1 | 2 | 3 | 4 | 5;

type LossType = "FIRE" | "WATER" | "WIND_HAIL" | "STORM" | "SMOKE" | "MOLD" | "BIOHAZARD" | "OTHER";
type TradeType =
  | "ROOFING"
  | "PLUMBING"
  | "RESTORATION"
  | "MOLD_REMEDIATION"
  | "FIRE_RESTORATION"
  | "GENERAL_CONTRACTOR"
  | "ELECTRICAL"
  | "HVAC"
  | "WATER_MITIGATION"
  | "BIOHAZARD_CLEANUP"
  | "OTHER";
type StructureType =
  | "SINGLE_FAMILY"
  | "DUPLEX"
  | "MULTI_FAMILY"
  | "COMMERCIAL"
  | "MOBILE_HOME"
  | "OTHER";
type RoofType = "SHINGLE" | "TILE" | "METAL" | "TPO" | "FOAM" | "MODBIT" | "OTHER";

interface PhotoFile {
  file: File;
  preview: string;
  tag: string;
}

// Which trades appear for each loss type
const TRADE_OPTIONS: Record<LossType, { value: TradeType; label: string; emoji: string }[]> = {
  FIRE: [
    { value: "FIRE_RESTORATION", label: "Fire Restoration", emoji: "🔥" },
    { value: "ROOFING", label: "Roofing", emoji: "🏠" },
    { value: "GENERAL_CONTRACTOR", label: "General Contractor", emoji: "🔨" },
    { value: "ELECTRICAL", label: "Electrical", emoji: "⚡" },
    { value: "HVAC", label: "HVAC", emoji: "❄️" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
  WATER: [
    { value: "WATER_MITIGATION", label: "Water Mitigation", emoji: "💧" },
    { value: "PLUMBING", label: "Plumbing", emoji: "🔧" },
    { value: "RESTORATION", label: "Restoration", emoji: "🏗️" },
    { value: "MOLD_REMEDIATION", label: "Mold Remediation", emoji: "🦠" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
  WIND_HAIL: [
    { value: "ROOFING", label: "Roofing", emoji: "🏠" },
    { value: "GENERAL_CONTRACTOR", label: "General Contractor", emoji: "🔨" },
    { value: "RESTORATION", label: "Restoration", emoji: "🏗️" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
  STORM: [
    { value: "ROOFING", label: "Roofing", emoji: "🏠" },
    { value: "RESTORATION", label: "Restoration", emoji: "🏗️" },
    { value: "GENERAL_CONTRACTOR", label: "General Contractor", emoji: "🔨" },
    { value: "WATER_MITIGATION", label: "Water Mitigation", emoji: "💧" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
  SMOKE: [
    { value: "FIRE_RESTORATION", label: "Fire/Smoke Restoration", emoji: "💨" },
    { value: "HVAC", label: "HVAC", emoji: "❄️" },
    { value: "GENERAL_CONTRACTOR", label: "General Contractor", emoji: "🔨" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
  MOLD: [
    { value: "MOLD_REMEDIATION", label: "Mold Remediation", emoji: "🦠" },
    { value: "RESTORATION", label: "Restoration", emoji: "🏗️" },
    { value: "PLUMBING", label: "Plumbing", emoji: "🔧" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
  BIOHAZARD: [
    { value: "BIOHAZARD_CLEANUP", label: "Biohazard Cleanup", emoji: "☣️" },
    { value: "RESTORATION", label: "Restoration", emoji: "🏗️" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
  OTHER: [
    { value: "GENERAL_CONTRACTOR", label: "General Contractor", emoji: "🔨" },
    { value: "ROOFING", label: "Roofing", emoji: "🏠" },
    { value: "PLUMBING", label: "Plumbing", emoji: "🔧" },
    { value: "RESTORATION", label: "Restoration", emoji: "🏗️" },
    { value: "OTHER", label: "Other", emoji: "❓" },
  ],
};

// Storm/roofing trades that show the Quick DOL finder
const STORM_ROOFING_TRADES: TradeType[] = ["ROOFING", "RESTORATION", "GENERAL_CONTRACTOR"];
const STORM_LOSS_TYPES: LossType[] = ["WIND_HAIL", "STORM"];

export function ClaimIntakeWizard({ orgId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 – Loss Type
  const [lossType, setLossType] = useState<LossType | "">("" as LossType | "");

  // Step 2 – Trade Type
  const [tradeType, setTradeType] = useState<TradeType | "">("" as TradeType | "");

  // Step 3 – Client Details
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [deductible, setDeductible] = useState("");
  const [agentName, setAgentName] = useState("");

  // Step 4 – Property
  const [propertyAddress, setPropertyAddress] = useState("");
  const [structureType, setStructureType] = useState<StructureType>("SINGLE_FAMILY");
  const [stories, setStories] = useState("1");
  const [roofType, setRoofType] = useState<RoofType>("SHINGLE");
  const [slope, setSlope] = useState("");
  const [squareFootage, setSquareFootage] = useState("");

  // Step 5 – Date of Loss
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [showQuickDOL, setShowQuickDOL] = useState(false);

  // Photos (optional on final step)
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Scope of Work AI parsing
  const [sowFile, setSowFile] = useState<File | null>(null);
  const [sowParsing, setSowParsing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sowResult, setSowResult] = useState<Record<string, any> | null>(null);
  const [sowError, setSowError] = useState<string | null>(null);

  const handleSowUpload = useCallback(async (file: File) => {
    setSowFile(file);
    setSowParsing(true);
    setSowError(null);
    setSowResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/claims/parse-scope", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setSowError(data.error || "Failed to parse scope of work");
        setSowParsing(false);
        return;
      }

      const parsed = data.data;
      setSowResult(parsed);

      // Auto-fill fields from parsed scope
      if (parsed.lossType) setLossType(parsed.lossType);
      if (parsed.tradeType) setTradeType(parsed.tradeType);
      if (parsed.contactName) setContactName(parsed.contactName);
      if (parsed.contactPhone) setContactPhone(parsed.contactPhone);
      if (parsed.contactEmail) setContactEmail(parsed.contactEmail);
      if (parsed.carrier) setCarrier(parsed.carrier);
      if (parsed.policyNumber) setPolicyNumber(parsed.policyNumber);
      if (parsed.deductible) setDeductible(String(parsed.deductible));
      if (parsed.agentName) setAgentName(parsed.agentName);
      if (parsed.propertyAddress) setPropertyAddress(parsed.propertyAddress);
      if (parsed.structureType) setStructureType(parsed.structureType);
      if (parsed.stories) setStories(String(parsed.stories));
      if (parsed.roofType) setRoofType(parsed.roofType);
      if (parsed.squareFootage) setSquareFootage(String(parsed.squareFootage));
      if (parsed.dateOfLoss) setDateOfLoss(parsed.dateOfLoss);
    } catch (err) {
      setSowError(err.message || "Failed to parse scope of work");
    } finally {
      setSowParsing(false);
    }
  }, []);

  // Computed helpers
  const isRoofingTrade = tradeType === "ROOFING";
  const showQuickDOLButton =
    STORM_LOSS_TYPES.includes(lossType as LossType) ||
    STORM_ROOFING_TRADES.includes(tradeType as TradeType);

  const addPhotos = useCallback(
    (files: FileList | File[]) => {
      const newPhotos: PhotoFile[] = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, 20 - photos.length)
        .map((file) => ({
          file,
          preview: URL.createObjectURL(file),
          tag: "Exterior",
        }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length]
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  }, []);

  const updatePhotoTag = useCallback((index: number, tag: string) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index] = { ...newPhotos[index], tag };
      return newPhotos;
    });
  }, []);

  function canGoNext(currentStep: Step): boolean {
    if (currentStep === 1) return !!lossType;
    if (currentStep === 2) return !!tradeType;
    if (currentStep === 3) return true; // Contact info is optional
    if (currentStep === 4) return !!propertyAddress;
    if (currentStep === 5) return !!dateOfLoss;
    return true;
  }

  // Upload photos to Supabase storage after claim is created
  async function uploadPhotosForClaim(claimId: string): Promise<string[]> {
    if (photos.length === 0) return [];
    const uploadedUrls: string[] = [];
    let completed = 0;

    for (const photo of photos) {
      try {
        const formData = new FormData();
        formData.append("file", photo.file);
        formData.append("type", "claimPhotos");
        formData.append("claimId", claimId);

        const res = await fetch("/api/upload/supabase", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.url);
        }

        completed++;
        setUploadProgress(Math.round((completed / photos.length) * 100));
      } catch (err) {
        logger.error("Photo upload error:", err);
      }
    }
    return uploadedUrls;
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/claims/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          dateOfLoss,
          lossType,
          tradeType,
          status: "INTAKE",
          propertyAddress,
          structureType,
          stories,
          roofType: isRoofingTrade ? roofType : undefined,
          slope,
          squareFootage,
          contactName,
          contactPhone,
          contactEmail,
          policyNumber,
          carrier,
          deductible,
          agentName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to create claim.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const claimId = data.claimId as string;

      if (photos.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);
        await uploadPhotosForClaim(claimId);
        setIsUploading(false);
      }

      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      router.push(`/claims/${claimId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  }

  const steps: { id: Step; label: string; description: string }[] = [
    { id: 1, label: "Loss Type", description: "What happened" },
    { id: 2, label: "Trade Type", description: "What trade is needed" },
    { id: 3, label: "Client Details", description: "Contact & policy info" },
    { id: 4, label: "Property", description: "Where is the damage" },
    { id: 5, label: "Date of Loss", description: "When did it happen" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Stepper */}
      <ol className="mb-6 flex items-center justify-between gap-2 text-sm">
        {steps.map((s, idx) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-slate-50 text-slate-400",
                ].join(" ")}
              >
                {done ? "✓" : s.id}
              </div>
              <div className="hidden flex-col sm:flex">
                <span
                  className={[
                    "text-xs font-medium",
                    active ? "text-slate-900" : done ? "text-slate-500" : "text-slate-400",
                  ].join(" ")}
                >
                  {s.label}
                </span>
                <span className="text-[11px] text-slate-400">{s.description}</span>
              </div>
              {idx < steps.length - 1 && <div className="mx-1 h-px flex-1 bg-slate-200" />}
            </li>
          );
        })}
      </ol>

      {/* Content */}
      <div className="space-y-4">
        {/* STEP 1: Loss Type */}
        {step === 1 && (
          <>
            {/* Scope of Work AI Scanner */}
            <ScopeOfWorkScanner
              sowFile={sowFile}
              sowParsing={sowParsing}
              sowResult={sowResult}
              sowError={sowError}
              onUpload={handleSowUpload}
              onClear={() => {
                setSowFile(null);
                setSowResult(null);
                setSowError(null);
              }}
              onCreateClaim={handleSubmit}
              loading={loading}
              isUploading={isUploading}
              canCreate={!!propertyAddress && !!dateOfLoss && !!lossType}
            />

            <StepOneLossType
              lossType={lossType}
              setLossType={(v) => {
                setLossType(v);
                setTradeType("");
              }}
            />
          </>
        )}

        {/* STEP 2: Trade Type */}
        {step === 2 && lossType && (
          <StepTwoTradeType
            lossType={lossType as LossType}
            tradeType={tradeType}
            setTradeType={setTradeType}
          />
        )}

        {/* STEP 3: Client Details */}
        {step === 3 && (
          <StepThreeClientDetails
            contactName={contactName}
            setContactName={setContactName}
            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
            contactEmail={contactEmail}
            setContactEmail={setContactEmail}
            carrier={carrier}
            setCarrier={setCarrier}
            policyNumber={policyNumber}
            setPolicyNumber={setPolicyNumber}
            deductible={deductible}
            setDeductible={setDeductible}
            agentName={agentName}
            setAgentName={setAgentName}
          />
        )}

        {/* STEP 4: Property */}
        {step === 4 && (
          <StepFourProperty
            propertyAddress={propertyAddress}
            setPropertyAddress={setPropertyAddress}
            structureType={structureType}
            setStructureType={setStructureType}
            stories={stories}
            setStories={setStories}
            roofType={roofType}
            setRoofType={setRoofType}
            slope={slope}
            setSlope={setSlope}
            squareFootage={squareFootage}
            setSquareFootage={setSquareFootage}
            isRoofingTrade={isRoofingTrade}
            lossType={lossType as LossType}
          />
        )}

        {/* STEP 5: Date of Loss + optional Quick DOL + Photos */}
        {step === 5 && (
          <StepFiveDateOfLoss
            dateOfLoss={dateOfLoss}
            setDateOfLoss={setDateOfLoss}
            propertyAddress={propertyAddress}
            showQuickDOLButton={showQuickDOLButton}
            showQuickDOL={showQuickDOL}
            setShowQuickDOL={setShowQuickDOL}
            photos={photos}
            addPhotos={addPhotos}
            removePhoto={removePhoto}
            updatePhotoTag={updatePhotoTag}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        )}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            disabled={step === 1 || loading || isUploading}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
            {step < 5 && (
              <Button
                type="button"
                onClick={() => {
                  if (canGoNext(step)) {
                    setStep((s) => (s + 1) as Step);
                  }
                }}
                disabled={!canGoNext(step) || loading}
              >
                Next →
              </Button>
            )}

            {step === 5 && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || isUploading || !dateOfLoss}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isUploading
                  ? `Uploading photos... ${uploadProgress}%`
                  : loading
                    ? "Creating claim..."
                    : photos.length > 0
                      ? `Create Claim & Upload ${photos.length} Photo${photos.length > 1 ? "s" : ""}`
                      : "Create Claim"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  STEP 1: Loss Type                                       */
/* ───────────────────────────────────────────────────────── */

const LOSS_TYPES: { value: LossType; label: string; emoji: string; description: string }[] = [
  { value: "FIRE", label: "Fire", emoji: "🔥", description: "Structural fire damage" },
  { value: "WATER", label: "Water", emoji: "💧", description: "Flooding, leaks, burst pipes" },
  { value: "WIND_HAIL", label: "Wind / Hail", emoji: "🌬️", description: "Storm & hail impact" },
  { value: "STORM", label: "Storm", emoji: "⛈️", description: "Severe weather damage" },
  { value: "SMOKE", label: "Smoke", emoji: "💨", description: "Smoke & soot damage" },
  { value: "MOLD", label: "Mold", emoji: "🦠", description: "Mold contamination" },
  { value: "BIOHAZARD", label: "Biohazard", emoji: "☣️", description: "Biohazard cleanup" },
  { value: "OTHER", label: "Other", emoji: "❓", description: "Other damage type" },
];

function StepOneLossType({
  lossType,
  setLossType,
}: {
  lossType: LossType | "";
  setLossType: (v: LossType) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-base font-semibold text-slate-900">What type of loss occurred?</h3>
      <p className="mb-4 text-sm text-slate-500">Select the primary type of damage</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LOSS_TYPES.map((lt) => (
          <button
            key={lt.value}
            type="button"
            onClick={() => setLossType(lt.value)}
            className={[
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
              lossType === lt.value
                ? "border-sky-500 bg-sky-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
            ].join(" ")}
          >
            <span className="text-2xl">{lt.emoji}</span>
            <span className="text-sm font-medium text-slate-900">{lt.label}</span>
            <span className="text-[11px] text-slate-500">{lt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  STEP 2: Trade Type                                      */
/* ───────────────────────────────────────────────────────── */

function StepTwoTradeType({
  lossType,
  tradeType,
  setTradeType,
}: {
  lossType: LossType;
  tradeType: TradeType | "";
  setTradeType: (v: TradeType) => void;
}) {
  const options = TRADE_OPTIONS[lossType] || TRADE_OPTIONS.OTHER;

  return (
    <div>
      <h3 className="mb-1 text-base font-semibold text-slate-900">What trade is needed?</h3>
      <p className="mb-4 text-sm text-slate-500">
        Select the primary trade for this{" "}
        {LOSS_TYPES.find((l) => l.value === lossType)?.label.toLowerCase()} claim
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTradeType(t.value)}
            className={[
              "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
              tradeType === t.value
                ? "border-sky-500 bg-sky-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
            ].join(" ")}
          >
            <span className="text-xl">{t.emoji}</span>
            <span className="text-sm font-medium text-slate-900">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  STEP 3: Client Details                                  */
/* ───────────────────────────────────────────────────────── */

function StepThreeClientDetails(props: {
  contactName: string;
  setContactName: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  carrier: string;
  setCarrier: (v: string) => void;
  policyNumber: string;
  setPolicyNumber: (v: string) => void;
  deductible: string;
  setDeductible: (v: string) => void;
  agentName: string;
  setAgentName: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-base font-semibold text-slate-900">Client & Policy Details</h3>
      <p className="mb-4 text-sm text-slate-500">
        Enter homeowner and insurance information (all optional — can be added later)
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          id="contactName"
          label="Policyholder Name"
          placeholder="John Doe"
          value={props.contactName}
          onChange={props.setContactName}
        />
        <InputField
          id="contactPhone"
          label="Phone"
          placeholder="(555) 123-4567"
          type="tel"
          value={props.contactPhone}
          onChange={props.setContactPhone}
        />
        <InputField
          id="contactEmail"
          label="Email"
          placeholder="john@example.com"
          type="email"
          value={props.contactEmail}
          onChange={props.setContactEmail}
        />
        <InputField
          id="carrier"
          label="Insurance Carrier"
          placeholder="e.g. State Farm"
          value={props.carrier}
          onChange={props.setCarrier}
        />
        <InputField
          id="policyNumber"
          label="Policy Number"
          placeholder="POL-12345"
          value={props.policyNumber}
          onChange={props.setPolicyNumber}
        />
        <InputField
          id="deductible"
          label="Deductible ($)"
          placeholder="e.g. 2500"
          type="number"
          value={props.deductible}
          onChange={props.setDeductible}
        />
        <InputField
          id="agentName"
          label="Agent Name (optional)"
          placeholder="Agent or adjuster"
          value={props.agentName}
          onChange={props.setAgentName}
          className="md:col-span-2"
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  STEP 4: Property Address                                */
/* ───────────────────────────────────────────────────────── */

function StepFourProperty(props: {
  propertyAddress: string;
  setPropertyAddress: (v: string) => void;
  structureType: StructureType;
  setStructureType: (v: StructureType) => void;
  stories: string;
  setStories: (v: string) => void;
  roofType: RoofType;
  setRoofType: (v: RoofType) => void;
  slope: string;
  setSlope: (v: string) => void;
  squareFootage: string;
  setSquareFootage: (v: string) => void;
  isRoofingTrade: boolean;
  lossType: LossType;
}) {
  const isRoofingClaim =
    props.isRoofingTrade ||
    props.lossType === "WIND_HAIL" ||
    props.lossType === "STORM" ||
    props.lossType === "FIRE";

  return (
    <div>
      <h3 className="mb-1 text-base font-semibold text-slate-900">Property Information</h3>
      <p className="mb-4 text-sm text-slate-500">Where is the damage located?</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label htmlFor="propertyAddress" className="text-xs font-medium text-slate-700">
            Property Address <span className="text-red-500">*</span>
          </label>
          <input
            id="propertyAddress"
            type="text"
            placeholder="123 Main St, Prescott, AZ 86301"
            value={props.propertyAddress}
            onChange={(e) => props.setPropertyAddress(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="structureType" className="text-xs font-medium text-slate-700">
            Structure Type
          </label>
          <select
            id="structureType"
            value={props.structureType}
            onChange={(e) => props.setStructureType(e.target.value as StructureType)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="SINGLE_FAMILY">🏠 Single-family</option>
            <option value="DUPLEX">🏘️ Duplex</option>
            <option value="MULTI_FAMILY">🏢 Multi-family</option>
            <option value="COMMERCIAL">🏬 Commercial</option>
            <option value="MOBILE_HOME">🚐 Mobile Home</option>
            <option value="OTHER">❓ Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="stories" className="text-xs font-medium text-slate-700">
            Stories
          </label>
          <input
            id="stories"
            type="number"
            min={1}
            value={props.stories}
            onChange={(e) => props.setStories(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        {isRoofingClaim && (
          <>
            <div className="space-y-1">
              <label htmlFor="roofType" className="text-xs font-medium text-slate-700">
                Roof Type
              </label>
              <select
                id="roofType"
                value={props.roofType}
                onChange={(e) => props.setRoofType(e.target.value as RoofType)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="SHINGLE">🏠 Shingle</option>
                <option value="TILE">🧱 Tile</option>
                <option value="METAL">⚙️ Metal</option>
                <option value="TPO">🏢 TPO</option>
                <option value="FOAM">🏢 Spray Foam</option>
                <option value="MODBIT">🏢 Modified Bitumen</option>
                <option value="OTHER">❓ Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="roofSlope" className="text-xs font-medium text-slate-700">
                Roof Slope / Pitch
              </label>
              <input
                id="roofSlope"
                type="text"
                placeholder="4/12, 6/12, flat, etc."
                value={props.slope}
                onChange={(e) => props.setSlope(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </>
        )}

        {!isRoofingClaim && (
          <div className="space-y-1">
            <label htmlFor="affectedArea" className="text-xs font-medium text-slate-700">
              Affected Area
            </label>
            <input
              id="affectedArea"
              type="text"
              placeholder={
                props.lossType === "WATER"
                  ? "e.g. Kitchen, Bathroom, Basement"
                  : props.lossType === "MOLD"
                    ? "e.g. Crawlspace, Attic, Bathroom"
                    : "e.g. Living room, Garage"
              }
              value={props.slope}
              onChange={(e) => props.setSlope(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        )}

        <div className="space-y-1 md:col-span-2">
          <label htmlFor="squareFootage" className="text-xs font-medium text-slate-700">
            Approximate Square Footage
          </label>
          <input
            id="squareFootage"
            type="number"
            min={0}
            placeholder="e.g. 2400"
            value={props.squareFootage}
            onChange={(e) => props.setSquareFootage(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  STEP 5: Date of Loss + Quick DOL + Photos               */
/* ───────────────────────────────────────────────────────── */

const PHOTO_TAGS = ["Exterior", "Roof", "Interior", "Water Damage", "Structural", "Other"];

function StepFiveDateOfLoss(props: {
  dateOfLoss: string;
  setDateOfLoss: (v: string) => void;
  propertyAddress: string;
  showQuickDOLButton: boolean;
  showQuickDOL: boolean;
  setShowQuickDOL: (v: boolean) => void;
  photos: PhotoFile[];
  addPhotos: (files: FileList | File[]) => void;
  removePhoto: (index: number) => void;
  updatePhotoTag: (index: number, tag: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) props.addPhotos(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-base font-semibold text-slate-900">When did the loss occur?</h3>
        <p className="mb-4 text-sm text-slate-500">
          Enter the date of loss, or use Quick DOL to find it from weather data
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="dateOfLoss" className="text-xs font-medium text-slate-700">
              Date of Loss <span className="text-red-500">*</span>
            </label>
            <input
              id="dateOfLoss"
              type="date"
              value={props.dateOfLoss}
              onChange={(e) => props.setDateOfLoss(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          {props.showQuickDOLButton && (
            <Button
              type="button"
              variant={props.showQuickDOL ? "secondary" : "outline"}
              onClick={() => props.setShowQuickDOL(!props.showQuickDOL)}
              className="mb-0.5 shrink-0"
            >
              <CloudRain className="mr-2 h-4 w-4" />
              {props.showQuickDOL ? "Hide" : "Quick DOL Pull"}
            </Button>
          )}
        </div>
      </div>

      {/* Quick DOL Finder (inline) */}
      {props.showQuickDOL && (
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-4">
          <QuickDOLFinder
            initialAddress={props.propertyAddress}
            onSelectDate={(date) => {
              props.setDateOfLoss(date);
              props.setShowQuickDOL(false);
            }}
          />
        </div>
      )}

      {/* Photo Upload (optional) */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">
          Photos <span className="font-normal text-slate-400">(optional)</span>
        </h4>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition-colors hover:border-sky-400 hover:bg-sky-50"
        >
          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && props.addPhotos(e.target.files)}
            className="hidden"
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
              <Camera className="h-5 w-5 text-sky-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Drag & drop or click to select photos
            </p>
            <p className="mt-1 text-xs text-slate-500">Up to 20 photos • 10MB each</p>
          </label>
        </div>

        {/* Upload Progress */}
        {props.isUploading && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-sky-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </span>
              <span className="font-medium text-sky-800">{props.uploadProgress}%</span>
            </div>
            <Progress value={props.uploadProgress} className="h-2" />
          </div>
        )}

        {/* Photo Grid */}
        {props.photos.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                {props.photos.length} photo{props.photos.length !== 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  props.photos.forEach((_, i) => props.removePhoto(0));
                }}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {props.photos.map((photo, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={photo.preview}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => props.removePhoto(index)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="border-t border-slate-200 bg-white p-1">
                    <select
                      value={photo.tag}
                      onChange={(e) => props.updatePhotoTag(index, e.target.value)}
                      aria-label={`Tag for photo ${index + 1}`}
                      className="w-full rounded border border-slate-200 px-1 py-0.5 text-[11px] focus:border-sky-500 focus:outline-none"
                    >
                      {PHOTO_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {props.photos.length === 0 && (
          <p className="mt-2 text-center text-xs text-slate-400">
            💡 Photos help support the claim — you can also add them later
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Scope of Work AI Scanner                                */
/* ───────────────────────────────────────────────────────── */

function ScopeOfWorkScanner({
  sowFile,
  sowParsing,
  sowResult,
  sowError,
  onUpload,
  onClear,
  onCreateClaim,
  loading,
  isUploading,
  canCreate,
}: {
  sowFile: File | null;
  sowParsing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sowResult: Record<string, any> | null;
  sowError: string | null;
  onUpload: (file: File) => void;
  onClear: () => void;
  onCreateClaim: () => void;
  loading: boolean;
  isUploading: boolean;
  canCreate: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when parsing starts or result is available
  const isExpanded = expanded || sowParsing || !!sowResult || !!sowError;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setExpanded(true);
      onUpload(file);
    }
  };

  const filledFields = sowResult
    ? Object.entries(sowResult).filter(
        ([k, v]) => v && k !== "lineItems" && k !== "summary" && k !== "error"
      ).length
    : 0;

  return (
    <div className="mb-6 overflow-hidden rounded-xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-violet-100/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Sparkles className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900">Have a Scope of Work?</p>
            <p className="text-xs text-violet-600">
              Upload a PDF or photo — AI will auto-fill all claim fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sowResult && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ✓ {filledFields} fields filled
            </span>
          )}
          <span className="text-sm text-violet-400">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-violet-200 p-4">
          {!sowFile && !sowParsing && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="rounded-xl border-2 border-dashed border-violet-300 bg-white/60 p-6 text-center transition-colors hover:border-violet-400 hover:bg-violet-50"
            >
              <input
                type="file"
                id="sow-upload"
                accept=".pdf,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setExpanded(true);
                    onUpload(file);
                  }
                }}
                className="hidden"
              />
              <label htmlFor="sow-upload" className="cursor-pointer">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                  <FileText className="h-6 w-6 text-violet-600" />
                </div>
                <p className="text-sm font-medium text-violet-800">
                  Drop your Scope of Work here, or click to select
                </p>
                <p className="mt-1 text-xs text-violet-500">PDF, JPG, PNG, or HEIC • Max 20MB</p>
              </label>
            </div>
          )}

          {sowParsing && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-violet-800">
                  AI is scanning your scope of work...
                </p>
                <p className="text-xs text-violet-500">
                  Extracting loss type, address, policy info, line items & more
                </p>
              </div>
            </div>
          )}

          {sowError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{sowError}</p>
              <button
                type="button"
                onClick={onClear}
                className="mt-2 text-xs font-medium text-red-600 underline"
              >
                Try another file
              </button>
            </div>
          )}

          {sowResult && !sowParsing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-800">
                    Scope parsed — {filledFields} fields auto-filled
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>

              {sowResult.summary && (
                <p className="rounded-lg bg-white/80 p-3 text-sm text-slate-700">
                  📋 {sowResult.summary}
                </p>
              )}

              {sowResult.lineItems && sowResult.lineItems.length > 0 && (
                <details className="rounded-lg bg-white/80 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    📄 {sowResult.lineItems.length} line items extracted
                  </summary>
                  // eslint-disable-next-line react/jsx-no-comment-textnodes
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {sowResult.lineItems.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs"
                      >
                        <span className="truncate text-slate-700">{item.description}</span>
                        {item.total && (
                          <span className="ml-2 shrink-0 font-medium text-slate-900">
                            ${Number(item.total).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {sowResult.totalEstimate && (
                    <div className="mt-2 flex justify-end border-t border-slate-200 pt-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Total: ${Number(sowResult.totalEstimate).toLocaleString()}
                      </span>
                    </div>
                  )}
                </details>
              )}

              {/* Auto-filled fields summary */}
              <div className="rounded-lg bg-white/80 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">✨ Auto-filled fields:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(sowResult)
                    .filter(
                      ([k, v]) =>
                        v &&
                        k !== "lineItems" &&
                        k !== "summary" &&
                        k !== "error" &&
                        k !== "totalEstimate" &&
                        k !== "claimNumber"
                    )
                    .map(([k]) => (
                      <span
                        key={k}
                        className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                      >
                        {k
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase())
                          .trim()}
                      </span>
                    ))}
                </div>
              </div>

              {/* Create Claim Now — one-click */}
              {canCreate ? (
                <button
                  type="button"
                  onClick={onCreateClaim}
                  disabled={loading || isUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating claim...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      🚀 Create Claim Now — All Fields Ready
                    </>
                  )}
                </button>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-700">
                    ⚠️ Missing required fields (address or date). Click Next to fill remaining
                    steps, or review below.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Shared: InputField component                            */
/* ───────────────────────────────────────────────────────── */

function InputField({
  id,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  className = "",
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
    </div>
  );
}

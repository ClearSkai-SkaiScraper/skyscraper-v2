"use client";

/**
 * 🧙 CLIENT ONBOARDING WIZARD
 *
 * Overlay wizard for new client users after Clerk sign-in.
 * Collects: user type, needs, project details, and photos.
 */

import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  FileText,
  Hammer,
  Home,
  Key,
  Loader2,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

// ----- Types -----
type ClientType =
  | "homeowner"
  | "business_owner"
  | "landlord"
  | "property_manager"
  | "broker"
  | "real_estate_agent";

type ProjectNeed =
  | "repair"
  | "remodel"
  | "addition"
  | "bid"
  | "insurance_claim"
  | "storm_damage"
  | "maintenance"
  | "inspection";

interface ClientOnboardingData {
  clientType: ClientType | null;
  projectNeeds: ProjectNeed[];
  projectDescription: string;
  idealContractor: string;
  photos: File[];
  photoUrls: string[];
}

interface ClientOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

// ----- Constants -----
const CLIENT_TYPES: {
  id: ClientType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "homeowner",
    label: "Homeowner",
    icon: <Home className="h-6 w-6" />,
    description: "I own my home",
  },
  {
    id: "business_owner",
    label: "Business Owner",
    icon: <Building2 className="h-6 w-6" />,
    description: "Commercial property",
  },
  {
    id: "landlord",
    label: "Landlord",
    icon: <Key className="h-6 w-6" />,
    description: "I rent out properties",
  },
  {
    id: "property_manager",
    label: "Property Manager",
    icon: <Users className="h-6 w-6" />,
    description: "I manage properties",
  },
  {
    id: "broker",
    label: "Broker",
    icon: <FileText className="h-6 w-6" />,
    description: "Insurance or mortgage",
  },
  {
    id: "real_estate_agent",
    label: "Real Estate Agent",
    icon: <User className="h-6 w-6" />,
    description: "Help clients buy/sell",
  },
];

const PROJECT_NEEDS: { id: ProjectNeed; label: string; icon: React.ReactNode }[] = [
  { id: "repair", label: "Repair", icon: <Hammer className="h-5 w-5" /> },
  { id: "remodel", label: "Remodel", icon: <Sparkles className="h-5 w-5" /> },
  { id: "addition", label: "Addition", icon: <Building2 className="h-5 w-5" /> },
  { id: "bid", label: "Get a Bid", icon: <FileText className="h-5 w-5" /> },
  { id: "insurance_claim", label: "Insurance Claim", icon: <FileText className="h-5 w-5" /> },
  { id: "storm_damage", label: "Storm Damage", icon: <Home className="h-5 w-5" /> },
  { id: "maintenance", label: "Maintenance", icon: <Hammer className="h-5 w-5" /> },
  { id: "inspection", label: "Inspection", icon: <FileText className="h-5 w-5" /> },
];

const STEPS = [
  { id: 1, title: "Who Are You?", description: "Tell us about yourself" },
  { id: 2, title: "What Do You Need?", description: "Select your project needs" },
  { id: 3, title: "Project Details", description: "Tell us more about your project" },
  { id: 4, title: "Photos", description: "Upload any relevant photos" },
];

// ----- Component -----
export function ClientOnboardingWizard({ onComplete, onSkip }: ClientOnboardingWizardProps) {
  const { user } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<ClientOnboardingData>({
    clientType: null,
    projectNeeds: [],
    projectDescription: "",
    idealContractor: "",
    photos: [],
    photoUrls: [],
  });

  // Photo upload handling
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newPhotos = acceptedFiles.slice(0, 5 - data.photos.length);
      const newUrls = newPhotos.map((file) => URL.createObjectURL(file));

      setData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos],
        photoUrls: [...prev.photoUrls, ...newUrls],
      }));
    },
    [data.photos.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 5,
    maxSize: 25 * 1024 * 1024, // 25MB
  });

  const removePhoto = (index: number) => {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoUrls: prev.photoUrls.filter((_, i) => i !== index),
    }));
  };

  // Step navigation
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.clientType !== null;
      case 2:
        return data.projectNeeds.length > 0;
      case 3:
        return true; // Optional
      case 4:
        return true; // Optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload photos first if any
      let uploadedPhotoUrls: string[] = [];
      if (data.photos.length > 0) {
        const formData = new FormData();
        data.photos.forEach((photo) => {
          formData.append("files", photo);
        });

        const uploadRes = await fetch("/api/upload/photos", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedPhotoUrls = uploadData.urls || [];
        }
      }

      // Save client profile
      const res = await fetch("/api/clients/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientType: data.clientType,
          projectNeeds: data.projectNeeds,
          projectDescription: data.projectDescription,
          idealContractor: data.idealContractor,
          photoUrls: uploadedPhotoUrls,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save profile");
      }

      // Success!
      onComplete();
      router.push("/portal");
    } catch (err) {
      logger.error("[ONBOARDING] Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-2xl duration-300 animate-in fade-in zoom-in-95">
        <Card className="border-0 shadow-2xl">
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-white">
            {/* Skip button */}
            {onSkip && (
              <button
                onClick={onSkip}
                aria-label="Skip onboarding"
                className="absolute right-4 top-4 rounded-full p-1 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Welcome to SkaiScrape!</h2>
                <p className="text-green-100">
                  {user?.firstName ? `Hi ${user.firstName}, let's` : "Let's"} set up your profile
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6 flex gap-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    step.id <= currentStep ? "bg-white" : "bg-white/30"
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-green-100">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
            </p>
          </div>

          {/* Content */}
          <CardContent className="max-h-[60vh] overflow-y-auto p-6">
            {/* Step 1: Client Type */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Help us understand your role so we can connect you with the right contractors.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {CLIENT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setData({ ...data, clientType: type.id })}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:border-green-300 hover:bg-green-50",
                        data.clientType === type.id
                          ? "border-green-500 bg-green-50 ring-2 ring-green-500/20"
                          : "border-slate-200"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full",
                          data.clientType === type.id
                            ? "bg-green-100 text-green-600"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {type.icon}
                      </div>
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-slate-500">{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Project Needs */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-slate-600">What are you looking for? Select all that apply.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PROJECT_NEEDS.map((need) => {
                    const isSelected = data.projectNeeds.includes(need.id);
                    return (
                      <button
                        key={need.id}
                        onClick={() => {
                          setData({
                            ...data,
                            projectNeeds: isSelected
                              ? data.projectNeeds.filter((n) => n !== need.id)
                              : [...data.projectNeeds, need.id],
                          });
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all hover:border-green-300",
                          isSelected
                            ? "border-green-500 bg-green-50 ring-2 ring-green-500/20"
                            : "border-slate-200"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            isSelected
                              ? "bg-green-100 text-green-600"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {need.icon}
                        </div>
                        <span className="text-sm font-medium">{need.label}</span>
                        {isSelected && (
                          <Check className="absolute right-2 top-2 h-4 w-4 text-green-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Project Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="projectDescription" className="text-base font-medium">
                    Tell us about your project
                  </Label>
                  <p className="mb-2 text-sm text-slate-500">
                    What work do you need done? Any details that would help a contractor understand
                    your needs.
                  </p>
                  <Textarea
                    id="projectDescription"
                    placeholder="e.g., My roof was damaged in a recent hailstorm. I need an inspection and possibly a full replacement. The house is a 2-story, about 2,500 sq ft..."
                    value={data.projectDescription}
                    onChange={(e) => setData({ ...data, projectDescription: e.target.value })}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="idealContractor" className="text-base font-medium">
                    Describe your ideal contractor
                  </Label>
                  <p className="mb-2 text-sm text-slate-500">
                    What qualities matter most to you? Licensed, insured, experience, reviews, etc.
                  </p>
                  <Textarea
                    id="idealContractor"
                    placeholder="e.g., I'm looking for a licensed and insured roofing company with experience in insurance claims. Good reviews and quick response time are important..."
                    value={data.idealContractor}
                    onChange={(e) => setData({ ...data, idealContractor: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Photos */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Upload photos of your property or damage (optional). This helps contractors
                  provide better estimates.
                </p>

                {/* Upload zone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                    isDragActive
                      ? "border-green-500 bg-green-50"
                      : "border-slate-300 hover:border-green-400 hover:bg-slate-50"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                      {isDragActive ? (
                        <Upload className="h-7 w-7" />
                      ) : (
                        <Camera className="h-7 w-7" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {isDragActive ? "Drop photos here" : "Drag & drop photos"}
                      </p>
                      <p className="text-sm text-slate-500">or click to browse (max 5 photos)</p>
                    </div>
                  </div>
                </div>

                {/* Photo previews */}
                {data.photoUrls.length > 0 && (
                  <div className="grid grid-cols-5 gap-3">
                    {data.photoUrls.map((url, index) => (
                      <div key={index} className="group relative aspect-square">
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="h-full w-full rounded-lg object-cover"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          aria-label="Remove photo"
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
          </CardContent>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ClientOnboardingWizard;

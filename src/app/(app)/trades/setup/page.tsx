// src/app/(app)/trades/setup/page.tsx
// Clean trades onboarding wizard - replaces the broken one
"use client";

import { Briefcase, Camera, Check, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { logger } from "@/lib/logger";

const TRADE_OPTIONS = [
  "Roofing",
  "Solar",
  "HVAC",
  "Electrical",
  "Plumbing",
  "General Contractor",
  "Restoration",
  "Painting",
  "Flooring",
  "Carpentry",
  "Landscaping",
  "Concrete",
  "Other",
];

const TITLE_OPTIONS = [
  "Owner/Contractor",
  "Owner/Operator",
  "Project Manager",
  "Senior Project Manager",
  "Special Projects Manager",
  "Sub-Contractor",
  "Independent Contractor",
  "Sales Representative",
  "Estimator",
  "Field Supervisor",
  "Safety Manager",
  "Quality Control",
];

export default function TradesSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    tradeType: "",
    jobTitle: "",
    customTitle: "",
    yearsExperience: "",
    bio: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    toast.info("Processing your profile...");
    setLoading(true);

    try {
      // Upload avatar if provided
      let avatarUrl = "";
      if (fileInputRef.current?.files?.[0]) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", fileInputRef.current.files[0]);

        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formDataUpload,
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          avatarUrl = url;
        }
      }

      // Determine final job title
      const finalJobTitle =
        formData.jobTitle === "custom" ? formData.customTitle : formData.jobTitle;

      const res = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify({
          step: "create_profile",
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            tradeType: formData.tradeType,
            jobTitle: finalJobTitle,
            yearsExperience: formData.yearsExperience,
            bio: formData.bio,
            avatar: avatarUrl,
            specialties: [],
            lookingFor: [],
            workHistory: [],
          },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create profile");
      }

      toast.success("🎉 Profile created successfully!");

      // Clear any client-side cache and force server refresh
      router.refresh();

      // Short delay to ensure revalidation, then hard redirect
      setTimeout(() => {
        window.location.replace("/trades/profile");
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create profile";
      logger.error("[TradesSetup] Error:", error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const canProceedStep1 =
    formData.firstName.trim() && formData.lastName.trim() && formData.email.trim();
  const canProceedStep2 =
    formData.tradeType &&
    formData.jobTitle &&
    (formData.jobTitle !== "custom" || formData.customTitle.trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-600 p-4">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            Create Your Trade Profile
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Set up your employee profile to join the trades network
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                  step >= s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                }`}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 2 && (
                <div
                  className={`mx-2 h-1 w-16 rounded ${step > s ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? "Step 1: Personal Information" : "Step 2: Trade Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <>
                {/* Avatar Upload */}
                <div className="flex flex-col items-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="h-28 w-28 rounded-full border-4 border-blue-200 object-cover shadow-lg"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                        <Camera className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                    aria-label="Upload profile photo"
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click to upload a profile photo (optional)
                  </p>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@company.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Continue Button */}
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full">
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {/* Step 2: Trade Details */}
            {step === 2 && (
              <>
                {/* Trade Type */}
                <div>
                  <Label>Primary Trade *</Label>
                  <Select
                    value={formData.tradeType}
                    onValueChange={(value) => updateField("tradeType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADE_OPTIONS.map((trade) => (
                        <SelectItem key={trade} value={trade}>
                          {trade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Job Title */}
                <div>
                  <Label>Job Title *</Label>
                  <Select
                    value={formData.jobTitle}
                    onValueChange={(value) => updateField("jobTitle", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your title" />
                    </SelectTrigger>
                    <SelectContent>
                      {TITLE_OPTIONS.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Other (Enter Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Title */}
                {formData.jobTitle === "custom" && (
                  <div>
                    <Label htmlFor="customTitle">Custom Title *</Label>
                    <Input
                      id="customTitle"
                      value={formData.customTitle}
                      onChange={(e) => updateField("customTitle", e.target.value)}
                      placeholder="Enter your title"
                    />
                  </div>
                )}

                {/* Years Experience */}
                <div>
                  <Label htmlFor="yearsExperience">Years of Experience (optional)</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.yearsExperience}
                    onChange={(e) => updateField("yearsExperience", e.target.value)}
                    placeholder="5"
                  />
                </div>

                {/* Bio */}
                <div>
                  <Label htmlFor="bio">Short Bio (optional)</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="A brief introduction about yourself..."
                    rows={3}
                    maxLength={280}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.bio.length}/280 characters
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !canProceedStep2}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Complete Setup
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Skip Option */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Not ready?{" "}
          <button
            type="button"
            onClick={() => {
              toast.info("You can complete your profile later");
              router.push("/trades");
            }}
            className="text-blue-600 hover:underline"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}

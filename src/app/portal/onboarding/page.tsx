"use client";

import { useUser } from "@clerk/nextjs";
import { Camera, Check, Home, Loader2, MapPin, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

const CLIENT_CATEGORIES = [
  { value: "Homeowner", label: "Homeowner", description: "I own my home" },
  { value: "Renter", label: "Renter", description: "I rent my home" },
  { value: "Business Owner", label: "Business Owner", description: "I own a commercial property" },
  { value: "Property Manager", label: "Property Manager", description: "I manage properties" },
  { value: "Landlord", label: "Landlord", description: "I own rental properties" },
  { value: "Realtor", label: "Realtor", description: "I work in real estate" },
];

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

/**
 * Client Onboarding Page
 *
 * Simple, clean 3-step onboarding flow for new clients:
 * 1. Basic Info (name, category)
 * 2. Location (address, city, state)
 * 3. Profile Photo & Bio (optional but encouraged)
 */
export default function ClientOnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    category: "Homeowner",
    address: "",
    city: "",
    state: "",
    zip: "",
    bio: "",
  });

  // Load user data from Clerk
  useEffect(() => {
    if (isLoaded && user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      }));
      if (user.imageUrl) {
        setAvatarPreview(user.imageUrl);
      }
    }
  }, [isLoaded, user]);

  // Check if user already has a profile
  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch("/api/portal/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.onboardingComplete) {
            router.push("/portal/profile");
          } else if (data.profile) {
            // Pre-fill with existing data
            const p = data.profile;
            setFormData({
              firstName: p.firstName || user?.firstName || "",
              lastName: p.lastName || user?.lastName || "",
              phone: p.phone || "",
              category: p.category || "Homeowner",
              address: p.address || "",
              city: p.city || "",
              state: p.state || "",
              zip: p.postal || p.zip || "",
              bio: p.bio || "",
            });
            if (p.avatarUrl) setAvatarPreview(p.avatarUrl);
            if (p.coverPhotoUrl) setCoverPreview(p.coverPhotoUrl);
          }
        }
      } catch (error) {
        logger.error("Failed to check profile:", error);
      }
    }
    if (isLoaded && user) {
      void checkProfile();
    }
  }, [isLoaded, user, router]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Cover image must be less than 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error("Please enter your name");
        return;
      }
    }
    if (step === 2) {
      if (!formData.city.trim() || !formData.state) {
        toast.error("Please enter your city and state");
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Upload avatar if selected
      let avatarUrl = "";
      if (avatarInputRef.current?.files?.[0]) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", avatarInputRef.current.files[0]);
        formDataUpload.append("type", "avatar");
        const uploadRes = await fetch("/api/portal/upload-photo", {
          method: "POST",
          body: formDataUpload,
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          avatarUrl = url;
        }
      }

      // Upload cover if selected
      let coverUrl = "";
      if (coverInputRef.current?.files?.[0]) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", coverInputRef.current.files[0]);
        formDataUpload.append("type", "cover");
        const uploadRes = await fetch("/api/portal/upload-photo", {
          method: "POST",
          body: formDataUpload,
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          coverUrl = url;
        }
      }

      // Save profile
      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          postal: formData.zip,
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(coverUrl ? { coverPhotoUrl: coverUrl } : {}),
          onboardingComplete: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      toast.success("🎉 Profile created! Welcome to SkaiScraper!");
      router.push("/portal");
    } catch (error) {
      logger.error("Save error:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initials = (formData.firstName?.[0] || "") + (formData.lastName?.[0] || "") || "?";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50/40 to-amber-50/30 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
            <Home className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Welcome to SkaiScraper
          </h1>
          <p className="mt-2 text-slate-600">Let&apos;s set up your profile in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all ${
                  s === step
                    ? "bg-green-600 text-white shadow-lg shadow-green-500/30"
                    : s < step
                      ? "bg-green-100 text-green-600"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`h-1 w-8 sm:w-16 ${s < step ? "bg-green-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="mb-8 flex justify-between px-2 text-xs text-slate-500 sm:px-8 sm:text-sm">
          <span className={step >= 1 ? "font-medium text-green-600" : ""}>Basic Info</span>
          <span className={step >= 2 ? "font-medium text-green-600" : ""}>Location</span>
          <span className={step >= 3 ? "font-medium text-green-600" : ""}>Profile</span>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Tell us about yourself
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This helps us personalize your experience
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>What describes you best?</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {CLIENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                        formData.category === cat.value
                          ? "border-green-500 bg-green-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          formData.category === cat.value
                            ? "bg-green-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Home className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{cat.label}</p>
                        <p className="text-xs text-slate-500">{cat.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Where are you located?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This helps us connect you with local pros
                </p>
              </div>

              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="mt-1"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Prescott"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="w-1/2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  placeholder="86301"
                  className="mt-1"
                />
              </div>

              <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Why we need this</p>
                    <p className="text-sm text-blue-700">
                      Your location helps us connect you with qualified contractors in your area and
                      provide accurate service availability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Profile Photo & Bio */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Complete your profile
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a photo and bio to help contractors know you
                </p>
              </div>

              {/* Cover Photo */}
              <div>
                <Label>Cover Photo (Optional)</Label>
                <div
                  className="relative mt-2 h-32 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-green-50 to-emerald-100 transition hover:border-green-500"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-1 text-sm text-slate-500">Click to add cover photo</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverSelect}
                  aria-label="Upload cover photo"
                />
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div
                  className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Profile Photo</p>
                  <p className="text-sm text-slate-500">Click to upload a photo of yourself</p>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="mt-2 text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    Choose photo
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                  aria-label="Upload avatar photo"
                />
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">About You (Optional)</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell contractors a little about yourself and your property..."
                  className="mt-1 h-24"
                />
                <p className="mt-1 text-xs text-slate-500">
                  This helps contractors understand your needs better
                </p>
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-green-50 p-4">
                <p className="font-medium text-green-900">You&apos;re all set!</p>
                <p className="mt-1 text-sm text-green-700">
                  After completing setup, you can browse contractors, submit work requests, and
                  manage your property projects.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Complete Setup
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <p className="mt-4 text-center text-sm text-slate-500">
          <button
            onClick={() => router.push("/portal")}
            className="text-slate-600 hover:text-slate-900 hover:underline"
          >
            Skip for now
          </button>
          {" · You can complete your profile later"}
        </p>
      </div>
    </div>
  );
}

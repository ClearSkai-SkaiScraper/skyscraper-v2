// src/app/client/[slug]/onboarding/page.tsx
"use client";

import { Camera, Check, ChevronRight, Home, Loader2, Mail, Phone, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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

const PROPERTY_TYPES = [
  "Single Family Home",
  "Multi-Family Home",
  "Townhouse",
  "Condo/Apartment",
  "Mobile Home",
  "Commercial",
  "Other",
];

const CLIENT_TYPES = [
  { value: "homeowner", label: "Homeowner", description: "I own a residential property" },
  {
    value: "business_owner",
    label: "Business Owner",
    description: "I own/operate a commercial property",
  },
  {
    value: "broker",
    label: "Insurance Broker",
    description: "I represent clients for insurance claims",
  },
  {
    value: "real_estate_agent",
    label: "Real Estate Agent",
    description: "I work in real estate sales/leasing",
  },
  {
    value: "property_manager",
    label: "Property Manager",
    description: "I manage properties for owners",
  },
  { value: "landlord", label: "Landlord", description: "I own rental properties" },
];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    clientType: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "",
    propertyNotes: "",
    preferredContact: "email",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const res = await fetch(`/api/client-portal/${slug}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          avatar: avatarUrl,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      toast.success("Profile created successfully!");
      router.push(`/client/${slug}/profile`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 =
    formData.firstName && formData.lastName && formData.email && formData.clientType;
  const canProceedStep2 = formData.street && formData.city && formData.state && formData.zipCode;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 py-4">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step >= s ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700"
            }`}
          >
            {step > s ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 3 && (
            <div
              className={`h-1 w-12 ${step > s ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome to Your Client Portal
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Let&apos;s set up your profile to get started
          </p>
        </div>

        {renderStepIndicator()}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && (
                <>
                  <User className="h-5 w-5" />
                  Personal Information
                </>
              )}
              {step === 2 && (
                <>
                  <Home className="h-5 w-5" />
                  Property Details
                </>
              )}
              {step === 3 && (
                <>
                  <Camera className="h-5 w-5" />
                  Profile Picture & Preferences
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Client Type Selection */}
                  <div>
                    <Label className="text-base font-semibold">What best describes you? *</Label>
                    <p className="mb-3 text-sm text-slate-500">
                      This helps us personalize your experience
                    </p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {CLIENT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, clientType: type.value })}
                          className={`rounded-lg border-2 p-3 text-left transition-all ${
                            formData.clientType === type.value
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                              : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          <p className="text-sm font-medium">{type.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Smith"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="w-full"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Step 2: Property Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Phoenix"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          placeholder="AZ"
                          maxLength={2}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipCode">ZIP *</Label>
                        <Input
                          id="zipCode"
                          value={formData.zipCode}
                          onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                          placeholder="85001"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="propertyType">Property Type</Label>
                    <Select
                      value={formData.propertyType}
                      onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="propertyNotes">Property Notes (optional)</Label>
                    <Textarea
                      id="propertyNotes"
                      value={formData.propertyNotes}
                      onChange={(e) => setFormData({ ...formData, propertyNotes: e.target.value })}
                      placeholder="Any notes about your property..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!canProceedStep2}
                      className="flex-1"
                    >
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Avatar & Preferences */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative cursor-pointer"
                    >
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Profile"
                          className="h-32 w-32 rounded-full border-4 border-blue-200 object-cover shadow-lg"
                        />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
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
                      Click to upload a profile photo
                    </p>
                  </div>

                  <div>
                    <Label>Preferred Contact Method</Label>
                    <Select
                      value={formData.preferredContact}
                      onValueChange={(value) =>
                        setFormData({ ...formData, preferredContact: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="text">Text Message</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Complete Setup
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

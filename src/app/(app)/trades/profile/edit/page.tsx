"use client";

import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  Shield,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardButton } from "@/components/ui/StandardButton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { TRADE_TYPES } from "@/lib/trades/constants";

/* ─── Grouped trades from canonical source ─── */
const GROUPED_TRADES: Record<string, { value: string; label: string }[]> = {
  "Construction & Building": TRADE_TYPES.filter((t) =>
    [
      "roofing",
      "plumbing",
      "hvac",
      "electrical",
      "general_contractor",
      "painting",
      "flooring",
      "drywall",
      "windows",
      "siding",
      "gutters",
      "fencing",
      "landscaping",
      "concrete",
      "carpentry",
      "tile",
      "foundation",
      "chimney",
    ].includes(t.value)
  ),
  "Restoration & Remediation": TRADE_TYPES.filter((t) =>
    [
      "restoration",
      "mold_remediation",
      "biohazard_cleanup",
      "asbestos_abatement",
      "smoke_damage",
    ].includes(t.value)
  ),
  "Pool & Water Features": TRADE_TYPES.filter((t) =>
    ["pool_contractor", "pool_service", "pool_remodel", "hot_tub_spa", "water_features"].includes(
      t.value
    )
  ),
  "Smart Home & Technology": TRADE_TYPES.filter((t) =>
    [
      "smart_home",
      "home_automation",
      "security_systems",
      "av_installation",
      "network_cabling",
      "ev_charging",
    ].includes(t.value)
  ),
  "Solar & Energy": TRADE_TYPES.filter((t) =>
    ["solar", "battery_storage", "energy_efficiency"].includes(t.value)
  ),
  "Specialty Services": TRADE_TYPES.filter((t) =>
    [
      "garage_doors",
      "appliance_repair",
      "pest_control",
      "tree_service",
      "irrigation",
      "septic_services",
      "well_services",
      "locksmith",
      "handyman",
    ].includes(t.value)
  ),
};

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
  "CEO / Founder",
  "CTO / Technology Director",
  "Operations Manager",
  "Other (Custom)",
];

const BUSINESS_ENTITY_TYPES = [
  "LLC",
  "Sole Proprietorship",
  "S-Corp",
  "C-Corp",
  "Partnership",
  "Non-Profit",
  "Other",
];

const COVERAGE_TYPES = [
  "Residential Construction",
  "Commercial Construction",
  "Industrial",
  "Government / Municipal",
  "New Build",
  "Remodel / Renovation",
  "Emergency / Restoration",
  "Insurance Restoration",
  "Maintenance / Service",
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
  "DC",
];

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    tradeType: "",
    jobTitle: "",
    bio: "",
    yearsExperience: "",
    // Professional fields
    licenseNumber: "",
    licenseState: "",
    rocNumber: "",
    businessEntityType: "",
    isBonded: false,
    isInsured: false,
    bondAmount: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    additionalNotes: "",
    coverageTypes: [] as string[],
  });

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/trades/onboarding");
        if (!res.ok) {
          toast.error("Failed to load profile");
          setInitialLoading(false);
          return;
        }
        const data = await res.json();

        if (data.hasProfile && data.employee) {
          const emp = data.employee;
          setFormData({
            firstName: emp.firstName || "",
            lastName: emp.lastName || "",
            email: emp.email || "",
            phone: emp.phone || "",
            city: emp.city || "",
            state: emp.state || "",
            tradeType: emp.tradeType || "",
            jobTitle: TITLE_OPTIONS.includes(emp.jobTitle)
              ? emp.jobTitle
              : emp.jobTitle
                ? "Other (Custom)"
                : "",
            bio: emp.bio || "",
            yearsExperience: emp.yearsExperience?.toString() || "",
            licenseNumber: emp.licenseNumber || "",
            licenseState: emp.licenseState || "",
            rocNumber: emp.rocNumber || "",
            businessEntityType: emp.businessEntityType || "",
            isBonded: emp.isBonded || false,
            isInsured: emp.isInsured || false,
            bondAmount: emp.bondAmount || "",
            insuranceProvider: emp.insuranceProvider || "",
            insurancePolicyNumber: emp.insurancePolicyNumber || "",
            additionalNotes: emp.additionalNotes || "",
            coverageTypes: emp.coverageTypes || [],
          });
          if (emp.jobTitle && !TITLE_OPTIONS.includes(emp.jobTitle)) {
            setCustomTitle(emp.jobTitle);
          }
          if (emp.avatar) {
            setHeadshotPreview(emp.avatar);
          }
        } else {
          toast.error("No profile found - please complete onboarding first");
          router.push("/trades/onboarding");
        }
      } catch (error) {
        logger.error("[EditProfile] Failed to load profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleHeadshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setHeadshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleCoverageType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      coverageTypes: prev.coverageTypes.includes(type)
        ? prev.coverageTypes.filter((t) => t !== type)
        : [...prev.coverageTypes, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload headshot if new file selected
      let avatarUrl = "";
      if (fileInputRef.current?.files?.[0]) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", fileInputRef.current.files[0]);

        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formDataUpload,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload photo");
        }
        const { url } = await uploadRes.json();
        avatarUrl = url;
      }

      const finalJobTitle =
        formData.jobTitle === "Other (Custom)" ? customTitle : formData.jobTitle;

      const profileData = {
        ...formData,
        jobTitle: finalJobTitle,
        specialties: [],
        lookingFor: [],
        workHistory: [],
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      };

      const res = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          step: "create_profile",
          data: profileData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.details || "Failed to update profile");
      }

      toast.success("✅ Profile updated!");
      router.push("/trades/profile");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile";
      logger.error("[EditProfile] Error:", error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-4 pb-20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/trades/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your trades network profile
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Profile Photo
            </h2>
            <div className="flex items-center gap-6">
              <div
                className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-500 dark:border-slate-600 dark:bg-slate-700"
                onClick={() => fileInputRef.current?.click()}
              >
                {headshotPreview ? (
                  <img src={headshotPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {headshotPreview ? "Change photo" : "Upload photo"}
                </button>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP. Max 5MB.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleHeadshotSelect}
                aria-label="Upload profile photo"
              />
            </div>
          </div>

          {/* Personal Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Your city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  aria-label="Select your state"
                >
                  <option value="">Select state</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Building2 className="h-5 w-5 text-blue-600" />
              Professional Details
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tradeType">Trade Type *</Label>
                  <select
                    id="tradeType"
                    value={formData.tradeType}
                    onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    aria-label="Select your trade type"
                    required
                  >
                    <option value="">Select your trade</option>
                    {Object.entries(GROUPED_TRADES).map(([category, trades]) => (
                      <optgroup key={category} label={category}>
                        {trades.map((trade) => (
                          <option key={trade.value} value={trade.label}>
                            {trade.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    min="0"
                    max="70"
                    value={formData.yearsExperience}
                    onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <select
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  aria-label="Select your job title"
                  required
                >
                  <option value="">Select your title</option>
                  {TITLE_OPTIONS.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>

              {formData.jobTitle === "Other (Custom)" && (
                <div className="space-y-2">
                  <Label htmlFor="customTitle">Custom Title *</Label>
                  <Input
                    id="customTitle"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Enter your custom title"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell others about yourself and your work..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Licensing & Business Entity */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <FileText className="h-5 w-5 text-blue-600" />
              Licensing &amp; Business Entity
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Add your license, ROC #, or business entity type so clients know you&apos;re legit.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessEntityType">Business Entity Type</Label>
                <select
                  id="businessEntityType"
                  value={formData.businessEntityType}
                  onChange={(e) => setFormData({ ...formData, businessEntityType: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  aria-label="Select business entity type"
                >
                  <option value="">Select entity type</option>
                  {BUSINESS_ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License #</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="e.g., CTR-123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseState">License State</Label>
                <select
                  id="licenseState"
                  value={formData.licenseState}
                  onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  aria-label="Select license state"
                >
                  <option value="">Select state</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rocNumber">ROC # (AZ Registrar of Contractors)</Label>
                <Input
                  id="rocNumber"
                  value={formData.rocNumber}
                  onChange={(e) => setFormData({ ...formData, rocNumber: e.target.value })}
                  placeholder="e.g., ROC-123456"
                />
              </div>
            </div>
          </div>

          {/* Bonded & Insured */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Bonded &amp; Insured
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Let clients know you&apos;re bonded and insured for peace of mind.
            </p>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label
                  htmlFor="isBonded"
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all ${formData.isBonded ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500"}`}
                >
                  <input
                    type="checkbox"
                    id="isBonded"
                    checked={formData.isBonded}
                    onChange={(e) => setFormData({ ...formData, isBonded: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${formData.isBonded ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white dark:border-slate-500 dark:bg-slate-700"}`}
                  >
                    {formData.isBonded && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Bonded
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      I carry a surety bond
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="isInsured"
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all ${formData.isInsured ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500"}`}
                >
                  <input
                    type="checkbox"
                    id="isInsured"
                    checked={formData.isInsured}
                    onChange={(e) => setFormData({ ...formData, isInsured: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${formData.isInsured ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white dark:border-slate-500 dark:bg-slate-700"}`}
                  >
                    {formData.isInsured && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Insured
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      I carry liability insurance
                    </p>
                  </div>
                </label>
              </div>
              {(formData.isBonded || formData.isInsured) && (
                <div className="grid gap-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-slate-600 dark:bg-slate-700/50 md:grid-cols-2">
                  {formData.isBonded && (
                    <div className="space-y-2">
                      <Label htmlFor="bondAmount">Bond Amount</Label>
                      <Input
                        id="bondAmount"
                        value={formData.bondAmount}
                        onChange={(e) => setFormData({ ...formData, bondAmount: e.target.value })}
                        placeholder="e.g., $25,000"
                      />
                    </div>
                  )}
                  {formData.isInsured && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                        <Input
                          id="insuranceProvider"
                          value={formData.insuranceProvider}
                          onChange={(e) =>
                            setFormData({ ...formData, insuranceProvider: e.target.value })
                          }
                          placeholder="e.g., State Farm, Nationwide"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="insurancePolicyNumber">Policy #</Label>
                        <Input
                          id="insurancePolicyNumber"
                          value={formData.insurancePolicyNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, insurancePolicyNumber: e.target.value })
                          }
                          placeholder="e.g., POL-123456"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Coverage Types */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Shield className="h-5 w-5 text-blue-600" />
              Coverage &amp; Service Types
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Select the types of projects and coverage areas you handle.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {COVERAGE_TYPES.map((type) => {
                const isSelected = formData.coverageTypes.includes(type);
                return (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm transition-all ${isSelected ? "border-blue-500 bg-blue-50 font-medium text-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:text-gray-300 dark:hover:border-slate-500"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCoverageType(type)}
                      className="sr-only"
                    />
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white dark:border-slate-500 dark:bg-slate-700"}`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    {type}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
              Additional Notes
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Anything else you&apos;d like potential clients or connections to know.
            </p>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="e.g., Veteran-owned business, bilingual (English/Spanish), 24/7 emergency service available..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/trades/profile">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <StandardButton type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </StandardButton>
          </div>
        </form>
      </div>
    </div>
  );
}

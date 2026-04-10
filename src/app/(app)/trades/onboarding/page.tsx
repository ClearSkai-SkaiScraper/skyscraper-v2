"use client";

import { Camera, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
];

export default function TradesOnboardingPage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    tradeType: "",
    jobTitle: "",
    bio: "",
    yearsExperience: "",
    city: "",
    state: "",
    // Company details (optional, user-managed)
    companyName: "",
    foundedYear: "",
    rocNumber: "",
    companyLicense: "",
    isLicensed: false,
    isBonded: false,
    isInsured: false,
    insuranceProvider: "",
    bondAmount: "",
    officePhone: "",
    companyWebsite: "",
  });

  // Load existing profile if editing — or redirect if already complete
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/trades/onboarding");
        if (res.ok) {
          const data = await res.json();
          if (data.hasProfile && data.employee) {
            const emp = data.employee;

            // If onboarding is already complete, redirect to profile page
            // instead of showing the creation form again
            if (emp.onboardingStep === "complete") {
              router.push("/trades/profile");
              return;
            }

            setFormData({
              firstName: emp.firstName || "",
              lastName: emp.lastName || "",
              email: emp.email || "",
              phone: emp.phone || "",
              tradeType: emp.tradeType || "",
              jobTitle: emp.jobTitle || "",
              bio: emp.bio || "",
              yearsExperience: emp.yearsExperience?.toString() || "",
              city: emp.city || "",
              state: emp.state || "",
              // Company details
              companyName: emp.companyName || "",
              foundedYear: emp.foundedYear?.toString() || "",
              rocNumber: emp.rocNumber || "",
              companyLicense: emp.companyLicense || "",
              isLicensed: !!(emp.companyLicense || emp.rocNumber),
              isBonded: !!emp.bondAmount,
              isInsured: !!emp.insuranceProvider,
              insuranceProvider: emp.insuranceProvider || "",
              bondAmount: emp.bondAmount || "",
              officePhone: emp.officePhone || "",
              companyWebsite: emp.companyWebsite || "",
            });
            if (emp.avatar) setAvatarPreview(emp.avatar);
            if (emp.coverPhoto) setCoverPreview(emp.coverPhoto);
            if (emp.companyLogo) setLogoPreview(emp.companyLogo);
          }
        }
      } catch (error) {
        logger.error("Failed to load profile:", error);
      }
    }
    void loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload avatar
      let avatarUrl = "";
      if (avatarInputRef.current?.files?.[0]) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", avatarInputRef.current.files[0]);
        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formDataUpload,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload avatar");
        const { url } = await uploadRes.json();
        avatarUrl = url;
      }

      // Upload cover photo
      let coverUrl = "";
      if (coverInputRef.current?.files?.[0]) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", coverInputRef.current.files[0]);
        const uploadRes = await fetch("/api/upload/cover", {
          method: "POST",
          body: formDataUpload,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload cover photo");
        const { url } = await uploadRes.json();
        coverUrl = url;
      }

      // Upload company logo
      let logoUrl = "";
      if (logoInputRef.current?.files?.[0]) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", logoInputRef.current.files[0]);
        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formDataUpload,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload company logo");
        const { url } = await uploadRes.json();
        logoUrl = url;
      }

      // Save profile with company details
      const profileData = {
        ...formData,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
        ...(coverUrl ? { coverPhoto: coverUrl } : {}),
        ...(logoUrl ? { companyLogo: logoUrl } : {}),
      };

      const res = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "create_profile",
          data: profileData,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save profile");
      }

      toast.success("✅ Profile saved!");
      router.push("/trades/profile");
    } catch (error) {
      logger.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Your Trades Profile</h1>
          <p className="mt-2 text-gray-600">Build your professional profile and get discovered</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Photo */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Cover Photo</h2>
            <div
              className="relative h-48 cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-blue-500"
              onClick={() => coverInputRef.current?.click()}
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            >
              // eslint-disable-next-line @next/next/no-img-element
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Click to upload cover photo</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload cover photo"
              onChange={handleCoverSelect}
            />
          </div>

          {/* Profile Photo */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div
                className="flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-gray-300 bg-gray-50 transition hover:border-blue-500"
                onClick={() => avatarInputRef.current?.click()}
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              >
                // eslint-disable-next-line @next/next/no-img-element
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {avatarPreview ? "Change photo" : "Upload photo"}
                </button>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP. Max 5MB.</p>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Upload profile photo"
                onChange={handleAvatarSelect}
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tradeType">Trade *</Label>
                <select
                  id="tradeType"
                  value={formData.tradeType}
                  onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  aria-label="Select your trade type"
                  required
                >
                  <option value="">Select your trade...</option>
                  {TRADE_OPTIONS.map((trade) => (
                    <option key={trade} value={trade}>
                      {trade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g., Owner, Project Manager"
                />
              </div>
              <div>
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g., AZ"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell people about yourself, your experience, and what makes you great..."
                rows={4}
              />
            </div>
          </div>

          {/* Company Details (Optional) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Company Details</h2>
            <p className="mb-4 text-sm text-gray-500">
              Optional: Add your company information to show on your public profile
            </p>

            {/* Company Logo */}
            <div className="mb-6">
              <Label className="mb-2 block">Company Logo</Label>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-blue-500"
                  onClick={() => logoInputRef.current?.click()}
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                >
                  // eslint-disable-next-line @next/next/no-img-element
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {logoPreview ? "Change logo" : "Upload logo"}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">Square image recommended</p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Upload company logo"
                  onChange={handleLogoSelect}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g., ABC Roofing LLC"
                />
              </div>
              <div>
                <Label htmlFor="foundedYear">Years in Business</Label>
                <Input
                  id="foundedYear"
                  type="number"
                  value={formData.foundedYear}
                  onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                  placeholder="e.g., 2015"
                />
              </div>
              <div>
                <Label htmlFor="rocNumber">ROC / License Number</Label>
                <Input
                  id="rocNumber"
                  value={formData.rocNumber}
                  onChange={(e) => setFormData({ ...formData, rocNumber: e.target.value })}
                  placeholder="e.g., ROC123456"
                />
              </div>
              <div>
                <Label htmlFor="officePhone">Office Phone</Label>
                <Input
                  id="officePhone"
                  type="tel"
                  value={formData.officePhone}
                  onChange={(e) => setFormData({ ...formData, officePhone: e.target.value })}
                  placeholder="e.g., (555) 123-4567"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="companyWebsite">Company Website</Label>
                <Input
                  id="companyWebsite"
                  type="url"
                  value={formData.companyWebsite}
                  onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                  placeholder="e.g., https://www.mycompany.com"
                />
              </div>
            </div>

            {/* Licensed, Bonded, Insured */}
            <div className="mt-4 space-y-3">
              <Label className="text-sm font-medium text-gray-700">Credentials</Label>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isLicensed"
                    checked={formData.isLicensed}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isLicensed: checked === true })
                    }
                  />
                  <Label htmlFor="isLicensed" className="cursor-pointer text-sm">
                    Licensed
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isBonded"
                    checked={formData.isBonded}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isBonded: checked === true })
                    }
                  />
                  <Label htmlFor="isBonded" className="cursor-pointer text-sm">
                    Bonded
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isInsured"
                    checked={formData.isInsured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isInsured: checked === true })
                    }
                  />
                  <Label htmlFor="isInsured" className="cursor-pointer text-sm">
                    Insured
                  </Label>
                </div>
              </div>
            </div>

            {/* Insurance & Bond Details (conditional) */}
            {(formData.isInsured || formData.isBonded) && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {formData.isInsured && (
                  <div>
                    <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                    <Input
                      id="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={(e) =>
                        setFormData({ ...formData, insuranceProvider: e.target.value })
                      }
                      placeholder="e.g., State Farm"
                    />
                  </div>
                )}
                {formData.isBonded && (
                  <div>
                    <Label htmlFor="bondAmount">Bond Amount</Label>
                    <Input
                      id="bondAmount"
                      value={formData.bondAmount}
                      onChange={(e) => setFormData({ ...formData, bondAmount: e.target.value })}
                      placeholder="e.g., $50,000"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

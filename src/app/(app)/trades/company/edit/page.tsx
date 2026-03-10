"use client";

import { ArrowLeft, Building2, Camera, Clock, Globe, Loader2, Save, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardButton } from "@/components/ui/StandardButton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { TRADE_TYPES } from "@/lib/trades/constants";

/* ─── Grouped trades from canonical source (matches profile edit) ─── */
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

export default function CompanyEditPage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    yearsInBusiness: "",
    licenseNumber: "",
    licenseState: "",
    insuranceProvider: "",
    insuranceCertificate: "",
    specialties: [] as string[],
    // Extended fields (stored on member profile)
    tagline: "",
    warrantyInfo: "",
    emergencyAvailable: false,
    freeEstimates: false,
    paymentMethods: [] as string[],
    hoursOfOperation: {
      monday: { open: "08:00", close: "17:00", closed: false },
      tuesday: { open: "08:00", close: "17:00", closed: false },
      wednesday: { open: "08:00", close: "17:00", closed: false },
      thursday: { open: "08:00", close: "17:00", closed: false },
      friday: { open: "08:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "14:00", closed: false },
      sunday: { open: "", close: "", closed: true },
    } as Record<string, { open: string; close: string; closed: boolean }>,
    socialLinks: {
      facebook: "",
      instagram: "",
      linkedin: "",
      youtube: "",
      tiktok: "",
      nextdoor: "",
      yelp: "",
      google: "",
    } as Record<string, string>,
  });

  // Load existing company data
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await fetch("/api/trades/company");
        if (!res.ok) {
          toast.error("Failed to load company");
          setInitialLoading(false);
          return;
        }
        const data = await res.json();

        if (data.company) {
          const company = data.company;
          const ms = data.memberSettings || {};
          setFormData((prev) => ({
            ...prev,
            name: company.name || "",
            description: company.description || "",
            website: company.website || "",
            phone: company.phone || "",
            email: company.email || "",
            address: company.address || "",
            city: company.city || "",
            state: company.state || "",
            zip: company.zip || "",
            yearsInBusiness: company.yearsInBusiness?.toString() || "",
            licenseNumber: company.licenseNumber || "",
            licenseState: company.licenseState || "",
            insuranceProvider: company.insuranceProvider || ms.insuranceProvider || "",
            insuranceCertificate: company.insuranceCertificate || "",
            specialties: company.specialties || [],
            // Extended fields from member settings
            tagline: ms.tagline || "",
            warrantyInfo: ms.warrantyInfo || "",
            emergencyAvailable: ms.emergencyAvailable || false,
            freeEstimates: ms.freeEstimates || false,
            paymentMethods: ms.paymentMethods || [],
            hoursOfOperation: ms.hoursOfOperation || prev.hoursOfOperation,
            socialLinks: ms.socialLinks
              ? { ...prev.socialLinks, ...ms.socialLinks }
              : prev.socialLinks,
          }));
          if (company.logo) {
            setLogoPreview(company.logo);
          }
          if (company.coverPhoto) {
            setCoverPreview(company.coverPhoto);
          }
          setIsAdmin(data.isAdmin);
        } else {
          toast.error("No company found");
          router.push("/trades/profile");
        }
      } catch (error) {
        logger.error("[CompanyEdit] Failed to load company:", error);
        toast.error("Failed to load company");
      } finally {
        setInitialLoading(false);
      }
    };

    loadCompany();
  }, [router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be less than 5MB");
      return;
    }

    setUploading("logo");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      setLogoPreview(url);

      // Update company logo immediately
      await fetch("/api/trades/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: url }),
      });

      toast.success("Logo updated!");
    } catch (error) {
      logger.error("Logo upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(null);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Cover image must be less than 10MB");
      return;
    }

    setUploading("cover");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      setCoverPreview(url);

      // Update company cover immediately
      await fetch("/api/trades/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverPhoto: url }),
      });

      toast.success("Cover photo updated!");
    } catch (error) {
      logger.error("Cover upload error:", error);
      toast.error("Failed to upload cover photo");
    } finally {
      setUploading(null);
    }
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/trades/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to update company");
      }

      toast.success("✅ Company updated!");
      router.push("/trades/company");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save company";
      logger.error("[CompanyEdit] Error:", error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/60 to-amber-50/40">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">Loading company...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/60 to-amber-50/40 p-6">
        <div className="max-w-md text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Admin Access Required</h1>
          <p className="mb-4 text-gray-600">
            Only company admins can edit company details. Contact your company admin to make
            changes.
          </p>
          <Link href="/trades/profile">
            <Button>Back to Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/60 to-amber-50/40 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Hidden file inputs */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
          aria-label="Upload company logo"
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
          aria-label="Upload cover photo"
        />

        {/* Header with back button */}
        <div className="mb-6">
          <Link href="/trades/company">
            <Button variant="ghost" size="icon" className="mb-2 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <PageHero title="Edit Company" subtitle="Update your company details and branding">
            <Link href="/trades/company/employees">
              <Button variant="outline">Manage Employees</Button>
            </Link>
          </PageHero>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Photo */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-r from-[#117CFF] to-[#00C2FF]">
              {coverPreview && (
                <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading === "cover"}
                className="absolute right-4 top-4 rounded-lg bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-50"
              >
                {uploading === "cover" ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Camera className="mr-2 inline h-4 w-4" />
                    Change Cover
                  </>
                )}
              </button>
            </div>
            <div className="p-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Company Cover Photo</h2>
              <p className="text-sm text-gray-600">
                This appears at the top of your company profile. Recommended size: 1200 x 400px.
              </p>
            </div>
          </div>

          {/* Logo */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Company Logo</h2>
            <div className="flex items-center gap-6">
              <div
                className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-500"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading === "logo"}
                  className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                >
                  {uploading === "logo"
                    ? "Uploading..."
                    : logoPreview
                      ? "Change logo"
                      : "Upload logo"}
                </button>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG or SVG. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Company Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell clients about your company..."
                  rows={4}
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Address</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Business Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yearsInBusiness">Years in Business</Label>
                <Input
                  id="yearsInBusiness"
                  type="number"
                  min="0"
                  value={formData.yearsInBusiness}
                  onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseState">License State</Label>
                <Input
                  id="licenseState"
                  value={formData.licenseState}
                  onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
                  maxLength={2}
                  placeholder="AZ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                  placeholder="State Farm, Allstate, etc."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="insuranceCertificate">Insurance Certificate Number</Label>
                <Input
                  id="insuranceCertificate"
                  value={formData.insuranceCertificate}
                  onChange={(e) =>
                    setFormData({ ...formData, insuranceCertificate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Specialties — Grouped by Category */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Specialties</h2>
            <p className="mb-4 text-sm text-gray-600">
              Select all the services your company offers — these appear on your company page and
              public profile.
            </p>
            {formData.specialties.length > 0 && (
              <p className="mb-4 text-xs font-medium text-blue-600">
                {formData.specialties.length} selected
              </p>
            )}
            <div className="space-y-5">
              {Object.entries(GROUPED_TRADES).map(([category, trades]) => (
                <div key={category}>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {trades.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleSpecialtyToggle(t.label)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          formData.specialties.includes(t.label)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company Motto / Tagline */}
          <div
            id="motto"
            className="scroll-mt-24 rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]"
          >
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Motto / Slogan</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Your company motto or slogan — this appears on your company page and public profile.
            </p>
            <div className="space-y-2">
              <Label htmlFor="tagline">Motto / Slogan</Label>
              <Textarea
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder='e.g. "Protecting Arizona homes with cutting-edge technology"'
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-gray-400">
                {formData.tagline.length}/200 characters — this is your company&apos;s motto or
                slogan
              </p>
            </div>
          </div>

          {/* Hours of Operation */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Business Hours</h2>
            </div>
            <div className="space-y-3">
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
                (day) => {
                  const dayData = formData.hoursOfOperation[day] || {
                    open: "",
                    close: "",
                    closed: true,
                  };
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium capitalize text-gray-700">
                        {day}
                      </span>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!dayData.closed}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              hoursOfOperation: {
                                ...prev.hoursOfOperation,
                                [day]: { ...dayData, closed: !e.target.checked },
                              },
                            }))
                          }
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-xs text-gray-500">Open</span>
                      </label>
                      {!dayData.closed && (
                        <>
                          <Input
                            type="time"
                            value={dayData.open}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                hoursOfOperation: {
                                  ...prev.hoursOfOperation,
                                  [day]: { ...dayData, open: e.target.value },
                                },
                              }))
                            }
                            className="w-32"
                          />
                          <span className="text-sm text-gray-500">to</span>
                          <Input
                            type="time"
                            value={dayData.close}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                hoursOfOperation: {
                                  ...prev.hoursOfOperation,
                                  [day]: { ...dayData, close: e.target.value },
                                },
                              }))
                            }
                            className="w-32"
                          />
                        </>
                      )}
                      {dayData.closed && (
                        <span className="text-sm italic text-gray-400">Closed</span>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Warranty, Estimates & Availability */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Warranty, Estimates & Extras</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="warrantyInfo">Warranty Information</Label>
                <Textarea
                  id="warrantyInfo"
                  value={formData.warrantyInfo}
                  onChange={(e) => setFormData({ ...formData, warrantyInfo: e.target.value })}
                  placeholder='e.g. "All work backed by a 5-year labor warranty and manufacturer coverage"'
                  rows={2}
                />
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.freeEstimates}
                  onChange={(e) => setFormData({ ...formData, freeEstimates: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Free Estimates</span>
                  <p className="text-xs text-gray-500">
                    Show &quot;Free Estimates&quot; badge on your profile
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.emergencyAvailable}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyAvailable: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    24/7 Emergency Available
                  </span>
                  <p className="text-xs text-gray-500">Show emergency availability badge</p>
                </div>
              </label>
            </div>
            <div className="mt-4">
              <Label className="mb-2 block">Accepted Payment Methods</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Cash",
                  "Check",
                  "Credit Card",
                  "Debit Card",
                  "Financing",
                  "Venmo",
                  "Zelle",
                  "PayPal",
                  "Insurance Direct Pay",
                ].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethods: prev.paymentMethods.includes(method)
                          ? prev.paymentMethods.filter((m) => m !== method)
                          : [...prev.paymentMethods, method],
                      }))
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      formData.paymentMethods.includes(method)
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-md ring-1 ring-black/[0.03]">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Social Media & Profiles</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  key: "facebook",
                  label: "Facebook",
                  placeholder: "https://facebook.com/yourcompany",
                },
                {
                  key: "instagram",
                  label: "Instagram",
                  placeholder: "https://instagram.com/yourcompany",
                },
                {
                  key: "linkedin",
                  label: "LinkedIn",
                  placeholder: "https://linkedin.com/company/yourcompany",
                },
                {
                  key: "youtube",
                  label: "YouTube",
                  placeholder: "https://youtube.com/@yourcompany",
                },
                { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourcompany" },
                { key: "nextdoor", label: "Nextdoor", placeholder: "https://nextdoor.com/..." },
                { key: "yelp", label: "Yelp", placeholder: "https://yelp.com/biz/yourcompany" },
                {
                  key: "google",
                  label: "Google Business",
                  placeholder: "https://g.page/yourcompany",
                },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`social-${key}`}>{label}</Label>
                  <Input
                    id={`social-${key}`}
                    type="url"
                    value={formData.socialLinks[key] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, [key]: e.target.value },
                      }))
                    }
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/trades/company">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <StandardButton type="submit" disabled={loading} gradient>
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

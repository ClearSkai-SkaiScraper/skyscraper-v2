"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { BrandingUpload } from "@/components/branding/BrandingUpload";
import { Button } from "@/components/ui/button";
import { BrandingSchema, formatZodError } from "@/lib/validation/schemas";

interface BrandingData {
  id?: string;
  companyName?: string | null;
  license?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  colorPrimary?: string | null;
  colorAccent?: string | null;
  logoUrl?: string | null;
  teamPhotoUrl?: string | null;
  companyAddress?: string | null;
}

interface BrandingFormProps {
  initial?: BrandingData | null;
  orgId: string;
  userId: string;
}

export default function BrandingForm({ initial, orgId, userId }: BrandingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: initial?.companyName || "",
    license: initial?.license || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    website: initial?.website || "",
    colorPrimary: initial?.colorPrimary || "#117CFF",
    colorAccent: initial?.colorAccent || "#FFC838",
    logoUrl: initial?.logoUrl || "",
    teamPhotoUrl: initial?.teamPhotoUrl || "",
    companyAddress: initial?.companyAddress || "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data with Zod
      const validatedData = BrandingSchema.parse(formData);

      const response = await fetch("/api/branding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // Show success toast
        alert(
          "✅ Branding updated successfully! Your changes will appear across all reports and exports."
        );
        // Redirect to dashboard with success indicator
        router.push("/dashboard?branding=saved");
        router.refresh(); // Refresh to show new branding
      } else {
        const errorMsg = data.error || "Unknown error";
        alert(`❌ Error saving branding: ${errorMsg}`);
      }
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        alert(`❌ Validation error: ${formatZodError(error)}`);
      } else {
        alert(`❌ Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (type: "logo" | "team", url: string) => {
    if (type === "logo") {
      handleInputChange("logoUrl", url);
    } else if (type === "team") {
      handleInputChange("teamPhotoUrl", url);
    }
    alert(`${type === "logo" ? "Logo" : "Team photo"} uploaded successfully!`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Company Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            Company Name *
          </label>
          <input
            type="text"
            required
            value={formData.companyName}
            onChange={(e) => handleInputChange("companyName", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Your Roofing Company LLC"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            License Number
          </label>
          <input
            type="text"
            value={formData.license}
            onChange={(e) => handleInputChange("license", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="ROC123456"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            Business Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            Business Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="contact@yourcompany.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            Website URL
          </label>
          <input
            type="text"
            value={formData.website}
            onChange={(e) => handleInputChange("website", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="https://yourcompany.com"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Optional - include https:// for external links
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
            Company Address / Location
          </label>
          <input
            type="text"
            value={formData.companyAddress}
            onChange={(e) => handleInputChange("companyAddress", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="123 Main St, Phoenix, AZ 85001"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Displayed on damage reports and professional documents
          </p>
        </div>
      </div>

      {/* Brand Colors */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Brand Colors
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={formData.colorPrimary}
                onChange={(e) => handleInputChange("colorPrimary", e.target.value)}
                className="h-10 w-12 rounded border border-slate-300 dark:border-slate-700"
                aria-label="Primary color picker"
              />
              <input
                type="text"
                value={formData.colorPrimary}
                onChange={(e) => handleInputChange("colorPrimary", e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="#117CFF"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
              Accent Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={formData.colorAccent}
                onChange={(e) => handleInputChange("colorAccent", e.target.value)}
                className="h-10 w-12 rounded border border-slate-300 dark:border-slate-700"
                aria-label="Accent color picker"
              />
              <input
                type="text"
                value={formData.colorAccent}
                onChange={(e) => handleInputChange("colorAccent", e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="#FFC838"
              />
            </div>
          </div>
        </div>
      </div>

      {/* File Uploads */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Media Assets for Reports & Documents
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          These assets are used in PDF reports, proposals, and AI-generated documents.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <BrandingUpload
            type="logo"
            currentUrl={formData.logoUrl}
            onUploadComplete={(url) => handleUploadComplete("logo", url)}
          />

          <BrandingUpload
            type="team"
            currentUrl={formData.teamPhotoUrl}
            onUploadComplete={(url) => handleUploadComplete("team", url)}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initial ? "Update Branding" : "Save Branding"}
        </Button>
      </div>
    </form>
  );
}

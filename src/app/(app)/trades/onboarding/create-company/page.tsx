/**
 * Trades Network Onboarding - Create Company Profile
 * Admin creates full company profile after employees join
 */

"use client";

import { logger } from "@/lib/logger";
import { Building2, Loader2, MapPin, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const TRADE_TYPES = [
  "Roofing",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Painting",
  "Flooring",
  "Drywall",
  "Carpentry",
  "Masonry",
  "Landscaping",
  "General Contractor",
  "Other",
];

export default function CreateCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    tradeTypes: [] as string[],
    serviceArea: "",
    yearsInBusiness: "",
    licenseNumber: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    website: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const handleTradeToggle = (trade: string) => {
    setFormData((prev) => ({
      ...prev,
      tradeTypes: prev.tradeTypes.includes(trade)
        ? prev.tradeTypes.filter((t) => t !== trade)
        : [...prev.tradeTypes, trade],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName) {
      toast.error("Company name is required");
      return;
    }

    if (formData.tradeTypes.length === 0) {
      toast.error("Select at least one trade type");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/trades/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "create_company", data: formData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create company");
      }

      toast.success("Company created successfully!");
      router.push("/trades/onboarding/job-photos");
    } catch (error) {
      logger.error("Company creation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-600 p-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Create Your Company</h1>
          <p className="text-lg text-gray-600">
            Set up your company profile to showcase your business
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
            <div className="h-1 w-12 rounded-full bg-blue-400"></div>
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
            <div className="h-1 w-12 rounded-full bg-blue-400"></div>
            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Step 3 of 4: Company Setup</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg"
        >
          {/* Company Name */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Elite Roofing Solutions"
              required
            />
          </div>

          {/* Trade Types */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Trade Types <span className="text-red-500">*</span>
            </label>
            <p className="mb-3 text-sm text-gray-500">Select all that apply</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {TRADE_TYPES.map((trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => handleTradeToggle(trade)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                    formData.tradeTypes.includes(trade)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {trade}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourcompany.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="h-4 w-4" />
              Business Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mb-3 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street address"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State"
              />
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ZIP"
              />
            </div>
          </div>

          {/* Service Area */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Service Area</label>
            <input
              type="text"
              value={formData.serviceArea}
              onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Greater Dallas-Fort Worth Metroplex"
            />
          </div>

          {/* Business Details */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Years in Business
            </label>
            <input
              type="number"
              value={formData.yearsInBusiness}
              onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 15"
              min="0"
            />
          </div>

          {/* Credentials */}
          <div className="mb-8 rounded-lg bg-blue-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Licensing & Insurance</h3>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">License Number</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., TX-12345678"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., State Farm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Policy Number
                </label>
                <input
                  type="text"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, insurancePolicyNumber: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., POL-987654321"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Company...
              </span>
            ) : (
              "Continue to Job Photos"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { Edit2, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface ClaimDetailsSectionProps {
  claimId: string;
  initialData: {
    claimNumber?: string | null;
    policy_number?: string | null;
    status?: string | null;
    damageType?: string | null;
    dateOfLoss?: string | null;
    insured_name?: string | null;
    homeowner_email?: string | null;
    carrier?: string | null;
    adjusterName?: string | null;
    adjusterPhone?: string | null;
    adjusterEmail?: string | null;
    estimatedValue?: number | null;
    approvedValue?: number | null;
    deductible?: number | null;
    priority?: string | null;
    title?: string | null;
    description?: string | null;
  };
}

const STATUS_OPTIONS = ["New", "In Progress", "Pending Review", "Approved", "Closed", "Cancelled"];

const DAMAGE_TYPE_OPTIONS = ["Fire", "Water", "Wind", "Hail", "Theft", "Vandalism", "Other"];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

export default function ClaimDetailsSection({ claimId, initialData }: ClaimDetailsSectionProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(initialData);

  const handleEdit = () => {
    setFormData(initialData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(initialData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        alert(`Failed to update claim: ${errorText}`);
        setIsSaving(false);
        return;
      }

      const result = await res.json();
      logger.info("✅ Claim updated:", result);

      setIsEditing(false);
      router.refresh(); // Refresh server component data
    } catch (error) {
      logger.error("❌ Error updating claim:", error);
      alert(error instanceof Error ? error.message : "Failed to update claim. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
      {/* Header with Edit/Save Buttons */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Claim Details</h2>
        {!isEditing ? (
          <Button onClick={handleEdit} className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={handleCancel} disabled={isSaving} variant="outline" className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Claim Number */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Claim Number</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.claimNumber || ""}
              onChange={(e) => handleChange("claimNumber", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter claim number"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.claimNumber || "—"}</p>
          )}
        </div>

        {/* Policy Number */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Policy Number</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.policy_number || ""}
              onChange={(e) => handleChange("policy_number", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter policy number"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.policy_number || "—"}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
          {isEditing ? (
            <select
              value={formData.status || ""}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              title="Select status"
            >
              <option value="">Select status...</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.status || "—"}</p>
          )}
        </div>

        {/* Damage Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Damage Type</label>
          {isEditing ? (
            <select
              value={formData.damageType || ""}
              onChange={(e) => handleChange("damageType", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              title="Select damage type"
            >
              <option value="">Select damage type...</option>
              {DAMAGE_TYPE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.damageType || "—"}</p>
          )}
        </div>

        {/* Date of Loss */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Date of Loss</label>
          {isEditing ? (
            <input
              type="date"
              value={formData.dateOfLoss || ""}
              onChange={(e) => handleChange("dateOfLoss", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Select date"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">
              {formData.dateOfLoss ? new Date(formData.dateOfLoss).toLocaleDateString() : "—"}
            </p>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Priority</label>
          {isEditing ? (
            <select
              value={formData.priority || ""}
              onChange={(e) => handleChange("priority", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              title="Select priority"
            >
              <option value="">Select priority...</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.priority || "—"}</p>
          )}
        </div>

        {/* Insured Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Insured Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.insured_name || ""}
              onChange={(e) => handleChange("insured_name", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter insured name"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.insured_name || "—"}</p>
          )}
        </div>

        {/* Homeowner Email */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Homeowner Email</label>
          {isEditing ? (
            <input
              type="email"
              value={formData.homeowner_email || ""}
              onChange={(e) => handleChange("homeowner_email", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter email address"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.homeowner_email || "—"}</p>
          )}
        </div>

        {/* Carrier */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Insurance Carrier</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.carrier || ""}
              onChange={(e) => handleChange("carrier", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter carrier name"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.carrier || "—"}</p>
          )}
        </div>

        {/* Adjuster Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Adjuster Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.adjusterName || ""}
              onChange={(e) => handleChange("adjusterName", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter adjuster name"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.adjusterName || "—"}</p>
          )}
        </div>

        {/* Adjuster Phone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Adjuster Phone</label>
          {isEditing ? (
            <input
              type="tel"
              value={formData.adjusterPhone || ""}
              onChange={(e) => handleChange("adjusterPhone", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter phone number"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.adjusterPhone || "—"}</p>
          )}
        </div>

        {/* Adjuster Email */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Adjuster Email</label>
          {isEditing ? (
            <input
              type="email"
              value={formData.adjusterEmail || ""}
              onChange={(e) => handleChange("adjusterEmail", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter email address"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.adjusterEmail || "—"}</p>
          )}
        </div>

        {/* Estimated Value */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Estimated Value</label>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={formData.estimatedValue || ""}
              onChange={(e) =>
                handleChange(
                  "estimatedValue",
                  e.target.value ? parseFloat(e.target.value) || null : null
                )
              }
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter amount"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">
              {formData.estimatedValue != null && !isNaN(Number(formData.estimatedValue))
                ? `$${Number(formData.estimatedValue).toLocaleString()}`
                : "—"}
            </p>
          )}
        </div>

        {/* Approved Value */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Approved Value</label>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={formData.approvedValue || ""}
              onChange={(e) =>
                handleChange(
                  "approvedValue",
                  e.target.value ? parseFloat(e.target.value) || null : null
                )
              }
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter amount"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">
              {formData.approvedValue != null && !isNaN(Number(formData.approvedValue))
                ? `$${Number(formData.approvedValue).toLocaleString()}`
                : "—"}
            </p>
          )}
        </div>

        {/* Deductible */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Deductible</label>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={formData.deductible || ""}
              onChange={(e) =>
                handleChange(
                  "deductible",
                  e.target.value ? parseFloat(e.target.value) || null : null
                )
              }
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter amount"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">
              {formData.deductible != null && !isNaN(Number(formData.deductible))
                ? `$${Number(formData.deductible).toLocaleString()}`
                : "—"}
            </p>
          )}
        </div>

        {/* Title - Full Width */}
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700">Title</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter claim title"
            />
          ) : (
            <p className="px-4 py-2 text-gray-900">{formData.title || "—"}</p>
          )}
        </div>

        {/* Description - Full Width */}
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
          {isEditing ? (
            <textarea
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border-2 border-gray-400 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 hover:border-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder="Enter claim description"
            />
          ) : (
            <p className="whitespace-pre-wrap px-4 py-2 text-gray-900">
              {formData.description || "—"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

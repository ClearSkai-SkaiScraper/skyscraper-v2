"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
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

interface SubmitWorkRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug?: string;
}

const REQUEST_TYPES = [
  "Emergency Repair",
  "Roof Inspection",
  "Water Damage",
  "Storm Damage",
  "General Repair",
  "Maintenance",
  "Other",
];

const JOB_CATEGORIES = [
  {
    value: "potential_claim",
    label: "🛡️ Potential Insurance Claim",
    hint: "Storm, fire, or other insured damage",
  },
  {
    value: "bidding_opportunity",
    label: "🔨 Bidding Opportunity",
    hint: "Open for quotes from multiple pros",
  },
  { value: "repair", label: "🔧 Repair", hint: "Something broken that needs fixing" },
  {
    value: "out_of_pocket",
    label: "💰 Out of Pocket Estimate",
    hint: "Self-pay, no insurance involved",
  },
  { value: "unsure", label: "❓ Unsure — Help Me Decide", hint: "Not sure what I need yet" },
];

export function SubmitWorkRequestModal({ isOpen, onClose, slug }: SubmitWorkRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    jobCategory: "",
    address: "",
    description: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [savedPros, setSavedPros] = useState<
    Array<{ id: string; companyName: string | null; tradeType: string }>
  >([]);
  const [selectedProId, setSelectedProId] = useState<string>("");
  const [destination, setDestination] = useState<"job-board" | "specific">("job-board");

  // Load saved pros on open
  useEffect(() => {
    if (isOpen) {
      void loadSavedPros();
    }
  }, [isOpen]);

  async function loadSavedPros() {
    try {
      const res = await fetch("/api/portal/save-pro");
      if (res.ok) {
        const data = await res.json();
        setSavedPros(data.savedPros || []);
      }
    } catch (error) {
      logger.error("Failed to load saved pros:", error);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.address || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (destination === "specific" && !selectedProId) {
      toast.error("Please select a contractor for your request");
      return;
    }

    setLoading(true);

    try {
      // Create work request
      const requestData = {
        type: formData.type,
        jobCategory: formData.jobCategory || "bidding_opportunity",
        address: formData.address,
        description: formData.description,
        photoCount: photos.length,
        destination,
        proId: destination === "specific" ? selectedProId : null,
      };

      const res = await fetch("/api/portal/work-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!res.ok) {
        throw new Error("Failed to submit work request");
      }

      const data = await res.json();

      // Upload photos if any
      if (photos.length > 0 && data.requestId) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append("photos", photo);
        });
        formData.append("requestId", data.requestId);

        await fetch("/api/portal/work-requests/upload", {
          method: "POST",
          body: formData,
        });
      }

      toast.success("Work request submitted successfully!");
      onClose();

      // Reset form
      setFormData({ type: "", jobCategory: "", address: "", description: "" });
      setPhotos([]);
    } catch (error) {
      logger.error("Failed to submit work request:", error);
      toast.error("Failed to submit work request");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Submit Work Request
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close modal"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request Destination */}
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <Label className="text-sm font-medium">Send Request To</Label>
            <div className="mt-2 flex gap-3">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${destination === "job-board" ? "border-primary bg-primary/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}
              >
                <input
                  type="radio"
                  name="destination"
                  value="job-board"
                  checked={destination === "job-board"}
                  onChange={() => setDestination("job-board")}
                  className="sr-only"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  Job Board (All Pros)
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${destination === "specific" ? "border-primary bg-primary/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}
              >
                <input
                  type="radio"
                  name="destination"
                  value="specific"
                  checked={destination === "specific"}
                  onChange={() => setDestination("specific")}
                  className="sr-only"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Specific Pro</span>
              </label>
            </div>

            {destination === "specific" && (
              <div className="mt-3">
                <Select value={selectedProId} onValueChange={setSelectedProId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pro from your saved list" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedPros.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No saved pros yet
                      </SelectItem>
                    ) : (
                      savedPros.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>
                          {pro.companyName || "Unnamed Pro"} — {pro.tradeType}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Request Type */}
          <div>
            <Label htmlFor="type">Request Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Category — New Social Categories */}
          {destination === "job-board" && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <Label className="text-sm font-medium">What kind of job is this?</Label>
              <p className="mb-3 text-xs text-slate-500">
                This helps pros find the right opportunities
              </p>
              <div className="space-y-2">
                {JOB_CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      formData.jobCategory === cat.value
                        ? "border-blue-400 bg-blue-100/80 dark:border-blue-600 dark:bg-blue-900/40"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="jobCategory"
                      value={cat.value}
                      checked={formData.jobCategory === cat.value}
                      onChange={(e) => setFormData({ ...formData, jobCategory: e.target.value })}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {cat.label}
                    </span>
                    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                      {cat.hint}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Address */}
          <div>
            <Label htmlFor="address">Property Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State ZIP"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue or work needed..."
              rows={4}
              required
            />
          </div>

          {/* Photos Upload */}
          <div>
            <Label htmlFor="photos">Photos (optional)</Label>
            <div className="mt-2">
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
              />
              <label
                htmlFor="photos"
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Click to upload photos
                  </p>
                </div>
              </label>
            </div>

            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      title="Remove photo"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

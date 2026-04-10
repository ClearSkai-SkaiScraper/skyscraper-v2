"use client";

import { Briefcase, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import PhotoUploader from "@/components/portal/PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface WorkRequestFormProps {
  clientId?: string;
  connectedContractors: Array<{ id: string; name: string; email: string }>;
  clientEmail?: string;
  savedPros?: Array<{ id: string; companyName: string | null; tradeType: string }>;
}

// PHASE 3: Loss types matching claims system
const LOSS_TYPES = [
  { value: "hail", label: "Hail Damage" },
  { value: "wind", label: "Wind Damage" },
  { value: "leak", label: "Active Leak" },
  { value: "flat_roof", label: "Flat Roof Issues" },
  { value: "storm", label: "Storm Damage" },
  { value: "water_damage", label: "Water Damage (Interior)" },
  { value: "general", label: "General Repair / Quote" },
  { value: "other", label: "Other (describe below)" },
];

// PHASE 3: Urgency levels
const URGENCY_LEVELS = [
  { value: "emergency", label: "Emergency - Active leak or safety issue", color: "text-red-600" },
  { value: "urgent", label: "Urgent - Within 48 hours", color: "text-orange-600" },
  { value: "normal", label: "Within 7 days", color: "text-blue-600" },
  { value: "quote", label: "Just need a quote", color: "text-green-600" },
];

export default function WorkRequestForm({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clientId,
  connectedContractors,
  clientEmail,
  savedPros = [],
}: WorkRequestFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if a specific pro was passed in the URL
  const preselectedProId = searchParams?.get("proId") || "";

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [myPros, setMyPros] =
    useState<Array<{ id: string; companyName: string | null; tradeType: string }>>(savedPros);

  // Request destination: specific pro or job board
  const [requestDestination, setRequestDestination] = useState<"specific" | "job-board">(
    preselectedProId ? "specific" : "job-board"
  );
  const [selectedProId, setSelectedProId] = useState(preselectedProId);

  // Load saved pros on mount (for dropdown)
  useEffect(() => {
    async function loadMyPros() {
      try {
        const res = await fetch("/api/portal/save-pro");
        if (res.ok) {
          const data = await res.json();
          setMyPros(data.savedPros || []);
          // If preselected pro is set and we have pros, verify it exists
          if (preselectedProId && data.savedPros?.length) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const found = data.savedPros.find((p: any) => p.id === preselectedProId);
            if (found) {
              setSelectedProId(preselectedProId);
              setRequestDestination("specific");
            }
          }
        }
      } catch (err) {
        logger.error("Failed to load my pros:", err);
      }
    }
    void loadMyPros();
  }, [preselectedProId]);

  const [formData, setFormData] = useState({
    // Contact info (prefilled from client)
    contactName: "",
    phone: "",
    email: clientEmail || "",

    // Property info
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyZip: "",

    // Loss details
    lossType: "leak",
    dateOfLoss: new Date().toISOString().split("T")[0], // Today's date
    urgency: "normal",
    description: "",

    // Pro selection
    targetProId: preselectedProId || "",
    postToJobBoard: !preselectedProId, // Default to job board if no pro preselected

    // Photos (stub for now)
    photoUrls: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!consent) {
      setError("Please confirm that the information is accurate.");
      return;
    }

    if (!formData.description.trim()) {
      setError("Please provide a description of the issue.");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      // Enhanced work request that can create both job posts and direct submissions
      // Use the working /api/portal/work-requests endpoint that persists to DB
      const fullAddress = [
        formData.propertyAddress,
        formData.propertyCity,
        formData.propertyState,
        formData.propertyZip,
      ]
        .filter(Boolean)
        .join(", ");

      const res = await fetch("/api/portal/work-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${LOSS_TYPES.find((t) => t.value === formData.lossType)?.label || "Work Request"} - ${formData.propertyCity || "Property"}`,
          type: formData.lossType,
          category: formData.lossType,
          jobCategory: requestDestination === "job-board" ? formData.lossType : undefined,
          description: formData.description,
          urgency: formData.urgency,
          address: fullAddress,
          photos: formData.photoUrls,
          targetProId: requestDestination === "specific" ? selectedProId : null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          router.push("/portal/my-jobs");
        }, 3000);
      } else {
        setError(data.error || "Failed to submit work request. Please try again.");
      }
    } catch (err) {
      logger.error("Failed to submit work request:", err);
      setError("An unexpected error occurred. Please try again or contact support.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border-2 border-green-500 bg-green-50 p-8 text-center dark:border-green-700 dark:bg-green-900/20">
        <div className="mb-4 text-6xl">✅</div>
        <h3 className="mb-2 text-2xl font-bold text-green-900 dark:text-green-200">
          Request Submitted!
        </h3>
        <p className="mb-4 text-green-800 dark:text-green-300">
          We&apos;ve received your work request and will review your details shortly.
        </p>
        <p className="mb-6 text-sm text-green-700 dark:text-green-400">
          We&apos;ll contact you at{" "}
          <span className="font-semibold">{formData.phone || formData.email}</span> within the next
          business day.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/portal/my-jobs">
            <Button variant="default" size="lg">
              Back to My Jobs
            </Button>
          </Link>
          <Button onClick={() => setSuccess(false)} variant="outline" size="lg">
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
          <p className="font-medium text-red-800 dark:text-red-300">❌ {error}</p>
        </div>
      )}

      {/* SECTION: Request Destination */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          🎯 Who Should Receive This Request?
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Option 1: Post to Job Board */}
          <label
            className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all ${
              requestDestination === "job-board"
                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                : "border-border hover:border-blue-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="destination"
                value="job-board"
                checked={requestDestination === "job-board"}
                onChange={() => setRequestDestination("job-board")}
                className="h-4 w-4 accent-blue-500"
              />
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Post to Job Board</span>
              </div>
            </div>
            <p className="pl-7 text-sm text-muted-foreground">
              Share your request with all verified contractors in your area. Get multiple quotes and
              choose the best fit.
            </p>
          </label>

          {/* Option 2: Send to Specific Pro */}
          <label
            className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all ${
              requestDestination === "specific"
                ? "border-pink-500 bg-pink-50 dark:border-pink-400 dark:bg-pink-900/20"
                : "border-border hover:border-pink-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="destination"
                value="specific"
                checked={requestDestination === "specific"}
                onChange={() => setRequestDestination("specific")}
                className="h-4 w-4 accent-pink-500"
              />
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                <span className="font-medium">Send to My Pro</span>
              </div>
            </div>
            <p className="pl-7 text-sm text-muted-foreground">
              Send directly to a contractor from your saved pros. Perfect for follow-up work or
              trusted relationships.
            </p>
          </label>
        </div>

        {/* Pro Selector (shows when "specific" is selected) */}
        {requestDestination === "specific" && (
          <div className="mt-4">
            {myPros.length > 0 || connectedContractors.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="selectedPro" className="text-sm font-medium">
                  Select Contractor
                </Label>
                <select
                  id="selectedPro"
                  value={selectedProId}
                  onChange={(e) => setSelectedProId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required={requestDestination === "specific"}
                  title="Select a contractor"
                  aria-label="Select a contractor"
                >
                  <option value="">Select a contractor...</option>
                  {myPros.length > 0 && (
                    <optgroup label="My Saved Pros">
                      {myPros.map((pro) => (
                        <option key={pro.id} value={pro.id}>
                          {pro.companyName || "Unnamed"} — {pro.tradeType}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {connectedContractors.length > 0 && (
                    <optgroup label="Connected Contractors">
                      {connectedContractors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-pink-300 bg-pink-50 p-4 text-center dark:border-pink-800 dark:bg-pink-900/20">
                <p className="text-sm text-pink-800 dark:text-pink-300">
                  No saved pros yet!{" "}
                  <Link
                    href="/portal/find-a-pro"
                    className="font-medium underline hover:text-pink-600"
                  >
                    Find and save some pros
                  </Link>{" "}
                  to send them requests directly.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION A: Property & Contact */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">📍 Property & Contact</h2>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="contactName" className="text-sm font-medium text-foreground">
                Your Name
              </Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="John Doe"
                className="mt-1 text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-1 text-foreground"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              className="mt-1 text-foreground"
              readOnly={!!clientEmail}
            />
            {clientEmail && (
              <p className="mt-1 text-xs text-muted-foreground">
                This email is linked to your portal account
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="propertyAddress" className="text-sm font-medium text-foreground">
              Property Address
            </Label>
            <Input
              id="propertyAddress"
              value={formData.propertyAddress}
              onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
              placeholder="123 Main Street"
              className="mt-1 text-foreground"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="propertyCity" className="text-sm font-medium text-foreground">
                City
              </Label>
              <Input
                id="propertyCity"
                value={formData.propertyCity}
                onChange={(e) => setFormData({ ...formData, propertyCity: e.target.value })}
                placeholder="Phoenix"
                className="mt-1 text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="propertyState" className="text-sm font-medium text-foreground">
                State
              </Label>
              <Input
                id="propertyState"
                value={formData.propertyState}
                onChange={(e) => setFormData({ ...formData, propertyState: e.target.value })}
                placeholder="AZ"
                maxLength={2}
                className="mt-1 text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="propertyZip" className="text-sm font-medium text-foreground">
                ZIP Code
              </Label>
              <Input
                id="propertyZip"
                value={formData.propertyZip}
                onChange={(e) => setFormData({ ...formData, propertyZip: e.target.value })}
                placeholder="85001"
                maxLength={5}
                className="mt-1 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Loss Details */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">🛠️ Loss Details</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="lossType" className="text-sm font-medium text-foreground">
              Type of Loss *
            </Label>
            <select
              id="lossType"
              value={formData.lossType}
              onChange={(e) => setFormData({ ...formData, lossType: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              title="Type of Loss"
              aria-label="Type of Loss"
            >
              {LOSS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="dateOfLoss" className="text-sm font-medium text-foreground">
              Date of Loss (or when you first noticed)
            </Label>
            <Input
              id="dateOfLoss"
              type="date"
              value={formData.dateOfLoss}
              onChange={(e) => setFormData({ ...formData, dateOfLoss: e.target.value })}
              className="mt-1 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="urgency" className="text-sm font-medium text-foreground">
              Urgency Level *
            </Label>
            <select
              id="urgency"
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              title="Urgency Level"
              aria-label="Urgency Level"
            >
              {URGENCY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              maxLength={1000}
              placeholder="Please describe the issue in detail:
• Where is the damage located?
• What do you see (water stains, missing shingles, cracks, etc.)?
• When did you first notice the problem?
• Any recent weather events (hail, wind storms, heavy rain)?"
              className="mt-1 text-foreground placeholder:text-muted-foreground"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formData.description.length} / 1000 characters
            </p>
          </div>
        </div>
      </div>

      {/* SECTION C: Photos */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">📷 Photos (Optional)</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Upload photos of the damage or area that needs work. This helps contractors provide more
          accurate quotes.
        </p>
        <PhotoUploader
          onPhotosChange={(urls) => setFormData({ ...formData, photoUrls: urls })}
          maxPhotos={10}
          initialPhotos={formData.photoUrls}
        />
      </div>

      {/* SECTION D: Consent */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-input"
            title="Consent checkbox"
            required
          />
          <Label htmlFor="consent" className="text-sm text-foreground">
            I confirm that the information provided is accurate and I agree to be contacted about
            this request by phone or email.
          </Label>
        </div>
      </div>

      {/* Submit Actions */}
      <div className="flex justify-end gap-3">
        <Link href="/portal/my-jobs">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={loading || !consent}>
          {loading ? "Submitting..." : "Submit Work Request"}
        </Button>
      </div>
    </form>
  );
}

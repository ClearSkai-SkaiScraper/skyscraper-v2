"use client";

import {
  AlertTriangle,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircle2,
  CheckIcon,
  Droplets,
  Flame,
  HardHat,
  HomeIcon,
  Info,
  Loader2,
  MapPin,
  ShieldAlert,
  UploadIcon,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// ─── CLAIM TYPE CATEGORIES ─────────────────────────────────────────
const CLAIM_CATEGORIES = [
  {
    id: "roofing",
    label: "Roofing",
    icon: HardHat,
    color: "from-orange-500 to-amber-600",
    border: "border-orange-400/40",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    description: "Hail, wind, aging, or storm damage to your roof",
    subtypes: [
      { value: "hail", label: "Hail Damage" },
      { value: "wind", label: "Wind Damage" },
      { value: "storm", label: "Storm Damage (General)" },
      { value: "roof-leak", label: "Roof Leak" },
      { value: "roof-aging", label: "Aging / Wear" },
      { value: "missing-shingles", label: "Missing Shingles / Tiles" },
    ],
  },
  {
    id: "water",
    label: "Water Damage",
    icon: Droplets,
    color: "from-blue-500 to-cyan-600",
    border: "border-blue-400/40",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    description: "Flooding, burst pipes, plumbing leaks, appliance overflow",
    subtypes: [
      { value: "flooding", label: "Flooding" },
      { value: "burst-pipe", label: "Burst / Frozen Pipes" },
      { value: "plumbing-leak", label: "Plumbing Leak" },
      { value: "appliance-overflow", label: "Appliance Overflow" },
      { value: "sewer-backup", label: "Sewer / Drain Backup" },
      { value: "water-intrusion", label: "Water Intrusion (Unknown)" },
    ],
  },
  {
    id: "fire",
    label: "Fire / Smoke",
    icon: Flame,
    color: "from-red-500 to-rose-600",
    border: "border-red-400/40",
    bg: "bg-red-50 dark:bg-red-950/20",
    description: "Fire damage, smoke damage, electrical fires",
    subtypes: [
      { value: "house-fire", label: "Structure Fire" },
      { value: "kitchen-fire", label: "Kitchen Fire" },
      { value: "electrical-fire", label: "Electrical Fire" },
      { value: "smoke-only", label: "Smoke Damage Only" },
      { value: "wildfire", label: "Wildfire / Brush Fire" },
      { value: "lightning-strike", label: "Lightning Strike" },
    ],
  },
  {
    id: "wind-storm",
    label: "Wind / Storm",
    icon: Wind,
    color: "from-teal-500 to-emerald-600",
    border: "border-teal-400/40",
    bg: "bg-teal-50 dark:bg-teal-950/20",
    description: "Tornado, hurricane, monsoon, straight-line wind damage",
    subtypes: [
      { value: "tornado", label: "Tornado" },
      { value: "hurricane", label: "Hurricane / Tropical Storm" },
      { value: "monsoon", label: "Monsoon" },
      { value: "straight-line-wind", label: "Straight-Line Winds" },
      { value: "tree-fall", label: "Fallen Tree / Debris" },
      { value: "fence-damage", label: "Fence / Structure Damage" },
    ],
  },
  {
    id: "biohazard",
    label: "Biohazard / Mold",
    icon: AlertTriangle,
    color: "from-yellow-500 to-lime-600",
    border: "border-yellow-400/40",
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    description: "Mold remediation, sewage, hazardous materials",
    subtypes: [
      { value: "mold", label: "Mold / Mildew" },
      { value: "sewage", label: "Sewage Contamination" },
      { value: "asbestos", label: "Asbestos Exposure" },
      { value: "lead", label: "Lead Paint" },
      { value: "chemical-spill", label: "Chemical Spill" },
      { value: "biohazard-other", label: "Other Biohazard" },
    ],
  },
  {
    id: "theft-vandalism",
    label: "Theft / Vandalism",
    icon: ShieldAlert,
    color: "from-purple-500 to-violet-600",
    border: "border-purple-400/40",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    description: "Break-in, property theft, graffiti, intentional damage",
    subtypes: [
      { value: "burglary", label: "Burglary / Break-in" },
      { value: "vandalism", label: "Vandalism / Graffiti" },
      { value: "vehicle-damage", label: "Vehicle Into Structure" },
      { value: "theft", label: "Property Theft" },
    ],
  },
  {
    id: "other",
    label: "Other / General",
    icon: Wrench,
    color: "from-slate-500 to-gray-600",
    border: "border-slate-400/40",
    bg: "bg-slate-50 dark:bg-slate-950/20",
    description: "Electrical, foundation, HVAC, or uncategorized damage",
    subtypes: [
      { value: "electrical", label: "Electrical Damage" },
      { value: "foundation", label: "Foundation / Structural" },
      { value: "hvac", label: "HVAC System Damage" },
      { value: "siding", label: "Siding Damage" },
      { value: "other", label: "Other / Not Listed" },
    ],
  },
] as const;

type ClaimCategoryId = (typeof CLAIM_CATEGORIES)[number]["id"];

const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family Home" },
  { value: "townhouse", label: "Townhouse" },
  { value: "condo", label: "Condo / Apartment" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "mobile_home", label: "Mobile / Manufactured Home" },
  { value: "commercial", label: "Commercial" },
];

const STEPS = [
  { id: 1, name: "Claim Type", icon: Zap },
  { id: 2, name: "Property", icon: HomeIcon },
  { id: 3, name: "Details", icon: CalendarIcon },
  { id: 4, name: "Photos", icon: UploadIcon },
  { id: 5, name: "Review", icon: CheckIcon },
];

// ─── ZIP-BASED PRICING INTELLIGENCE ────────────────────────────────
interface ZipInsight {
  region: string;
  costRange: string;
  notes: string[];
  avgResponseTime: string;
  tradeMatch: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getZipInsight(zip: string, category: ClaimCategoryId, subtype: string): ZipInsight | null {
  if (!zip || zip.length < 5) return null;

  const prefix = zip.slice(0, 3);

  // Regional cost multipliers (based on real construction cost indices)
  const regionMap: Record<string, { region: string; multiplier: number }> = {
    "850": { region: "Phoenix Metro, AZ", multiplier: 0.95 },
    "851": { region: "Phoenix Metro, AZ", multiplier: 0.95 },
    "852": { region: "Mesa / Tempe, AZ", multiplier: 0.93 },
    "853": { region: "Chandler / Gilbert, AZ", multiplier: 0.94 },
    "855": { region: "Globe / Eastern AZ", multiplier: 0.88 },
    "856": { region: "Tucson, AZ", multiplier: 0.89 },
    "857": { region: "Tucson, AZ", multiplier: 0.89 },
    "859": { region: "Show Low / White Mountains, AZ", multiplier: 0.85 },
    "860": { region: "Flagstaff / Northern AZ", multiplier: 0.92 },
    "863": { region: "Prescott, AZ", multiplier: 0.9 },
    "864": { region: "Kingman, AZ", multiplier: 0.86 },
    "865": { region: "Gallup / NE AZ", multiplier: 0.84 },
    "900": { region: "Los Angeles, CA", multiplier: 1.25 },
    "902": { region: "Inglewood / LA, CA", multiplier: 1.22 },
    "910": { region: "Pasadena, CA", multiplier: 1.2 },
    "920": { region: "San Diego, CA", multiplier: 1.15 },
    "941": { region: "San Francisco, CA", multiplier: 1.4 },
    "950": { region: "San Jose, CA", multiplier: 1.35 },
    "750": { region: "Dallas, TX", multiplier: 0.92 },
    "770": { region: "Houston, TX", multiplier: 0.93 },
    "782": { region: "San Antonio, TX", multiplier: 0.88 },
    "787": { region: "Austin, TX", multiplier: 0.97 },
    "330": { region: "Miami, FL", multiplier: 1.08 },
    "327": { region: "Orlando, FL", multiplier: 0.95 },
    "336": { region: "Tampa, FL", multiplier: 0.96 },
    "324": { region: "Jacksonville, FL", multiplier: 0.92 },
    "100": { region: "New York, NY", multiplier: 1.45 },
    "021": { region: "Boston, MA", multiplier: 1.3 },
    "191": { region: "Philadelphia, PA", multiplier: 1.1 },
    "606": { region: "Chicago, IL", multiplier: 1.12 },
    "481": { region: "Detroit, MI", multiplier: 0.98 },
    "432": { region: "Columbus, OH", multiplier: 0.92 },
    "981": { region: "Seattle, WA", multiplier: 1.18 },
    "972": { region: "Portland, OR", multiplier: 1.1 },
    "802": { region: "Denver, CO", multiplier: 1.02 },
    "841": { region: "Salt Lake City, UT", multiplier: 0.95 },
    "891": { region: "Las Vegas, NV", multiplier: 1.0 },
  };

  const regionInfo = regionMap[prefix] || { region: "Your Area", multiplier: 1.0 };

  const baseCosts: Record<string, { low: number; high: number; trade: string }> = {
    roofing: { low: 5000, high: 25000, trade: "Roofing" },
    water: { low: 2500, high: 15000, trade: "Water Restoration" },
    fire: { low: 10000, high: 75000, trade: "Fire Restoration" },
    "wind-storm": { low: 3000, high: 30000, trade: "General Contracting" },
    biohazard: { low: 5000, high: 35000, trade: "Hazmat / Remediation" },
    "theft-vandalism": { low: 1000, high: 10000, trade: "General Contracting" },
    other: { low: 2000, high: 20000, trade: "General Contracting" },
  };

  const base = baseCosts[category] || baseCosts.other;
  const low = Math.round((base.low * regionInfo.multiplier) / 100) * 100;
  const high = Math.round((base.high * regionInfo.multiplier) / 100) * 100;

  const categoryNotes: Record<string, string[]> = {
    roofing: [
      "Insurance typically covers sudden storm damage, not gradual wear",
      "Get at least 3 estimates before filing a claim",
      "Document all damage with photos before any temporary repairs",
    ],
    water: [
      "Stop the source of water immediately if possible",
      "Water damage worsens rapidly — mitigation within 24-48 hours is critical",
      "Check if your policy covers the specific cause (sudden vs. gradual)",
    ],
    fire: [
      "Do NOT enter the structure until cleared by the fire department",
      "Contact your insurance carrier within 24 hours",
      "Document everything with photos and video before cleanup begins",
      "Keep all receipts for temporary living expenses (ALE coverage)",
    ],
    "wind-storm": [
      "Cover exposed areas with tarps to prevent secondary damage",
      "Check for hidden damage to soffits, fascia, and gutters",
      "Wind damage claims often include multiple structures and landscaping",
    ],
    biohazard: [
      "Professional remediation is almost always required — do NOT DIY",
      "Mold remediation typically requires containment and air filtration",
      "Some policies exclude mold — check your coverage first",
    ],
    "theft-vandalism": [
      "File a police report immediately — required for most claims",
      "Create a detailed inventory of stolen or damaged items",
      "Check if your policy includes replacement cost vs. actual cash value",
    ],
    other: [
      "Document the current condition with photos and video",
      "Keep all receipts for emergency repairs",
    ],
  };

  return {
    region: regionInfo.region,
    costRange: `$${low.toLocaleString()} – $${high.toLocaleString()}`,
    notes: categoryNotes[category] || categoryNotes.other,
    avgResponseTime: regionInfo.multiplier > 1.1 ? "1–3 business days" : "Same day – 2 days",
    tradeMatch: base.trade,
  };
}

// ─── FORM DATA ─────────────────────────────────────────────────────
interface ClaimFormData {
  claimCategory: string;
  claimSubtype: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyType: string;
  lossDate: string;
  lossDescription: string;
  severity: string;
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
}

export default function NewClaimWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [zipInsight, setZipInsight] = useState<ZipInsight | null>(null);

  const [formData, setFormData] = useState<ClaimFormData>({
    claimCategory: "",
    claimSubtype: "",
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyZip: "",
    propertyType: "",
    lossDate: "",
    lossDescription: "",
    severity: "",
    homeownerName: "",
    homeownerEmail: "",
    homeownerPhone: "",
  });

  const updateField = (field: keyof ClaimFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate zip insight whenever zip or category changes
  const refreshInsight = useCallback(() => {
    if (formData.propertyZip.length >= 5 && formData.claimCategory) {
      const insight = getZipInsight(
        formData.propertyZip,
        formData.claimCategory as ClaimCategoryId,
        formData.claimSubtype
      );
      setZipInsight(insight);
    } else {
      setZipInsight(null);
    }
  }, [formData.propertyZip, formData.claimCategory, formData.claimSubtype]);

  useEffect(() => {
    refreshInsight();
  }, [refreshInsight]);

  const selectedCategory = CLAIM_CATEGORIES.find((c) => c.id === formData.claimCategory);

  const handleNext = () => {
    if (currentStep === 1 && !formData.claimCategory) {
      toast.error("Please select a claim type");
      return;
    }
    if (currentStep === 2 && (!formData.propertyAddress || !formData.propertyZip)) {
      toast.error("Please fill in the property address and ZIP code");
      return;
    }
    if (currentStep === 3 && !formData.lossDate) {
      toast.error("Please enter the date of loss");
      return;
    }
    if (currentStep < 5) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const catLabel = selectedCategory?.label || "General";
      const subtypeLabel =
        selectedCategory?.subtypes.find((s) => s.value === formData.claimSubtype)?.label || "";
      const title = subtypeLabel ? `${catLabel} — ${subtypeLabel}` : `${catLabel} Claim`;

      const payload = {
        title,
        propertyAddress: [
          formData.propertyAddress,
          formData.propertyCity,
          formData.propertyState,
          formData.propertyZip,
        ]
          .filter(Boolean)
          .join(", "),
        lossType: formData.claimCategory,
        dateOfLoss: formData.lossDate,
        description: formData.lossDescription,
        homeownerName: formData.homeownerName,
        homeownerEmail: formData.homeownerEmail,
        homeownerPhone: formData.homeownerPhone,
      };

      const response = await fetch("/api/portal/claims/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setError(err.error || "Failed to create claim. Please try again.");
        return;
      }

      const data = await response.json();
      const claimId = data.claim?.id;

      if (!claimId) {
        setError("Claim was created but ID was not returned.");
        return;
      }

      if (uploadedFiles.length > 0) {
        const fd = new FormData();
        fd.append("claimId", claimId);
        uploadedFiles.forEach((file) => fd.append("files", file));
        try {
          await fetch("/api/portal/claims/upload", {
            method: "POST",
            body: fd,
          });
        } catch (uploadErr) {
          logger.warn("Photo upload failed (non-critical):", uploadErr);
        }
      }

      toast.success("Claim created successfully!");
      router.push(`/portal/claims/${claimId}`);
    } catch (err) {
      logger.error("Error creating claim:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card className="overflow-hidden border-slate-200 shadow-xl dark:border-slate-700">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
          <CardTitle className="text-xl">File a New Claim</CardTitle>
          <CardDescription className="text-blue-200">
            Tell us what happened and we&apos;ll connect you with the right help
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    step.id <= currentStep ? "text-blue-600" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      step.id < currentStep
                        ? "border-blue-600 bg-blue-600 text-white"
                        : step.id === currentStep
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-muted bg-muted/30"
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="mt-2 text-xs font-medium">{step.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* STEP 1: Claim Type */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">What type of damage?</h3>
                <p className="text-sm text-muted-foreground">
                  Select the category that best describes your situation
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CLAIM_CATEGORIES.map((cat) => {
                  const isSelected = formData.claimCategory === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        updateField("claimCategory", cat.id);
                        updateField("claimSubtype", "");
                      }}
                      className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                        isSelected
                          ? `${cat.border} ${cat.bg} ring-2 ring-blue-500/30`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-sm`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold">{cat.label}</span>
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {cat.description}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedCategory && (
                <div className="mt-4">
                  <Label className="mb-2 block text-sm font-medium">
                    What specifically happened?
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCategory.subtypes.map((sub) => {
                      const isSelected = formData.claimSubtype === sub.value;
                      return (
                        <button
                          key={sub.value}
                          type="button"
                          onClick={() => updateField("claimSubtype", sub.value)}
                          className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />}
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Property Info */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Property Information</h3>
                <p className="text-sm text-muted-foreground">
                  Where is the damaged property located?
                </p>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.propertyAddress}
                    onChange={(e) => updateField("propertyAddress", e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.propertyCity}
                      onChange={(e) => updateField("propertyCity", e.target.value)}
                      placeholder="Phoenix"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.propertyState}
                      onChange={(e) => updateField("propertyState", e.target.value.toUpperCase())}
                      placeholder="AZ"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={formData.propertyZip}
                      onChange={(e) =>
                        updateField("propertyZip", e.target.value.replace(/\D/g, "").slice(0, 5))
                      }
                      placeholder="85001"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyType">Property Type</Label>
                    <Select
                      value={formData.propertyType}
                      onValueChange={(v) => updateField("propertyType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ZIP Insight Card */}
              {zipInsight && (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-4 shadow-sm dark:border-blue-800 dark:from-blue-950/30 dark:to-sky-950/20">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        Local Insights — {zipInsight.region}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Based on {selectedCategory?.label} claims in your area
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-white/60 p-3 dark:bg-slate-800/40">
                      <p className="text-xs text-muted-foreground">Typical Cost Range</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {zipInsight.costRange}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/60 p-3 dark:bg-slate-800/40">
                      <p className="text-xs text-muted-foreground">Avg. Pro Response</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {zipInsight.avgResponseTime}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-white/60 p-3 dark:bg-slate-800/40">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Recommended Trade: {zipInsight.tradeMatch}
                    </p>
                    <ul className="space-y-1">
                      {zipInsight.notes.map((note, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-blue-800 dark:text-blue-300"
                        >
                          <Info className="mt-0.5 h-3 w-3 shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Details */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Loss Details</h3>
                <p className="text-sm text-muted-foreground">
                  When did this happen and how bad is the damage?
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lossDate">Date of Loss</Label>
                    <Input
                      id="lossDate"
                      type="date"
                      value={formData.lossDate}
                      onChange={(e) => updateField("lossDate", e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(v) => updateField("severity", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How bad?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor — Cosmetic / small area</SelectItem>
                        <SelectItem value="moderate">Moderate — Functional impact</SelectItem>
                        <SelectItem value="severe">Severe — Major structural damage</SelectItem>
                        <SelectItem value="catastrophic">Catastrophic — Uninhabitable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="lossDescription">Describe what happened</Label>
                  <Textarea
                    id="lossDescription"
                    value={formData.lossDescription}
                    onChange={(e) => updateField("lossDescription", e.target.value)}
                    placeholder={getDescriptionPlaceholder(formData.claimCategory)}
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="homeownerName">Your Name</Label>
                  <Input
                    id="homeownerName"
                    value={formData.homeownerName}
                    onChange={(e) => updateField("homeownerName", e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeownerEmail">Email</Label>
                    <Input
                      id="homeownerEmail"
                      type="email"
                      value={formData.homeownerEmail}
                      onChange={(e) => updateField("homeownerEmail", e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="homeownerPhone">Phone</Label>
                    <Input
                      id="homeownerPhone"
                      type="tel"
                      value={formData.homeownerPhone}
                      onChange={(e) => updateField("homeownerPhone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {formData.severity === "catastrophic" && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Emergency Guidance
                    </p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                      If anyone is in danger, call 911 first. Contact your insurance carrier
                      immediately. Keep all receipts for temporary housing and emergency supplies —
                      these are typically covered under Additional Living Expenses (ALE).
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Upload */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Upload Photos</h3>
                <p className="text-sm text-muted-foreground">
                  Photos help us assess the damage and connect you with the right pro faster
                </p>
              </div>

              <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20">
                <UploadIcon className="mx-auto h-12 w-12 text-blue-400" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Drag and drop photos here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, HEIC — up to 25 MB each
                </p>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  className="mt-4"
                  onChange={handleFileUpload}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div>
                  <Label className="mb-2 block">Uploaded ({uploadedFiles.length})</Label>
                  <div className="space-y-1.5">
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-amber-50 p-3 dark:bg-amber-950/20">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Photo tips:</strong> Include wide shots of the whole area, close-ups of
                  specific damage, photos of any labels/model numbers, and photos showing the extent
                  of the affected area.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Review & Submit</h3>
                <p className="text-sm text-muted-foreground">
                  Make sure everything looks correct before submitting
                </p>
              </div>

              <div className="space-y-3">
                <ReviewSection
                  label="Claim Type"
                  icon={selectedCategory?.icon || Wrench}
                  onEdit={() => setCurrentStep(1)}
                >
                  <p className="font-medium">{selectedCategory?.label || "—"}</p>
                  {formData.claimSubtype && (
                    <p className="text-sm text-muted-foreground">
                      {selectedCategory?.subtypes.find((s) => s.value === formData.claimSubtype)
                        ?.label || formData.claimSubtype}
                    </p>
                  )}
                </ReviewSection>

                <ReviewSection label="Property" icon={HomeIcon} onEdit={() => setCurrentStep(2)}>
                  <p className="font-medium">{formData.propertyAddress || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {[formData.propertyCity, formData.propertyState, formData.propertyZip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {formData.propertyType && (
                    <p className="text-xs text-muted-foreground">
                      {PROPERTY_TYPES.find((t) => t.value === formData.propertyType)?.label}
                    </p>
                  )}
                </ReviewSection>

                <ReviewSection
                  label="Loss Details"
                  icon={CalendarIcon}
                  onEdit={() => setCurrentStep(3)}
                >
                  <p className="font-medium">
                    {formData.lossDate
                      ? new Date(formData.lossDate + "T00:00:00").toLocaleDateString()
                      : "—"}
                    {formData.severity && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Severity: {formData.severity}
                      </span>
                    )}
                  </p>
                  {formData.lossDescription && (
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {formData.lossDescription}
                    </p>
                  )}
                </ReviewSection>

                <ReviewSection label="Contact" icon={MapPin} onEdit={() => setCurrentStep(3)}>
                  <p className="font-medium">{formData.homeownerName || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {[formData.homeownerEmail, formData.homeownerPhone].filter(Boolean).join(" • ")}
                  </p>
                </ReviewSection>

                <ReviewSection label="Photos" icon={UploadIcon} onEdit={() => setCurrentStep(4)}>
                  <p className="font-medium">
                    {uploadedFiles.length > 0
                      ? `${uploadedFiles.length} photo${uploadedFiles.length > 1 ? "s" : ""} attached`
                      : "No photos (you can add them later)"}
                  </p>
                </ReviewSection>
              </div>

              {zipInsight && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    📍 {zipInsight.region} • Estimated range: {zipInsight.costRange} • Recommended
                    trade: {zipInsight.tradeMatch}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Button>
            {currentStep < 5 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Claim…
                  </>
                ) : (
                  "Submit Claim"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function ReviewSection({
  label,
  icon: Icon,
  children,
  onEdit,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-white p-4 dark:bg-slate-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {children}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        Edit
      </button>
    </div>
  );
}

function getDescriptionPlaceholder(category: string): string {
  switch (category) {
    case "roofing":
      return "Example: During last week's hailstorm, multiple shingles were damaged. I noticed granule loss in the gutters and several impact marks on the ridge cap…";
    case "water":
      return "Example: I noticed water stains on the ceiling in the master bedroom. The stain has been growing over the past week. There's a bathroom directly above…";
    case "fire":
      return "Example: A kitchen fire started from a grease pan. The fire department responded and extinguished it. The kitchen has significant smoke and heat damage…";
    case "wind-storm":
      return "Example: A large tree fell onto the roof during the monsoon. The fence on the south side is also down. I can see daylight through the attic…";
    case "biohazard":
      return "Example: I discovered black mold in the bathroom behind the shower tile. The area is about 4 square feet and there's a musty smell throughout…";
    case "theft-vandalism":
      return "Example: Someone broke through the back door overnight. Several electronics are missing. The door frame is damaged and a window was smashed…";
    default:
      return "Describe what happened, when you first noticed the damage, and any steps you've already taken…";
  }
}

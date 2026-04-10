"use client";
import { ArrowRight, Building2, Calendar, DollarSign, FileText, Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
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

type ServiceType = "roofing" | "siding" | "gutters" | "windows" | "painting" | "repairs" | "other";
type PricingTier = "good" | "better" | "best";

type ProposalState = {
  // Step 1: Customer Info
  customerName: string;
  propertyAddress: string;
  customerPhone: string;
  customerEmail: string;
  referredBy: string;

  // Step 2: Property Details
  propertyAge: string;
  propertySize: string;
  currentMaterial: string;
  problemDescription: string;

  // Step 3: Services & Materials
  serviceType: ServiceType | null;
  selectedMaterials: string[];
  upgradeOptions: string[];
  warrantyYears: number;

  // Step 4: Pricing
  selectedTier: PricingTier;
  goodPrice: number;
  betterPrice: number;
  bestPrice: number;
  paymentTerms: string;
  financingAvailable: boolean;

  // Step 5: Timeline
  startDate: string;
  projectDuration: string;
  milestones: string[];
};

const INITIAL_STATE: ProposalState = {
  customerName: "",
  propertyAddress: "",
  customerPhone: "",
  customerEmail: "",
  referredBy: "",
  propertyAge: "",
  propertySize: "",
  currentMaterial: "",
  problemDescription: "",
  serviceType: null,
  selectedMaterials: [],
  upgradeOptions: [],
  warrantyYears: 10,
  selectedTier: "better",
  goodPrice: 0,
  betterPrice: 0,
  bestPrice: 0,
  paymentTerms: "Net 30",
  financingAvailable: true,
  startDate: "",
  projectDuration: "",
  milestones: [],
};

export default function RetailProposalBuilderPage() {
  const [state, setState] = useState<ProposalState>(INITIAL_STATE);
  const [step, setStep] = useState(1); // 1-6
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Auto-save to localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(
        "retail-proposal-draft",
        JSON.stringify({ state, step, savedAt: new Date().toISOString() })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, [state, step]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("retail-proposal-draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.state) {
          setState(parsed.state);
          setStep(parsed.step || 1);
        }
      } catch {}
    }
  }, []);

  const nextStep = () => setStep((s) => Math.min(s + 1, 6));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleGenerateProposal = async () => {
    setGeneratingPDF(true);
    try {
      // Use the AI-recommended template, or fall back to first proposal template
      let templateId = selectedTemplateId;

      if (!templateId) {
        const templatesRes = await fetch("/api/templates/list?type=proposal");
        const templates = await templatesRes.json();
        const template = templates[0];
        if (!template) {
          alert(
            "No proposal templates found. Please select a template or add one from the marketplace."
          );
          return;
        }
        templateId = template.id;
      }

      // Generate PDF with merged branding
      const res = await fetch(`/api/templates/${templateId}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalData: state }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Proposal_${state.customerName.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        localStorage.removeItem("retail-proposal-draft");
      } else {
        const error = await res.text();
        alert(`Error: ${error}`);
      }
    } catch (err) {
      logger.error("Generate PDF error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const STEPS = [
    { num: 1, label: "Customer", icon: Building2 },
    { num: 2, label: "Property", icon: Building2 },
    { num: 3, label: "Services", icon: Package },
    { num: 4, label: "Pricing", icon: DollarSign },
    { num: 5, label: "Timeline", icon: Calendar },
    { num: 6, label: "Generate", icon: FileText },
  ];

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="reports"
        title="Retail Proposal Builder"
        subtitle="Create professional proposals for homeowners in minutes"
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <Link href="/reports/history">
            <Button variant="outline" size="sm">
              View History
            </Button>
          </Link>
          <Link href="/reports/templates?type=proposal">
            <Button variant="outline" size="sm">
              <FileText className="mr-1 h-4 w-4" />
              Proposal Templates
            </Button>
          </Link>
        </div>
      </PageHero>

      <PageSectionCard>
        {/* Progress Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2 overflow-x-auto">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setStep(s.num)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                  step > s.num
                    ? "bg-emerald-600 text-white"
                    : step === s.num
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </button>
              <span className="hidden text-sm text-slate-700 dark:text-slate-300 sm:inline">
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:inline" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Customer Info */}
        {step === 1 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Customer Information
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">Homeowner Name *</Label>
                <Input
                  id="customerName"
                  value={state.customerName}
                  onChange={(e) => setState({ ...state, customerName: e.target.value })}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div>
                <Label htmlFor="propertyAddress">Property Address *</Label>
                <Input
                  id="propertyAddress"
                  value={state.propertyAddress}
                  onChange={(e) => setState({ ...state, propertyAddress: e.target.value })}
                  placeholder="123 Main St, Anytown, USA"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={state.customerPhone}
                    onChange={(e) => setState({ ...state, customerPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={state.customerEmail}
                    onChange={(e) => setState({ ...state, customerEmail: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="referredBy">Referred By (Optional)</Label>
                <Input
                  id="referredBy"
                  value={state.referredBy}
                  onChange={(e) => setState({ ...state, referredBy: e.target.value })}
                  placeholder="Jane Doe, Google Search, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={nextStep} disabled={!state.customerName || !state.propertyAddress}>
                Next: Property Details →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Property Details */}
        {step === 2 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Property Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="propertyAge">Property Age</Label>
                  <Input
                    id="propertyAge"
                    value={state.propertyAge}
                    onChange={(e) => setState({ ...state, propertyAge: e.target.value })}
                    placeholder="15 years"
                  />
                </div>
                <div>
                  <Label htmlFor="propertySize">Square Footage</Label>
                  <Input
                    id="propertySize"
                    value={state.propertySize}
                    onChange={(e) => setState({ ...state, propertySize: e.target.value })}
                    placeholder="2,500 sq ft"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="currentMaterial">Current Material/Condition</Label>
                <Input
                  id="currentMaterial"
                  value={state.currentMaterial}
                  onChange={(e) => setState({ ...state, currentMaterial: e.target.value })}
                  placeholder="Asphalt shingles, 20 years old"
                />
              </div>
              <div>
                <Label htmlFor="problemDescription">Problem Description</Label>
                <Textarea
                  id="problemDescription"
                  value={state.problemDescription}
                  onChange={(e) => setState({ ...state, problemDescription: e.target.value })}
                  placeholder="Describe the issue or reason for the project..."
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={prevStep}>
                ← Back
              </Button>
              <Button onClick={nextStep}>Next: Select Services →</Button>
            </div>
          </div>
        )}

        {/* Step 3: Services & Materials */}
        {step === 3 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Services & Materials
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <Select
                  value={state.serviceType || ""}
                  onValueChange={(v) => setState({ ...state, serviceType: v as ServiceType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="siding">Siding</SelectItem>
                    <SelectItem value="gutters">Gutters</SelectItem>
                    <SelectItem value="windows">Windows</SelectItem>
                    <SelectItem value="painting">Painting</SelectItem>
                    <SelectItem value="repairs">General Repairs</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Upgrade Options (Select all that apply)</Label>
                <div className="mt-2 space-y-2">
                  {[
                    "Premium materials",
                    "Extended warranty",
                    "Ice & water shield",
                    "Synthetic underlayment",
                    "Ridge vent upgrade",
                    "Gutter guards",
                  ].map((opt) => (
                    <label key={opt} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.upgradeOptions.includes(opt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setState({
                              ...state,
                              upgradeOptions: [...state.upgradeOptions, opt],
                            });
                          } else {
                            setState({
                              ...state,
                              upgradeOptions: state.upgradeOptions.filter((o) => o !== opt),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="warrantyYears">Warranty Years</Label>
                <Select
                  value={state.warrantyYears.toString()}
                  onValueChange={(v) => setState({ ...state, warrantyYears: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Years</SelectItem>
                    <SelectItem value="10">10 Years</SelectItem>
                    <SelectItem value="15">15 Years</SelectItem>
                    <SelectItem value="20">20 Years</SelectItem>
                    <SelectItem value="25">25 Years (Lifetime)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={prevStep}>
                ← Back
              </Button>
              <Button onClick={nextStep} disabled={!state.serviceType}>
                Next: Configure Pricing →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Pricing (Good/Better/Best) */}
        {step === 4 && (
          <div className="mx-auto max-w-4xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Pricing Options - Good, Better, Best
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Good */}
              <div
                className={`cursor-pointer rounded-lg border-2 p-6 transition ${
                  state.selectedTier === "good"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
                onClick={() => setState({ ...state, selectedTier: "good" })}
              >
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Good</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Basic option - quality materials, standard warranty
                </p>
                <div className="mb-2">
                  <Label htmlFor="goodPrice">Price</Label>
                  <Input
                    id="goodPrice"
                    type="number"
                    value={state.goodPrice || ""}
                    onChange={(e) => setState({ ...state, goodPrice: parseFloat(e.target.value) })}
                    placeholder="8500"
                  />
                </div>
              </div>

              {/* Better */}
              <div
                className={`cursor-pointer rounded-lg border-2 p-6 transition ${
                  state.selectedTier === "better"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
                onClick={() => setState({ ...state, selectedTier: "better" })}
              >
                <div className="mb-2 inline-block rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  RECOMMENDED
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Better</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Premium materials, extended warranty, upgrades included
                </p>
                <div className="mb-2">
                  <Label htmlFor="betterPrice">Price</Label>
                  <Input
                    id="betterPrice"
                    type="number"
                    value={state.betterPrice || ""}
                    onChange={(e) =>
                      setState({ ...state, betterPrice: parseFloat(e.target.value) })
                    }
                    placeholder="12500"
                  />
                </div>
              </div>

              {/* Best */}
              <div
                className={`cursor-pointer rounded-lg border-2 p-6 transition ${
                  state.selectedTier === "best"
                    ? "border-amber-600 bg-amber-50 dark:bg-amber-950"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
                onClick={() => setState({ ...state, selectedTier: "best" })}
              >
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Best</h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Top-tier materials, lifetime warranty, all upgrades
                </p>
                <div className="mb-2">
                  <Label htmlFor="bestPrice">Price</Label>
                  <Input
                    id="bestPrice"
                    type="number"
                    value={state.bestPrice || ""}
                    onChange={(e) => setState({ ...state, bestPrice: parseFloat(e.target.value) })}
                    placeholder="17500"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select
                  value={state.paymentTerms}
                  onValueChange={(v) => setState({ ...state, paymentTerms: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="50/50">50% Deposit, 50% on Completion</SelectItem>
                    <SelectItem value="Payment on Completion">Payment on Completion</SelectItem>
                    <SelectItem value="Custom">Custom Terms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.financingAvailable}
                  onChange={(e) => setState({ ...state, financingAvailable: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Financing Available
                </span>
              </label>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={prevStep}>
                ← Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!state.goodPrice && !state.betterPrice && !state.bestPrice}
              >
                Next: Set Timeline →
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Timeline */}
        {step === 5 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Project Timeline</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate">Proposed Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={state.startDate}
                    onChange={(e) => setState({ ...state, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="projectDuration">Project Duration</Label>
                  <Input
                    id="projectDuration"
                    value={state.projectDuration}
                    onChange={(e) => setState({ ...state, projectDuration: e.target.value })}
                    placeholder="2-3 days"
                  />
                </div>
              </div>
              <div>
                <Label>Key Milestones (Optional)</Label>
                <div className="mt-2 space-y-2">
                  {state.milestones.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={m}
                        onChange={(e) => {
                          const newMilestones = [...state.milestones];
                          newMilestones[i] = e.target.value;
                          setState({ ...state, milestones: newMilestones });
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setState({
                            ...state,
                            milestones: state.milestones.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setState({ ...state, milestones: [...state.milestones, ""] })}
                  >
                    + Add Milestone
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={prevStep}>
                ← Back
              </Button>
              <Button onClick={nextStep}>Next: Generate Proposal →</Button>
            </div>
          </div>
        )}

        {/* Step 6: Generate Proposal */}
        {step === 6 && (
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Generate Professional Proposal
            </h2>

            {/* AI Template Selection */}
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <SmartTemplateSelector
                onSelect={(id) => setSelectedTemplateId(id)}
                selectedId={selectedTemplateId}
                defaultStyle="Retail"
                context={
                  {
                    intent: "homeowner_estimate",
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any
                }
                compact
                label="Proposal Template"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
                Proposal Summary
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Customer:</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {state.customerName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Property:</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {state.propertyAddress}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Service:</dt>
                  <dd className="font-medium capitalize text-slate-900 dark:text-white">
                    {state.serviceType}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Selected Tier:</dt>
                  <dd className="font-medium capitalize text-slate-900 dark:text-white">
                    {state.selectedTier}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-2 dark:border-slate-600">
                  <dt className="text-slate-600 dark:text-slate-400">Total Price:</dt>
                  <dd className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ${state[`${state.selectedTier}Price`].toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>What happens next:</strong> Your proposal will be generated using your
                company branding (logo, colors, contact info) from a professional template. The PDF
                will be ready to send to your customer.
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={prevStep}>
                ← Back
              </Button>
              <Button onClick={handleGenerateProposal} disabled={generatingPDF}>
                {generatingPDF ? "Generating..." : "🚀 Generate Proposal PDF"}
              </Button>
            </div>
          </div>
        )}
      </PageSectionCard>
    </PageContainer>
  );
}

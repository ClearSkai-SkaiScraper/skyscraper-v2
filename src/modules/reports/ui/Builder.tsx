"use client";

// ============================================================================
// UNIVERSAL CONTRACTOR PACKET BUILDER UI
// Phase 5.2: Side panel detail view + Dark mode + Field mode + Empty states
// ============================================================================

import {
  AlertCircle,
  BookOpen,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CloudSun,
  DollarSign,
  Download,
  Eye,
  FileText,
  GripVertical,
  Image,
  List,
  Paperclip,
  PenTool,
  Play,
  PlusCircle,
  Ruler,
  Scale,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Table,
  X,
  Zap,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
import { ClaimJobSelect, type ClaimJobSelection } from "@/components/selectors/ClaimJobSelect";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { runAI, useAIJob } from "@/modules/ai/core/hooks";
import { BrandingIncompleteHint } from "@/modules/branding/ui/BrandingIncompleteHint";
import { useTheme } from "@/modules/ui/theme/useTheme";

import { SECTION_REGISTRY } from "../core/SectionRegistry";
import type { ExportFormat, SectionKey } from "../types";

/** Map section icon name to component */
const SECTION_ICONS: Record<string, React.ElementType> = {
  BookOpen,
  List,
  FileText,
  CloudSun,
  ClipboardList,
  Camera,
  Ruler,
  Table,
  Scale,
  DollarSign,
  PlusCircle,
  PenTool,
  Paperclip,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Calendar,
  Image,
};

/** Descriptions & tips for each section shown in the side panel */
const SECTION_DETAILS: Record<
  string,
  { description: string; tips: string[]; dataFields: string[] }
> = {
  cover: {
    description:
      "Professional cover page with company branding, property address, and project details.",
    tips: ["Add your logo in Settings → Branding", "Include project name and customer info"],
    dataFields: ["Company Logo", "Company Name", "Property Address", "Project Name", "Date"],
  },
  toc: {
    description: "Auto-generated table of contents reflecting selected sections and page numbers.",
    tips: [
      "Updates automatically based on selected sections",
      "Page numbers added during PDF generation",
    ],
    dataFields: ["Section List", "Page Numbers"],
  },
  "executive-summary": {
    description: "High-level overview of property damage, scope of work, and recommended actions.",
    tips: ["Use AI to auto-generate from claim data", "Include a brief 2-3 sentence overview"],
    dataFields: ["Summary Text", "Primary Findings", "Recommended Actions"],
  },
  // weather-verification: REMOVED — now in Claims-Ready Folder only
  "adjuster-notes": {
    description: "Field notes and observations from property inspections.",
    tips: [
      "Document key findings during inspections",
      "Include specific measurements and observations",
    ],
    dataFields: ["Inspection Date", "Inspector Name", "Observations", "Measurements"],
  },
  "photo-evidence": {
    description: "Organized project photo documentation with labels and descriptions.",
    tips: [
      "Group photos by location (roof, siding, interior)",
      "Include close-ups of specific areas",
    ],
    dataFields: ["Photo Grid", "Captions", "Labels", "Location Tags"],
  },

  "scope-matrix": {
    description: "Detailed line items with quantities, unit pricing, and trade categories.",
    tips: [
      "Include line-item codes for professional documentation",
      "Reference building codes for justification when applicable",
    ],
    dataFields: ["Line Items", "Trade Category", "Item Code", "Quantity", "Unit Price", "Total"],
  },
  "code-compliance": {
    description: "Building code references and manufacturer requirements supporting the scope.",
    tips: ["Reference specific IRC sections", "Include manufacturer warranty requirements"],
    dataFields: ["Code Citations", "Manufacturer Specs", "Compliance Notes"],
  },
  "pricing-comparison": {
    description: "Market pricing data and comparative analysis to justify line item pricing.",
    tips: ["Include local market data", "Reference regional price lists"],
    dataFields: ["Market Rates", "Regional Data", "Competitive Comparison"],
  },
  // supplements: REMOVED — now in Claims-Ready Folder only
  "signature-page": {
    description: "Professional signature block with contractor license, disclaimers, and terms.",
    tips: ["Include contractor license number", "Add professional disclaimers"],
    dataFields: ["Signature Block", "License Number", "Date", "Disclaimers"],
  },
  "attachments-index": {
    description: "Index of all attached documents, certifications, and supporting materials.",
    tips: ["Include manufacturer certifications", "Attach relevant permits and licenses"],
    dataFields: ["Document List", "File References", "Certification Details"],
  },
  "retail-proposal": {
    description:
      "Professional retail proposal with itemized quote, project scope, and customer-ready pricing.",
    tips: [
      "Include clear project timeline",
      "Show payment milestones",
      "Add optional upgrade packages",
    ],
    dataFields: [
      "Project Title",
      "Scope of Work",
      "Line Items",
      "Labor Cost",
      "Material Cost",
      "Total Quote",
      "Valid Until Date",
    ],
  },
  "customer-details": {
    description:
      "Customer contact info, property details, and project preferences imported from client intake.",
    tips: [
      "Auto-fills from job client data",
      "Verify phone and email before sending",
      "Include property access notes",
    ],
    dataFields: [
      "Customer Name",
      "Phone",
      "Email",
      "Property Address",
      "Property Type",
      "Access Notes",
      "Preferred Schedule",
    ],
  },
  "material-selections": {
    description:
      "Detailed material specifications, product selections, colors, and manufacturer options.",
    tips: [
      "Include product photos when possible",
      "List warranty info per material",
      "Show good/better/best options",
    ],
    dataFields: [
      "Product Name",
      "Manufacturer",
      "Color/Style",
      "Quantity",
      "Unit Price",
      "Warranty Period",
      "Spec Sheet URL",
    ],
  },
  "payment-schedule": {
    description:
      "Payment milestones, deposit requirements, financing options, and accepted payment methods.",
    tips: [
      "Standard: 50% deposit, 50% on completion",
      "Include financing partner info if available",
    ],
    dataFields: [
      "Deposit Amount",
      "Milestone 1",
      "Milestone 2",
      "Final Payment",
      "Financing Available",
      "Payment Methods",
    ],
  },
  "warranty-terms": {
    description:
      "Workmanship warranty, manufacturer warranties, and guarantee terms for the completed project.",
    tips: [
      "Include both labor and material warranties",
      "Reference manufacturer warranty registration process",
    ],
    dataFields: [
      "Workmanship Warranty",
      "Material Warranty",
      "Warranty Start Date",
      "Exclusions",
      "Claim Process",
    ],
  },
  // ===== INTEGRATED MODULE SECTIONS =====
  "material-estimate": {
    description:
      "Complete material estimate from roof measurements with ABC Supply pricing and order quantities.",
    tips: [
      "Auto-calculates waste factors based on roof complexity",
      "Includes nearest ABC Supply branch inventory check",
      "Shows good/better/best material options with pricing",
    ],
    dataFields: [
      "Shingle Type",
      "Shingle Quantity",
      "Underlayment",
      "Ice & Water Shield",
      "Ridge Cap",
      "Starter Strip",
      "Drip Edge",
      "Nails",
      "Total Material Cost",
      "ABC Supply Branch",
    ],
  },
  "project-timeline": {
    description:
      "Professional project timeline with milestones, expected duration, and crew scheduling.",
    tips: [
      "Auto-generates from project scope and crew availability",
      "Include weather contingency notes",
      "Show customer notification points",
    ],
    dataFields: [
      "Project Start",
      "Permit Approval",
      "Material Delivery",
      "Tear-Off",
      "Installation",
      "Inspection",
      "Final Walkthrough",
      "Project Complete",
    ],
  },
  "visual-mockups": {
    description: "Visual renderings showing proposed material selections on the actual property.",
    tips: [
      "Auto-generates from property photo and selected materials",
      "Show multiple color options side-by-side",
      "Include manufacturer product images",
    ],
    dataFields: [
      "Property Photo",
      "Proposed Rendering",
      "Material Color",
      "Alternative Options",
      "Manufacturer Info",
    ],
  },
};

export default function Builder() {
  const { fieldMode } = useTheme();
  const searchParams = useSearchParams();
  const _canEdit = true; // TODO: Wire to actual role check from auth context

  // Pre-populate from URL params (e.g. ?jobContext=claim:xxx or ?contextId=xxx&contextType=claim)
  const urlContextId = searchParams?.get("contextId") || "";
  const urlContextType = searchParams?.get("contextType") || "";
  const urlJobContext = searchParams?.get("jobContext") || "";

  const initialSelection: ClaimJobSelection = (() => {
    if (urlContextId && urlContextType === "claim") {
      return { claimId: urlContextId, resolvedClaimId: urlContextId };
    }
    if (urlContextId && urlContextType === "job") {
      return { jobId: urlContextId };
    }
    if (urlJobContext) {
      const [kind, id] = urlJobContext.split(":");
      if (kind === "claim" && id) return { claimId: id, resolvedClaimId: id };
      if (kind === "job" && id) return { jobId: id };
    }
    return {};
  })();

  // Selection state for claim/job and PDF template
  const [selection, setSelection] = useState<ClaimJobSelection>(initialSelection);
  const [templateId, setTemplateId] = useState("");

  const [selectedSections, setSelectedSections] = useState<SectionKey[]>([
    "cover",
    "customer-details",
    "retail-proposal",
    "material-selections",
    "payment-schedule",
    "warranty-terms",
    "signature-page",
  ]);

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<{ claimId?: string } | null>(null);
  const [runningAI, setRunningAI] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [systemError, _setSystemError] = useState<string | null>(null);
  const [activeSidePanel, setActiveSidePanel] = useState<SectionKey | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [weatherData, setWeatherData] = useState<{
    hailSize?: string;
    windSpeed?: string;
    eventDate?: string;
  } | null>(null);

  // Material estimate state
  const [materialStatus, setMaterialStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [materialEstimate, setMaterialEstimate] = useState<{
    totalMaterialCost?: number;
    shingleType?: string;
    shingleQty?: number;
    branch?: string;
  } | null>(null);

  // Mockup state
  const [mockupStatus, setMockupStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [mockupData, setMockupData] = useState<{
    mockupUrl?: string;
    productName?: string;
  } | null>(null);

  // Project timeline state
  const [timelineStatus, setTimelineStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [timelineData, setTimelineData] = useState<{
    projectDays?: number;
    milestones?: Array<{ name: string; date: string }>;
  } | null>(null);

  // Editable field values for each section (keyed by sectionKey -> fieldName)
  const [sectionFieldValues, setSectionFieldValues] = useState<
    Record<string, Record<string, string>>
  >({});

  const updateFieldValue = (sectionKey: string, fieldName: string, value: string) => {
    setSectionFieldValues((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [fieldName]: value },
    }));
  };

  const { job } = useAIJob(currentJobId);

  const toggleSection = (key: SectionKey) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const moveSection = (key: SectionKey, direction: "up" | "down") => {
    const index = selectedSections.indexOf(key);
    if (index === -1) return;

    const newSections = [...selectedSections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    setSelectedSections(newSections);
  };

  const handleRunAI = async (engine?: string) => {
    setRunningAI(true);
    setError(null);

    try {
      const result = await runAI({
        reportId: "demo-report-001",
        engine,
      });

      if (result.jobId) {
        setCurrentJobId(result.jobId);
      } else if (result.jobIds && result.jobIds.length > 0) {
        setCurrentJobId(result.jobIds[0]);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningAI(false);
    }
  };

  /** Quick DOL Pull — fetch weather verification for the selected claim */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQuickDolPull = async () => {
    const claimId = selection.resolvedClaimId || selection.claimId;
    if (!claimId) {
      setError("Select a claim first to pull weather data.");
      return;
    }
    setWeatherStatus("loading");
    setError(null);
    try {
      // First check if weather data already exists for this claim
      const checkRes = await fetch(`/api/claims/${claimId}/weather`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData?.weather || checkData?.data) {
          const w = checkData.weather || checkData.data;
          setWeatherData({
            hailSize: w.hailSize || w.maxHailInches ? `${w.maxHailInches}"` : undefined,
            windSpeed: w.windSpeed || w.maxWindGustMph ? `${w.maxWindGustMph} mph` : undefined,
            eventDate: w.dateOfLoss || w.date,
          });
          setWeatherStatus("ready");
          // Auto-add weather section if not already selected
          if (!selectedSections.includes("weather-verification")) {
            setSelectedSections((prev) => [...prev, "weather-verification"]);
          }
          return;
        }
      }

      // No cached data — trigger a fresh weather fetch
      const refreshRes = await fetch(`/api/claims/${claimId}/weather?refresh=true`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const w = refreshData.weather || refreshData.data || refreshData;
        setWeatherData({
          hailSize: w.hailSize || w.maxHailInches ? `${w.maxHailInches}"` : undefined,
          windSpeed: w.windSpeed || w.maxWindGustMph ? `${w.maxWindGustMph} mph` : undefined,
          eventDate: w.dateOfLoss || w.date,
        });
        setWeatherStatus("ready");
        if (!selectedSections.includes("weather-verification")) {
          setSelectedSections((prev) => [...prev, "weather-verification"]);
        }
      } else {
        setWeatherStatus("error");
        setError("Weather data fetch failed. Try running Weather Verification from AI controls.");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setWeatherStatus("error");
      setError(err.message || "Failed to pull weather data.");
    }
  };

  /** Pull Material Estimate — fetch material estimate from measurements */
  const handleMaterialEstimate = async () => {
    const claimId = selection.resolvedClaimId || selection.claimId;
    const jobId = selection.jobId;
    if (!claimId && !jobId) {
      setError("Select a claim or job first to generate material estimate.");
      return;
    }
    setMaterialStatus("loading");
    setError(null);
    try {
      const endpoint = claimId
        ? `/api/claims/${claimId}/material-estimate`
        : `/api/jobs/${jobId}/material-estimate`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setMaterialEstimate({
          totalMaterialCost: data.totalCost || data.estimate?.totalMaterialCost,
          shingleType: data.shingleSpec?.type || data.estimate?.shingleType,
          shingleQty: data.materialList?.shingles?.quantity || data.estimate?.shingleQuantity,
          branch: data.nearestBranch?.name || data.estimate?.abcBranch,
        });
        setMaterialStatus("ready");
        // Auto-add material estimate section
        if (!selectedSections.includes("material-estimate")) {
          setSelectedSections((prev) => [...prev, "material-estimate"]);
        }
      } else {
        setMaterialStatus("error");
        setError("Material estimate generation failed. Ensure roof measurements are available.");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setMaterialStatus("error");
      setError(err.message || "Failed to generate material estimate.");
    }
  };

  /** Generate Visual Mockup — create property rendering with selected materials */
  const handleGenerateMockup = async () => {
    const claimId = selection.resolvedClaimId || selection.claimId;
    const jobId = selection.jobId;
    if (!claimId && !jobId) {
      setError("Select a claim or job first to generate mockup.");
      return;
    }
    setMockupStatus("loading");
    setError(null);
    try {
      const endpoint = claimId ? `/api/claims/${claimId}/mockup` : `/api/jobs/${jobId}/mockup`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "cover" }),
      });
      if (res.ok) {
        const data = await res.json();
        setMockupData({
          mockupUrl: data.mockupUrl || data.url,
          productName: data.productName || data.material?.name,
        });
        setMockupStatus("ready");
        // Auto-add visual mockups section
        if (!selectedSections.includes("visual-mockups")) {
          setSelectedSections((prev) => [...prev, "visual-mockups"]);
        }
      } else {
        setMockupStatus("error");
        setError("Mockup generation failed. Ensure property photo is uploaded.");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setMockupStatus("error");
      setError(err.message || "Failed to generate mockup.");
    }
  };

  /** Generate Project Timeline — create project schedule from scope */
  const handleGenerateTimeline = async () => {
    const claimId = selection.resolvedClaimId || selection.claimId;
    const jobId = selection.jobId;
    if (!claimId && !jobId) {
      setError("Select a claim or job first to generate timeline.");
      return;
    }
    setTimelineStatus("loading");
    setError(null);
    try {
      const endpoint = claimId
        ? `/api/claims/${claimId}/project-timeline`
        : `/api/jobs/${jobId}/project-timeline`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setTimelineData({
          projectDays: data.totalDays || data.timeline?.projectDays,
          milestones: data.milestones || data.timeline?.milestones,
        });
        setTimelineStatus("ready");
        // Auto-add project timeline section
        if (!selectedSections.includes("project-timeline")) {
          setSelectedSections((prev) => [...prev, "project-timeline"]);
        }
      } else {
        setTimelineStatus("error");
        setError("Timeline generation failed. Ensure scope is defined.");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setTimelineStatus("error");
      setError(err.message || "Failed to generate timeline.");
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      // Create contractor packet generation job
      const res = await fetch("/api/contractor-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: selectedSections,
          format,
          packetName: `Contractor Packet ${new Date().toLocaleDateString()}`,
          // Include claim/job and template selection for AI context
          claimId: selection.resolvedClaimId || selection.claimId,
          jobId: selection.jobId,
          templateId: templateId || undefined,
        }),
      });

      // Guard: Check if branding is incomplete
      if (res.status === 400) {
        const errorData = await res.json();
        if (errorData.code === "BRANDING_INCOMPLETE") {
          setError("Complete your organization branding to unlock contractor packets.");
          setExporting(false);
          return;
        }
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Export failed");
      }

      const data = await res.json();
      const packetId = data.packetId;

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

        const statusRes = await fetch(`/api/contractor-packet/${packetId}/status`);
        if (!statusRes.ok) {
          throw new Error("Failed to check status");
        }

        const statusData = await statusRes.json();

        if (statusData.status === "ready") {
          // Download the file
          window.open(`/api/contractor-packet/${packetId}/download`, "_blank");
          // Show success with navigation links
          setExportSuccess({
            claimId: selection.resolvedClaimId || selection.claimId,
          });
          break;
        } else if (statusData.status === "failed") {
          throw new Error(statusData.errorMessage || "Generation failed");
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Generation timed out. Please check status later.");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("[Builder] Export failed:", err);
      setError(err.message || "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // System-level error boundary
  if (systemError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-200">
          Contractor Packet Unavailable
        </h3>
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{systemError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Claim/Job and Template Selection */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Select Context
        </h3>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Choose a claim or job to pull client details, property info, and company branding
          automatically.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="claim-job-select">Claim / Job</Label>
            <ClaimJobSelect
              value={selection}
              onValueChange={setSelection}
              placeholder="Select claim or job..."
            />
            {selection.resolvedClaimId && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Will pull claim details, client info, and property address
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-select">PDF Template</Label>
            <SmartTemplateSelector
              onSelect={(id) => setTemplateId(id)}
              selectedId={templateId}
              defaultStyle="Retail"
              context={{
                intent: "homeowner_estimate",
              }}
              compact
              label="Report Template"
            />
            {templateId && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ AI will use this template&apos;s layout and styling
              </p>
            )}
          </div>
        </div>

        {/* Quick Preset Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() =>
              setSelectedSections([
                "cover",
                "customer-details",
                "retail-proposal",
                "material-selections",
                "payment-schedule",
                "warranty-terms",
                "signature-page",
              ])
            }
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
          >
            🏠 Retail Proposal
          </button>
          <button
            onClick={() =>
              setSelectedSections([
                "cover",
                "toc",
                "customer-details",
                "retail-proposal",
                "scope-matrix",
                "material-selections",
                "payment-schedule",
                "warranty-terms",
                "signature-page",
                "attachments-index",
              ])
            }
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
          >
            📦 Full Bid Package
          </button>
        </div>
      </div>

      <main className={cn("grid", fieldMode ? "grid-cols-1 gap-4" : "grid-cols-3 gap-6")}>
        {/* Branding Status Hint */}
        <div className="col-span-full">
          <BrandingIncompleteHint />
        </div>

        {!selectedSections?.length && (
          <div className="col-span-full">
            <EmptyState
              icon={<FileText className="h-12 w-12 text-muted-foreground" />}
              title="No sections selected"
              description="Start your contractor packet by adding sections. Choose from cover pages, photo evidence, scope matrices, and more."
              ctaLabel="Add First Section"
              ctaOnClick={() => setSelectedSections(["cover"])}
            />
          </div>
        )}

        {selectedSections?.length > 0 && (
          <>
            <div className={cn("space-y-6", fieldMode ? "col-span-1" : "col-span-2")}>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Export Success Banner */}
              {exportSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <p className="mb-2 font-medium text-green-800 dark:text-green-200">
                    ✅ Packet generated &amp; saved successfully!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/reports/history"
                      className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-green-900/40 dark:text-green-300"
                    >
                      View in Reports History →
                    </a>
                    {exportSuccess.claimId && (
                      <a
                        href={`/claims/${exportSuccess.claimId}/documents`}
                        className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-green-900/40 dark:text-green-300"
                      >
                        View in Claim Documents →
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                    Documents are saved as <strong>Private</strong> by default. Toggle to
                    &quot;Shared&quot; on the Documents tab when you&apos;re ready for the client to
                    see it.
                  </p>
                </div>
              )}

              {/* AI Status */}
              {job && job.status === "running" && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span>AI running: {job.engine}...</span>
                </div>
              )}

              {job && job.status === "succeeded" && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                  ✅ AI completed: {job.engine}
                </div>
              )}

              {/* AI Controls */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleRunAI()}
                  disabled={runningAI}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-5 w-5" />
                  {runningAI ? "Running AI..." : "Run All AI"}
                </Button>

                {/* Material Estimate Button */}
                <Button
                  onClick={() => void handleMaterialEstimate()}
                  disabled={
                    materialStatus === "loading" || (!selection.resolvedClaimId && !selection.jobId)
                  }
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  title={
                    !selection.resolvedClaimId && !selection.jobId
                      ? "Select a claim or job first"
                      : "Generate material estimate from measurements"
                  }
                >
                  <ShoppingCart className="h-5 w-5" />
                  {materialStatus === "loading"
                    ? "Estimating..."
                    : materialStatus === "ready"
                      ? "✓ Materials Ready"
                      : "Material Estimate"}
                </Button>

                {/* Generate Mockup Button */}
                <Button
                  onClick={() => void handleGenerateMockup()}
                  disabled={
                    mockupStatus === "loading" || (!selection.resolvedClaimId && !selection.jobId)
                  }
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  title={
                    !selection.resolvedClaimId && !selection.jobId
                      ? "Select a claim or job first"
                      : "Generate visual mockup with selected materials"
                  }
                >
                  <Image className="h-5 w-5" />
                  {mockupStatus === "loading"
                    ? "Generating..."
                    : mockupStatus === "ready"
                      ? "✓ Mockup Ready"
                      : "Visual Mockup"}
                </Button>

                {/* Project Timeline Button */}
                <Button
                  onClick={() => void handleGenerateTimeline()}
                  disabled={
                    timelineStatus === "loading" || (!selection.resolvedClaimId && !selection.jobId)
                  }
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  title={
                    !selection.resolvedClaimId && !selection.jobId
                      ? "Select a claim or job first"
                      : "Generate project timeline from scope"
                  }
                >
                  <Calendar className="h-5 w-5" />
                  {timelineStatus === "loading"
                    ? "Building..."
                    : timelineStatus === "ready"
                      ? "✓ Timeline Ready"
                      : "Project Timeline"}
                </Button>

                <div className="group relative">
                  <Button
                    disabled={runningAI}
                    variant="outline"
                    className="gap-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    <Play className="h-5 w-5" />
                    Run Specific
                  </Button>

                  {/* Dropdown */}
                  <div className="absolute left-0 top-full z-10 mt-1 hidden w-56 rounded-lg border border-gray-200 bg-white shadow-lg group-hover:block">
                    <Button
                      onClick={() => handleRunAI("damageBuilder")}
                      variant="ghost"
                      className="w-full justify-start rounded-none hover:bg-gray-100"
                    >
                      Damage Builder
                    </Button>
                    <Button
                      onClick={() => handleRunAI("codes")}
                      variant="ghost"
                      className="w-full justify-start rounded-none hover:bg-gray-100"
                    >
                      Code Compliance
                    </Button>
                    <Button
                      onClick={() => handleRunAI("photoGrouping")}
                      variant="ghost"
                      className="w-full justify-start rounded-none hover:bg-gray-100"
                    >
                      Photo Grouping
                    </Button>
                  </div>
                </div>
              </div>

              {/* Weather Data Status */}
              {weatherStatus === "ready" && weatherData && (
                <div className="flex items-center gap-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm dark:border-cyan-800 dark:bg-cyan-900/20">
                  <CloudSun className="h-5 w-5 text-cyan-600" />
                  <span className="font-medium text-cyan-800 dark:text-cyan-200">
                    Weather Verified
                  </span>
                  {weatherData.hailSize && (
                    <span className="text-cyan-700 dark:text-cyan-300">
                      Hail: {weatherData.hailSize}
                    </span>
                  )}
                  {weatherData.windSpeed && (
                    <span className="text-cyan-700 dark:text-cyan-300">
                      Wind: {weatherData.windSpeed}
                    </span>
                  )}
                  {weatherData.eventDate && (
                    <span className="text-cyan-700 dark:text-cyan-300">
                      DOL: {weatherData.eventDate}
                    </span>
                  )}
                </div>
              )}

              {/* Material Estimate Status */}
              {materialStatus === "ready" && materialEstimate && (
                <div className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
                  <ShoppingCart className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Materials Estimated
                  </span>
                  {materialEstimate.shingleType && (
                    <span className="text-amber-700 dark:text-amber-300">
                      {materialEstimate.shingleType}
                    </span>
                  )}
                  {materialEstimate.shingleQty && (
                    <span className="text-amber-700 dark:text-amber-300">
                      {materialEstimate.shingleQty} bundles
                    </span>
                  )}
                  {materialEstimate.totalMaterialCost && (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      ${materialEstimate.totalMaterialCost.toLocaleString()}
                    </span>
                  )}
                  {materialEstimate.branch && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      @ {materialEstimate.branch}
                    </span>
                  )}
                </div>
              )}

              {/* Mockup Status */}
              {mockupStatus === "ready" && mockupData && (
                <div className="flex items-center gap-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-800 dark:bg-indigo-900/20">
                  <Image className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium text-indigo-800 dark:text-indigo-200">
                    Mockup Generated
                  </span>
                  {mockupData.productName && (
                    <span className="text-indigo-700 dark:text-indigo-300">
                      {mockupData.productName}
                    </span>
                  )}
                  {mockupData.mockupUrl && (
                    <a
                      href={mockupData.mockupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400"
                    >
                      View Mockup →
                    </a>
                  )}
                </div>
              )}

              {/* Timeline Status */}
              {timelineStatus === "ready" && timelineData && (
                <div className="flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-900/20">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-800 dark:text-emerald-200">
                    Timeline Ready
                  </span>
                  {timelineData.projectDays && (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {timelineData.projectDays} day project
                    </span>
                  )}
                  {timelineData.milestones && (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {timelineData.milestones.length} milestones
                    </span>
                  )}
                </div>
              )}

              {/* Export buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={exporting || selectedSections.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  {exporting ? "Generating..." : "Export PDF"}
                </button>

                <button
                  onClick={() => handleExport("docx")}
                  disabled={exporting || selectedSections.length === 0}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  Export DOCX
                </button>

                <button
                  onClick={() => handleExport("zip")}
                  disabled={exporting || selectedSections.length === 0}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  Export ZIP
                </button>
              </div>

              {/* Section list */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Selected Sections ({selectedSections.length})
                  </h2>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {Object.values(SECTION_REGISTRY)
                    .sort((a, b) => a.order - b.order)
                    .map((section) => {
                      const isSelected = selectedSections.includes(section.key);
                      const index = selectedSections.indexOf(section.key);
                      const isActive = activeSidePanel === section.key;

                      return (
                        <div
                          key={section.key}
                          className={cn(
                            "flex cursor-pointer items-center justify-between px-6 py-4 transition-colors",
                            isSelected
                              ? isActive
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30"
                              : "bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                          )}
                          onClick={() => {
                            if (isSelected) {
                              setActiveSidePanel(isActive ? null : section.key);
                            }
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSection(section.key);
                              }}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`Toggle ${section.title}`}
                            />
                            {isSelected && <GripVertical className="h-4 w-4 text-slate-400" />}
                            {(() => {
                              const IconComp = section.icon ? SECTION_ICONS[section.icon] : null;
                              return IconComp ? (
                                <IconComp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              ) : null;
                            })()}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {section.title}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-slate-400">
                                {section.key}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSidePanel(isActive ? null : section.key);
                                  }}
                                  className={cn(
                                    "rounded p-1 transition-colors",
                                    isActive
                                      ? "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-300"
                                      : "hover:bg-gray-200 dark:hover:bg-slate-600"
                                  )}
                                  aria-label="View section details"
                                  title="View section details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveSection(section.key, "up");
                                  }}
                                  disabled={index === 0}
                                  className="rounded p-1 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-slate-600"
                                  aria-label="Move section up"
                                  title="Move section up"
                                >
                                  <ChevronUp className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveSection(section.key, "down");
                                  }}
                                  disabled={index === selectedSections.length - 1}
                                  className="rounded p-1 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-slate-600"
                                  aria-label="Move section down"
                                  title="Move section down"
                                >
                                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Preview Section */}
              <div className="rounded-lg border border-border bg-white p-6 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  <FileText className="mr-2 inline-block h-5 w-5" />
                  Document Preview
                </h3>
                <div className="space-y-4">
                  <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                      <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">
                      {selectedSections.length} Sections Selected
                    </h4>
                    <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                      Your contractor packet will include:{" "}
                      {selectedSections.join(", ").replace(/-/g, " ")}
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleExport("pdf")}
                        disabled={exporting || selectedSections.length === 0}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Download className="mr-2 inline-block h-4 w-4" />
                        {exporting ? "Generating PDF..." : "Download PDF"}
                      </button>
                      <button
                        onClick={() => handleExport("docx")}
                        disabled={exporting || selectedSections.length === 0}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Download className="mr-2 inline-block h-4 w-4" />
                        {exporting ? "Generating DOCX..." : "Download DOCX"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Panel — Section Details */}
            <aside className="col-span-1">
              {activeSidePanel ? (
                <div className="sticky top-4 space-y-4">
                  <div className="rounded-lg border border-blue-200 bg-white shadow-md dark:border-blue-800 dark:bg-slate-800">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-5 py-3 dark:border-blue-900 dark:bg-blue-950/40">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                        {SECTION_REGISTRY[activeSidePanel]?.title}
                      </h3>
                      <button
                        onClick={() => setActiveSidePanel(null)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                        aria-label="Close panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Panel Body */}
                    <div className="space-y-5 p-5">
                      {/* Description */}
                      <div>
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {SECTION_DETAILS[activeSidePanel]?.description ||
                            "Section details coming soon."}
                        </p>
                      </div>

                      {/* Data Fields — Editable Inputs */}
                      {SECTION_DETAILS[activeSidePanel]?.dataFields && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Editable Fields
                          </h4>
                          <div className="space-y-2">
                            {SECTION_DETAILS[activeSidePanel].dataFields.map((field) => (
                              <div key={field}>
                                <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                  {field}
                                </label>
                                <input
                                  type="text"
                                  value={sectionFieldValues[activeSidePanel]?.[field] || ""}
                                  onChange={(e) =>
                                    updateFieldValue(activeSidePanel, field, e.target.value)
                                  }
                                  placeholder={`Enter ${field.toLowerCase()}...`}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      {SECTION_DETAILS[activeSidePanel]?.tips && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Tips
                          </h4>
                          <ul className="space-y-1.5">
                            {SECTION_DETAILS[activeSidePanel].tips.map((tip, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                              >
                                <span className="mt-0.5 text-blue-500">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Section Order */}
                      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">
                            Position in packet:
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            #{selectedSections.indexOf(activeSidePanel) + 1} of{" "}
                            {selectedSections.length}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            toggleSection(activeSidePanel);
                            setActiveSidePanel(null);
                          }}
                          className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Remove Section
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                    <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="mb-1 font-semibold text-slate-900 dark:text-white">
                    Section Details
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Click the <Eye className="inline h-3.5 w-3.5" /> icon or any selected section to
                    view its details, included fields, and tips.
                  </p>
                </div>
              )}
            </aside>
          </>
        )}
      </main>
    </div>
  );
}

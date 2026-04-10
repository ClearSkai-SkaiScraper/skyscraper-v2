"use client";

import {
  Calculator,
  Clock,
  Download,
  FileText,
  Info,
  Layers,
  Loader2,
  Mail,
  Paperclip,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { TradesToolJobPicker } from "@/components/trades/TradesToolJobPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface SavedPlan {
  id: string;
  title: string;
  createdAt: string;
  status: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  section: string;
}

export default function ProjectPlanBuilderPage() {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const specFileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    trade: "roofing",
    jobType: "installation",
    projectSize: "",
    timeline: "2-4-weeks",
    budget: "",
    summary: "",
    documents: "",
    finalNotes: "",
  });

  // ── AI-Powered Generate ────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to generate plan");
        setResult(null);
        return;
      }

      const data = await res.json();
      setResult(data.plan);
      toast.success("Project plan generated!");

      // Save to GeneratedArtifact table
      const tradeLabel = formData.trade.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const jobTypeLabel = formData.jobType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      try {
        await fetch("/api/artifacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PROJECT_PLAN",
            title: `${tradeLabel} - ${jobTypeLabel} (${formData.projectSize || "TBD"})`,
            status: "DRAFT",
            contentText: data.plan,
            contentJson: {
              input: formData,
              output: data.plan,
              tokensUsed: data.tokensUsed,
              model: data.model,
              generatedAt: new Date().toISOString(),
            },
          }),
        });
      } catch {
        // Non-critical
      }
    } catch (error) {
      logger.error("Error generating project plan:", error);
      toast.error("Error generating plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── PDF Export ──────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const tradeLabel = formData.trade.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const jobTypeLabel = formData.jobType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const res = await fetch("/api/ai/plan/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: result,
          title: `${tradeLabel} — ${jobTypeLabel}`,
          companyName: tradeLabel,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to export PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-plan-${formData.trade}-${formData.jobType}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch (err) {
      logger.error("PDF export error:", err);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  // ── File Upload Handler ────────────────────────────────────
  const handleFileUpload = (section: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = files.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      section,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${files.length} file(s) attached to ${section}`);
    const fileNames = files.map((f) => f.name).join(", ");
    if (section === "specs" || section === "documents") {
      setFormData((prev) => ({
        ...prev,
        documents: prev.documents
          ? `${prev.documents}\n[Attached: ${fileNames}]`
          : `[Attached: ${fileNames}]`,
      }));
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Load saved plans ───────────────────────────────────────
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/artifacts?type=PROJECT_PLAN&limit=10");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSavedPlans(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.map((a: any) => ({
                id: a.id,
                title: a.title || "Untitled Plan",
                createdAt: a.createdAt || a.created_at,
                status: a.status || "DRAFT",
              }))
            );
          }
        }
      } catch {
        /* silent */
      }
    }
    void loadPlans();
  }, [result]);

  // ── Email plan handler ─────────────────────────────────────
  const handleEmailPlan = async () => {
    if (!result || !emailTo) return;
    setEmailing(true);
    try {
      const tradeLabel = formData.trade.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject: `Project Plan — ${tradeLabel}`,
          text: result,
        }),
      });
      if (res.ok) {
        setShowEmailModal(false);
        setEmailTo("");
        toast.success("Plan emailed!");
      } else {
        toast.error("Failed to send email.");
      }
    } catch (err) {
      logger.error("Email plan error:", err);
      toast.error("Failed to send email.");
    } finally {
      setEmailing(false);
    }
  };

  // ── Transfer to Proposal ───────────────────────────────────
  const handleTransferToProposal = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const tradeLabel = formData.trade.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const jobTypeLabel = formData.jobType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PROPOSAL",
          title: `Proposal — ${tradeLabel} ${jobTypeLabel} (${formData.projectSize || "TBD"})`,
          status: "DRAFT",
          contentText: result,
          contentJson: {
            sourceType: "PROJECT_PLAN",
            input: formData,
            output: result,
            convertedAt: new Date().toISOString(),
          },
        }),
      });
      if (res.ok) {
        toast.success("Plan transferred to Proposals!");
      } else {
        toast.error("Failed to create proposal.");
      }
    } catch (err) {
      logger.error("Transfer to proposal error:", err);
      toast.error("Failed to create proposal.");
    } finally {
      setSaving(false);
    }
  };

  // ── Markdown Preview Renderer ──────────────────────────────
  const formatBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-slate-800 dark:text-slate-200">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  const renderMarkdownPreview = (md: string) => {
    return md.split("\n").map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-2" />;
      if (t.startsWith("# "))
        return (
          <h1
            key={i}
            className="mb-3 mt-6 border-b border-blue-200 pb-2 text-xl font-bold text-blue-700 dark:border-blue-800 dark:text-blue-400"
          >
            {t.replace(/^#\s+/, "").replace(/\*\*/g, "")}
          </h1>
        );
      if (t.startsWith("## "))
        return (
          <h2
            key={i}
            className="mb-2 mt-5 text-lg font-semibold text-slate-800 dark:text-slate-200"
          >
            {t.replace(/^##\s+/, "").replace(/\*\*/g, "")}
          </h2>
        );
      if (t.startsWith("### "))
        return (
          <h3
            key={i}
            className="mb-1 mt-4 text-base font-semibold text-slate-700 dark:text-slate-300"
          >
            {t.replace(/^###\s+/, "").replace(/\*\*/g, "")}
          </h3>
        );
      if (/^-{3,}$|^\*{3,}$/.test(t))
        return <hr key={i} className="my-4 border-slate-200 dark:border-slate-700" />;
      if (t.startsWith("- ") || t.startsWith("* "))
        return (
          <div
            key={i}
            className="ml-4 flex gap-2 py-0.5 text-sm text-slate-600 dark:text-slate-400"
          >
            <span className="mt-0.5 text-blue-500">•</span>
            <span>{formatBold(t.replace(/^[-*]\s+/, ""))}</span>
          </div>
        );
      if (/^\d+\.\s/.test(t)) {
        const n = t.match(/^(\d+)\./)?.[1] || "";
        return (
          <div
            key={i}
            className="ml-4 flex gap-2 py-0.5 text-sm text-slate-600 dark:text-slate-400"
          >
            <span className="min-w-[1.5rem] font-medium text-blue-600">{n}.</span>
            <span>{formatBold(t.replace(/^\d+\.\s+/, ""))}</span>
          </div>
        );
      }
      if (t.startsWith("|") && t.endsWith("|")) {
        if (/^\|[\s\-:]+\|/.test(t) && !t.match(/[a-zA-Z]/)) return null;
        const cells = t
          .split("|")
          .filter(Boolean)
          .map((c) => c.trim());
        return (
          <div
            key={i}
            className="grid gap-2 border-b border-slate-100 py-1 text-sm dark:border-slate-800"
            style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}
          >
            {cells.map((cell, j) => (
              <span key={j} className="text-slate-600 dark:text-slate-400">
                {formatBold(cell)}
              </span>
            ))}
          </div>
        );
      }
      if (t.startsWith("**") && t.endsWith("**"))
        return (
          <p key={i} className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t.replace(/\*\*/g, "")}
          </p>
        );
      return (
        <p key={i} className="py-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {formatBold(t)}
        </p>
      );
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const sectionFiles = (section: string) => uploadedFiles.filter((f) => f.section === section);

  return (
    <PageContainer maxWidth="7xl">
      {/* Hidden file inputs */}
      <input
        ref={specFileRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={handleFileUpload("specs")}
      />
      <input
        ref={docFileRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.png"
        onChange={handleFileUpload("documents")}
      />
      <input
        ref={photoFileRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,.pdf"
        onChange={handleFileUpload("photos")}
      />

      <PageHero
        section="claims"
        title="Project Plan Builder"
        subtitle="Build AI-powered project plans for any trade — exported as professional PDFs"
        icon={<Layers className="h-5 w-5" />}
      >
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            GPT-4o Powered
          </Badge>
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            PDF Export
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports/history">
              <Clock className="mr-1 h-3 w-3" />
              Report History
            </Link>
          </Button>
        </div>
      </PageHero>

      <TradesToolJobPicker label="Select job context:" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left Column — Input Controls ── */}
        <div className="space-y-4 lg:col-span-1">
          <PageSectionCard>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Calculator className="h-5 w-5 text-blue-600" />
              Project Details
            </h3>
            <div className="space-y-4">
              {/* Trade Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Trade Type
                </label>
                <select
                  aria-label="Trade Type"
                  value={formData.trade}
                  onChange={(e) => setFormData({ ...formData, trade: e.target.value, jobType: "" })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="roofing">Roofing</option>
                  <option value="siding">Siding</option>
                  <option value="gutters">Gutters &amp; Downspouts</option>
                  <option value="windows">Windows &amp; Doors</option>
                  <option value="hvac">HVAC</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="solar">Solar Installation</option>
                  <option value="general-contractor">General Contracting</option>
                  <option value="restoration">Restoration</option>
                  <option value="painting">Painting</option>
                  <option value="flooring">Flooring</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="drywall">Drywall</option>
                  <option value="insulation">Insulation</option>
                  <option value="fencing">Fencing</option>
                  <option value="masonry">Masonry &amp; Stone</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="concrete">Concrete Work</option>
                  <option value="tpo">TPO (Flat)</option>
                  <option value="epdm">EPDM (Flat)</option>
                </select>
              </div>

              {/* Job Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Job Type
                </label>
                <select
                  aria-label="Job Type"
                  value={formData.jobType}
                  onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select job type...</option>
                  {formData.trade === "roofing" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="replacement">Roof Replacement</option>
                      <option value="repair">Repair Work</option>
                      <option value="inspection">Inspection</option>
                    </>
                  )}
                  {formData.trade === "hvac" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="replacement">System Replacement</option>
                      <option value="repair">Repair/Service</option>
                      <option value="maintenance">Maintenance Contract</option>
                    </>
                  )}
                  {formData.trade === "plumbing" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="repair">Repair Work</option>
                      <option value="remodel">Remodel/Update</option>
                      <option value="emergency">Emergency Service</option>
                    </>
                  )}
                  {formData.trade === "electrical" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="panel-upgrade">Panel Upgrade</option>
                      <option value="rewire">Rewiring</option>
                      <option value="repair">Repair Work</option>
                    </>
                  )}
                  {formData.trade === "solar" && (
                    <>
                      <option value="installation">Solar Installation</option>
                      <option value="expansion">System Expansion</option>
                      <option value="maintenance">Maintenance</option>
                    </>
                  )}
                  {!["roofing", "hvac", "plumbing", "electrical", "solar"].includes(
                    formData.trade
                  ) &&
                    ![
                      "siding",
                      "gutters",
                      "windows",
                      "drywall",
                      "insulation",
                      "fencing",
                      "masonry",
                    ].includes(formData.trade) && (
                      <>
                        <option value="installation">New Installation</option>
                        <option value="remodel">Remodel/Renovation</option>
                        <option value="repair">Repair Work</option>
                        <option value="custom">Custom Project</option>
                      </>
                    )}
                  {formData.trade === "siding" && (
                    <>
                      <option value="installation">New Siding Installation</option>
                      <option value="replacement">Siding Replacement</option>
                      <option value="repair">Siding Repair</option>
                      <option value="wrap">Soffit &amp; Fascia Wrap</option>
                    </>
                  )}
                  {formData.trade === "gutters" && (
                    <>
                      <option value="installation">Gutter Installation</option>
                      <option value="replacement">Gutter Replacement</option>
                      <option value="repair">Gutter Repair</option>
                      <option value="guards">Gutter Guard Install</option>
                    </>
                  )}
                  {formData.trade === "windows" && (
                    <>
                      <option value="replacement">Window Replacement</option>
                      <option value="new-construction">New Construction Windows</option>
                      <option value="door-replacement">Door Replacement</option>
                      <option value="storm">Storm Window/Door Install</option>
                    </>
                  )}
                  {formData.trade === "drywall" && (
                    <>
                      <option value="installation">New Drywall Install</option>
                      <option value="repair">Drywall Repair/Patch</option>
                      <option value="finishing">Tape, Mud &amp; Finish</option>
                      <option value="water-damage">Water Damage Repair</option>
                    </>
                  )}
                  {formData.trade === "insulation" && (
                    <>
                      <option value="attic">Attic Insulation</option>
                      <option value="wall">Wall Insulation</option>
                      <option value="spray-foam">Spray Foam</option>
                      <option value="removal">Insulation Removal</option>
                    </>
                  )}
                  {formData.trade === "fencing" && (
                    <>
                      <option value="installation">New Fence Installation</option>
                      <option value="replacement">Fence Replacement</option>
                      <option value="repair">Fence Repair</option>
                      <option value="gate">Gate Installation</option>
                    </>
                  )}
                  {formData.trade === "masonry" && (
                    <>
                      <option value="repair">Masonry Repair</option>
                      <option value="stone-veneer">Stone Veneer</option>
                      <option value="chimney">Chimney Repair</option>
                      <option value="retaining-wall">Retaining Wall</option>
                    </>
                  )}
                </select>
              </div>

              {/* Timeline */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Expected Timeline
                </label>
                <select
                  aria-label="Timeline"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="1-3-days">1-3 Days</option>
                  <option value="1-week">1 Week</option>
                  <option value="2-4-weeks">2-4 Weeks</option>
                  <option value="1-3-months">1-3 Months</option>
                  <option value="3-6-months">3-6 Months</option>
                  <option value="6-months-plus">6+ Months</option>
                </select>
              </div>

              {/* Project Size */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Project Size / Scope
                </label>
                <input
                  type="text"
                  value={formData.projectSize}
                  onChange={(e) => setFormData({ ...formData, projectSize: e.target.value })}
                  placeholder="e.g., 1200 sq ft, 3 rooms, full house"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Budget Range (Optional)
                </label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="e.g., $10,000 - $15,000"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Project Summary + Upload */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Project Summary
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => specFileRef.current?.click()}
                  >
                    <Upload className="h-3 w-3" />
                    Attach Specs
                  </Button>
                </div>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Describe your project requirements, scope, special conditions..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                {sectionFiles("specs").length > 0 && (
                  <div className="mt-2 space-y-1">
                    {sectionFiles("specs").map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded bg-blue-50 px-2 py-1 text-xs dark:bg-blue-900/20"
                      >
                        <Paperclip className="h-3 w-3 text-blue-500" />
                        <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
                          {f.name}
                        </span>
                        <span className="text-slate-400">{formatSize(f.size)}</span>
                        <button
                          onClick={() => removeFile(f.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents + Upload */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Documents & References
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => docFileRef.current?.click()}
                  >
                    <Upload className="h-3 w-3" />
                    Upload Docs
                  </Button>
                </div>
                <textarea
                  value={formData.documents}
                  onChange={(e) => setFormData({ ...formData, documents: e.target.value })}
                  placeholder="Links to plans, specs, blueprints, or any reference materials..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                {sectionFiles("documents").length > 0 && (
                  <div className="mt-2 space-y-1">
                    {sectionFiles("documents").map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs dark:bg-green-900/20"
                      >
                        <Paperclip className="h-3 w-3 text-green-500" />
                        <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
                          {f.name}
                        </span>
                        <span className="text-slate-400">{formatSize(f.size)}</span>
                        <button
                          onClick={() => removeFile(f.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Site Photos Upload */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Site Photos
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => photoFileRef.current?.click()}
                  >
                    <Upload className="h-3 w-3" />
                    Upload Photos
                  </Button>
                </div>
                {sectionFiles("photos").length > 0 ? (
                  <div className="space-y-1">
                    {sectionFiles("photos").map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded bg-purple-50 px-2 py-1 text-xs dark:bg-purple-900/20"
                      >
                        <Paperclip className="h-3 w-3 text-purple-500" />
                        <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
                          {f.name}
                        </span>
                        <span className="text-slate-400">{formatSize(f.size)}</span>
                        <button
                          onClick={() => removeFile(f.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => photoFileRef.current?.click()}
                    className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-4 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:border-blue-600"
                  >
                    <Upload className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                    <p className="text-xs text-slate-500">Drop photos here or click to upload</p>
                  </div>
                )}
              </div>

              {/* Final Notes — AI Enhanced */}
              <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-3 dark:border-indigo-800 dark:from-indigo-950/30 dark:to-blue-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <label className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                    Final Touches & Special Requests
                  </label>
                </div>
                <p className="mb-2 text-xs text-indigo-600 dark:text-indigo-400">
                  AI will incorporate these details — describe any last-minute requirements, special
                  conditions, client preferences, or unique considerations.
                </p>
                <textarea
                  value={formData.finalNotes}
                  onChange={(e) => setFormData({ ...formData, finalNotes: e.target.value })}
                  placeholder="e.g., Client prefers GAF Timberline HDZ shingles in Charcoal. HOA requires pre-approval. Dumpster on driveway only. Include warranty upgrade option..."
                  rows={4}
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-indigo-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generating || !formData.trade || !formData.jobType}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI is generating your plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Project Plan
                  </>
                )}
              </Button>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    GPT-4o generates a comprehensive 16-section plan including scope, phased
                    execution, materials, costs, and compliance. Export as PDF for clients or add to
                    claims packets.
                  </p>
                </div>
              </div>
            </div>
          </PageSectionCard>
        </div>

        {/* ── Right Column — Result Area ── */}
        <div className="lg:col-span-2">
          <PageSectionCard>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-blue-600" />
              Generated Project Plan
            </h3>

            {!result && !generating && (
              <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                  <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">
                  Ready to Generate
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Fill in the details and click &ldquo;Generate AI Project Plan&rdquo;. GPT-4o will
                  create a comprehensive plan with 16 professional sections.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    "Scope of Work",
                    "Phased Execution",
                    "Materials List",
                    "Cost Estimate",
                    "Timeline",
                    "Safety & Compliance",
                  ].map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {generating && (
              <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-12 text-center dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/20">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  GPT-4o is building your project plan...
                </p>
                <p className="mt-1 text-xs text-slate-500">This typically takes 10-20 seconds</p>
              </div>
            )}

            {result && !generating && (
              <div className="space-y-4">
                <div className="max-h-[600px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                  {renderMarkdownPreview(result)}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {exporting ? "Exporting…" : "Download PDF"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([result], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "project-plan.txt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download TXT
                  </Button>
                  <Button variant="outline" onClick={() => setShowEmailModal(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email Plan
                  </Button>
                  <Button variant="outline" disabled={saving} onClick={handleTransferToProposal}>
                    <FileText className="mr-2 h-4 w-4" />
                    {saving ? "Creating…" : "Transfer to Proposal"}
                  </Button>
                  <Button variant="outline" onClick={handleGenerate}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>

                {showEmailModal && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Send plan via email:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                      <Button size="sm" disabled={emailing || !emailTo} onClick={handleEmailPlan}>
                        {emailing ? "Sending…" : "Send"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowEmailModal(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </PageSectionCard>
        </div>
      </div>

      {/* ── Saved Plans ── */}
      {savedPlans.length > 0 && (
        <PageSectionCard>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Save className="h-5 w-5 text-blue-600" />
            Saved Project Plans
          </h3>
          <div className="space-y-2">
            {savedPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{plan.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(plan.createdAt).toLocaleDateString()} · {plan.status}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {plan.status}
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports/history">View all in Report History →</Link>
            </Button>
          </div>
        </PageSectionCard>
      )}
    </PageContainer>
  );
}

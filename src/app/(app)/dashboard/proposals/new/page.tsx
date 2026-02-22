"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import type { PacketType, ProposalBuildResponse, TonePreset } from "@/lib/proposals/types";

export default function NewProposalPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { userId, orgId } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Form state
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [packetType, setPacketType] = useState<PacketType>("retail");
  const [tone, setTone] = useState<TonePreset | "">(""); // Empty string = auto-detect

  // Data state
  const [leads, setLeads] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);

  // Proposal state
  const [draft, setDraft] = useState<ProposalBuildResponse | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // UI state
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads on mount
  useEffect(() => {
    if (!userId || !orgId) return;

    fetch(`/api/leads?orgId=${orgId}`)
      .then((res) => res.json())
      .then((data) => {
        setLeads(data.leads || []);
        setIsLoadingLeads(false);
      })
      .catch(() => {
        setIsLoadingLeads(false);
      });
  }, [userId, orgId]);

  // Fetch jobs on mount
  useEffect(() => {
    if (!userId || !orgId) return;

    fetch(`/api/jobs?orgId=${orgId}`)
      .then((res) => res.json())
      .then((data) => {
        setJobs(data.jobs || []);
        setIsLoadingJobs(false);
      })
      .catch(() => {
        setIsLoadingJobs(false);
      });
  }, [userId, orgId]);

  // Filter jobs by selected lead
  useEffect(() => {
    if (!selectedLeadId) {
      setFilteredJobs(jobs);
    } else {
      setFilteredJobs(jobs.filter((job) => job.leadId === selectedLeadId));
    }
  }, [selectedLeadId, jobs]);

  // Build proposal with AI
  const handleBuild = async () => {
    if (!selectedLeadId || !selectedJobId) {
      setError("Please select both a lead and a job");
      return;
    }

    setIsBuilding(true);
    setError(null);

    try {
      const res = await fetch("/api/proposals/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadId,
          jobId: selectedJobId,
          packetType,
          tone: tone || undefined, // Only send if user explicitly selected a tone
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to build proposal");
      }

      const data: ProposalBuildResponse = await res.json();
      setDraft(data);
      setDraftId(data.draftId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBuilding(false);
    }
  };

  // Render to PDF
  const handleRender = async () => {
    if (!draftId) return;

    setIsRendering(true);
    setError(null);

    try {
      const template = `${packetType}/v1`;
      const res = await fetch("/api/proposals/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          template,
          options: { includeEvidence: true },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to render PDF");
      }

      const data = await res.json();
      setPdfUrl(data.pdfUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRendering(false);
    }
  };

  // Publish proposal
  const handlePublish = async () => {
    if (!draftId || !pdfUrl) return;

    setIsPublishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/proposals/${draftId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to publish proposal");
      }

      // Success - redirect to dashboard
      router.push("/dashboard?proposalPublished=true");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Quick weather fetch
  const handleAddWeather = async () => {
    if (!selectedLeadId) return;
    setError(null);

    try {
      const res = await fetch(`/api/weather/quick?leadId=${selectedLeadId}`);
      if (!res.ok) throw new Error("Failed to fetch weather");
      const data = await res.json();
      alert(`Weather added: ${data.condition || "Unknown"}`);
    } catch (err) {
      setError(err.message);
    }
  };

  // Check for missing data (derived from draft context if available)
  const missingWeather = draft && !draft.context.weather;
  const missingDol = draft && !draft.context.dol;
  const missingEvidence = draft && draft.context.evidence.length === 0;

  return (
    <div className="min-h-screen bg-[var(--surface-2)] p-3 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex min-h-[44px] items-center gap-2 text-slate-700 hover:text-[color:var(--text)] dark:text-slate-300"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-[color:var(--text)] sm:text-3xl">
            Create New Proposal
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 sm:text-base">
            Generate AI-powered proposals with live preview
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Select Lead & Job */}
        {!draft && (
          <div className="mb-6 rounded-lg bg-[var(--surface-1)] p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold sm:text-xl">Step 1: Select Lead & Job</h2>

            <div className="grid grid-cols-1 gap-6">
              {/* Lead Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Lead
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  disabled={isLoadingLeads}
                  className="min-h-[44px] w-full rounded-lg border border-[color:var(--border)] px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  aria-label="Select lead for proposal"
                >
                  <option value="">{isLoadingLeads ? "Loading leads..." : "Select a lead"}</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} - {lead.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Job
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  disabled={isLoadingJobs || !selectedLeadId}
                  className="min-h-[44px] w-full rounded-lg border border-[color:var(--border)] px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-[var(--surface-1)]"
                  aria-label="Select job for proposal"
                >
                  <option value="">{isLoadingJobs ? "Loading jobs..." : "Select a job"}</option>
                  {filteredJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.propertyType || "Unknown"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Packet Type Selector */}
            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-[color:var(--text)]">
                Proposal Type
              </label>
              <div className="grid grid-cols-1 gap-3">
                {/* Retail */}
                <button
                  onClick={() => setPacketType("retail")}
                  className={`min-h-[44px] rounded-lg border-2 p-4 text-left transition-all ${
                    packetType === "retail"
                      ? "border-blue-500 bg-blue-50"
                      : "border-[color:var(--border)] hover:border-[color:var(--border)]"
                  }`}
                >
                  <div className="font-semibold text-[color:var(--text)]">Retail</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Homeowner proposals - sales-focused, trust-building
                  </div>
                </button>

                {/* Claims */}
                <button
                  onClick={() => setPacketType("claims")}
                  className={`min-h-[44px] rounded-lg border-2 p-4 text-left transition-all ${
                    packetType === "claims"
                      ? "border-blue-500 bg-blue-50"
                      : "border-[color:var(--border)] hover:border-[color:var(--border)]"
                  }`}
                >
                  <div className="font-semibold text-[color:var(--text)]">Claims</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Insurance packets - carrier-ready, evidence-based
                  </div>
                </button>

                {/* Contractor */}
                <button
                  onClick={() => setPacketType("contractor")}
                  className={`min-h-[44px] rounded-lg border-2 p-4 text-left transition-all ${
                    packetType === "contractor"
                      ? "border-blue-500 bg-blue-50"
                      : "border-[color:var(--border)] hover:border-[color:var(--border)]"
                  }`}
                >
                  <div className="font-semibold text-[color:var(--text)]">Contractor</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    GC-to-GC proposals - scope, timeline, pricing
                  </div>
                </button>
              </div>
            </div>

            {/* Tone Preset Selector */}
            <div className="mt-6">
              <label
                htmlFor="tone-select"
                className="mb-2 block text-sm font-medium text-[color:var(--text)]"
              >
                Writing Tone (Optional)
              </label>
              <select
                id="tone-select"
                value={tone}
                onChange={(e) => setTone(e.target.value as TonePreset | "")}
                className="min-h-[44px] w-full rounded-lg border border-[color:var(--border)] px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto (Smart Detection)</option>
                <option value="homeowner">Homeowner — Warm & Reassuring</option>
                <option value="gc">General Contractor — Professional</option>
                <option value="carrier">Insurance Carrier — Formal</option>
                <option value="pa-legal">Public Adjuster / Legal — Precise</option>
              </select>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                AI will automatically adjust tone if not specified
              </p>
            </div>

            {/* Missing Data Chips */}
            {draft && (missingWeather || missingDol || missingEvidence) && (
              <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="mb-3 text-sm font-medium text-yellow-800">
                  💡 Enhance your proposal by adding missing data:
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingWeather && (
                    <button
                      onClick={handleAddWeather}
                      className="min-h-[44px] rounded-md border border-yellow-300 bg-[var(--surface-1)] px-3 py-2 text-sm text-yellow-800 transition-colors hover:bg-yellow-100"
                    >
                      + Add Weather Data
                    </button>
                  )}
                  {missingDol && (
                    <button
                      onClick={() => setError("Date of Loss input modal not yet implemented")}
                      className="min-h-[44px] rounded-md border border-yellow-300 bg-[var(--surface-1)] px-3 py-2 text-sm text-yellow-800 transition-colors hover:bg-yellow-100"
                    >
                      + Add Date of Loss
                    </button>
                  )}
                  {missingEvidence && (
                    <button
                      onClick={() => setError("CompanyCam integration not yet implemented")}
                      className="min-h-[44px] rounded-md border border-yellow-300 bg-[var(--surface-1)] px-3 py-2 text-sm text-yellow-800 transition-colors hover:bg-yellow-100"
                    >
                      + Add Evidence Photos
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Build Button */}
            <div className="mt-6">
              <Button
                onClick={handleBuild}
                disabled={!selectedLeadId || !selectedJobId || isBuilding}
                className="min-h-[44px] w-full"
              >
                {isBuilding ? "Generating with AI..." : "Generate Proposal with AI"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Edit & Preview */}
        {draft && (
          <div className="grid grid-cols-1 gap-6">
            {/* Editable Sections */}
            <div className="rounded-lg bg-[var(--surface-1)] p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold sm:text-xl">Edit Sections</h2>

              {/* Summary */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Executive Summary
                </label>
                <textarea
                  value={draft.ai.summary}
                  onChange={(e) => {
                    setDraft({
                      ...draft,
                      ai: { ...draft.ai, summary: e.target.value },
                    });
                    // Track analytics: proposal.section.regenerated
                    logger.info("[Analytics] proposal.section.regenerated", {
                      draftId: draft.draftId,
                      section: "summary",
                      lengthBefore: draft.ai.summary.length,
                      lengthAfter: e.target.value.length,
                    });
                  }}
                  rows={4}
                  className="w-full rounded-lg border border-[color:var(--border)] px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter executive summary..."
                />
              </div>

              {/* Scope */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Scope of Work
                </label>
                <textarea
                  value={draft.ai.scope}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ai: { ...draft.ai, scope: e.target.value },
                    })
                  }
                  rows={6}
                  className="w-full rounded-lg border border-[color:var(--border)] px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter scope of work..."
                />
              </div>

              {/* Terms */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Terms & Conditions
                </label>
                <textarea
                  value={draft.ai.terms}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ai: { ...draft.ai, terms: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-[color:var(--border)] px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter terms and conditions..."
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
                  Additional Notes
                </label>
                <textarea
                  value={draft.ai.notes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ai: { ...draft.ai, notes: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-[color:var(--border)] px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleRender}
                  disabled={isRendering || !!pdfUrl}
                  className="min-h-[44px] flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isRendering ? "Rendering PDF..." : pdfUrl ? "PDF Ready" : "Render PDF"}
                </Button>

                {pdfUrl && (
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="min-h-[44px] flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {isPublishing ? "Publishing..." : "Publish"}
                  </Button>
                )}
              </div>

              {/* Download Link */}
              {pdfUrl && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-2 font-medium text-green-800">✓ PDF Ready!</p>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      // Track analytics: proposal.pdf.downloaded
                      logger.info("[Analytics] proposal.pdf.downloaded", {
                        draftId: draft.draftId,
                        pdfUrl,
                      });
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Download PDF →
                  </a>
                </div>
              )}
            </div>

            {/* Right: Live Preview */}
            <div className="rounded-lg bg-[var(--surface-1)] p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Live Preview</h2>
              <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)]">
                <iframe
                  src={`/proposal/print?id=${draftId}&template=${packetType}/v1`}
                  className="h-[800px] w-full"
                  title="Proposal Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

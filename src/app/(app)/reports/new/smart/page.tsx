"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { ReportPreviewLayout } from "@/components/report/ReportPreviewLayout";
import { logger } from "@/lib/logger";
import { GeneratedReport, ReportAudience, ReportKind } from "@/lib/report-engine/report-types";

type ClaimLite = {
  id: string;
  claimNumber: string | null;
  insured_name: string | null;
  propertyAddress: string | null;
  typeOfLoss: string | null;
  dateOfLoss: string | null;
  roofType: string | null;
};

export default function SmartReportBuilderPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const initialClaimId = searchParams?.get("claimId") || "";

  const [claims, setClaims] = useState<ClaimLite[]>([]);
  const [claimId, setClaimId] = useState(initialClaimId);
  const [reportType, setReportType] = useState<ReportKind>("CLAIMS_READY");
  const [audience, setAudience] = useState<ReportAudience>("ADJUSTER");
  const [address, setAddress] = useState("");
  const [roofType, setRoofType] = useState<string | undefined>();
  const [lossType, setLossType] = useState<string | undefined>();

  const [addons, setAddons] = useState({
    includeWeather: true,
    includeCodeCitations: true,
    includeManufacturerSpecs: true,
    includePhotoDocumentation: true,
    includeMissingItemsSummary: true,
    includeFinancialBreakdown: true,
    includeRetailOptions: false,
    includeColorBoards: false,
    includeSafetyNotes: false,
    includeInspectionNotes: true,
    includeMaterialBreakdown: false,
    includeWarrantyInfo: true,
    includeGoodBetterBest: false,
  });

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // OPTIONAL: fetch a lightweight list of claims for the dropdown
  useEffect(() => {
    async function loadClaims() {
      try {
        const res = await fetch("/api/claims/list-lite");
        if (!res.ok) return;
        const data = await res.json();
        setClaims(data.claims ?? []);
      } catch (e) {
        logger.error("Failed to load claims list", e);
      }
    }
    void loadClaims();
  }, []);

  // When claim changes, we can auto-fill address/loss/roofType if claim list has it
  useEffect(() => {
    const c = claims.find((c) => c.id === claimId);
    if (!c) return;
    setAddress(c.propertyAddress || "");
    setLossType(c.typeOfLoss || undefined);
    setRoofType(c.roofType || undefined);
  }, [claimId, claims]);

  function toggleAddon(key: keyof typeof addons) {
    setAddons((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setReport(null);

    if (!claimId || !address) {
      setError("Claim and property address are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/reports/build-smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          reportType,
          audience,
          addonPayload: addons,
          address,
          roofType,
          lossType,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error || "Failed to build report.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as GeneratedReport;
      setReport(data);
    } catch (err) {
      logger.error("Report build error", err);
      setError(err.message || "Failed to build report.");
      setLoading(false);
    }
  }

  function copyJson() {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).catch(() => {});
  }

  function downloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${report.meta?.claimNumber || claimId || "claim"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 py-6">
      <PageHero
        section="reports"
        title="Smart AI Report Builder"
        subtitle="Choose a claim, select a report type, pick your audience, and toggle which sections you want. SkaiScraper will generate a structured report you can print or export."
      >
        <a
          href="/reports/history"
          className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
        >
          Report History
        </a>
      </PageHero>

      {/* Builder Form */}
      <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border bg-card p-4">
        {/* Row: claim + report type + audience */}
        <div className="grid gap-3 text-xs md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium">Claim</label>
            <select
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              aria-label="Select claim for report"
            >
              <option value="">Select a claim…</option>
              {claims.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.claimNumber || c.id.slice(0, 8)} – {c.insured_name || "Insured"} –{" "}
                  {c.propertyAddress || "Address"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium" id="report-type-label">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportKind)}
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              aria-labelledby="report-type-label"
            >
              <option value="CLAIMS_READY">Claims-Ready Adjuster Report</option>
              <option value="RETAIL_PROPOSAL">Retail Proposal</option>
              <option value="QUICK">Quick Snapshot</option>
              <option value="PUBLIC_ADJUSTER">Public Adjuster Report</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium" id="audience-label">
              Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as ReportAudience)}
              aria-labelledby="audience-label"
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="ADJUSTER">Adjuster / Carrier</option>
              <option value="HOMEOWNER">Homeowner</option>
              <option value="RETAIL">Retail Client</option>
              <option value="INTERNAL">Internal Team</option>
            </select>
          </div>
        </div>

        {/* Address / loss / roof meta */}
        <div className="grid gap-3 text-xs md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium">Property Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              placeholder="123 Main St, City, ST"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium">Roof Type (optional)</label>
            <input
              value={roofType ?? ""}
              onChange={(e) => setRoofType(e.target.value || undefined)}
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              placeholder="Shingle, Tile, Metal..."
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium">Type of Loss (optional)</label>
            <input
              value={lossType ?? ""}
              onChange={(e) => setLossType(e.target.value || undefined)}
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              placeholder="Hail, Wind, Water..."
            />
          </div>
        </div>

        {/* Addon Toggles */}
        <div className="space-y-2 text-xs">
          <p className="text-[11px] font-medium">Include in report:</p>
          <div className="grid gap-2 md:grid-cols-3">
            {(
              [
                ["includeWeather", "Weather verification"],
                ["includeCodeCitations", "Code citations"],
                ["includeManufacturerSpecs", "Manufacturer specs"],
                ["includePhotoDocumentation", "Photo documentation"],
                ["includeMissingItemsSummary", "Missing item summary"],
                ["includeFinancialBreakdown", "Financial breakdown"],
                ["includeRetailOptions", "Retail options"],
                ["includeColorBoards", "Color boards"],
                ["includeSafetyNotes", "Safety notes"],
                ["includeInspectionNotes", "Inspection notes"],
                ["includeMaterialBreakdown", "Material breakdown"],
                ["includeWarrantyInfo", "Warranty info"],
                ["includeGoodBetterBest", "Good / Better / Best"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={addons[key]}
                  onChange={() => toggleAddon(key)}
                  className="h-3 w-3 rounded"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Building Report..." : "🔥 Generate Report"}
          </button>

          {report && (
            <>
              <button
                type="button"
                onClick={copyJson}
                className="rounded-full border px-3 py-1 text-[11px] transition-colors hover:bg-muted"
              >
                📋 Copy JSON
              </button>
              <button
                type="button"
                onClick={downloadJson}
                className="rounded-full border px-3 py-1 text-[11px] transition-colors hover:bg-muted"
              >
                💾 Download JSON
              </button>
              <button
                type="button"
                onClick={printReport}
                className="rounded-full border px-3 py-1 text-[11px] transition-colors hover:bg-muted"
              >
                🖨️ Print / Save PDF
              </button>
            </>
          )}

          {error && <span className="text-[11px] text-red-600">{error}</span>}
        </div>
      </form>

      {/* Report Preview */}
      {report && (
        <div className="rounded-2xl border bg-background p-4">
          <ReportPreviewLayout report={report} />
        </div>
      )}
    </div>
  );
}

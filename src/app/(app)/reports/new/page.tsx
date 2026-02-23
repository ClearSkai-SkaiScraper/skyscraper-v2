"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PdfPreviewModal } from "@/components/reports/PdfPreviewModal";
import { PresetSelector } from "@/components/reports/PresetSelector";
import { logger } from "@/lib/logger";

interface Claim {
  id: string;
  claimNumber: string;
  title: string;
  status: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [loadingClaims, setLoadingClaims] = useState(true);

  // ✅ PHASE R: PDF Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Add-ons multi-select (no auto-advance)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [reportTemplate, setReportTemplate] = useState<"claims" | "retail" | "">("");

  const addons = [
    { key: "weather", label: "Weather Verification" },
    { key: "map", label: "Map Snapshot" },
    { key: "branding", label: "Branding Block" },
    { key: "codes", label: "Code Compliance" },
    { key: "vendor", label: "Vendor & Color" },
    { key: "qr", label: "QR / Share Link" },
  ];

  const toggleAddon = (key: string) => {
    setSelectedAddons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ✅ P2: Fetch user's claims on mount
  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch("/api/claims");
        if (res.ok) {
          const data = await res.json();
          setClaims(data.claims || []);
        }
      } catch (err) {
        logger.error("Failed to fetch claims:", err);
      } finally {
        setLoadingClaims(false);
      }
    }
    fetchClaims();
  }, []);

  // ✅ PHASE R: Load preset callback
  const handleLoadPreset = (preset: any) => {
    setSelectedAddons(preset.sections || []);
    // Load other preset options if needed
  };

  // ✅ PHASE R: Preview PDF (no token charge)
  const handlePreview = async () => {
    if (!reportTemplate || !selectedClaimId) {
      setError("Please select a template and claim");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/reports/generate?mode=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: reportTemplate,
          claimId: selectedClaimId,
          sections: selectedAddons,
          inputs: {},
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate preview");
        setIsGenerating(false);
        return;
      }

      // Get PDF as blob and create object URL
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setIsGenerating(false);
    }
  };

  const createReport = async () => {
    if (!reportTemplate) {
      setError("Please select a report template");
      return;
    }

    // ✅ P2: Require claim selection for reports
    if (!selectedClaimId && reportTemplate === "claims") {
      setError("Please select a claim to generate a report for");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: reportTemplate,
          claimId: selectedClaimId || undefined,
          addOns: selectedAddons,
          sections: selectedAddons, // ✅ P3: Pass sections to API
          inputs: {},
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 402) {
          setError(
            `Insufficient tokens. Balance: ${data.balance || 0}, Required: ${data.required || 1}`
          );
          setLoading(false);
          return;
        }
        if (res.status === 401) {
          setError("Unauthorized. Please sign in again.");
          setLoading(false);
          return;
        }
        if (res.status === 422) {
          setError(data.error || "Invalid report configuration");
          setLoading(false);
          return;
        }
        setError(data.error || data.message || "Failed to create report");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Redirect to canonical report history
      router.push("/reports/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report");
      setLoading(false);
    }
  };

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <a href="/reports/history" className="text-brand-blue text-sm hover:underline">
                ← Back to Report History
              </a>
              <h1 className="mt-2 text-3xl font-bold text-[color:var(--text)]">
                Create New Report
              </h1>
              <p className="mt-2 text-slate-700 dark:text-slate-300">
                Generate a professional report from your photos and inspection data
              </p>
            </div>

            {/* ✅ PHASE R: Preset Selector */}
            {reportTemplate && (
              <PresetSelector
                reportType={reportTemplate.toUpperCase()}
                onLoadPreset={handleLoadPreset}
                currentSections={selectedAddons}
                currentOptions={{}}
              />
            )}
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold">Select Report Template</h2>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReportTemplate("claims")}
                className={`rounded-lg border-2 p-4 text-left transition ${
                  reportTemplate === "claims"
                    ? "border-blue-600 bg-blue-50"
                    : "border-[color:var(--border)] hover:border-[color:var(--border)]"
                }`}
              >
                <div className="font-semibold">Insurance Claims</div>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  For insurance damage reports
                </div>
              </button>
              <button
                type="button"
                onClick={() => setReportTemplate("retail")}
                className={`rounded-lg border-2 p-4 text-left transition ${
                  reportTemplate === "retail"
                    ? "border-blue-600 bg-blue-50"
                    : "border-[color:var(--border)] hover:border-[color:var(--border)]"
                }`}
              >
                <div className="font-semibold">Retail Estimate</div>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  For retail customer proposals
                </div>
              </button>
            </div>
          </div>

          {/* ✅ P2: Claim Selection Dropdown */}
          {reportTemplate === "claims" && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">Select Claim</h2>
              {loadingClaims ? (
                <p className="text-sm text-slate-500">Loading claims...</p>
              ) : claims.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No claims found.{" "}
                  <a href="/claims/new" className="text-blue-600 underline">
                    Create a claim first
                  </a>
                </p>
              ) : (
                <select
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                  aria-label="Select claim for report"
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-2 text-[color:var(--text)]"
                >
                  <option value="">-- Select a claim --</option>
                  {claims.map((claim) => (
                    <option key={claim.id} value={claim.id}>
                      {claim.claimNumber} - {claim.title} ({claim.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-semibold">Add-Ons (Multi-Select)</h2>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {addons.map((a) => (
                <label
                  key={a.key}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition ${
                    selectedAddons.includes(a.key)
                      ? "border-blue-600 bg-blue-50"
                      : "border-[color:var(--border)] hover:border-[color:var(--border)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes(a.key)}
                    onChange={() => toggleAddon(a.key)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{a.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow-sm">
            {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

            {/* ✅ PHASE R: Preview + Download Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={isGenerating || !reportTemplate || !selectedClaimId}
                className="flex-1 rounded-xl border-2 border-blue-600 bg-white px-6 py-4 font-medium text-blue-600 shadow-lg hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
              >
                {isGenerating ? "Generating Preview..." : "Preview PDF"}
              </button>

              <button
                onClick={createReport}
                disabled={loading || !reportTemplate || !selectedClaimId}
                className="bg-brand-blue flex-1 rounded-xl px-6 py-4 font-medium text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating Report..." : "Generate & Download"}
              </button>
            </div>

            <p className="mt-4 text-center text-sm text-slate-700 dark:text-slate-300">
              {!reportTemplate
                ? "Select a template to continue"
                : `Selected: ${reportTemplate.charAt(0).toUpperCase() + reportTemplate.slice(1)} with ${selectedAddons.length} add-ons`}
            </p>
          </div>
        </div>
      </main>

      {/* ✅ PHASE R: PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
        pdfUrl={previewUrl}
        onDownload={createReport}
        isGenerating={loading}
      />
    </>
  );
}

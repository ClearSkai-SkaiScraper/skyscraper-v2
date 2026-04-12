"use client";

import { useUser } from "@clerk/nextjs";
import { AlertCircle, Calculator, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Wizard, WizardStep } from "@/components/common/Wizard";
import { PageHero } from "@/components/layout/PageHero";
import { JobClaimSelector } from "@/components/trades/JobClaimSelector";
import { Button } from "@/components/ui/button";
import { XactimateTable } from "@/components/xactimate/XactimateTable";
import { logger } from "@/lib/logger";
import { XactimateLineItem } from "@/types/xactimate";

type EstimateBuildResponse = {
  estimate: {
    header?: {
      title?: string;
      mode?: string;
      lossType?: string;
      dol?: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    totals?: any;
    notes?: string;
  };
};

export default function EstimateNewPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [claimId, setClaimId] = useState("");
  const [selectedJobOrClaim, setSelectedJobOrClaim] = useState("");
  const [mode, setMode] = useState<"insurance" | "retail" | "hybrid">("insurance");
  const [lossType, setLossType] = useState("");
  const [dol, setDol] = useState("");
  const [damageAssessmentId, setDamageAssessmentId] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [supplementIdsText, setSupplementIdsText] = useState("");
  const [carrierEstimateText, setCarrierEstimateText] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateBuildResponse | null>(null);

  const [lineItems, setLineItems] = useState<XactimateLineItem[]>([]);
  const [taxRate, setTaxRate] = useState(9.1);
  const [opPercent, setOpPercent] = useState(10);
  const [opEnabled, setOpEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapAiItemsToXactimate(items: any[] | undefined): XactimateLineItem[] {
    if (!items) return [];
    return items.map((it, idx) => ({
      id: it.id ?? `ai-${idx}`,
      code: it.code ?? "",
      description: it.description ?? it.name ?? "",
      category: it.category ?? "",
      roomArea: it.area ?? it.roomArea ?? "",
      quantity: Number(it.quantity ?? 1) || 1,
      unit: it.unit ?? "EA",
      unitPrice: Number(it.unitPrice ?? it.price ?? 0) || 0,
      taxable: it.taxable ?? true,
      opEligible: it.opEligible ?? true,
    }));
  }

  async function runBuilder() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setSaveMessage(null);

    try {
      const supplementIds = supplementIdsText
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);

      const res = await fetch("/api/estimates/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId || null,
          mode,
          lossType: lossType || null,
          dol: dol || null,
          damageAssessmentId: damageAssessmentId || null,
          scopeId: scopeId || null,
          supplementIds,
          carrierEstimateText: carrierEstimateText || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as EstimateBuildResponse;
      setResult(data);

      const mapped = mapAiItemsToXactimate(data.estimate.items);
      setLineItems(mapped);
    } catch (err) {
      logger.error("Estimate builder error:", err);
      setError(err.message || "Failed to build estimate.");
    } finally {
      setIsRunning(false);
    }
  }

  async function saveEstimate() {
    if (lineItems.length === 0) {
      setSaveMessage("No line items to save.");
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/estimates/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId || null,
          title: result?.estimate.header?.title ?? null,
          mode,
          taxRate,
          opPercent,
          opEnabled,
          lineItems,
          meta: {
            lossType: lossType || null,
            dol: dol || null,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed with ${res.status}`);
      }

      const data = await res.json();
      setSaveMessage(`✅ Estimate saved (ID: ${data.estimateId})`);

      // Redirect to estimate detail page after 2 seconds
      setTimeout(() => {
        if (claimId) {
          router.push(`/claims/${claimId}`);
        } else {
          router.push(`/estimates`);
        }
      }, 2000);
    } catch (err) {
      logger.error("Save estimate error:", err);
      setSaveMessage(`❌ ${err.message || "Failed to save estimate."}`);
    } finally {
      setIsSaving(false);
    }
  }

  const steps: WizardStep[] = [
    {
      id: "context",
      title: "Job & Mode",
      description: "Select job/claim and estimate mode.",
      render: () => (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Link to Job or Claim (optional)
            </label>
            <JobClaimSelector
              value={selectedJobOrClaim}
              onValueChange={(value) => {
                setSelectedJobOrClaim(value);
                // Extract just the ID part for API calls
                const idPart = value.split(":")[1] || "";
                setClaimId(idPart);
              }}
              placeholder="Select a job or claim to link this estimate…"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Link this estimate to an existing insurance claim, retail job, or lead.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mode *
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                aria-label="Estimate Mode"
              >
                <option value="insurance">Insurance</option>
                <option value="retail">Retail</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Loss Type (optional)
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                placeholder="hail / wind / water"
                value={lossType}
                onChange={(e) => setLossType(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                DOL (optional)
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={dol}
                onChange={(e) => setDol(e.target.value)}
                aria-label="Date of Loss"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sources",
      title: "Data Sources",
      description: "Connect damage assessment, scope, supplements, and carrier estimate.",
      render: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Damage Assessment ID (optional)
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                placeholder="damage_abc123"
                value={damageAssessmentId}
                onChange={(e) => setDamageAssessmentId(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Scope ID (optional)
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                placeholder="scope_xyz789"
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Supplement IDs (one per line, optional)
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
              placeholder="supplement_001
supplement_002"
              value={supplementIdsText}
              onChange={(e) => setSupplementIdsText(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Carrier Estimate Text (optional)
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              placeholder="Paste carrier estimate text for AI to cross-check and enhance..."
              value={carrierEstimateText}
              onChange={(e) => setCarrierEstimateText(e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      id: "run",
      title: "Build & Edit Estimate",
      description:
        "Run AI builder, then edit Xactimate-style line items with O&P and tax controls.",
      render: () => (
        <div className="space-y-4">
          <Button type="button" onClick={runBuilder} disabled={isRunning} className="gap-2">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Building estimate...
              </>
            ) : (
              "Run Estimate Builder"
            )}
          </Button>{" "}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {result && (
            <>
              <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    AI Estimate Generated
                  </h3>
                </div>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <span className="font-medium">Title:</span>{" "}
                    {result.estimate.header?.title ?? "AI Estimate"}
                  </div>
                  <div>
                    <span className="font-medium">Mode:</span>{" "}
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {result.estimate.header?.mode ?? mode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pricing Controls</h3>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      O&amp;P (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                      value={opPercent}
                      onChange={(e) => setOpPercent(Number(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={opEnabled}
                      onChange={(e) => setOpEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Apply O&amp;P
                  </label>
                </div>

                <XactimateTable
                  items={lineItems}
                  setItems={setLineItems}
                  taxRate={taxRate}
                  opPercent={opPercent}
                  opEnabled={opEnabled}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveEstimate}
                  disabled={isSaving || lineItems.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Estimate"
                  )}
                </button>
                {saveMessage && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {saveMessage}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHero
        section="claims"
        title="AI Estimate Builder"
        subtitle="Generate insurance or retail estimates with Xactimate-style line items, O&P, and tax"
        icon={<Calculator className="h-6 w-6" />}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Wizard steps={steps} />
      </div>
    </>
  );
}

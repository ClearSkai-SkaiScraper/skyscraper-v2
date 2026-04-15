"use client";

import { useUser } from "@clerk/nextjs";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Wizard, WizardStep } from "@/components/common/Wizard";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

type DamageBuildApiResponse = {
  damageAssessmentId: string;
  assessment: {
    id: string;
    primaryPeril?: string | null;
    confidence?: number | null;
    summary?: string | null;
  };
  findings: {
    id: string;
    locationFacet?: string | null;
    locationNotes?: string | null;
    elevation?: string | null;
    severity?: string | null;
    damageType?: string | null;
    description?: string | null;
  }[];
};

export default function DamageNewPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [claimId, setClaimId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [photoText, setPhotoText] = useState("");
  const [hoverJsonText, setHoverJsonText] = useState("");
  const [carrierEstimateText, setCarrierEstimateText] = useState("");
  const [notesText, setNotesText] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DamageBuildApiResponse | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  function buildPhotosArray() {
    const lines = photoText
      .split("\n")
      .map((ln) => ln.trim())
      .filter(Boolean);

    return lines.map((url, idx) => ({
      url,
      id: `photo-${idx + 1}`,
      label: `Photo ${idx + 1}`,
      tags: [] as string[],
    }));
  }

  function parseHoverJson() {
    if (!hoverJsonText.trim()) return null;
    try {
      return JSON.parse(hoverJsonText);
    } catch {
      return null;
    }
  }

  async function runDamageBuilder() {
    setIsRunning(true);
    setError(null);
    setResult(null);

    const photos = buildPhotosArray();
    if (photos.length === 0) {
      setIsRunning(false);
      setError("Please provide at least one photo URL (one per line).");
      return;
    }

    const hoverData = parseHoverJson();

    try {
      const res = await fetch("/api/damage/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId || null,
          leadId: leadId || null,
          photos,
          hoverData,
          carrierEstimateText: carrierEstimateText || null,
          notesText: notesText || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as DamageBuildApiResponse;
      setResult(data);
    } catch (err) {
      logger.error("Error running damage builder:", err);
      setError(err.message || "Failed to run damage builder.");
    } finally {
      setIsRunning(false);
    }
  }

  const steps: WizardStep[] = [
    {
      id: "context",
      title: "Select Claim / Context",
      description: "Optional: link this damage assessment to an existing claim or lead.",
      render: () => (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Claim ID (optional)
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              placeholder="e.g. claim_123"
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-600">
              In the future this will be a claim selector modal. For now you can paste an existing
              claim ID or leave blank.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Lead ID (optional)
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              placeholder="e.g. lead_456"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      id: "photos",
      title: "Upload & Tag Photos",
      description: "For now, paste photo URLs. Later this connects to your real photo uploader.",
      render: () => (
        <div className="space-y-3">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Photo URLs (one per line) *
          </label>
          <textarea
            className="min-h-[140px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            placeholder={`https://example.com/roof-front.jpg
https://example.com/roof-rear.jpg
https://example.com/damage-closeup.jpg`}
            value={photoText}
            onChange={(e) => setPhotoText(e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-600">
            Each non-empty line will be sent as a photo URL to the AI Damage Builder. AI will
            analyze these photos for damage patterns.
          </p>
        </div>
      ),
    },
    {
      id: "supporting",
      title: "Attach Supporting Data",
      description: "Optionally add HOVER JSON, carrier estimate text, and internal notes.",
      render: () => (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              HOVER JSON (optional)
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              placeholder='{"measurements": {...}, "roofArea": 2500}'
              value={hoverJsonText}
              onChange={(e) => setHoverJsonText(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-600">
              Paste raw HOVER JSON here if available. Leave blank if not used.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Carrier Estimate Text (optional)
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              placeholder="Paste text from carrier estimate if you want AI to cross-check."
              value={carrierEstimateText}
              onChange={(e) => setCarrierEstimateText(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Internal Notes (optional)
            </label>
            <textarea
              className="min-h-[60px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              placeholder="Any context you want the AI to know about this loss."
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      id: "run-ai",
      title: "Run AI Damage Analysis",
      description: "Run the Damage Builder, then review the AI summary and findings.",
      render: () => (
        <div className="space-y-4">
          <Button
            type="button"
            onClick={runDamageBuilder}
            disabled={isRunning}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Damage Builder...
              </>
            ) : (
              "Run Damage Builder"
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    AI Summary
                  </h2>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Peril:</span>{" "}
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {result.assessment.primaryPeril || "—"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Confidence:</span>{" "}
                    {typeof result.assessment.confidence === "number"
                      ? `${Math.round((result.assessment.confidence ?? 0) * 100)}%`
                      : "—"}
                  </p>
                  {result.assessment.summary && (
                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Summary:</span> {result.assessment.summary}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                  Damage Findings ({result.findings.length})
                </h2>
                {result.findings.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    No findings were returned.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full overflow-hidden rounded-lg border border-gray-200 text-sm dark:border-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            Location
                          </th>
                          <th className="border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            Type
                          </th>
                          <th className="border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            Severity
                          </th>
                          <th className="border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {result.findings.map((f) => (
                          <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              <div className="font-medium">{f.locationFacet || "—"}</div>
                              {f.elevation && (
                                <div className="text-xs text-gray-500">{f.elevation}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                              {f.damageType || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${
                                  f.severity === "severe"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                    : f.severity === "moderate"
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {f.severity || "—"}
                              </span>
                            </td>
                            <td className="max-w-xs truncate px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                              {f.description || f.locationNotes || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {result.damageAssessmentId && (
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/damage/${result.damageAssessmentId}`)}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  >
                    View Assessment
                  </button>
                  {claimId && (
                    <button
                      onClick={() => router.push(`/claims/${claimId}`)}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                    >
                      Back to Claim
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHero
          section="claims"
          title="AI Damage Builder"
          subtitle="Upload photos and let AI analyze damage patterns, severity, and generate findings"
        />

        <Wizard steps={steps} />
      </div>
    </div>
  );
}

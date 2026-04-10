"use client";
import {
  ClipboardList,
  CloudRain,
  Copy,
  FileDown,
  FileText,
  Hammer,
  Layers,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Upload,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AIBuilderActions,
  DamageResultsDisplay,
  useAIClaimsBuilder,
} from "@/components/claims/AIClaimsBuilderIntegration";
import { logger } from "@/lib/logger";
import { recordReportHistory } from "@/lib/reports/history";
import { ClaimNarratives, generateClaimNarratives } from "@/server/claims/claimNarratives";

// Stub functions for photo metadata (module is currently disabled)
async function getPhotoMetaForClaim(
  _claimId: string
): Promise<Array<{ photoId: string; tag?: string; note?: string }>> {
  return [];
}

async function upsertPhotoMeta(_input: {
  claimId: string;
  photoId: string;
  tag?: string;
  note?: string;
}): Promise<{ ok: boolean; record: unknown }> {
  return { ok: false, record: null };
}

interface ClaimLite {
  id: string;
  claimNumber?: string | null;
  title?: string | null;
  propertyAddress?: string | null;
  dateOfLoss?: string | Date | null;
}

interface PhotoMeta {
  file: File;
  tag: string;
  note: string;
}

const TAGS = ["Roof", "Exterior", "Interior", "Gutters", "HVAC", "Misc"];

export function AIClaimsBuilderWizard({
  claims,
  initialClaim,
}: {
  claims: ClaimLite[];
  initialClaim: ClaimLite | null;
}) {
  const [activeClaim, setActiveClaim] = useState<ClaimLite | null>(initialClaim);
  const [step, setStep] = useState<"upload" | "analysis" | "scope">("upload");
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [photoMetaPersisted, setPhotoMetaPersisted] = useState<
    Record<string, { tag?: string; note?: string }>
  >({});
  const [analysisView, setAnalysisView] = useState<ClaimAnalysisView | null>(null);
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot | null>(null);
  const [narratives, setNarratives] = useState<ClaimNarratives | null>(null);
  const [narrativesLoading, setNarrativesLoading] = useState(false);
  const [persistedAssets, setPersistedAssets] = useState<
    Array<{ id: string; filename: string; url: string; tag?: string; note?: string }>
  >([]);

  const {
    aiState,
    analyzePhotos,
    generateLineItems,
    updateLineItem,
    addCustomLineItem,
    removeLineItem,
    saveToDatabase,
    generatePDF,
  } = useAIClaimsBuilder();
  const [depreciationPct, setDepreciationPct] = useState<number>(0);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const metas: PhotoMeta[] = files.map((f) => ({ file: f, tag: "Misc", note: "" }));
    setPhotos((prev) => [...prev, ...metas]);
  };

  const photoSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    photos.forEach((p) => {
      counts[p.tag] = (counts[p.tag] || 0) + 1;
    });
    return counts;
  }, [photos]);

  const suggestions = useMemo(() => {
    if (photos.length >= 6) return [];
    const needed = [
      "Add close-up shingle damage",
      "Capture soft metals (vents)",
      "Include interior leak evidence",
      "Wide elevation shot",
      "Drip edge / eave close-up",
    ];
    return needed.slice(0, 6 - photos.length);
  }, [photos]);

  const runAnalysis = async () => {
    if (!activeClaim || photos.length === 0) return;
    await analyzePhotos(
      photos.map((p) => p.file),
      activeClaim.id
    );
    // Build normalized analysis view from raw damage results (after aiState updates)
    setTimeout(() => {
      setAnalysisView(buildAnalysisView(aiState.damageResults));
    }, 50);
    // Weather snapshot fetch (non-blocking)
    fetchWeather(activeClaim.id)
      .then(setWeatherSnapshot)
      .catch(() => {});
    setStep("analysis");
  };

  const proceedScope = async () => {
    await generateLineItems();
    setStep("scope");
  };

  const rebuildScope = async () => {
    await generateLineItems("Rebuild with current photo + weather context");
  };

  const addMissingCodeItems = async () => {
    // Placeholder: simply re-run generation which could include code upgrades
    await generateLineItems("Add missing code items");
  };

  const copyXactimate = () => {
    const text = aiState.lineItems
      .map(
        (li) =>
          `${li.code}\t${li.description}\t${li.qty}\t${li.unit}\t${li.unitPrice || 0}\t${li.total || 0}`
      )
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleSaveDraft = async () => {
    await saveToDatabase();
    void recordReportHistory({
      type: "AI_CLAIM_SCOPE",
      sourceId: activeClaim?.id,
      title: `Draft Scope ${new Date().toLocaleDateString()}`,
      metadata: { lineItems: aiState.lineItems.length, rcv: totalRCV, codeItems },
    });
  };

  const handleGeneratePDF = async () => {
    await generatePDF();
    const today = new Date().toISOString().split("T")[0];
    const baseName = `Scope_${activeClaim?.claimNumber || activeClaim?.id || "claim"}_${today}_v2`;
    void recordReportHistory({
      type: "claim_pdf",
      sourceId: activeClaim?.id,
      title: baseName,
      metadata: { lineItems: aiState.lineItems.length, rcv: totalRCV, codeItems, depreciationPct },
    });
  };

  const handleSendToRetail = async () => {
    if (!activeClaim) return;
    try {
      void recordReportHistory({
        type: "RETAIL_PROPOSAL_INIT",
        sourceId: activeClaim.id,
        title: `Retail Proposal Init ${new Date().toLocaleDateString()}`,
        metadata: { fromScopeLineItems: aiState.lineItems.length, rcv: totalRCV },
      });
    } catch {}
    window.location.href = `/reports/retail?claimId=${activeClaim.id}`;
  };

  // Load persisted photo metadata + assets if claim changes
  useEffect(() => {
    void (async () => {
      if (!activeClaim) return;
      try {
        const metas = await getPhotoMetaForClaim(activeClaim.id);
        const map: Record<string, { tag?: string; note?: string }> = {};
        metas.forEach((m) => {
          map[m.photoId] = { tag: m.tag, note: m.note };
        });
        setPhotoMetaPersisted(map);
        // Fetch persisted assets with metadata
        const res = await fetch(`/api/claims/${activeClaim.id}/assets-with-meta`).then((r) =>
          r.ok ? r.json() : null
        );
        if (res?.assets) setPersistedAssets(res.assets);
      } catch {}
    })();
  }, [activeClaim]);

  // Generate narratives once analysis view + weather loaded
  useEffect(() => {
    void (async () => {
      if (!activeClaim || !analysisView || narratives) return;
      setNarrativesLoading(true);
      try {
        const n = await generateClaimNarratives({
          claimId: activeClaim.id,
          analysis: analysisView,
          weather: weatherSnapshot || undefined,
        });
        setNarratives(n);
      } catch (e) {
        logger.warn("Narratives generation failed", e);
      } finally {
        setNarrativesLoading(false);
      }
    })();
  }, [activeClaim, analysisView, weatherSnapshot, narratives]);

  const totalRCV = aiState.lineItems.reduce((s, li) => s + (li.total || 0), 0);
  const codeItems = aiState.lineItems.filter((li) => /code|upgrade/i.test(li.description)).length;

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">AI Claims Builder</h3>
              <p className="text-sm text-muted-foreground">
                Step {step === "upload" ? "1" : step === "analysis" ? "2" : "3"} of 3
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="relative flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step === "upload"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary bg-primary/10 text-primary"
                }`}
              >
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Select Claim</p>
                <p className="text-xs text-muted-foreground">Choose your claim to analyze</p>
              </div>
            </div>
          </div>

          <div className="flex h-px w-full max-w-[80px] bg-border" />

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step === "analysis"
                    ? "border-primary bg-primary text-primary-foreground"
                    : step === "scope"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-muted text-muted-foreground"
                }`}
              >
                <Upload className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Upload & Review</p>
                <p className="text-xs text-muted-foreground">Add photos and documentation</p>
              </div>
            </div>
          </div>

          <div className="flex h-px w-full max-w-[80px] bg-border" />

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step === "scope"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-muted text-muted-foreground"
                }`}
              >
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">AI Analysis & Export</p>
                <p className="text-xs text-muted-foreground">Generate scope and PDF</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Select Claim */}
      {step === "upload" && !activeClaim && (
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Select a Claim</h3>
            <p className="text-sm text-muted-foreground">
              Choose the claim you want to build a scope for
            </p>
          </div>

          <div className="mx-auto max-w-md">
            <select
              value=""
              onChange={(e) => {
                const selected = (claims as ClaimLite[]).find((c) => c.id === e.target.value);
                setActiveClaim(selected || null);
              }}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Select claim"
            >
              <option value="">Select a claim...</option>
              {claims.map((claim) => (
                <option key={claim.id} value={claim.id}>
                  {claim.claimNumber || claim.id.slice(0, 8)} -{" "}
                  {claim.propertyAddress || claim.title || "No address"}
                </option>
              ))}
            </select>
          </div>

          {claims.length === 0 && (
            <div className="mt-6 text-center">
              <p className="mb-4 text-sm text-muted-foreground">No claims available</p>
              <button className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90">
                Create New Claim
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Claim Card */}
      {activeClaim && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-lg font-semibold text-foreground">
                  {activeClaim.title || activeClaim.claimNumber || "Untitled Claim"}
                </h4>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Active
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Claim #{activeClaim.claimNumber || activeClaim.id.slice(0, 8)}
              </p>
              {activeClaim.dateOfLoss && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Loss Date: {new Date(activeClaim.dateOfLoss).toLocaleDateString()}
                </p>
              )}
            </div>
            {step === "upload" && (
              <button
                onClick={() => setActiveClaim(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Change Claim
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Upload & Tag Photos */}
      {step === "upload" && activeClaim && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="mb-2 text-lg font-semibold text-foreground">Upload Damage Photos</h3>
              <p className="text-sm text-muted-foreground">
                Upload photos of the damage, tag by area, and add notes to help the AI understand
                the scope.
              </p>
            </div>

            <label
              htmlFor="claim-photo-upload"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-12 text-center transition-all hover:border-primary hover:bg-primary/5"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="mb-2 text-sm font-semibold text-foreground">
                Click or drag photos to upload
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, HEIC • Up to 50MB per file
              </p>
              <input
                id="claim-photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    Uploaded Photos ({photos.length})
                  </h4>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {Object.entries(photoSummary).map(([tag, count]) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-primary"
                      >
                        {tag}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((p, i) => (
                    <div
                      key={i}
                      className={`group relative overflow-hidden rounded-lg border ${
                        selectedPhotoIdx === i
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      } bg-card shadow-sm transition-all hover:shadow-md`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoIdx(i)}
                        className="aspect-video w-full overflow-hidden"
                      // eslint-disable-next-line @next/next/no-img-element
                      >
                        <img
                          src={URL.createObjectURL(p.file)}
                          alt={p.file.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      </button>
                      <div className="space-y-2 p-3">
                        <select
                          aria-label="Photo tag"
                          value={p.tag}
                          onChange={async (e) => {
                            const tag = e.target.value;
                            setPhotos((arr) =>
                              arr.map((x, idx) => (idx === i ? { ...x, tag } : x))
                            );
                            if (activeClaim) {
                              try {
                                await upsertPhotoMeta({
                                  claimId: activeClaim.id,
                                  photoId: p.file.name,
                                  tag,
                                  note: p.note,
                                });
                              } catch {}
                            }
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        >
                          {TAGS.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <input
                          aria-label="Photo note"
                          value={p.note}
                          placeholder="Add note (optional)"
                          onChange={async (e) => {
                            const note = e.target.value;
                            setPhotos((arr) =>
                              arr.map((x, idx) => (idx === i ? { ...x, note } : x))
                            );
                            if (activeClaim) {
                              try {
                                await upsertPhotoMeta({
                                  claimId: activeClaim.id,
                                  photoId: p.file.name,
                                  tag: p.tag,
                                  note,
                                });
                              } catch {}
                            }
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <p className="truncate text-xs text-muted-foreground" title={p.file.name}>
                          {p.file.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Persisted Assets Preview */}
            {persistedAssets.length > 0 && (
              <div className="mt-8">
                <h4 className="mb-2 text-sm font-semibold">Previously Uploaded Assets</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {persistedAssets.slice(0, 9).map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col gap-2 rounded-md border border-[color:var(--border)] bg-[var(--surface-2)] p-2"
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    >
                      // eslint-disable-next-line @next/next/no-img-element
                      <div className="aspect-video overflow-hidden rounded-sm border border-[color:var(--border)]">
                        <img src={a.url} alt={a.filename} className="h-full w-full object-cover" />
                      </div>
                      <p className="truncate text-[10px]" title={a.filename}>
                        {a.filename}
                      </p>
                      {(a.tag || a.note) && (
                        <p className="text-[9px] text-[color:var(--muted)]">
                          {[a.tag, a.note].filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {photos.length > 0 && (
              <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-card p-6">
                <div>
                  <p className="mb-1 text-sm font-semibold text-foreground">
                    {photos.length} {photos.length === 1 ? "photo" : "photos"} uploaded
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {photos.length < 6
                      ? "Add more photos for better analysis, or continue"
                      : "Great photo coverage! Ready for AI analysis"}
                  </p>
                  {suggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Suggested shots:
                      </p>
                      <p className="text-xs text-muted-foreground">{suggestions[0]}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={aiState.isAnalyzing}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiState.isAnalyzing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Continue to Analysis
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: AI Analysis & Results */}
      {step === "analysis" && (
        <div className="space-y-6">
          {/* AI Analysis Results */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="mb-2 text-lg font-semibold text-foreground">AI Damage Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Review AI-detected damage, roof system details, and analysis results
              </p>
            </div>

            {/* Analysis Status */}
            {aiState.isAnalyzing && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Analyzing Photos...</p>
                  <p className="text-xs text-muted-foreground">
                    AI is processing your damage photos
                  </p>
                </div>
              </div>
            )}

            {/* Damage Results */}
            {!aiState.isAnalyzing && aiState.damageResults.length > 0 && (
              <div className="space-y-4">
                <DamageResultsDisplay results={aiState.damageResults} />
              </div>
            )}
          </div>

          {/* Analysis Details Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Roof System Overview</h4>
              </div>
              <RoofOverview analysis={analysisView} />
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Wind className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Slope-by-Slope Damage</h4>
              </div>
              <SlopeTable analysis={analysisView} />
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Hammer className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Trades Impacted</h4>
              </div>
              <TradeImpact analysis={analysisView} />
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CloudRain className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Weather Snapshot</h4>
              </div>
              <WeatherSnapshotCard weather={weatherSnapshot} />
            </div>
          </div>

          {/* AI Narratives */}
          {(narratives || narrativesLoading) && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">AI Narrative</h4>
              </div>
              {narrativesLoading && (
                <p className="text-sm text-muted-foreground">Generating narratives...</p>
              )}
              {narratives && <NarrativeTabs narratives={narratives} />}
            </div>
          )}

          {/* Continue to Scope Button */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-6">
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">Analysis Complete</p>
              <p className="text-xs text-muted-foreground">
                Review the results above, then generate your line item scope
              </p>
            </div>
            <button
              onClick={proceedScope}
              disabled={aiState.isGeneratingLineItems}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiState.isGeneratingLineItems ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ClipboardList className="h-5 w-5" />
                  Generate Scope
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Scope & Export */}
      {step === "scope" && (
        <div className="space-y-6">
          {/* Financials Summary */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Scope & Financials</h3>
            <FinancialBar
              lineItems={aiState.lineItems}
              depreciationPct={depreciationPct}
              onDepChange={setDepreciationPct}
            />
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-semibold text-foreground">Trade-Grouped Line Items</h4>
            <GroupedScopeAccordion
              lineItems={aiState.lineItems}
              onUpdate={updateLineItem}
              onRemove={removeLineItem}
              onAddCustom={addCustomLineItem}
            />
          </div>

          {/* AI Tools & Actions */}
          {aiState.lineItems.length > 0 && (
            <div className="space-y-4">
              {/* AI Enhancement Tools */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold text-foreground">AI Enhancement Tools</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={addMissingCodeItems}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Missing Code Items
                  </button>
                  <button
                    onClick={rebuildScope}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <RefreshCw className="h-4 w-4" /> Rebuild Scope
                  </button>
                  <button
                    onClick={copyXactimate}
                    className="flex items-center gap-2 rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent"
                  >
                    <Copy className="h-4 w-4" /> Copy (Xactimate)
                  </button>
                </div>
              </div>

              {/* Export & Save Options */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold text-foreground">
                  Export & Save Options
                </h4>
                <AIBuilderActions
                  onGeneratePDF={handleGeneratePDF}
                  onSave={handleSaveDraft}
                  isGeneratingPDF={aiState.isGeneratingPDF}
                  isSaving={aiState.isSaving}
                  disabled={aiState.lineItems.length === 0}
                />
              </div>

              {/* Next Steps */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold text-foreground">Next Steps</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSendToRetail}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <FileDown className="h-4 w-4" /> Send to Retail Proposal
                  </button>
                  <button
                    onClick={() => {
                      if (activeClaim)
                        window.location.href = `/claims/rebuttal-builder?claimId=${activeClaim.id}`;
                    }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <FileText className="h-4 w-4" /> Generate Dispute Letter
                  </button>
                </div>
              </div>

              {/* Export Narratives */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold text-foreground">Export Narratives</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  Copy pre-formatted narratives for adjuster communication and documentation
                </p>
                <div className="flex flex-wrap gap-2">
                  <ExportButton
                    label="Copy Room/Slope Summary"
                    getText={() => formatSlopeSummary(analysisView)}
                  />
                  <ExportButton
                    label="Copy Code & Risk Summary"
                    getText={() => formatCodeRiskSummary(analysisView)}
                  />
                  <ExportButton
                    label="Copy Negotiation Script"
                    getText={() => narratives?.adjusterTalkingPoints.join("\n") || "No script"}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StepperItem({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-emerald-600 text-white" : active ? "bg-indigo-600 text-white" : "border border-[color:var(--border)] bg-[var(--surface-2)] text-[color:var(--muted)]"}`}
      >
        {done ? "✓" : label.split(" ")[0]}
      </div>
      <span
        className={`text-[10px] uppercase tracking-wide ${active ? "text-[color:var(--text)]" : "text-[color:var(--muted)]"}`}
      >
        {label}
      </span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AnalysisCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
          {icon}
        </span>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] p-3">
      <span className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function deriveTrades(results: any[]): string[] {
  const map: Record<string, string> = {
    hail: "Roofing",
    shingle: "Roofing",
    gutter: "Gutters",
    vent: "Roofing",
    window: "Windows",
    interior: "Interior",
    leak: "Interior",
  };
  const trades = new Set<string>();
  results.forEach((r) =>
    r.damageTypes.forEach((d: string) => {
      Object.keys(map).forEach((k) => {
        if (d.toLowerCase().includes(k)) trades.add(map[k]);
      });
    })
  );
  return Array.from(trades).length ? Array.from(trades) : ["General"];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function deriveRiskFlags(results: any[]): string[] {
  const flags: string[] = [];
  results.forEach((r) => {
    r.damageTypes.forEach((d: string) => {
      const dl = d.toLowerCase();
      if (dl.includes("missing") || dl.includes("crease"))
        flags.push("Potential roof system compromise");
      if (dl.includes("bruise")) flags.push("Hail impact may require full replacement");
    });
  });
  return Array.from(new Set(flags));
}

// ===================== Deep Analysis Types & Builders =====================
export type SlopeDirection = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW" | "UNKNOWN";

export type ClaimAnalysisView = {
  slopes: Array<{
    direction: SlopeDirection;
    label: string;
    damageTypes: { type: string; count: number }[];
    photos: string[];
    notes?: string;
  }>;
  elevations: Array<{
    name: string;
    damageTypes: { type: string; count: number }[];
    photos: string[];
  }>;
  trades: Array<{
    trade: "Roofing" | "Gutters" | "Siding" | "Paint" | "Interior" | "HVAC" | "Other";
    severity: "Low" | "Medium" | "High";
    keyFindings: string[];
    recommendedActions: string[];
  }>;
  codeFlags: string[];
  riskNotes: string[];
};

type WeatherSnapshot = {
  hail?: string;
  wind?: string;
  eventDate?: string;
  distanceMiles?: number;
  severity?: string; // Minor | Moderate | Severe
};

function buildAnalysisView(
  results: Array<{ fileName: string; damageTypes: string[] }>
): ClaimAnalysisView {
  // Heuristic slope derivation from filename
  const slopeMap: Record<string, { direction: SlopeDirection; label: string }> = {
    front: { direction: "S", label: "Front (South)" },
    rear: { direction: "N", label: "Rear (North)" },
    left: { direction: "W", label: "Left (West)" },
    right: { direction: "E", label: "Right (East)" },
  };

  const slopesAgg: Record<
    string,
    { direction: SlopeDirection; label: string; damage: Record<string, number>; photos: string[] }
  > = {};
  const elevationAgg: Record<string, { damage: Record<string, number>; photos: string[] }> = {};

  results.forEach((r) => {
    const name = r.fileName.toLowerCase();
    const key = Object.keys(slopeMap).find((k) => name.includes(k));
    const slopeKey = key || "unknown";
    if (!slopesAgg[slopeKey]) {
      const meta = key
        ? slopeMap[key]
        : { direction: "UNKNOWN" as SlopeDirection, label: "Unknown Slope" };
      slopesAgg[slopeKey] = {
        direction: meta.direction,
        label: meta.label,
        damage: {},
        photos: [],
      };
    }
    slopesAgg[slopeKey].photos.push(r.fileName);
    r.damageTypes.forEach((d) => {
      slopesAgg[slopeKey].damage[d] = (slopesAgg[slopeKey].damage[d] || 0) + 1;
    });

    // Elevations heuristic (front/rear/left/right elevation)
    const elevKey = key ? `${key}-elevation` : "general";
    if (!elevationAgg[elevKey]) elevationAgg[elevKey] = { damage: {}, photos: [] };
    elevationAgg[elevKey].photos.push(r.fileName);
    r.damageTypes.forEach((d) => {
      elevationAgg[elevKey].damage[d] = (elevationAgg[elevKey].damage[d] || 0) + 1;
    });
  });

  let slopes = Object.values(slopesAgg).map((s) => ({
    direction: s.direction,
    label: s.label,
    damageTypes: Object.entries(s.damage).map(([type, count]) => ({ type, count })),
    photos: s.photos,
  }));
  // Sort slopes in a logical presentation order
  const order = ["Front (South)", "Rear (North)", "Left (West)", "Right (East)", "Unknown Slope"];
  slopes = slopes.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  const elevations = Object.entries(elevationAgg).map(([k, v]) => ({
    name: k === "general" ? "General Elevation" : k.replace("-elevation", " Elevation"),
    damageTypes: Object.entries(v.damage).map(([type, count]) => ({ type, count })),
    photos: v.photos,
  }));

  // Trades severity heuristic
  const tradeCounts: Record<string, number> = {};
  results.forEach((r) =>
    r.damageTypes.forEach((d) => {
      const trade = mapDamageToTrade(d);
      tradeCounts[trade] = (tradeCounts[trade] || 0) + 1;
    })
  );
  const trades = Object.entries(tradeCounts).map(([trade, count]) => ({
    trade: trade as ClaimAnalysisView["trades"][number]["trade"],
    severity: (count > 8 ? "High" : count > 3 ? "Medium" : "Low") as "Low" | "Medium" | "High",
    keyFindings: [`${count} instances of ${trade.toLowerCase()} related damage`],
    recommendedActions: [count > 5 ? "Evaluate for replacement scope" : "Spot repair evaluation"],
  }));

  // Code flags heuristic
  const codeFlagsSet = new Set<string>();
  results.forEach((r) =>
    r.damageTypes.forEach((d) => {
      const dl = d.toLowerCase();
      if (dl.includes("flashing")) codeFlagsSet.add("Flashing replacement per IRC R903");
      if (dl.includes("vent")) codeFlagsSet.add("Ventilation compliance (IRC R806)");
      if (dl.includes("missing")) codeFlagsSet.add("Starter / drip edge continuity check");
      if (dl.includes("pipe") || dl.includes("boot"))
        codeFlagsSet.add("Pipe boot seal (IRC P3103)");
    })
  );

  // Risk notes heuristic
  const riskNotes: string[] = [];
  if (results.some((r) => r.damageTypes.some((d) => /missing|open/i.test(d))))
    riskNotes.push("Open exposure risk – moisture ingress potential");
  if (results.some((r) => r.damageTypes.some((d) => /lift|crease/i.test(d))))
    riskNotes.push("Wind uplift vulnerability – secure system");
  if (results.length === 0) riskNotes.push("No photos analyzed");

  return { slopes, elevations, trades, codeFlags: Array.from(codeFlagsSet), riskNotes };
}

function mapDamageToTrade(d: string): ClaimAnalysisView["trades"][number]["trade"] {
  const dl = d.toLowerCase();
  if (/gutter/.test(dl)) return "Gutters";
  if (/vent|shingle|hail|wind|flashing|pipe/.test(dl)) return "Roofing";
  if (/siding/.test(dl)) return "Siding";
  if (/interior|leak/.test(dl)) return "Interior";
  if (/hvac/.test(dl)) return "HVAC";
  return "Other";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function derivePhotoContext(fileName: string, view: ClaimAnalysisView): string {
  const slope = view.slopes.find((s) => s.photos.includes(fileName));
  const elev = view.elevations.find((e) => e.photos.includes(fileName));
  return `${slope?.label || "Unknown"} • ${elev?.name || "General"}`;
}

// ===================== Weather Snapshot Fetch =====================
async function fetchWeather(claimId: string): Promise<WeatherSnapshot | null> {
  try {
    const list = await fetch(`/api/weather/reports?claimId=${claimId}`).then((r) =>
      r.ok ? r.json() : null
    );
    const first = list?.reports?.[0];
    if (!first) return null;
    // For full detail (hail size etc.) we would fetch /api/weather/reports/[id] but keep lightweight
    return {
      hail: first.primaryPeril === "hail" ? "Reported" : undefined,
      wind: first.primaryPeril === "wind" ? "Reported" : undefined,
      eventDate: first.dol ? new Date(first.dol).toLocaleDateString() : undefined,
      severity:
        first.confidence && first.confidence > 0.7
          ? "Severe"
          : first.confidence && first.confidence > 0.4
            ? "Moderate"
            : "Minor",
    };
  } catch {
    return null;
  }
}

function WeatherSnapshotCard({ weather }: { weather: WeatherSnapshot | null }) {
  if (!weather)
    return <p className="text-[10px] text-[color:var(--muted)]">No weather data yet.</p>;
  return (
    <div className="space-y-1 text-[10px]">
      <p>Event Date: {weather.eventDate || "—"}</p>
      <p>Hail: {weather.hail || "None"}</p>
      <p>Wind: {weather.wind || "None"}</p>
      <p>
        Severity:{" "}
        <span
          className={`font-semibold ${weather.severity === "Severe" ? "text-red-600" : weather.severity === "Moderate" ? "text-amber-600" : "text-green-600"}`}
        >
          {weather.severity}
        </span>
      </p>
    </div>
  );
}

// ===================== Narrative Tabs =====================
function NarrativeTabs({ narratives }: { narratives: ClaimNarratives }) {
  const tabs: Array<{ key: keyof ClaimNarratives; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "adjusterTalkingPoints", label: "Adjuster Points" },
    { key: "codeSummary", label: "Code Summary" },
  ];
  const [active, setActive] = useState<keyof ClaimNarratives>("overview");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`rounded-md border px-3 py-1 text-xs ${active === t.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-[color:var(--border)] bg-[var(--surface-2)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto whitespace-pre-line text-[11px] leading-relaxed">
        {active === "overview" && narratives.overview}
        {active === "adjusterTalkingPoints" &&
          narratives.adjusterTalkingPoints.map((p) => `• ${p}`).join("\n")}
        {active === "codeSummary" && narratives.codeSummary.map((p) => `• ${p}`).join("\n")}
      </div>
    </div>
  );
}

// ===================== Roof Overview =====================
function RoofOverview({ analysis }: { analysis: ClaimAnalysisView | null }) {
  if (!analysis) return <p className="text-[10px] text-[color:var(--muted)]">No analysis yet.</p>;
  const slopeCount = analysis.slopes.length;
  const tradeList = analysis.trades.map((t) => t.trade).join(", ");
  return (
    <div className="space-y-1 text-[10px]">
      <p>Slopes analyzed: {slopeCount}</p>
      <p>Impacted trades: {tradeList || "None"}</p>
      <p>Code flags: {analysis.codeFlags.length || 0}</p>
    </div>
  );
}

function SlopeTable({ analysis }: { analysis: ClaimAnalysisView | null }) {
  if (!analysis) return <p className="text-[10px] text-[color:var(--muted)]">No slope data.</p>;
  return (
    <div className="space-y-2">
      {analysis.slopes.map((s) => (
        <div
          key={s.label}
          className="flex justify-between border-b border-[color:var(--border)] pb-1 text-[10px]"
        >
          <span>{s.label}</span>
          <span>{s.damageTypes.reduce((acc, d) => acc + d.count, 0)} findings</span>
        </div>
      ))}
    </div>
  );
}

function TradeImpact({ analysis }: { analysis: ClaimAnalysisView | null }) {
  if (!analysis) return <p className="text-[10px] text-[color:var(--muted)]">No trade data.</p>;
  return (
    <ul className="space-y-1 text-[10px]">
      {analysis.trades.map((t) => (
        <li key={t.trade}>
          <span
            className={`font-semibold ${t.severity === "High" ? "text-red-600" : t.severity === "Medium" ? "text-amber-600" : "text-green-600"}`}
          >
            {t.trade}
          </span>{" "}
          – {t.severity}
        </li>
      ))}
    </ul>
  );
}

// ===================== Grouped Scope =====================
interface GroupedScope {
  trade: string;
  location: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  totals: { rcv: number; depreciation?: number; acv?: number; codeItemCount: number };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupLineItems(lineItems: any[]): GroupedScope[] {
  const groups: Record<string, GroupedScope> = {};
  const codeRegex = /(drip|starter|vent|flashing|ice|valley)/i;
  lineItems.forEach((li) => {
    const trade = li.code?.startsWith("RFG")
      ? "Roofing"
      : /GUTTER/i.test(li.description)
        ? "Gutters"
        : "Other";
    const location = /front/i.test(li.description)
      ? "Front Slope"
      : /rear/i.test(li.description)
        ? "Rear Slope"
        : /left/i.test(li.description)
          ? "Left Slope"
          : /right/i.test(li.description)
            ? "Right Slope"
            : "General";
    const key = `${trade}::${location}`;
    if (!groups[key])
      groups[key] = { trade, location, items: [], totals: { rcv: 0, codeItemCount: 0 } };
    groups[key].items.push(li);
    const total = li.total || li.qty * (li.unitPrice || 0);
    groups[key].totals.rcv += total;
    if (codeRegex.test(li.description)) groups[key].totals.codeItemCount += 1;
  });
  return Object.values(groups).sort((a, b) => a.trade.localeCompare(b.trade));
}

function FinancialBar({
  lineItems,
  depreciationPct,
  onDepChange,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems: any[];
  depreciationPct: number;
  onDepChange: (n: number) => void;
}) {
  const totalRCV = lineItems.reduce(
    (s, li) => s + (li.total || li.qty * (li.unitPrice || 0) || 0),
    0
  );
  const codeRegex = /(drip|starter|vent|flashing|ice|valley)/i;
  const codeRCV = lineItems
    .filter((li) => codeRegex.test(li.description))
    .reduce((s, li) => s + (li.total || li.qty * (li.unitPrice || 0) || 0), 0);
  const depreciationValue = totalRCV * (depreciationPct / 100);
  const acv = totalRCV - depreciationValue;
  return (
    <div className="space-y-3">
      <div className="grid gap-4 text-xs sm:grid-cols-5">
        <SummaryPill label="Total RCV" value={`$${totalRCV.toFixed(2)}`} />
        <SummaryPill label="Items" value={lineItems.length.toString()} />
        <SummaryPill label="Code Item RCV" value={`$${codeRCV.toFixed(2)}`} />
        <SummaryPill
          label="Depreciation"
          value={`$${depreciationValue.toFixed(2)} (${depreciationPct}%)`}
        />
        <SummaryPill label="ACV" value={`$${acv.toFixed(2)}`} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
          Depreciation %
        </label>
        <input
          aria-label="Depreciation percent"
          type="number"
          value={depreciationPct}
          onChange={(e) => onDepChange(Math.max(0, Math.min(90, parseFloat(e.target.value) || 0)))}
          className="w-20 rounded border border-[color:var(--border)] bg-transparent px-2 py-1 text-[10px]"
        />
      </div>
    </div>
  );
}

function GroupedScopeAccordion({
  lineItems,
  onUpdate,
  onRemove,
  onAddCustom,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (i: number, f: any, v: any) => void;
  onRemove: (i: number) => void;
  onAddCustom: () => void;
}) {
  const groups = groupLineItems(lineItems);
  if (!groups.length)
    return <p className="text-xs text-[color:var(--muted)]">No line items generated yet.</p>;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div
          key={g.trade + g.location}
          className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)]"
        >
          <details className="group" open>
            <summary className="flex cursor-pointer select-none items-center justify-between p-3">
              <span className="text-sm font-semibold">
                {g.trade} • {g.location}
              </span>
              <span className="text-[10px] text-[color:var(--muted)]">
                RCV ${g.totals.rcv.toFixed(2)} • Code {g.totals.codeItemCount}
              </span>
            </summary>
            <div className="overflow-x-auto p-3">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-left">
                    <th className="py-1 pr-2">Code</th>
                    <th className="py-1 pr-2">Description</th>
                    <th className="py-1 pr-2">Qty</th>
                    <th className="py-1 pr-2">Unit</th>
                    <th className="py-1 pr-2">Unit $</th>
                    <th className="py-1 pr-2">Total</th>
                    <th></th>
                  </tr>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                </thead>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <tbody>
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  {g.items.map((li, idx) => {
                    const globalIdx = lineItems.indexOf(li);
                    const codeRegex = /(drip|starter|vent|flashing|ice|valley)/i;
                    const isCode = codeRegex.test(li.description);
                    return (
                      <tr
                        key={globalIdx}
                        className={`border-t border-[color:var(--border)] ${isCode ? "bg-yellow-50/40 dark:bg-yellow-900/20" : ""}`}
                      >
                        <td className="py-1 pr-2">{li.code}</td>
                        <td className="py-1 pr-2">
                          <input
                            aria-label="Item description"
                            value={li.description}
                            onChange={(e) => onUpdate(globalIdx, "description", e.target.value)}
                            className="w-full rounded border border-[color:var(--border)] bg-transparent px-1"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            aria-label="Item quantity"
                            type="number"
                            value={li.qty}
                            onChange={(e) =>
                              onUpdate(globalIdx, "qty", parseFloat(e.target.value) || 0)
                            }
                            className="w-16 rounded border border-[color:var(--border)] bg-transparent px-1"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            aria-label="Item unit"
                            value={li.unit}
                            onChange={(e) => onUpdate(globalIdx, "unit", e.target.value)}
                            className="w-12 rounded border border-[color:var(--border)] bg-transparent px-1"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            aria-label="Unit price"
                            type="number"
                            value={li.unitPrice || 0}
                            onChange={(e) =>
                              onUpdate(globalIdx, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                            className="w-20 rounded border border-[color:var(--border)] bg-transparent px-1"
                          />
                        </td>
                        <td className="py-1 pr-2 font-semibold">
                          ${(li.total || li.qty * (li.unitPrice || 0) || 0).toFixed(2)}
                        </td>
                        <td className="py-1 pr-2">
                          <button
                            aria-label="Remove item"
                            onClick={() => onRemove(globalIdx)}
                            className="text-xs text-red-600"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      ))}
      <button
        onClick={onAddCustom}
        className="rounded-md bg-indigo-600 px-3 py-2 text-xs text-white"
      >
        Add Custom Item
      </button>
    </div>
  );
}

// ===================== Export Helpers =====================
function ExportButton({ label, getText }: { label: string; getText: () => string }) {
  return (
    <button
      onClick={() => {
        const text = getText();
        navigator.clipboard.writeText(text).catch(() => {});
      }}
      className="rounded-md border border-[color:var(--border)] bg-[var(--surface-3)] px-3 py-2 text-[10px] hover:bg-indigo-600 hover:text-white"
    >
      {label}
    </button>
  );
}

function formatSlopeSummary(view: ClaimAnalysisView | null): string {
  if (!view) return "No analysis available.";
  return view.slopes
    .map((s) => `${s.label}: ${s.damageTypes.map((d) => `${d.type}(${d.count})`).join(", ")}`)
    .join("\n");
}

function formatCodeRiskSummary(view: ClaimAnalysisView | null): string {
  if (!view) return "No analysis available.";
  return ["Code Flags:", ...view.codeFlags, "", "Risk Notes:", ...view.riskNotes].join("\n");
}

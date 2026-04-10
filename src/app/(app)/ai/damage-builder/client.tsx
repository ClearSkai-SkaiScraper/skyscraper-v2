"use client";

import {
  AlertCircle,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  Package,
  PenTool,
  Save,
  Search,
  Share2,
  Sparkles,
  Square,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface DamageBuilderClientProps {
  leadId?: string;
  jobId?: string;
}

interface PhotoItem {
  id: string;
  file: File;
  preview: string;
  analyzed: boolean;
  caption?: PhotoCaption;
}

interface PhotoCaption {
  damage: string;
  codeCompliance?: string;
  materialSpecs?: string;
}

interface DamageFinding {
  photoId: string;
  type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  location: string;
  code?: string;
  materialSpec?: string;
}

type Step = "upload" | "analyze" | "annotate" | "caption" | "export";

export default function DamageBuilderClient({ leadId, jobId }: DamageBuilderClientProps) {
  const _router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Core state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [findings, setFindings] = useState<DamageFinding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState(0);

  // Options state
  const [includeCodeCompliance, setIncludeCodeCompliance] = useState(true);
  const [includeMaterialSpecs, setIncludeMaterialSpecs] = useState(true);
  const [propertyAddress, setPropertyAddress] = useState("");

  // Export state
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleSaveEstimate() {
    if (findings.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        title: propertyAddress ? `Damage Estimate — ${propertyAddress}` : "Damage Estimate",
        type: "damage_estimate",
        contentJson: JSON.stringify({
          photos: photos.map((p) => ({ id: p.id, analyzed: p.analyzed, caption: p.caption })),
          findings,
          options: { includeCodeCompliance, includeMaterialSpecs, propertyAddress },
          savedAt: new Date().toISOString(),
        }),
        ...(leadId ? { leadId } : {}),
        ...(jobId ? { jobId } : {}),
      };
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const result = await res.json();
      setSavedId(result.id || "saved");
      toast.success("Estimate saved successfully");
    } catch (_err) {
      toast.error("Failed to save estimate. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleTransferToMaterials() {
    // Build materials list from findings that have material specs
    const materials = findings
      .filter((f) => f.materialSpec)
      .map((f) => f.materialSpec)
      .join("\n");
    const query = new URLSearchParams();
    if (materials) query.set("prefill", encodeURIComponent(materials));
    if (propertyAddress) query.set("address", encodeURIComponent(propertyAddress));
    if (jobId) query.set("jobContext", `job:${jobId}`);
    else if (leadId) query.set("jobContext", `lead:${leadId}`);
    _router.push(`/trades/materials-estimator?${query.toString()}`);
  }

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [photos]);

  // Scroll to selected photo
  useEffect(() => {
    if (scrollContainerRef.current && photos.length > 0) {
      const container = scrollContainerRef.current;
      const selectedThumb = container.children[selectedPhotoIndex] as HTMLElement;
      if (selectedThumb) {
        selectedThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [selectedPhotoIndex, photos.length]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);

    // Convert HEIC/HEIF on the client side before adding to state
    const processFiles = async () => {
      const processed: PhotoItem[] = [];
      for (const file of files) {
        const isHeic = /\.(heic|heif)$/i.test(file.name) || /^image\/(heic|heif)$/i.test(file.type);
        if (isHeic) {
          try {
            toast.info(`Converting ${file.name} from HEIC…`);
            const heic2any = (await import("heic2any")).default;
            const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            const converted = Array.isArray(blob) ? blob[0] : blob;
            const jpegFile = new File([converted], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
              type: "image/jpeg",
            });
            processed.push({
              id: crypto.randomUUID(),
              file: jpegFile,
              preview: URL.createObjectURL(jpegFile),
              analyzed: false,
            });
            toast.success(`Converted ${file.name} to JPEG`);
          } catch (err) {
            console.error("HEIC conversion failed:", err);
            toast.error(`Could not convert ${file.name}. Try uploading as JPG/PNG.`);
            // Still add original as fallback — server will also try
            processed.push({
              id: crypto.randomUUID(),
              file,
              preview: URL.createObjectURL(file),
              analyzed: false,
            });
          }
        } else {
          processed.push({
            id: crypto.randomUUID(),
            file,
            preview: URL.createObjectURL(file),
            analyzed: false,
          });
        }
      }
      setPhotos((prev) => [...prev, ...processed]);
      setError(null);
      if (files.length > 0 && photos.length === 0) {
        setSelectedPhotoIndex(0);
      }
    };

    void processFiles();
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      const newPhotos = prev.filter((p) => p.id !== id);
      if (selectedPhotoIndex >= newPhotos.length) {
        setSelectedPhotoIndex(Math.max(0, newPhotos.length - 1));
      }
      return newPhotos;
    });
    // Remove findings for this photo
    setFindings((prev) => prev.filter((f) => f.photoId !== id));
  }

  function navigatePhoto(direction: "prev" | "next") {
    if (direction === "prev" && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else if (direction === "next" && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  }

  async function handleAnalyze() {
    if (photos.length === 0) {
      setError("Please upload at least one photo");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setCurrentStep("analyze");

    try {
      const formData = new FormData();
      photos.forEach((p) => formData.append("photos", p.file));
      if (leadId) formData.append("leadId", leadId);
      if (jobId) formData.append("jobId", jobId);
      formData.append("includeCodeCompliance", String(includeCodeCompliance));
      formData.append("includeMaterialSpecs", String(includeMaterialSpecs));
      if (propertyAddress) formData.append("propertyAddress", propertyAddress);

      const res = await fetch("/api/ai/damage/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        let errorMessage = "Analysis failed. Please try again.";
        if (typeof json.error === "object" && json.error?.message) {
          errorMessage = json.error.message;
        } else if (typeof json.error === "string") {
          errorMessage = json.error;
        } else if (json.hint) {
          errorMessage = json.hint;
        }
        setError(errorMessage);
        setCurrentStep("upload");
        return;
      }

      const json = await res.json();

      // Map findings to photos
      const newFindings: DamageFinding[] = (json.findings || []).map((f: any, idx: number) => ({
        ...f,
        photoId: photos[idx % photos.length]?.id || photos[0]?.id,
      }));

      setFindings(newFindings);
      setTokensUsed((prev) => prev + (json.tokensUsed || 0));

      // Update photos as analyzed with captions
      setPhotos((prev) =>
        prev.map((photo, idx) => {
          const photoFindings = newFindings.filter((f) => f.photoId === photo.id);
          return {
            ...photo,
            analyzed: true,
            caption: {
              damage:
                photoFindings.map((f) => `${f.type}: ${f.description}`).join("\n") ||
                "No damage detected",
              codeCompliance:
                includeCodeCompliance && json.codeCompliance?.[idx]
                  ? json.codeCompliance[idx]
                  : undefined,
              materialSpecs:
                includeMaterialSpecs && json.materialSpecs?.[idx]
                  ? json.materialSpecs[idx]
                  : undefined,
            },
          };
        })
      );

      setCurrentStep("caption");

      // Log telemetry
      await fetch("/api/telemetry/damage-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          jobId,
          tokensUsed: json.tokensUsed,
          findingsCount: json.findings?.length || 0,
        }),
      }).catch(() => {});
    } catch (err) {
      setError(err.message);
      setCurrentStep("upload");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleExport() {
    if (photos.length === 0) {
      setError("No photos to export.");
      return;
    }

    setExporting(true);
    setError(null);
    setCurrentStep("export");

    try {
      // Build photo data with captions for PDF generation
      const photoData = photos.map((photo) => ({
        id: photo.id,
        caption: photo.caption,
        findings: findings.filter((f) => f.photoId === photo.id),
      }));

      const res = await fetch("/api/ai/damage/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photoData,
          findings,
          leadId,
          jobId,
          propertyAddress,
          includeCodeCompliance,
          includeMaterialSpecs,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        let errorMsg = "Export failed. Please try again.";
        if (typeof json.error === "object" && json.error?.message) {
          errorMsg = json.error.message;
        } else if (typeof json.error === "string") {
          errorMsg = json.error;
        }
        setError(errorMsg);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `damage-report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function _handleShare() {
    try {
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "report",
          resourceId: leadId || jobId || "demo",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errorMsg = typeof json.error === "object" ? json.error?.message : json.error;
        setError(errorMsg || "Failed to create share link");
        return;
      }
      if (json.url) {
        await navigator.clipboard.writeText(json.url);
        toast.success("Share link copied to clipboard!", { description: json.url });
      } else {
        setError("Failed to create share link");
      }
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : "Failed to share");
    }
  }

  const selectedPhoto = photos[selectedPhotoIndex];
  const selectedFindings = findings.filter((f) => f.photoId === selectedPhoto?.id);

  const severityColors = {
    Low: "bg-blue-100 text-blue-800 border-blue-200",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-red-100 text-red-800 border-red-200",
  };

  const stepConfig = [
    { key: "upload", label: "1. Upload", icon: Upload },
    { key: "analyze", label: "2. Analyze", icon: Search },
    { key: "caption", label: "3. Caption", icon: PenTool },
    { key: "export", label: "4. PDF", icon: FileDown },
  ];

  return (
    <>
      {/* Step Progress Bar */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {stepConfig.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isPast =
            stepConfig.findIndex((s) => s.key === currentStep) >
            stepConfig.findIndex((s) => s.key === step.key);
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#117CFF] text-white shadow-lg"
                    : isPast
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {idx < stepConfig.length - 1 && (
                <div
                  className={`mx-1 h-0.5 w-6 ${isPast ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
        {/* Left Column: Photo Queue + Options */}
        <div className="space-y-4 md:col-span-4 lg:col-span-3">
          {/* Photo Upload Section */}
          <div className="rounded-2xl border border-[#117CFF]/20 bg-gradient-to-br from-white to-slate-50 p-5 shadow-lg dark:from-slate-900 dark:to-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#117CFF]">
              <Upload className="h-5 w-5" />
              Photos ({photos.length})
            </h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/heic,image/heif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload damage photos"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 w-full rounded-xl border-2 border-dashed border-[#117CFF]/30 bg-gradient-to-br from-slate-50/50 to-slate-100/50 px-4 py-4 text-base font-semibold transition-all hover:border-[#117CFF]/50 hover:bg-[#117CFF]/5 dark:from-slate-900/30 dark:to-slate-800/30"
              aria-label="Add photos"
            >
              + Add Photos
            </button>

            {/* Horizontal scroll photo thumbnails */}
            <div
              ref={scrollContainerRef}
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2"
            >
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`group relative flex-shrink-0 cursor-pointer snap-center ${
                    idx === selectedPhotoIndex ? "ring-2 ring-[#117CFF] ring-offset-2" : ""
                  }`}
                  onClick={() => setSelectedPhotoIndex(idx)}
                >
                  <img
                    src={photo.preview}
                    alt={`Photo ${idx + 1}`}
                    className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                  {photo.analyzed && (
                    <div className="absolute -right-1 -top-1 rounded-full bg-green-500 p-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(photo.id);
                    }}
                    className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-500">
                📱 iPhone HEIC photos supported
              </p>
            )}
          </div>

          {/* Analysis Options */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-base font-semibold">Caption Options</h3>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeCodeCompliance(!includeCodeCompliance)}
                  className="text-[#117CFF]"
                  aria-label="Toggle code and compliance"
                >
                  {includeCodeCompliance ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm">Code & Compliance</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeMaterialSpecs(!includeMaterialSpecs)}
                  className="text-[#117CFF]"
                  aria-label="Toggle material specifications"
                >
                  {includeMaterialSpecs ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm">Material Specifications</span>
              </label>

              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Property Address (optional)
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || photos.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#117CFF] to-[#0066DD] px-4 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing {photos.length} photo{photos.length !== 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Analyze Damage
              </>
            )}
          </button>
        </div>

        {/* Center Column: Main Photo View */}
        <div className="flex flex-col md:col-span-8 lg:col-span-6">
          <div className="relative flex aspect-[4/3] min-h-[250px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 sm:p-6">
            {photos.length > 0 && selectedPhoto ? (
              <>
                <img
                  src={selectedPhoto.preview}
                  alt={`Photo ${selectedPhotoIndex + 1}`}
                  className="max-h-[300px] max-w-full rounded-lg object-contain shadow-lg sm:max-h-[400px] lg:max-h-[500px]"
                />

                {/* Navigation arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigatePhoto("prev")}
                      disabled={selectedPhotoIndex === 0}
                      className="absolute left-2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white disabled:opacity-30 dark:bg-slate-800/80"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigatePhoto("next")}
                      disabled={selectedPhotoIndex === photos.length - 1}
                      className="absolute right-2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white disabled:opacity-30 dark:bg-slate-800/80"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Photo counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                  {selectedPhotoIndex + 1} / {photos.length}
                </div>

                {/* Analyzed indicator */}
                {selectedPhoto.analyzed && (
                  <div className="absolute right-4 top-4 rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                    ✓ Analyzed
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-slate-500">
                <Upload className="mx-auto mb-3 h-16 w-16 text-slate-300" />
                <p className="text-lg font-medium">Upload photos to begin</p>
                <p className="mt-1 text-sm">Drag &amp; drop or click &ldquo;Add Photos&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Findings & Captions Panel */}
        <div className="space-y-4 md:col-span-12 lg:col-span-3">
          {/* Caption Panel */}
          {selectedPhoto?.caption && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400">
                <Check className="h-4 w-4" />
                Photo Caption
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    A. Damage Visible:
                  </p>
                  <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                    {selectedPhoto.caption.damage}
                  </p>
                </div>

                {selectedPhoto.caption.codeCompliance && (
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      B. Code & Compliance:
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedPhoto.caption.codeCompliance}
                    </p>
                  </div>
                )}

                {selectedPhoto.caption.materialSpecs && (
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      C. Material Specs:
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedPhoto.caption.materialSpecs}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Findings Panel */}
          <div className="flex min-h-[300px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ZoomIn className="h-5 w-5" />
                Findings ({selectedFindings.length})
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const reportUrl = `${window.location.origin}/ai/damage-builder`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: "Damage Report | SkaiScraper",
                          text: `Damage report with ${findings.length} findings`,
                          url: reportUrl,
                        });
                        return;
                      } catch {
                        /* user cancelled, fall through to copy */
                      }
                    }
                    // Fallback: copy link
                    try {
                      await navigator.clipboard.writeText(reportUrl);
                      toast.success("Link copied to clipboard!");
                    } catch {
                      toast.error("Could not copy link");
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  aria-label="Share report"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || photos.length === 0 || !photos.some((p) => p.analyzed)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#117CFF] px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#0066DD] disabled:opacity-50"
                  aria-label="Export PDF"
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  PDF
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {tokensUsed > 0 && (
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
                AI Tokens used: {tokensUsed}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto">
              {selectedFindings.length === 0 && !selectedPhoto?.analyzed && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No Findings Yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload photos and click &ldquo;Analyze Damage&rdquo; to detect issues.
                  </p>
                </div>
              )}

              {selectedFindings.length === 0 && selectedPhoto?.analyzed && (
                <p className="py-6 text-center text-xs text-slate-500">
                  No damage findings for this photo.
                </p>
              )}

              {selectedFindings.map((finding, idx) => (
                <div
                  key={idx}
                  className="space-y-1.5 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium">{finding.type}</h4>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-xs ${severityColors[finding.severity]}`}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {finding.description}
                  </p>
                  <p className="text-xs text-slate-500">📍 {finding.location}</p>
                  {finding.code && (
                    <p className="font-mono text-xs text-blue-600">{finding.code}</p>
                  )}
                  {finding.materialSpec && (
                    <p className="text-xs text-purple-600">🔧 {finding.materialSpec}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Export Summary */}
          {photos.some((p) => p.analyzed) && (
            <div className="rounded-2xl border border-[#117CFF]/20 bg-[#117CFF]/5 p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#117CFF]">PDF Report Summary</h3>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <li>• {photos.length} photos (2 per page)</li>
                <li>• {findings.length} damage findings</li>
                {includeCodeCompliance && <li>• Code & Compliance notes</li>}
                {includeMaterialSpecs && <li>• Material specifications</li>}
                {propertyAddress && <li>• Property: {propertyAddress}</li>}
              </ul>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#117CFF] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0066DD] disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Download PDF Report
                  </>
                )}
              </button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSaveEstimate}
                  disabled={saving || !!savedId}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-all hover:bg-green-100 disabled:opacity-50 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : savedId ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {savedId ? "Saved" : "Save Estimate"}
                </button>
                <button
                  type="button"
                  onClick={handleTransferToMaterials}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 transition-all hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-900/20 dark:text-purple-400"
                >
                  <Package className="h-3.5 w-3.5" />
                  To Materials
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

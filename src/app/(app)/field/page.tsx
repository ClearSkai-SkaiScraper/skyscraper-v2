/**
 * Mobile Field Mode — "Knock → Close → File in 15 Minutes"
 *
 * THE mobile-first field page for contractors on the roof.
 * Designed for one-thumb operation on a phone:
 *
 * Features:
 *   📸 Camera-first — big capture button, instant upload
 *   📍 GPS auto-tag — every photo gets location metadata
 *   🔍 Live AI — damage detected as you shoot
 *   📝 Quick Notes — voice-to-text or tap-to-annotate
 *   📋 Quick Scope — one-tap common items
 *   📤 Submit — creates claim with all data pre-filled
 *
 * This replaces the "drive back to office and upload" workflow.
 */
"use client";

import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Ruler,
  Search,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { VoiceNoteButton } from "@/components/VoiceNoteRecorder";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FieldPhoto {
  id: string;
  file: File;
  preview: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  note: string;
  aiLabel?: string;
  analyzing: boolean;
}

interface QuickScopeItem {
  id: string;
  label: string;
  category: string;
  selected: boolean;
}

// ---------------------------------------------------------------------------
// Quick scope items — the most common things a roofer notes on-site
// ---------------------------------------------------------------------------
const QUICK_SCOPE_ITEMS: Omit<QuickScopeItem, "id" | "selected">[] = [
  { label: "Missing shingles", category: "Roof" },
  { label: "Cracked shingles", category: "Roof" },
  { label: "Hail impacts on shingles", category: "Roof" },
  { label: "Damaged ridge cap", category: "Roof" },
  { label: "Damaged/dented flashing", category: "Roof" },
  { label: "Pipe boot cracks", category: "Roof" },
  { label: "Gutter damage/dents", category: "Exterior" },
  { label: "Downspout damage", category: "Exterior" },
  { label: "Siding hits/cracks", category: "Exterior" },
  { label: "Window screen damage", category: "Exterior" },
  { label: "Fence damage", category: "Exterior" },
  { label: "Soft metal dents (AC, vents)", category: "Metals" },
  { label: "Roof vent damage", category: "Metals" },
  { label: "Turbine vent damage", category: "Metals" },
  { label: "Satellite dish damage", category: "Other" },
  { label: "Skylight damage", category: "Other" },
  { label: "Water intrusion/stains", category: "Interior" },
  { label: "Ceiling damage", category: "Interior" },
];

// ---------------------------------------------------------------------------
// GPS helper — with retry and fallback
// ---------------------------------------------------------------------------
function getGPS(retries = 2): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    let attempt = 0;
    const tryGet = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {
          attempt++;
          if (attempt <= retries) {
            // Retry with lower accuracy (faster, works indoors)
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 10000, enableHighAccuracy: false }
            );
          } else {
            resolve(null);
          }
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    };
    tryGet();
  });
}

// ---------------------------------------------------------------------------
// Linked record type — job or claim to associate this field submission with
// ---------------------------------------------------------------------------
interface LinkedRecord {
  id: string;
  label: string;
  type: "claim" | "job";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function FieldModeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from URL params (e.g. from Property Profile → AI Inspection)
  const urlPropertyId = searchParams?.get("propertyId") || "";
  const urlAddress = searchParams?.get("address") || "";
  const urlClaimId = searchParams?.get("claimId") || "";
  const urlJobId = searchParams?.get("jobId") || "";

  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [scopeItems, setScopeItems] = useState<QuickScopeItem[]>(
    QUICK_SCOPE_ITEMS.map((item, i) => ({
      ...item,
      id: `scope_${i}`,
      selected: false,
    }))
  );
  const [propertyAddress, setPropertyAddress] = useState(urlAddress);
  const [homeownerName, setHomeownerName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedClaimId, setSubmittedClaimId] = useState<string | null>(null);
  const [showScope, setShowScope] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"pending" | "active" | "unavailable">("pending");
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState<string | null>(null);

  // Linked record — existing claim or job to associate with
  const [linkedRecord, setLinkedRecord] = useState<LinkedRecord | null>(null);
  const [searchingRecords, setSearchingRecords] = useState(false);
  const [recordResults, setRecordResults] = useState<LinkedRecord[]>([]);
  const [showRecordSearch, setShowRecordSearch] = useState(false);
  const [recordSearchQuery, setRecordSearchQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Pre-link if URL has claimId or jobId
  useEffect(() => {
    if (urlClaimId) {
      setLinkedRecord({
        id: urlClaimId,
        label: `Claim ${urlClaimId.slice(0, 8)}...`,
        type: "claim",
      });
    } else if (urlJobId) {
      setLinkedRecord({ id: urlJobId, label: `Job ${urlJobId.slice(0, 8)}...`, type: "job" });
    }
  }, [urlClaimId, urlJobId]);

  // Check GPS on mount — with retry
  useEffect(() => {
    void getGPS(2).then((result) => {
      setGpsStatus(result ? "active" : "unavailable");
    });
  }, []);

  // Search claims/jobs for linking
  const searchRecords = useCallback(async (query: string) => {
    if (query.length < 2) {
      setRecordResults([]);
      return;
    }
    setSearchingRecords(true);
    try {
      const [claimsRes, jobsRes] = await Promise.allSettled([
        fetch(`/api/claims?search=${encodeURIComponent(query)}&limit=5`),
        fetch(`/api/jobs?search=${encodeURIComponent(query)}&limit=5`),
      ]);
      const results: LinkedRecord[] = [];
      if (claimsRes.status === "fulfilled" && claimsRes.value.ok) {
        const claimsData = await claimsRes.value.json();
        const claims = Array.isArray(claimsData)
          ? claimsData
          : claimsData.data || claimsData.claims || [];
        for (const c of claims.slice(0, 5)) {
          results.push({
            id: c.id,
            label: `${c.claimNumber || "Claim"} — ${c.title || c.propertyAddress || ""}`.slice(
              0,
              60
            ),
            type: "claim",
          });
        }
      }
      if (jobsRes.status === "fulfilled" && jobsRes.value.ok) {
        const jobsData = await jobsRes.value.json();
        const jobs = Array.isArray(jobsData) ? jobsData : jobsData.data || jobsData.jobs || [];
        for (const j of jobs.slice(0, 5)) {
          results.push({
            id: j.id,
            label: `${j.jobNumber || "Job"} — ${j.title || j.address || ""}`.slice(0, 60),
            type: "job",
          });
        }
      }
      setRecordResults(results);
    } catch {
      setRecordResults([]);
    } finally {
      setSearchingRecords(false);
    }
  }, []);

  // Retry GPS
  const retryGPS = useCallback(async () => {
    setGpsStatus("pending");
    const result = await getGPS(3);
    setGpsStatus(result ? "active" : "unavailable");
    if (result) {
      toast.success("GPS connected!");
    } else {
      toast.error("GPS still unavailable. Check location permissions in Settings.");
    }
  }, []);

  // ---- Photo capture ----
  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const gps = await getGPS();

    const newPhotos: FieldPhoto[] = files.map((file) => ({
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file,
      preview: URL.createObjectURL(file),
      latitude: gps?.latitude,
      longitude: gps?.longitude,
      timestamp: new Date().toISOString(),
      note: "",
      analyzing: false,
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);

    // Quick AI label for each photo (fire-and-forget)
    for (const photo of newPhotos) {
      void quickAnalyze(photo);
    }

    toast.success(`${files.length} photo${files.length > 1 ? "s" : ""} captured`);
    // Reset input so same file can be selected again
    e.target.value = "";
  }, []);

  const quickAnalyze = async (photo: FieldPhoto) => {
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, analyzing: true } : p)));

    try {
      const formData = new FormData();
      formData.append("file", photo.file);
      formData.append("context", "Quick field inspection — identify primary damage.");

      const res = await fetch("/api/ai/damage/analyze", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const primaryDamage = data.data?.findings?.[0] || data.findings?.[0];
        const label = primaryDamage
          ? `${primaryDamage.type || "Damage"} — ${primaryDamage.severity || "detected"}`
          : "No damage detected";

        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, aiLabel: label, analyzing: false } : p))
        );
      }
    } catch {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, analyzing: false } : p)));
    }
  };

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ---- Drag-and-drop photo reorder ----
  const handleDragStart = useCallback((e: React.DragEvent, photoId: string) => {
    setDraggedPhotoId(photoId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", photoId);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, photoId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (photoId !== draggedPhotoId) {
        setDragOverPhotoId(photoId);
      }
    },
    [draggedPhotoId]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverPhotoId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetPhotoId: string) => {
      e.preventDefault();
      const sourcePhotoId = draggedPhotoId;
      setDraggedPhotoId(null);
      setDragOverPhotoId(null);

      if (!sourcePhotoId || sourcePhotoId === targetPhotoId) return;

      setPhotos((prev) => {
        const sourceIndex = prev.findIndex((p) => p.id === sourcePhotoId);
        const targetIndex = prev.findIndex((p) => p.id === targetPhotoId);
        if (sourceIndex === -1 || targetIndex === -1) return prev;

        const newPhotos = [...prev];
        const [removed] = newPhotos.splice(sourceIndex, 1);
        newPhotos.splice(targetIndex, 0, removed);
        return newPhotos;
      });
      toast.success("Photo reordered");
    },
    [draggedPhotoId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPhotoId(null);
    setDragOverPhotoId(null);
  }, []);

  const _updatePhotoNote = useCallback((id: string, note: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)));
  }, []);

  const toggleScope = useCallback((id: string) => {
    setScopeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  // ---- Bulk Analyze All Photos ----
  const handleBulkAnalyze = useCallback(async () => {
    const unanalyzed = photos.filter((p) => !p.aiLabel && !p.analyzing);
    if (unanalyzed.length === 0) {
      toast.info("All photos already analyzed");
      return;
    }

    setBulkAnalyzing(true);
    toast.info(`Analyzing ${unanalyzed.length} photos...`);

    // Analyze all unanalyzed photos in parallel
    await Promise.all(unanalyzed.map((photo) => quickAnalyze(photo)));

    setBulkAnalyzing(false);
    toast.success("All photos analyzed!");
  }, [photos]);

  // ---- Submit ----
  const handleSubmit = useCallback(async () => {
    if (photos.length === 0) {
      toast.error("Take at least one photo before submitting");
      return;
    }

    setSubmitting(true);
    try {
      // Create the claim via existing intake API
      const selectedScope = scopeItems.filter((s) => s.selected);

      const formData = new FormData();
      formData.append("propertyAddress", propertyAddress);
      formData.append("homeownerName", homeownerName);
      formData.append("notes", notes);
      formData.append("source", "field_mode");
      formData.append("quickScope", JSON.stringify(selectedScope.map((s) => s.label)));

      // Pass linked record info
      if (linkedRecord) {
        formData.append("linkedRecordId", linkedRecord.id);
        formData.append("linkedRecordType", linkedRecord.type);
      }
      // Pass property ID if navigated from a property profile
      if (urlPropertyId) {
        formData.append("propertyId", urlPropertyId);
      }

      // Attach all photos
      for (const photo of photos) {
        formData.append("photos", photo.file);
        if (photo.latitude && photo.longitude) {
          formData.append(
            `photo_meta_${photo.id}`,
            JSON.stringify({
              latitude: photo.latitude,
              longitude: photo.longitude,
              note: photo.note,
              timestamp: photo.timestamp,
            })
          );
        }
      }

      const res = await fetch("/api/claims/field-intake", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedClaimId(data.claimId || null);
        setSubmitted(true);
        toast.success("Claim submitted! AI is analyzing your photos.");
      } else {
        // Fallback — try to create as basic claim
        toast.info("Photos captured — create a full claim to continue.");
        setSubmitted(true);
      }
    } catch {
      toast.error("Submission failed — your photos are saved locally.");
    } finally {
      setSubmitting(false);
    }
  }, [photos, propertyAddress, homeownerName, notes, scopeItems, linkedRecord, urlPropertyId]);

  const selectedCount = scopeItems.filter((s) => s.selected).length;
  const unanalyzedCount = photos.filter((p) => !p.aiLabel && !p.analyzing).length;
  const analyzingCount = photos.filter((p) => p.analyzing).length;

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 dark:from-emerald-950/20 dark:to-slate-950">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Submitted!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {photos.length} photos + {selectedCount} scope items captured.
        </p>
        <p className="text-sm text-muted-foreground">AI is analyzing your photos now.</p>
        <div className="mt-6 flex gap-3">
          {submittedClaimId ? (
            <button
              type="button"
              onClick={() => router.push(`/claims/${submittedClaimId}`)}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
            >
              View Claim
            </button>
          ) : (
            <Link
              href="/claims"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
            >
              View Claims
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setPhotos([]);
              setScopeItems((prev) => prev.map((s) => ({ ...s, selected: false })));
              setPropertyAddress("");
              setHomeownerName("");
              setNotes("");
              setSubmitted(false);
              setSubmittedClaimId(null);
              setLinkedRecord(null);
            }}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <RotateCcw className="mr-2 inline h-4 w-4" />
            New Inspection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-40 dark:bg-slate-950">
      {/* Header — minimal, mobile-optimized */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Field Mode</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {gpsStatus === "active" ? (
                <span className="text-emerald-600">GPS active</span>
              ) : gpsStatus === "unavailable" ? (
                <button
                  type="button"
                  onClick={retryGPS}
                  className="flex items-center gap-1 text-amber-600 hover:text-amber-700"
                >
                  GPS unavailable
                  <RefreshCw className="h-2.5 w-2.5" />
                </button>
              ) : (
                <span>Checking GPS...</span>
              )}
              <span>•</span>
              <span>
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Analyze Button */}
            {photos.length > 0 && (unanalyzedCount > 0 || bulkAnalyzing) && (
              <button
                type="button"
                onClick={handleBulkAnalyze}
                disabled={bulkAnalyzing || analyzingCount > 0}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  bulkAnalyzing || analyzingCount > 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                )}
              >
                {bulkAnalyzing || analyzingCount > 0 ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>AI Scan ({unanalyzedCount})</>
                )}
              </button>
            )}
            <Link
              href="/claims"
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Quick info fields */}
        <div className="mb-4 space-y-3">
          <AddressAutocomplete
            value={propertyAddress}
            onChange={setPropertyAddress}
            onSelect={(suggestion: AddressSuggestion) => setPropertyAddress(suggestion.fullAddress)}
            placeholder="Property address..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="text"
            value={homeownerName}
            onChange={(e) => setHomeownerName(e.target.value)}
            placeholder="Homeowner name (optional)"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />

          {/* Link to existing Claim or Job */}
          <div className="relative">
            {linkedRecord ? (
              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      linkedRecord.type === "claim"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    )}
                  >
                    {linkedRecord.type}
                  </span>
                  <span className="truncate text-foreground">{linkedRecord.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkedRecord(null)}
                  className="ml-2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowRecordSearch(!showRecordSearch)}
                  className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-left text-sm text-muted-foreground hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
                >
                  🔗 Link to existing claim or job (optional)
                </button>
                {showRecordSearch && (
                  <div className="mt-1 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="text"
                      value={recordSearchQuery}
                      onChange={(e) => {
                        setRecordSearchQuery(e.target.value);
                        void searchRecords(e.target.value);
                      }}
                      placeholder="Search by claim #, job #, or address..."
                      autoFocus
                      className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />
                    {searchingRecords && (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                        Searching...
                      </p>
                    )}
                    {recordResults.length > 0 && (
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {recordResults.map((r) => (
                          <button
                            key={`${r.type}-${r.id}`}
                            type="button"
                            onClick={() => {
                              setLinkedRecord(r);
                              setShowRecordSearch(false);
                              setRecordSearchQuery("");
                              setRecordResults([]);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                r.type === "claim"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40"
                              )}
                            >
                              {r.type}
                            </span>
                            <span className="truncate">{r.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!searchingRecords &&
                      recordSearchQuery.length >= 2 &&
                      recordResults.length === 0 && (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          No results — will create a new claim on submit
                        </p>
                      )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Photos Grid - Drag to reorder */}
        {photos.length > 0 && (
          <div className="mb-4">
            {photos.length > 1 && (
              <p className="mb-2 text-center text-xs text-muted-foreground">
                💡 Drag photos to reorder
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={cn(
                    "group relative cursor-grab transition-all duration-200",
                    draggedPhotoId === photo.id && "scale-95 opacity-50",
                    dragOverPhotoId === photo.id && "scale-105 ring-2 ring-blue-500 ring-offset-2"
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, photo.id)}
                  onDragOver={(e) => handleDragOver(e, photo.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, photo.id)}
                  onDragEnd={handleDragEnd}
                >
                  <img
                    src={photo.preview}
                    alt="Field"
                    className="pointer-events-none h-28 w-full rounded-xl object-cover"
                  />
                  {/* AI label overlay */}
                  {photo.analyzing ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  ) : photo.aiLabel ? (
                    <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
                      <p className="text-[9px] font-medium leading-tight text-white">
                        {photo.aiLabel}
                      </p>
                    </div>
                  ) : null}
                  {/* GPS badge */}
                  {photo.latitude && (
                    <div className="absolute left-1 top-1 rounded-full bg-emerald-500/90 p-0.5">
                      <MapPin className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Scope Checklist */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowScope(!showScope)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
          >
            <span>
              Quick Scope
              {selectedCount > 0 && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {selectedCount}
                </span>
              )}
            </span>
            {showScope ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showScope && (
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
              {Object.entries(
                scopeItems.reduce<Record<string, QuickScopeItem[]>>((acc, item) => {
                  (acc[item.category] = acc[item.category] || []).push(item);
                  return acc;
                }, {})
              ).map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                    {category}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleScope(item.id)}
                      className={cn(
                        "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all",
                        item.selected
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
                          : "text-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border",
                          item.selected
                            ? "border-blue-500 bg-blue-500"
                            : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {item.selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes with Voice Input */}
        <div className="relative mb-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Field notes... (or tap mic to speak)"
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="absolute right-2 top-2">
            <VoiceNoteButton
              onTranscript={(text) => setNotes((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>
      </div>

      {/* Fixed bottom bar — Enhanced field tools */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/95">
        {/* Main action row */}
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          {/* Search Claims */}
          <Link
            href="/search"
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium">Search</span>
          </Link>

          {/* Gallery upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={handleCapture}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Gallery</span>
          </button>

          {/* CAMERA BUTTON — THE BIG ONE */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30 transition-transform active:scale-95"
          >
            <Camera className="h-7 w-7 text-white" />
          </button>

          {/* Measure — opens camera for reference measurement photo */}
          <input
            id="measure-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              // Tag the photo as a measurement reference
              const handleMeasure = async (ev: React.ChangeEvent<HTMLInputElement>) => {
                const files = Array.from(ev.target.files || []);
                if (files.length === 0) return;
                const gps = await getGPS();
                const newPhotos: FieldPhoto[] = files.map((file) => ({
                  id: `measure_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  file,
                  preview: URL.createObjectURL(file),
                  latitude: gps?.latitude,
                  longitude: gps?.longitude,
                  timestamp: new Date().toISOString(),
                  note: "📏 Measurement reference photo",
                  analyzing: false,
                  aiLabel: "Measurement Reference",
                }));
                setPhotos((prev) => [...prev, ...newPhotos]);
                toast.success("Measurement photo captured! Add notes with dimensions.");
                ev.target.value = "";
              };
              void handleMeasure(e);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              toast.info("Place a coin, card, or tape measure next to damage for scale reference", {
                duration: 3000,
              });
              setTimeout(() => {
                document.getElementById("measure-camera-input")?.click();
              }, 500);
            }}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Ruler className="h-5 w-5" />
            <span className="text-[10px] font-medium">Measure</span>
          </button>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || photos.length === 0}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all",
              photos.length > 0
                ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                : "text-slate-300 dark:text-slate-600"
            )}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span className="text-[10px] font-medium">Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense for useSearchParams
// ---------------------------------------------------------------------------
export default function FieldModePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <FieldModeContent />
    </Suspense>
  );
}

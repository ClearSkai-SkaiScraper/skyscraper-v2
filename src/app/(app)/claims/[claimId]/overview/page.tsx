// src/app/(app)/claims/[claimId]/overview/page.tsx
"use client";

import {
  ClipboardCheck,
  CloudLightning,
  FileText,
  Layers,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EditableField } from "@/components/claims/EditableField";
import {
  UniversalContactCard,
  type UniversalContact,
} from "@/components/contacts/UniversalContactCard";
import { ClaimNotFoundError } from "@/components/errors/ErrorStates";
import { TabErrorBoundary } from "@/components/errors/TabErrorBoundary";
import { CloseoutChecklist } from "@/components/jobs/CloseoutChecklist";
import { JobValueBox } from "@/components/jobs/JobValueBox";
import { RequestCloseoutButton } from "@/components/jobs/RequestCloseoutButton";
import { ClaimWorkspaceSkeleton } from "@/components/loading/LoadingStates";
import { retryQueue } from "@/lib/client/retryQueue";
import { logger } from "@/lib/logger";
import { getWorkflowStatusInfo, mapToWorkflowStatus, WORKFLOW_STATUSES } from "@/lib/statusMapping";

import { CarrierExportButton } from "../_components/CarrierExportButton";
import { ClaimsSidebar } from "../_components/ClaimsSidebar";
import { ClientConnectSection } from "../_components/ClientConnectSection";
import { GenerateReportButton } from "../_components/GenerateReportButton";
import MetricPill from "../_components/MetricPill";
import SectionCard from "../_components/SectionCard";

interface ClaimStats {
  photosCount: number;
  documentsCount: number;
  timelineCount: number;
  reportsCount: number;
}

interface ClaimData {
  id: string;
  title: string;
  description: string | null;
  damageType: string | null;
  dateOfLoss: string | null;
  dateOfInspection: string | null;
  status: string;
  lifecycleStage: string | null;
  insured_name: string | null;
  homeowner_email: string | null;
  homeowner_phone: string | null;
  carrier: string | null;
  policy_number: string | null;
  adjusterName: string | null;
  adjusterPhone: string | null;
  adjusterEmail: string | null;
  propertyId: string | null;
  contactId: string | null;
  propertyAddress: string | null;
  propertyStreet: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  propertyZip: string | null;
  // Signing status
  signingStatus: string;
  // Job value estimation
  estimatedJobValue: number | null;
  jobValueStatus: string;
  jobValueApprovedBy: string | null;
  jobValueApprovalNotes: string | null;
}

function EditableTextareaField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder?: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(value || "");
  }, [isEditing, value]);

  const commit = async () => {
    if (savingRef.current) return;
    if (draft === (value || "")) {
      setIsEditing(false);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  if (!isEditing) {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          {label}
          {justSaved && (
            <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
              ✓ Saved
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`mt-1 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted ${!value ? "italic text-muted-foreground" : ""}`}
        >
          {value || placeholder || "Click to edit"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setTimeout(() => {
              if (!savingRef.current) void commit();
            }, 100);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(value || "");
              setIsEditing(false);
            }
          }}
          rows={4}
          placeholder={placeholder}
          disabled={saving}
          autoFocus
          className="w-full rounded-lg border border-blue-400 bg-background px-3 py-2 text-sm text-foreground outline-none ring-2 ring-blue-200 transition-colors focus:border-blue-500 focus:ring-blue-300 disabled:opacity-50"
        />
        {saving && <p className="mt-1 animate-pulse text-xs text-muted-foreground">Saving…</p>}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const params = useParams();
  const router = useRouter();
  const claimIdParam = params?.claimId;
  const claimId = Array.isArray(claimIdParam) ? claimIdParam[0] : claimIdParam;
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [stats, setStats] = useState<ClaimStats>({
    photosCount: 0,
    documentsCount: 0,
    timelineCount: 0,
    reportsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [generatingWeather, setGeneratingWeather] = useState(false);
  const [attachedClient, setAttachedClient] = useState<UniversalContact | null>(null);
  const [teamMembers, setTeamMembers] = useState<
    Array<{
      id: string;
      clerkUserId: string;
      name: string | null;
      title: string | null;
      is_default_inspector: boolean;
    }>
  >([]);
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const saveQueueRef = useRef<{ [key: string]: any }>({});
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave handler - debounces saves by 2 seconds
  const queueSave = useCallback(
    (field: string, value: any) => {
      saveQueueRef.current[field] = value;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const updates = { ...saveQueueRef.current };
        saveQueueRef.current = {};

        try {
          const response = await fetch(`/api/claims/${claimId}/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error("Failed to save changes");
          }

          // Refresh server layout so the claim header bar updates
          router.refresh();
          toast.success("Changes saved", { duration: 2000 });
        } catch (err) {
          toast.error(err.message || "Failed to save changes");
          // Enqueue for retry on next session
          retryQueue.enqueue({
            url: `/api/claims/${claimId}/update`,
            method: "PATCH",
            body: JSON.stringify(updates),
          });
          // Revert optimistic updates on failure
          void fetchData();
        }
      }, 2000);
    },
    [claimId]
  );

  // Flush any pending saves on unmount (e.g. navigating away before 2s timer)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const pending = { ...saveQueueRef.current };
      if (Object.keys(pending).length > 0) {
        saveQueueRef.current = {};
        // Fire-and-forget — navigator.sendBeacon for reliability
        const url = `/api/claims/${claimId}/update`;
        const blob = new Blob([JSON.stringify(pending)], { type: "application/json" });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, blob);
        } else {
          void fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pending),
            keepalive: true,
          });
        }
      }
    };
  }, [claimId]);

  // Field update handler with optimistic updates
  const handleFieldUpdate = useCallback(
    async (field: keyof ClaimData, value: string) => {
      // Optimistic update
      setClaim((prev) => (prev ? { ...prev, [field]: value } : null));

      // Queue autosave
      const apiFieldName = field === "dateOfLoss" ? "dateOfLoss" : field;
      queueSave(apiFieldName, value);
    },
    [queueSave]
  );

  // Weather Verification PDF download
  const handleWeatherVerification = useCallback(async () => {
    if (!claimId) return;
    setGeneratingWeather(true);
    try {
      toast.info("Scanning 12-month weather history…", { duration: 4000 });
      const res = await fetch(`/api/claims/${claimId}/weather/quick-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Weather-Verification-${claim?.title || claimId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Weather Verification PDF downloaded!");
    } catch (err: any) {
      logger.error("[WeatherVerify] Error:", err);
      toast.error(err.message || "Failed to generate weather verification");
    } finally {
      setGeneratingWeather(false);
    }
  }, [claimId, claim?.title]);

  // Fetch attached client for contact card
  const fetchAttachedClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/connected-client`);
      if (res.ok) {
        const data = await res.json();
        if (data.client) {
          setAttachedClient({
            id: data.client.id || `claim-${claimId}`,
            firstName: data.client.firstName,
            lastName: data.client.lastName,
            name:
              data.client.name ||
              [data.client.firstName, data.client.lastName].filter(Boolean).join(" ") ||
              null,
            email: data.client.email,
            phone: data.client.phone,
            contactType: "client",
            claimId,
            isConnected: !!data.client.portalClientId,
            portalClientId: data.client.portalClientId || undefined,
          });
        } else {
          setAttachedClient(null);
        }
      }
    } catch (error) {
      logger.error("[ClaimOverview] Failed to fetch attached client:", error);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
    void fetchAttachedClient();
    // Fetch team members for inspector dropdown
    fetch("/api/team/members")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((data) => {
        const members = data.members || data.users || [];
        setTeamMembers(members);
        // Auto-select default inspector if none is set
        const defaultInsp = members.find((m: any) => m.is_default_inspector);
        if (defaultInsp && !selectedInspectorId) {
          setSelectedInspectorId(defaultInsp.clerkUserId || defaultInsp.id);
        }
      })
      .catch(() => {});
  }, [claimId, fetchAttachedClient]);

  // SECURITY: Early return AFTER all hooks to avoid React Hook ordering violation
  if (!claimId) return null;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use new workspace endpoint (single request, no race conditions)
      const workspaceRes = await fetch(`/api/claims/${claimId}/workspace`);

      if (!workspaceRes.ok) {
        if (workspaceRes.status === 404) {
          setError("NOT_FOUND");
        } else if (workspaceRes.status === 401) {
          setError("UNAUTHORIZED");
        } else if (workspaceRes.status >= 500) {
          // Server error — NOT a network issue, the server hit an error
          logger.error("[ClaimOverview] Server error:", workspaceRes.status);
          setError("SERVER_ERROR");
        } else {
          setError("NETWORK_ERROR");
        }
        setLoading(false);
        return;
      }

      const workspaceData = await workspaceRes.json();

      if (workspaceData.redirect) {
        // Handle canonical redirect
        router.push(workspaceData.canonicalUrl);
        return;
      }

      // Support both response shapes:
      // 1) { success, data: { claim, stats } }
      // 2) { success, claim } (legacy)
      if (workspaceData.success) {
        const claimInfo = workspaceData.data?.claim ?? workspaceData.claim;
        const workspaceStats = workspaceData.data?.stats ?? null;

        if (claimInfo) {
          setClaim({
            id: claimInfo.id,
            title: claimInfo.title ?? (claimInfo.claimNumber || claimId),
            description: claimInfo.description ?? null,
            damageType: claimInfo.damageType ?? null,
            dateOfLoss: claimInfo.lossDate ?? null,
            dateOfInspection: claimInfo.inspectionDate ?? null,
            status: claimInfo.status ?? "active",
            lifecycleStage: null,
            insured_name: claimInfo.insured_name || null,
            homeowner_email: claimInfo.homeowner_email || claimInfo.homeownerEmail || null,
            homeowner_phone: claimInfo.homeowner_phone || claimInfo.homeownerPhone || null,
            carrier: claimInfo.carrier ?? null,
            policy_number: claimInfo.policyNumber ?? null,
            adjusterName: claimInfo.adjusterName || null,
            adjusterPhone: claimInfo.adjusterPhone || null,
            adjusterEmail: claimInfo.adjusterEmail || null,
            propertyId: claimInfo.propertyId ?? null,
            contactId: claimInfo.contactId ?? null,
            propertyAddress: claimInfo.propertyAddress || null,
            propertyStreet: claimInfo.propertyStreet || null,
            propertyCity: claimInfo.propertyCity || null,
            propertyState: claimInfo.propertyState || null,
            propertyZip: claimInfo.propertyZip || null,
            // Signing status
            signingStatus: claimInfo.signingStatus || "pending",
            // Job value
            estimatedJobValue: claimInfo.estimatedJobValue ?? null,
            jobValueStatus: claimInfo.jobValueStatus || "draft",
            jobValueApprovedBy: claimInfo.jobValueApprovedBy || null,
            jobValueApprovalNotes: claimInfo.jobValueApprovalNotes || null,
          });

          setStats({
            photosCount: workspaceStats?.evidenceCount ?? 0,
            documentsCount: workspaceStats?.documentsCount ?? 0,
            timelineCount: workspaceStats?.timelineEventCount ?? 0,
            reportsCount: workspaceStats?.reportCount ?? 0,
          });
        } else {
          setError("NOT_FOUND");
        }
      }
    } catch (error) {
      logger.error("Failed to fetch workspace data:", error);
      setError("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  };

  // Loading state with skeleton
  if (loading) {
    return <ClaimWorkspaceSkeleton />;
  }

  // Error states with retry
  if (error === "NOT_FOUND") {
    return <ClaimNotFoundError claimId={claimId} />;
  }

  if (error === "NETWORK_ERROR" || error === "SERVER_ERROR") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-md space-y-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center shadow-lg dark:border-amber-800 dark:bg-amber-950/30">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <svg
              className="h-8 w-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
            {error === "SERVER_ERROR" ? "Something went wrong" : "Connection Error"}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {error === "SERVER_ERROR"
              ? "We hit a temporary issue loading this claim. This usually resolves itself — try refreshing."
              : "We couldn't connect to the server. Check your internet connection and try again."}
          </p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!claim) {
    return <ClaimNotFoundError claimId={claimId} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Content - Left 2 columns */}
      <div className="space-y-6 lg:col-span-2">
        {/* Quick Contact Card — thin Call / Text / Email / Message bar */}
        {attachedClient && (attachedClient.phone || attachedClient.email) && (
          <UniversalContactCard contact={attachedClient} compact />
        )}
        {/* Fallback: show contact card from claim fields if no attached client */}
        {!attachedClient && (claim.insured_name || claim.homeowner_email) && (
          <UniversalContactCard
            contact={{
              id: claim.contactId || `claim-${claimId}`,
              name: claim.insured_name,
              email: claim.homeowner_email,
              contactType: "homeowner",
              claimId,
            }}
            compact
          />
        )}

        {/* 1. Connected Client — first so user sees who's attached */}
        <TabErrorBoundary tabName="Client Management">
          <SectionCard title="Connected Client">
            <ClientConnectSection claimId={claimId} currentClientId={claim.contactId} />
          </SectionCard>
        </TabErrorBoundary>

        {/* 2. Overview Counters — quick glance metrics */}
        <SectionCard title="Overview">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricPill label="Photos" value={stats.photosCount} />
            <MetricPill label="Documents" value={stats.documentsCount ?? 0} />
            <MetricPill label="Timeline Events" value={stats.timelineCount} />
            <MetricPill label="Reports" value={stats.reportsCount} />
          </div>
        </SectionCard>

        {/* 2b. Signing Status + Job Value — key workflow controls */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Signing Status Dropdown */}
          <SectionCard title="Signing Status">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    claim.signingStatus === "signed"
                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                      : claim.signingStatus === "declined"
                        ? "bg-red-100 dark:bg-red-900/40"
                        : "bg-amber-100 dark:bg-amber-900/40"
                  }`}
                >
                  <ShieldCheck
                    className={`h-5 w-5 ${
                      claim.signingStatus === "signed"
                        ? "text-emerald-600"
                        : claim.signingStatus === "declined"
                          ? "text-red-600"
                          : "text-amber-600"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Contract Status
                  </label>
                  <select
                    value={claim.signingStatus}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      setClaim((prev) => (prev ? { ...prev, signingStatus: newStatus } : null));
                      queueSave("signingStatus", newStatus);
                    }}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600"
                  >
                    <option value="pending">⏳ Pending Signature</option>
                    <option value="signed">✅ Signed</option>
                    <option value="declined">❌ Declined</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {claim.signingStatus === "signed"
                  ? "This claim is signed and counts toward leaderboard totals."
                  : claim.signingStatus === "declined"
                    ? "Client declined. This claim won't count on the leaderboard."
                    : "Pending claims are not counted on the leaderboard until signed."}
              </p>
            </div>
          </SectionCard>

          {/* Job Value Estimation Box */}
          <SectionCard title="Estimated Job Value">
            <JobValueBox
              entityId={claimId}
              entityType="claim"
              estimatedJobValue={claim.estimatedJobValue}
              jobValueStatus={claim.jobValueStatus}
              jobValueApprovedBy={claim.jobValueApprovedBy}
              jobValueApprovalNotes={claim.jobValueApprovalNotes}
              onUpdate={(updates) => {
                setClaim((prev) => (prev ? { ...prev, ...updates } : null));
              }}
            />
          </SectionCard>
        </div>

        {/* 3. Client & Property Info */}
        <SectionCard title="Client Information" editable>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="Client Name"
                value={claim.insured_name}
                onSave={async (value) => handleFieldUpdate("insured_name", value)}
                placeholder="Enter client name"
              />
              <EditableField
                label="Email"
                value={claim.homeowner_email}
                onSave={async (value) => handleFieldUpdate("homeowner_email", value)}
                type="email"
                placeholder="client@example.com"
              />
              {/* Phone is read-only since it comes from the contact relationship */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <div className="mt-1 rounded-lg px-3 py-2 text-sm text-foreground">
                  {claim.homeowner_phone || (
                    <span className="italic text-muted-foreground">No phone on file</span>
                  )}
                </div>
              </div>
              <EditableField
                label="Insurance Carrier"
                value={claim.carrier}
                onSave={async (value) => handleFieldUpdate("carrier", value)}
                placeholder="Enter carrier name"
              />
              <EditableField
                label="Policy Number"
                value={claim.policy_number}
                onSave={async (value) => handleFieldUpdate("policy_number", value)}
                placeholder="Enter policy number"
                mono
              />
              <div className="col-span-2 space-y-3">
                <EditableField
                  label="Street Address"
                  value={claim.propertyStreet}
                  onSave={async (value) => handleFieldUpdate("propertyStreet", value)}
                  placeholder="123 Main St"
                />
                <div className="grid grid-cols-3 gap-3">
                  <EditableField
                    label="City"
                    value={claim.propertyCity}
                    onSave={async (value) => handleFieldUpdate("propertyCity", value)}
                    placeholder="City"
                  />
                  <EditableField
                    label="State"
                    value={claim.propertyState}
                    onSave={async (value) => handleFieldUpdate("propertyState", value)}
                    placeholder="AZ"
                  />
                  <EditableField
                    label="Zip Code"
                    value={claim.propertyZip}
                    onSave={async (value) => handleFieldUpdate("propertyZip", value)}
                    placeholder="85001"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Assigned Inspector</h4>
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground">Inspector</label>
                <select
                  value={selectedInspectorId || ""}
                  onChange={(e) => {
                    const inspId = e.target.value;
                    setSelectedInspectorId(inspId || null);
                    queueSave("inspectorId", inspId || null);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600"
                >
                  <option value="">Select inspector…</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.clerkUserId || m.id}>
                      {m.name || "Unnamed"}
                      {m.title ? ` — ${m.title}` : ""}
                      {m.is_default_inspector ? " ★" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Inspector profile will be injected into damage reports and cover pages.
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Adjuster Contact</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <EditableField
                  label="Name"
                  value={claim.adjusterName}
                  onSave={async (value) => handleFieldUpdate("adjusterName", value)}
                  placeholder="Adjuster name"
                />
                <EditableField
                  label="Phone"
                  value={claim.adjusterPhone}
                  onSave={async (value) => handleFieldUpdate("adjusterPhone", value)}
                  type="tel"
                  placeholder="(555) 123-4567"
                />
                <EditableField
                  label="Email"
                  value={claim.adjusterEmail}
                  onSave={async (value) => handleFieldUpdate("adjusterEmail", value)}
                  type="email"
                  placeholder="adjuster@insurance.com"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 4. Claim Details */}
        <SectionCard title="Claim Details" editable>
          <div
            id="claim-details-section"
            className="scroll-mt-24 space-y-3 rounded-lg transition-all duration-300"
          >
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="Title"
                value={claim.title}
                onSave={async (value) => handleFieldUpdate("title", value)}
                placeholder="Enter claim title"
              />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Workflow Status</label>
                {(() => {
                  const mapped = mapToWorkflowStatus(claim.status);
                  const info = getWorkflowStatusInfo(mapped);
                  return (
                    <select
                      value={mapped}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        setClaim((prev) => (prev ? { ...prev, status: newStatus } : null));
                        queueSave("status", newStatus);
                      }}
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600"
                    >
                      {WORKFLOW_STATUSES.map((ws) => (
                        <option key={ws.value} value={ws.value}>
                          {ws.emoji} {ws.label}
                        </option>
                      ))}
                    </select>
                  );
                })()}
                <p className="mt-1 text-xs text-muted-foreground">
                  {getWorkflowStatusInfo(mapToWorkflowStatus(claim.status)).description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="Date of Loss"
                value={claim.dateOfLoss}
                onSave={async (value) => handleFieldUpdate("dateOfLoss", value)}
                type="date"
              />
              <EditableField
                label="Date of Inspection"
                value={claim.dateOfInspection}
                onSave={async (value) => handleFieldUpdate("dateOfInspection", value)}
                type="date"
                placeholder="Select inspection date"
              />
            </div>

            <EditableTextareaField
              label="Description"
              value={claim.description}
              placeholder="Add a brief claim summary…"
              onSave={async (value) => handleFieldUpdate("description", value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Damage Type</label>
                <select
                  value={claim.damageType || ""}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setClaim((prev) => (prev ? { ...prev, damageType: newType || null } : null));
                    queueSave("damageType", newType || null);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600"
                >
                  <option value="">Select damage type</option>
                  <option value="Hail">Hail</option>
                  <option value="Wind">Wind</option>
                  <option value="Water">Water</option>
                  <option value="Fire">Fire</option>
                  <option value="Storm">Storm</option>
                  <option value="Lightning">Lightning</option>
                  <option value="Tornado">Tornado</option>
                  <option value="Hurricane">Hurricane</option>
                  <option value="Flood">Flood</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {claim.lifecycleStage && (
                <div>
                  <label className="text-xs text-muted-foreground">Stage</label>
                  <p className="text-foreground">{claim.lifecycleStage}</p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* 5. Actions — on the bottom */}
        <SectionCard title="Actions">
          <div className="space-y-5">
            {/* AI Generation Actions */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Generate
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href={`/claims/${claimId}/supplement`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
                >
                  <Layers className="h-4 w-4" />
                  Supplement
                </Link>
                <Link
                  href={`/claims/rebuttal-builder?claimId=${claimId}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
                >
                  <FileText className="h-4 w-4" />
                  Rebuttal
                </Link>
                <CarrierExportButton claimId={claimId} carrier={claim.carrier} />
                <button
                  type="button"
                  onClick={handleWeatherVerification}
                  disabled={generatingWeather}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                >
                  <CloudLightning className="h-4 w-4" />
                  {generatingWeather ? "Scanning…" : "Weather Verify"}
                </button>
                <GenerateReportButton
                  claimId={claimId}
                  variant="outline"
                  className="inline-flex items-center gap-2 rounded-xl border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                />
              </div>
            </div>

            {/* Build Documents */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Build Documents
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href={`/claims-ready-folder/${claimId}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200/80 bg-blue-50/80 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Claim Packet
                </Link>
                <Link
                  href={`/reports/contractor-packet?claimId=${claimId}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900"
                >
                  <PenLine className="h-4 w-4" />
                  Bid Package
                </Link>
              </div>
            </div>

            {/* Closeout */}
            <div className="border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lifecycle
              </p>
              <RequestCloseoutButton
                entityId={claimId}
                entityType="claim"
                entityTitle={claim.title}
                currentStatus={claim.status}
                onCloseoutRequested={fetchData}
              />
              <div className="mt-4">
                <CloseoutChecklist entityId={claimId} entityType="claim" />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Sidebar - Right column */}
      <div className="lg:col-span-1">
        <ClaimsSidebar
          claimId={claimId}
          claim={{
            insured_name: claim.insured_name,
            homeowner_email: claim.homeowner_email,
            carrier: claim.carrier,
            policy_number: claim.policy_number,
            adjusterName: claim.adjusterName,
            adjusterPhone: claim.adjusterPhone,
            adjusterEmail: claim.adjusterEmail,
            propertyAddress: claim.propertyAddress,
            dateOfLoss: claim.dateOfLoss,
            dateOfInspection: claim.dateOfInspection,
          }}
          onFieldUpdate={(field, value) => {
            // Sync sidebar edits back into overview state
            setClaim((prev) => (prev ? { ...prev, [field]: value } : null));
          }}
        />
      </div>
    </div>
  );
}

// src/app/(app)/claims/[claimId]/overview/page.tsx
"use client";

import { FileText, Layers } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EditableField } from "@/components/claims/EditableField";
import { ClaimNotFoundError, NetworkError } from "@/components/errors/ErrorStates";
import { TabErrorBoundary } from "@/components/errors/TabErrorBoundary";
import { ClaimWorkspaceSkeleton } from "@/components/loading/LoadingStates";

import { logger } from "@/lib/logger";
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
  carrier: string | null;
  policy_number: string | null;
  adjusterName: string | null;
  adjusterPhone: string | null;
  adjusterEmail: string | null;
  propertyId: string | null;
  propertyAddress: string | null;
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

  useEffect(() => {
    if (!isEditing) setDraft(value || "");
  }, [isEditing, value]);

  const commit = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
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
      <div className="mt-1 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder={placeholder}
          disabled={saving}
          className="w-full rounded-lg border border-blue-400 bg-background px-3 py-2 text-sm text-foreground outline-none ring-2 ring-blue-200 transition-colors focus:border-blue-500 focus:ring-blue-300 disabled:opacity-50"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={commit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            disabled={saving}
            className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
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
  const saveQueueRef = useRef<{ [key: string]: any }>({});
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SECURITY: Early return AFTER all hooks to avoid React Hook ordering violation
  if (!claimId) return null;

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

          toast.success("Changes saved", { duration: 2000 });
        } catch (err) {
          toast.error(err.message || "Failed to save changes");
          // Revert optimistic updates on failure
          fetchData();
        }
      }, 2000);
    },
    [claimId]
  );

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

  useEffect(() => {
    fetchData();
  }, [claimId]);

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
            homeowner_email: claimInfo.homeowner_email || null,
            carrier: claimInfo.carrier ?? null,
            policy_number: claimInfo.policyNumber ?? null,
            adjusterName: claimInfo.adjusterName || null,
            adjusterPhone: claimInfo.adjusterPhone || null,
            adjusterEmail: claimInfo.adjusterEmail || null,
            propertyId: claimInfo.propertyId ?? null,
            propertyAddress: claimInfo.propertyAddress || null,
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

  if (error === "NETWORK_ERROR") {
    return <NetworkError onRetry={fetchData} />;
  }

  if (!claim) {
    return <ClaimNotFoundError claimId={claimId} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Content - Left 2 columns */}
      <div className="space-y-6 lg:col-span-2">
        {/* 1. Connected Client — first so user sees who's attached */}
        <TabErrorBoundary tabName="Client Management">
          <SectionCard title="Connected Client">
            <ClientConnectSection claimId={claimId} currentClientId={claim.propertyId} />
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
              <EditableField
                label="Property Address"
                value={claim.propertyAddress}
                onSave={async (value) => handleFieldUpdate("propertyAddress", value)}
                placeholder="123 Main St, City, State"
              />
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="Title"
                value={claim.title}
                onSave={async (value) => handleFieldUpdate("title", value)}
                placeholder="Enter claim title"
              />
              <EditableField
                label="Status"
                value={claim.status}
                onSave={async (value) => handleFieldUpdate("status", value)}
                placeholder="new"
              />
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
              {claim.damageType && (
                <div>
                  <label className="text-xs text-muted-foreground">Damage Type</label>
                  <p className="text-foreground">{claim.damageType}</p>
                </div>
              )}
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
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/claims/${claimId}/supplement`}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:bg-yellow-700 dark:hover:bg-yellow-800"
            >
              <Layers className="h-4 w-4" />
              Generate Supplement
            </Link>
            <Link
              href={`/claims/rebuttal-builder?claimId=${claimId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <FileText className="h-4 w-4" />
              Generate Rebuttal
            </Link>
            <GenerateReportButton
              claimId={claimId}
              variant="outline"
              className="inline-flex items-center gap-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            />
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
        />
      </div>
    </div>
  );
}

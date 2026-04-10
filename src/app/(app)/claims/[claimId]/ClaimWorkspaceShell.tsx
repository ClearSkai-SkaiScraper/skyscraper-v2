"use client";

import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileSignature,
  FileText,
  FolderOpen,
  Home,
  Images,
  Loader2,
  Save,
  Share2,
  Sparkles,
  Upload,
  User,
  Wrench,
  X,
} from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";

import { AIControlPanel } from "@/components/claims/AIControlPanel";
import { QuickAIActions } from "@/components/claims/QuickAIActions";
import { UniversalContactCard } from "@/components/contacts/UniversalContactCard";
import { ArchiveJobButton } from "@/components/jobs/ArchiveJobButton";
import { TransferJobDropdown } from "@/components/jobs/TransferJobDropdown";
import { DamageBoxOverlay } from "@/components/photos/DamageBoxOverlay";
import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

import { ClaimAIAssistant } from "./_components/ClaimAIAssistant";
import ClaimDetailsSection from "./ClaimDetailsSection";
import TimelineNotesSection from "./TimelineNotesSection";

type ClaimWorkspaceProps = {
  claim: {
    id: string;
    claimNumber: string | null;
    status: string | null;
    insured_name: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    dateOfLoss: Date | null;
    carrier: string | null;
    adjusterName: string | null;
    adjusterPhone: string | null;
    adjusterEmail: string | null;
    policyNumber: string | null;
    rcvTotal: number | null;
    acvTotal: number | null;
    deductible: number | null;
    damageType: string | null;
    createdAt: Date;
    updatedAt: Date;
    source?: string | null;
    // ✅ PHASE R: Add contact relation (null-safe)
    contact?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    } | null;
  };
  aiReports?: Array<{
    id: string;
    reportType: string | null;
    status: string | null;
    pdfUrl: string | null;
    createdAt: Date;
  }>;
  documents?: Array<{
    id: string;
    type: string | null;
    title: string | null;
    publicUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
    createdAt: Date;
    isSharedWithClient?: boolean;
    sharedAt?: Date | null;
  }>;
  timeline?: Array<{
    id: string;
    title: string | null;
    description: string | null;
    eventType: string | null;
    createdAt: Date;
    createdBy: string | null;
  }>;
  notes?: Array<{
    id: string;
    body: string | null;
    noteType: string | null;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
  }>;
  photos?: Array<{
    id: string;
    photoUrl: string;
    caption: string | null;
    category: string | null;
    createdAt: Date;
  }>;
};

type TabId =
  | "overview"
  | "details"
  | "contacts"
  | "documents"
  | "photos"
  | "damage"
  | "ai"
  | "financials"
  | "timeline";

export function ClaimWorkspaceShell({
  claim: initialClaim,
  aiReports = [],
  documents = [],
  timeline = [],
  notes = [],
  photos = [],
}: ClaimWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarCollapsed, _setSidebarCollapsed] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [claim, setClaim] = useState(initialClaim);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Debug logging on mount
  useEffect(() => {
    logger.debug("[ClaimWorkspaceShell] Component mounted", {
      claimId: initialClaim.id,
      claimNumber: initialClaim.claimNumber,
      status: initialClaim.status,
      hasContact: !!initialClaim.contact,
      aiReportsCount: aiReports.length,
      documentsCount: documents.length,
      timelineCount: timeline.length,
      notesCount: notes.length,
      photosCount: photos.length,
    });

    // Catch any client-side initialization errors
    try {
      if (!initialClaim?.id) {
        logger.error("[ClaimWorkspaceShell] Invalid claim data: missing ID");
      }
    } catch (error) {
      logger.error("[ClaimWorkspaceShell] Error during initialization", {
        message: error?.message,
        name: error?.name,
      });
    }
  }, [initialClaim, aiReports, documents, timeline, notes, photos]);

  // Save individual field
  const saveField = async (fieldName: string, value: any) => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldName]: value }),
      });

      if (!response.ok) {
        setSaveMessage("✗ Failed to save");
        setSaving(false);
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      const _data = await response.json();
      setClaim({ ...claim, [fieldName]: value });
      setSaveMessage("✓ Saved");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      logger.error("Save error", { error });
      setSaveMessage("✗ Failed to save");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Copy claim summary to clipboard
  const copyClaimSummary = async () => {
    const address = [claim.addressLine1, claim.city, claim.state, claim.postalCode]
      .filter(Boolean)
      .join(", ");

    const summary = `CLAIM SUMMARY
═══════════════════════════════════
Claim #: ${claim.claimNumber || "N/A"}
Status: ${claim.status || "N/A"}
Insured: ${claim.insured_name || "N/A"}
Address: ${address || "N/A"}
Date of Loss: ${claim.dateOfLoss ? new Intl.DateTimeFormat("en-US").format(new Date(claim.dateOfLoss)) : "N/A"}

INSURANCE
Carrier: ${claim.carrier || "N/A"}
Policy #: ${claim.policyNumber || "N/A"}
Adjuster: ${claim.adjusterName || "N/A"}
Phone: ${claim.adjusterPhone || "N/A"}
Email: ${claim.adjusterEmail || "N/A"}

FINANCIALS
RCV: ${formatCurrency(claim.rcvTotal)}
ACV: ${formatCurrency(claim.acvTotal)}
Deductible: ${formatCurrency(claim.deductible)}
═══════════════════════════════════`;

    try {
      await navigator.clipboard.writeText(summary);
      setSaveMessage("✓ Copied to clipboard");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage("✗ Failed to copy");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "details", label: "Claim Details", icon: FileText },
    { id: "contacts", label: "Contacts & Property", icon: User },
    { id: "documents", label: "Documents", icon: FolderOpen },
    { id: "photos", label: "Photos & Media", icon: Images },
    { id: "damage", label: "Damage & Scope", icon: Wrench },
    { id: "ai", label: "AI Reports", icon: Brain },
    { id: "financials", label: "Financials", icon: DollarSign },
    { id: "timeline", label: "Timeline & Notes", icon: Clock },
  ];

  const fullAddress = [
    claim.addressLine1,
    claim.addressLine2,
    [claim.city, claim.state].filter(Boolean).join(", "),
    claim.postalCode,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      {/* Left Sidebar - Navigation */}
      <div
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900`}
      >
        {!sidebarCollapsed && (
          <>
            {/* Sidebar Header */}
            <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              {claim.source === "portal" && (
                <div className="mb-2 rounded-lg bg-blue-50 px-2 py-1 dark:bg-blue-900/20">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    🌐 From Client Portal
                  </p>
                </div>
              )}
              <p className="text-xs uppercase tracking-wide text-slate-400">Claim Workspace</p>
              <h1 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {claim.claimNumber || "Unnumbered Claim"}
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {claim.insured_name || "Unknown Insured"}
              </p>
              {fullAddress && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Home className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{fullAddress}</span>
                </p>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition ${
                      active
                        ? "bg-slate-900 text-white dark:bg-slate-700"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {claim.carrier || "Carrier not set"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Date of loss:{" "}
              {claim.dateOfLoss
                ? new Intl.DateTimeFormat("en-US").format(new Date(claim.dateOfLoss))
                : "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">RCV</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(claim.rcvTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">ACV</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(claim.acvTotal)}
              </p>
            </div>
            <StatusBadge status={claim.status || "Draft"} />
            <div className="ml-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyClaimSummary}
                title="Copy claim summary to clipboard"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
              <TransferJobDropdown jobId={claim.id} currentCategory="claim" />
              <ArchiveJobButton
                jobId={claim.id}
                jobTitle={claim.claimNumber || claim.insured_name || "Claim"}
                type="claim"
              />
            </div>
          </div>
        </header>

        {/* Save indicator */}
        {saveMessage && (
          <div className="fixed right-6 top-20 z-50 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <p
              className={`text-sm font-medium ${saveMessage.startsWith("✓") ? "text-green-600" : "text-red-600"}`}
            >
              {saveMessage}
            </p>
          </div>
        )}

        {/* Tab content */}
        <section className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <OverviewSection
              claim={claim}
              aiReports={aiReports}
              onSave={saveField}
              saving={saving}
            />
          )}
          {activeTab === "details" && (
            <ClaimDetailsSection
              claimId={claim.id}
              initialData={{
                claimNumber: claim.claimNumber,
                policy_number: claim.policyNumber,
                status: claim.status,
                damageType: claim.damageType,
                dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0] || null,
                insured_name: claim.insured_name,
                homeowner_email: null, // You can add this to claim type if available
                carrier: claim.carrier,
                adjusterName: claim.adjusterName,
                adjusterPhone: claim.adjusterPhone,
                adjusterEmail: claim.adjusterEmail,
                estimatedValue: claim.rcvTotal,
                approvedValue: claim.acvTotal,
                deductible: claim.deductible,
                priority: null, // Add if available
                title: null, // Add if available
                description: null, // Add if available
              }}
            />
          )}
          {activeTab === "contacts" && (
            <ContactsSection claim={claim} onSave={saveField} saving={saving} />
          )}
          {activeTab === "documents" && (
            <DocumentsSection claimId={claim.id} documents={documents} />
          )}
          {activeTab === "photos" && <PhotosSection claimId={claim.id} />}
          {activeTab === "damage" && <DamageSection claimId={claim.id} />}
          {activeTab === "ai" && <AISection claimId={claim.id} aiReports={aiReports} />}
          {activeTab === "financials" && (
            <FinancialsSection claim={claim} onSave={saveField} saving={saving} />
          )}
          {activeTab === "timeline" && (
            <TimelineNotesSection
              claimId={claim.id}
              timeline={timeline.map((event) => ({
                ...event,
                createdAt: event.createdAt.toISOString(),
              }))}
              notes={notes.map((note) => ({
                ...note,
                createdAt: note.createdAt.toISOString(),
                updatedAt: note.updatedAt.toISOString(),
              }))}
            />
          )}
        </section>
      </div>

      {/* Right Sidebar - AI Assistant */}
      {aiPanelOpen && (
        <div className="w-96 flex-shrink-0 border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <ClaimAIAssistant
            claimId={claim.id}
            claimData={{
              claimNumber: claim.claimNumber,
              insured_name: claim.insured_name,
              carrier: claim.carrier,
              damageType: claim.damageType,
            }}
          />
        </div>
      )}

      {/* Toggle AI Panel Button */}
      <button
        onClick={() => setAiPanelOpen(!aiPanelOpen)}
        className="fixed right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-lg bg-blue-600 p-2 text-white shadow-lg hover:bg-blue-700"
        aria-label={aiPanelOpen ? "Close AI Assistant" : "Open AI Assistant"}
      >
        {aiPanelOpen ? <EyeOff className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
    complete: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  const colorClass = statusColors[status.toLowerCase()] || statusColors.new;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}
    >
      {status}
    </span>
  );
}

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** SECTION COMPONENTS */

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function OverviewSection({
  claim,
  aiReports = [],
  onSave: _onSave,
  saving: _saving,
}: {
  claim: ClaimWorkspaceProps["claim"];
  aiReports?: ClaimWorkspaceProps["aiReports"];
  onSave: (field: string, value: any) => Promise<void>;
  saving: boolean;
}) {
  const recoverable = (claim.rcvTotal ?? 0) - (claim.acvTotal ?? 0);
  const netToHomeowner = (claim.acvTotal ?? 0) - (claim.deductible ?? 0);

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Claim Status">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-semibold">{claim.status || "Draft"}</span>
          </div>
        </Card>
        <Card title="Days Open">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">
              {Math.floor(
                (new Date().getTime() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              )}
            </span>
          </div>
        </Card>
        <Card title="Documents">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">{aiReports?.length || 0}</span>
          </div>
        </Card>
        <Card title="Next Action">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span className="text-xs">Review damage</span>
          </div>
        </Card>
      </div>

      {/* Main Overview Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Quick Snapshot">
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Claim #</dt>
              <dd className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {claim.claimNumber || "N/A"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Carrier</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {claim.carrier || "Unknown"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Policy #</dt>
              <dd className="font-mono text-slate-900 dark:text-slate-100">
                {claim.policyNumber || "N/A"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Date of Loss</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {claim.dateOfLoss
                  ? new Intl.DateTimeFormat("en-US").format(new Date(claim.dateOfLoss))
                  : "N/A"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Damage Type</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {claim.damageType || "Not specified"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Financial Summary">
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">RCV Total</dt>
              <dd className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(claim.rcvTotal)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">ACV Total</dt>
              <dd className="font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(claim.acvTotal)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Deductible</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {formatCurrency(claim.deductible)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Recoverable Depreciation</dt>
              <dd className="font-medium text-orange-600 dark:text-orange-400">
                {formatCurrency(recoverable)}
              </dd>
            </div>
            <div className="flex justify-between pt-2">
              <dt className="font-semibold text-slate-700 dark:text-slate-300">Net to Homeowner</dt>
              <dd className="font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(netToHomeowner)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Next Actions */}
      <Card title="🎯 Next Actions">
        <div className="space-y-2">
          <ActionItem
            icon="📸"
            title="Upload damage photos"
            description="Add photos to enable AI damage detection"
          />
          <ActionItem
            icon="🤖"
            title="Generate AI report"
            description="Create automated damage assessment"
          />
          <ActionItem
            icon="📞"
            title="Contact adjuster"
            description={
              claim.adjusterName
                ? `Follow up with ${claim.adjusterName}`
                : "Assign adjuster contact"
            }
          />
        </div>
      </Card>
    </div>
  );
}

function ActionItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function EditableField({
  label: _label,
  value,
  field,
  onSave,
  saving,
  type = "text",
}: {
  label: string;
  value: any;
  field: string;
  onSave: (field: string, value: any) => Promise<void>;
  saving: boolean;
  type?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");

  const handleSave = async () => {
    if (localValue !== value) {
      await onSave(field, localValue);
    }
    setIsEditing(false);
  };

  const displayValue =
    type === "date" && value
      ? new Intl.DateTimeFormat("en-US").format(new Date(value))
      : value || "Not set";

  if (!isEditing) {
    return (
      <div className="group flex items-center justify-between">
        <span className="text-slate-900 dark:text-slate-100">{displayValue}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="ml-2 text-xs text-blue-600 opacity-0 hover:text-blue-700 group-hover:opacity-100 dark:text-blue-400"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
        disabled={saving}
        autoFocus
        aria-label={`Edit ${field}`}
        placeholder="Enter value"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs text-green-600 hover:text-green-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
      </button>
      <button
        onClick={() => {
          setLocalValue(value || "");
          setIsEditing(false);
        }}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>
    </div>
  );
}

function _DetailsSection({
  claim,
  onSave,
  saving,
}: {
  claim: ClaimWorkspaceProps["claim"];
  onSave: (field: string, value: any) => Promise<void>;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card title="Core Claim Information">
        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          <div>
            <dt className="mb-1 font-medium text-slate-500 dark:text-slate-400">Claim Number</dt>
            <dd className="font-mono">
              <EditableField
                label="Claim Number"
                value={claim.claimNumber}
                field="claimNumber"
                onSave={onSave}
                saving={saving}
              />
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-slate-500 dark:text-slate-400">Policy Number</dt>
            <dd className="font-mono">
              <EditableField
                label="Policy Number"
                value={claim.policyNumber}
                field="policyNumber"
                onSave={onSave}
                saving={saving}
              />
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-slate-500 dark:text-slate-400">Carrier</dt>
            <dd>
              <EditableField
                label="Carrier"
                value={claim.carrier}
                field="carrier"
                onSave={onSave}
                saving={saving}
              />
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-slate-500 dark:text-slate-400">Status</dt>
            <dd>
              <StatusBadge status={claim.status || "Draft"} />
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-slate-500 dark:text-slate-400">Date of Loss</dt>
            <dd className="text-slate-900 dark:text-slate-100">
              {claim.dateOfLoss
                ? new Intl.DateTimeFormat("en-US").format(new Date(claim.dateOfLoss))
                : "N/A"}
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-slate-500 dark:text-slate-400">Damage Type</dt>
            <dd className="text-slate-900 dark:text-slate-100">
              {claim.damageType || "Not specified"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="mb-1 font-medium text-slate-500 dark:text-slate-400">Created</dt>
            <dd className="text-slate-900 dark:text-slate-100">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "full",
                timeStyle: "short",
              }).format(new Date(claim.createdAt))}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Loss Details">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Detailed cause of loss, extent of damage, affected areas, and initial assessment notes
          will appear here. This section integrates with the AI damage detection system.
        </p>
      </Card>
    </div>
  );
}

function ContactsSection({
  claim,
  onSave: _onSave,
  saving: _saving,
}: {
  claim: ClaimWorkspaceProps["claim"];
  onSave: (field: string, value: any) => Promise<void>;
  saving: boolean;
}) {
  const contact = claim.contact ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Insured / Homeowner — as UniversalContactCard */}
        {claim.insured_name ? (
          <UniversalContactCard
            contact={{
              id: `claim-insured-${claim.id}`,
              name: claim.insured_name,
              email: (claim as any).homeownerEmail || (claim as any).homeowner_email || null,
              phone: null,
              contactType: "homeowner",
              claimId: claim.id,
              tags: [claim.claimNumber || ""].filter(Boolean),
            }}
          />
        ) : (
          <Card title="Insured / Homeowner">
            <p className="text-xs text-muted-foreground">No insured information provided</p>
          </Card>
        )}

        {/* Linked Contact from contacts table */}
        {contact ? (
          <UniversalContactCard
            contact={{
              id: contact.id || `claim-contact-${claim.id}`,
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              contactType: "client",
              href: contact.id ? `/contacts/${contact.id}` : undefined,
            }}
          />
        ) : (
          <Card title="Linked Contact">
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              No contact is currently assigned to this claim. You can attach one from the contacts
              list or add a new contact.
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Adjuster Contact — as UniversalContactCard */}
        {claim.adjusterName ? (
          <UniversalContactCard
            contact={{
              id: `claim-adjuster-${claim.id}`,
              name: claim.adjusterName,
              phone: claim.adjusterPhone,
              email: claim.adjusterEmail,
              contactType: "adjuster",
              company: claim.carrier || undefined,
              claimId: claim.id,
            }}
          />
        ) : (
          <Card title="Adjuster Contact">
            <p className="text-xs text-muted-foreground">No adjuster assigned yet</p>
          </Card>
        )}
      </div>

      <Card title="Property Details">
        <p className="text-xs text-muted-foreground">
          Property characteristics, mortgage company info, additional contacts, and contractor
          assignments will be managed here. Future integration with properties table.
        </p>
      </Card>
    </div>
  );
}

function DocumentsSection({
  claimId,
  documents = [],
}: {
  claimId: string;
  documents?: ClaimWorkspaceProps["documents"];
}) {
  const [filter, setFilter] = useState<"all" | "internal" | "shared">("all");
  const [signingDoc, setSigningDoc] = useState<string | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  const handleDocumentUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "claimDocuments");
      formData.append("claimId", claimId);

      try {
        const res = await fetch("/api/upload/supabase", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          logger.error("Failed to upload file", { fileName: file.name });
        }
      } catch (err) {
        logger.error("Error uploading file", { fileName: file.name, error: err });
      }
    }

    // Reload to show new documents
    window.location.reload();
  };

  const filteredDocs = documents.filter((doc) => {
    if (filter === "internal") return !doc.isSharedWithClient;
    if (filter === "shared") return doc.isSharedWithClient;
    return true;
  });

  const handleToggleShare = async (docId: string, currentlyShared: boolean) => {
    try {
      const response = await fetch(`/api/claims/${claimId}/documents/${docId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: !currentlyShared }),
      });

      if (!response.ok) {
        alert("Failed to update document sharing");
        return;
      }

      // Reload page to refresh data
      window.location.reload();
    } catch (error) {
      logger.error("Error toggling share", { error });
      alert("Failed to update document sharing");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "all"
              ? "bg-slate-900 text-white dark:bg-slate-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("internal")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "internal"
              ? "bg-slate-900 text-white dark:bg-slate-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          Internal Only
        </button>
        <button
          onClick={() => setFilter("shared")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "shared"
              ? "bg-slate-900 text-white dark:bg-slate-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          Shared with Client
        </button>
      </div>

      <Card
        title="📁 Claim Documents"
        className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800"
      >
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          multiple
          className="hidden"
          aria-label="Upload claim documents"
          onChange={async (e) => {
            if (!e.target.files) return;
            setUploadingDocs(true);
            await handleDocumentUpload(e.target.files);
            setUploadingDocs(false);
          }}
        />

        <div className="mb-4 flex gap-2">
          <Button
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingDocs}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploadingDocs ? "Uploading..." : "Upload Document"}
          </Button>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <FolderOpen className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              {filter === "shared" ? "No shared documents yet" : "No documents yet"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filter === "shared"
                ? "Share documents with clients using the toggle"
                : "Upload estimates, policies, adjuster reports, and correspondence"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <div className="flex flex-1 items-center gap-3">
                  <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {doc.title || "Untitled"}
                      </p>
                      {doc.isSharedWithClient && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <Eye className="h-3 w-3" />
                          Visible in Portal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doc.type} · {formatBytes(doc.fileSize)} ·{" "}
                      {new Intl.DateTimeFormat("en-US").format(new Date(doc.createdAt))}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Share Toggle */}
                  <button
                    onClick={() => handleToggleShare(doc.id, doc.isSharedWithClient || false)}
                    className={`flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition ${
                      doc.isSharedWithClient
                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                    title={doc.isSharedWithClient ? "Remove from client view" : "Share with client"}
                  >
                    {doc.isSharedWithClient ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        Unshare
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3 w-3" />
                        Share
                      </>
                    )}
                  </button>

                  {/* Request Signature */}
                  <button
                    onClick={() => setSigningDoc(doc.id)}
                    className="flex items-center gap-1 rounded bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
                    title="Request signature"
                  >
                    <FileSignature className="h-3 w-3" />
                    Sign
                  </button>

                  {/* Download */}
                  {doc.publicUrl && (
                    <a
                      href={doc.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Download"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Signature Request Modal */}
      {signingDoc && (
        <SignatureRequestModal
          claimId={claimId}
          documentId={signingDoc}
          onClose={() => setSigningDoc(null)}
        />
      )}
    </div>
  );
}

// Signature Request Modal Component
function SignatureRequestModal({
  claimId,
  documentId,
  onClose,
}: {
  claimId: string;
  documentId: string;
  onClose: () => void;
}) {
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/signatures/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          documentId,
          signerName,
          signerEmail,
          message,
        }),
      });

      if (!response.ok) {
        alert("Failed to send signature request");
        setLoading(false);
        return;
      }

      alert("Signature request sent successfully!");
      onClose();
      window.location.reload();
    } catch (error) {
      logger.error("Error sending signature request", { error });
      alert("Failed to send signature request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Request Signature
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Signer Name
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Homeowner name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Signer Email
            </label>
            <input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="homeowner@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              placeholder="Please review and sign this document..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PhotosSection({ claimId }: { claimId: string }) {
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedPhoto, setSelectedPhoto] = React.useState<{
    url: string;
    note: string | null;
    filename: string | null;
  } | null>(null);
  const [analyzingPhotoId, setAnalyzingPhotoId] = React.useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = React.useState(false);
  const [analyzeProgress, setAnalyzeProgress] = React.useState(0);
  const [generatingReport, setGeneratingReport] = React.useState(false);
  const [showTemplateSelect, setShowTemplateSelect] = React.useState(false);
  const [selectedReportTemplateId, setSelectedReportTemplateId] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Stats
  const analyzedCount = photos.filter((p) => p.analyzed).length;
  const unanalyzedCount = photos.length - analyzedCount;
  const damageCount = photos.filter(
    (p) => p.analyzed && p.severity && p.severity !== "none"
  ).length;

  // Fetch photos on mount
  React.useEffect(() => {
    void fetchPhotos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  async function fetchPhotos() {
    try {
      const res = await fetch(`/api/claims/${claimId}/photos`);
      if (!res.ok) {
        logger.error("Failed to fetch photos", { status: res.status });
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.photos)) {
        setPhotos(data.photos);
      }
    } catch (err) {
      logger.error("Failed to fetch photos", { error: err });
    }
  }

  // Delete photo handler
  async function handleDeletePhoto(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/files/${photoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      }
    } catch (err) {
      logger.error("Failed to delete photo", { error: err });
    }
  }

  // Analyze single photo handler - analyzes AND saves to DB
  async function handleAnalyzePhoto(photoId: string) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    setAnalyzingPhotoId(photoId);
    try {
      // Step 1: Get AI analysis
      const analyzeRes = await fetch("/api/ai/photo-annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: photo.publicUrl,
          claimId,
          photoId,
          componentType: "roof",
        }),
      });

      if (analyzeRes.ok) {
        const data = await analyzeRes.json();

        // Step 2: Save annotations to database (this sets analyzed_at)
        const saveRes = await fetch(`/api/claims/photos/${photoId}/annotations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            annotations: data.annotations || [],
            note: data.overallCaption || null,
          }),
        });

        const severity = saveRes.ok
          ? (await saveRes.json()).severity
          : data.overallAssessment?.severity || "none";

        // Build damageBoxes from annotations for immediate overlay display
        const damageBoxes = (data.annotations || []).map(
          (ann: {
            x: number;
            y: number;
            width: number;
            height: number;
            damageType?: string;
            label?: string;
            severity?: string;
            confidence?: number;
            sourceModel?: "roboflow_yolo" | "gpt4";
          }) => ({
            x: ann.x / 100,
            y: ann.y / 100,
            w: ann.width / 100,
            h: ann.height / 100,
            // Use damageType as primary label (more concise)
            label: ann.damageType || ann.label || "Damage",
            severity: ann.severity,
            score: ann.confidence,
            // Preserve source model from API (YOLO vs GPT-4V)
            sourceModel: ann.sourceModel || "gpt4",
          })
        );

        // Update local state
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  analyzed: true,
                  severity,
                  aiCaption: data,
                  annotations: data.annotations,
                  damageBoxes,
                }
              : p
          )
        );
      }
    } catch (err) {
      logger.error("Failed to analyze photo", { error: err });
    } finally {
      setAnalyzingPhotoId(null);
    }
  }

  // Analyze ALL unanalyzed photos - analyzes AND saves each to DB
  async function handleAnalyzeAll() {
    const unanalyzed = photos.filter((p) => !p.analyzed);
    if (unanalyzed.length === 0) return;

    setAnalyzingAll(true);
    setAnalyzeProgress(0);

    for (let i = 0; i < unanalyzed.length; i++) {
      const photo = unanalyzed[i];
      try {
        // Step 1: Get AI analysis
        const analyzeRes = await fetch("/api/ai/photo-annotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: photo.publicUrl,
            claimId,
            photoId: photo.id,
            componentType: "roof",
          }),
        });

        if (analyzeRes.ok) {
          const data = await analyzeRes.json();

          // Step 2: Save annotations to database (this sets analyzed_at)
          const saveRes = await fetch(`/api/claims/photos/${photo.id}/annotations`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              annotations: data.annotations || [],
              note: data.overallCaption || null,
            }),
          });

          const severity = saveRes.ok
            ? (await saveRes.json()).severity
            : data.overallAssessment?.severity || "none";

          // Build damageBoxes from annotations for immediate overlay display
          const damageBoxes = (data.annotations || []).map(
            (ann: {
              x: number;
              y: number;
              width: number;
              height: number;
              damageType?: string;
              label?: string;
              severity?: string;
              confidence?: number;
              sourceModel?: "roboflow_yolo" | "gpt4";
            }) => ({
              x: ann.x / 100,
              y: ann.y / 100,
              w: ann.width / 100,
              h: ann.height / 100,
              // Use damageType as primary label (more concise)
              label: ann.damageType || ann.label || "Damage",
              severity: ann.severity,
              score: ann.confidence,
              // Preserve source model from API (YOLO vs GPT-4V)
              sourceModel: ann.sourceModel || "gpt4",
            })
          );

          // Update local state
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? {
                    ...p,
                    analyzed: true,
                    severity,
                    aiCaption: data,
                    annotations: data.annotations,
                    damageBoxes,
                  }
                : p
            )
          );
        }
      } catch (err) {
        logger.error("Failed to analyze photo", { photoId: photo.id, error: err });
      }
      setAnalyzeProgress(Math.round(((i + 1) / unanalyzed.length) * 100));
    }

    setAnalyzingAll(false);
    setAnalyzeProgress(0);
    // Re-fetch to get canonical damageBoxes from the DB
    await fetchPhotos();
  }

  // Generate Damage Report (uses only analyzed photos)
  async function handleGenerateReport() {
    if (analyzedCount === 0) {
      alert("Please analyze at least one photo before generating a report.");
      return;
    }

    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/damage-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includePhotos: true,
          includeAnnotations: true,
          templateId: selectedReportTemplateId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Open the PDF in a new tab
        if (data.pdfUrl) {
          window.open(data.pdfUrl, "_blank");
        }
        alert(
          `✅ Damage report generated! ${data.photoCount} photos, ${data.pageCount} pages.\n\nSaved to Documents tab & Report History.`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to generate report: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      logger.error("Failed to generate report", { error: err });
      alert("Failed to generate damage report. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  }

  const [uploadError, setUploadError] = React.useState<string | null>(null);

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    const uploadedCount: string[] = [];
    const failedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "claimPhotos");
      formData.append("claimId", claimId);

      try {
        const res = await fetch("/api/upload/supabase", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          uploadedCount.push(file.name);
        } else {
          const errData = await res.json().catch(() => ({ error: "Upload failed" }));
          failedFiles.push(`${file.name}: ${errData.error || res.statusText}`);
        }
      } catch (err) {
        logger.error("Failed to upload photo", { fileName: file.name, error: err });
        failedFiles.push(`${file.name}: Network error`);
      }
    }

    setUploading(false);
    if (uploadedCount.length > 0) {
      // Short delay to ensure DB writes are committed before fetching
      await new Promise((r) => setTimeout(r, 500));
      await fetchPhotos();
    }
    if (failedFiles.length > 0) {
      setUploadError(`Failed to upload: ${failedFiles.join(", ")}`);
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        title="📸 Photos & Media"
        className="bg-gradient-to-br from-white to-purple-50 dark:from-slate-900 dark:to-purple-900/10"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-label="Upload photos"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {/* Action buttons row */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Photos"}
          </Button>

          {/* Analyze All button - only show if there are unanalyzed photos */}
          {unanalyzedCount > 0 && (
            <Button
              onClick={handleAnalyzeAll}
              disabled={analyzingAll || analyzingPhotoId !== null}
              variant="outline"
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300"
            >
              <Sparkles className="h-4 w-4" />
              {analyzingAll
                ? `Analyzing... ${analyzeProgress}%`
                : `Analyze All (${unanalyzedCount})`}
            </Button>
          )}

          {/* Generate Report button - only show if there are analyzed photos */}
          {analyzedCount > 0 && (
            <>
              <Button
                onClick={() => setShowTemplateSelect(!showTemplateSelect)}
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
              >
                <Sparkles className="h-4 w-4" />
                {selectedReportTemplateId ? "Template Selected ✓" : "Choose Template"}
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={generatingReport || analyzingAll}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <FileText className="h-4 w-4" />
                {generatingReport ? "Generating..." : "Generate Damage Report"}
              </Button>
            </>
          )}
        </div>

        {/* Smart Template Selector (inline collapsible) */}
        {showTemplateSelect && analyzedCount > 0 && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/20">
            <SmartTemplateSelector
              onSelect={(id) => {
                setSelectedReportTemplateId(id);
                setShowTemplateSelect(false);
              }}
              selectedId={selectedReportTemplateId}
              defaultStyle="Insurance"
              context={{ intent: "claim_support" }}
              compact
              label="Damage Report Template"
            />
          </div>
        )}

        {/* Analysis Stats - show when photos exist */}
        {photos.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{photos.length}</p>
              <p className="text-xs text-slate-500">Total Photos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{analyzedCount}</p>
              <p className="text-xs text-slate-500">Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{damageCount}</p>
              <p className="text-xs text-slate-500">With Damage</p>
            </div>
          </div>
        )}

        {/* Analyze All Progress Bar */}
        {analyzingAll && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-purple-600">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Running AI damage analysis...
              </span>
              <span className="font-medium">{analyzeProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${analyzeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <span className="font-medium">⚠️</span>
            <div>
              <p className="font-medium">Upload Error</p>
              <p className="mt-1 text-xs">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? "border-purple-500 bg-purple-100 dark:border-purple-400 dark:bg-purple-900/40"
              : "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
          }`}
        >
          {photos.length === 0 ? (
            <>
              <Images className="mx-auto h-12 w-12 text-purple-400" />
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                No photos uploaded yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Drag & drop photos here or click Upload Photos button
              </p>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                  onClick={() =>
                    setSelectedPhoto({
                      url: photo.publicUrl,
                      note: photo.note || null,
                      filename: photo.filename || null,
                    })
                  }
                >
                  {/* Show damage box overlays for analyzed photos */}
                  {photo.analyzed && photo.damageBoxes && photo.damageBoxes.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div className="relative h-32 w-full">
                      <img
                        src={photo.publicUrl}
                        alt={photo.note || photo.filename}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                      <DamageBoxOverlay boxes={photo.damageBoxes} mode="compact" />
                    </div>
                  // eslint-disable-next-line @next/next/no-img-element
                  ) : (
                    <img
                      src={photo.publicUrl}
                      alt={photo.note || photo.filename}
                      className="h-32 w-full object-cover transition-transform group-hover:scale-110"
                    />
                  )}

                  {/* Delete button - red X */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeletePhoto(photo.id);
                    }}
                    className="absolute right-2 top-2 z-50 rounded-full bg-red-500/80 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                    aria-label="Delete photo"
                    title="Delete photo"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* AI Badge if analyzed */}
                  {photo.analyzed && (
                    <div className="absolute left-2 top-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          photo.severity === "severe"
                            ? "bg-red-500 text-white"
                            : photo.severity === "moderate"
                              ? "bg-orange-500 text-white"
                              : photo.severity === "minor"
                                ? "bg-yellow-500 text-black"
                                : "bg-green-500 text-white"
                        }`}
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        {photo.severity || "analyzed"}
                      </span>
                    </div>
                  )}

                  {/* Analyze overlay for non-analyzed photos */}
                  {!photo.analyzed && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleAnalyzePhoto(photo.id);
                        }}
                        disabled={analyzingPhotoId === photo.id}
                        className="pointer-events-auto bg-purple-600 hover:bg-purple-700"
                      >
                        {analyzingPhotoId === photo.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <p className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white">
                    {photo.note || photo.filename}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Lightbox Viewer */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 text-white hover:text-gray-300"
            onClick={() => setSelectedPhoto(null)}
            aria-label="Close photo preview"
          >
            <X className="h-8 w-8" />
          // eslint-disable-next-line @next/next/no-img-element
          </button>
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.note || "Preview"}
            className="max-h-[80vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = document.createElement("div");
              fallback.className =
                "flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-800/80 p-12 text-white";
              fallback.innerHTML =
                '<svg class="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><p class="text-lg font-medium">Image unavailable</p><p class="text-sm text-slate-400">This photo may have expired or been removed</p>';
              target.parentElement?.appendChild(fallback);
            }}
          />
          {/* Note & filename overlay */}
          {(selectedPhoto.note || selectedPhoto.filename) && (
            <div
              className="mt-3 max-w-[90vw] rounded-lg bg-black/70 px-6 py-3 text-center backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedPhoto.note && (
                <p className="text-sm font-medium text-white">{selectedPhoto.note}</p>
              )}
              {selectedPhoto.filename && (
                <p className="mt-1 text-xs text-slate-400">{selectedPhoto.filename}</p>
              )}
            </div>
          )}
        </div>
      )}

      <Card title="🤖 AI Features">
        <div className="space-y-2 text-xs">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Automatic damage detection and tagging</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Roof slope measurements</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Material identification</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Gallery organization with lightbox viewer</span>
          </p>
        </div>
      </Card>
    </div>
  );
}

function DamageSection({ claimId }: { claimId: string }) {
  return (
    <div className="space-y-4">
      <Card title="🔧 Damage & Scope Worksheet">
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Build your scope of work with AI-assisted line items, measurements, and material
          selections.
        </p>

        <div className="space-y-3">
          <a
            href={`/claims/${claimId}/scope`}
            className="block w-full rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-left hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
          >
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  🤖 Generate AI Damage Report
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Automatically detect damage from uploaded photos
                </p>
              </div>
            </div>
          </a>

          <a
            href={`/claims/${claimId}/scope`}
            className="block w-full rounded-lg border-2 border-slate-200 bg-white p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  ✏️ Manual Line Items
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Add custom scope items and measurements
                </p>
              </div>
            </div>
          </a>
        </div>
      </Card>

      <Card title="Scope Summary">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p>
            View and manage your scope of work on the{" "}
            <a
              href={`/claims/${claimId}/scope`}
              className="text-blue-600 underline hover:text-blue-500"
            >
              Scope tab
            </a>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}

function AISection({
  claimId,
  aiReports = [],
}: {
  claimId: string;
  aiReports?: ClaimWorkspaceProps["aiReports"];
}) {
  return (
    <div className="space-y-6">
      {/* Quick AI Actions - One-click shortcuts */}
      <QuickAIActions claimId={claimId} />

      {/* AI Control Panel - Main interface */}
      <AIControlPanel claimId={claimId} />

      {/* Existing AI Reports Section */}
      <Card
        title="🤖 AI-Generated Reports"
        className="bg-gradient-to-br from-white to-indigo-50 dark:from-slate-900 dark:to-indigo-900/10"
      >
        {aiReports.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 p-8 text-center dark:border-indigo-700 dark:bg-indigo-900/20">
            <Brain className="mx-auto h-12 w-12 text-indigo-400" />
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              No AI reports yet
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Generate reports after uploading damage photos
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {aiReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border border-indigo-200 bg-white p-3 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30"
              >
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {report.reportType || "AI Report"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {report.status} ·{" "}
                      {new Intl.DateTimeFormat("en-US").format(new Date(report.createdAt))}
                    </p>
                  </div>
                </div>
                {report.pdfUrl && (
                  <Button asChild size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700">
                    <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3" />
                      View PDF
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="📝 Rebuttal Letter Generator">
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Generate professional rebuttal letters to carriers based on AI analysis
          </p>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
            Generate Letter →
          </Button>
        </Card>

        <Card title="🏗️ Engineer Report Draft">
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Create engineering reports with structural damage analysis
          </p>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
            Draft Report →
          </Button>
        </Card>
      </div>
    </div>
  );
}

function FinancialsSection({
  claim,
  onSave: _onSave,
  saving: _saving,
}: {
  claim: ClaimWorkspaceProps["claim"];
  onSave: (field: string, value: any) => Promise<void>;
  saving: boolean;
}) {
  const rcv = claim.rcvTotal ?? 0;
  const acv = claim.acvTotal ?? 0;
  const deductible = claim.deductible ?? 0;
  const depreciation = rcv - acv;
  const initialPayment = acv - deductible;
  const recoverableAfterCompletion = depreciation;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="💰 RCV (Replacement Cost)"
          className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
        >
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {formatCurrency(rcv)}
          </p>
          <p className="mt-1 text-xs text-green-600 dark:text-green-500">Full replacement value</p>
        </Card>

        <Card
          title="💵 ACV (Actual Cash Value)"
          className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
        >
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {formatCurrency(acv)}
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-500">Value minus depreciation</p>
        </Card>

        <Card
          title="📉 Depreciation"
          className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
        >
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {formatCurrency(depreciation)}
          </p>
          <p className="mt-1 text-xs text-orange-600 dark:text-orange-500">
            Recoverable after completion
          </p>
        </Card>
      </div>

      <Card title="Payment Breakdown">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400">RCV Total</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(rcv)}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400">Less: Depreciation</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">
              - {formatCurrency(depreciation)}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400">ACV</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(acv)}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400">Less: Deductible</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              - {formatCurrency(deductible)}
            </span>
          </div>
          <div className="flex justify-between rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
            <span className="font-semibold text-blue-900 dark:text-blue-100">Initial Payment</span>
            <span className="font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(initialPayment)}
            </span>
          </div>
          <div className="flex justify-between rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
            <span className="font-semibold text-green-900 dark:text-green-100">
              Recoverable (After Work)
            </span>
            <span className="font-bold text-green-700 dark:text-green-400">
              {formatCurrency(recoverableAfterCompletion)}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Payment Schedule">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track initial payment, progress payments, and final depreciation recovery here.
          Integration with accounting systems coming soon.
        </p>
      </Card>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TimelineSection({ claimId }: { claimId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch claim events from API
    fetch(`/api/claims/${claimId}/events`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch((err) => {
        logger.error("Failed to load timeline", { error: err });
        setLoading(false);
      });
  }, [claimId]);

  // Event type to icon mapping
  const getEventIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      claim_created: "📝",
      doc_shared: "👁️",
      doc_unshared: "🔒",
      signature_requested: "✍️",
      signature_signed: "✅",
      signature_declined: "❌",
      signature_viewed: "👀",
      note_added: "💬",
      status_changed: "🔄",
      photo_uploaded: "📸",
      report_generated: "🤖",
    };
    return iconMap[type] || "📌";
  };

  return (
    <div className="space-y-4">
      <Card title="🕐 Activity Timeline">
        <div className="mb-4">
          <Button className="gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">
            <Clock className="h-4 w-4" />
            Add Note
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading timeline...</div>
        ) : events.length === 0 ? (
          <div className="space-y-4">
            <TimelineItem
              icon="📝"
              title="Claim created"
              timestamp={new Date()}
              description="Claim workspace initialized"
            />
            <TimelineItem
              icon="📞"
              title="Next: Contact adjuster"
              timestamp={null}
              description="Schedule initial inspection"
              isPending
            />
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <TimelineItem
                key={event.id}
                icon={getEventIcon(event.type)}
                title={formatEventTitle(event.type, event.metadata)}
                timestamp={new Date(event.createdAt)}
                description={formatEventDescription(event.type, event.metadata, event.actorName)}
                visibility={event.visibility}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title="Notes & Communications">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Log phone calls, emails, site visits, and internal notes. Visible only to your team unless
          marked for client portal.
        </p>
      </Card>
    </div>
  );
}

// Helper functions for event formatting
function formatEventTitle(type: string, metadata: any): string {
  const titleMap: Record<string, string> = {
    doc_shared: `Document shared: ${metadata?.documentTitle || "Untitled"}`,
    doc_unshared: `Document unshared: ${metadata?.documentTitle || "Untitled"}`,
    signature_requested: `Signature requested: ${metadata?.documentTitle || "Untitled"}`,
    signature_signed: `Document signed by ${metadata?.signerName || "client"}`,
    signature_declined: `Signature declined by ${metadata?.signerName || "client"}`,
    signature_viewed: `Document viewed by ${metadata?.signerName || "client"}`,
    note_added: "Note added",
    status_changed: `Status changed to ${metadata?.newStatus || "unknown"}`,
    photo_uploaded: "Photo uploaded",
    report_generated: "AI report generated",
  };
  return titleMap[type] || "Activity";
}

function formatEventDescription(type: string, metadata: any, actorName?: string): string {
  const actor = actorName || "System";
  const descMap: Record<string, string> = {
    doc_shared: `${actor} shared this document with the client`,
    doc_unshared: `${actor} removed this document from client view`,
    signature_requested: `${actor} requested signature from ${metadata?.signerEmail || "client"}`,
    signature_signed: `${metadata?.signerName || "Client"} signed the document electronically`,
    signature_declined: `${metadata?.signerName || "Client"} declined to sign`,
    signature_viewed: `${metadata?.signerName || "Client"} viewed the document`,
    note_added: `${actor} added a note`,
    status_changed: `${actor} updated the claim status`,
    photo_uploaded: `${actor} uploaded damage photos`,
    report_generated: `AI system generated damage assessment report`,
  };
  return descMap[type] || `${actor} performed an action`;
}

function TimelineItem({
  icon,
  title,
  timestamp,
  description,
  isPending = false,
  visibility,
}: {
  icon: string;
  title: string;
  timestamp: Date | null;
  description: string;
  isPending?: boolean;
  visibility?: "internal" | "client";
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isPending ? "bg-yellow-100 dark:bg-yellow-900/20" : "bg-slate-100 dark:bg-slate-800"}`}
      >
        <span className="text-sm">{icon}</span>
      </div>
      <div className="flex-1 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
              {visibility === "client" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  <Eye className="h-3 w-3" />
                  Client Visible
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
          {timestamp && (
            <span className="text-xs text-slate-400">
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

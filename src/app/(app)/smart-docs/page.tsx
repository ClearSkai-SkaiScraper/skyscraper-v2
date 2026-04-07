"use client";

/**
 * Smart Documents Hub
 *
 * Central command for document management, e-signatures, and sending.
 * Ties together existing e-sign infrastructure with document templates
 * and Resend-powered delivery.
 */

import {
  ArrowRight,
  Clock,
  Download,
  FileCheck2,
  FilePlus,
  FileSignature,
  FileText,
  Loader2,
  MoreHorizontal,
  Paperclip,
  PenTool,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Envelope {
  id: string;
  documentName: string;
  status: string;
  signerEmail: string | null;
  signerName: string | null;
  signerRole: string | null;
  sentAt: string | null;
  signedAt: string | null;
  createdAt: string;
  claimId: string | null;
  documentUrl: string | null;
  signedDocumentUrl: string | null;
}

type StatusFilter = "all" | "draft" | "sent" | "completed" | "voided";

const TEMPLATES = [
  {
    id: "scope-of-work",
    name: "Scope of Work Agreement",
    description: "Details the scope, timeline, and terms for a roofing/siding project.",
    category: "Contracts",
    icon: FileCheck2,
  },
  {
    id: "retail-proposal",
    name: "Retail Proposal & Quote",
    description: "Professional proposal with itemized pricing and project details for the client.",
    category: "Proposals",
    icon: FileText,
  },
  {
    id: "material-selection",
    name: "Material Selection Sheet",
    description: "Client selects shingle color, manufacturer, and add-ons.",
    category: "Materials",
    icon: FileText,
  },
  {
    id: "completion-certificate",
    name: "Certificate of Completion",
    description: "Confirms work is done to satisfaction. Releases final payment.",
    category: "Closeout",
    icon: FileCheck2,
  },
  {
    id: "authorization-to-represent",
    name: "Authorization to Represent",
    description: "Authorizes your company to represent the homeowner in their insurance claim.",
    category: "Claims",
    icon: FileSignature,
  },
  {
    id: "lien-waiver",
    name: "Lien Waiver",
    description: "Partial or final lien waiver to release payment.",
    category: "Closeout",
    icon: FileText,
  },
  {
    id: "supplement-authorization",
    name: "Supplement Authorization",
    description: "Authorizes filing a supplement with the insurance carrier.",
    category: "Claims",
    icon: FileText,
  },
];

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
    sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
    viewed: { label: "Viewed", className: "bg-yellow-100 text-yellow-700" },
    completed: { label: "Signed", className: "bg-green-100 text-green-700" },
    voided: { label: "Voided", className: "bg-red-100 text-red-700" },
    expired: { label: "Expired", className: "bg-orange-100 text-orange-700" },
  };
  const cfg = map[status?.toLowerCase()] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function SmartDocsPage() {
  const router = useRouter();

  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  /* ----- Create form state ----- */
  const [newTitle, setNewTitle] = useState("");
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerRole, setNewSignerRole] = useState("homeowner");
  const [creating, setCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ----- Client selector state ----- */
  const [clients, setClients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  /* ----- Job/Claim selector state ----- */
  const [jobs, setJobs] = useState<{ id: string; title: string; type: string }[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  /* ------------------------------------------------------------------ */
  /*  Fetch envelopes                                                    */
  /* ------------------------------------------------------------------ */

  const fetchEnvelopes = useCallback(async () => {
    try {
      const res = await fetch("/api/smart-docs/envelopes");
      const data = await res.json();
      if (data.ok) setEnvelopes(data.envelopes ?? []);
    } catch (err) {
      logger.error("[SMART_DOCS] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEnvelopes();
    // Fetch clients for the selector
    fetch("/api/contacts?limit=100")
      .then((res) => res.json())
      .then((data) => {
        const contactList = (data.contacts || data.data || []).map((c: any) => ({
          id: c.id,
          name:
            [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || c.email || "Unknown",
          email: c.email || "",
        }));
        setClients(contactList);
      })
      .catch(() => {});
    // Fetch jobs/claims for the job selector
    void Promise.all([
      fetch("/api/leads?limit=50")
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
      fetch("/api/claims?limit=50")
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ]).then(([leadsData, claimsData]) => {
      const leads = (leadsData.data || leadsData.leads || []).map((l: any) => ({
        id: l.id,
        title: l.title || l.name || `Lead ${l.id?.slice(0, 8)}`,
        type: "job",
      }));
      const claims = (claimsData.data || claimsData.claims || []).map((c: any) => ({
        id: c.id,
        title: c.title || c.claimNumber || `Claim ${c.id?.slice(0, 8)}`,
        type: "claim",
      }));
      setJobs([...claims, ...leads]);
    });
  }, [fetchEnvelopes]);

  /* ------------------------------------------------------------------ */
  /*  Create envelope                                                    */
  /* ------------------------------------------------------------------ */

  async function handleCreate() {
    if (!newTitle || !newSignerEmail) return;
    setCreating(true);
    try {
      // Step 1: If a PDF file is attached, upload it first
      let documentUrl: string | null = null;
      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("folder", "smart-docs");
        const uploadRes = await fetch("/api/uploads/file", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          documentUrl = uploadData.url || uploadData.publicUrl || null;
        }
      }

      // Step 2: Create the envelope with optional document URL
      const jobRef = selectedJobId && selectedJobId !== "none" ? selectedJobId : undefined;
      const claimRef = jobs.find((j) => j.id === jobRef && j.type === "claim") ? jobRef : undefined;
      const res = await fetch("/api/esign/envelopes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          signers: [
            {
              role: newSignerRole.toUpperCase(),
              displayName: newSignerName,
              email: newSignerEmail,
            },
          ],
          ...(documentUrl ? { documentUrl } : {}),
          ...(claimRef ? { claimId: claimRef } : {}),
          ...(jobRef && !claimRef ? { jobId: jobRef } : {}),
          ...(selectedClientId && selectedClientId !== "none"
            ? { contactId: selectedClientId }
            : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreateOpen(false);
        resetForm();
        await fetchEnvelopes();
      }
    } catch (err) {
      logger.error("[SMART_DOCS] create error:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(envelopeId: string) {
    try {
      await fetch(`/api/esign/envelopes/${envelopeId}/send`, { method: "POST" });
      await fetchEnvelopes();
    } catch (err) {
      logger.error("[SMART_DOCS] send error:", err);
    }
  }

  async function handleVoid(envelopeId: string) {
    if (!confirm("Are you sure you want to void this document?")) return;
    try {
      await fetch(`/api/esign/envelopes/${envelopeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "voided" }),
      });
      await fetchEnvelopes();
    } catch (err) {
      logger.error("[SMART_DOCS] void error:", err);
    }
  }

  function resetForm() {
    setNewTitle("");
    setNewSignerName("");
    setNewSignerEmail("");
    setNewSignerRole("homeowner");
    setSelectedClientId("");
    setSelectedJobId("");
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ------------------------------------------------------------------ */
  /*  Filtering                                                          */
  /* ------------------------------------------------------------------ */

  const filtered = envelopes.filter((e) => {
    if (filter !== "all" && e.status?.toLowerCase() !== filter) return false;
    if (
      search &&
      !e.documentName?.toLowerCase().includes(search.toLowerCase()) &&
      !e.signerName?.toLowerCase().includes(search.toLowerCase()) &&
      !e.signerEmail?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  /* ------------------------------------------------------------------ */
  /*  Stats                                                              */
  /* ------------------------------------------------------------------ */

  const stats = {
    total: envelopes.length,
    drafts: envelopes.filter((e) => e.status === "draft").length,
    awaiting: envelopes.filter((e) => e.status === "sent").length,
    signed: envelopes.filter((e) => e.status === "completed").length,
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Smart Documents"
        subtitle="Create, send, and track documents with built-in e-signatures"
        icon={<FileSignature className="h-6 w-6" />}
      />

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Documents", value: stats.total, icon: FileText, color: "text-slate-600" },
          { label: "Drafts", value: stats.drafts, icon: Clock, color: "text-gray-500" },
          {
            label: "Awaiting Signature",
            value: stats.awaiting,
            icon: Send,
            color: "text-blue-600",
          },
          { label: "Signed", value: stats.signed, icon: FileCheck2, color: "text-green-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 py-4">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-slate-500">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="documents" className="mt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="documents">My Documents</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Document
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Document</DialogTitle>
                <DialogDescription>
                  Upload a PDF for e-signature, or create a blank document to build on-site.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                {/* Client Selector */}
                {clients.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label>Link to Client (optional)</Label>
                    <Select
                      value={selectedClientId}
                      onValueChange={(val) => {
                        setSelectedClientId(val);
                        if (val) {
                          const client = clients.find((c) => c.id === val);
                          if (client) {
                            setNewSignerName(client.name);
                            setNewSignerEmail(client.email);
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No client selected</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.email ? `(${c.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Job / Claim Selector */}
                {jobs.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label>Link to Job / Claim (optional)</Label>
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job or claim..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No job selected</SelectItem>
                        {jobs.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.type === "claim" ? "📋" : "🔧"} {j.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* PDF Upload */}
                <div className="grid gap-1.5">
                  <Label>Attach PDF (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-4 py-3 text-sm text-slate-600 transition-colors hover:border-[#117CFF]/40 hover:bg-[#117CFF]/5 dark:border-slate-700 dark:text-slate-400 dark:hover:border-[#117CFF]/40"
                  >
                    {uploadFile ? (
                      <>
                        <Paperclip className="h-4 w-4 text-[#117CFF]" />
                        <span className="truncate font-medium text-slate-900 dark:text-white">
                          {uploadFile.name}
                        </span>
                        <span className="ml-auto text-xs text-slate-400">
                          {(uploadFile.size / 1024).toFixed(0)} KB
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Click to upload a PDF document</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid gap-1.5">
                  <Label>Document Title *</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Authorization to Represent — 123 Main St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Signer Name</Label>
                    <Input
                      value={newSignerName}
                      onChange={(e) => setNewSignerName(e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Signer Email *</Label>
                    <Input
                      type="email"
                      value={newSignerEmail}
                      onChange={(e) => setNewSignerEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label>Signer Role</Label>
                  <Select value={newSignerRole} onValueChange={setNewSignerRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homeowner">Homeowner</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="business-owner">Business Owner</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="property-manager">Property Manager</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newTitle || !newSignerEmail || creating}>
                  {creating ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus className="mr-1.5 h-4 w-4" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Documents tab ───────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4 space-y-3">
          {/* Search + filter bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search by name, signer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="completed">Signed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setLoading(true);
                void fetchEnvelopes();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Envelope list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-16">
                <FileText className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">
                  {envelopes.length === 0
                    ? "No documents yet. Create your first one above."
                    : "No documents match your filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((env) => (
                <Card key={env.id} className="border-0 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                      <FileSignature className="h-5 w-5 text-sky-600" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {env.documentName || "Untitled Document"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {env.signerName || "No signer"}{" "}
                        {env.signerEmail ? `(${env.signerEmail})` : ""}
                        {env.sentAt
                          ? ` · Sent ${new Date(env.sentAt).toLocaleDateString()}`
                          : ` · Created ${new Date(env.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    {statusBadge(env.status)}

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {env.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleSend(env.id)}>
                            <Send className="mr-2 h-4 w-4" /> Send for Signature
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              env.status === "draft"
                                ? `/esign/on-site/${env.id}`
                                : `/esign/sign/${env.id}`
                            )
                          }
                        >
                          <PenTool className="mr-2 h-4 w-4" /> Open Signing Page
                        </DropdownMenuItem>
                        {env.signedDocumentUrl && (
                          <DropdownMenuItem asChild>
                            <a
                              href={env.signedDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="mr-2 h-4 w-4" /> Download Signed PDF
                            </a>
                          </DropdownMenuItem>
                        )}
                        {env.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handleVoid(env.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Void Document
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Templates tab ───────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((tpl) => (
              <Card
                key={tpl.id}
                className="cursor-pointer border-0 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => {
                  setNewTitle(tpl.name);
                  setCreateOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <tpl.icon className="h-4 w-4 text-sky-600" />
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">{tpl.description}</CardDescription>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {tpl.category}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                      Use template <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

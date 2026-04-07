"use client";

/**
 * Data Migration Wizard
 *
 * 5-step enterprise migration from AccuLynx / JobNimbus:
 * 1. Connect - Validate credentials
 * 2. Analyze - Preflight check + preview counts
 * 3. Review - Dry-run with duplicate detection
 * 4. Import - Execute migration with progress
 * 5. Report - Final summary + rollback option
 */

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logger } from "@/lib/logger";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type MigrationSource = "JOBNIMBUS" | "ACCULYNX";

interface PreflightResult {
  ok: boolean;
  source: MigrationSource;
  entityCounts: Record<string, number>;
  estimatedDuration: string;
  warnings: string[];
  errors: string[];
}

interface DuplicateRecord {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  matchType: "email" | "phone" | "address" | "name";
  existingId: string;
  recommendation: "skip" | "merge" | "create_new";
}

interface DryRunResult {
  ok: boolean;
  wouldImport: Record<string, number>;
  duplicates: DuplicateRecord[];
  validationErrors: Array<{ entity: string; field: string; message: string }>;
}

interface MigrationStatus {
  jobId: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled" | "rolled_back";
  source: MigrationSource;
  progress: number;
  currentEntity: string;
  entitiesProcessed: Record<string, number>;
  errors: Array<{ entity: string; message: string }>;
  startedAt: string;
  completedAt?: string;
}

type Step = "connect" | "analyze" | "review" | "import" | "report";

/* -------------------------------------------------------------------------- */
/*  Step Indicator                                                            */
/* -------------------------------------------------------------------------- */

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "connect", label: "Connect" },
    { key: "analyze", label: "Analyze" },
    { key: "review", label: "Review" },
    { key: "import", label: "Import" },
    { key: "report", label: "Report" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {steps.map((step, idx) => {
        const isComplete = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${isComplete ? "bg-green-500 text-white" : ""} ${isCurrent ? "bg-blue-500 text-white" : ""} ${!isComplete && !isCurrent ? "bg-slate-200 text-slate-500" : ""} `}
            >
              {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <span
              className={`ml-2 text-sm ${isCurrent ? "font-medium text-slate-900" : "text-slate-500"}`}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && <div className="mx-3 h-px w-8 bg-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export default function MigrationWizardPage() {
  // ─── State ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("connect");
  const [source, setSource] = useState<MigrationSource | null>(null);
  const [credentials, setCredentials] = useState({ apiKey: "", apiSecret: "", companyId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [duplicateActions, setDuplicateActions] = useState<
    Record<string, "skip" | "merge" | "create_new">
  >({});
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);

  // ─── Step 1: Connect - Validate Credentials ──────────────────────────────

  const handlePreflight = useCallback(async () => {
    if (!source) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/migrations/${source.toLowerCase()}/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to validate credentials");
        return;
      }

      setPreflightResult(data);
      setStep("analyze");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [source, credentials]);

  // ─── Step 2: Analyze - Run Dry Run ───────────────────────────────────────

  const handleDryRun = useCallback(async () => {
    if (!source) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/migrations/${source.toLowerCase()}/dry-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials,
          options: { detectDuplicates: true },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Dry run failed");
        return;
      }

      setDryRunResult(data);

      // Initialize duplicate actions with recommendations
      const actions: Record<string, "skip" | "merge" | "create_new"> = {};
      data.duplicates?.forEach((dup: DuplicateRecord) => {
        actions[dup.externalId] = dup.recommendation;
      });
      setDuplicateActions(actions);

      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [source, credentials]);

  // ─── Step 3: Review - Start Migration ────────────────────────────────────

  const handleStartMigration = useCallback(async () => {
    if (!source) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/migrations/${source.toLowerCase()}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials,
          options: {
            duplicateActions,
            skipExisting: true,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to start migration");
        return;
      }

      setMigrationStatus(data.job);
      setStep("import");

      // Start polling for status
      void pollMigrationStatus(data.job.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [source, credentials, duplicateActions]);

  // ─── Step 4: Import - Poll Status ────────────────────────────────────────

  const pollMigrationStatus = useCallback(async (jobId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/migrations/status/${jobId}`);
        const data = await res.json();

        if (data.ok && data.job) {
          setMigrationStatus(data.job);

          if (data.job.status === "running" || data.job.status === "pending") {
            setTimeout(poll, 2000);
          } else if (data.job.status === "completed") {
            setStep("report");
          }
        }
      } catch (err) {
        logger.error("[MIGRATION] Poll error:", err);
        setTimeout(poll, 5000);
      }
    };

    void poll();
  }, []);

  // ─── Control Actions ─────────────────────────────────────────────────────

  const handlePause = async () => {
    if (!migrationStatus) return;
    await fetch(`/api/migrations/status/${migrationStatus.jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    void pollMigrationStatus(migrationStatus.jobId);
  };

  const handleResume = async () => {
    if (!migrationStatus) return;
    await fetch(`/api/migrations/status/${migrationStatus.jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume" }),
    });
    void pollMigrationStatus(migrationStatus.jobId);
  };

  const handleCancel = async () => {
    if (!migrationStatus) return;
    await fetch(`/api/migrations/status/${migrationStatus.jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    void pollMigrationStatus(migrationStatus.jobId);
  };

  const handleRollback = async () => {
    if (!migrationStatus) return;
    setLoading(true);
    await fetch(`/api/migrations/status/${migrationStatus.jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rollback" }),
    });
    const res = await fetch(`/api/migrations/status/${migrationStatus.jobId}`);
    const data = await res.json();
    if (data.ok) setMigrationStatus(data.job);
    setLoading(false);
  };

  // ─── Reset ───────────────────────────────────────────────────────────────

  const handleReset = () => {
    setStep("connect");
    setSource(null);
    setCredentials({ apiKey: "", apiSecret: "", companyId: "" });
    setPreflightResult(null);
    setDryRunResult(null);
    setDuplicateActions({});
    setMigrationStatus(null);
    setError(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHero
        section="settings"
        title="Data Migration"
        subtitle="Import your data from AccuLynx or JobNimbus"
        icon={<Database className="h-6 w-6" />}
      />

      <StepIndicator currentStep={step} />

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Step 1: Connect                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "connect" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Data Source</CardTitle>
            <CardDescription>
              Choose the platform you want to migrate data from and enter your API credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Source Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSource("JOBNIMBUS")}
                className={`rounded-lg border-2 p-4 text-left transition-all ${source === "JOBNIMBUS" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"} `}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">JobNimbus</p>
                    <p className="text-xs text-slate-500">CRM & Project Management</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSource("ACCULYNX")}
                className={`rounded-lg border-2 p-4 text-left transition-all ${source === "ACCULYNX" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"} `}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                    <Database className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">AccuLynx</p>
                    <p className="text-xs text-slate-500">Roofing Business Software</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Credentials Form */}
            {source && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key"
                      value={credentials.apiKey}
                      onChange={(e) => setCredentials((c) => ({ ...c, apiKey: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      placeholder="Enter your API secret"
                      value={credentials.apiSecret}
                      onChange={(e) => setCredentials((c) => ({ ...c, apiSecret: e.target.value }))}
                    />
                  </div>
                </div>
                {source === "JOBNIMBUS" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyId">Company ID (Optional)</Label>
                    <Input
                      id="companyId"
                      placeholder="Leave blank to auto-detect"
                      value={credentials.companyId}
                      onChange={(e) => setCredentials((c) => ({ ...c, companyId: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handlePreflight} disabled={!source || !credentials.apiKey || loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Validate & Analyze
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Step 2: Analyze                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "analyze" && preflightResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Connection Verified
            </CardTitle>
            <CardDescription>Review what will be imported from {source}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Entity Counts */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(preflightResult.entityCounts).map(([entity, count]) => (
                <div key={entity} className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{count.toLocaleString()}</p>
                  <p className="text-sm capitalize text-slate-500">{entity.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>

            {/* Estimated Duration */}
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-800">Estimated Duration</p>
                <p className="text-sm text-blue-600">{preflightResult.estimatedDuration}</p>
              </div>
            </div>

            {/* Warnings */}
            {preflightResult.warnings.length > 0 && (
              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="mb-2 font-medium text-yellow-800">Warnings</p>
                <ul className="space-y-1">
                  {preflightResult.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-yellow-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep("connect")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleDryRun} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Run Dry Test
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Step 3: Review                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "review" && dryRunResult && (
        <Card>
          <CardHeader>
            <CardTitle>Review Import Plan</CardTitle>
            <CardDescription>
              {dryRunResult.duplicates.length > 0
                ? `Found ${dryRunResult.duplicates.length} potential duplicates. Choose how to handle each.`
                : "No duplicates detected. Ready to import."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Import Summary */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(dryRunResult.wouldImport).map(([entity, count]) => (
                <div key={entity} className="rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{count.toLocaleString()}</p>
                  <p className="text-sm capitalize text-green-600">{entity.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>

            {/* Duplicates Table */}
            {dryRunResult.duplicates.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Match Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="w-40">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dryRunResult.duplicates.slice(0, 10).map((dup) => (
                      <TableRow key={dup.externalId}>
                        <TableCell className="font-medium">{dup.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {dup.matchType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {dup.email || dup.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={duplicateActions[dup.externalId] || dup.recommendation}
                            onValueChange={(v) =>
                              setDuplicateActions((a) => ({
                                ...a,
                                [dup.externalId]: v as "skip" | "merge" | "create_new",
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip</SelectItem>
                              <SelectItem value="merge">Merge</SelectItem>
                              <SelectItem value="create_new">Create New</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {dryRunResult.duplicates.length > 10 && (
                  <p className="border-t py-3 text-center text-sm text-slate-500">
                    +{dryRunResult.duplicates.length - 10} more duplicates
                  </p>
                )}
              </div>
            )}

            {/* Validation Errors */}
            {dryRunResult.validationErrors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="mb-2 font-medium text-red-800">
                  Validation Errors ({dryRunResult.validationErrors.length})
                </p>
                <ul className="max-h-40 space-y-1 overflow-auto">
                  {dryRunResult.validationErrors.map((err, idx) => (
                    <li key={idx} className="text-sm text-red-700">
                      {err.entity}: {err.field} - {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep("analyze")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleStartMigration} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Import
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Step 4: Import                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "import" && migrationStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {migrationStatus.status === "running" && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
                {migrationStatus.status === "paused" && (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                Migration In Progress
              </span>
              <Badge
                className={
                  migrationStatus.status === "running"
                    ? "bg-blue-100 text-blue-700"
                    : migrationStatus.status === "paused"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-slate-100 text-slate-700"
                }
              >
                {migrationStatus.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Currently importing: {migrationStatus.currentEntity || "Initializing..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(migrationStatus.progress)}%</span>
              </div>
              <Progress value={migrationStatus.progress} className="h-3" />
            </div>

            {/* Entities Processed */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(migrationStatus.entitiesProcessed).map(([entity, count]) => (
                <div key={entity} className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold">{count.toLocaleString()}</p>
                  <p className="text-xs capitalize text-slate-500">{entity.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>

            {/* Errors */}
            {migrationStatus.errors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="mb-2 font-medium text-red-800">
                  Errors ({migrationStatus.errors.length})
                </p>
                <ul className="max-h-32 space-y-1 overflow-auto">
                  {migrationStatus.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx} className="text-sm text-red-700">
                      {err.entity}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center gap-3">
            {migrationStatus.status === "running" && (
              <Button variant="outline" onClick={handlePause}>
                Pause
              </Button>
            )}
            {migrationStatus.status === "paused" && (
              <Button variant="outline" onClick={handleResume}>
                Resume
              </Button>
            )}
            {(migrationStatus.status === "running" || migrationStatus.status === "paused") && (
              <Button variant="outline" className="text-red-600" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Step 5: Report                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === "report" && migrationStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {migrationStatus.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : migrationStatus.status === "rolled_back" ? (
                <RotateCcw className="h-5 w-5 text-orange-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Migration{" "}
              {migrationStatus.status === "completed" ? "Complete" : migrationStatus.status}
            </CardTitle>
            <CardDescription>
              {migrationStatus.completedAt
                ? `Finished at ${new Date(migrationStatus.completedAt).toLocaleString()}`
                : `Started at ${new Date(migrationStatus.startedAt).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Final Counts */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(migrationStatus.entitiesProcessed).map(([entity, count]) => (
                <div key={entity} className="rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{count.toLocaleString()}</p>
                  <p className="text-sm capitalize text-green-600">{entity.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>

            {/* Error Summary */}
            {migrationStatus.errors.length > 0 && (
              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="mb-2 font-medium text-yellow-800">
                  {migrationStatus.errors.length} records could not be imported
                </p>
                <p className="text-sm text-yellow-600">
                  These records may have validation issues or conflicts. You can review them in your
                  data management console.
                </p>
              </div>
            )}

            {/* Job ID for reference */}
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Migration Job ID</p>
              <p className="font-mono text-sm">{migrationStatus.jobId}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            {migrationStatus.status === "completed" && (
              <Button
                variant="outline"
                className="text-orange-600"
                onClick={handleRollback}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Rollback Migration
              </Button>
            )}
            <Button onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start New Migration
            </Button>
          </CardFooter>
        </Card>
      )}
    </PageContainer>
  );
}

"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";

interface MigrationStats {
  contacts?: { imported: number; skipped: number; errors: number };
  properties?: { imported: number; skipped: number; errors: number };
  leads?: { imported: number; skipped: number; errors: number };
  jobs?: { imported: number; skipped: number; errors: number };
}

interface MigrationResult {
  ok: boolean;
  migrationId?: string;
  stats?: MigrationStats;
  errors?: string[];
  durationMs?: number;
}

type Step = "idle" | "connecting" | "running" | "done" | "error";

export default function AccuLynxMigration() {
  const [apiKey, setApiKey] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showKey, setShowKey] = useState(false);

  const runMigration = useCallback(async () => {
    if (!apiKey || apiKey.length < 10) {
      setErrorMsg("API key must be at least 10 characters");
      return;
    }

    setStep("connecting");
    setErrorMsg("");
    setResult(null);

    try {
      // Brief delay for UX
      await new Promise((r) => setTimeout(r, 500));
      setStep("running");

      const res = await fetch("/api/migrations/acculynx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, dryRun }),
      });

      const data: MigrationResult = await res.json();

      if (!res.ok || !data.ok) {
        setStep("error");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setErrorMsg((data as any).error || `Migration failed (HTTP ${res.status})`);
        setResult(data);
        return;
      }

      setResult(data);
      setStep("done");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message || "Network error — check your connection");
    }
  }, [apiKey, dryRun]);

  const reset = () => {
    setStep("idle");
    setResult(null);
    setErrorMsg("");
  };

  const statRow = (label: string, data?: { imported: number; skipped: number; errors: number }) => {
    if (!data) return null;
    return (
      <div className="flex items-center justify-between rounded-lg bg-white/50 px-4 py-2 dark:bg-white/5">
        <span className="font-medium text-[color:var(--text)]">{label}</span>
        <div className="flex gap-4 text-sm">
          <span className="text-green-600 dark:text-green-400">+{data.imported} imported</span>
          <span className="text-amber-600 dark:text-amber-400">{data.skipped} skipped</span>
          {data.errors > 0 && <span className="text-red-500">{data.errors} errors</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100 p-3 dark:bg-indigo-900/50">
          <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--text)]">AccuLynx Migration</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Import contacts, jobs, and pipeline data from AccuLynx
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Your API key is never stored.</strong> It&apos;s used in-memory only during the
          migration and discarded immediately after. All migrations are logged for audit trail.
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "idle", label: "Enter API Key" },
          { key: "connecting", label: "Connecting" },
          { key: "running", label: "Importing" },
          { key: "done", label: "Complete" },
        ].map((s, i) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const active =
            step === s.key ||
            (step === "error" && s.key === "running") ||
            (step === "done" && s.key !== "done");
          const completed =
            (step === "connecting" && s.key === "idle") ||
            (step === "running" && (s.key === "idle" || s.key === "connecting")) ||
            (step === "done" && s.key !== "done") ||
            (step === "error" && (s.key === "idle" || s.key === "connecting"));
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />}
              <span
                className={`rounded-full px-3 py-1 font-medium ${
                  completed
                    ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                    : step === s.key
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input Form */}
      {(step === "idle" || step === "error") && (
        <div className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-white/80 p-6 dark:bg-white/5">
          {/* API Key Input */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[color:var(--text)]">
              AccuLynx API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your AccuLynx API key..."
                className="flex-1 rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[color:var(--text)] placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-900 dark:placeholder-slate-600 dark:focus:ring-indigo-800"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-xl border border-[color:var(--border)] px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
              Find your API key at <span className="font-medium">AccuLynx → Settings → API</span>
            </p>
          </div>

          {/* Dry Run Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={dryRun}
              onClick={() => setDryRun(!dryRun)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                dryRun ? "bg-amber-500" : "bg-green-500"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  dryRun ? "translate-x-0" : "translate-x-5"
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-semibold text-[color:var(--text)]">
                {dryRun ? "Preview Mode (Dry Run)" : "Live Migration"}
              </span>
              <p className="text-xs text-slate-500">
                {dryRun
                  ? "Preview what will be imported without making changes"
                  : "Data will be imported into your account"}
              </p>
            </div>
          </div>

          {/* Warning for live mode */}
          {!dryRun && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Live migration is ON.</strong> Data will be imported into your organization.
                Duplicates are detected by email/phone and skipped automatically.
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="text-sm text-red-700 dark:text-red-300">{errorMsg}</div>
            </div>
          )}

          {/* Start Button */}
          <button
            type="button"
            onClick={runMigration}
            disabled={!apiKey || apiKey.length < 10}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Database className="h-5 w-5" />
            {dryRun ? "Preview Migration" : "Start Live Migration"}
          </button>
        </div>
      )}

      {/* Running State */}
      {(step === "connecting" || step === "running") && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[color:var(--border)] bg-white/80 p-12 dark:bg-white/5">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-indigo-500" />
          <p className="text-lg font-semibold text-[color:var(--text)]">
            {step === "connecting" ? "Connecting to AccuLynx..." : "Importing your data..."}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {step === "connecting"
              ? "Verifying API key and permissions"
              : "Migrating contacts, jobs, and pipeline data"}
          </p>
          {dryRun && (
            <span className="mt-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
              DRY RUN — no data will be changed
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {step === "done" && result && (
        <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50/50 p-6 dark:border-green-800 dark:bg-green-900/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
                {dryRun ? "Preview Complete" : "Migration Complete!"}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-500">
                {result.durationMs
                  ? `Finished in ${(result.durationMs / 1000).toFixed(1)}s`
                  : "All done"}
                {result.migrationId && ` · ID: ${result.migrationId}`}
              </p>
            </div>
          </div>

          {/* Stats Table */}
          {result.stats && (
            <div className="space-y-2">
              {statRow("Contacts", result.stats.contacts)}
              {statRow("Properties", result.stats.properties)}
              {statRow("Leads", result.stats.leads)}
              {statRow("Jobs", result.stats.jobs)}
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
                {result.errors.length} error(s):
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-600 dark:text-red-400">
                {result.errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {dryRun && (
              <button
                type="button"
                onClick={() => {
                  setDryRun(false);
                  setStep("idle");
                  setResult(null);
                }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-700"
              >
                <Database className="h-5 w-5" />
                Run Live Migration
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] px-6 py-3 font-medium text-[color:var(--text)] transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              {dryRun ? "Start Over" : "Run Another Migration"}
            </button>
          </div>
        </div>
      )}

      {/* What Gets Imported */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-white/60 p-6 dark:bg-white/5">
        <h3 className="mb-4 text-lg font-bold text-[color:var(--text)]">What Gets Imported</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              title: "Contacts",
              desc: "Names, emails, phones → SkaiScraper contacts",
              icon: "👤",
            },
            {
              title: "Properties",
              desc: "Job addresses → property profiles with lat/lng",
              icon: "🏠",
            },
            {
              title: "Leads",
              desc: "Pipeline stage, status → lead records with source attribution",
              icon: "📋",
            },
            {
              title: "Jobs",
              desc: "Work details, contracts → CRM jobs with financials",
              icon: "🔨",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-[color:var(--text)]">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import {
  Boxes,
  Building2,
  CloudSunRain,
  FileCheck,
  FileText,
  Images,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
import { getUiTheme } from "@/config/uiTheme";

// Expanded module catalog (placeholder data integration stubs)
const MODULES = [
  {
    id: "cover",
    label: "Cover Page",
    icon: FileText,
    description: "Branding-driven cover with company + client details",
  },
  {
    id: "damage_photos",
    label: "AI Damage Photos",
    icon: Images,
    description: "Captioned photo breakdown with detected damage",
  },
  {
    id: "code_compliance",
    label: "Code & Compliance",
    icon: FileCheck,
    description: "Build code references & manufacturer specs",
  },
  {
    id: "weather_quick",
    label: "Quick DOL Pull",
    icon: CloudSunRain,
    description: "Rapid date-of-loss verification snapshot",
  },
  {
    id: "weather_full",
    label: "Full Weather Report",
    icon: CloudSunRain,
    description: "Detailed storm data & verification",
  },
  {
    id: "mockup",
    label: "AI Property Mockup",
    icon: Wand2,
    description: "Visual enhancement / restoration concept mockup",
  },
  {
    id: "claims_blueprint",
    label: "Claims Blueprint",
    icon: ShieldCheck,
    description: "Claim timeline, strategic outline & phases",
  },
  {
    id: "warranties",
    label: "Warranties",
    icon: Building2,
    description: "Material & workmanship warranty summary",
  },
  {
    id: "restoration_roadmap",
    label: "Restoration Roadmap",
    icon: Sparkles,
    description: "Phase-by-phase build & restoration sequence",
  },
  {
    id: "vendor_brochures",
    label: "Vendor Brochures",
    icon: Boxes,
    description: "Color & material option brochures",
  },
];

export default function ReportAssemblyClient() {
  const searchParams = useSearchParams();
  const initialClaimId = searchParams?.get("claimId") || "";
  const [claimId, setClaimId] = useState(initialClaimId);
  const [selected, setSelected] = useState<string[]>([
    "cover",
    "damage_photos",
    "claims_blueprint",
  ]);
  const [format, setFormat] = useState<"pdf" | "html">("pdf");
  const [retailMode, setRetailMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [smartTemplateId, setSmartTemplateId] = useState<string | null>(null);
  const { theme } = useTheme();
  const t = getUiTheme(theme === "dark" ? "dark" : "light");

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  function applyPreset(preset: "retail" | "insurance") {
    if (preset === "retail") {
      setSelected([
        "cover",
        "damage_photos",
        "mockup",
        "warranties",
        "restoration_roadmap",
        "vendor_brochures",
      ]);
      setRetailMode(true);
    } else {
      setSelected([
        "cover",
        "damage_photos",
        "code_compliance",
        "weather_full",
        "claims_blueprint",
      ]);
      setRetailMode(false);
    }
  }

  // Placeholder assembly — future: integrate real module fetchers
  async function assemble(type: "retail" | "insurance") {
    if (!claimId.trim() && type === "insurance") {
      setError("Claim ID required for insurance report");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one module");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = { claimId: claimId || null, modules: selected, format, mode: type };
      const res = await fetch("/api/agents/report-assembly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Assembly failed");
        setLoading(false);
        return;
      }
      // Augment placeholder
      data.mode = type;
      data.includedSections = selected;
      setResult(data);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Deprecated original assemble() retained for backward compatibility
  async function _assembleLegacy() {
    return assemble(retailMode ? "retail" : "insurance");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-3xl border border-border bg-card px-6 py-5 shadow-lg md:px-8 md:py-6">
        <div className="space-y-2">
          <label className={"text-sm font-medium " + t.text.primary}>
            Claim ID (insurance mode)
          </label>
          <input
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            className={
              "w-full rounded-md border px-3 py-2 " +
              t.border.default +
              " " +
              t.bg.page +
              " " +
              t.text.primary
            }
            placeholder="claim-123"
          />
        </div>
        <div className="space-y-2">
          <p className={"text-sm font-medium " + t.text.primary}>Modules *</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const active = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={
                    "group cursor-pointer rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg " +
                    (active
                      ? "border-primary bg-card shadow-md"
                      : "border-border bg-card shadow-sm")
                  }
                >
                  <div className={"flex items-center gap-2 font-medium text-foreground"}>
                    <m.icon
                      className={"h-4 w-4 " + (active ? "text-primary" : "text-muted-foreground")}
                    />{" "}
                    {m.label}
                  </div>
                  <div className={"mt-1 text-xs text-muted-foreground"}>{m.description}</div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => applyPreset("retail")}
              className={
                "rounded-md border px-2 py-1 text-xs " +
                t.border.default +
                " " +
                (retailMode ? "bg-[var(--surface-2)]" : "bg-[var(--surface-1)]")
              }
            >
              Retail Preset
            </button>
            <button
              type="button"
              onClick={() => applyPreset("insurance")}
              className={
                "rounded-md border px-2 py-1 text-xs " +
                t.border.default +
                " " +
                (!retailMode ? "bg-[var(--surface-2)]" : "bg-[var(--surface-1)]")
              }
            >
              Insurance Preset
            </button>
          </div>

          {/* AI Smart Template Picker */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <SmartTemplateSelector
              onSelect={(templateId) => setSmartTemplateId(templateId)}
              selectedId={smartTemplateId ?? undefined}
              context={{ claimId: claimId || undefined }}
              showRecommendation={true}
              compact={true}
              label="Or let AI pick the best template"
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className={"text-sm font-medium " + t.text.primary}>Output Format</p>
          <div className="grid grid-cols-2 gap-2">
            {(["pdf", "html"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={
                  "rounded-md border px-3 py-2 text-sm " +
                  t.border.default +
                  " " +
                  (format === f ? t.selection.bg : "")
                }
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div
            className={
              "rounded-md border px-3 py-2 text-sm " + t.border.default + " " + t.text.secondary
            }
          >
            {error}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => assemble("retail")}
            disabled={loading}
            className={
              "rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-[var(--glow)] " +
              (loading ? "cursor-not-allowed opacity-50" : "")
            }
          >
            {loading ? "Working..." : "Generate Retail Proposal"}
          </button>
          <button
            onClick={() => assemble("insurance")}
            disabled={loading}
            className={
              "rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--glow)] " +
              (loading ? "cursor-not-allowed opacity-50" : "")
            }
          >
            {loading ? "Working..." : "Generate Insurance AI Report"}
          </button>
        </div>
      </div>
      {result && (
        <div className={"space-y-4 rounded-lg border p-6 " + t.border.default + " " + t.bg.card}>
          <h2 className={"text-lg font-semibold " + t.text.primary}>
            {result.mode === "retail" ? "Retail Proposal Ready" : "Insurance Report Ready"}
          </h2>
          <div className={"text-sm " + t.text.secondary}>Format: {result.format}</div>
          <div className="flex flex-wrap gap-2">
            {result.includedSections?.map((sid: string) => (
              <span
                key={sid}
                className={
                  "rounded border px-2 py-1 text-xs " + t.border.default + " " + t.text.secondary
                }
              >
                {sid}
              </span>
            ))}
          </div>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              className={"inline-block text-sm underline " + t.text.primary}
            >
              Open Report
            </a>
          )}
        </div>
      )}
      {!result && !loading && (
        <div
          className={
            "rounded-lg border p-6 text-center text-sm " +
            t.border.default +
            " " +
            t.bg.card +
            " " +
            t.text.secondary
          }
        >
          No report yet. Configure and assemble.
        </div>
      )}
    </div>
  );
}

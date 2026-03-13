"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  FileText,
  Scale,
  Sparkles,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MissingField {
  field: string;
  label: string;
  severity: "critical" | "important" | "optional";
  suggestion: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface SectionMissing {
  sectionKey: string;
  sectionLabel: string;
  sectionNumber: number;
  missingFields: MissingField[];
  canAutoGenerate: boolean;
  completeness: number;
}

interface MissingDataHighlighterProps {
  claimId: string;
  /** Array of sections with their missing data */
  sections: SectionMissing[];
  /** Callback when user clicks an action to fix a missing field */
  onAction?: (sectionKey: string, field: string) => void;
  /** Show in compact inline mode (for embedding in SectionCard) */
  compact?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Known field → action mappings
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_ACTION_MAP: Record<
  string,
  { icon: React.ReactNode; suggestion: string; route?: string }
> = {
  // Photo-related
  photos: {
    icon: <Camera className="h-3.5 w-3.5" />,
    suggestion: "Upload property photos",
    route: "/claims/{claimId}/photos",
  },
  analyzed_photos: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    suggestion: "Run AI damage detection on uploaded photos",
  },
  photo_evidence: {
    icon: <Camera className="h-3.5 w-3.5" />,
    suggestion: "Upload at least 10 photos for full coverage",
    route: "/claims/{claimId}/photos",
  },
  // Weather
  weather_report: {
    icon: <Cloud className="h-3.5 w-3.5" />,
    suggestion: "Run weather verification for date of loss",
    route: "/weather",
  },
  weather_narrative: {
    icon: <Cloud className="h-3.5 w-3.5" />,
    suggestion: "Generate weather cause-of-loss narrative",
  },
  // Claim basics
  insured_name: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Add homeowner name to claim",
    route: "/claims/{claimId}",
  },
  property_address: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Add property address",
    route: "/claims/{claimId}",
  },
  carrier: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Add insurance carrier",
    route: "/claims/{claimId}",
  },
  policy_number: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Add policy number",
    route: "/claims/{claimId}",
  },
  date_of_loss: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Set date of loss",
    route: "/claims/{claimId}",
  },
  claim_number: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Add claim number",
    route: "/claims/{claimId}",
  },
  // Scope & pricing
  scope_items: {
    icon: <Wrench className="h-3.5 w-3.5" />,
    suggestion: "Upload scope/estimate (Xactimate or manual)",
    route: "/claims/{claimId}/documents",
  },
  estimate: {
    icon: <Wrench className="h-3.5 w-3.5" />,
    suggestion: "Add repair estimate or scope document",
  },
  // Code compliance
  code_requirements: {
    icon: <Scale className="h-3.5 w-3.5" />,
    suggestion: "Review code compliance requirements",
    route: "/code-compliance",
  },
  // Inspection
  inspection_data: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Complete inspection details",
  },
  roof_type: { icon: <Wrench className="h-3.5 w-3.5" />, suggestion: "Add roof type and age" },
  // Reports
  damage_report: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Generate AI damage report",
    route: "/reports",
  },
  justification_report: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Generate repair justification report",
    route: "/reports",
  },
  // Signatures
  digital_signatures: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Collect digital signatures",
  },
  homeowner_signature: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Get homeowner signature on authorization",
  },
  // Misc
  timeline: {
    icon: <FileText className="h-3.5 w-3.5" />,
    suggestion: "Log claim activities to build timeline",
  },
  supplements: {
    icon: <Upload className="h-3.5 w-3.5" />,
    suggestion: "Upload supplement if available",
  },
  contractor_info: {
    icon: <Wrench className="h-3.5 w-3.5" />,
    suggestion: "Complete company profile in settings",
    route: "/settings/company",
  },
};

function getFieldAction(field: string, claimId: string) {
  // Normalize the field name for lookup
  const normalized = field.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const entry = FIELD_ACTION_MAP[normalized];
  if (entry) {
    return {
      ...entry,
      route: entry.route?.replace("{claimId}", claimId),
    };
  }
  // Partial match
  for (const [key, val] of Object.entries(FIELD_ACTION_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...val, route: val.route?.replace("{claimId}", claimId) };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity helpers
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Critical",
  },
  important: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: "Important",
  },
  optional: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "Optional",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MissingDataHighlighter({
  claimId,
  sections,
  onAction,
  compact = false,
  className,
}: MissingDataHighlighterProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Compute summary stats
  const stats = useMemo(() => {
    let totalMissing = 0;
    let criticalCount = 0;
    let importantCount = 0;
    let optionalCount = 0;
    let autoFixable = 0;

    for (const section of sections) {
      for (const field of section.missingFields) {
        totalMissing++;
        if (field.severity === "critical") criticalCount++;
        else if (field.severity === "important") importantCount++;
        else optionalCount++;
      }
      if (section.canAutoGenerate && section.missingFields.length > 0) {
        autoFixable++;
      }
    }

    const sectionsWithMissing = sections.filter((s) => s.missingFields.length > 0);

    return {
      totalMissing,
      criticalCount,
      importantCount,
      optionalCount,
      autoFixable,
      sectionsWithMissing,
    };
  }, [sections]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Nothing missing — show success state
  if (stats.totalMissing === 0) {
    return (
      <Card
        className={cn(
          "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
          className
        )}
      >
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              All Data Complete
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
              Every section in the ClaimIQ packet has the data it needs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <CompactHighlighter
        claimId={claimId}
        stats={stats}
        onAction={onAction}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Banner */}
      <Card
        className={cn(
          "overflow-hidden border-0",
          stats.criticalCount > 0
            ? "bg-gradient-to-r from-red-600 to-red-500 dark:from-red-900 dark:to-red-800"
            : stats.importantCount > 0
              ? "bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-900 dark:to-amber-800"
              : "bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-900 dark:to-blue-800"
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {stats.totalMissing} Missing {stats.totalMissing === 1 ? "Field" : "Fields"}
                </h3>
                <p className="text-sm text-white/80">
                  Across {stats.sectionsWithMissing.length} section
                  {stats.sectionsWithMissing.length !== 1 ? "s" : ""} — fix these to maximize your
                  packet score
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {stats.criticalCount > 0 && (
                <Badge className="bg-white/20 text-white">{stats.criticalCount} Critical</Badge>
              )}
              {stats.importantCount > 0 && (
                <Badge className="bg-white/20 text-white">{stats.importantCount} Important</Badge>
              )}
              {stats.autoFixable > 0 && (
                <Badge className="gap-1 bg-white/20 text-white">
                  <Sparkles className="h-3 w-3" />
                  {stats.autoFixable} Auto-fixable
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section-by-Section Missing Fields */}
      <div className="space-y-2">
        {stats.sectionsWithMissing.map((section) => {
          const isExpanded = expandedSections.has(section.sectionKey);
          const criticalInSection = section.missingFields.filter(
            (f) => f.severity === "critical"
          ).length;
          const completenessColor =
            section.completeness >= 80
              ? "text-emerald-600"
              : section.completeness >= 50
                ? "text-yellow-600"
                : "text-red-600";

          return (
            <Card key={section.sectionKey} className="overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.sectionKey)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-700">
                  {section.sectionNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold">{section.sectionLabel}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {section.missingFields.length} missing
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {criticalInSection > 0 && (
                    <Badge className={SEVERITY_CONFIG.critical.badge}>
                      {criticalInSection} critical
                    </Badge>
                  )}
                  {section.canAutoGenerate && (
                    <Badge className="gap-1 bg-purple-100 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </Badge>
                  )}
                  <span className={cn("text-xs font-semibold", completenessColor)}>
                    {section.completeness}%
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded missing fields */}
              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3">
                  <div className="space-y-2">
                    {section.missingFields.map((field, idx) => {
                      const config = SEVERITY_CONFIG[field.severity];
                      const action = getFieldAction(field.field, claimId);

                      return (
                        <div
                          key={`${field.field}-${idx}`}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3",
                            config.bg,
                            config.border
                          )}
                        >
                          <span className={config.color}>{config.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {field.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {field.suggestion ||
                                action?.suggestion ||
                                "Provide this data to complete the section"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px]", config.color)}>
                              {config.label}
                            </Badge>
                            {(field.actionUrl || action?.route) && (
                              <Link href={field.actionUrl || action!.route!}>
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                                  Fix <ArrowRight className="h-3 w-3" />
                                </Button>
                              </Link>
                            )}
                            {onAction && !field.actionUrl && !action?.route && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAction(section.sectionKey, field.field);
                                }}
                              >
                                Fix <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Highlighter (for embedding in SectionCard or sidebar)
// ─────────────────────────────────────────────────────────────────────────────

function CompactHighlighter({
  claimId,
  stats,
  onAction,
  className,
}: {
  claimId: string;
  stats: ReturnType<typeof Object>;
  onAction?: (sectionKey: string, field: string) => void;
  className?: string;
}) {
  const s = stats as {
    totalMissing: number;
    criticalCount: number;
    importantCount: number;
    optionalCount: number;
    autoFixable: number;
    sectionsWithMissing: SectionMissing[];
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          {s.totalMissing} missing field{s.totalMissing !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        {s.criticalCount > 0 && (
          <span className="text-[10px] font-semibold text-red-600">{s.criticalCount} critical</span>
        )}
      </div>
      {s.sectionsWithMissing.length > 0 && (
        <div className="mt-2 space-y-1">
          {s.sectionsWithMissing.slice(0, 3).map((sec) => (
            <div
              key={sec.sectionKey}
              className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-200"
            >
              <span className="font-medium">§{sec.sectionNumber}</span>
              <span className="truncate">{sec.sectionLabel}</span>
              <span className="text-amber-500">({sec.missingFields.length})</span>
            </div>
          ))}
          {s.sectionsWithMissing.length > 3 && (
            <span className="text-[10px] text-amber-500">
              +{s.sectionsWithMissing.length - 3} more sections
            </span>
          )}
        </div>
      )}
      <Link href={`/claims-ready-folder/${claimId}`}>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-6 w-full gap-1 border-amber-300 text-[10px] text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
        >
          View All Missing Data <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Convert API _missingFields to MissingDataHighlighter format
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts raw API section data (with _missingFields arrays) into the
 * structured SectionMissing[] format that MissingDataHighlighter expects.
 *
 * Usage:
 * ```tsx
 * const sections = await Promise.all(
 *   SECTION_KEYS.map(async (key) => {
 *     const res = await fetch(`/api/claims-folder/sections/${key}?claimId=${claimId}`);
 *     return { key, data: await res.json() };
 *   })
 * );
 * const missingData = parseSectionsForHighlighter(sections);
 * <MissingDataHighlighter claimId={claimId} sections={missingData} />
 * ```
 */

const SECTION_LABELS: Record<string, { label: string; number: number }> = {
  "cover-sheet": { label: "Cover Sheet", number: 1 },
  "table-of-contents": { label: "Table of Contents", number: 2 },
  "executive-summary": { label: "Executive Summary", number: 3 },
  "weather-cause-of-loss": { label: "Weather & Cause of Loss", number: 4 },
  "inspection-overview": { label: "Inspection Overview", number: 5 },
  "damage-grids": { label: "Damage Grids", number: 6 },
  "photo-evidence": { label: "Photo Evidence", number: 7 },
  "code-compliance": { label: "Code Compliance", number: 8 },
  "scope-pricing": { label: "Scope & Pricing", number: 9 },
  "repair-justification": { label: "Repair Justification", number: 10 },
  "contractor-summary": { label: "Contractor Summary", number: 11 },
  timeline: { label: "Timeline", number: 12 },
  "homeowner-statement": { label: "Homeowner Statement", number: 13 },
  "adjuster-cover-letter": { label: "Adjuster Cover Letter", number: 14 },
  "claim-checklist": { label: "Claim Checklist", number: 15 },
  "digital-signatures": { label: "Digital Signatures", number: 16 },
  attachments: { label: "Attachments", number: 17 },
};

/** Fields that are critical for packet submission */
const CRITICAL_FIELDS = new Set([
  "insured_name",
  "property_address",
  "carrier",
  "date_of_loss",
  "photos",
  "weather_report",
  "scope_items",
  "policy_number",
]);

/** Fields that are important but not blocking */
const IMPORTANT_FIELDS = new Set([
  "analyzed_photos",
  "code_requirements",
  "damage_report",
  "inspection_data",
  "roof_type",
  "claim_number",
]);

export interface RawSectionData {
  key: string;
  data: {
    _missingFields?: string[];
    _canAutoGenerate?: boolean;
    [key: string]: unknown;
  };
}

export function parseSectionsForHighlighter(rawSections: RawSectionData[]): SectionMissing[] {
  return rawSections
    .map(({ key, data }) => {
      const meta = SECTION_LABELS[key];
      if (!meta) return null;

      const missingFields = (data._missingFields || []).map((field: string): MissingField => {
        const normalized = field.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const severity: MissingField["severity"] = CRITICAL_FIELDS.has(normalized)
          ? "critical"
          : IMPORTANT_FIELDS.has(normalized)
            ? "important"
            : "optional";

        // Human-readable label
        const label = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        return {
          field,
          label,
          severity,
          suggestion: `Provide ${label.toLowerCase()} for the ${meta.label} section`,
        };
      });

      // Estimate completeness from missing vs expected fields count
      // Each section typically has 3-8 fields
      const expectedFields = Math.max(missingFields.length + 3, 5);
      const filledFields = expectedFields - missingFields.length;
      const completeness = Math.round((filledFields / expectedFields) * 100);

      return {
        sectionKey: key,
        sectionLabel: meta.label,
        sectionNumber: meta.number,
        missingFields,
        canAutoGenerate: data._canAutoGenerate ?? false,
        completeness: Math.max(0, Math.min(100, completeness)),
      };
    })
    .filter((s): s is SectionMissing => s !== null && s.missingFields.length > 0);
}

export default MissingDataHighlighter;

"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  Home,
  Loader2,
  Presentation,
  Shield,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackRecommendationEvent } from "@/lib/reports/recommendation-analytics";
import type { RecommendationRequest, ScoredTemplate } from "@/lib/reports/recommendation-schema";
import { cn } from "@/lib/utils";

// ─── Style Category Config ───────────────────────────────────

const STYLE_OPTIONS = [
  {
    key: "Insurance" as const,
    label: "Insurance",
    description: "Carrier-facing claims documentation",
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-800",
    ringColor: "ring-blue-500",
  },
  {
    key: "Retail" as const,
    label: "Retail",
    description: "Homeowner-facing proposals & agreements",
    icon: Home,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    ringColor: "ring-emerald-500",
  },
  {
    key: "Sales Material" as const,
    label: "Sales Material",
    description: "Pre-sale inspection & presentation docs",
    icon: Presentation,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
    borderColor: "border-purple-200 dark:border-purple-800",
    ringColor: "ring-purple-500",
  },
] as const;

// ─── Props ───────────────────────────────────────────────────

interface SmartTemplateSelectorProps {
  /** Called when user selects a template */
  onSelect: (templateId: string, slug: string) => void;
  /** Additional context for the recommendation engine */
  context?: Partial<RecommendationRequest>;
  /** Pre-select a style (skip step 1) */
  defaultStyle?: "Insurance" | "Retail" | "Sales Material";
  /** Whether to show the AI recommendation panel */
  showRecommendation?: boolean;
  /** Compact mode for embedded use */
  compact?: boolean;
  /** Currently selected template ID (controlled) */
  selectedId?: string;
  /** Label override */
  label?: string;
  /** Disable the selector */
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────

export function SmartTemplateSelector({
  onSelect,
  context = {},
  defaultStyle,
  showRecommendation = true,
  compact = false,
  selectedId,
  label = "Choose Report Style",
  disabled = false,
}: SmartTemplateSelectorProps) {
  const [style, setStyle] = useState<"Insurance" | "Retail" | "Sales Material" | null>(
    defaultStyle ?? null
  );
  const [recommendations, setRecommendations] = useState<ScoredTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  // Fetch recommendations when style or context changes
  const fetchRecommendations = useCallback(
    async (selectedStyle: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/reports/recommend-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleCategory: selectedStyle,
            limit: 5,
            ...context,
          }),
        });
        if (!res.ok) throw new Error("Failed to fetch recommendations");
        const data = await res.json();
        setRecommendations(data.recommendations ?? []);
        // Track recommendations shown
        const recs = data.recommendations ?? [];
        if (recs.length > 0) {
          trackRecommendationEvent({
            eventType: "recommendations_shown",
            styleCategory: selectedStyle,
            recommendedTemplateId: recs[0]?.templateId,
            topConfidence: recs[0]?.score,
            recommendationCount: recs.length,
            missingFieldCount: recs[0]?.missingInputs?.length ?? 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            context: context as any,
          });
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        setError("Could not load recommendations");
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    },
    [context]
  );

  useEffect(() => {
    if (style && showRecommendation) {
      void fetchRecommendations(style);
    }
  }, [style, showRecommendation, fetchRecommendations]);

  const handleStyleSelect = (selected: (typeof STYLE_OPTIONS)[number]) => {
    setStyle(selected.key);
    trackRecommendationEvent({
      eventType: "style_selected",
      styleCategory: selected.key,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: context as any,
    });
    if (!showRecommendation) {
      // If no recommendation panel, we're done — user needs to pick later
    }
  };

  const handleTemplateSelect = (rec: ScoredTemplate) => {
    if (!disabled) {
      const topRec = recommendations[0];
      const isTopPick = topRec?.templateId === rec.templateId;
      trackRecommendationEvent({
        eventType: isTopPick ? "template_selected" : "template_override",
        styleCategory: style ?? undefined,
        recommendedTemplateId: topRec?.templateId,
        selectedTemplateId: rec.templateId,
        topConfidence: topRec?.score,
        acceptedTopPick: isTopPick,
        missingFieldCount: rec.missingInputs.length,
        recommendationCount: recommendations.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context: context as any,
      });
      onSelect(rec.templateId, rec.slug);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-100 dark:bg-emerald-900/40";
    if (score >= 60) return "bg-amber-100 dark:bg-amber-900/40";
    return "bg-red-100 dark:bg-red-900/40";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">{label}</h3>
          </div>
          {compact && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              />
            </Button>
          )}
        </div>
      )}

      {expanded && (
        <>
          {/* Step 1: Style Selection */}
          <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3")}>
            {STYLE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = style === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleStyleSelect(opt)}
                  disabled={disabled}
                  className={cn(
                    "relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all",
                    "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1",
                    isSelected
                      ? cn(opt.bgColor, opt.borderColor, `focus:${opt.ringColor}`)
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className={cn("h-5 w-5", isSelected ? opt.color : "text-slate-400")} />
                    {isSelected && <Check className={cn("h-4 w-4", opt.color)} />}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isSelected ? opt.color : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {opt.label}
                  </span>
                  {!compact && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {opt.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Step 2: AI Recommendations */}
          {style && showRecommendation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  AI Recommended Templates
                </span>
                {loading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              {!loading && !error && recommendations.length > 0 && (
                <div className="space-y-1.5">
                  {recommendations.map((rec, idx) => (
                    <Card
                      key={rec.templateId}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedId === rec.templateId
                          ? "border-sky-300 ring-2 ring-sky-500 dark:border-sky-700"
                          : "hover:border-slate-300 dark:hover:border-slate-600",
                        disabled && "cursor-not-allowed opacity-50"
                      )}
                      onClick={() => handleTemplateSelect(rec)}
                    >
                      <CardContent className="flex items-start gap-3 p-3">
                        {/* Rank badge */}
                        <div className="flex flex-col items-center gap-1">
                          {idx === 0 ? (
                            <Badge
                              variant="default"
                              className="bg-amber-500 px-1.5 text-xs text-white"
                            >
                              TOP
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="px-1.5 text-xs">
                              #{idx + 1}
                            </Badge>
                          )}
                          <span className={cn("text-xs font-bold", getScoreColor(rec.score))}>
                            {rec.score}%
                          </span>
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {rec.title}
                            </span>
                            {selectedId === rec.templateId && (
                              <Check className="h-4 w-4 flex-shrink-0 text-sky-500" />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                            {rec.bestFor}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs italic text-slate-400 dark:text-slate-500">
                            {rec.rationale}
                          </p>

                          {/* Missing inputs warning */}
                          {rec.missingInputs.length > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 flex-shrink-0 text-amber-500" />
                              <span className="truncate text-[10px] text-amber-600 dark:text-amber-400">
                                {rec.missingInputs.join(", ")}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Score badge */}
                        <div
                          className={cn(
                            "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            getScoreBg(rec.score),
                            getScoreColor(rec.score)
                          )}
                        >
                          {rec.score >= 80 ? "Great fit" : rec.score >= 60 ? "Good fit" : "Partial"}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && !error && recommendations.length === 0 && style && (
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">
                  No templates found for this style. Try a different category.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

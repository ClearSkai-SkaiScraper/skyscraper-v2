/**
 * Template Marketplace — 3-Style Navigation
 *
 * Top-level: Insurance | Retail | Sales Material
 * 27 templates organized under those 3 buckets.
 * Full search across all templates regardless of active tab.
 */

"use client";

import {
  Briefcase,
  CheckCircle2,
  FileText,
  LayoutTemplate,
  Megaphone,
  Package,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { AddToTemplatesButton } from "./_components/AddToTemplatesButton";
import { UseTemplateButton } from "./_components/UseTemplateButton";

// ─── Types ───────────────────────────────────────────────────
interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  styleCategory?: string | null;
  audience?: string | null;
  bestFor?: string | null;
  thumbnailUrl: string | null;
  previewPdfUrl: string | null;
  placeholders: any[];
  placeholderCount?: number;
  version: string;
  slug: string | null;
  assets?: {
    thumbnail: string;
    previewPdf: string;
    templateHbs: string;
    stylesCss: string;
  } | null;
}

type StyleTab = "all" | "Insurance" | "Retail" | "Sales Material";

// ─── Style Tab Config ────────────────────────────────────────
const STYLE_TABS: Array<{
  key: StyleTab;
  label: string;
  icon: React.ReactNode;
  emoji: string;
  description: string;
  gradient: string;
  borderColor: string;
  textColor: string;
  badgeColor: string;
}> = [
  {
    key: "all",
    label: "All Templates",
    icon: <LayoutTemplate className="h-5 w-5" />,
    emoji: "📋",
    description: "Browse the complete template library",
    gradient: "from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30",
    borderColor: "border-slate-500/20",
    textColor: "text-slate-700 dark:text-slate-300",
    badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    key: "Insurance",
    label: "Insurance",
    icon: <Shield className="h-5 w-5" />,
    emoji: "🛡️",
    description:
      "Carrier-facing documentation — damage reports, supplements, rebuttals, certifications",
    gradient: "from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30",
    borderColor: "border-blue-500/20",
    textColor: "text-blue-700 dark:text-blue-300",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    key: "Retail",
    label: "Retail",
    icon: <ShoppingBag className="h-5 w-5" />,
    emoji: "🏠",
    description: "Homeowner-facing documents — estimates, proposals, warranties, authorizations",
    gradient: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30",
    borderColor: "border-emerald-500/20",
    textColor: "text-emerald-700 dark:text-emerald-300",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    key: "Sales Material",
    label: "Sales Material",
    icon: <Megaphone className="h-5 w-5" />,
    emoji: "🎯",
    description: "Pre-sale presentation docs — inspections, assessments, leave-behinds",
    gradient: "from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30",
    borderColor: "border-purple-500/20",
    textColor: "text-purple-700 dark:text-purple-300",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
];

// ─── Helpers ─────────────────────────────────────────────────
function getStyleCategoryFromLegacy(category: string | null): StyleTab {
  const c = (category || "").toLowerCase();
  if (["roofing", "restoration", "supplements", "legal & appraisal"].includes(c))
    return "Insurance";
  if (["retail & quotes"].includes(c)) return "Retail";
  if (["specialty reports"].includes(c)) return "Sales Material";
  return "Insurance"; // safe default
}

function getAudienceIcon(audience?: string | null) {
  switch (audience) {
    case "carrier":
      return <Shield className="h-3.5 w-3.5" />;
    case "homeowner":
      return <Users className="h-3.5 w-3.5" />;
    case "prospect":
      return <Briefcase className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

function getAudienceLabel(audience?: string | null) {
  switch (audience) {
    case "carrier":
      return "For the carrier";
    case "homeowner":
      return "For the homeowner";
    case "prospect":
      return "For sales prospects";
    default:
      return "General use";
  }
}

// ─── Main Component ──────────────────────────────────────────
export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [addedTemplateIds, setAddedTemplateIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StyleTab>("all");

  const handleTemplateAdded = (templateId: string, templateSlug?: string) => {
    setAddedTemplateIds((prev) => {
      const next = new Set(prev);
      next.add(templateId);
      if (templateSlug) next.add(templateSlug);
      return next;
    });
  };

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const [res, userRes] = await Promise.all([
          fetch("/api/templates/marketplace"),
          fetch("/api/templates/my-templates").catch(() => null),
        ]);
        const data = await res.json();
        if (data.ok) {
          setTemplates(data.templates);
        } else {
          setError(data.error || "Failed to load templates");
        }
        if (userRes?.ok) {
          try {
            const userData = await userRes.json();
            if (userData.templates) {
              const addedIds = new Set<string>();
              userData.templates.forEach((t: any) => {
                if (t.marketplaceId) addedIds.add(t.marketplaceId);
                if (t.slug) addedIds.add(t.slug);
              });
              setAddedTemplateIds(addedIds);
            }
          } catch {
            /* user not logged in */
          }
        }
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  // ── Filtering ──────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    let list = templates;

    // Search across ALL templates regardless of tab
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.bestFor || "").toLowerCase().includes(q)
      );
    }

    // Tab filter
    if (activeTab !== "all") {
      list = list.filter((t) => {
        const style = t.styleCategory || getStyleCategoryFromLegacy(t.category);
        return style === activeTab;
      });
    }

    return list;
  }, [templates, searchQuery, activeTab]);

  // Style counts for badges on tabs
  const styleCounts = useMemo(() => {
    const counts: Record<StyleTab, number> = {
      all: templates.length,
      Insurance: 0,
      Retail: 0,
      "Sales Material": 0,
    };
    templates.forEach((t) => {
      const style = (t.styleCategory || getStyleCategoryFromLegacy(t.category)) as StyleTab;
      if (style in counts) counts[style]++;
    });
    return counts;
  }, [templates]);

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <PageHero
          section="reports"
          title="Template Marketplace"
          subtitle="Professional report templates for contractors, trades pros, and service companies"
          icon={<LayoutTemplate className="h-6 w-6" />}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border bg-slate-50 p-6 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-2">
                  <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="h-44 bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────
  if (error) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <PageHero
          section="reports"
          title="Template Marketplace"
          subtitle="Professional report templates for contractors, trades pros, and service companies"
          icon={<LayoutTemplate className="h-6 w-6" />}
        />
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <Package className="h-16 w-16 text-red-400" />
          <p className="text-lg text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const activeTabConfig = STYLE_TABS.find((t) => t.key === activeTab) || STYLE_TABS[0];

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* ── Hero ────────────────────────────────────────────── */}
      <PageHero
        section="reports"
        title="Template Marketplace"
        subtitle="Professional report templates for contractors, trades pros, and service companies"
        icon={<LayoutTemplate className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/reports/history"
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
            >
              Report History
            </a>
            <a
              href="/reports/templates"
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
            >
              My Templates
            </a>
          </div>
        }
      />

      {/* ── Quick Pick Banner ───────────────────────────────── */}
      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-5 shadow-sm dark:border-amber-800/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                Quick Pick — Who is this report for?
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Choose your audience and we'll show you the right templates
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "Insurance" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("Insurance")}
              className="gap-1.5"
            >
              <Shield className="h-4 w-4" /> The Carrier
            </Button>
            <Button
              variant={activeTab === "Retail" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("Retail")}
              className="gap-1.5"
            >
              <Users className="h-4 w-4" /> The Homeowner
            </Button>
            <Button
              variant={activeTab === "Sales Material" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("Sales Material")}
              className="gap-1.5"
            >
              <Briefcase className="h-4 w-4" /> A Sales Prospect
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STYLE_TABS.slice(1).map((tab) => {
          const count = styleCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(activeTab === tab.key ? "all" : tab.key)}
              className={`group relative overflow-hidden rounded-2xl border p-6 text-left shadow-lg transition-all hover:shadow-xl ${tab.borderColor} bg-gradient-to-br ${tab.gradient} ${activeTab === tab.key ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950" : ""}`}
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-current opacity-5 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div
                  className={`bg-current/10 flex h-14 w-14 items-center justify-center rounded-xl ${tab.textColor}`}
                >
                  <span className="text-2xl">{tab.emoji}</span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{count}</p>
                  <p className={`text-sm font-medium ${tab.textColor}`}>{tab.label}</p>
                </div>
              </div>
              {activeTab === tab.key && (
                <div className="absolute right-3 top-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search + Style Tabs ──────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search all templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STYLE_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              onClick={() => setActiveTab(tab.key)}
              size="sm"
              className="gap-1.5"
            >
              {tab.icon}
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">
                {styleCounts[tab.key]}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* ── Active Tab Description ───────────────────────────── */}
      {activeTab !== "all" && (
        <div
          className={`rounded-xl border ${activeTabConfig.borderColor} bg-gradient-to-r ${activeTabConfig.gradient} p-5`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeTabConfig.emoji}</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeTabConfig.label}
              </h2>
              <p className="text-sm text-muted-foreground">{activeTabConfig.description}</p>
            </div>
            <Badge className={`ml-auto ${activeTabConfig.badgeColor}`}>
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      )}

      {/* ── Template Grid ────────────────────────────────────── */}
      {filteredTemplates.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/50">
          <Package className="h-16 w-16 text-slate-400" />
          <p className="text-lg text-slate-600 dark:text-slate-400">No templates found</p>
          <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          {activeTab !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setActiveTab("all")}>
              Show all templates
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isAdded={addedTemplateIds.has(template.slug || template.id)}
              onAdded={handleTemplateAdded}
            />
          ))}
        </div>
      )}

      {/* ── Total Count ──────────────────────────────────────── */}
      <div className="py-4 text-center text-sm text-muted-foreground">
        {templates.length} professional templates • 3 report styles • Built for contractors
      </div>
    </div>
  );
}

// ─── Template Card ───────────────────────────────────────────
function TemplateCard({
  template,
  isAdded,
  onAdded,
}: {
  template: Template;
  isAdded?: boolean;
  onAdded?: (templateId: string, templateSlug?: string) => void;
}) {
  const primaryThumbnail = `/api/templates/${template.id}/thumbnail`;
  const style = template.styleCategory || getStyleCategoryFromLegacy(template.category);
  const tabConfig = STYLE_TABS.find((t) => t.key === style);

  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-slate-900/50">
      {/* Thumbnail with style overlay */}
      <div className="relative">
        <img
          src={primaryThumbnail}
          alt={template.title}
          width={1200}
          height={630}
          className="h-44 w-full object-cover transition-transform group-hover:scale-[1.02]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "/template-thumbs/general-contractor-estimate.svg";
          }}
        />
        {/* Style badge overlay */}
        <div className="absolute left-3 top-3">
          <Badge className={`shadow-sm ${tabConfig?.badgeColor || "bg-slate-100 text-slate-700"}`}>
            {tabConfig?.emoji} {style}
          </Badge>
        </div>
        {isAdded && (
          <div className="absolute right-3 top-3">
            <Badge className="bg-green-100 text-green-800 shadow-sm dark:bg-green-900/40 dark:text-green-300">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Added
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">{template.title}</h3>
          {template.version && (
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              v{template.version}
            </span>
          )}
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
          {template.description || "No description available"}
        </p>

        {/* Audience + Best For */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {template.audience && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {getAudienceIcon(template.audience)} {getAudienceLabel(template.audience)}
            </span>
          )}
          {template.bestFor && (
            <span className="text-xs text-slate-500 dark:text-slate-500">
              Best for: {template.bestFor}
            </span>
          )}
        </div>

        {/* Subcategory badge */}
        {template.category && (
          <div className="mb-4">
            <Badge variant="outline" className="text-[10px]">
              {template.category}
            </Badge>
          </div>
        )}

        {/* Actions — pushed to bottom */}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <UseTemplateButton
            templateId={template.id}
            templateTitle={template.title}
            templateSlug={template.slug || undefined}
          />
          <AddToTemplatesButton
            templateId={template.id}
            templateTitle={template.title}
            templateSlug={template.slug || undefined}
            initiallyAdded={isAdded}
            onAdded={onAdded}
          />
          <a
            href={`/reports/templates/${template.slug || template.id}/preview`}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Preview
          </a>
        </div>
      </div>
    </Card>
  );
}

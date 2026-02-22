/**
 * Template Marketplace Browse Page (PUBLIC)
 * CLIENT COMPONENT - Fetches from API to use registry fallback
 * Does NOT require authentication
 *
 * ORGANIZED BY CATEGORY like Vendor Network
 */

"use client";

import {
  Building2,
  ClipboardCheck,
  CloudRain,
  DollarSign,
  Droplets,
  FileText,
  Flame,
  HardHat,
  Home,
  LayoutTemplate,
  Package,
  Search,
  Shield,
  Wrench,
} from "lucide-react";
// NOTE: We intentionally use a plain <img> here because many marketplace thumbnails are SVG
// served via the thumbnail proxy, and Next/Image blocks SVG by default.
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { AddToTemplatesButton } from "./_components/AddToTemplatesButton";
import { UseTemplateButton } from "./_components/UseTemplateButton";

interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
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

// Category configuration with icons and descriptions (like Vendor Network)
const categoryConfig: Array<{
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    key: "Roofing",
    label: "🏠 Roofing Reports",
    icon: <Home className="h-5 w-5" />,
    description: "Wind, hail, and general roof damage assessments",
  },
  {
    key: "Storm",
    label: "⛈️ Storm Damage",
    icon: <CloudRain className="h-5 w-5" />,
    description: "Storm-related property damage documentation",
  },
  {
    key: "Weather",
    label: "🌪️ Weather Events",
    icon: <CloudRain className="h-5 w-5" />,
    description: "Weather verification and impact reports",
  },
  {
    key: "Insurance",
    label: "🛡️ Insurance Claims",
    icon: <Shield className="h-5 w-5" />,
    description: "Professional insurance claim documentation",
  },
  {
    key: "Water",
    label: "💧 Water Damage",
    icon: <Droplets className="h-5 w-5" />,
    description: "Water intrusion and moisture reports",
  },
  {
    key: "Water Damage",
    label: "💧 Water Restoration",
    icon: <Droplets className="h-5 w-5" />,
    description: "Water damage restoration documentation",
  },
  {
    key: "Fire",
    label: "🔥 Fire Damage",
    icon: <Flame className="h-5 w-5" />,
    description: "Fire and smoke damage assessments",
  },
  {
    key: "Supplements",
    label: "📋 Supplements",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "Supplement and scope change documentation",
  },
  {
    key: "Inspections",
    label: "🔍 Inspections",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "Property inspection and condition reports",
  },
  {
    key: "Assessments",
    label: "📊 Assessments",
    icon: <FileText className="h-5 w-5" />,
    description: "Comprehensive property assessments",
  },
  {
    key: "Estimates",
    label: "💰 Estimates",
    icon: <DollarSign className="h-5 w-5" />,
    description: "Repair estimates and cost breakdowns",
  },
  {
    key: "Proposals",
    label: "📄 Proposals",
    icon: <FileText className="h-5 w-5" />,
    description: "Professional repair proposals",
  },
  {
    key: "Commercial",
    label: "🏢 Commercial",
    icon: <Building2 className="h-5 w-5" />,
    description: "Commercial property documentation",
  },
  {
    key: "General Construction",
    label: "🔨 General Construction",
    icon: <Wrench className="h-5 w-5" />,
    description: "General contractor reports",
  },
  {
    key: "Restoration",
    label: "🔧 Restoration",
    icon: <HardHat className="h-5 w-5" />,
    description: "Restoration project documentation",
  },
  {
    key: "Interior",
    label: "🏠 Interior",
    icon: <Home className="h-5 w-5" />,
    description: "Interior damage and repair reports",
  },
];

function getUniformThumbKey(category: string | null) {
  const normalized = (category || "").toLowerCase().trim();
  switch (normalized) {
    case "roofing":
    case "wind & hail":
      return "/template-thumbs/wind-hail-roofing.svg";
    case "restoration":
    case "water":
    case "water damage":
      return "/template-thumbs/water-damage-restoration.svg";
    case "retail & quotes":
    case "retail":
    case "estimates":
      return "/template-thumbs/general-contractor-estimate.svg";
    case "supplements":
      return "/template-thumbs/supplements-line-item.svg";
    case "legal & appraisal":
    case "legal":
    case "insurance":
      return "/template-thumbs/legal-appraisal.svg";
    case "specialty reports":
    case "specialty":
    case "storm":
    case "weather":
      return "/template-thumbs/specialty-reports.svg";
    default:
      return "/template-thumbs/general-contractor-estimate.svg";
  }
}

const INITIAL_SHOW = 6;

/** Show-more grid: renders first 6 templates, then expand on click */
function CategoryGrid({
  templates,
  addedTemplateIds,
  onAdded,
}: {
  templates: Template[];
  addedTemplateIds: Set<string>;
  onAdded: (slug: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? templates : templates.slice(0, INITIAL_SHOW);
  const hasMore = templates.length > INITIAL_SHOW;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isAdded={addedTemplateIds.has(template.slug || template.id)}
            onAdded={onAdded}
          />
        ))}
      </div>
      {hasMore && !showAll && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => setShowAll(true)} className="px-6">
            Show all {templates.length} templates
          </Button>
        </div>
      )}
    </>
  );
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [addedTemplateIds, setAddedTemplateIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Callback to update addedTemplateIds when a template is added
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
        // Fetch marketplace templates and user templates in parallel
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

        // Process user's added templates for "Added" state
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
            // User might not be logged in, that's fine
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

  // Filter templates by search query
  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group templates by category
  const templatesByCategory = filteredTemplates.reduce(
    (acc, template) => {
      const category = template.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, Template[]>
  );

  // Get unique categories from templates
  const categories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean))
  ) as string[];

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <PageHero
          section="reports"
          title="Template Marketplace"
          subtitle="Browse and add professional report templates to your workspace"
          icon={<LayoutTemplate className="h-6 w-6" />}
        />
        {/* Skeleton stats row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-slate-50 p-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-8 w-12 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton template grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="h-40 bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-1/2 rounded bg-slate-100" />
                <div className="flex gap-2 pt-2">
                  <div className="h-8 w-24 rounded bg-slate-200" />
                  <div className="h-8 w-20 rounded bg-slate-200" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <PageHero
          section="reports"
          title="Template Marketplace"
          subtitle="Browse and add professional report templates to your workspace"
          icon={<LayoutTemplate className="h-6 w-6" />}
        />
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50">
          <Package className="h-16 w-16 text-red-400" />
          <p className="text-lg text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Raven UI Header */}
      <PageHero
        section="reports"
        title="Template Marketplace"
        subtitle="Browse and add professional report templates to your workspace"
        icon={<LayoutTemplate className="h-6 w-6" />}
        actions={
          <a
            href="/reports/templates"
            className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
          >
            My Templates
          </a>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            size="sm"
          >
            All ({templates.length})
          </Button>
          {categories.slice(0, 6).map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              size="sm"
            >
              {category}
            </Button>
          ))}
          {categories.length > 6 && (
            <Button variant="outline" size="sm" disabled>
              +{categories.length - 6} more
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Gradient Style */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-lg transition-all hover:shadow-xl dark:from-blue-950/50 dark:to-blue-900/30">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {templates.length}
              </p>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Templates Available
              </p>
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-lg transition-all hover:shadow-xl dark:from-emerald-950/50 dark:to-emerald-900/30">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                {categories.length}
              </p>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Categories
              </p>
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 shadow-lg transition-all hover:shadow-xl dark:from-purple-950/50 dark:to-purple-900/30">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <ClipboardCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">Free</p>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                All Templates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Display */}
      {filteredTemplates.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-slate-300 bg-white">
          <Package className="h-16 w-16 text-slate-400" />
          <p className="text-lg text-slate-600">No templates found</p>
          <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
        </div>
      ) : selectedCategory ? (
        // Show filtered category view (flat grid)
        <div>
          <div className="mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold">
              {categoryConfig.find((c) => c.key === selectedCategory)?.label || selectedCategory}
            </h2>
            <p className="text-sm text-muted-foreground">
              {categoryConfig.find((c) => c.key === selectedCategory)?.description ||
                `${selectedCategory} templates`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {templatesByCategory[selectedCategory]?.length || 0} templates
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(templatesByCategory[selectedCategory] || []).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isAdded={addedTemplateIds.has(template.slug || template.id)}
                onAdded={handleTemplateAdded}
              />
            ))}
          </div>
        </div>
      ) : (
        // Show organized category sections (like Vendor Network)
        <div className="space-y-12">
          {categoryConfig.map((category) => {
            const categoryTemplates = templatesByCategory[category.key];
            if (!categoryTemplates || categoryTemplates.length === 0) return null;

            return (
              <section
                key={category.key}
                className="scroll-mt-20"
                id={category.key.toLowerCase().replace(/\s+/g, "-")}
              >
                {/* Category Header Card */}
                <div className="mb-6 rounded-xl border border-slate-200/50 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm dark:border-slate-800/50 dark:from-slate-900/50 dark:to-slate-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {category.label}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      {category.icon}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                      {categoryTemplates.length} template{categoryTemplates.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Templates Grid — show 6 initially, expand on click */}
                <CategoryGrid
                  templates={categoryTemplates}
                  addedTemplateIds={addedTemplateIds}
                  onAdded={handleTemplateAdded}
                />
              </section>
            );
          })}

          {/* Handle any templates in categories not in categoryConfig */}
          {Object.keys(templatesByCategory)
            .filter((cat) => !categoryConfig.find((c) => c.key === cat))
            .map((category) => {
              const categoryTemplates = templatesByCategory[category];
              if (!categoryTemplates || categoryTemplates.length === 0) return null;

              return (
                <section
                  key={category}
                  className="scroll-mt-20"
                  id={category.toLowerCase().replace(/\s+/g, "-")}
                >
                  {/* Category Header Card for unconfigured categories */}
                  <div className="mb-6 rounded-xl border border-slate-200/50 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm dark:border-slate-800/50 dark:from-slate-900/50 dark:to-slate-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                          📄 {category}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">{category} templates</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                        {categoryTemplates.length} template
                        {categoryTemplates.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isAdded={addedTemplateIds.has(template.slug || template.id)}
                        onAdded={handleTemplateAdded}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}

// Extracted Template Card Component (like VendorCard)
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

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <img
        src={primaryThumbnail}
        alt={template.title}
        width={1200}
        height={630}
        className="h-48 w-full object-cover"
        onError={(e) => {
          const fallback = getUniformThumbKey(template.category);
          (e.currentTarget as HTMLImageElement).src = fallback;
        }}
      />

      {/* Content */}
      <div className="p-6">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">{template.title}</h3>
          {template.version && (
            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {template.version}
            </span>
          )}
        </div>

        <p className="mb-4 line-clamp-3 text-sm text-slate-600">
          {template.description || "No description available"}
        </p>

        {/* Metadata */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {template.category && (
            <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
              {template.category}
            </span>
          )}
          <span className="text-xs text-slate-500">
            {(typeof template.placeholderCount === "number"
              ? template.placeholderCount
              : Array.isArray(template.placeholders)
                ? template.placeholders.length
                : 0) + " placeholders"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
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
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Preview
          </a>
        </div>
      </div>
    </Card>
  );
}

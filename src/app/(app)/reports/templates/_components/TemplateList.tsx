"use client";

import { Grid3x3, List, Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";
import { TemplateCard } from "./TemplateCard";
import { TemplatePreviewCard } from "./TemplatePreviewCard";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

// Generic template interface that works with orgTemplate data
interface OrgTemplateData {
  id: string;
  templateId?: string;
  orgId?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  slug?: string | null;
  thumbnailUrl?: string | null;
  previewPdfUrl?: string | null;
  version?: string | null;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateListProps {
  initialTemplates: OrgTemplateData[];
  orgId: string;
}

export function TemplateList({ initialTemplates, orgId }: TemplateListProps) {
  const [templates, setTemplates] = useState<OrgTemplateData[]>(initialTemplates);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "gallery">("gallery");
  const [previewTemplate, setPreviewTemplate] = useState<OrgTemplateData | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/report-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : data.templates || []);
      }
    } catch (error) {
      logger.error("Failed to refresh templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}/set-default`, {
        method: "POST",
      });

      if (res.ok) {
        await handleRefresh();
      }
    } catch (error) {
      logger.error("Failed to set default:", error);
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}/duplicate`, {
        method: "POST",
      });

      if (res.ok) {
        await handleRefresh();
      }
    } catch (error) {
      logger.error("Failed to duplicate:", error);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to remove this template from your library?")) return;

    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await handleRefresh();
      }
    } catch (error) {
      logger.error("Failed to delete:", error);
    }
  };

  const router = useRouter();
  const handleEdit = (templateId: string) => {
    router.push(`/reports/templates/${templateId}/edit`);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[color:var(--muted)]">
            Your saved report templates. Select any template to preview or use it in AI-generated
            reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-slate-300 bg-white">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-l-lg px-3 py-2 text-sm transition ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("gallery")}
              className={`rounded-r-lg px-3 py-2 text-sm transition ${
                viewMode === "gallery"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              aria-label="Gallery view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
          </div>

          <Link href="/reports/templates/marketplace">
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] py-12 text-center">
          <div className="mb-4">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[color:var(--text)]">
            No templates saved yet
          </h3>
          <p className="mb-6 text-[color:var(--muted)]">
            Browse our template marketplace to find and save professional report templates
          </p>
          <div className="flex justify-center">
            <Link href="/reports/templates/marketplace">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      ) : viewMode === "gallery" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {templates.map((template) => (
            <TemplatePreviewCard
              key={template.id}
              template={template}
              onClick={() => setPreviewTemplate(template)}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSetDefault={handleSetDefault}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}

"use client";

import { Copy, Edit, Eye, FileText, MoreVertical, Sparkles, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { TemplatePreviewModal } from "./TemplatePreviewModal";

// Works with OrgTemplate data shape from the templates page
interface OrgTemplateData {
  id: string;
  templateId?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  version?: string | null;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateCardProps {
  template: OrgTemplateData;
  onSetDefault: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Category-aware thumbnail fallback — matches category to a real SVG */
function getCategoryFallback(category?: string | null): string {
  const map: Record<string, string> = {
    roofing: "/template-thumbs/roof-inspection-report.svg",
    restoration: "/template-thumbs/restoration-scope.svg",
    supplements: "/template-thumbs/supplement-package.svg",
    "retail & quotes": "/template-thumbs/general-contractor-estimate.svg",
    "legal & appraisal": "/template-thumbs/rebuttal-letter.svg",
    specialty: "/template-thumbs/weather-verification.svg",
  };
  const key = (category || "").toLowerCase();
  return map[key] || "/template-thumbs/general-contractor-estimate.svg";
}

export function TemplateCard({ template, onSetDefault, onDuplicate, onDelete }: TemplateCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const thumbnailUrl = template.thumbnailUrl || `/api/templates/${template.templateId}/thumbnail`;
  const isContractorEstimate = template.name?.toLowerCase().includes("contractor estimate");

  return (
    <>
      <div className="group overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] transition hover:bg-[color:var(--surface-3)] hover:shadow-lg">
        {/* Thumbnail */}
        <div className="relative h-32 bg-slate-100">
          <img
            src={thumbnailUrl}
            alt={template.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getCategoryFallback(template.category);
            }}
          />

          {/* Featured Badge */}
          {isContractorEstimate && (
            <div className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-lg">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Featured
            </div>
          )}

          {/* Category Badge */}
          {template.category && (
            <div className="absolute right-2 top-2 rounded-full bg-blue-600/90 px-2 py-1 text-xs font-medium text-white">
              {template.category}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              {template.isDefault && <Badge className="bg-blue-600 text-white">Default</Badge>}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/reports/templates/${template.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Template
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                {!template.isDefault && (
                  <DropdownMenuItem onClick={() => onSetDefault(template.id)}>
                    <Star className="mr-2 h-4 w-4" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(template.id)}
                  className="text-red-500 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove from Library
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Clickable Content */}
          <div
            onClick={() => setShowPreview(true)}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setShowPreview(true);
              }
            }}
          >
            <h3 className="mb-2 font-semibold text-[color:var(--text)] group-hover:text-blue-600">
              {template.name}
            </h3>

            {template.description && (
              <p className="mb-3 line-clamp-2 text-sm text-[color:var(--muted)]">
                {template.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                PDF Template
              </span>
              {template.version && <span>v{template.version}</span>}
            </div>
          </div>

          {/* Preview Button */}
          <Button onClick={() => setShowPreview(true)} className="mt-3 w-full" variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      {showPreview && (
        <TemplatePreviewModal template={template} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}

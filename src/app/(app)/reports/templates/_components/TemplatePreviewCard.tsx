"use client";

import { Copy, Edit, Eye, FileText, MoreVertical, Sparkles, Star, Trash2 } from "lucide-react";
import { useState } from "react";

// Works with OrgTemplate data shape from the templates page
interface OrgTemplateData {
  id: string;
  templateId?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  version?: string | null;
}

interface TemplatePreviewCardProps {
  template: OrgTemplateData;
  onClick: () => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TemplatePreviewCard({
  template,
  onClick,
  onEdit,
  onDuplicate,
  onSetDefault,
  onDelete,
}: TemplatePreviewCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const thumbnailUrl = template.thumbnailUrl || `/api/templates/${template.templateId}/thumbnail`;
  const isContractorEstimate = template.name?.toLowerCase().includes("contractor estimate");
  const templateId = template.templateId || template.id;

  return (
    <div className="group relative w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-white text-left shadow-sm transition hover:border-blue-400 hover:shadow-xl">
      {/* Actions dropdown */}
      <div className="absolute right-2 top-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="rounded-full bg-white/90 p-1.5 shadow-md transition hover:bg-white"
        >
          <MoreVertical className="h-4 w-4 text-slate-600" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 w-44 rounded-lg border bg-white py-1 shadow-xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(templateId);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Edit className="h-3.5 w-3.5" /> Edit Template
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(templateId);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
            )}
            {onSetDefault && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault(templateId);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Star className="h-3.5 w-3.5" /> Set as Default
              </button>
            )}
            {onDelete && (
              <>
                <div className="my-1 border-t" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(templateId);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {/* Thumbnail Preview */}
      <div className="relative h-48 cursor-pointer bg-slate-100" onClick={onClick}>
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={template.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/template-thumbs/general-contractor-estimate.svg";
          }}
        />

        {/* Featured Badge for Contractor Estimate */}
        {isContractorEstimate && (
          <div className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-lg">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Featured
          </div>
        )}

        {/* Category Badge */}
        {template.category && (
          <div className="absolute right-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-lg">
            {template.category}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="mb-1 font-semibold text-slate-900 group-hover:text-blue-600">
          {template.name}
        </h3>
        {template.description && (
          <p className="mb-2 line-clamp-2 text-xs text-slate-600">{template.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            PDF Template
          </span>
          {template.version && <span>v{template.version}</span>}
        </div>
      </div>

      {/* Hover Overlay */}
      <div
        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-blue-600/90 opacity-0 transition group-hover:opacity-100"
        onClick={onClick}
      >
        <div className="text-center text-white">
          <Eye className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm font-semibold">Click to Preview</p>
        </div>
      </div>
    </div>
  );
}

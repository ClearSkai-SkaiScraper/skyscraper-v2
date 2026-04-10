"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

/**
 * Template Preview Modal - Shows template with company branding applied
 * REAL IMPLEMENTATION - Fetches merged template from API
 */

import { ExternalLink, FileText, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

// Works with OrgTemplate data shape from the templates page
interface OrgTemplateData {
  id: string;
  templateId?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  slug?: string | null;
  thumbnailUrl?: string | null;
  previewPdfUrl?: string | null;
  version?: string | null;
}

interface TemplatePreviewModalProps {
  template: OrgTemplateData;
  onClose: () => void;
}

interface TemplateLayout {
  header: {
    showLogo?: boolean;
    showCompanyName?: boolean;
    title?: string;
    logoUrl?: string;
    companyName?: string;
  };
  sections: Array<{
    type: string;
    enabled: boolean;
    order: number;
  }>;
  footer: {
    showFooterText?: boolean;
    showContactInfo?: boolean;
    contactInfo?: {
      phone?: string;
      email?: string;
      website?: string;
    };
  };
  styles: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
}

interface TemplateData {
  id: string;
  name: string;
  description?: string;
  layout: TemplateLayout;
}

export function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);

  // Use templateId if available (OrgTemplate), otherwise use id directly
  const templateId = template.templateId || template.id;

  // Build preview URL - prefer previewPdfUrl if available
  const previewUrl = template.previewPdfUrl || null;

  useEffect(() => {
    // Always try to fetch template data for fallback rendering
    void fetchTemplatePreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const fetchTemplatePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/templates/${templateId}/preview`);

      if (!res.ok) {
        throw new Error("Failed to load template");
      }

      const data = await res.json();

      if (data.success) {
        setTemplateData(data.template);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      logger.error("Failed to fetch template:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="rounded-2xl bg-white p-12 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg text-slate-600">Loading template preview...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show template sections preview if we have templateData (fallback or primary view)
  const { layout } = templateData || ({} as TemplateData);
  // Handle both formats: layout can be the sections array directly, or an object with sections property
  const sections = Array.isArray(layout) ? layout : layout?.sections || [];
  const styles = (Array.isArray(layout) ? {} : layout?.styles) || {};
  const header = Array.isArray(layout) ? null : layout?.header;
  const footer = Array.isArray(layout) ? null : layout?.footer;

  // If no templateData and no previewUrl, show error
  if (!templateData && !previewUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-4 text-center">
            <h3 className="mb-2 text-xl font-semibold text-red-900">Preview Unavailable</h3>
            <p className="text-sm text-red-700">{error || "Could not load template preview"}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchTemplatePreview} className="flex-1">
              Try Again
            </Button>
            <Link href={`/reports/templates/${templateId}`} className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View Full Page
              </Button>
            </Link>
            <Button onClick={onClose} variant="ghost" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative h-[90vh] w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Template Preview</h2>
            <p className="text-sm text-slate-600">
              {(templateData?.name || template.name) + " • With your company branding"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/reports/templates/${templateId}/preview`}>
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Full Page
              </Button>
            </Link>
            <Button onClick={onClose} variant="ghost" size="sm" aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="h-[calc(90vh-73px)] overflow-y-auto bg-slate-100 p-8">
          {previewUrl && !pdfLoadError ? (
            <div className="mx-auto max-w-4xl rounded-lg border border-slate-300 bg-white shadow-xl">
              <object
                data={previewUrl}
                type="application/pdf"
                className="h-[70vh] w-full"
                onError={() => setPdfLoadError(true)}
              >
                <iframe
                  src={`${previewUrl}#view=FitH`}
                  className="h-[70vh] w-full"
                  title="Template Quick Preview"
                  onError={() => setPdfLoadError(true)}
                />
              </object>
            </div>
          ) : templateData && sections.length > 0 ? (
            <div className="template-preview-modal-paper mx-auto max-w-3xl rounded-lg border border-slate-300 bg-white shadow-xl">
              {/* Header */}
              {header && (
                <div className="template-preview-modal-header border-b p-8">
                  <div className="flex items-center justify-between">
                    {header.showLogo && styles.logoUrl && (
                      <img
                        src={styles.logoUrl}
                        alt="Company Logo"
                        className="h-16 object-contain"
                      />
                    )}
                    <div className="flex-1 text-right">
                      {header.showCompanyName && header.companyName && (
                        <h1 className="template-preview-modal-section-title text-2xl font-bold">
                          {header.companyName}
                        </h1>
                      )}
                      {header.title && (
                        <p className="mt-1 text-lg font-semibold text-slate-700">{header.title}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sections */}
              <div className="space-y-6 p-8">
                {sections
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .filter((s: any) => s.enabled !== false)
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((section: any, index: number) => (
                    <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                      <h3 className="template-preview-modal-section-title mb-4 text-lg font-semibold">
                        {getSectionTitle(section.type)}
                      </h3>
                      <div className="space-y-2 text-sm text-slate-600">
                        <p>{getSectionDescription(section.type)}</p>
                        <div className="mt-4 rounded border-2 border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400">
                          Content will be generated when report is created
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Footer */}
              {footer && (
                <div className="template-preview-modal-footer border-t p-6 text-sm text-slate-600">
                  {footer.showContactInfo && footer.contactInfo && (
                    <div className="flex justify-center gap-6">
                      {footer.contactInfo.phone && <span>📞 {footer.contactInfo.phone}</span>}
                      {footer.contactInfo.email && <span>📧 {footer.contactInfo.email}</span>}
                      {footer.contactInfo.website && <span>🌐 {footer.contactInfo.website}</span>}
                    </div>
                  )}
                  {footer.showFooterText && (
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Generated by SkaiScraper AI Platform
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Fallback display when no sections available
            <div className="mx-auto max-w-3xl rounded-lg border border-slate-300 bg-white p-12 text-center shadow-xl">
              <FileText className="mx-auto mb-4 h-16 w-16 text-slate-400" />
              <h3 className="mb-2 text-xl font-semibold text-slate-900">{template.name}</h3>
              <p className="mb-6 text-slate-600">
                {template.description || "Professional report template"}
              </p>
              <div className="flex justify-center gap-3">
                <Link href={`/reports/templates/${templateId}`}>
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="h-4 w-4" />
                    View Full Template
                  </Button>
                </Link>
                <Link href={`/reports/claims/new?templateId=${templateId}`}>
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Use Template
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSectionTitle(type: string): string {
  const titles: Record<string, string> = {
    header: "Company Header",
    client_info: "Client Information",
    property_details: "Property Details",
    scope_of_work: "Scope of Work",
    line_items: "Line Items & Pricing",
    totals: "Cost Summary",
    terms: "Terms & Conditions",
    signature: "Signature Block",
    claim_overview: "Claim Overview",
    property_info: "Property Information",
    damage_summary: "Damage Assessment",
    photo_grid: "Photo Documentation",
    recommendations: "Repair Recommendations",
  };
  return titles[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getSectionDescription(type: string): string {
  const descriptions: Record<string, string> = {
    header: "Your company logo, name, and contact information",
    client_info: "Homeowner name, address, phone, and email",
    property_details: "Property address, type, year built, roofing details",
    scope_of_work: "Detailed description of work to be performed",
    line_items: "Itemized list of materials, labor, and costs",
    totals: "Subtotals, taxes, discounts, and grand total",
    terms: "Payment terms, warranties, and conditions",
    signature: "Customer and contractor signature lines with dates",
    claim_overview: "Claim number, loss date, carrier, policy information",
    property_info: "Property address, owner details, structure type",
    damage_summary: "Detailed damage assessment and severity",
    photo_grid: "Evidence photos with captions and annotations",
    recommendations: "Scope of work, cost estimates, timeline",
  };
  return descriptions[type] || "Section content";
}

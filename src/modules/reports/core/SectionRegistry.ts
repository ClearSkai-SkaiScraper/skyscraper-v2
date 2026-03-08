// ============================================================================
// SECTION REGISTRY - Universal Contractor Packet
// ============================================================================
// Central registry of all available sections for contractor packets.
// Each section defines its metadata, required data, and render function.
//
// PRODUCTION STATUS (v1.3): ACTIVELY USED
// Used by: Builder.tsx, DragBuilder.tsx, RightPanel.tsx, ExportOrchestrator.ts
// Placeholder render functions are intentional fallbacks until Phase 4
// ============================================================================

import type { ReportContext, Section, SectionKey } from "../types";

// Placeholder render functions (will be implemented in /sections/*.ts)
const placeholderRender = (sectionName: string) => async (_ctx: ReportContext) => {
  console.log(`[Section Renderer] ${sectionName} - placeholder`);
};

export const SECTION_REGISTRY: Record<SectionKey, Section> = {
  cover: {
    key: "cover",
    title: "Cover Page",
    icon: "BookOpen",
    enabled: true,
    order: 0,
    requiredDataKeys: ["branding", "metadata"],
    renderFn: placeholderRender("Cover Page"),
  },
  toc: {
    key: "toc",
    title: "Table of Contents",
    icon: "List",
    enabled: true,
    order: 1,
    requiredDataKeys: [],
    renderFn: placeholderRender("Table of Contents"),
  },
  "executive-summary": {
    key: "executive-summary",
    title: "Executive Summary",
    icon: "FileText",
    enabled: true,
    order: 2,
    requiredDataKeys: ["metadata", "executiveSummary"],
    renderFn: placeholderRender("Executive Summary"),
  },
  // weather-verification: Re-added for Claims-Ready Folder compatibility
  "weather-verification": {
    key: "weather-verification",
    title: "Weather Verification",
    icon: "Cloud",
    enabled: true,
    order: 11,
    requiredDataKeys: ["weather"],
    renderFn: placeholderRender("Weather Verification"),
  },
  "adjuster-notes": {
    key: "adjuster-notes",
    title: "Contractor Notes",
    icon: "ClipboardList",
    enabled: true,
    order: 10,
    requiredDataKeys: ["adjusterNotes"],
    renderFn: placeholderRender("Contractor Notes"),
  },
  "photo-evidence": {
    key: "photo-evidence",
    title: "Photo Evidence",
    icon: "Camera",
    enabled: true,
    order: 5,
    requiredDataKeys: ["photos"],
    renderFn: placeholderRender("Photo Evidence"),
  },
  "test-cuts": {
    key: "test-cuts",
    title: "Test Cuts & Invasive Testing",
    icon: "Scissors",
    enabled: true,
    order: 6,
    requiredDataKeys: ["testCutsData"],
    renderFn: placeholderRender("Test Cuts"),
  },
  "scope-matrix": {
    key: "scope-matrix",
    title: "Scope & Line-Item Matrix",
    icon: "Table",
    enabled: true,
    order: 7,
    requiredDataKeys: ["lineItems"],
    renderFn: placeholderRender("Scope Matrix"),
  },
  "code-compliance": {
    key: "code-compliance",
    title: "Code Compliance & Manufacturer Requirements",
    icon: "Scale",
    enabled: true,
    order: 8,
    requiredDataKeys: ["codes"],
    renderFn: placeholderRender("Code Compliance"),
  },
  "pricing-comparison": {
    key: "pricing-comparison",
    title: "Comparative Pricing / Market Data",
    icon: "DollarSign",
    enabled: true,
    order: 9,
    requiredDataKeys: ["pricingComparison"],
    renderFn: placeholderRender("Pricing Comparison"),
  },
  supplements: {
    key: "supplements",
    title: "Supplements & Change Orders",
    icon: "FilePlus",
    enabled: true,
    order: 10,
    requiredDataKeys: ["supplements"],
    renderFn: placeholderRender("Supplements"),
  },
  "signature-page": {
    key: "signature-page",
    title: "Signature Page + Disclaimers",
    icon: "PenTool",
    enabled: true,
    order: 11,
    requiredDataKeys: ["metadata"],
    renderFn: placeholderRender("Signature Page"),
  },
  "attachments-index": {
    key: "attachments-index",
    title: "Attachments Index",
    icon: "Paperclip",
    enabled: false,
    order: 12,
    requiredDataKeys: ["attachments"],
    renderFn: placeholderRender("Attachments Index"),
  },

  // ===== RETAIL SECTIONS (primary — shown first) =====
  "retail-proposal": {
    key: "retail-proposal",
    title: "Retail Proposal & Quote",
    icon: "DollarSign",
    enabled: true,
    order: 3,
    requiredDataKeys: ["metadata", "lineItems"],
    renderFn: placeholderRender("Retail Proposal"),
  },
  "customer-details": {
    key: "customer-details",
    title: "Customer Information",
    icon: "ClipboardList",
    enabled: true,
    order: 4,
    requiredDataKeys: ["metadata"],
    renderFn: placeholderRender("Customer Details"),
  },
  "material-selections": {
    key: "material-selections",
    title: "Material Selections & Specs",
    icon: "Table",
    enabled: true,
    order: 5,
    requiredDataKeys: [],
    renderFn: placeholderRender("Material Selections"),
  },
  "payment-schedule": {
    key: "payment-schedule",
    title: "Payment Schedule & Terms",
    icon: "DollarSign",
    enabled: true,
    order: 6,
    requiredDataKeys: ["metadata"],
    renderFn: placeholderRender("Payment Schedule"),
  },
  "warranty-terms": {
    key: "warranty-terms",
    title: "Warranty & Guarantee Terms",
    icon: "Scale",
    enabled: true,
    order: 7,
    requiredDataKeys: [],
    renderFn: placeholderRender("Warranty Terms"),
  },
};

/**
 * Get all enabled sections in order
 */
export function getEnabledSections(): Section[] {
  return Object.values(SECTION_REGISTRY)
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get sections by keys in specified order
 */
export function getSectionsByKeys(keys: SectionKey[]): Section[] {
  return keys
    .map((key) => SECTION_REGISTRY[key])
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

/**
 * Validate that all required data is present for given sections
 */
export function validateSectionData(
  sections: Section[],
  context: ReportContext
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  sections.forEach((section) => {
    section.requiredDataKeys.forEach((key) => {
      if (!(context as any)[key]) {
        missing.push(`${section.title} requires: ${key}`);
      }
    });
  });

  return { valid: missing.length === 0, missing };
}

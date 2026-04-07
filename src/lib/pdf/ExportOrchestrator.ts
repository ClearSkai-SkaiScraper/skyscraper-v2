import structure from "@/config/skai-structure.json";
import { renderLandscapePDFStub } from "@/lib/pdf/renderLandscapeStub";
import { AddonKey, AddonRegistry, normalizeAddons } from "@/lib/registry/AddonRegistry";
import { AIEngineRegistry } from "@/lib/registry/AIEngineRegistry";
import { composeSections, SectionKey } from "@/lib/registry/SectionRegistry";
import type { PDFBranding, PDFContext } from "@/types/pdf";

// Internal branding type matching resolveBranding's expected structure (snake_case)
type LegacyBranding = {
  company_name: string;
  brand_color: string;
  accent_color: string;
  logo_url?: string;
  footer?: string;
};

interface StructureConfig {
  reports: Record<string, { sections?: SectionKey[]; addons?: AddonKey[]; ai?: string[] }>;
  plans: Record<string, unknown>;
  branding: { fallback: LegacyBranding };
}

type BuildInput = {
  reportType: keyof (typeof structure)["reports"];
  plan?: keyof (typeof structure)["plans"];
  addons?: AddonKey[];
  ctx: PDFContext;
  orgBranding?: PDFBranding | null;
};

export type BuildResult = {
  sections: SectionKey[];
  ai: Record<string, unknown>;
  ctx: PDFContext;
};

// Convert PDFBranding to LegacyBranding for internal use
function convertToBranding(org: PDFBranding | null, fallback: LegacyBranding): LegacyBranding {
  if (!org) return fallback;
  return {
    company_name: org.companyName || fallback.company_name,
    brand_color: org.brandColor || fallback.brand_color,
    accent_color: org.accentColor || fallback.accent_color,
    logo_url: org.logoUrl || fallback.logo_url,
    footer: fallback.footer,
  };
}

export async function buildDocument(input: BuildInput): Promise<BuildResult> {
  const structureTyped = structure as unknown as StructureConfig;
  const cfg = structureTyped.reports[input.reportType];
  if (!cfg) throw new Error(`Unknown reportType: ${input.reportType}`);

  // resolve branding - convert PDFBranding to internal format
  const branding = convertToBranding(input.orgBranding || null, structureTyped.branding.fallback);
  const ctx0: PDFContext = { ...input.ctx, branding: branding as unknown as PDFBranding };

  // addons
  const addonKeys = normalizeAddons(input.addons || cfg.addons || []);
  let ctx: PDFContext = { ...ctx0 };
  for (const k of addonKeys) {
    const a = AddonRegistry[k as AddonKey] as
      | { apply: (ctx: PDFContext) => Promise<PDFContext> }
      | undefined;
    if (!a) continue;
    ctx = await a.apply(ctx);
  }

  // compose sections
  const baseSections = (cfg.sections as SectionKey[]) || [];
  const sections = composeSections(baseSections, ctx);

  // AI modules
  const aiResults: Record<string, unknown> = {};
  const aiKeys = (cfg.ai as string[]) || [];
  for (const k of aiKeys) {
    const mod = AIEngineRegistry[k as keyof typeof AIEngineRegistry];
    if (!mod) continue;
    const modTyped = mod as {
      trigger?: (ctx: PDFContext) => boolean;
      run: (ctx: PDFContext) => Promise<unknown>;
    };
    const should = !!modTyped.trigger?.(ctx);
    if (should) {
      aiResults[k] = await modTyped.run(ctx);
    }
  }

  return { sections, ai: aiResults, ctx };
}

// Delegates to a renderer (pdf-lib/react-pdf, etc.)
export async function exportPDF(build: BuildResult): Promise<Uint8Array> {
  return await renderLandscapePDFStub(build);
}

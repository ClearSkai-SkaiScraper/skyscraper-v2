/**
 * Template Merge Engine
 *
 * Injects company branding into base template layouts
 * Creates ready-to-render template with all placeholders filled
 */

import { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Merge template HTML with data
 * Replaces placeholders in the format {{path.to.value}} with actual data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeTemplate(templateHtml: string, data: Record<string, any>): string {
  if (!templateHtml) return "";

  // Replace {{placeholder}} patterns with data values
  let result = templateHtml.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();

    // Handle special syntax like {{#each photos}}...{{/each}}
    if (trimmedPath.startsWith("#") || trimmedPath.startsWith("/")) {
      return match; // Leave block helpers for later processing
    }

    // Navigate through nested object using dot notation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = trimmedPath.split(".").reduce((acc: any, key: string) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[key];
    }, data);

    // Return empty string for undefined/null, otherwise convert to string
    if (value === undefined || value === null) {
      return "";
    }

    // Handle arrays/objects - convert to JSON for debugging, but typically these would be handled by block helpers
    if (typeof value === "object") {
      return Array.isArray(value) ? `[${value.length} items]` : JSON.stringify(value);
    }

    return String(value);
  });

  // Process {{#each array}}...{{/each}} blocks
  result = processEachBlocks(result, data);

  // Process {{#if condition}}...{{/if}} blocks
  result = processIfBlocks(result, data);

  return result;
}

/**
 * Process {{#each array}}...{{/each}} blocks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processEachBlocks(html: string, data: Record<string, any>): string {
  const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return html.replace(eachRegex, (match, arrayPath, template) => {
    const trimmedPath = arrayPath.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const array = trimmedPath.split(".").reduce((acc: any, key: string) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[key];
    }, data);

    if (!Array.isArray(array)) {
      return ""; // No array found, return empty
    }

    // Render template for each item
    return array
      .map((item, index) => {
        // Create context with current item and index
        const itemData =
          typeof item === "object"
            ? { ...data, ...item, "@index": index }
            : { ...data, this: item, "@index": index };

        // Replace placeholders in the item template
        return template.replace(/\{\{([^#/}][^}]*)\}\}/g, (m: string, path: string) => {
          const trimmed = path.trim();

          // Handle "this" reference
          if (trimmed === "this" || trimmed === ".") {
            return typeof item === "object" ? JSON.stringify(item) : String(item);
          }

          // Handle @index
          if (trimmed === "@index") {
            return String(index);
          }

          // Navigate to value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const value = trimmed.split(".").reduce((acc: any, key: string) => {
            if (acc === null || acc === undefined) return undefined;
            return acc[key];
          }, itemData);

          return value === undefined || value === null ? "" : String(value);
        });
      })
      .join("");
  });
}

/**
 * Process {{#if condition}}...{{/if}} and {{#if condition}}...{{else}}...{{/if}} blocks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processIfBlocks(html: string, data: Record<string, any>): string {
  // Handle if-else blocks
  const ifElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
  html = html.replace(ifElseRegex, (match, condition, trueBlock, falseBlock) => {
    const value = evaluateCondition(condition.trim(), data);
    return value ? processIfBlocks(trueBlock, data) : processIfBlocks(falseBlock, data);
  });

  // Handle simple if blocks (without else)
  const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  html = html.replace(ifRegex, (match, condition, content) => {
    const value = evaluateCondition(condition.trim(), data);
    return value ? processIfBlocks(content, data) : "";
  });

  return html;
}

/**
 * Evaluate a condition path to a truthy/falsy value
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateCondition(conditionPath: string, data: Record<string, any>): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = conditionPath.split(".").reduce((acc: any, key: string) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, data);

  // Truthy check
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null) return Object.keys(value).length > 0;
  return Boolean(value);
}

interface TemplateLayout {
  header: {
    showLogo?: boolean;
    showCompanyName?: boolean;
    title?: string;
  };
  sections: Array<{
    type: string;
    enabled: boolean;
    order: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: Record<string, any>;
  }>;
  footer: {
    showFooterText?: boolean;
    showContactInfo?: boolean;
  };
  styles: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
}

interface CompanyBranding {
  companyName?: string;
  logoUrl?: string;
  colorPrimary?: string;
  colorAccent?: string;
  phone?: string;
  email?: string;
  website?: string;
}

/**
 * Merge base template with company branding
 */
export function mergeTemplateBranding(
  baseLayout: TemplateLayout,
  branding: CompanyBranding
): TemplateLayout {
  const merged = JSON.parse(JSON.stringify(baseLayout)); // Deep clone

  // Inject branding into styles
  if (merged.styles) {
    merged.styles.primaryColor = branding.colorPrimary || "#117CFF";
    merged.styles.accentColor = branding.colorAccent || "#FFC838";
    merged.styles.logoUrl = branding.logoUrl || "";
  }

  // Inject company name into header
  if (merged.header && merged.header.showCompanyName) {
    merged.header.companyName = branding.companyName || "Your Company";
  }

  // Inject logo
  if (merged.header && merged.header.showLogo) {
    merged.header.logoUrl = branding.logoUrl || "";
  }

  // Inject contact info into footer
  if (merged.footer && merged.footer.showContactInfo) {
    merged.footer.contactInfo = {
      phone: branding.phone,
      email: branding.email,
      website: branding.website,
    };
  }

  return merged;
}

/**
 * Get merged template for a company
 * Fetches base template + company branding and returns merged layout
 */
export async function getMergedTemplate(
  templateId: string,
  orgId: string
): Promise<TemplateLayout | null> {
  try {
    // Fetch template
    const template = await prisma.report_templates.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      logger.error(`Template ${templateId} not found`);
      return null;
    }

    // Get base layout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseLayout = (template as any).baseLayoutJson || template.defaults || {};

    // Fetch company branding
    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
    });

    if (!branding) {
      logger.warn(`No branding found for org ${orgId}, using defaults`);
      return baseLayout as TemplateLayout;
    }

    // Merge and return
    return mergeTemplateBranding(baseLayout as TemplateLayout, {
      companyName: branding.companyName || undefined,
      logoUrl: branding.logoUrl || undefined,
      colorPrimary: branding.colorPrimary || undefined,
      colorAccent: branding.colorAccent || undefined,
      phone: branding.phone || undefined,
      email: branding.email || undefined,
      website: branding.website || undefined,
    });
  } catch (error) {
    logger.error("Error merging template:", error);
    return null;
  }
}

/**
 * Create company template from marketplace template
 * Auto-applies branding and saves to company templates
 */
export async function createCompanyTemplateFromMarketplace(
  marketplaceTemplateId: string,
  orgId: string,
  createdBy: string
): Promise<string | null> {
  try {
    // Get marketplace template
    const marketplaceTemplate = await prisma.report_templates.findUnique({
      where: { id: marketplaceTemplateId },
    });

    if (!marketplaceTemplate) {
      throw new Error("Marketplace template not found");
    }

    // Get merged layout with branding
    const mergedLayout = await getMergedTemplate(marketplaceTemplateId, orgId);

    if (!mergedLayout) {
      throw new Error("Failed to merge template branding");
    }

    // Create company template
    const companyTemplate = await prisma.report_templates.create({
      data: {
        id: crypto.randomUUID(),
        org_id: orgId,
        created_by: createdBy,
        name: marketplaceTemplate.name,
        section_order:
          marketplaceTemplate.section_order === null
            ? Prisma.JsonNull
            : (marketplaceTemplate.section_order as Prisma.InputJsonValue),
        section_enabled:
          marketplaceTemplate.section_enabled === null
            ? Prisma.JsonNull
            : (marketplaceTemplate.section_enabled as Prisma.InputJsonValue),
        defaults: mergedLayout as unknown as Prisma.InputJsonValue,
        is_default: false,
        updated_at: new Date(),
      },
    });

    logger.info(
      `[TEMPLATE_MERGE] Created company template ${companyTemplate.id} from marketplace template ${marketplaceTemplateId}`
    );
    return companyTemplate.id;
  } catch (error) {
    logger.error("Error creating company template:", error);
    return null;
  }
}

/**
 * Reapply branding to all company templates
 * Call this when company branding changes
 */
export async function reapplyBrandingToAllTemplates(orgId: string): Promise<number> {
  try {
    // Get all company templates for this org
    const templates = await prisma.report_templates.findMany({
      where: {
        org_id: orgId,
      },
    });

    let updated = 0;

    for (const template of templates) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseLayout = template.defaults as any;

      if (!baseLayout) continue;

      // Get fresh merged layout
      const mergedLayout = await getMergedTemplate(template.id, orgId);

      if (mergedLayout) {
        await prisma.report_templates.update({
          where: { id: template.id },
          data: {
            defaults: mergedLayout as unknown as Prisma.InputJsonValue,
            updated_at: new Date(),
          },
        });
        updated++;
      }
    }

    logger.debug(`Reapplied branding to ${updated} templates for org ${orgId}`);
    return updated;
  } catch (error) {
    logger.error("Error reapplying branding:", error);
    return 0;
  }
}

export type { CompanyBranding, TemplateLayout };

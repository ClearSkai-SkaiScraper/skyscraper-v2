/**
 * Template Thumbnail Service
 *
 * Generates real template preview thumbnails using Playwright.
 * Stores thumbnails in Supabase storage and updates database URLs.
 */

import { chromium } from "playwright";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase-server";

import { renderTemplateHtml } from "../template/renderTemplate";

export interface ThumbnailGenerationResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
  cached?: boolean;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  forceRegenerate?: boolean;
}

const DEFAULT_OPTIONS: Required<Pick<ThumbnailOptions, "width" | "height" | "quality">> = {
  width: 1200,
  height: 630,
  quality: 90,
};

// Sample data for template preview rendering
const SAMPLE_PREVIEW_DATA = {
  company: {
    name: "Sample Contractor LLC",
    phone: "(555) 123-4567",
    website: "samplecontractor.com",
    email: "info@samplecontractor.com",
    address: "123 Main Street, Phoenix, AZ 85001",
    license: "ROC123456",
  },
  client: {
    fullName: "John Smith",
    phone: "(555) 987-6543",
    email: "john.smith@email.com",
  },
  claim: {
    claimNumber: "CLM-2025-001234",
    carrierName: "Example Insurance Co.",
    dateOfLoss: "2025-01-15",
    policyNumber: "POL-9876543",
    adjusterName: "Jane Adjuster",
    adjusterPhone: "(555) 456-7890",
    adjusterEmail: "jane.adjuster@insurance.com",
  },
  property: {
    address: "456 Oak Avenue, Scottsdale, AZ 85250",
    city: "Scottsdale",
    state: "AZ",
    zip: "85250",
    type: "Single Family Residence",
    yearBuilt: "2005",
    squareFeet: "2,450",
    roofType: "Asphalt Shingle",
    stories: "2",
  },
  weather: {
    hailMaxSize: "1.75 in",
    windMaxGust: "68 mph",
    source: "Visual Crossing Weather API",
    eventDate: "2025-01-15",
    reportDate: new Date().toISOString().split("T")[0],
  },
  inspection: {
    date: new Date().toISOString().split("T")[0],
    inspector: "Mike Inspector",
    findings: "Significant hail damage observed on north-facing slopes",
  },
  damages: [
    { area: "Roof - North Slope", description: "Hail impact damage", severity: "Major" },
    { area: "Gutters", description: "Dented and displaced", severity: "Moderate" },
    { area: "Siding - East Wall", description: "Multiple impact points", severity: "Moderate" },
  ],
};

/**
 * Generate a thumbnail for a template
 * Returns the thumbnail URL or generates one if missing
 */
export async function generateTemplateThumbnail(
  templateId: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailGenerationResult> {
  const { width, height, quality } = { ...DEFAULT_OPTIONS, ...options };
  const { forceRegenerate = false } = options;

  try {
    // 1. Check if template exists
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        sections: true,
        thumbnailUrl: true,
      },
    });

    if (!template) {
      return { success: false, error: "TEMPLATE_NOT_FOUND" };
    }

    // 2. Check if thumbnail already exists (unless force regenerate)
    if (template.thumbnailUrl && !forceRegenerate) {
      // Validate the URL is accessible
      try {
        const response = await fetch(template.thumbnailUrl, { method: "HEAD" });
        if (response.ok) {
          return {
            success: true,
            thumbnailUrl: template.thumbnailUrl,
            cached: true,
          };
        }
      } catch {
        // URL not accessible, regenerate
        logger.debug(`[ThumbnailService] Existing URL not accessible, regenerating: ${templateId}`);
      }
    }

    // 3. Generate HTML from template
    const templateJson = (template as any).sections;
    if (!templateJson) {
      // Generate a simple preview placeholder
      return await generatePlaceholderThumbnail({ ...template, title: template.name } as any, {
        width,
        height,
        quality,
      });
    }

    // 4. Render template to HTML
    const html = renderTemplateHtml(templateJson, SAMPLE_PREVIEW_DATA);

    // 5. Generate thumbnail image using Playwright
    const pngBuffer = await renderHtmlToThumbnail(html, { width, height });

    // 6. Upload to Supabase storage
    const thumbnailUrl = await uploadThumbnailToStorage(templateId, pngBuffer);

    // 7. Update database with new URL
    await prisma.template.update({
      where: { id: templateId },
      data: { thumbnailUrl },
    });

    logger.debug(`[ThumbnailService] Generated thumbnail for ${templateId}: ${thumbnailUrl}`);

    return {
      success: true,
      thumbnailUrl,
      cached: false,
    };
  } catch (error) {
    logger.error(`[ThumbnailService] Error generating thumbnail for ${templateId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}

/**
 * Generate a placeholder thumbnail for templates without templateJson
 */
async function generatePlaceholderThumbnail(
  template: { id: string; title: string; category: string | null },
  options: { width: number; height: number; quality: number }
): Promise<ThumbnailGenerationResult> {
  const { width, height } = options;

  const categoryColors: Record<string, { bg: string; accent: string }> = {
    Roofing: { bg: "#1e40af", accent: "#60a5fa" },
    Restoration: { bg: "#0f766e", accent: "#5eead4" },
    Supplements: { bg: "#7c3aed", accent: "#c4b5fd" },
    "Retail & Quotes": { bg: "#059669", accent: "#6ee7b7" },
    "Legal & Appraisal": { bg: "#dc2626", accent: "#fca5a5" },
    "Specialty Reports": { bg: "#d97706", accent: "#fcd34d" },
  };

  const colors = categoryColors[template.category || ""] || { bg: "#374151", accent: "#9ca3af" };
  const categoryIcon = getCategoryIcon(template.category);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${width}px;
          height: ${height}px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, ${colors.bg} 0%, #0f172a 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          color: white;
        }
        .icon {
          font-size: 72px;
          margin-bottom: 24px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }
        .title {
          font-size: 42px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 16px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          max-width: 90%;
          line-height: 1.2;
        }
        .category {
          font-size: 20px;
          color: ${colors.accent};
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 600;
        }
        .badge {
          position: absolute;
          top: 24px;
          right: 24px;
          background: rgba(255,255,255,0.15);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }
        .footer {
          position: absolute;
          bottom: 24px;
          font-size: 14px;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="badge">Premium Template</div>
      <div class="icon">${categoryIcon}</div>
      <div class="title">${escapeHtml(template.title)}</div>
      <div class="category">${escapeHtml(template.category || "Template")}</div>
      <div class="footer">SkaiScraper • Professional Reports</div>
    </body>
    </html>
  `;

  try {
    const pngBuffer = await renderHtmlToThumbnail(html, { width, height });
    const thumbnailUrl = await uploadThumbnailToStorage(template.id, pngBuffer);

    await prisma.template.update({
      where: { id: template.id },
      data: { thumbnailUrl },
    });

    return { success: true, thumbnailUrl, cached: false };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "PLACEHOLDER_GENERATION_FAILED",
    };
  }
}

/**
 * Render HTML to PNG thumbnail using Playwright
 */
async function renderHtmlToThumbnail(
  html: string,
  options: { width: number; height: number }
): Promise<Buffer> {
  const { width, height } = options;

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width, height },
    });

    await page.setContent(html, { waitUntil: "networkidle" });

    // Wait for fonts and images
    await page.evaluate(() => {
      return Promise.all([
        ...Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          ),
        document.fonts?.ready || Promise.resolve(),
      ]);
    });

    const pngBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    return Buffer.from(pngBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Upload thumbnail to Supabase storage
 */
async function uploadThumbnailToStorage(templateId: string, buffer: Buffer): Promise<string> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET_TEMPLATES || "template-assets";
  const timestamp = Date.now();
  const path = `thumbnails/${templateId}/${timestamp}.png`;

  const sb = supabaseServer();

  const { error } = await sb.storage.from(bucket).upload(path, buffer, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message}`);
  }

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get emoji icon for category
 */
function getCategoryIcon(category: string | null): string {
  const icons: Record<string, string> = {
    Roofing: "🏠",
    Restoration: "🔧",
    Supplements: "📋",
    "Retail & Quotes": "💰",
    "Legal & Appraisal": "⚖️",
    "Specialty Reports": "📊",
    Storm: "⛈️",
    Weather: "🌪️",
    Insurance: "🛡️",
    Water: "💧",
    "Water Damage": "💧",
    Fire: "🔥",
  };
  return icons[category || ""] || "📄";
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Batch generate thumbnails for multiple templates
 */
export async function batchGenerateThumbnails(
  templateIds: string[],
  options: ThumbnailOptions = {}
): Promise<Map<string, ThumbnailGenerationResult>> {
  const results = new Map<string, ThumbnailGenerationResult>();

  for (const templateId of templateIds) {
    const result = await generateTemplateThumbnail(templateId, options);
    results.set(templateId, result);

    // Small delay between generations to avoid overwhelming the browser
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Generate thumbnails for all templates missing them
 */
export async function generateMissingThumbnails(
  options: ThumbnailOptions = {}
): Promise<{ generated: number; failed: number; skipped: number }> {
  const templatesWithoutThumbnails = await prisma.template.findMany({
    where: {
      isPublished: true,
      isActive: true,
      OR: [{ thumbnailUrl: null }, { thumbnailUrl: "" }],
    },
    select: { id: true },
  });

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const template of templatesWithoutThumbnails) {
    const result = await generateTemplateThumbnail(template.id, options);

    if (result.success) {
      if (result.cached) {
        skipped++;
      } else {
        generated++;
      }
    } else {
      failed++;
    }

    // Small delay between generations
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { generated, failed, skipped };
}

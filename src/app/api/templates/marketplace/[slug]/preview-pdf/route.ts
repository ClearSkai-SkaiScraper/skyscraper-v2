/**
 * GET /api/templates/marketplace/[slug]/preview-pdf
 *
 * Returns a template-specific preview PDF for marketplace display.
 *
 * Preference order:
 * 1) Static premium preview assets under public/templates
 * 2) Template.previewPdfUrl from the DB (proxied)
 * 3) Generated lightweight PDF (pdf-lib) with the correct template title/header
 */

import fs from "fs/promises";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import prisma from "@/lib/prisma";
import { getPremiumRegistryBySlug } from "@/lib/templates/registry";
import { getTemplateBySlug } from "@/lib/templates/templateRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getFallbackPdfRelativePath(category: string | null | undefined): string {
  switch (category) {
    case "Roofing":
      return "template-previews/pdfs/roofing-specialist-report.pdf";
    case "Restoration":
      return "template-previews/pdfs/water-damage-restoration.pdf";
    default:
      return "template-previews/pdfs/public-adjuster-premium.pdf";
  }
}

async function generatePreviewPdf(options: {
  slug: string;
  title: string;
  category?: string | null;
  description?: string | null;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const left = 72;
  let y = 740;

  page.drawText(`${options.title} — Preview`, {
    x: left,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.06, 0.1, 0.16),
  });

  y -= 28;
  page.drawText(
    "This is a neutral preview PDF. Your company branding and real claim data will be injected when generated.",
    { x: left, y, size: 11, font, color: rgb(0.15, 0.2, 0.3) }
  );

  if (options.category) {
    y -= 18;
    page.drawText(`Category: ${options.category}`, {
      x: left,
      y,
      size: 11,
      font,
      color: rgb(0.15, 0.2, 0.3),
    });
  }

  if (options.description) {
    y -= 18;
    page.drawText(`Description: ${options.description}`, {
      x: left,
      y,
      size: 10,
      font,
      color: rgb(0.15, 0.2, 0.3),
      maxWidth: 468,
      lineHeight: 12,
    });
  }

  y -= 28;
  page.drawText("Preview placeholders:", {
    x: left,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.06, 0.1, 0.16),
  });

  const bullets = [
    "Company logo + license number",
    "Client name + property address",
    "Date of loss + claim metadata",
    "Photos, evidence, and notes",
    "Summary + recommended next steps",
  ];

  y -= 18;
  for (const bullet of bullets) {
    page.drawText(`• ${bullet}`, {
      x: left,
      y,
      size: 11,
      font,
      color: rgb(0.15, 0.2, 0.3),
    });
    y -= 16;
  }

  y -= 18;
  page.drawText(`Template slug: ${options.slug}`, {
    x: left,
    y,
    size: 9,
    font,
    color: rgb(0.35, 0.4, 0.5),
  });

  return await pdfDoc.save();
}

async function serveFallbackPdf(options: {
  slug: string;
  category: string | null | undefined;
}): Promise<NextResponse> {
  const publicDir = path.join(process.cwd(), "public");
  const fallbackPath = path.join(publicDir, getFallbackPdfRelativePath(options.category));
  const fileBuffer = await fs.readFile(fallbackPath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${options.slug}-preview.pdf"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}

async function tryServePremiumPreviewPdf(options: {
  slug: string;
  filename: string;
}): Promise<NextResponse | null> {
  const publicDir = path.join(process.cwd(), "public");
  const candidates = [
    path.join(publicDir, "templates", `${options.slug}-premium`, "preview.pdf"),
    path.join(publicDir, "templates", options.slug, "preview.pdf"),
  ];

  for (const abs of candidates) {
    try {
      const pdfBuffer = await fs.readFile(abs);
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${options.filename}"`,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    } catch {
      // try next
    }
  }

  return null;
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    // 1) Prefer premium static preview assets when present (works even if the template isn't in Prisma)
    const premiumStatic = await tryServePremiumPreviewPdf({
      slug,
      filename: `${slug}-preview.pdf`,
    });
    if (premiumStatic) return premiumStatic;

    // 2) Registry lookup (for category/title fallbacks when Prisma row is missing)
    const premiumRegistry = getPremiumRegistryBySlug(slug);
    const registryTemplate = getTemplateBySlug(slug);

    // 3) DB lookup by slug (optional)
    const template = await prisma.template
      .findFirst({
        where: { slug },
      })
      .catch(() => null);

    // Note: Template model doesn't have previewPdfUrl field - skip remote PDF proxy logic

    // 4) Generate a lightweight PDF with the correct template title/header
    const title = template?.name ?? registryTemplate?.title ?? premiumRegistry?.title ?? slug;
    const category =
      template?.category ?? registryTemplate?.category ?? premiumRegistry?.category ?? null;
    const description = template?.description ?? registryTemplate?.description ?? null;

    const pdfBytes = await generatePreviewPdf({ slug, title, category, description });
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${slug}-preview.pdf"`,
        "Cache-Control": "public, max-age=300",
      },
    });

    // Future: Generate PDF using template renderer
    // const html = await renderTemplateHtml(slug, previewContext);
    // const pdfBuffer = await renderTemplateToPdf(html, previewContext);
    // return new NextResponse(pdfBuffer, {
    //   headers: {
    //     "Content-Type": "application/pdf",
    //     "Content-Disposition": `inline; filename="${slug}-preview.pdf"`,
    //   },
    // });
  } catch (error) {
    logger.error("[PREVIEW_PDF] Generation error:", error);
    // As a last resort, return a category-based static PDF to avoid breaking embeds.
    try {
      const slug = params.slug;
      const template = await prisma.template.findFirst({ where: { slug } }).catch(() => null);
      const premiumRegistry = getPremiumRegistryBySlug(slug);
      const registryTemplate = getTemplateBySlug(slug);
      return await serveFallbackPdf({
        slug,
        category: template?.category ?? premiumRegistry?.category ?? registryTemplate?.category,
      });
    } catch {
      return NextResponse.json(
        {
          error: "Failed to generate preview PDF",
          message: "Internal server error",
        },
        { status: 500 }
      );
    }
  }
}

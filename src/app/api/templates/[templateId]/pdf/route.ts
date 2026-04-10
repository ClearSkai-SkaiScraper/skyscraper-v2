/**
 * Template PDF Proxy Route
 * GET /api/templates/[templateId]/pdf?preview=1&download=0
 *
 * Streams PDF previews with proper headers for inline viewing
 * - Tries R2 first if configured
 * - Falls back to database previewPdfUrl
 * - Supports ?download=1 for forced download
 * - Supports ?preview=1 for branded preview mode
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getR2Object, isR2Configured } from "@/lib/r2";
import { getTemplateById } from "@/lib/templates/templateRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function servePremiumStaticPreview(options: {
  category: string | null | undefined;
  slug: string | null | undefined;
  title: string | null | undefined;
  tags?: string[] | null | undefined;
  download: boolean;
  cacheControl: string;
}): Promise<NextResponse> {
  let fileBuffer: Buffer;

  try {
    // Legacy fallback path: keep existing large premium examples as a safe fallback
    // for non-preview usage, even if dynamic rendering fails elsewhere.
    const publicDir = path.join(process.cwd(), "public");
    const relativeCandidates = [
      // Premium blank layout (canonical)
      options.slug ? path.join("templates", `${options.slug}-premium`, "preview.pdf") : null,
      options.slug ? path.join("templates", options.slug, "preview.pdf") : null,
    ].filter(Boolean) as string[];

    let found: string | null = null;
    for (const rel of relativeCandidates) {
      const abs = path.join(publicDir, rel);
      try {
        await fs.stat(abs);
        found = abs;
        break;
      } catch {
        // try next
      }
    }

    if (!found) throw new Error("No premium static preview found");
    fileBuffer = await fs.readFile(found);
  } catch {
    // Ultra-safe last resort: serve a tiny valid PDF
    fileBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1<< /Type/Font /Subtype/Type1 /BaseFont/Helvetica >> >> >> >>endobj\n4 0 obj<< /Length 73 >>stream\nBT /F1 14 Tf 72 720 Td (Template preview unavailable) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000060 00000 n \n0000000120 00000 n \n0000000276 00000 n \ntrailer<< /Size 5 /Root 1 0 R >>\nstartxref\n395\n%%EOF\n",
      "utf8"
    );
  }

  const disposition = options.download ? "attachment" : "inline";
  const filename = `${options.title || "template"}.pdf`;

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": options.cacheControl,
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: { templateId: string } }) {
  const { searchParams } = new URL(req.url);
  const download = searchParams.get("download") === "1";
  const isPreview = searchParams.get("preview") === "1";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const claimIdParam = searchParams.get("claimId");
  const modeParam = searchParams.get("mode");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const previewMode = modeParam === "branding-only" ? "branding-only" : "claim";

  try {
    // 1. Get template from registry
    const registryTemplate = getTemplateById(params.templateId);

    // 2. Get template from database
    const dbTemplate = await prisma.template.findUnique({
      where: { id: params.templateId },
      select: {
        name: true,
        slug: true,
        category: true,
        tags: true,
        thumbnailUrl: true,
      },
    });

    const templateTitle = dbTemplate?.name || registryTemplate?.title || params.templateId;
    const templateCategory = dbTemplate?.category || registryTemplate?.category || null;
    const templateSlug = dbTemplate?.slug || registryTemplate?.slug || null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateTags = dbTemplate?.tags || (registryTemplate as any)?.tags || null;

    // 3. Preview mode: Serve the premium blank layout PDF (static asset)
    // - Deterministic
    // - No customer data
    // eslint-disable-next-line @typescript-eslint/await-thenable
    // - Consistent across templates
    if (isPreview) {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const { userId } = await auth();

      return await servePremiumStaticPreview({
        category: templateCategory,
        slug: templateSlug,
        title: templateTitle,
        tags: templateTags,
        download,
        cacheControl: userId ? "private, max-age=0" : "public, max-age=86400, immutable",
      });
    }

    // Demo hardening: if neither DB nor registry knows this template, serve a premium static fallback.
    if (!dbTemplate && !registryTemplate) {
      return await servePremiumStaticPreview({
        category: null,
        slug: null,
        title: params.templateId,
        tags: null,
        download,
        cacheControl: "public, max-age=3600",
      });
    }

    // 4. Prefer local public preview PDFs when present
    // Common locations:
    // - public/templates/<templateId>/preview.pdf
    // - public/templates/<slug>/preview.pdf
    const publicDir = path.join(process.cwd(), "public");
    const localCandidates = [
      path.join(publicDir, "templates", params.templateId, "preview.pdf"),
      templateSlug ? path.join(publicDir, "templates", templateSlug, "preview.pdf") : null,
    ].filter(Boolean) as string[];

    for (const filePath of localCandidates) {
      try {
        const fileBuffer = await fs.readFile(filePath);
        const disposition = download ? "attachment" : "inline";
        const filename = `${templateTitle}.pdf`;

        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${disposition}; filename="${filename}"`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        // try next candidate
      }
    }

    // 5. Try R2 if configured (construct key from template slug)
    if (isR2Configured() && templateSlug) {
      const r2Key = `templates/${templateSlug}/preview.pdf`;
      const stream = await getR2Object(r2Key);

      if (stream) {
        const disposition = download ? "attachment" : "inline";
        const filename = `${templateTitle}.pdf`;

        return new NextResponse(stream, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${disposition}; filename="${filename}"`,
            "Cache-Control": "public, max-age=3600, immutable",
          },
        });
      }
    }

    // 6. Fall back to static preview (previewPdfUrl removed from schema)
    // Use thumbnailUrl as a reference or generate from static assets
    const previewPdfUrl =
      dbTemplate?.thumbnailUrl?.replace(/\.(png|jpg|jpeg|webp)$/i, ".pdf") || null;

    if (!previewPdfUrl) {
      return await servePremiumStaticPreview({
        category: templateCategory,
        slug: templateSlug,
        title: templateTitle,
        tags: templateTags,
        download,
        cacheControl: "public, max-age=3600",
      });
    }

    // If it's an HTTP URL, fetch and stream
    if (previewPdfUrl.startsWith("http")) {
      const pdfResponse = await fetch(previewPdfUrl, { redirect: "follow" });
      const contentType = pdfResponse.headers.get("content-type") || "";

      if (!pdfResponse.ok || !contentType.toLowerCase().includes("application/pdf")) {
        return await servePremiumStaticPreview({
          category: templateCategory,
          slug: templateSlug,
          title: templateTitle,
          tags: templateTags,
          download,
          cacheControl: "public, max-age=3600",
        });
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const disposition = download ? "attachment" : "inline";
      const filename = `${templateTitle}.pdf`;

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${disposition}; filename="${filename}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // If it's a local path, try to read the file
    if (previewPdfUrl.startsWith("/")) {
      const publicDir = path.join(process.cwd(), "public");
      const relativePath = previewPdfUrl.replace(/^\/+/, "");
      const filePath = path.join(publicDir, relativePath);

      try {
        const fileBuffer = await fs.readFile(filePath);
        const disposition = download ? "attachment" : "inline";
        const filename = `${templateTitle}.pdf`;

        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${disposition}; filename="${filename}"`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_fileError) {
        logger.error(`[PDF_PROXY] Local file not found: ${filePath}`);
        return await servePremiumStaticPreview({
          category: templateCategory,
          slug: templateSlug,
          title: templateTitle,
          tags: templateTags,
          download,
          cacheControl: "public, max-age=3600",
        });
      }
    }

    // Unsupported URL format
    return await servePremiumStaticPreview({
      category: templateCategory,
      slug: templateSlug,
      title: templateTitle,
      tags: templateTags,
      download,
      cacheControl: "public, max-age=3600",
    });
  } catch (error) {
    logger.error("[PDF_PROXY] Error:", error);
    // Demo hardening: never return 500 for PDF embeds
    return await servePremiumStaticPreview({
      category: null,
      slug: null,
      title: params.templateId,
      tags: null,
      download,
      cacheControl: "public, max-age=3600",
    });
  }
}

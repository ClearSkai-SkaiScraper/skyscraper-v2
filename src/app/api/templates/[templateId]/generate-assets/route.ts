export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { isAuthError, requireAdmin } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase-server";
import { renderPdfAndThumbnail } from "@/lib/template/renderPdfAndThumb";
import { renderTemplateHtml } from "@/lib/template/renderTemplate";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name}_MISSING`);
  return v;
}

export async function POST(_: Request, ctx: { params: Promise<{ templateId: string }> }) {
  try {
    // Enforce admin auth for template asset generation
    const auth = await requireAdmin();
    if (isAuthError(auth)) return auth;

    const { templateId } = await ctx.params;

    const bucket = requireEnv("SUPABASE_STORAGE_BUCKET_TEMPLATES");

    // NOTE: Enforce auth + admin permission if you want only owners to generate assets
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template)
      return NextResponse.json({ ok: false, error: "TEMPLATE_NOT_FOUND" }, { status: 404 });

    // Sample data for marketplace previews (safe + complete)
    const sampleData = {
      company: {
        name: "ClearSkai Technologies",
        phone: "(480) 995-5820",
        website: "clearskai.com",
      },
      client: { fullName: "John Doe" },
      claim: {
        claimNumber: "CLM-123456",
        carrierName: "Example Insurance",
        dateOfLoss: "2025-07-21",
      },
      property: { address: "20158 E Mesa Verde Rd, Mayer, AZ 86333" },
      weather: { hailMaxSize: "1.25 in", windMaxGust: "62 mph", source: "Visual Crossing" },
    };

    const html = renderTemplateHtml(template.sections, sampleData);
    const { pdfBuffer, pngBuffer } = await renderPdfAndThumbnail(html);

    const sb = supabaseServer();

    const basePath = `marketplace/${templateId}/${Date.now()}`;
    const pdfPath = `${basePath}/preview.pdf`;
    const thumbPath = `${basePath}/thumb.png`;

    const up1 = await sb.storage.from(bucket).upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (up1.error) throw new Error(`SUPABASE_UPLOAD_PDF_FAILED:${up1.error.message}`);

    const up2 = await sb.storage.from(bucket).upload(thumbPath, pngBuffer, {
      contentType: "image/png",
      upsert: true,
    });
    if (up2.error) throw new Error(`SUPABASE_UPLOAD_PNG_FAILED:${up2.error.message}`);

    const pdfPublic = sb.storage.from(bucket).getPublicUrl(pdfPath).data.publicUrl;
    const thumbPublic = sb.storage.from(bucket).getPublicUrl(thumbPath).data.publicUrl;

    await prisma.template.update({
      where: { id: templateId },
      data: { thumbnailUrl: thumbPublic },
    });

    return NextResponse.json({ ok: true, previewPdfUrl: pdfPublic, thumbnailUrl: thumbPublic });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}

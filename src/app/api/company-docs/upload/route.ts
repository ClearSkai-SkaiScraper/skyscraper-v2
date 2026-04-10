/**
 * POST /api/company-docs/upload
 * GET  /api/company-docs/list   (handled by separate route if exists)
 *
 * Upload company document templates (contracts, warranties, agreements).
 * Stores in Supabase and registers in file_assets with category "company-template".
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  // eslint-disable-next-line no-restricted-syntax
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // eslint-disable-next-line no-restricted-syntax
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: "Storage not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";

    if (!file || !title) {
      return NextResponse.json({ ok: false, message: "File and title required" }, { status: 400 });
    }

    // 25MB max
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, message: "File too large (max 25MB)" },
        { status: 400 }
      );
    }

    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { ok: false, message: `Invalid file type: ${file.type}` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const filePath = `${orgId}/company-docs/${timestamp}-${uuid}.${ext}`;
    const bucket = "claim-documents";

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucket)) {
      await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: maxSize });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      logger.error("[Company Docs Upload] Supabase error:", error);
      return NextResponse.json({ ok: false, message: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    // Create file_assets DB record
    try {
      await prisma.file_assets.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          ownerId: userId,
          filename: title,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: filePath,
          bucket,
          publicUrl,
          category: "company-template",
          note: description || null,
          source: "user",
          updatedAt: new Date(),
        },
      });
    } catch (dbErr) {
      logger.warn("[Company Docs Upload] file_assets record failed:", dbErr);
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      name: title,
    });
  } catch (error) {
    logger.error("[Company Docs Upload] Error:", error);
    return NextResponse.json({ ok: false, message: "Upload failed" }, { status: 500 });
  }
});

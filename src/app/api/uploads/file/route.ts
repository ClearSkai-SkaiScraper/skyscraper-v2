/**
 * POST /api/uploads/file
 *
 * General file upload endpoint used by Smart Docs and other features.
 * Uploads to Supabase storage and returns the public URL.
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

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // MIME type allowlist — block executables, scripts, and XSS vectors
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
      "application/zip",
      "application/x-zip-compressed",
    ];
    const BLOCKED_EXTENSIONS = [
      "exe",
      "bat",
      "cmd",
      "sh",
      "ps1",
      "msi",
      "dll",
      "com",
      "scr",
      "js",
      "jsx",
      "ts",
      "tsx",
      "html",
      "htm",
      "svg",
      "php",
      "py",
      "rb",
      "pl",
    ];
    const fileExt = (file.name.split(".").pop() || "").toLowerCase();

    if (!ALLOWED_TYPES.includes(file.type) || BLOCKED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    // 50MB max for general uploads
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const safeOwner = orgId || userId;
    const filePath = `${safeOwner}/${folder}/${timestamp}-${uuid}.${ext}`;

    const bucket = "claim-documents"; // General purpose bucket

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucket)) {
      await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: maxSize });
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      logger.error("[File Upload] Supabase error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    // Create file_assets DB record
    try {
      await prisma.file_assets.create({
        data: {
          id: crypto.randomUUID(),
          orgId: safeOwner,
          ownerId: userId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: filePath,
          bucket,
          publicUrl,
          category: folder,
          source: "user",
          updatedAt: new Date(),
        },
      });
    } catch (dbErr) {
      logger.warn("[File Upload] file_assets record creation failed:", dbErr);
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      publicUrl,
      path: data.path,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    logger.error("[File Upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
});

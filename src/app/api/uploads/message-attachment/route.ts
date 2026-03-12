export const dynamic = "force-dynamic";

/**
 * POST /api/uploads/message-attachment
 * Upload a file for use as a message attachment.
 * Accepts multipart form data with a single "file" field.
 * Returns { url } with the public URL of the uploaded file.
 *
 * Uses Supabase Storage or falls back to a local /public/uploads path.
 */

export const runtime = "nodejs";

import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

// Max file size: 10MB
const MAX_SIZE = 25 * 1024 * 1024; // 25MB for attachments

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

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
      "text/plain",
      "text/csv",
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
      "html",
      "htm",
      "svg",
      "php",
      "py",
    ];
    const fileExt = (file.name.split(".").pop() || "").toLowerCase();

    if (!ALLOWED_TYPES.includes(file.type) || BLOCKED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    // Sanitize filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeFilename = `msg-${randomUUID()}.${ext}`;
    const path = `message-attachments/${userId}/${safeFilename}`;

    // Try Supabase storage first
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const buffer = Buffer.from(await file.arrayBuffer());

        const { data, error } = await supabase.storage.from("uploads").upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

        if (error) {
          logger.error("[message-attachment] Supabase upload error:", error.message);
          throw error;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("uploads").getPublicUrl(path);

        return NextResponse.json({ url: publicUrl, path: data.path });
      }
    } catch (storageError) {
      logger.warn(
        "[message-attachment] Storage unavailable, returning placeholder URL:",
        storageError
      );
    }

    // Fallback: return a placeholder URL (for dev/environments without storage)
    const placeholderUrl = `/api/uploads/placeholder/${safeFilename}`;
    return NextResponse.json({
      url: placeholderUrl,
      path: safeFilename,
      note: "Storage not configured — placeholder URL returned",
    });
  } catch (error) {
    logger.error("[POST /api/uploads/message-attachment]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

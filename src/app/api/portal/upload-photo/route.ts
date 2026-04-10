export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStorageClient } from "@/lib/storage/client";

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 20 uploads/min per user
    const rl = await checkRateLimit(userId, "UPLOAD");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again shortly." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") || formData.get("photo");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().replace(/-/g, "").slice(0, 13);
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `portal/${userId}/${timestamp}-${randomStr}.${ext}`;

    // Upload to Supabase Storage
    const supabase = getStorageClient();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "portal-uploads");
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket("portal-uploads", {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
      });
      if (createError && !createError.message.includes("already exists")) {
        logger.error("[Portal Upload] Failed to create bucket:", createError);
      }
    }

    const { data, error } = await supabase.storage.from("portal-uploads").upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      logger.error("[Portal Upload] Supabase error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("portal-uploads").getPublicUrl(data.path);

    logger.info(`[Portal Upload] Success: ${filename} (${file.size} bytes)`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("Portal upload-photo error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
